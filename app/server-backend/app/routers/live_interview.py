import asyncio
import base64
import traceback
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session
from google import genai
from google.genai import types
from ..database import get_db, SessionLocal, InterviewSession, InterviewMessage
from ..config import settings
from ..services import live_session_service
from ..logging_config import get_logger

# Configure Logger
logger = get_logger(__name__)

router = APIRouter(tags=["Live Interview"])

# --- CONFIGURATION ---
MODEL_ID = "gemini-live-2.5-flash-native-audio"
MAX_AUDIO_QUEUE_CHUNKS = 120

client = genai.Client(
    vertexai=True,
    project=settings.GCP_PROJECT_ID,
    location=settings.GCP_CLIENT_LOCATION,
    http_options={"api_version": "v1beta1"}
)


BASE_SYSTEM_INSTRUCTION = """"""


def _save_interview_message(message_session_id: str, role: str, content: str) -> None:
    if not content or not content.strip():
        return

    db_session = SessionLocal()
    try:
        msg = InterviewMessage(
            session_id=message_session_id,
            role=role,
            content=content,
        )
        db_session.add(msg)
        db_session.commit()
    finally:
        db_session.close()

@router.websocket("/ws/live-interview")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: str = Query(...),
    token: str = Query(...), 
    db: Session = Depends(get_db)
):
    await websocket.accept()
    logger.info(
        "[LiveInterview] WebSocket accepted | session=%s token_len=%s",
        session_id,
        len(token) if token else 0,
    )

    # 1. Manual Auth Check
    try:
        from ..security import validate_token_and_get_user_id
        user_id = validate_token_and_get_user_id(token)
        logger.info("[LiveInterview] Auth success | user=%s session=%s", user_id, session_id)
    except Exception as e:
        logger.error(f"WebSocket Auth Failed: {e}")
        await websocket.close(code=1008)
        return

    # 2. Fetch Session & Context
    interview_session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id, 
        InterviewSession.user_id == user_id
    ).first()
    
    if not interview_session:
        logger.error("[LiveInterview] Session not found | user=%s session=%s", user_id, session_id)
        await websocket.close(code=1008)
        return

    app_id = interview_session.application_id
    round_id = interview_session.round_id
    
    # TODO: Handle case where app_id is None - Generic interview
    # 3. Get Context
    system_instruction = live_session_service.get_interview_context(db, app_id, round_id, user_id)

    if interview_session.status == "in_progress":
        prior_messages = db.query(InterviewMessage).filter(
            InterviewMessage.session_id == session_id
        ).order_by(InterviewMessage.created_at.asc()).all()

        resume_context = live_session_service.build_resume_context_instruction(prior_messages)
        if resume_context:
            system_instruction = f"{system_instruction}\n\n{resume_context}"
            logger.info(
                "[LiveInterview] Resume context appended | user=%s session=%s messages=%s",
                user_id,
                session_id,
                len(prior_messages),
            )
    
    config = types.LiveConnectConfig(
            response_modalities=[types.Modality.AUDIO],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name="Puck"
                    )
                )
            ),
            system_instruction=types.Content(parts=[types.Part(text=system_instruction)]),
            input_audio_transcription=types.AudioTranscriptionConfig(),
            output_audio_transcription=types.AudioTranscriptionConfig(),
        )

    try:
        logger.info("[LiveInterview] Connecting to Gemini Live | user=%s session=%s", user_id, session_id)
        async with client.aio.live.connect(model=MODEL_ID, config=config) as session:
            logger.info(f"Connected to Gemini Live for User {user_id}")
            audio_queue: asyncio.Queue[tuple[bytes, str, int] | None] = asyncio.Queue(maxsize=MAX_AUDIO_QUEUE_CHUNKS)

            # --- Task A: Receive from React (Frontend) -> Send to Gemini ---
            async def receive_from_client():
                chunk_count = 0
                total_audio_bytes = 0
                end_of_turn_count = 0
                dropped_chunk_count = 0
                try:
                    while True:
                        try:
                            message = await websocket.receive_json()
                        except WebSocketDisconnect:
                            logger.info("[LiveInterview] Client disconnected during receive | user=%s session=%s", user_id, session_id)
                            return

                        if message.get("end_of_turn"):
                            end_of_turn_count += 1
                            logger.info(
                                "[LiveInterview] end_of_turn received from frontend (ignored, using server VAD) | user=%s session=%s eot_count=%s chunk_count=%s total_bytes=%s",
                                user_id,
                                session_id,
                                end_of_turn_count,
                                chunk_count,
                                total_audio_bytes,
                            )
                            continue

                        if "realtime_input" in message and "media_chunks" in message["realtime_input"]:
                            for chunk in message["realtime_input"]["media_chunks"]:
                                b64_data = chunk["data"]
                                mime_type = chunk["mime_type"]
                                audio_bytes = base64.b64decode(b64_data)
                                chunk_count += 1
                                total_audio_bytes += len(audio_bytes)

                                if chunk_count == 1 or chunk_count % 100 == 0:
                                    logger.info(
                                        "[LiveInterview] audio chunk received | user=%s session=%s chunk=%s bytes=%s total_bytes=%s mime=%s",
                                        user_id,
                                        session_id,
                                        chunk_count,
                                        len(audio_bytes),
                                        total_audio_bytes,
                                        mime_type,
                                    )

                                try:
                                    audio_queue.put_nowait((audio_bytes, mime_type, chunk_count))
                                except asyncio.QueueFull:
                                    try:
                                        _ = audio_queue.get_nowait()
                                        dropped_chunk_count += 1
                                    except asyncio.QueueEmpty:
                                        pass

                                    audio_queue.put_nowait((audio_bytes, mime_type, chunk_count))

                                    if dropped_chunk_count == 1 or dropped_chunk_count % 25 == 0:
                                        logger.warning(
                                            "[LiveInterview] audio queue full, dropping oldest chunk | user=%s session=%s dropped=%s queue_size=%s",
                                            user_id,
                                            session_id,
                                            dropped_chunk_count,
                                            audio_queue.qsize(),
                                        )
                except Exception as e:
                    logger.error(f"Error receiving from client: {e}")
                finally:
                    try:
                        audio_queue.put_nowait(None)
                    except asyncio.QueueFull:
                        try:
                            _ = audio_queue.get_nowait()
                        except asyncio.QueueEmpty:
                            pass
                        try:
                            audio_queue.put_nowait(None)
                        except asyncio.QueueFull:
                            pass

            async def forward_audio_to_gemini():
                forwarded_chunk_count = 0
                try:
                    while True:
                        queued_item = await audio_queue.get()
                        if queued_item is None:
                            return

                        audio_bytes, mime_type, source_chunk_count = queued_item

                        try:
                            await session.send_realtime_input(
                                audio=types.Blob(data=audio_bytes, mime_type=mime_type)
                            )
                            forwarded_chunk_count += 1
                            if forwarded_chunk_count == 1 or forwarded_chunk_count % 100 == 0:
                                logger.info(
                                    "[LiveInterview] audio chunk forwarded to Gemini Live API | user=%s session=%s forwarded=%s source_chunk=%s queue_size=%s",
                                    user_id,
                                    session_id,
                                    forwarded_chunk_count,
                                    source_chunk_count,
                                    audio_queue.qsize(),
                                )
                        except Exception as send_err:
                            logger.error(
                                "[LiveInterview] Failed forwarding audio chunk to Gemini | user=%s session=%s source_chunk=%s error=%s",
                                user_id,
                                session_id,
                                source_chunk_count,
                                send_err,
                            )
                            return
                except asyncio.CancelledError:
                    return

            # --- Task B: Receive from Gemini -> Send to React (Frontend) ---
            async def send_to_client():
                user_transcript = ""
                model_transcript = ""
                user_partial_emitted = False
                model_partial_emitted = False
                try:
                    while True:
                        logger.info("[LiveInterview] Gemini receive loop started | user=%s session=%s", user_id, session_id)
                        async for response in session.receive():
                            server_content = response.server_content
                            if server_content:
                                if server_content.model_turn:
                                    for part in server_content.model_turn.parts:
                                        if part.inline_data:
                                            b64_audio = base64.b64encode(part.inline_data.data).decode('utf-8')
                                            
                                            await websocket.send_json({
                                                "type": "audio",
                                                "data": b64_audio, 
                                                "mime_type": part.inline_data.mime_type
                                            })
                                        if part.text:
                                            await websocket.send_json({ "type": "text", "data": part.text })
                                # Sending transcription data
                                if server_content.input_transcription:
                                    input_text = server_content.input_transcription.text or ""
                                    if input_text:
                                        user_transcript += input_text

                                    if not server_content.input_transcription.finished:
                                        if input_text:
                                            await websocket.send_json({
                                                "type": "transcript",
                                                "role": "user",
                                                "data": input_text
                                            })
                                            user_partial_emitted = True
                                    else:
                                        try:
                                            await run_in_threadpool(
                                                _save_interview_message,
                                                session_id,
                                                "user",
                                                user_transcript,
                                            )
                                            final_user_ui_text = ""
                                            if input_text:
                                                final_user_ui_text = input_text
                                            elif user_transcript and not user_partial_emitted:
                                                final_user_ui_text = user_transcript

                                            if final_user_ui_text:
                                                await websocket.send_json({
                                                    "type": "transcript",
                                                    "role": "user",
                                                    "data": final_user_ui_text
                                                })

                                            if user_transcript:
                                                logger.info(
                                                    "[LiveInterview] Final user transcript emitted | user=%s session=%s chars=%s",
                                                    user_id,
                                                    session_id,
                                                    len(user_transcript),
                                                )
                                            user_transcript = ""
                                            user_partial_emitted = False
                                        except Exception as e:
                                            logger.error(f"DB Error saving user transcript: {e}")
                                if server_content.output_transcription:
                                    output_text = server_content.output_transcription.text or ""
                                    if output_text:
                                        model_transcript += output_text

                                    if not server_content.output_transcription.finished:
                                        if output_text:
                                            await websocket.send_json({
                                                "type": "transcript",
                                                "role": "ai",
                                                "data": output_text
                                            })
                                            model_partial_emitted = True
                                    else:
                                        try:
                                            await run_in_threadpool(
                                                _save_interview_message,
                                                session_id,
                                                "ai",
                                                model_transcript,
                                            )
                                            final_ai_ui_text = ""
                                            if output_text:
                                                final_ai_ui_text = output_text
                                            elif model_transcript and not model_partial_emitted:
                                                final_ai_ui_text = model_transcript

                                            if final_ai_ui_text:
                                                await websocket.send_json({
                                                    "type": "transcript",
                                                    "role": "ai",
                                                    "data": final_ai_ui_text
                                                })

                                            if model_transcript:
                                                logger.info(
                                                    "[LiveInterview] Final AI transcript emitted | user=%s session=%s chars=%s",
                                                    user_id,
                                                    session_id,
                                                    len(model_transcript),
                                                )
                                            model_transcript = ""
                                            model_partial_emitted = False
                                        except Exception as e:
                                            logger.error(f"DB Error saving model transcript: {e}")
                                if server_content.turn_complete:
                                    logger.info("Turn complete from Gemini")
                                    if user_transcript:
                                        try:
                                            await run_in_threadpool(
                                                _save_interview_message,
                                                session_id,
                                                "user",
                                                user_transcript,
                                            )
                                            user_transcript = ""
                                            user_partial_emitted = False
                                        except Exception as e:
                                            logger.error(f"DB Error flushing user transcript on turn complete: {e}")
                                    if model_transcript:
                                        try:
                                            await run_in_threadpool(
                                                _save_interview_message,
                                                session_id,
                                                "ai",
                                                model_transcript,
                                            )
                                            model_transcript = ""
                                            model_partial_emitted = False
                                        except Exception as e:
                                            logger.error(f"DB Error flushing model transcript on turn complete: {e}")

                                        # await websocket.send_json({"type": "turn_complete"})

                        logger.info("[LiveInterview] Gemini receive cycle ended, awaiting next turn | user=%s session=%s", user_id, session_id)
                except Exception as e:
                    logger.error(f"Error receiving from Gemini: {e}")
                finally:
                    try:
                        if user_transcript:
                            await run_in_threadpool(
                                _save_interview_message,
                                session_id,
                                "user",
                                user_transcript,
                            )
                        if model_transcript:
                            await run_in_threadpool(
                                _save_interview_message,
                                session_id,
                                "ai",
                                model_transcript,
                            )
                    except Exception as e:
                        logger.error(f"DB Error flushing transcripts on cleanup: {e}")

            # --- RUN ---
            await asyncio.gather(
                receive_from_client(),
                forward_audio_to_gemini(),
                send_to_client(),
            )
                
    except Exception as e:
        logger.error(f"Session Runtime Error: {e}")
        traceback.print_exc()
    finally:
        try:
            await websocket.close()
        except RuntimeError:
            # RuntimeError is expected if the connection is already closed/closing
            pass
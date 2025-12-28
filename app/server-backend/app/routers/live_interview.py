import asyncio
import base64
import traceback
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
from google import genai
from google.genai import types 
from .. import database
from ..config import settings
from ..services import live_session_service
from ..logging_config import get_logger

# Configure Logger
logger = get_logger(__name__)

router = APIRouter(tags=["Live Interview"])

# --- CONFIGURATION ---
# MODEL_ID = "gemini-2.0-flash-exp"
MODEL_ID = "gemini-live-2.5-flash-native-audio"

client = genai.Client(
    vertexai=True,
    project=settings.GCP_PROJECT_ID,
    location="us-central1",
    http_options={"api_version": "v1beta1"}
)

@router.websocket("/ws/live-interview")
async def websocket_endpoint(
    websocket: WebSocket,
    app_id: str = Query(...),
    token: str = Query(...), 
    db: Session = Depends(database.get_db)
):
    await websocket.accept()

    # 1. Manual Auth Check
    try:
        from ..security import validate_token_and_get_user_id
        user_id = validate_token_and_get_user_id(token)
    except Exception as e:
        logger.error(f"WebSocket Auth Failed: {e}")
        await websocket.close(code=1008)
        return

    # 2. Get Context
    system_instruction = live_session_service.get_interview_context(db, app_id, user_id)
    
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
    # config = {
    #     "response_modalities": ["AUDIO"],
    #     "system_instruction": system_instruction,
    # }

    try:
        async with client.aio.live.connect(model=MODEL_ID, config=config) as session:
            logger.info(f"Connected to Gemini Live for User {user_id}")

            # --- Task A: Receive from React (Frontend) -> Send to Gemini ---
            async def receive_from_client():
                try:
                    while True:
                        message = await websocket.receive_json()
                        # print(message)
                        if "realtime_input" in message and "media_chunks" in message["realtime_input"]:
                            for chunk in message["realtime_input"]["media_chunks"]:
                                b64_data = chunk["data"]
                                mime_type = chunk["mime_type"]
                                # print(f"Received chunk of type {mime_type} and size {len(b64_data)}")
                                audio_bytes = base64.b64decode(b64_data)
                                
                                await session.send(
                                    input=types.LiveClientRealtimeInput(
                                        media_chunks=[
                                            types.Blob(data=audio_bytes, mime_type=mime_type)
                                        ]
                                    ),
                                    end_of_turn=False
                                )
                except WebSocketDisconnect:
                    logger.info("Client disconnected normally")
                    return
                except Exception as e:
                    logger.error(f"Error receiving from client: {e}")
                    return

            # --- Task B: Receive from Gemini -> Send to React (Frontend) ---
            async def send_to_client():
                try:
                    async for response in session.receive():
                        print(f"Received response: {response}")
                        server_content = response.server_content
                        if server_content:
                            if server_content.model_turn:
                                for part in server_content.model_turn.parts:
                                    if part.inline_data:
                                        # --- FIX IS HERE ---
                                        # 1. Convert raw bytes to Base64 bytes
                                        # 2. Decode bytes to UTF-8 string for JSON serialization
                                        b64_audio = base64.b64encode(part.inline_data.data).decode('utf-8')
                                        
                                        await websocket.send_json({
                                            "type": "audio",
                                            "data": b64_audio, 
                                            "mime_type": part.inline_data.mime_type
                                        })
                                    if part.text:
                                        await websocket.send_json({ "type": "text", "data": part.text })
                            if server_content.input_transcription:
                                await websocket.send_json({
                                    "type": "transcript",
                                    "role": "user",
                                    "data": server_content.input_transcription.text
                                })
                            if server_content.output_transcription:
                                await websocket.send_json({
                                    "type": "transcript",
                                    "role": "ai",
                                    "data": server_content.output_transcription.text
                                })
                            if server_content.turn_complete:
                                logger.info("Turn complete from Gemini")
                                # await websocket.send_json({"type": "turn_complete"})
                except Exception as e:
                    logger.error(f"Error receiving from Gemini: {e}")

            # --- RUN ---
            # Wait for EITHER the client to disconnect (receive_from_client returns)
            # OR the model to crash/stop (send_to_client returns)
            await asyncio.gather(receive_from_client(), send_to_client())
                
    except Exception as e:
        logger.error(f"Session Runtime Error: {e}")
        traceback.print_exc()
    finally:
        # Gracefully close the websocket if it's still open
        try:
            await websocket.close()
        except RuntimeError:
            # RuntimeError is expected if the connection is already closed/closing
            pass
from sqlalchemy.orm import Session
from ..services import resume_service, gcs_service, pdf_service
from ..config import settings
from .. import database

# Helper to fetch context from DB
def get_interview_context(db: Session, application_id: str, round_id: str, user_id: str) -> str:
    """
    Fetches the Resume and Job Description to build the System Instruction.
    """
    # 1. Fetch Application (JD)
    application = db.query(database.Application).filter(
        database.Application.id == application_id,
        database.Application.user_id == user_id
    ).first()
    
    if not application:
        return "Error: Application not found."
    
    jd_text = application.job_description or "No Job Description provided."

    # 2. Fetch Resume (Master CV or Text)
    user_profile = resume_service.get_user_profile_by_id(db, user_id)
    resume_text = "No resume found."
    
    if user_profile and user_profile.cv_url:
        try:
            clean_path = user_profile.cv_url.replace(f"https://storage.googleapis.com/{settings.BUCKET_NAME}/", "")
            pdf_bytes = gcs_service.download_file_as_bytes(clean_path)
            extracted = pdf_service.extract_text_from_pdf_bytes(pdf_bytes)
            if extracted:
                resume_text = extracted
        except Exception as e:
            print(f"Error fetching resume for live context: {e}")

    # 3. Construct System Prompt
    system_instruction = f"""
    You are an expert technical interviewer conducting a mock interview.
    
    ### CONTEXT
    CANDIDATE RESUME:
    {resume_text}

    JOB DESCRIPTION:
    {jd_text}

    ### INSTRUCTIONS
    1. Your goal is to assess the candidate for this specific job.
    2. Start by briefly introducing yourself as the AI Interviewer, then let the user respond and ask the first question after the user response.
    3. Keep your responses concise (spoken English). Do not output markdown lists or long monologues.
    4. Listen to the user's answer, acknowledge it briefly, and then ask the next relevant question (Technical or Behavioral).
    5. If the user struggles, offer a small hint.
    6. Be professional but encouraging.
    7. Do not assume the user is speaking in any other language than English. (The user may have a different English accent, but they are speaking English).
    """
    
    return system_instruction
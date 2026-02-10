from sqlalchemy.orm import Session
from ..services import resume_service, gcs_service, pdf_service
from ..config import settings
from .. import database
from ..logging_config import get_logger

logger = get_logger(__name__)

def get_round_context(
    db: Session, 
    application_id: str,
    round_id: str,
    user_id: str
) -> str:
    
    try:
        round = db.query(database.InterviewRound).filter(
            database.InterviewRound.id == round_id,
            database.InterviewRound.user_id == user_id,
            database.InterviewRound.application_id == application_id
        ).first()
        if not round:
            return "No round information. This is a generic round.", None, None
        
        interview_type = round.interview_type
    
        if interview_type == "technical":
            specific_instructions = """
            Focus on Hard Skills. 
            - Ask technical questions relevant to the role's level based on the company (if you know what questions have been asked by the company).
            - Asked questions based on the candidate resume (professional experience or projects) and job description.
            - Proritize projects/experience mentioned in the resume that align well with the JD.
            - Dive deeper into knowing the implementations from the candidate whenever necessary.
            """
        elif interview_type == "system_design":
            specific_instructions = """
            Focus on Architecture.
            - Ask questions related to system design principles and trade-offs.
            - Discuss scenarios related to system design based on the job description.
            - Focus on scalability, maintenance and reliability.
            """
        elif interview_type == "behavioral" or interview_type == "hiring_manager":
            specific_instructions = """
            Focus on Soft Skills and Culture.
            - Ask STAR method questions based on the company's values found in the JD.
            - Suggest "situations" from the user's resume that fit these questions.
            - Eg: "Tell me about a time you faced a conflict at work..."
            """
        else: # Screening
            specific_instructions = """
            Focus on Basics.
            - "Tell me about yourself" pitch. (Make this pitch more personalized rather than just repeating resume points)
            - "Why this company?"
            - "What makes you a perfect candidate for the role".
            - Basic questions on resume highlights.
            - General question for Salary Negotiations if salary mentioned in job description.
            """
        
        duration = round.duration_minutes if round.duration_minutes else "15 minutes"
            
        return specific_instructions, round.interview_type, duration, round.notes
        
    except Exception as e:
        logger.error(f"Error fetching round context: {e}")
        return "Error: Unable to fetch round context.", None, None, None

# Helper to fetch context from DB
def get_interview_context(db: Session, application_id: str, round_id: str, user_id: str) -> str:
    """
    Fetches the Resume and Job Description to build the System Instruction.
    """
    # For specific application
    if application_id :
        application = db.query(database.Application).filter(
            database.Application.id == application_id,
            database.Application.user_id == user_id
        ).first()
    
        if not application:
            return "Error: Application not found."
        
        specific_instructions, interview_type, duration, notes = get_round_context(db, application_id, round_id, user_id)
        
        jd_text = application.job_description or "No Job Description provided."
        resume = db.query(database.Resume).filter(
            database.Resume.user_id == user_id,
            database.Resume.id == application.resume_id
        ).first()
        resume_text = resume.content if resume else "No resume found."
    else:
        # Fallback: Fetch User Profile Resume
        user_profile = resume_service.get_user_profile_by_id(db, user_id)
        resume_text = "No resume found."
        jd_text = "No Job Description provided."
        
        if user_profile and user_profile.cv_url:
            try:
                clean_path = user_profile.cv_url.replace(f"https://storage.googleapis.com/{settings.BUCKET_NAME}/", "")
                pdf_bytes = gcs_service.download_file_as_bytes(clean_path)
                extracted = pdf_service.extract_text_from_pdf_bytes(pdf_bytes)
                if extracted:
                    resume_text = extracted
            except Exception as e:
                logger.error(f"Error fetching resume for live context: {e}")
        
        specific_instructions = "Generic interview without specific application context."
        interview_type = "Generic"
        duration = 15
        notes = "None"

    # 3. Construct System Prompt
    system_instruction = f"""
    You are an expert interviewer conducting a mock interview.
    
    ### CONTEXT
    CANDIDATE RESUME:
    {resume_text}

    JOB DESCRIPTION:
    {jd_text}

    ### INSTRUCTIONS
    1. Your goal is to assess the candidate for this specific job.
    2. Always start the interview with a brief introduction of yourself as the interviewer and the interview process, then ask the first question after the candidate responds to your introduction.
    3. Keep the duration to around {duration} minutes.
    4. RESPOND IN English (US). YOU MUST RESPOND UNMISTAKABLY IN English (US). 
    5. Keep your responses concise (spoken English). Do not output markdown lists or long monologues.
    6. Listen to the user's answer, acknowledge it briefly, and then ask the next relevant question (Technical or Behavioral).
    7. If the user struggles, offer a small hint.
    8. Be professional but encouraging.
    9. Do not assume the user is speaking in any other language than English. (The user may have a different English accent, but they are speaking English).
    10. If resume or JD information is missing, ask blend of generic behavioral and technical questions.
    
    ### INTERVIEW ROUND TYPE: {interview_type if round_id else "Generic"}
    ### DURATION: {duration if round_id else "15 minutes"}
    
    ### ROUND SPECIFIC INSTRUCTIONS
    {specific_instructions}
    
    #### Extra notes/instructions for the interviewer (if any):
    {notes if round_id and notes else "None"}
    
    """
    
    return system_instruction
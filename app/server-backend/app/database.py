import uuid
from sqlalchemy import Boolean, ForeignKey, create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from .config import settings
import datetime

# Create the SQLAlchemy engine using the connection string from our config
engine = create_engine(settings.SUPABASE_DB_URL)

# Each instance of SessionLocal will be a database session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for our ORM models
Base = declarative_base()


# ORM Model for the 'resumes' table
class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    filename = Column(String, index=True)
    company = Column(String, index=True, default="General")
    storage_path = Column(String, unique=True, nullable=False)
    content = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.timezone.utc))
    autoscore = Column(Boolean, default=False, nullable=False)
    tags_role = Column(ARRAY(String), default=[])
    tags_category = Column(ARRAY(String), default=[])


# ORM Model for the 'users' table
class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True) # Assuming UUID stored as string
    first_name = Column(String)
    last_name = Column(String)
    email = Column(String)
    linkedin_profile = Column(String)
    personal_website = Column(String, nullable=True)
    phone_number = Column(String)
    location = Column(String)
    github_profile = Column(String, nullable=True)
    cv_url = Column(String, nullable=True)
    

# ORM Model for the 'outreach_history' table
class OutreachHistory(Base):
    __tablename__ = "outreach_history"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    prospect_name = Column(String)
    prospect_email = Column(String)
    company_name = Column(String)
    job_link = Column(String, nullable=True) 
    status = Column(String, default="processing")
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.timezone.utc))
    draft_metadata = Column(JSONB, nullable=True) 
    sent_at = Column(DateTime, nullable=True)
    

class Application(Base):
    __tablename__ = "applications_history"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    company_name = Column(String)
    job_title = Column(String)
    job_url = Column(String, nullable=True)
    job_id = Column(String, nullable=True)
    salary_range = Column(String, nullable=True)
    referred_by = Column(String, nullable=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=True)
    job_description = Column(Text, nullable=True)
    status = Column(String, default="saved")
    notes = Column(Text, nullable=True)
    on_board = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.timezone.utc))
    updated_at = Column(DateTime, default=datetime.datetime.now(datetime.timezone.utc), onupdate=datetime.datetime.now(datetime.timezone.utc))


class AnalysisLog(Base):
    __tablename__ = "analysis_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    job_description = Column(Text, nullable=True)
    
    # Fields extracted by LLM
    job_role = Column(String, nullable=True)
    job_external_id = Column(String, nullable=True)
    company_name = Column(String, nullable=True)
    
    resume_source = Column(String) 
    resume_id = Column(Integer, nullable=True)
    resume_snapshot = Column(Text, nullable=True)
    
    relevancy_score = Column(Integer)
    suggestions = Column(JSONB) # Stores the list of strings
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.timezone.utc))
    
    input_hash = Column(String, index=True) # Hash of JD + resume to identify duplicates
    

class AutofillHistory(Base):
    __tablename__ = "autofill_history"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    
    # Metadata extracted from JD
    company_name = Column(String, nullable=True)
    job_role = Column(String, nullable=True)
    job_external_id = Column(String, nullable=True)
    
    # The actual filled data
    questions_answers = Column(JSONB)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
class InterviewPrep(Base):
    __tablename__ = "interview_preps"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    application_id = Column(String, ForeignKey("applications_history.id"), nullable=False)
    user_id = Column(String, nullable=False)
    
    # Stores { company_analysis, technical_questions, behavioral_questions, resume_deep_dive }
    content = Column(JSONB) 
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
class InterviewRound(Base):
    __tablename__ = "interview_rounds"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    application_id = Column(String, ForeignKey("applications_history.id"), nullable=False)
    user_id = Column(String, nullable=False)
    round_number = Column(Integer, nullable=False)
    interview_type = Column(String, nullable=False)  # e.g., screening, technical, system_design, behavioral, hiring_manager
    interview_date = Column(DateTime, nullable=True)
    status = Column(String, default="scheduled")  # e.g., scheduled, completed, cancelled
    user_feedback = Column(Text, nullable=True)
    prep_material = Column(JSONB, nullable=True)  # The JSON from AI
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

# Dependency to get a DB session in our API endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
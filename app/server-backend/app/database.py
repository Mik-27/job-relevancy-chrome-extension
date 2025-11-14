from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base
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
    # NEW: Add the user_id column. It will be a string (UUID from Supabase).
    user_id = Column(String, nullable=False, index=True)
    filename = Column(String, index=True)
    company = Column(String, index=True, default="General")
    storage_path = Column(String, unique=True, nullable=False)
    content = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

# Dependency to get a DB session in our API endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
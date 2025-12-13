from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional

# NEW: Schema for updating profile (all fields optional)
class UserUpdateSchema(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    linkedin_profile: Optional[str] = None
    personal_website: Optional[str] = None
    phone_number: Optional[str] = None
    location: Optional[str] = None

# UPDATE: Add cv_url to the existing response schema
class UserSchema(BaseModel):
    first_name: str
    last_name: str
    email: str
    linkedin_profile: str
    personal_website: Optional[str] = None
    phone_number: str
    location: str
    cv_url: Optional[str] = None # NEW

    class Config:
        from_attributes = True
        
# --- NEW: Lightweight User Status ---
class UserStatusSchema(BaseModel):
    first_name: str
    email: str
    has_master_cv: bool
        

class AnalyzeRequest(BaseModel):
    resumeText: str
    jobDescriptionText: str

# --- NEW: Structure for a single suggestion ---
class SuggestionItem(BaseModel):
    type: str = Field(description="Type of suggestion: 'rewrite', 'addition', 'removal', or 'formatting'.")
    location: str = Field(description="Where in the resume the change should be made (e.g., under which experience or project, or in which section).")
    original_text: str = Field(description="The exact text from the resume that needs changing. If it's a new addition, removal or formatting, leave this empty.")
    suggested_text: str = Field(description="The rewritten, optimized version of the text.")
    reasoning: str = Field(description="A brief explanation of why this change improves the resume.")
    
class AnalysisResultSchema(BaseModel):
    relevancyScore: int = Field(description="An integer score from 0 to 100 representing how relevant the resume is to the job description.")
    suggestions: List[SuggestionItem] = Field(description="A list of 5-7 concrete, actionable suggestions for the user to improve their resume for this specific job.")

class ScoreResponse(BaseModel):
    relevancyScore: int

class SuggestionsResponse(BaseModel):
    suggestions: List[SuggestionItem]
    
# Schema for the first, fast LLM call to get only the score
class RelevancyScoreSchema(BaseModel):
    relevancyScore: int = Field(
        description="A single integer from 0 to 100 representing the resume's relevance to the job description.",
        ge=0, # 'greater than or equal to 0'
        le=100 # 'less than or equal to 100'
    )

# Schema for the second, more detailed LLM call to get only the suggestions
class SuggestionsSchema(BaseModel):
    suggestions: List[SuggestionItem] = Field(description="A list of 5-7 concrete, actionable suggestions for the user to improve their resume for this specific job.")
    
# Schema for returning a single resume in a list
class ResumeBase(BaseModel):
    id: int
    filename: str
    company: str
    autoscore: bool
    file_url: Optional[str] = None 

    # This tells Pydantic to read the data even if it's an ORM model
    class Config:
        from_attributes = True

# Schema for the full list response
class ResumeListResponse(BaseModel):
    resumes: List[ResumeBase]
    
class ResumeUpdate(BaseModel):
    autoscore: Optional[bool] = None
    
# --- Sub-models for the new, detailed resume structure ---

class EducationSchema(BaseModel):
    school: str = Field(description="Name of the university, e.g., 'Arizona State University'.")
    degree: str = Field(description="The full degree name, e.g., 'Master of Science in Computer Science'.")
    date: str = Field(description="The graduation date, e.g., 'May 2025'.")
    coursework: str = Field(description="A comma-separated list of relevant coursework.")
    gpa: str = Field(description="The GPA, e.g., '3.93'.")

class ExperienceSchema(BaseModel):
    company: str = Field(description="The name of the company.")
    date: str = Field(description="Employment dates, e.g., 'June 2024 - Present'.")
    title: str = Field(description="The job title, e.g., 'AI Engineer'.")
    location: str = Field(description="The location, e.g., 'Tempe, AZ'.")
    points: List[str] = Field(description="A list of 2-4 bullet points describing achievements, tailored to the job description.")

class ProjectSchema(BaseModel):
    name: str = Field(description="The name of the project.")
    technologies: str = Field(description="A comma-separated list of key technologies used.")
    points: List[str] = Field(description="A list of 1-2 bullet points describing the project, tailored to the job description.")

class SkillsSchema(BaseModel):
    languages_databases: str = Field(description="A comma-separated list of relevant programming languages and databases.")
    cloud: str = Field(description="Comma-separated list of cloud technologies, platforms, and tools.")
    development: str = Field(description="Comma-separated list of development frameworks and libraries.")
    others: str = Field(description="Comma-separated list of other relevant tools and methodologies like Git, Spark, etc.")

# --- Main Schema for the entire resume ---
# This is the top-level object the LLM must generate.

# Deprecated: Use TailoredContentSchema instead
class TailoredResumeSchema(BaseModel):
    name: str = Field(description="The full name of the candidate.")
    phone: str = Field(description="The candidate's phone number.")
    location: str = Field(description="The candidate's city and state, e.g., 'Tempe, AZ'.")
    email: str = Field(description="The candidate's email address.")
    portfolio_url: str = Field(description="The full URL to the candidate's portfolio or personal website.")
    linkedin_url: str = Field(description="The full URL to the candidate's LinkedIn profile.")
    github_url: str = Field(description="The full URL to the candidate's GitHub profile.")
    summary: str = Field(description="A 2-3 sentence professional summary (called 'OBJECTIVE' in the template), rewritten to be highly relevant to the job description.")
    education: List[EducationSchema]
    skills: SkillsSchema
    experience: List[ExperienceSchema]
    projects: List[ProjectSchema]
    achievements: List[str] = Field(description="A list of 1-3 certifications or achievements.")
    
    
class TailoredContentSchema(BaseModel):
    summary: str = Field(description="A 2-3 sentence professional summary (called 'OBJECTIVE' in the template), rewritten to be highly relevant to the job description.")
    education: List[EducationSchema]
    experience: List[ExperienceSchema]
    projects: List[ProjectSchema]
    skills: SkillsSchema
    achievements: List[str] = Field(description="A list of 1-3 certifications or achievements.")
    
    
# Schema for the Cover Letter Generation ---
class CoverLetterSchema(BaseModel):
    cover_letter_text: str = Field(description="The full, complete text of the generated cover letter, formatted with paragraphs and line breaks.")
    
    
class JobDescriptionRequest(BaseModel):
    job_description: str = Field(description="The full text of the job description extracted from the job posting.")
    
# --- NEW: Outreach Schemas ---
class ContactSchema(BaseModel):
    name: str
    email: str
    company: Optional[str] = None # Helpful for research

class OutreachRequestSchema(BaseModel):
    contacts: List[ContactSchema]

# --- NEW: Outreach History Schema ---
class OutreachHistorySchema(BaseModel):
    id: UUID
    prospect_name: str
    prospect_email: str = None
    company_name: str = None
    job_link: Optional[str] = None
    status: str
    created_at: datetime
    draft_metadata: Optional[Any] = None 
    sent_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        
# --- NEW: Paginated Response Wrapper ---
class PaginatedOutreachHistory(BaseModel):
    items: List[OutreachHistorySchema]
    total: int
    page: int
    size: int
    pages: int
    
    
# Represents a single field on the webpage
class FormField(BaseModel):
    id: str
    label: str
    type: str # text, email, select, radio, etc.
    options: Optional[List[str]] = None # For dropdowns/radios

# Request payload
class AutofillRequest(BaseModel):
    fields: List[FormField]
    job_description: Optional[str] = None
    job_url: Optional[str] = None

# Response payload
class AutofillResponse(BaseModel):
    # field_id -> answer
    mappings: Dict[str, str]
    
    
# --- Application Tracker Schemas ---
class ApplicationBase(BaseModel):
    company_name: str
    job_title: str
    job_url: Optional[str] = None
    job_id: Optional[str] = None
    salary_range: Optional[str] = None
    status: Optional[str] = "saved"
    notes: Optional[str] = None
    referred_by: Optional[str] = None
    on_board: Optional[bool] = False

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationUpdate(BaseModel):
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    job_url: Optional[str] = None
    job_id: Optional[str] = None
    salary_range: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    referred_by: Optional[str] = None
    on_board: Optional[bool] = None

class ApplicationResponse(ApplicationBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        
        
# --- NEW: Logging Schema ---
class LogAnalysisRequest(BaseModel):
    job_description: str
    job_url: str
    relevancy_score: int
    suggestions: List[SuggestionItem] 
    resume_source: str
    resume_id: Optional[int] = None
    resume_text: Optional[str] = None
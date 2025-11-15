from pydantic import BaseModel, Field
from typing import List

class AnalyzeRequest(BaseModel):
    resumeText: str
    jobDescriptionText: str

class AnalysisResultSchema(BaseModel):
    relevancyScore: int = Field(description="An integer score from 0 to 100 representing how relevant the resume is to the job description.")
    suggestions: List[str] = Field(description="A list of 5-7 concrete, actionable suggestions for the user to improve their resume for this specific job.")

class ScoreResponse(BaseModel):
    relevancyScore: int

class SuggestionsResponse(BaseModel):
    suggestions: List[str]
    
# Schema for the first, fast LLM call to get only the score
class RelevancyScoreSchema(BaseModel):
    relevancyScore: int = Field(
        description="A single integer from 0 to 100 representing the resume's relevance to the job description.",
        ge=0, # 'greater than or equal to 0'
        le=100 # 'less than or equal to 100'
    )

# Schema for the second, more detailed LLM call to get only the suggestions
class SuggestionsSchema(BaseModel):
    suggestions: List[str] = Field(description="A list of 5-7 concrete, actionable suggestions for the user to improve their resume for this specific job.")
    
# Schema for returning a single resume in a list
class ResumeBase(BaseModel):
    id: int
    filename: str
    company: str
    autoscore: bool

    # This tells Pydantic to read the data even if it's an ORM model
    class Config:
        from_attributes = True

# Schema for the full list response
class ResumeListResponse(BaseModel):
    resumes: List[ResumeBase]
    
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
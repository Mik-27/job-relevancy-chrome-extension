from pydantic import BaseModel, Field
from typing import List

class AnalyzeRequest(BaseModel):
    resumeText: str
    jobDescriptionText: str

class AnalysisResultSchema(BaseModel):
    relevancyScore: int = Field(description="An integer score from 0 to 100 representing how relevant the resume is to the job description.")
    suggestions: List[str] = Field(description="A list of 3-5 concrete, actionable suggestions for the user to improve their resume for this specific job.")

class AnalyzeResponse(BaseModel):
    relevancyScore: int
    suggestions: List[str]
    
# Schema for returning a single resume in a list
class ResumeBase(BaseModel):
    id: int
    filename: str
    company: str

    # This tells Pydantic to read the data even if it's an ORM model
    class Config:
        from_attributes = True

# Schema for the full list response
class ResumeListResponse(BaseModel):
    resumes: List[ResumeBase]
    
# --- Sub-models for nested JSON structures ---

class ExperienceSchema(BaseModel):
    title: str = Field(description="The job title, e.g., 'AI Engineer'.")
    company: str = Field(description="The name of the company.")
    location: str = Field(description="The location of the job, e.g., 'San Francisco, CA'.")
    dates: str = Field(description="The employment dates, e.g., 'June 2025 - Present'.")
    points: List[str] = Field(description="A list of 2-4 bullet points describing achievements, tailored to the job description.")

class ProjectSchema(BaseModel):
    name: str = Field(description="The name of the project.")
    technologies: str = Field(description="A comma-separated list of key technologies used.")
    points: List[str] = Field(description="A list of 1-2 bullet points describing the project, tailored to the job description.")

class SkillsSchema(BaseModel):
    languages: str = Field(description="A comma-separated list of relevant programming languages.")
    frameworks: str = Field(description="A comma-separated list of relevant frameworks and libraries.")
    tools: str = Field(description="A comma-separated list of relevant developer tools and platforms.")

# --- Main Schema for the entire resume ---
# This is the top-level object the LLM must generate.

class TailoredResumeSchema(BaseModel):
    name: str = Field(description="The full name of the candidate.")
    phone: str = Field(description="The candidate's phone number.")
    email: str = Field(description="The candidate's email address.")
    linkedin: str = Field(description="The candidate's LinkedIn username only (e.g., 'janedoe').")
    github: str = Field(description="The candidate's GitHub username only (e.g., 'janedoe-dev').")
    summary: str = Field(description="A 2-3 sentence professional summary, rewritten to be highly relevant to the job description.")
    experience: List[ExperienceSchema] = Field(description="A list of the candidate's professional experiences. Prioritize the most relevant jobs.")
    projects: List[ProjectSchema] = Field(description="A list of the candidate's key projects.")
    skills: SkillsSchema = Field(description="A breakdown of the candidate's technical skills.")
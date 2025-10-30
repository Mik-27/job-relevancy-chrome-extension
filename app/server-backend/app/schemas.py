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
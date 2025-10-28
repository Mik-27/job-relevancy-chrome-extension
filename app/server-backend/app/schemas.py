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
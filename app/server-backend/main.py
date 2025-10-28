from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from .services import get_llm_analysis, upload_resume_to_gcs
from app.schemas import AnalyzeRequest, AnalyzeResponse
from app.services import get_llm_analysis
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

origins = [
    "chrome-extension://kgljhnbcnpppblmokhbffnambgkamcnn" 
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["POST"],
    allow_headers=["*"],
)

# --- API Endpoints ---

@app.get("/")
def read_root():
    """Health check endpoint to confirm the API is running."""
    return {"status": "Resume Analyzer API is running"}

@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_resume_and_job(request: AnalyzeRequest):
    """Main endpoint to analyze a resume against a job description."""
    if not request.resumeText or not request.jobDescriptionText:
        raise HTTPException(status_code=400, detail="Resume and Job Description cannot be empty.")

    try:
        score, suggestions = await get_llm_analysis(
            resume=request.resumeText,
            job_description=request.jobDescriptionText
        )
        return AnalyzeResponse(relevancyScore=score, suggestions=suggestions)
    except Exception as e:
        print(f"An error occurred in the main endpoint: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred during analysis.")
    
    
@app.post("/api/resumes/upload")
async def upload_resume(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a PDF.")
    
    try:
        file_url = await upload_resume_to_gcs(file)
        return {"message": "File uploaded successfully", "file_url": file_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {e}")
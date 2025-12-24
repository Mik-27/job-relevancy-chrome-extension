from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from logging.config import dictConfig
from app.logging_config import LogConfig
from app.routers import analysis, resumes, tailor, cover_letter, users, outreach, autofill, applications, interviews, interview_rounds

dictConfig(LogConfig().model_dump())

app = FastAPI(
    title="Resume Analyzer API",
    description="API for analyzing resumes against job descriptions.",
    version="1.2.0"
)

# --- CORS Configuration ---
origins = [
    "chrome-extension://kgljhnbcnpppblmokhbffnambgkamcnn" # Your extension ID
]

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*", 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Include Routers ---
app.include_router(analysis.router, prefix="/api")
app.include_router(resumes.router, prefix="/api")
app.include_router(tailor.router, prefix="/api")
app.include_router(cover_letter.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(outreach.router, prefix="/api")
app.include_router(autofill.router, prefix="/api")
app.include_router(applications.router, prefix="/api") 
app.include_router(interviews.router, prefix="/api")
app.include_router(interview_rounds.router, prefix="/api")


@app.get("/", tags=["Root"])
def read_root():
    return {"status": "API is running"}
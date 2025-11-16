from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import analysis, resumes, tailor, cover_letter

app = FastAPI(
    title="Resume Analyzer API",
    description="API for analyzing resumes against job descriptions.",
    version="1.1.0"
)

# --- CORS Configuration ---
origins = [
    "chrome-extension://kgljhnbcnpppblmokhbffnambgkamcnn" # Your extension ID
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)

# --- Include Routers ---
app.include_router(analysis.router, prefix="/api")
app.include_router(resumes.router, prefix="/api")
app.include_router(tailor.router, prefix="/api")
app.include_router(cover_letter.router, prefix="/api")

@app.get("/", tags=["Root"])
def read_root():
    return {"status": "API is running"}
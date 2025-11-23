from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

# Import the schema that defines the shape of our incoming request body
from ..schemas import AnalyzeRequest, TailoredContentSchema, TailoredResumeSchema

from .. import database

# Import the high-level service that orchestrates the tailoring process
from ..services.llm import tailoring_service as llm_tailor_service
from ..services import gcs_service, pdf_service
from ..services import tailoring_service, resume_service
from ..security import get_current_user_id

router = APIRouter(
    prefix="/tailor",
    tags=["Tailoring"]
)

@router.post("/generate-content", response_model=TailoredContentSchema)
async def generate_tailored_content_endpoint(request: AnalyzeRequest, user_id: str = Depends(get_current_user_id)):
    """
    STEP 1: Receives a resume and job description, calls the LLM, and returns
    the structured, tailored JSON content for the user to edit.
    """
    if not request.resumeText or not request.jobDescriptionText:
        raise HTTPException(status_code=400, detail="Resume and Job Description cannot be empty.")

    try:
        # Call the LLM service to get the AI-generated content
        tailored_content = await llm_tailor_service.get_tailored_content_as_json(
            resume=request.resumeText,
            job_description=request.jobDescriptionText
        )
        return tailored_content
    except Exception as e:
        print(f"Error in /generate-content endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate AI content: {e}")


# --- NEW: Endpoint for generating from Master CV ---
@router.post("/generate-from-cv", response_model=TailoredContentSchema)
async def generate_from_master_cv_endpoint(
    # We accept a simple object with just the JD text
    request: AnalyzeRequest, # We can reuse this, treating resumeText as empty or ignored
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(database.get_db)
):
    """
    Generates resume content by selecting relevant sections from the user's 
    uploaded Master CV based on the provided Job Description.
    """
    if not request.jobDescriptionText:
        raise HTTPException(status_code=400, detail="Job Description cannot be empty.")

    # 1. Get User Profile to find the CV URL
    user_profile = resume_service.get_user_profile_by_id(db, current_user_id)
    if not user_profile or not user_profile.cv_url:
        raise HTTPException(status_code=404, detail="Master CV not found. Please upload one in your Profile.")

    try:
        # 2. Download the PDF from GCS
        # The cv_url in DB is the internal path (e.g., "public/user/cv/master.pdf")
        cv_path = user_profile.cv_url
        pdf_bytes = gcs_service.download_file_as_bytes(cv_path)

        # 3. Extract Text from PDF
        cv_text = pdf_service.extract_text_from_pdf_bytes(pdf_bytes)

        if not cv_text or len(cv_text) < 50:
             raise HTTPException(status_code=400, detail="Could not extract text from Master CV.")

        # 4. Call the LLM with the CV text and JD
        tailored_content = await llm_tailor_service.select_content_from_cv(
            cv_text=cv_text,
            job_description=request.jobDescriptionText
        )
        
        return tailored_content

    except Exception as e:
        print(f"Error in generate-from-cv: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process Master CV: {e}")


@router.post("/compile-pdf", response_class=FileResponse)
async def compile_pdf_endpoint(
    resume_data: TailoredContentSchema,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(database.get_db)
):
    """
    STEP 2: Receives the final, user-approved JSON data, populates the
    LaTeX template, compiles it, and returns the final PDF for download.
    """
    try:
        # 1. Fetch the user's profile from the database
        user_profile = resume_service.get_user_profile_by_id(db=db, user_id=user_id)
        if not user_profile:
            raise HTTPException(status_code=404, detail="User profile not found.")
        
        final_resume_data = TailoredResumeSchema(
            name=f"{user_profile.first_name} {user_profile.last_name}",
            phone=user_profile.phone_number,
            location=user_profile.location,
            email=user_profile.email,
            portfolio_url=user_profile.personal_website or "",
            linkedin_url=user_profile.linkedin_profile,
            github_url="",
            
            # Unpack the dictionary of the edited content from the request
            **resume_data.model_dump()
        )
        
        # Call the compilation service with the user-approved data
        pdf_path = await tailoring_service.compile_latex_to_pdf(
            resume_data=final_resume_data.model_dump() # Convert Pydantic model to a dictionary
        )
        
        return FileResponse(
            path=pdf_path,
            media_type='application/pdf',
            filename='Tailored_Resume.pdf'
        )
    except Exception as e:
        print(f"Error in /compile-pdf endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to compile PDF: {e}")
        
        
# You can temporarily add this back to tailor.py for testing
@router.post("/tailor/test_new_template", tags=["Tailoring"])
async def test_new_template():
    mock_data = {
        "name": "Mihir Thakur",
        "phone": "+1 6025764346",
        "location": "Tempe, AZ",
        "email": "tmihir27@gmail.com",
        "portfolio_url": "mik-27.github.io",
        "linkedin_url": "https://www.linkedin.com/in/mihir-thakur-116aa2208/",
        "github_url": "https://github.com/Mik-27",
        "summary": "This is a test summary generated to fit the objective section.",
        "education": [
            { "school": "Arizona State University", "degree": "Master of Science in Computer Science", "date": "May 2025", "coursework": "Statistical ML, NLP, Data Mining", "gpa": "3.93" },
            { "school": "University of Mumbai", "degree": "Bachelor of Engineering in Computer Engineering", "date": "May 2022", "coursework": "Data Structure, Algorithms, OOP", "gpa": "3.85" }
        ],
        "skills": {
            "languages_databases": "Python, JavaScript, C/C++, MySQL, PostgreSQL, MongoDB",
            "cloud": "GCP, Azure(DevOps, AML), AWS(S3, EC2), Databricks, Docker",
            "development": "React.js, Node.js, Typescript, Pandas, Scikit-learn, Flask",
            "others": "Git, GitHub, Apache Spark, PowerBI, Jira, SDLC"
        },
        "experience": [
            { "company": "LTIMindtree", "date": "June 2022 - July 2023", "title": "Data Scientist", "location": "Pune, India", "points": ["Implemented data science use cases in Azure and Databricks.", "Optimized SQL queries using Spark SQL reducing runtime by 20%."] },
            { "company": "Innovatiive Creators", "date": "September 2021 - November 2021", "title": "Software Intern", "location": "Mumbai, India", "points": ["Pioneered scalable web application using React.js and Node.js.", "Mentored junior developers in unit testing of APIs."] }
        ],
        "projects": [
            { "name": "Resume Analyzer", "technologies": "Python, LLM, Prompt Engineering, Gemini 2.0", "points": ["Leveraged prompt engineering for Gemini model to parse resumes.", "Enhanced resume relevance to job postings, achieving a 35% improvement."] }
        ],
        "achievements": ["OCI Generative AI Professional Certificate.", "Microsoft Certified: Azure Fundamentals."]
    }
    
    job_desc = "Employer: AMAZON.COM SERVICES LLC\r\nOffered Position: Data Scientist II\r\nJob Location: North Reading, Massachusetts\r\nJob Number: AMZ9686759\r\n\r\nPosition Responsibilities:\r\n\r\nDesign and implement scalable and reliable approaches to support or automate decision making throughout the business. Apply a range of data science techniques and tools combined with subject matter expertise to solve difficult business problems and cases in which the solution approach is unclear. Acquire data by building the necessary SQL \/ ETL queries. Import processes through various company specific interfaces for accessing Oracle, RedShift, and Spark storage systems. Build relationships with stakeholders and counterparts. Analyze data for trends and input validity by inspecting univariate distributions, exploring bivariate relationships, constructing appropriate transformations, and tracking down the source and meaning of anomalies. Build models using statistical modeling, mathematical modeling, econometric modeling, network modeling, social network modeling, natural language processing, machine learning algorithms, genetic algorithms, and neural networks. Validate models against alternative approaches, expected and observed outcome, and other business defined key performance indicators. Implement models that comply with evaluations of the computational demands, accuracy, and reliability of the relevant ETL processes at various stages of production.\r\n\r\nPosition Requirements:\r\n\r\nMaster\u2019s degree or foreign equivalent degree in Statistics, Applied Mathematics, Economics, Engineering, Computer Science, or a related field and one year of experience in the job offered or a related occupation. Employer will accept a Bachelor\u2019s degree or foreign equivalent degree in Statistics, Applied Mathematics, Economics, Engineering, Computer Science, or a related field and five years of progressive post-baccalaureate experience in the job offered or a related occupation as equivalent to the Master\u2019s degree and one year of experience. Must have one year of experience in the following skill(s): (1) building statistical models and machine learning models using large datasets from multiple resources; (2) writing SQL scripts for analysis and data migration; and (3) applying specialized modelling software including R, Python, or MATLAB.\r\n\r\nAmazon.com is an Equal Opportunity-Affirmative Action Employer \u2013 Minority \/ Female \/ Disability \/ Veteran \/ Gender Identity \/ Sexual Orientation.\r\n\r\n40 hours \/ week, 8:00am-5:00pm, Salary Range $148,762\/year to $184,000\/year.\r\n\r\nAmazon is a total compensation company. Dependent on the position offered, equity, sign-on payments, and other forms of compensation may be provided as part of a total compensation package, in addition to a full range of medical, financial, and\/or other benefits. For more information, visit:\r\nhttps:\/\/www.aboutamazon.com\/workplace\/employee-benefits.#0000\r\n\r\nBasic Qualifications\r\nPosition Requirements:\r\n\r\nMaster\u2019s degree or foreign equivalent degree in Statistics, Applied Mathematics, Economics, Engineering, Computer Science, or a related field and one year of experience in the job offered or a related occupation. Employer will accept a Bachelor\u2019s degree or foreign equivalent degree in Statistics, Applied Mathematics, Economics, Engineering, Computer Science, or a related field and five years of progressive post-baccalaureate experience in the job offered or a related occupation as equivalent to the Master\u2019s degree and one year of experience. Must have one year of experience in the following skill(s): (1) building statistical models and machine learning models using large datasets from multiple resources; (2) writing SQL scripts for analysis and data migration; and (3) applying specialized modelling software including R, Python, or MATLAB.#0000\r\n\r\nPreferred Qualifications\r\nPlease see job description and the position requirements above."
    try:
        # Temporarily call the service directly with mock data
        pdf_path = await tailoring_service.generate_tailored_resume_pdf(resume_text=mock_data, job_description=job_desc)
        return FileResponse(path=pdf_path, media_type='application/pdf', filename='Test_New_Template.pdf')
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
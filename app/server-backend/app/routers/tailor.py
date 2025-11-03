from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

# Import the schema that defines the shape of our incoming request body
from ..schemas import AnalyzeRequest 

# Import the high-level service that orchestrates the tailoring process
from ..services import tailoring_service

router = APIRouter(
    prefix="/tailor",
    tags=["Tailoring"]
)

@router.post("/", response_class=FileResponse)
async def tailor_resume_and_generate_pdf(request: AnalyzeRequest):
    """
    The main production endpoint for the resume tailoring feature.
    
    Receives a user's resume text and a job description, then:
    1. Calls the LLM to get tailored, structured content.
    2. Populates a LaTeX template with this content.
    3. Compiles the template into a PDF.
    4. Returns the generated PDF for the user to download.
    """
    # Basic input validation
    if not request.resumeText or not request.jobDescriptionText:
        raise HTTPException(
            status_code=400, 
            detail="Resume text and Job Description text cannot be empty."
        )

    try:
        # Call the main service function with the data from the request.
        # This single function call kicks off the entire complex workflow.
        pdf_path = await tailoring_service.generate_tailored_resume_pdf(
            resume_text=request.resumeText,
            job_description=request.jobDescriptionText
        )
        
        # If the service succeeds, it returns the path to the final PDF.
        # FileResponse streams this file back to the user.
        return FileResponse(
            path=pdf_path,
            media_type='application/pdf',
            # This is the default filename the user will see in their download prompt.
            filename='Tailored_Resume.pdf'
        )
        
    except Exception as e:
        # If anything in the service fails (LLM call, PDF compilation),
        # we catch the exception and return a server error.
        print(f"An error occurred in the tailoring endpoint: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"An internal server error occurred during PDF generation: {e}"
        )
        
        
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
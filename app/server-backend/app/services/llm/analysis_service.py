from ...schemas import AnalysisResultSchema
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI
from app.config import settings
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize the model using the key from our settings config
llm = ChatGoogleGenerativeAI(model="gemini-2.5-pro", temperature=0.1)

parser = PydanticOutputParser(pydantic_object=AnalysisResultSchema)

prompt_template = """
You are an expert ATS (Applicant Tracking System) reviewer and career advisor with deep knowledge of resume optimization.
Your goal is to provide a critical analysis of a resume against a job description such that it maximizes the chances of getting past ATS filters, generating maximum relevancy and to get shortlisted for the position using the suggested improvements.

Instructions for generating the suggestions:
Do not give suggestions on adding summary section.
Do not give suggestions on formatting or style unless it directly impacts ATS compatibility.
Do not suggest changes in Education, Certifications & Hackathons sections.
Do not suggest changes in dates of employment.
Focus on tailoring work experience, skills, projects and keywords to align with the job description.
Always stick to the facts and do not give generic advice.
Always be specific in the suggestions provided to improve the resume for this specific job description.
Also, provide suggestions to remove irrelevant information that does not align with the job description.
Try to use metrics or quantifying statements in the suggestions wherever possible.
When providing a suggestion on quantifying achievements, always suggest specific metrics that align better with the job description and use researched data for metric values.

Analyze the following resume and job description.
<resume>
{resume}
</resume>
<job_description>
{job_description}
</job_description>

Based on your analysis, provide a relevancy score from 0-100 and a list of 3-5 actionable suggestions.

{format_instructions}
"""

prompt = PromptTemplate(
    template=prompt_template,
    input_variables=["resume", "job_description"],
    partial_variables={"format_instructions": parser.get_format_instructions()},
)

chain = prompt | llm | parser

async def get_llm_analysis(resume: str, job_description: str):
    """
    Asynchronously invokes the LangChain chain and returns the structured result.
    """
    try:
        result = await chain.ainvoke({
            "resume": resume,
            "job_description": job_description
        })  
        return result.relevancyScore, result.suggestions
    
    except Exception as e:
        print(f"An error occurred in the LangChain service: {e}")
        raise
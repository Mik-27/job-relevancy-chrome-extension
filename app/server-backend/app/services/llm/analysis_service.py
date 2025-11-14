from ...schemas import RelevancyScoreSchema, SuggestionsSchema
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_google_vertexai import ChatVertexAI
# from app.config import settings
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize the model using the key from our settings config
llm = ChatVertexAI(model="gemini-2.5-pro", temperature=0.1)

# --- Chain 1: Fast Relevancy Score ---

score_parser = PydanticOutputParser(pydantic_object=RelevancyScoreSchema)

score_prompt_template = """
You are an expert hiring manager. Your task is to provide a quick, numerical score of a resume's relevance to a job description.
Analyze the provided RESUME and JOB_DESCRIPTION.
Your output MUST be a single JSON object containing only the relevancy score.

Instructions for generating relevancy score:
- Provide a single integer score from 0 to 100 (it does not have to be a multiple of 5).
- A score of 0 means the resume is completely irrelevant to the job description.
- A score of 100 means the resume perfectly matches the job description.
- First consider the required and preferred skills listed in the job description and check if they align with the resume.
- Next, evaluate the work experience, projects, and achievements in the resume to see how well they correspond to the job description.
- Also, match job responsibilities with experience and projects listed in the resume.
- A directly matching resume project or experience should increase the score significantly.

{format_instructions}

<RESUME>
{resume}
</RESUME>

<JOB_DESCRIPTION>
{job_description}
</JOB_DESCRIPTION>
"""

score_prompt = PromptTemplate(
    template=score_prompt_template,
    input_variables=["resume", "job_description"],
    partial_variables={"format_instructions": score_parser.get_format_instructions()},
)

score_chain = score_prompt | llm | score_parser

async def get_relevancy_score(resume: str, job_description: str) -> int:
    """Invokes a specialized chain to get only the relevancy score."""
    result = await score_chain.ainvoke({"resume": resume, "job_description": job_description})
    return result.relevancyScore



# --- Chain 2: Detailed Suggestions ---

suggestions_parser = PydanticOutputParser(pydantic_object=SuggestionsSchema)

suggestions_prompt_template = """
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

Formatting Instructions for suggestions:
- If the suggestion is regarding rephrasing/rewriting and bullet point in experience or projects, provide the full rewritten bullet point as follows:
    "Rewrite the bullet point under [Experience/Project] at [Company/Project Name]: '[Original Bullet Point]...' -> '[Rewritten Bullet Point]'"
- If the suggestion is regarding adding a new bullet point in experience or projects, provide the full new bullet point as follows:
    "Add the following bullet point under [Experience/Project] at [Company/Project Name]: '[New Bullet Point]'"
- If the suggestion is regarding merging bullet points, provide the merged bullet point as follows:
    "Merge the following bullet points under [Experience/Project] at [Company/Project Name]: '[Bullet Point 1]...' and '[Bullet Point 2]...' -> '[Merged Bullet Point]'"
- If the suggestion is anything else, provide it as a concise action item (ignore the rephrasing format).

Analyze the following resume and job description.
<resume>
{resume}
</resume>
<job_description>
{job_description}
</job_description>

Based on your analysis, provide a relevancy score from 0-100 and a list of 5-7 actionable suggestions.

{format_instructions}
"""

suggestions_prompt = PromptTemplate(
    template=suggestions_prompt_template,
    input_variables=["resume", "job_description"],
    partial_variables={"format_instructions": suggestions_parser.get_format_instructions()},
)

suggestions_chain = suggestions_prompt | llm | suggestions_parser

async def get_suggestions(resume: str, job_description: str) -> list[str]:
    """Invokes a specialized chain to get only the improvement suggestions."""
    result = await suggestions_chain.ainvoke({"resume": resume, "job_description": job_description})
    return result.suggestions
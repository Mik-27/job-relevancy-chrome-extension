from ...schemas import CoverLetterSchema
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_google_vertexai import ChatVertexAI
from ...config import settings

# Initialize the LLM
llm = ChatVertexAI(
    model_name="gemini-2.5-pro",
    temperature=0.5,
    project=settings.GCP_PROJECT_ID,
    location=settings.GCP_CLIENT_LOCATION,
)

# --- Logic for the Cover Letter Feature ---
parser = PydanticOutputParser(pydantic_object=CoverLetterSchema)

prompt_template = """
You are an expert career coach and professional writer. Your task is to write a compelling, professional, and enthusiastic cover letter for a candidate applying for a specific job.

First, analyze the provided RESUME to understand the candidate's skills, experience, and tone.
Second, analyze the JOB_DESCRIPTION to identify the key requirements, responsibilities, and company values.

Then, write a cover letter from the candidate's perspective. The cover letter should:
1.  Be 3-4 paragraphs long.
2.  Not exceed 300 words.
3.  Have a professional and confident tone.
4.  In the first paragraph, introduce the candidate and the specific role they are applying for.
5.  In the body paragraphs, highlight 2-3 key experiences or projects from the resume that directly align with the most important requirements of the job description. Use specific examples and quantify achievements where possible.
6.  In the final paragraph, reiterate enthusiasm for the role and the company, and include a strong call to action.
7.  Do not include contact information, the date, or salutations like "Dear Hiring Manager" or "Sincerely". Only generate the body of the letter.
8.  Use the PERSONAL_INFO section to add any personal details that can make the cover letter more tailored and unique.
9.  Do not copy-paste sentences verbatim from the resume or job description. Instead, synthesize the information using the PERSONAL_INFO section and RESUME to create a unique and engaging narrative on how the candidates would fit in the team and add value.
10. Try to add information outside the resume to make the letter more personalized using the PERSONAL_INFO section.

Your output MUST be a single, valid JSON object that strictly follows the provided format instructions.

{format_instructions}

<RESUME>
{resume}
</RESUME>

<PERSONAL_INFO>
{personal_info}
</PERSONAL_INFO>

<JOB_DESCRIPTION>
{job_description}
</JOB_DESCRIPTION>
"""

prompt = PromptTemplate(
    template=prompt_template,
    input_variables=["resume", "job_description", "personal_info"],
    partial_variables={"format_instructions": parser.get_format_instructions()},
)

chain = prompt | llm | parser

async def generate_cover_letter_text(resume: str, job_description: str, personal_info: str) -> str:
    """Invokes the cover letter chain and returns the generated text."""
    result = await chain.ainvoke({
        "resume": resume,
        "job_description": job_description,
        "personal_info": personal_info
    })
    return result.cover_letter_text
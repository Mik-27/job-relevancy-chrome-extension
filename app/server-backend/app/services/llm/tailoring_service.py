from ...schemas import TailoredContentSchema
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_google_vertexai import ChatVertexAI
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize the LLM once for this module
llm = ChatVertexAI(model="gemini-2.5-pro", temperature=0.1)

# --- Logic for the Tailoring Feature ---
parser = PydanticOutputParser(pydantic_object=TailoredContentSchema)

prompt_template = """
You are an expert career coach and professional resume writer. Your task is to analyze the provided RESUME and JOB_DESCRIPTION, then rewrite and tailor the resume content to be a perfect fit for the job.

First, carefully read and understand the key requirements, skills, and responsibilities mentioned in the JOB_DESCRIPTION.
Second, analyze the candidate's RESUME to identify their skills, experiences, and projects.

Finally, generate a new, tailored resume content. Your output MUST be a single, valid JSON object that strictly follows the provided format instructions.
Focus on rephrasing the summary and experience bullet points to use keywords and highlight achievements that are most relevant to the job description.
Do not invent new experiences, but you can rephrase and emphasize existing ones.

Instructions on making changes in the resume against the job description:
Do not add fake information that is not present in the resume.
Do not change the candidate's name, contact information, education details, certifications, or dates of employment.
Focus on tailoring the summary, skills, experience bullet points, and projects to align with the job description.
Do not use articles like "a", "an", or "the" in the anywhere in the resume.
Remove any irrelevant information that does not align with the job description, if required.
Choose the best projects and skills that align with the job description if the resume provided is a CV, ignore otherwise.

{format_instructions}

Here is the candidate's original resume:
<RESUME>
{resume}
</RESUME>

Here is the target job description:
<JOB_DESCRIPTION>
{job_description}
</JOB_DESCRIPTION>
"""

prompt = PromptTemplate(
    template=prompt_template,
    input_variables=["resume", "job_description"],
    partial_variables={"format_instructions": parser.get_format_instructions()},
)

chain = prompt | llm | parser

async def get_tailored_content_as_json(resume: str, job_description: str) -> dict:
    """Invokes the tailoring chain to get a structured JSON object."""
    result = await chain.ainvoke({
        "resume": resume,
        "job_description": job_description
    })
    return result.model_dump()
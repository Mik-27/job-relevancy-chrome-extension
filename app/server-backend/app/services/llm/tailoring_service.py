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


# Generate tailored content from CV
selection_prompt_template = """
You are tasked with constructing a targeted resume JSON object based on a provided <MASTER_CV> and a <JOB_DESCRIPTION>.

### CORE DIRECTIVES (MUST FOLLOW):
1.  **IMMUTABILITY:** Do NOT rewrite, rephrase, or summarize any bullet points. You must copy the text of the selected bullet points EXACTLY as they appear in the Master CV.
2.  **SELECTION:** Select only the projects and experience entries that are most relevant to the <JOB_DESCRIPTION>. You do not need to include every job if it is not relevant, but do not leave gaps in employment history if possible.
3.  **GRANULARITY:** Inside each selected Job/Project, select only the specific bullet points that align with the keywords and requirements of the <JOB_DESCRIPTION>. Discard irrelevant bullet points.
4.  **METADATA:** Do NOT change Dates, Locations, Company Names, Job Titles, or Degree Titles. Copy them exactly.
5.  **SKILLS:** Filter the list of skills from the Master CV. Include only those that appear in or are relevant to the <JOB_DESCRIPTION>. Do not invent skills not present in the Master CV.
6.  **STATIC SECTIONS:** Copy the Education and Achievements/Certifications sections exactly as they are, without filtering.

Dos:
- Do prioritize bullet points that contain hard skills mentioned in the JD (e.g., if JD asks for "Python", pick the bullet point mentioning Python over the one mentioning Excel).
- Do maintain the reverse-chronological order of the Master CV.
- Do limit the number of bullet points per role to the top 3-5 most relevant ones to keep the resume concise.
Don'ts:
- Don't fix grammatical errors if found (unless explicitly asked). The goal is exact extraction to ensure truthfulness.
- Don't combine two bullet points into one.
- Don't hallucinate metrics. If the CV says "Improved performance", do not change it to "Improved performance by 20%" just because the JD likes metrics.

### OUTPUT FORMAT:
Return a single valid JSON object matching the following structure. Do not include markdown formatting or conversational text.

{format_instructions}

<MASTER_CV>
{cv_text}
</MASTER_CV>

<JOB_DESCRIPTION>
{job_description}
</JOB_DESCRIPTION>
"""

selection_prompt = PromptTemplate(
    template=selection_prompt_template,
    input_variables=["cv_text", "job_description"],
    partial_variables={"format_instructions": parser.get_format_instructions()},
)

selection_chain = selection_prompt | llm | parser

async def select_content_from_cv(cv_text: str, job_description: str) -> dict:
    """
    Invokes the selection chain to extract relevant content without rewriting.
    """
    result = await selection_chain.ainvoke({
        "cv_text": cv_text,
        "job_description": job_description
    })
    return result.model_dump()
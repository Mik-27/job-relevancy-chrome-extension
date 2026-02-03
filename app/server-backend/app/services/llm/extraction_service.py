from pydantic import BaseModel, Field
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_google_vertexai import ChatVertexAI
from ...config import settings

# A cheap, fast model is perfect for this extraction task
llm = ChatVertexAI(
    model_name="gemini-2.5-flash", 
    temperature=0,
    project=settings.GCP_PROJECT_ID,
    location=settings.GCP_CLIENT_LOCATION,
)

# Define what we want to extract
class JobMetadataSchema(BaseModel):
    job_role: str = Field(description="The job title or role name.")
    company_name: str = Field(description="The name of the hiring company.")
    job_id: str = Field(description="Any specific Job ID, Requisition ID, or Reference Number found. Return 'Unknown' if not found.")

parser = PydanticOutputParser(pydantic_object=JobMetadataSchema)

prompt_template = """
Extract the Job Title, Company Name, and Job ID from the following Job Description text.
If Job ID is not explicitly mentioned in job description, use job url to extract it, if you cannot find job id in job description or url, return "Unknown".
If a piece of information is missing, use "Unknown".

{format_instructions}

<JOB_URL>{job_url}</JOB_URL>

<JOB_DESCRIPTION>
{job_description}
</JOB_DESCRIPTION>
"""

prompt = PromptTemplate(
    template=prompt_template,
    input_variables=["job_description", "job_url"],
    partial_variables={"format_instructions": parser.get_format_instructions()},
)

chain = prompt | llm | parser

async def extract_job_metadata(job_description: str, job_url: str) -> dict:
    """Extracts metadata from JD text."""
    try:
        # We assume the JD isn't massive. If it is, maybe truncate it to first 2000 chars
        # as Job ID/Title are usually at the top.
        short_jd = job_description[:5000] 
        result = await chain.ainvoke({"job_description": short_jd, "job_url": job_url})
        return result.model_dump()
    except Exception as e:
        print(f"Extraction Error: {e}")
        return {"job_role": "Unknown", "company_name": "Unknown", "job_id": "Unknown"}
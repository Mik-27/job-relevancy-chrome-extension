# Report Service for Generating Structured Interview Reports from the live Voice Interview Using LLMs

from ...schemas import ShadowReportSchema
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_google_vertexai import ChatVertexAI
from ...config import settings

llm = ChatVertexAI(
    model_name="gemini-2.5-pro",
    temperature=0.3,
    project=settings.GCP_PROJECT_ID,
    location=settings.GCP_CLIENT_LOCATION,
)

parser = PydanticOutputParser(pydantic_object=ShadowReportSchema)

prompt_template = """
You are a "Bar Raiser" and Senior Hiring Manager at a top tech company. You have just conducted an interview.
Your task is to evaluate the candidate based ONLY on the provided TRANSCRIPT and the JOB_CONTEXT.

### INPUTS
JOB CONTEXT:
{job_context}

TRANSCRIPT:
{transcript}

### EVALUATION CRITERIA
1. **Verdict:** Be strict. "Strong Hire" is rare. "Lean Hire" is for good candidates with minor flaws. "No Hire" is for anyone who fails technical or behavioral bars.
2. **STAR Method:** Did they structure answers using Situation, Task, Action, Result?
3. **Red Flags:** Look for vague answers, lack of ownership ("we" instead of "I"), or technical inaccuracies.

{format_instructions}
"""

prompt = PromptTemplate(
    template=prompt_template,
    input_variables=["job_context", "transcript"],
    partial_variables={"format_instructions": parser.get_format_instructions()},
)

chain = prompt | llm | parser

async def generate_interview_report(job_context: str, transcript: str) -> dict:
    """Generates the structured shadow report."""
    if not transcript or len(transcript) < 50:
        # Fallback for empty interviews
        return {
            "verdict": "Lean No Hire",
            "candidate_presence": "Insufficient data.",
            "star_proficiency": "N/A",
            "key_observations": [],
            "strengths": [],
            "red_flags": ["Interview was too short to evaluate."],
            "hiring_manager_summary": "The candidate did not provide enough responses to evaluate.",
            "areas_for_improvement": ["Complete a full interview session."]
        }

    result = await chain.ainvoke({
        "job_context": job_context,
        "transcript": transcript
    })
    return result.model_dump()
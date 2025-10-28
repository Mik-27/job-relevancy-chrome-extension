from .schemas import AnalysisResultSchema

from dotenv import load_dotenv

from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser

from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()

llm = ChatGoogleGenerativeAI(model="gemini-2.5-pro", temperature=0.1)

parser = PydanticOutputParser(pydantic_object=AnalysisResultSchema)


prompt_template = """
You are an expert ATS (Applicant Tracking System) reviewer and career advisor with deep knowledge of resume optimization.
Your goal is to provide a critical analysis of a resume against a job description such that it maximizes the chances of getting past ATS filters and generating maximum relevancy.

Instructions for generating the suggestions:
Do not give suggestions on adding summary section.
Do not give suggestions on formatting or style unless it directly impacts ATS compatibility.
Do not suggest changes in Education, Certifications & Hackathons sections.
Focus on tailoring work experience, skills, projects and keywords to align with the job description.
Always stick to the facts and do not give generic advice.
Always be specific in the suggestions provided to improve the resume for this specific job description.
Also, provide suggestions to remove irrelevant information that does not align with the job description.
Try to use metrics or quantifying statements in the suggestions wherever possible.
When providing a suggestion on quantifying achievements, always suggest specific metrics that align with the job description and use researched data for metric values.

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

# Create a PromptTemplate object from the string.
prompt = PromptTemplate(
    template=prompt_template,
    input_variables=["resume", "job_description"],
    # This partial variable injects the formatting instructions from our parser.
    partial_variables={"format_instructions": parser.get_format_instructions()},
)


# --- 4. Build the Chain using LangChain Expression Language (LCEL) ---
# This is the modern, standard way to build chains according to the documentation.
# The `|` (pipe) operator connects the components in sequence.
# 1. The `prompt` takes the user input and formats it.
# 2. The formatted prompt is passed to the `llm`.
# 3. The raw output from the `llm` is passed to the `parser` to be converted
#    into a structured Pydantic object.
chain = prompt | llm | parser


# --- 5. The Service Function ---
# This function will be called by our FastAPI endpoint.
async def get_llm_analysis(resume: str, job_description: str):
    """
    Asynchronously invokes the LangChain chain and returns the structured result.
    """
    try:
        # `ainvoke` is the asynchronous method to run the chain.
        # We pass a dictionary matching the `input_variables` from our prompt.
        result = await chain.ainvoke({
            "resume": resume,
            "job_description": job_description
        })
        
        # The `result` is now a validated AnalysisResultSchema object.
        # We can access its attributes directly.
        return result.relevancyScore, result.suggestions
    except Exception as e:
        print(f"An error occurred in the LangChain service: {e}")
        # Propagate the error to be handled by the API endpoint's error handler.
        raise
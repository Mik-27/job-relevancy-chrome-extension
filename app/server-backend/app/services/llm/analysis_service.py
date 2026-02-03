from ...schemas import RelevancyScoreSchema, SuggestionsSchema
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_google_vertexai import ChatVertexAI
from ...config import settings

# Initialize the model using the key from our settings config
llm = ChatVertexAI(
    model="gemini-2.5-pro",
    temperature=0.1,
    project=settings.GCP_PROJECT_ID,
    location=settings.GCP_CLIENT_LOCATION,
)

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
For experience, do not suggest replacing the complete experience, instead suggest rewriting individual bullet points within that experience.
Avoid the use of articles like 'a', 'an', 'the' in the suggested text.

For each issue, provide a structured suggestion:
1. **Type**: The type of suggestion: 'rewrite', 'addition', 'removal', or 'formatting'.
2. **Location**: Specify where in the resume the change should be made (e.g., under which experience or project, or in which section).
3. **Original Text:** The exact text from the resume that needs changing. If it's a new addition, removal or formatting, leave this empty.
4. **Suggested Text:** A rewritten, powerful version using action verbs and provided metrics relevant to the JD.
5. **Reasoning:** Why this change helps (e.g., "Adds quantifiable impact"). Keep it short and simple.

Formatting Instructions for suggestions:
- Type: One of 'rewrite', 'addition', 'removal', or 'formatting'.
- Formatting instruction for 'location' field is as follows:
    Location: "[Experience/Project]: [Company/Project Name]"
- For location, use shorter names e.g. Experience instead of professional experience, Project instead of personal project.
- If the suggestion is regarding addition in skills section, provide the skill to be added as follows:
    Original Text: "" (leave empty)
    Suggested Text: "Add [Skills to be added] to [Skill Heading]"
- If the suggestion is regarding removal from skills section, provide the skill to be removed as follows:
    Original Text: "" (leave empty)
    Suggested Text: "Remove [Skills to be removed] from [Skill Heading]"
- If the suggestion is regarding adding a new bullet point in experience or projects (addition), provide the full new bullet point as follows:
    Original Text: "" (leave empty)
    Suggested Text: "Point to be added or removed"
- If the suggestion is regarding removing a new bullet point in experience or projects (removal), provide the full new bullet point as follows:
    Original Text: "Point to be removed"
    Suggested Text: "" (leave empty)
- If the suggestion is regarding removing a complete project or experience (removal), provide the full new bullet point as follows:
    Original Text: "Project/Experience Title" (Only Title)
    Suggested Text: "" (leave empty)
- If the suggestion is regarding merging bullet points, provide the merged bullet point as follows:
    Original Text: '[Bullet Point 1]...' + '[Bullet Point 2]...' 
    Suggested Text: '[Merged Bullet Point]'
- If the suggestion is anything else, provide it as a concise action item in 'Suggested Text' (ignore the rephrasing format).
- For the 'Reasoning' field, keep it concise, no need to repeat the project/experience/skill name. Just tell what value it adds

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
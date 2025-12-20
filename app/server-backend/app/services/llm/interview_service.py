import json
from langchain_core.prompts import PromptTemplate
from langchain_google_vertexai import ChatVertexAI
from ...config import settings

llm = ChatVertexAI(
    model_name="gemini-2.5-pro",
    temperature=0.4, 
)

# We want raw JSON output for flexibility
prompt_template = """
You are an expert Technical Interview Coach. Create a comprehensive Interview Preparation Kit.

### INPUTS
1. **Candidate Resume:**
{resume_text}

2. **Job Description:**
{job_description}

### TASK
Generate a JSON object with the following 4 distinct sections. 

1. **company_analysis**: Identify the company's core values, tech stack (implied or stated), and 3 strategic challenges they might be facing based on the JD.
2. **technical_questions**: Generate 5 technical questions specific to the skills listed in the JD (e.g., if React is listed, ask about React hooks or Lifecycle). Include a brief "Expected Answer Key" for each.
3. **resume_deep_dive**: Generate 3 specific questions probing the candidate's *actual* resume projects. (e.g., "In Project X, you mentioned using Redis. Why did you choose that over Postgres?").
4. **behavioral_questions**: Generate 3 behavioral questions using the STAR method format based on the "Soft Skills" required in the JD.

### OUTPUT FORMAT
Return ONLY valid JSON.
{{
  "company_analysis": {{ "values": [], "tech_stack": [], "challenges": [] }},
  "technical_questions": [ {{ "question": "...", "topic": "...", "answer_key": "..." }} ],
  "resume_deep_dive": [ {{ "question": "...", "context": "..." }} ],
  "behavioral_questions": [ {{ "question": "...", "competency": "..." }} ]
}}
"""

prompt = PromptTemplate(
    template=prompt_template,
    input_variables=["resume_text", "job_description"],
)

chain = prompt | llm

async def generate_interview_kit(resume_text: str, job_description: str) -> dict:
    response = await chain.ainvoke({
        "resume_text": resume_text,
        "job_description": job_description
    })
    
    # Basic cleanup if Markdown is returned
    content = response.content.strip()
    if content.startswith("```json"):
        content = content.replace("```json", "").replace("```", "")
    
    return json.loads(content)
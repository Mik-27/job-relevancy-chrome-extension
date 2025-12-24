import json
from langchain_core.prompts import PromptTemplate
from langchain_google_vertexai import ChatVertexAI
from ...config import settings

llm = ChatVertexAI(
    model_name="gemini-2.5-pro",
    temperature=0.4, 
)

# ------------------------ DEPRECATED: Use generate_round_prep ------------------------
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

# ----------------------------------------------------------------------------

# We need dynamic prompts based on type
async def generate_round_prep(
    resume_text: str, 
    job_description: str, 
    interview_type: str
) -> dict:
    
    # 1. Select Prompt based on Type
    specific_instructions = ""
    
    if interview_type == "technical":
        specific_instructions = """
        Focus on Hard Skills. 
        - Generate 3 LeetCode-style algorithmic questions relevant to the role's level.
        - Generate 7 technical concept questions related to the job description and user's resume.
        - For Leetcode-style questions:
          - Provide hints on approach.
          - Provide coding paradigms to use (e.g., "Use DFS", "Two-pointer technique", "2D dynamic programming").
        - Include code solutions in 'sample_answer' for Leetcode-style questions.
        """
    elif interview_type == "system_design":
        specific_instructions = """
        Focus on Architecture.
        - Generate 2 high-level system design prompts (e.g., "Design Twitter").
        - List key trade-offs to discuss (SQL vs NoSQL, Latency vs Consistency).
        - Focus on scalability and reliability.
        - Generate a total of 10 questions combining design and architecture concepts.
        """
    elif interview_type == "behavioral" or interview_type == "hiring_manager":
        specific_instructions = """
        Focus on Soft Skills and Culture.
        - Generate 10 STAR method questions based on the company's values found in the JD.
        - Suggest "situations" from the user's resume that fit these questions.
        - Eg: "Tell me about a time you faced a conflict at work..."
        """
    else: # Screening
        specific_instructions = """
        Focus on Basics.
        - "Tell me about yourself" pitch. (Make this pitch more personalized rather than just repeating resume points)
        - "Why this company?"
        - "What makes you a perfect candidate for the role".
        - Basic questions on resume highlights.
        - General tips for Salary Negotiations.
        """

    prompt_template = f"""
    You are an expert Interview Coach. Prepare a guide for a {{interview_type}} interview. Generate focused study areas, questions, and tips.
    
    ### GENERAL INSTRUCTIONS
    - The questions must contain the question text, a hint on how to answer, and a sample answer.
    - Add line breaks between new points for readability.
    - Bolden bullet headings.
    - Keep the tone encouraging and positive.

    ### INPUTS
    Resume: {resume_text}
    Job Description: {job_description}

    ### SPECIFICINSTRUCTIONS
    {specific_instructions}

    ### OUTPUT FORMAT (JSON)
    Return a valid JSON object. The structure should be:
    {{{{
        "focus_areas": ["Top 3 topics to study"],
        "questions": [
            {{{{ "q": "Question text", "hint": "How to answer - tips", "sample_answer": "Example Answer" }}}}
        ],
        "tips": ["Specific tips for this interview type"]
    }}}}
    """

    prompt = PromptTemplate(template=prompt_template, input_variables=["resume_text", "job_description", "interview_type"])
    chain = prompt | llm

    # Invoke
    response = await chain.ainvoke({
        "resume_text": resume_text,
        "job_description": job_description,
        "interview_type": interview_type
    })
    
    # ... (Cleanup markdown logic same as before) ...
    content = response.content.strip()
    if content.startswith("```json"):
        content = content.replace("```json", "").replace("```", "")
    
    return json.loads(content)
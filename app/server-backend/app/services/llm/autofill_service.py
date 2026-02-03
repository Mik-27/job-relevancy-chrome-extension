import json
from typing import List, Dict
from ...schemas import FormField
from langchain_core.prompts import PromptTemplate
from langchain_google_vertexai import ChatVertexAI
from ...config import settings

# Use a faster model for form filling if possible, or Pro for reasoning
llm = ChatVertexAI(
    model_name="gemini-2.5-pro",
    temperature=0.4, # Low temperature for factual filling
    project=settings.GCP_PROJECT_ID,
    location=settings.GCP_CLIENT_LOCATION,
)

prompt_template = """
You are an intelligent form-filling assistant. Your goal is to map a user's profile information to a list of form fields found on a job application page.

### USER PROFILE / CV CONTEXT
{user_context}

### JOB CONTEXT (Optional)
{job_description}

### FORM FIELDS TO FILL
{form_fields_json}

### INSTRUCTIONS
1. Analyze each field's `label` and `type`.
2. Determine the best value from the USER PROFILE.
3. **For Dropdowns (`select`):** You MUST choose one of the values provided in the `options` list. If no exact match, pick the closest semantic match.
4. **For Radio/Checkbox:** Return "true", "false", or the value of the option to check.
5. **For Text Areas:**
   - If it asks for a cover letter, summary, or "Why us?", use the user context and job context to draft a short, relevant answer (max 3-4 sentences unless specified).
   - If it asks for LinkedIn/Website, extract the URL.
6. **Authorization/Sponsorship:**
   - If the user context doesn't explicitly state sponsorship status, assume they are authorized and do NOT need sponsorship (standard default), unless the context implies otherwise (e.g. international address). *Ideally, user context should have this.*

### OUTPUT FORMAT
Return a raw JSON object mapping `id` to `value`.
Example: {{ "first_name_input": "John", "sponsorship_select": "No", "why_us_textarea": "I love your mission..." }}
"""

prompt = PromptTemplate(
    template=prompt_template,
    input_variables=["user_context", "job_description", "form_fields_json"],
)

chain = prompt | llm

async def generate_autofill_values(
    user_context: str, 
    fields: List[FormField],
    job_description: str
) -> Dict[str, str]:
    
    # Convert fields to a clean JSON string for the prompt
    fields_json = json.dumps([f.model_dump() for f in fields], indent=2)

    response = await chain.ainvoke({
        "user_context": user_context,
        "form_fields_json": fields_json,
        "job_description": job_description
    })
    
    # Clean up response (Vertex AI sometimes returns markdown blocks)
    content = response.content.strip()
    if content.startswith("```json"):
        content = content.replace("```json", "").replace("```", "")
    
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        print("Error parsing Autofill JSON")
        return {}
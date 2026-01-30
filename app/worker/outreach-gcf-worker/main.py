import base64
import json
import os
import requests
import functions_framework
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from supabase import create_client
import vertexai
# from vertexai.generative_models import GenerativeModel
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI

# --- CONFIG FROM ENV ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
GCP_PROJECT = os.environ.get("GCP_PROJECT_ID")
GCP_LOCATION = os.environ.get("GCP_LOCATION", "us-central1")
SEARCH_API_KEY = os.environ.get("GOOGLE_SEARCH_API_KEY")
SEARCH_ENGINE_ID = os.environ.get("GOOGLE_SEARCH_ENGINE_ID")
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")

# Initialize Supabase
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

@functions_framework.cloud_event
def process_outreach(cloud_event):
    # 1. Decode Pub/Sub Message
    try:
        pubsub_data = base64.b64decode(cloud_event.data["message"]["data"]).decode("utf-8")
        data = json.loads(pubsub_data)
        print(f"Processing outreach for: {data.get('name')} at {data.get('company')}")
    except Exception as e:
        print(f"Error decoding message: {e}")
        return

    # 2. Research (Google Search & Jina)
    research_context = "No specific news found."
    website_content = ""
    
    try:
        # A. Google Search
        search_url = "https://www.googleapis.com/customsearch/v1"
        params = {
            "key": SEARCH_API_KEY,
            "cx": SEARCH_ENGINE_ID,
            "q": f"{data['company']} recent news engineering challenges"
        }
        res = requests.get(search_url, params=params).json()
        
        snippets = [item['snippet'] for item in res.get('items', [])[:3]]
        research_context = "\n".join(snippets)
        
        # B. Jina Scrape (Job Link or Company Site)
        target_url = data.get('job_link')
        if not target_url and res.get('items'):
             target_url = res['items'][0]['link'] # Fallback to first search result
             
        if target_url:
            print(f"Scraping URL: {target_url}")
            jina_res = requests.get(f"https://r.jina.ai/{target_url}")
            if jina_res.status_code == 200:
                website_content = jina_res.text[:2000]
    except Exception as e:
        print(f"Research warning: {e}")

    # TODO: get user context from DB

    # 3. LLM Draft (Vertex AI)
    try:
        vertexai.init(project=GCP_PROJECT, location=GCP_LOCATION)
        
        # Define Pydantic model for structured output
        from pydantic import BaseModel, Field
        
        class EmailDraft(BaseModel):
            subject: str = Field(description="Concise, catchy email subject relevant to research")
            body: str = Field(description="Email body under 150 words connecting user context to company needs")
        
        # Setup parser and LLM
        parser = PydanticOutputParser(pydantic_object=EmailDraft)
        llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-pro",
            temperature=0.7,
            project=GCP_PROJECT,
            location=GCP_LOCATION,
        )
        
        prompt = PromptTemplate(
            template="""
            You are an expert Cold Email Outreach representative with proficiency in drafting cold emails to recruiters and hiring managers asking for job opportunities. 
            
            Write a cold email to {name} at {company}.
            
            ### MY CONTEXT
            {user_context}
            
            ### RESEARCH
            News: {research_context}
            Website/Job Info: {website_content}
            
            ### GENERAL INSTRUCTIONS
            - Do not let the email be robotic, make it sound human and personalized.
            - Keep it concise and to the point.
            - Use HTML tags for formatting the resume appropriately.
            - Subject: Concise, Catchy, relevant to research.
            - Body: < 200 words. Connect my context to their needs.
            - Start the email with a greeting.
            - Use HTML <br> tags for line breaks in the body.
            - Be polite and professional (You are asking for help and not demanding it).
            - {format_instructions}
            
            ### INSTRUCTIONS FOR WRITING BODY
            - Start with a greeting addressing {name}.
            - Seperate the body in 3 paragraphs: Introduction, Value Proposition, Call to Action.
            - Introduce yourself briefly (1-2 sentences). Start with instrucing myself and my experience and then why I am reaching out.
            - Reference specific points from the research to show genuine interest.
            - Explain how my skills/experience can help {company} with their challenges.
            - End with a polite request for a conversation or to connect with relevant hiring managers/recruiters.
            - End the conversation with a professional sign-off. (e.g., "Best regards," <br> <user_name>)")
            """,
            input_variables=["name", "company", "user_context", "research_context", "website_content"],
            partial_variables={"format_instructions": parser.get_format_instructions()}
        )
        
        # Create chain
        chain = prompt | llm | parser
        
        # Execute
        email_draft = chain.invoke({
            "name": data['name'],
            "company": data['company'],
            "user_context": data['user_context'],
            "research_context": research_context,
            "website_content": website_content
        })
        
        # Convert Pydantic model to dict
        email_draft = {"subject": email_draft.subject, "body": email_draft.body}
        
        
    except Exception as e:
        print(f"LLM generation failed: {e}")
        # Update DB with failure
        supabase.table("outreach_history").update({"status": "failed"}).eq("id", data['record_id']).execute()
        return

    # 4. Create Gmail Draft
    try:
        # Fetch User's Refresh Token
        user_record = supabase.table("users").select("gmail_refresh_token").eq("id", data['user_id']).execute()
        if not user_record.data or not user_record.data[0].get('gmail_refresh_token'):
            print(f"User {data['user_id']} has not connected Gmail.")
            return

        refresh_token = user_record.data[0]['gmail_refresh_token']

        # Reconstruct Credentials
        creds = Credentials(
            None, # Access token (will be refreshed)
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=GOOGLE_CLIENT_ID,
            client_secret=GOOGLE_CLIENT_SECRET
        )
        
        service = build('gmail', 'v1', credentials=creds)
        
        # Create MIME Message
        from email.mime.text import MIMEText
        import base64 as b64_std
        
        print("DEBUG: Email Draft:", email_draft['body'])
        
        message = MIMEText(email_draft['body'], 'html')
        message['to'] = data['email']
        message['subject'] = email_draft['subject']
        raw_message = b64_std.urlsafe_b64encode(message.as_bytes()).decode()
        
        print("Draft raw_message:", raw_message)
        
        draft = service.users().drafts().create(userId="me", body={'message': {'raw': raw_message}}).execute()

        # 5. Update Database Success
        supabase.table("outreach_history").update({
            "status": "drafted",
            "draft_metadata": draft
        }).eq("id", data['record_id']).execute()
        
        print(f"Draft created successfully: {draft['id']}")

    except Exception as e:
        print(f"Gmail Draft failed: {e}")
        supabase.table("outreach_history").update({"status": "failed"}).eq("id", data['record_id']).execute()
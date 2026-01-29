import base64
import json
import os
import requests
import functions_framework
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from supabase import create_client
import vertexai
from vertexai.generative_models import GenerativeModel

# --- CONFIG ---
# Set these as Environment Variables in GCF
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") 
GCP_PROJECT = os.environ.get("GCP_PROJECT_ID")
GCP_LOCATION = "us-central1"
SEARCH_API_KEY = os.environ.get("GOOGLE_SEARCH_API_KEY")
SEARCH_ENGINE_ID = os.environ.get("GOOGLE_SEARCH_ENGINE_ID")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

@functions_framework.cloud_event
def process_outreach(cloud_event):
    # 1. Decode Pub/Sub Message
    pubsub_data = base64.b64decode(cloud_event.data["message"]["data"]).decode("utf-8")
    data = json.loads(pubsub_data)
    
    print(f"Processing: {data['name']} at {data['company']}")

    # 2. Research (Google Search)
    research_context = ""
    try:
        search_url = "https://www.googleapis.com/customsearch/v1"
        params = {
            "key": SEARCH_API_KEY,
            "cx": SEARCH_ENGINE_ID,
            "q": f"{data['company']} recent news engineering challenges"
        }
        res = requests.get(search_url, params=params).json()
        
        snippets = [item['snippet'] for item in res.get('items', [])[:3]]
        
        # 2b. Jina Scrape (If link found)
        website_content = ""
        if res.get('items') and len(res['items']) > 0:
            link = res['items'][0]['link']
            # Jina Scrape
            jina_res = requests.get(f"https://r.jina.ai/{link}")
            if jina_res.status_code == 200:
                website_content = jina_res.text[:2000] # Limit length

        research_context = f"News:\n{chr(10).join(snippets)}\n\nWebsite:\n{website_content}"
    except Exception as e:
        print(f"Research failed: {e}")

    # 3. LLM Draft (Vertex AI)
    vertexai.init(project=GCP_PROJECT, location=GCP_LOCATION)
    model = GenerativeModel("gemini-1.5-pro")
    
    prompt = f"""
    Write a cold email to {data['name']} at {data['company']}.
    
    My Resume Context: {data['user_context']}
    
    Company Research: {research_context}
    
    Instructions:
    - Subject: Catchy, relevant.
    - Body: < 150 words. Connect my skills to their news/site.
    - Output JSON: {{ "subject": "...", "body": "..." }}
    """
    
    response = model.generate_content(prompt)
    email_draft = json.loads(response.text.replace("```json", "").replace("```", ""))

    # 4. Create Gmail Draft
    # Fetch Refresh Token for this user
    user_record = supabase.table("users").select("gmail_refresh_token").eq("id", data['user_id']).execute()
    refresh_token = user_record.data[0]['gmail_refresh_token']
    
    if not refresh_token:
        print("User has not connected Gmail.")
        return

    # Reconstruct Credentials
    creds = Credentials(
        None, # Access token (will be refreshed)
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.environ.get("GOOGLE_CLIENT_ID"),
        client_secret=os.environ.get("GOOGLE_CLIENT_SECRET")
    )
    
    service = build('gmail', 'v1', credentials=creds)
    
    # Create MIME Message
    from email.mime.text import MIMEText
    import base64
    
    message = MIMEText(email_draft['body'], 'html')
    message['to'] = data['email']
    message['subject'] = email_draft['subject']
    raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
    
    draft = service.users().drafts().create(userId="me", body={'message': {'raw': raw_message}}).execute()

    # 5. Update Database
    supabase.table("outreach_history").update({
        "status": "drafted",
        "gmail_metadata": draft
    }).eq("id", data['record_id']).execute()
    
    print(f"Draft created: {draft['id']}")
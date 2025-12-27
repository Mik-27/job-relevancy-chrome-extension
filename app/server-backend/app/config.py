import os
from pydantic_settings import BaseSettings, SettingsConfigDict


env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')

class Settings(BaseSettings):
    # Load settings from the absolute path we just calculated
    model_config = SettingsConfigDict(env_file=env_path, env_file_encoding='utf-8')

    # Supabase Settings
    SUPABASE_URL: str
    SUPABASE_DB_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_JWT_SECRET: str
    
    # GCS Settings
    BUCKET_NAME: str
    GOOGLE_APPLICATION_CREDENTIALS: str
    
    GCP_PROJECT_ID: str
    GCP_CLIENT_LOCATION: str = "us-central1"
    
    # N8N Webhook URL
    N8N_WEBHOOK_SECRET: str = ""
    N8N_WEBHOOK_URL: str = ""
    N8N_WEBHOOK_TEST_URL: str = ""

# Create a single, importable instance of the settings
settings = Settings()
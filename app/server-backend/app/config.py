import os
from pydantic_settings import BaseSettings, SettingsConfigDict


env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')

class Settings(BaseSettings):
    # Load settings from the absolute path we just calculated
    model_config = SettingsConfigDict(env_file=env_path, env_file_encoding='utf-8')

    # Supabase Settings
    SUPABASE_DB_URL: str
    
    # GCS Settings
    BUCKET_NAME: str
    GOOGLE_APPLICATION_CREDENTIALS: str
    
    # Google AI Settings
    # GOOGLE_API_KEY: str

# Create a single, importable instance of the settings
settings = Settings()
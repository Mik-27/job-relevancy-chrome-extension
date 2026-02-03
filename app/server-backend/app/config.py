import os
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = os.path.dirname(os.path.dirname(__file__))
env_path = os.path.join(BASE_DIR, '.env')

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
    
    # OAuth Clients
    GOOGLE_OAUTH_CLIENT_ID: str = ""
    GOOGLE_OAUTH_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:3000/dashboard/profile"

# Create a single, importable instance of the settings
settings = Settings()


def _resolve_credentials_path(raw_path: str) -> str:
    path = raw_path.strip()
    if not path:
        return path

    base_parent = os.path.dirname(BASE_DIR)
    file_name = os.path.basename(path)

    candidates = []

    if os.path.isabs(path):
        candidates.append(path)
    else:
        candidates.append(os.path.abspath(os.path.join(BASE_DIR, path)))
        candidates.append(os.path.abspath(os.path.join(base_parent, path)))

    if file_name:
        candidates.append(os.path.abspath(os.path.join(BASE_DIR, file_name)))
        candidates.append(os.path.abspath(os.path.join(base_parent, file_name)))

    # Preserve order while de-duplicating.
    seen = set()
    unique_candidates = []
    for candidate in candidates:
        normalized = os.path.normcase(os.path.normpath(candidate))
        if normalized not in seen:
            seen.add(normalized)
            unique_candidates.append(candidate)

    for candidate in unique_candidates:
        if os.path.isfile(candidate):
            return candidate

    return unique_candidates[0] if unique_candidates else path


def _configure_google_cloud_environment() -> None:
    credentials_path = _resolve_credentials_path(settings.GOOGLE_APPLICATION_CREDENTIALS)

    if credentials_path:
        if not os.path.isfile(credentials_path):
            raise FileNotFoundError(
                "GOOGLE_APPLICATION_CREDENTIALS points to a missing file. "
                f"Resolved path: {credentials_path}. "
                f"Expected credentials near: {BASE_DIR}."
            )
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path

    if settings.GCP_PROJECT_ID:
        os.environ.setdefault("GOOGLE_CLOUD_PROJECT", settings.GCP_PROJECT_ID)

    if settings.GCP_CLIENT_LOCATION:
        os.environ.setdefault("GOOGLE_CLOUD_LOCATION", settings.GCP_CLIENT_LOCATION)

    os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "true")


_configure_google_cloud_environment()
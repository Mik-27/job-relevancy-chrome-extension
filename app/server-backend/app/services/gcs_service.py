from google.cloud import storage
from fastapi import UploadFile
from app.config import settings
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize the GCS client once
storage_client = storage.Client()
bucket = storage_client.bucket(settings.BUCKET_NAME)

async def upload_file_to_gcs(file: UploadFile, destination_path: str) -> str:
    """Uploads a file to a specific path in the GCS bucket."""
    try:
        blob = bucket.blob(destination_path)
        
        contents = await file.read()
        blob.upload_from_string(contents, content_type=file.content_type)
        
        print(f"File {file.filename} uploaded to {destination_path}.")
        # In a real app, you might not want to make files public by default
        return blob.public_url
    except Exception as e:
        print(f"An error occurred while uploading to GCS: {e}")
        raise

def download_file_as_bytes(source_path: str) -> bytes:
    """Downloads a file from GCS and returns its content as bytes."""
    blob = bucket.blob(source_path)
    return blob.download_as_bytes()

def delete_file_from_gcs(source_path: str):
    """Deletes a file from the GCS bucket."""
    try:
        blob = bucket.blob(source_path)
        blob.delete()
        print(f"Successfully deleted {source_path} from GCS.")
    except Exception as e:
        print(f"Failed to delete {source_path} from GCS: {e}")
        # raise e

from PyPDF2 import PdfReader
import io

def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    """Extracts all text from a PDF provided as bytes."""
    pdf_reader = PdfReader(io.BytesIO(pdf_bytes))
    text = ""
    for page in pdf_reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
    return text
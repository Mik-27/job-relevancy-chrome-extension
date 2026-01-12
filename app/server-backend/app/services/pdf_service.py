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

def extract_text_from_file_bytes(file_bytes: bytes, content_type: str) -> str:
    """Extracts text from file bytes based on content type."""
    if content_type == "":
        raise ValueError("Content type is required to extract text from file bytes.")
    elif content_type == "application/pdf":
        return extract_text_from_pdf_bytes(file_bytes)
    elif content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        # .docx files (Office 2007+)
        # HACK: 'textract' could be used here as well, but adding direct dependency for simplicity
        from docx import Document
        document = Document(io.BytesIO(file_bytes))
        text = "\n".join([para.text for para in document.paragraphs])
        print(text[:100])
        return text
    raise ValueError(f"Unsupported content type for text extraction: {content_type}")
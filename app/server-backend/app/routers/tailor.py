from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from ..services import tailoring_service

router = APIRouter()

@router.post("/tailor/test", tags=["Tailoring"])
async def test_tailor_resume():
    """A simple endpoint to test the LaTeX compilation process."""
    try:
        pdf_path = await tailoring_service.test_latex_compilation()
        
        return FileResponse(
            path=pdf_path,
            media_type='application/pdf',
            filename='test_resume.pdf'
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="API Error: " + str(e))
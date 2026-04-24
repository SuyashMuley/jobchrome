import io
import pdfplumber
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/resume", tags=["resume"])

MAX_PDF_BYTES = 5 * 1024 * 1024  # 5 MB


class ParsedResume(BaseModel):
    text: str
    page_count: int


@router.post("/parse", response_model=ParsedResume)
async def parse_resume(file: UploadFile = File(...)) -> ParsedResume:
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    raw = await file.read()
    if len(raw) > MAX_PDF_BYTES:
        raise HTTPException(status_code=413, detail="PDF exceeds 5 MB limit.")

    try:
        with pdfplumber.open(io.BytesIO(raw)) as pdf:
            page_count = len(pdf.pages)
            pages = []
            for page in pdf.pages:
                text = page.extract_text(x_tolerance=2, y_tolerance=2)
                if text:
                    pages.append(text.strip())
            full_text = "\n\n".join(pages)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse PDF: {e}")

    if not full_text.strip():
        raise HTTPException(status_code=422, detail="PDF appears to contain no extractable text (may be image-based).")

    return ParsedResume(text=full_text, page_count=page_count)

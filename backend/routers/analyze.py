from fastapi import APIRouter, HTTPException, Header
from typing import Annotated
from models.request import AnalyzeRequest
from models.response import AnalyzeResponse
from services.analyzer import analyze_job

router = APIRouter(prefix="/analyze", tags=["analyze"])


@router.post("", response_model=AnalyzeResponse)
async def analyze(
    request: AnalyzeRequest,
    x_anthropic_key: Annotated[str | None, Header()] = None,
    x_xai_key: Annotated[str | None, Header()] = None,
) -> AnalyzeResponse:
    try:
        return await analyze_job(request, anthropic_key=x_anthropic_key, xai_key=x_xai_key)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

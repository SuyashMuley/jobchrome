from models.request import AnalyzeRequest
from models.response import AnalyzeResponse
from services.llm import get_provider


async def analyze_job(
    request: AnalyzeRequest,
    anthropic_key: str | None = None,
    xai_key: str | None = None,
) -> AnalyzeResponse:
    provider = get_provider(request.provider, anthropic_key=anthropic_key, xai_key=xai_key)
    return await provider.analyze(
        resume_text=request.resume_text,
        job=request.job,
        preferences=request.preferences,
    )

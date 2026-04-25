from typing import Literal
from pydantic import BaseModel, Field


class ATSBreakdown(BaseModel):
    keyword_match: int        # 0-100
    skills_match: int         # 0-100
    experience_match: int     # 0-100
    preference_alignment: int # 0-100


class ColdEmail(BaseModel):
    recommended: bool
    subject: str = ""
    body: str = ""


class AnalyzeResponse(BaseModel):
    ats_score: int                         # 0-100 weighted average
    ats_breakdown: ATSBreakdown
    recommendation: Literal["apply", "skip"]
    reasoning: str
    tailoring_suggestions: list[str] = Field(default_factory=list)
    cold_email: ColdEmail
    recruiter_search_template: str
    provider_used: str

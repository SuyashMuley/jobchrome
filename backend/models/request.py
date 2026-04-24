from typing import Literal
from pydantic import BaseModel, Field


class JobInput(BaseModel):
    title: str
    company: str
    location: str = ""
    description: str
    source: str  # "linkedin" | "indeed" | ...


class UserPreferences(BaseModel):
    domains: list[str] = Field(default_factory=list)
    tech_stack: list[str] = Field(default_factory=list)
    target_roles: list[str] = Field(default_factory=list)
    experience_level: Literal["entry", "mid", "senior", "lead"] = "mid"
    job_types: list[Literal["full-time", "part-time", "contract", "internship"]] = Field(
        default_factory=lambda: ["full-time"]
    )
    work_mode: Literal["remote", "hybrid", "onsite", "any"] = "any"
    excluded_keywords: list[str] = Field(default_factory=list)


class AnalyzeRequest(BaseModel):
    resume_text: str
    job: JobInput
    preferences: UserPreferences = Field(default_factory=UserPreferences)
    provider: Literal["claude", "grok"] = "claude"

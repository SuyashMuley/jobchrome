import os
import json
from openai import AsyncOpenAI
from models.request import JobInput, UserPreferences
from models.response import AnalyzeResponse, ATSBreakdown, ColdEmail
from services.llm.base import LLMProvider, ANALYSIS_TOOL_SCHEMA, build_system_prompt, build_user_prompt

_GROQ_BASE_URL = "https://api.groq.com/openai/v1"

# Available Groq models — llama-3.3-70b is the best free-tier option
GROQ_MODELS = {
    "llama-3.3-70b": "llama-3.3-70b-versatile",
    "llama-3.1-8b": "llama-3.1-8b-instant",
    "mixtral-8x7b": "mixtral-8x7b-32768",
    "gemma2-9b": "gemma2-9b-it",
}
DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile"


class GroqProvider(LLMProvider):
    def __init__(self, api_key: str | None = None, model: str | None = None):
        self._client = AsyncOpenAI(
            api_key=api_key or os.environ["GROQ_API_KEY"],
            base_url=_GROQ_BASE_URL,
        )
        self._model = model or os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL)

    async def analyze(
        self,
        resume_text: str,
        job: JobInput,
        preferences: UserPreferences,
    ) -> AnalyzeResponse:
        system_prompt = build_system_prompt(resume_text, preferences)

        openai_tool = {
            "type": "function",
            "function": {
                "name": ANALYSIS_TOOL_SCHEMA["name"],
                "description": ANALYSIS_TOOL_SCHEMA["description"],
                "parameters": ANALYSIS_TOOL_SCHEMA["input_schema"],
            },
        }

        response = await self._client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": build_user_prompt(job)},
            ],
            tools=[openai_tool],
            tool_choice={"type": "function", "function": {"name": "submit_analysis"}},
            temperature=0.2,
        )

        tool_call = response.choices[0].message.tool_calls[0]
        data = json.loads(tool_call.function.arguments)
        return _parse(data, provider=f"groq/{self._model}")


def _parse(data: dict, provider: str) -> AnalyzeResponse:
    breakdown = ATSBreakdown(
        keyword_match=data["ats_breakdown"]["keyword_match"],
        skills_match=data["ats_breakdown"]["skills_match"],
        experience_match=data["ats_breakdown"]["experience_match"],
        preference_alignment=data["ats_breakdown"]["preference_alignment"],
    )
    cold_email = ColdEmail(
        recommended=data["cold_email_recommended"],
        subject=data.get("cold_email_subject", ""),
        body=data.get("cold_email_body", ""),
    )
    return AnalyzeResponse(
        ats_score=data["ats_score"],
        ats_breakdown=breakdown,
        recommendation=data["recommendation"],
        reasoning=data["reasoning"],
        tailoring_suggestions=data.get("tailoring_suggestions", []),
        cold_email=cold_email,
        recruiter_search_template=data["recruiter_search_template"],
        provider_used=provider,
    )

import os
import json
from openai import AsyncOpenAI
from models.request import JobInput, UserPreferences
from models.response import AnalyzeResponse, ATSBreakdown, ColdEmail
from services.llm.base import LLMProvider, ANALYSIS_TOOL_SCHEMA, build_system_prompt, build_user_prompt

# xAI Grok uses an OpenAI-compatible API
_XAI_BASE_URL = "https://api.x.ai/v1"
_GROK_MODEL = "grok-3-latest"


class GrokProvider(LLMProvider):
    def __init__(self, api_key: str | None = None):
        self._client = AsyncOpenAI(
            api_key=api_key or os.environ["XAI_API_KEY"],
            base_url=_XAI_BASE_URL,
        )

    async def analyze(
        self,
        resume_text: str,
        job: JobInput,
        preferences: UserPreferences,
    ) -> AnalyzeResponse:
        system_prompt = build_system_prompt(resume_text, preferences)

        # Convert Anthropic tool schema to OpenAI function-calling format
        openai_tool = {
            "type": "function",
            "function": {
                "name": ANALYSIS_TOOL_SCHEMA["name"],
                "description": ANALYSIS_TOOL_SCHEMA["description"],
                "parameters": ANALYSIS_TOOL_SCHEMA["input_schema"],
            },
        }

        response = await self._client.chat.completions.create(
            model=_GROK_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": build_user_prompt(job)},
            ],
            tools=[openai_tool],
            tool_choice={"type": "function", "function": {"name": "submit_analysis"}},
        )

        tool_call = response.choices[0].message.tool_calls[0]
        data = json.loads(tool_call.function.arguments)

        return _parse_tool_input(data, provider="grok")


def _parse_tool_input(data: dict, provider: str) -> AnalyzeResponse:
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

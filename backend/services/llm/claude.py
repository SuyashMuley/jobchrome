import os
import anthropic
from models.request import JobInput, UserPreferences
from models.response import AnalyzeResponse, ATSBreakdown, ColdEmail
from services.llm.base import LLMProvider, ANALYSIS_TOOL_SCHEMA, build_system_prompt, build_user_prompt


class ClaudeProvider(LLMProvider):
    def __init__(self, api_key: str | None = None):
        self._client = anthropic.AsyncAnthropic(
            api_key=api_key or os.environ["ANTHROPIC_API_KEY"]
        )

    async def analyze(
        self,
        resume_text: str,
        job: JobInput,
        preferences: UserPreferences,
    ) -> AnalyzeResponse:
        system_prompt = build_system_prompt(resume_text, preferences)

        # Cache the system prompt (contains resume + preferences — large, static per user session)
        response = await self._client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            system=[
                {
                    "type": "text",
                    "text": system_prompt,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            tools=[ANALYSIS_TOOL_SCHEMA],
            tool_choice={"type": "tool", "name": "submit_analysis"},
            messages=[{"role": "user", "content": build_user_prompt(job)}],
        )

        tool_input = next(
            block.input
            for block in response.content
            if block.type == "tool_use" and block.name == "submit_analysis"
        )

        return _parse_tool_input(tool_input, provider="claude")


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
        cold_email=cold_email,
        recruiter_search_template=data["recruiter_search_template"],
        provider_used=provider,
    )

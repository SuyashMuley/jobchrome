from abc import ABC, abstractmethod
from models.request import JobInput, UserPreferences
from models.response import AnalyzeResponse


ANALYSIS_TOOL_SCHEMA = {
    "name": "submit_analysis",
    "description": "Submit the structured job analysis result",
    "input_schema": {
        "type": "object",
        "properties": {
            "ats_score": {
                "type": "integer",
                "description": "Overall ATS score 0-100, weighted average of breakdown scores"
            },
            "ats_breakdown": {
                "type": "object",
                "properties": {
                    "keyword_match": {"type": "integer", "description": "How well resume keywords match job description, 0-100"},
                    "skills_match": {"type": "integer", "description": "How well candidate skills match required skills, 0-100"},
                    "experience_match": {"type": "integer", "description": "How well experience level and years match, 0-100"},
                    "preference_alignment": {"type": "integer", "description": "How well the role aligns with user preferences (domain, work mode, level), 0-100"}
                },
                "required": ["keyword_match", "skills_match", "experience_match", "preference_alignment"]
            },
            "recommendation": {
                "type": "string",
                "enum": ["apply", "skip"],
                "description": "Whether to apply. Skip if excluded keywords present or preference alignment is very low"
            },
            "reasoning": {
                "type": "string",
                "description": "2-4 sentence explanation. Explicitly call out preference mismatches if any."
            },
            "cold_email_recommended": {
                "type": "boolean",
                "description": "Whether cold emailing a recruiter is worthwhile. Only relevant if recommendation is apply."
            },
            "cold_email_subject": {
                "type": "string",
                "description": "Cold email subject line. Empty string if cold_email_recommended is false."
            },
            "cold_email_body": {
                "type": "string",
                "description": "Cold email body. Empty string if cold_email_recommended is false."
            },
            "tailoring_suggestions": {
                "type": "array",
                "items": {"type": "string"},
                "description": "3-5 specific, actionable resume improvements for this job. Each item should name what to add/change and why, e.g. 'Add Kubernetes to skills — mentioned 4× in job description' or 'Reframe infrastructure work to highlight cost savings — role emphasizes financial impact'. Empty array if recommendation is skip."
            },
            "recruiter_search_template": {
                "type": "string",
                "description": "LinkedIn People Search query string to find recruiters at this company, e.g. 'recruiter OR \"talent acquisition\" \"CompanyName\" Location'"
            }
        },
        "required": [
            "ats_score", "ats_breakdown", "recommendation", "reasoning",
            "tailoring_suggestions",
            "cold_email_recommended", "cold_email_subject", "cold_email_body",
            "recruiter_search_template"
        ]
    }
}


def build_system_prompt(resume_text: str, preferences: UserPreferences) -> str:
    prefs_block = f"""
User Job Preferences:
- Target domains: {', '.join(preferences.domains) or 'Not specified'}
- Preferred tech stack: {', '.join(preferences.tech_stack) or 'Not specified'}
- Target roles: {', '.join(preferences.target_roles) or 'Not specified'}
- Experience level: {preferences.experience_level}
- Job types: {', '.join(preferences.job_types)}
- Work mode: {preferences.work_mode}
- Excluded keywords (auto-skip if found in job): {', '.join(preferences.excluded_keywords) or 'None'}
""".strip()

    return f"""You are an expert ATS analyzer and career coach. Your job is to analyze a job posting against a candidate's resume and preferences, then provide a structured evaluation.

CANDIDATE RESUME:
{resume_text}

{prefs_block}

Scoring guidelines:
- keyword_match: Count overlap of exact and synonymous technical terms between resume and job description
- skills_match: Assess required vs candidate skills holistically
- experience_match: Compare required years/level to candidate's actual experience
- preference_alignment: How well role matches user's stated domains, work mode, level, and job type preferences
- ats_score: Weighted average — (keyword_match * 0.3 + skills_match * 0.3 + experience_match * 0.25 + preference_alignment * 0.15)
- If ANY excluded keyword appears in the job description, set recommendation to "skip" and explain why
- Only recommend cold email if recommendation is "apply" AND the role is competitive or at a target company
- tailoring_suggestions: 3-5 concrete improvements, formatted as "Action — reason". Only populate when recommendation is "apply". Focus on the highest-leverage gaps: missing keywords, missing skills listed as required, experience framing, or quantification opportunities.
"""


def build_user_prompt(job: JobInput) -> str:
    return f"""Analyze this job posting:

Title: {job.title}
Company: {job.company}
Location: {job.location}
Source: {job.source}

Job Description:
{job.description}

Call the submit_analysis tool with your complete evaluation.
"""


class LLMProvider(ABC):
    @abstractmethod
    async def analyze(
        self,
        resume_text: str,
        job: JobInput,
        preferences: UserPreferences,
    ) -> AnalyzeResponse:
        ...

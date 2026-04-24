from services.llm.base import LLMProvider
from services.llm.claude import ClaudeProvider
from services.llm.grok import GrokProvider

PROVIDERS: dict[str, type[LLMProvider]] = {
    "claude": ClaudeProvider,
    "grok": GrokProvider,
}


def get_provider(
    name: str,
    anthropic_key: str | None = None,
    xai_key: str | None = None,
) -> LLMProvider:
    if name not in PROVIDERS:
        raise ValueError(f"Unknown provider '{name}'. Available: {list(PROVIDERS)}")
    if name == "claude":
        return ClaudeProvider(api_key=anthropic_key)
    if name == "grok":
        return GrokProvider(api_key=xai_key)
    return PROVIDERS[name]()

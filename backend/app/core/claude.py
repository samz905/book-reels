"""
Claude text generation utility using the Anthropic SDK.
"""
import anthropic
from typing import Optional
from ..config import ANTHROPIC_API_KEY


# Lazy-init client (avoids import-time crash if key not set)
_client: Optional[anthropic.AsyncAnthropic] = None


def _get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
    return _client


async def generate_text_claude(
    prompt: str,
    system_prompt: Optional[str] = None,
    model: str = "claude-haiku-4-5-20251001",
    max_tokens: int = 8192,
    temperature: float = 0.9,
) -> str:
    """
    Generate text using Claude via the Anthropic SDK.

    Args:
        prompt: The user prompt
        system_prompt: Optional system instructions
        model: Claude model ID (default: Haiku 4.5)
        max_tokens: Maximum output tokens
        temperature: Sampling temperature (higher = more creative)

    Returns:
        Generated text string
    """
    client = _get_client()

    kwargs = {
        "model": model,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "messages": [{"role": "user", "content": prompt}],
    }

    if system_prompt:
        kwargs["system"] = system_prompt

    response = await client.messages.create(**kwargs)

    return response.content[0].text

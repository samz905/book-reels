"""
Claude text generation utility using the Anthropic SDK.

Supports few-shot examples and structured outputs (guaranteed JSON).
Zero retries, 60s timeout — fail fast, let user retry.
"""
import anthropic
import httpx
from typing import Optional, List
from ..config import ANTHROPIC_API_KEY


# Lazy-init client (avoids import-time crash if key not set)
_client: Optional[anthropic.AsyncAnthropic] = None


def _get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(
            api_key=ANTHROPIC_API_KEY,
            max_retries=0,
            timeout=httpx.Timeout(60.0),
        )
    return _client


async def generate_text_claude(
    prompt: str,
    system_prompt: Optional[str] = None,
    model: str = "claude-sonnet-4-5",
    few_shot_examples: Optional[List[dict]] = None,
    output_schema: Optional[dict] = None,
    max_tokens: int = 16384,
    temperature: float = 0.9,
) -> str:
    """
    Generate text using Claude via the Anthropic SDK.

    Args:
        prompt: The user prompt
        system_prompt: Optional system instructions (native Claude system param)
        model: Claude model ID (default: Haiku 4.5)
        few_shot_examples: Optional list of {"user": str, "model": str} dicts
                           injected as conversation turns for few-shot prompting
        output_schema: Optional JSON schema dict for structured outputs.
                       When provided, guarantees response is valid JSON
                       matching the schema (constrained decoding).
        max_tokens: Maximum output tokens (Haiku 4.5 supports up to 64K)
        temperature: Sampling temperature (higher = more creative)

    Returns:
        Generated text string (guaranteed valid JSON when output_schema provided)
    """
    client = _get_client()

    # Build messages: optional few-shot examples + user prompt
    messages = []

    if few_shot_examples:
        for example in few_shot_examples:
            messages.append({"role": "user", "content": example["user"]})
            messages.append({"role": "assistant", "content": example["model"]})

    messages.append({"role": "user", "content": prompt})

    kwargs: dict = {
        "model": model,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "messages": messages,
    }

    if system_prompt:
        kwargs["system"] = system_prompt

    if output_schema:
        kwargs["output_config"] = {
            "format": {
                "type": "json_schema",
                "schema": output_schema,
            }
        }

    response = await client.messages.create(**kwargs)

    return response.content[0].text

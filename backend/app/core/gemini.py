"""
Gemini text generation utility.
"""
import asyncio
from typing import Optional
from ..config import genai_client


MAX_RETRIES = 3
RETRY_BASE_DELAY = 5  # seconds


async def generate_text(
    prompt: str,
    system_prompt: Optional[str] = None,
    model: str = "gemini-2.0-flash",
) -> str:
    """
    Generate text using Gemini with automatic retry on 429 RESOURCE_EXHAUSTED.

    Args:
        prompt: The user prompt to generate text from
        system_prompt: Optional system instructions
        model: The Gemini model to use (default: gemini-2.0-flash)

    Returns:
        Generated text string
    """
    # Build the content
    contents = []

    if system_prompt:
        contents.append({
            "role": "user",
            "parts": [{"text": system_prompt}]
        })
        contents.append({
            "role": "model",
            "parts": [{"text": "Understood. I will follow these instructions."}]
        })

    contents.append({
        "role": "user",
        "parts": [{"text": prompt}]
    })

    # Generate response with retry on rate limiting
    for attempt in range(MAX_RETRIES + 1):
        try:
            response = genai_client.models.generate_content(
                model=model,
                contents=contents,
            )
            return response.text
        except Exception as e:
            error_str = str(e)
            is_retryable = ("429" in error_str or "RESOURCE_EXHAUSTED" in error_str
                            or "503" in error_str or "UNAVAILABLE" in error_str)
            if is_retryable and attempt < MAX_RETRIES:
                delay = RETRY_BASE_DELAY * (2 ** attempt)
                print(f"  [gemini] Transient error. Retrying in {delay}s... (attempt {attempt + 1}/{MAX_RETRIES})")
                await asyncio.sleep(delay)
                continue
            raise

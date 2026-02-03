"""
Gemini text generation utility.
"""
from typing import Optional
from ..config import genai_client


async def generate_text(
    prompt: str,
    system_prompt: Optional[str] = None,
    model: str = "gemini-2.0-flash",
) -> str:
    """
    Generate text using Gemini.

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

    # Generate response
    response = genai_client.models.generate_content(
        model=model,
        contents=contents,
    )

    return response.text

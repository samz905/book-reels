"""
Image generation utility using Google GenAI.
Uses Gemini's native image generation capabilities.
"""
import base64
from typing import Literal
from google.genai import types
from ..config import genai_client


async def generate_image(
    prompt: str,
    aspect_ratio: Literal["9:16", "16:9", "1:1", "4:3", "3:4"] = "9:16",
    model: str = "gemini-2.0-flash-exp-image-generation",
) -> dict:
    """
    Generate an image using Gemini's image generation capabilities.

    Args:
        prompt: Text description of the image to generate
        aspect_ratio: Aspect ratio hint for the image
        model: Model to use for generation

    Returns:
        dict with:
          - image_base64: Base64 encoded image data
          - mime_type: Image MIME type
    """
    # Build the prompt with aspect ratio guidance
    full_prompt = f"Generate a high quality image: {prompt}"
    if aspect_ratio == "9:16":
        full_prompt += " The image should be in portrait orientation (taller than wide)."
    elif aspect_ratio == "16:9":
        full_prompt += " The image should be in landscape orientation (wider than tall)."

    # Use Gemini with image generation capability
    response = genai_client.models.generate_content(
        model=model,
        contents=full_prompt,
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"],
        )
    )

    # Extract image from response
    for part in response.candidates[0].content.parts:
        if hasattr(part, 'inline_data') and part.inline_data is not None:
            image_data = part.inline_data
            if hasattr(image_data, 'data') and image_data.data:
                image_bytes = image_data.data
                image_base64 = base64.b64encode(image_bytes).decode("utf-8")
                return {
                    "image_base64": image_base64,
                    "mime_type": getattr(image_data, 'mime_type', 'image/png') or "image/png",
                }

    # If no image in response, raise error
    raise ValueError(
        "No image was generated. The model may have returned text only. "
        f"Response parts: {[type(p).__name__ for p in response.candidates[0].content.parts]}"
    )

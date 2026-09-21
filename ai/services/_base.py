"""Shared AI service utilities."""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import TypeVar

from pydantic import BaseModel

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

PROMPTS_DIR = Path(__file__).resolve().parents[1] / "prompts"


def load_prompt(name: str) -> str:
    path = PROMPTS_DIR / name
    if path.exists():
        return path.read_text(encoding="utf-8")
    return f"You are a BuildWyse assistant for {name}."


def ai_mode_live() -> bool:
    return os.getenv("AI_MODE", "stub") == "live" and bool(os.getenv("OPENAI_API_KEY"))


def call_openai(
    prompt: str,
    user_content: str,
    *,
    model: str | None = None,
    temperature: float = 0.25,
    max_tokens: int = 8000,
) -> str:
    from openai import OpenAI

    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    resolved_model = model or os.getenv("OPENAI_DOC_MODEL") or os.getenv("OPENAI_MODEL") or "gpt-4o"
    response = client.chat.completions.create(
        model=resolved_model,
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": user_content},
        ],
        response_format={"type": "json_object"},
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content or "{}"


def generate_structured(
    prompt_file: str,
    user_content: str,
    schema: type[T],
    stub_fn,
    *,
    model: str | None = None,
    temperature: float = 0.25,
    max_tokens: int = 8000,
    allow_stub_fallback: bool = True,
) -> T:
    prompt = load_prompt(prompt_file)
    if ai_mode_live():
        try:
            raw = call_openai(
                prompt,
                user_content,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            data = json.loads(raw)
            return schema.model_validate(data)
        except Exception:
            logger.exception("OpenAI structured generation failed for %s", prompt_file)
            if not allow_stub_fallback:
                raise
    return stub_fn(user_content)

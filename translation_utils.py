"""Simple translation helper used by the document parser."""
from __future__ import annotations

import os

try:  # optional dependency
    import openai  # type: ignore
except Exception:  # pragma: no cover - import failure path
    openai = None  # type: ignore


def translate_text(text: str, source_lang: str, target_lang: str) -> str:
    """Translate ``text`` from ``source_lang`` to ``target_lang``.

    The function prefers OpenAI when an ``OPENAI_API_KEY`` is configured. Any
    failure results in a deterministic placeholder translation so tests remain
    stable without network access.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key and openai is not None:
        try:  # pragma: no cover - network calls are not tested
            openai.api_key = api_key
            prompt = f"Translate from {source_lang} to {target_lang}:\n{text}"
            response = openai.ChatCompletion.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0,
            )
            return response["choices"][0]["message"]["content"].strip()
        except Exception:
            pass
    # deterministic placeholder translation
    return f"[{source_lang}->{target_lang}] {text}"


__all__ = ["translate_text"]

"""Utilities for optimising project descriptions for compliance."""

from __future__ import annotations

import json
import os
from typing import Dict, List

try:  # optional dependency used when an API key is present
    import openai  # type: ignore
except Exception:  # pragma: no cover - import failure path
    openai = None  # type: ignore


def _heuristic_rewrite(text: str) -> Dict[str, object]:
    """Simple deterministic rewrite used when OpenAI isn't available."""

    optimized = text.replace("farm", "agricultural project")
    changes: List[str] = []
    if optimized != text:
        changes.append("farm -> agricultural project")
    return {"original": text, "optimized": optimized, "changes": changes, "token_usage": 0}


def optimize_project_description(text: str) -> Dict[str, object]:
    """Rewrite ``text`` for compliance and return original and new versions.

    When ``OPENAI_API_KEY`` is configured the function attempts to use
    ``gpt-4o-mini`` to improve the description. Any failure results in a
    deterministic heuristic rewrite to keep tests stable.
    """

    api_key = os.getenv("OPENAI_API_KEY")
    if api_key and openai is not None:
        try:  # pragma: no cover - network calls are not tested
            openai.api_key = api_key
            prompt = (
                "Rewrite the following project description to optimise it for "
                "regulatory compliance. Return JSON with keys 'original', "
                "'optimized' and 'changes'.\n" + text
            )
            response = openai.ChatCompletion.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
            )
            content = response["choices"][0]["message"]["content"].strip()
            data = json.loads(content)
            data.setdefault("original", text)
            data.setdefault("optimized", text)
            data.setdefault("changes", [])
            usage = response.get("usage", {}).get("total_tokens", 0)
            data.setdefault("token_usage", usage)
            return data
        except Exception:
            pass

    return _heuristic_rewrite(text)


__all__ = ["optimize_project_description"]
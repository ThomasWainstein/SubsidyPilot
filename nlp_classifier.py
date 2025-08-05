"""Simple NLP based classification helpers for project documents."""

from __future__ import annotations

import json
import os
from typing import Dict, List

import openai


def _heuristic_classification(text: str) -> Dict[str, object]:
    """Fallback classification using keyword heuristics."""
    lowered = text.lower()
    keywords: List[str] = []

    if "solar" in lowered or "photovolta" in lowered:
        project_type = "agri-voltaic"
        keywords.append("solar")
    elif "irrigation" in lowered:
        project_type = "irrigation"
        keywords.append("irrigation")
    else:
        project_type = "general"

    region = "Unknown"
    for candidate in ["occitanie", "bretagne", "andalusia"]:
        if candidate in lowered:
            region = candidate.title()
            keywords.append(candidate)
            break

    legal_entity = "Unknown"
    for candidate in ["sas", "sarl", "cooperative"]:
        if candidate in lowered:
            legal_entity = candidate.upper()
            keywords.append(candidate)
            break

    if "livestock" in lowered and "livestock" not in keywords:
        keywords.append("livestock")
    if "greenhouse" in lowered and "greenhouse" not in keywords:
        keywords.append("greenhouse")

    return {
        "project_type": project_type,
        "region": region,
        "legal_entity": legal_entity,
        "keywords": keywords,
    }


def classify_project_text(text: str) -> Dict[str, object]:
    """Classify a project description into structured metadata.

    The function attempts to use OpenAI's ChatCompletion API when an
    ``OPENAI_API_KEY`` environment variable is available. If the API call fails
    or no key is configured, a lightweight keyword based heuristic is used
    instead to provide deterministic behaviour suitable for tests.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        try:  # pragma: no cover - network calls are not tested
            openai.api_key = api_key
            prompt = (
                "Extract project_type, region, legal_entity and keywords from the"
                " following text. Respond with JSON.\n" + text
            )
            response = openai.ChatCompletion.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0,
            )
            content = response["choices"][0]["message"]["content"].strip()
            data = json.loads(content)
            data.setdefault("keywords", [])
            return data
        except Exception:
            pass

    return _heuristic_classification(text)

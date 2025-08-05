"""AI enrichment pipeline using OpenAI's chat completion API.

The pipeline reads a batch file containing subsidy records, loads a
language specific prompt template and sends each entry to the OpenAI API
to obtain structured information. Responses are merged back into the
original records and optionally written to an output file.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Dict, List

from dotenv import load_dotenv
import openai

PROMPT_DIR = Path(__file__).parent / "ai" / "prompts"

# Map language code to prompt file name
PROMPT_FILES: Dict[str, str] = {
    "fr": "fr_en_funding.txt",
    "es": "es_subvenciones.txt",
    "de": "de_foerderung.txt",
}


def load_prompt(language: str) -> str:
    """Return prompt template for the given language."""

    file_name = PROMPT_FILES.get(language.lower())
    if not file_name:
        raise ValueError(f"No prompt template for language '{language}'")
    return (PROMPT_DIR / file_name).read_text(encoding="utf-8")


def run_ai_pipeline(
    batch_path: str = "batches/sample_batch.json",
    model: str = "gpt-4",
    language: str = "fr",
    dry_run: bool = False,
    output_path: str = "output/ai_processed.json",
) -> List[Dict[str, str]]:
    """Process a batch of subsidies with the OpenAI API.

    Parameters
    ----------
    batch_path:
        Path to JSON file containing a list of subsidy entries.
    model:
        Model identifier to use for the ChatCompletion call.
    language:
        Language code used to select the prompt template.
    dry_run:
        When ``True`` the results are not written to disk.
    output_path:
        Location where enriched data will be written.
    """

    load_dotenv()
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY not set")
    openai.api_key = api_key

    prompt_template = load_prompt(language)

    with open(batch_path, "r", encoding="utf-8") as fh:
        batch: List[Dict[str, str]] = json.load(fh)

    results: List[Dict[str, str]] = []
    for entry in batch:
        prompt = prompt_template.format(**entry)
        try:
            response = openai.ChatCompletion.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
            )
            content = response["choices"][0]["message"]["content"].strip()
            entry["structured_output"] = content
            print(f"[AI] Extracted data for: {entry.get('title', '')[:50]}...")
        except Exception as exc:  # pragma: no cover - best effort
            print(f"[AI] Error processing {entry.get('title', '')}: {exc}")
            entry["structured_output"] = None
        results.append(entry)

    if not dry_run:
        os.makedirs(Path(output_path).parent, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as fh:
            json.dump(results, fh, indent=2, ensure_ascii=False)
        print(f"[AI] Output saved to {output_path}")
    else:
        print("[AI] Dry-run mode active. No file written.")

    return results


if __name__ == "__main__":  # pragma: no cover
    run_ai_pipeline()

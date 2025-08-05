"""AI enrichment pipeline using OpenAI's chat completion API.

The pipeline reads a batch file containing subsidy records, loads a
language specific prompt template and sends each entry to the OpenAI API
to obtain structured information. Responses are merged back into the
original records and optionally written to an output file.
"""

from __future__ import annotations

import argparse
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


def compute_qa_metrics(results: List[Dict[str, str]]) -> Dict[str, object]:
    """Compute simple QA statistics from extraction results.

    The function inspects the ``structured_output`` field of each entry and
    calculates metrics such as missing outputs and field-level blank values.
    The metrics are lightweight and intended mainly for regression testing and
    developer insight rather than exhaustive auditing.
    """

    total = len(results)
    missing_output = 0
    field_counts: Dict[str, int] = {}
    field_blanks: Dict[str, int] = {}
    lengths: List[int] = []

    for entry in results:
        output = entry.get("structured_output")
        if not output:
            missing_output += 1
            continue

        lengths.append(len(output))
        try:
            data = json.loads(output)
        except json.JSONDecodeError:
            # If the model returned non-JSON text we can't do field analysis
            continue

        for field, value in data.items():
            field_counts[field] = field_counts.get(field, 0) + 1
            if value in (None, "", "N/A", "TBD", "Unknown"):
                field_blanks[field] = field_blanks.get(field, 0) + 1

    avg_length = sum(lengths) / len(lengths) if lengths else 0
    field_failure_rate = {
        field: field_blanks.get(field, 0) / count
        for field, count in field_counts.items()
    }

    return {
        "total_records": total,
        "missing_structured_output": missing_output,
        "missing_rate": missing_output / total if total else 0,
        "avg_response_length": avg_length,
        "field_failure_rate": field_failure_rate,
    }


def run_ai_pipeline(
    batch_path: str = "batches/sample_batch.json",
    model: str = "gpt-4",
    language: str = "fr",
    dry_run: bool = False,
    output_path: str = "output/ai_processed.json",
    qa_report: bool = False,
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
    qa_report:
        When ``True`` a ``qa_report.json`` file with basic quality metrics is
        generated alongside the AI output.
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

    output_dir = Path(output_path).parent
    if not dry_run:
        os.makedirs(output_dir, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as fh:
            json.dump(results, fh, indent=2, ensure_ascii=False)
        print(f"[AI] Output saved to {output_path}")
    else:
        print("[AI] Dry-run mode active. No file written.")

    if qa_report:
        report = compute_qa_metrics(results)
        os.makedirs(output_dir, exist_ok=True)
        report_path = output_dir / "qa_report.json"
        with open(report_path, "w", encoding="utf-8") as fh:
            json.dump(report, fh, indent=2, ensure_ascii=False)
        print(f"[AI] QA report saved to {report_path}")

    return results


if __name__ == "__main__":  # pragma: no cover
    parser = argparse.ArgumentParser(description="Run AI extraction pipeline")
    parser.add_argument("--batch-path", default="batches/sample_batch.json")
    parser.add_argument("--model", default="gpt-4")
    parser.add_argument("--language", default="fr")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--output-path", default="output/ai_processed.json", help="Where to save AI output"
    )
    parser.add_argument(
        "--qa-report",
        action="store_true",
        help="Generate qa_report.json with quality metrics",
    )
    args = parser.parse_args()

    run_ai_pipeline(
        batch_path=args.batch_path,
        model=args.model,
        language=args.language,
        dry_run=args.dry_run,
        output_path=args.output_path,
        qa_report=args.qa_report,
    )

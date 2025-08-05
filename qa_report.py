"""QA report generation for document analysis results."""

from __future__ import annotations

from typing import Dict, List


EXPECTED_FIELDS = ["project_type", "region", "legal_entity", "keywords"]


def generate_qa_report(document_results: Dict[str, object]) -> Dict[str, object]:
    """Compute quality metrics for a processed document.

    Parameters
    ----------
    document_results:
        Combined output from the parser, classifier and optional rewriter.
    """

    metadata = document_results.get("metadata", {}) if isinstance(document_results, dict) else {}

    extracted_fields: List[str] = [f for f in EXPECTED_FIELDS if metadata.get(f)]
    missing_fields: List[str] = [f for f in EXPECTED_FIELDS if not metadata.get(f)]
    coverage = int(len(extracted_fields) / len(EXPECTED_FIELDS) * 100)

    confidence = float(metadata.get("confidence", 0))

    report = {
        "file": document_results.get("file"),
        "language_detected": document_results.get("language"),
        "ocr_used": bool(document_results.get("ocr_pages")),
        "ocr_pages": document_results.get("ocr_pages", []),
        "fields_extracted": extracted_fields,
        "fields_missing": missing_fields,
        "coverage_percent": coverage,
        "classification_confidence": confidence,
        "translated": bool(document_results.get("translated")),
        "legal_reference_found": bool(metadata.get("legal_reference")),
        "token_usage": document_results.get("token_usage", 0),
    }

    summary_parts = [
        f"Coverage {coverage}%",
        f"Confidence {confidence:.2f}",
        f"OCR {'yes' if report['ocr_used'] else 'no'}",
        f"Lang {report['language_detected']}",
    ]
    if report["translated"]:
        summary_parts.append("translated")
    report["summary"] = "; ".join(summary_parts)
    return report


__all__ = ["generate_qa_report"]

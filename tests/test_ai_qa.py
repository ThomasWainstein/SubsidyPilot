"""Tests for AI extraction QA metrics."""

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from ai_pipeline import compute_qa_metrics


def test_compute_qa_metrics_basic():
    entries = [
        {"structured_output": '{"title": "Grant A", "eligibility": "Farmers"}'},
        {"structured_output": '{"title": "", "eligibility": ""}'},
        {"structured_output": None},
    ]

    report = compute_qa_metrics(entries)

    assert report["total_records"] == 3
    assert report["missing_structured_output"] == 1
    # For parsed fields, one of two entries has blank values
    assert report["field_failure_rate"]["title"] == 0.5
    assert report["field_failure_rate"]["eligibility"] == 0.5
    assert report["avg_response_length"] > 0

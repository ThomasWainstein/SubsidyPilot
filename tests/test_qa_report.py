import pathlib
import sys

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from qa_report import generate_qa_report


def test_generate_qa_report_basic():
    document_results = {
        "file": "proj.pdf",
        "language": "es",
        "ocr_pages": [1],
        "translated": True,
        "metadata": {
            "project_type": "irrigation",
            "region": "",
            "legal_entity": "SAS",
            "keywords": ["irrigation"],
            "confidence": 0.75,
        },
        "token_usage": 42,
    }
    report = generate_qa_report(document_results)
    assert report["coverage_percent"] == 75
    assert report["ocr_used"] is True
    assert report["classification_confidence"] == 0.75
    assert "Coverage 75%" in report["summary"]

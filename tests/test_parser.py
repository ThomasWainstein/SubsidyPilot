import pathlib
import sys

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from document_parser import extract_text_from_pdf


def test_extract_text_from_pdf():
    text = extract_text_from_pdf("tests/data/sample_project.pdf")
    assert "solar farming" in text
    assert "Occitanie region" in text

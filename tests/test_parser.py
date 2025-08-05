import pathlib
import sys

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

import fitz

from document_parser import extract_text_from_pdf


def test_extract_text_from_pdf(tmp_path):
    """PDF text is extracted even for newly generated documents."""

    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), "Solar farming in Occitanie region")
    pdf_path = tmp_path / "sample.pdf"
    doc.save(pdf_path)

    text = extract_text_from_pdf(str(pdf_path))
    text = text.lower()
    assert "solar farming" in text
    assert "occitanie region" in text

import pathlib
import sys

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

import fitz

from document_parser import extract_text_from_pdf


def _make_pdf(text: str, path: pathlib.Path) -> None:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), text)
    doc.save(path)


def test_translation_for_spanish(tmp_path):
    pdf_path = tmp_path / "spanish.pdf"
    spanish_text = (
        "Hola mundo agricola. Este proyecto sostenible apoya a los agricultores en España."
    )
    _make_pdf(spanish_text, pdf_path)
    result = extract_text_from_pdf(str(pdf_path), target_lang="en")
    assert result["language"] == "es"
    assert result["translated"] is True
    assert "[es->en]" in result["text"]


def test_force_ocr_marks_pages(tmp_path):
    pdf_path = tmp_path / "blank.pdf"
    doc = fitz.open()
    doc.new_page()  # no text -> OCR will run
    doc.save(pdf_path)
    result = extract_text_from_pdf(str(pdf_path), force_ocr=True)
    assert result["ocr_pages"] == [1]

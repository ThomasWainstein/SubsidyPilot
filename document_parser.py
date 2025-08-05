"""Utilities for extracting text from project documents."""

from __future__ import annotations

from pathlib import Path
from typing import List

import pdfplumber
try:  # optional, provides better support for complex PDFs
    import fitz  # type: ignore
except Exception:  # pragma: no cover - import failure path
    fitz = None  # type: ignore


def _ocr_page(page: "pdfplumber.page.Page") -> str:
    """Attempt to OCR a PDF page using ``pytesseract``.

    The function is deliberately defensive so that tests remain deterministic
    even when the optional ``pytesseract`` dependency or the ``tesseract``
    binary is missing. Any failure simply results in an empty string being
    returned which mirrors ``pdfplumber``'s behaviour for textless pages.
    """

    try:  # pragma: no cover - requires optional dependency
        import pytesseract  # type: ignore
    except Exception:  # pragma: no cover - missing dependency path
        return ""

    try:  # pragma: no cover - heavy external call
        pil_image = page.to_image(resolution=300).original
        return pytesseract.image_to_string(pil_image)
    except Exception:
        return ""


def extract_text_from_pdf(path: str) -> str:
    """Return text extracted from a PDF file.

    The extractor uses ``pdfplumber`` for vector based text and falls back to
    a lightweight OCR routine when no text is detected on a page (scanned
    documents, rotated pages, ...).

    Parameters
    ----------
    path:
        Location of the PDF file to read.

    Returns
    -------
    str
        Concatenated text of all pages in the PDF.
    """

    pdf_path = Path(path)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF file not found: {path}")

    texts: List[str] = []
    try:
        with pdfplumber.open(str(pdf_path)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                if not page_text.strip():
                    page_text = _ocr_page(page)
                texts.append(page_text)
    except Exception:
        # fall back to PyMuPDF if pdfplumber fails to parse the document
        if fitz is None:
            raise
        with fitz.open(str(pdf_path)) as doc:  # pragma: no cover - depends on fitz
            for page in doc:
                page_text = page.get_text() or ""
                if not page_text.strip():
                    # fitz page -> pixmap -> PIL image for OCR
                    try:
                        import pytesseract  # type: ignore
                        from PIL import Image

                        pix = page.get_pixmap()
                        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                        page_text = pytesseract.image_to_string(img)
                    except Exception:
                        page_text = ""
                texts.append(page_text)

    # Join pages with newlines and strip leading/trailing whitespace
    return "\n".join(texts).strip()


def save_text_to_file(text: str, out_path: str) -> None:
    """Persist extracted text to ``out_path`` using UTF-8 encoding."""

    Path(out_path).write_text(text, encoding="utf-8")


__all__ = ["extract_text_from_pdf", "save_text_to_file"]

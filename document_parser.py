"""Utilities for extracting text from project documents."""

from __future__ import annotations

from pathlib import Path
from typing import List, Dict

import pdfplumber
try:  # optional, provides better support for complex PDFs
    import fitz  # type: ignore
except Exception:  # pragma: no cover - import failure path
    fitz = None  # type: ignore


def _ocr_page(page: "pdfplumber.page.Page", lang: str) -> str:
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
        return pytesseract.image_to_string(pil_image, lang=lang)
    except Exception:
        return ""


def extract_text_from_pdf(path: str, target_lang: str = "en", force_ocr: bool = False) -> Dict[str, object]:
    """Return text and metadata extracted from a PDF file.

    The extractor uses ``pdfplumber`` for vector based text and falls back to a
    lightweight OCR routine when no text is detected on a page (scanned
    documents, rotated pages, ...). Language detection is performed on the
    resulting text and basic translation to ``target_lang`` is available for
    Romanian and Spanish documents. Pages processed via OCR are tracked.
    """

    pdf_path = Path(path)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF file not found: {path}")

    texts: List[str] = []
    ocr_pages: List[int] = []
    try:
        with pdfplumber.open(str(pdf_path)) as pdf:
            for idx, page in enumerate(pdf.pages, start=1):
                page_text = "" if force_ocr else (page.extract_text() or "")
                if force_ocr or not page_text.strip():
                    page_text = _ocr_page(page, lang="eng+fra+spa+ron")
                    ocr_pages.append(idx)
                texts.append(page_text)
    except Exception:
        # fall back to PyMuPDF if pdfplumber fails to parse the document
        if fitz is None:
            raise
        with fitz.open(str(pdf_path)) as doc:  # pragma: no cover - depends on fitz
            for idx, page in enumerate(doc, start=1):
                page_text = "" if force_ocr else (page.get_text() or "")
                if force_ocr or not page_text.strip():
                    try:
                        import pytesseract  # type: ignore
                        from PIL import Image

                        pix = page.get_pixmap()
                        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                        page_text = pytesseract.image_to_string(img, lang="eng+fra+spa+ron")
                    except Exception:
                        page_text = ""
                    ocr_pages.append(idx)
                texts.append(page_text)

    text = "\n".join(texts).strip()

    # language detection
    language = "unknown"
    if text:
        try:
            from langdetect import detect

            language = detect(text)
        except Exception:
            language = "unknown"

    translated = False
    if language in {"ro", "es"} and target_lang in {"en", "fr"} and language != target_lang:
        try:
            from translation_utils import translate_text

            text = translate_text(text, source_lang=language, target_lang=target_lang)
            translated = True
        except Exception:
            translated = False

    return {
        "text": text,
        "language": language,
        "ocr_pages": ocr_pages,
        "ocr_used": bool(ocr_pages),
        "translated": translated,
    }


def save_text_to_file(text: str, out_path: str) -> None:
    """Persist extracted text to ``out_path`` using UTF-8 encoding."""

    Path(out_path).write_text(text, encoding="utf-8")


__all__ = ["extract_text_from_pdf", "save_text_to_file"]
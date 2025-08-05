"""Utilities for extracting text from project documents."""

from __future__ import annotations

from pathlib import Path

import pdfplumber


def extract_text_from_pdf(path: str) -> str:
    """Return text extracted from a PDF file.

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

    with pdfplumber.open(str(pdf_path)) as pdf:
        pages = [page.extract_text() or "" for page in pdf.pages]

    # Join pages with newlines and strip leading/trailing whitespace
    return "\n".join(pages).strip()

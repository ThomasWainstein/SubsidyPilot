"""Extractor for document schema using the unified document_processing module."""

from document_processing import extract_text_from_pdf

def extract_document_schema(path: str, target_lang: str = "en") -> dict:
    """Return normalized text and metadata for *path*.

    This wrapper exists for backward compatibility with the previous
    document schema extractor package while delegating all heavy lifting
    to :mod:`document_processing`.
    """
    return extract_text_from_pdf(path, target_lang=target_lang)

__all__ = ["extract_document_schema"]
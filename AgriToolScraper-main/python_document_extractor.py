"""Legacy import shim for the unified document processing module."""

from document_processing.python_document_extractor import (
    PythonDocumentExtractor,
    DocumentExtractionResult,
    extract_document_text,
    ScraperDocumentExtractor,
)

__all__ = [
    "PythonDocumentExtractor",
    "DocumentExtractionResult",
    "extract_document_text",
    "ScraperDocumentExtractor",
]

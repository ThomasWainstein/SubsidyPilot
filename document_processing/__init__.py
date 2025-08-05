"""Centralized document processing utilities.

This module consolidates all document extraction helpers.  Existing
code should import from here instead of directly referencing legacy
modules.
"""

from document_parser import extract_text_from_pdf, save_text_to_file

__all__ = ["extract_text_from_pdf", "save_text_to_file"]
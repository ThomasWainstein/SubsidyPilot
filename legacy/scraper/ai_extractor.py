"""Compatibility wrapper for the refactored AI pipeline.

The full AI extraction logic now lives in :mod:`ai_pipeline`.  This
module is retained as a lightweight shim so existing imports continue to
work without modification.
"""

from ai_pipeline import AIExtractor

__all__ = ["AIExtractor"]

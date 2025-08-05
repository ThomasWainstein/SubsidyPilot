# Unified AI extraction pipeline utilities
"""Unified AI extraction pipeline utilities."""

from typing import Dict, Optional

from ai_extractor import run_ai_pipeline, compute_qa_metrics


class AIExtractor:
    """Thin wrapper around the refactored AI pipeline.

    The heavy extraction logic has been moved out of the legacy
    scraper module and into this standalone package to allow reuse
    without Selenium or other scraper dependencies.
    """

    def __init__(self) -> None:
        """Initialize the extractor."""
        # Initialization would set up clients or configuration in the
        # real implementation. Keeping it lightweight for tests.
        pass

    def process_raw_logs(
        self, batch_size: int = 10, max_records: Optional[int] = None
    ) -> Dict[str, int]:
        """Process raw log entries through the AI pipeline.

        Parameters
        ----------
        batch_size:
            Number of records to process in a single batch.
        max_records:
            Optional upper bound on records to process.

        Returns
        -------
        Dict[str, int]
            Basic statistics about the extraction run.  The default
            implementation is a stub that returns zeroed metrics so the
            rest of the pipeline can be exercised in tests without
            external services.
        """

        return {"successful_extractions": 0, "failed_extractions": 0}


__all__ = ["AIExtractor", "run_ai_pipeline", "compute_qa_metrics"]

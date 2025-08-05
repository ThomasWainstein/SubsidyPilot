"""Stub scraper for Romania's AFIR agency."""
from __future__ import annotations
from typing import List, Dict


class AFIRScraper:
    """Simple scraper that returns sample AFIR subsidy data.

    The real implementation would perform HTTP requests and parse the
    Romanian AFIR portal. For demo purposes we return a static structure so
    the rest of the pipeline can be exercised without network access.
    """

    def run(self, max_pages: int = 1, dry_run: bool = True) -> List[Dict[str, str]]:
        """Return a list with a single sample subsidy entry."""
        return [
            {
                "title": "AFIR Sample Grant",
                "agency": "AFIR",
                "link": "https://portal.afir.info/sample-grant",
                "description": "Demonstration grant used for pipeline testing.",
                "country": "romania",
            }
        ]

__all__ = ["AFIRScraper"]

"""Core utilities dispatching scrapers via factory."""
from __future__ import annotations
from typing import List, Dict

from scrapers.factory import get_scraper


def run_scraper(country: str, agency: str, max_pages: int, dry_run: bool) -> List[Dict[str, str]]:
    """Run a scraper for the given country and agency."""
    if max_pages <= 0:
        raise ValueError("max_pages must be greater than zero")

    scraper_cls = get_scraper(country, agency)
    scraper = scraper_cls()
    if not hasattr(scraper, "run"):
        raise AttributeError("Scraper class must implement a 'run' method")
    return scraper.run(max_pages=max_pages, dry_run=dry_run)

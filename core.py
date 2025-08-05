"""Core utilities dispatching scrapers by site name."""

from __future__ import annotations

from typing import List, Dict

from scrapers.france.franceagrimer import run_franceagrimer_scraper


def run_scraper(site: str, max_pages: int, dry_run: bool) -> List[Dict[str, str]]:
    """Run a scraper for the given site and return collected results."""

    if max_pages <= 0:
        raise ValueError("max_pages must be greater than zero")

    site = site.lower()
    if site == "franceagrimer":
        return run_franceagrimer_scraper(max_pages=max_pages, dry_run=dry_run)

    raise ValueError(f"Unsupported scraping site '{site}'")

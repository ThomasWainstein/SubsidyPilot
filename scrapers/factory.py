"""Factory for retrieving scraper classes based on country and agency."""
from importlib import import_module
from typing import Type

from .country_registry import COUNTRY_CONFIGS


SCRAPER_CLASS_MAP = {
    ("france", "franceagrimer"): ("scrapers.france.franceagrimer", "FranceAgriMerScraper"),
    ("spain", "mapama"): ("scrapers.spain.mapama", "MapamaScraper"),
}


def get_scraper(country: str, agency: str) -> Type:
    """Return scraper class for given country and agency."""
    country_key = country.lower()
    agency_key = agency.lower()

    if country_key not in COUNTRY_CONFIGS:
        raise ValueError(f"Unsupported country: {country}")

    if agency_key not in COUNTRY_CONFIGS[country_key]["agencies"]:
        raise ValueError(f"Unsupported agency '{agency}' for country '{country}'")

    module_path, class_name = SCRAPER_CLASS_MAP.get((country_key, agency_key), (None, None))
    if module_path is None:
        raise ValueError(f"No scraper implementation for {country}/{agency}")

    module = import_module(module_path)
    return getattr(module, class_name)

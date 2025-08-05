"""Dynamic, config-driven scraper factory."""
from importlib import import_module
from typing import Type

from .country_registry import COUNTRY_CONFIGS


def _find_scraper_class(module) -> Type | None:
    """Return the first class in *module* whose name ends with ``Scraper``.

    This allows new scrapers to be added without updating a central mapping
    table.  As long as a module exposes a class that ends with ``Scraper`` it
    will be discovered automatically by :func:`get_scraper`.
    """

    for attr in dir(module):
        obj = getattr(module, attr)
        if isinstance(obj, type) and attr.lower().endswith("scraper"):
            return obj
    return None


def get_scraper(country: str, agency: str) -> Type:
    """Return scraper class for given country and agency.

    Scraper modules are looked up dynamically using the pattern
    ``scrapers.<country>.<agency>``.  The first class within that module whose
    name ends with ``Scraper`` is returned.  This makes registration fully
    config driven and avoids manual updates when onboarding new agencies.
    """

    country_key = country.lower()
    agency_key = agency.lower()

    if country_key not in COUNTRY_CONFIGS:
        raise ValueError(f"Unsupported country: {country}")

    if agency_key not in COUNTRY_CONFIGS[country_key]["agencies"]:
        raise ValueError(
            f"Unsupported agency '{agency}' for country '{country}'"
        )

    module_path = f"scrapers.{country_key}.{agency_key}"
    module = import_module(module_path)
    scraper_cls = _find_scraper_class(module)
    if scraper_cls is None:
        raise ValueError(f"No scraper implementation for {country}/{agency}")
    return scraper_cls
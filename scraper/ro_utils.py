"""Romanian-specific utilities for currency, date parsing, and county validation."""

from __future__ import annotations

import re
import unicodedata
from typing import Optional, Union, List

# Mapping of Romanian month names to numbers
ROMANIAN_MONTHS = {
    "ianuarie": "01",
    "februarie": "02",
    "martie": "03",
    "aprilie": "04",
    "mai": "05",
    "iunie": "06",
    "iulie": "07",
    "august": "08",
    "septembrie": "09",
    "octombrie": "10",
    "noiembrie": "11",
    "decembrie": "12",
}

# Official Romanian counties including Bucharest
ROMANIAN_COUNTIES = [
    "Alba", "Arad", "Argeș", "Bacău", "Bihor", "Bistrița-Năsăud", "Botoșani",
    "Brașov", "Brăila", "Buzău", "Caraș-Severin", "Călărași", "Cluj", "Constanța",
    "Covasna", "Dâmbovița", "Dolj", "Galați", "Giurgiu", "Gorj", "Harghita",
    "Hunedoara", "Ialomița", "Iași", "Ilfov", "Maramureș", "Mehedinți", "Mureș",
    "Neamț", "Olt", "Prahova", "Satu Mare", "Sălaj", "Sibiu", "Suceava",
    "Teleorman", "Timiș", "Tulcea", "Vâlcea", "Vaslui", "Vrancea", "București",
]

# Normalization helper removing diacritics and lowering case
def _normalize(text: str) -> str:
    nfkd = unicodedata.normalize("NFD", text)
    return "".join(c for c in nfkd if unicodedata.category(c) != "Mn").lower()


def format_currency_ron(amount: Union[int, float]) -> str:
    """Format numeric amount to RON currency string."""
    formatted = f"{amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"{formatted} RON"


def parse_romanian_date(date_str: str) -> Optional[str]:
    """Parse Romanian dates like '15 ianuarie 2024' to ISO format."""
    if not date_str:
        return None

    date_str = date_str.strip().lower()

    # Numeric formats: DD.MM.YYYY or DD/MM/YYYY
    m = re.match(r"(\d{1,2})[\./](\d{1,2})[\./](\d{4})", date_str)
    if m:
        day, month, year = m.groups()
        return f"{year}-{month.zfill(2)}-{day.zfill(2)}"

    # Month name formats: '15 ianuarie 2024'
    for name, number in ROMANIAN_MONTHS.items():
        pattern = rf"(\d{{1,2}})\s+{name}\s+(\d{{4}})"
        m = re.search(pattern, date_str)
        if m:
            day, year = m.groups()
            return f"{year}-{number}-{day.zfill(2)}"

    return None


def validate_county(county: str) -> Optional[str]:
    """Return canonical county name if valid, otherwise None."""
    if not county:
        return None

    normalized = _normalize(county)
    for official in ROMANIAN_COUNTIES:
        if _normalize(official) == normalized:
            return official
    return None


def validate_county_list(counties: Union[List[str], str]) -> List[str]:
    """Validate and normalize a list of county names."""
    if isinstance(counties, str):
        counties = [counties]
    valid = []
    for c in counties:
        canonical = validate_county(c)
        if canonical:
            valid.append(canonical)
    return valid

__all__ = [
    "ROMANIAN_MONTHS",
    "ROMANIAN_COUNTIES",
    "format_currency_ron",
    "parse_romanian_date",
    "validate_county",
    "validate_county_list",
]

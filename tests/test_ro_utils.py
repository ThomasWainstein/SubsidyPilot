import sys
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from scraper.ro_utils import (
    format_currency_ron,
    parse_romanian_date,
    validate_county,
    validate_county_list,
)


def test_format_currency_ron():
    assert format_currency_ron(1234.5) == "1.234,50 RON"


def test_parse_romanian_date():
    assert parse_romanian_date("15 ianuarie 2024") == "2024-01-15"
    assert parse_romanian_date("01.02.2025") == "2025-02-01"


def test_validate_county():
    assert validate_county("Cluj") == "Cluj"
    assert validate_county("cluj") == "Cluj"
    assert validate_county("Unknown") is None


def test_validate_county_list():
    assert validate_county_list(["Cluj", "Unknown"]) == ["Cluj"]

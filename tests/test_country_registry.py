from scrapers.country_registry import COUNTRY_CONFIGS


def test_romania_has_currency_and_counties():
    ro = COUNTRY_CONFIGS["romania"]
    assert ro["currency"] == "RON"
    assert "București" in ro["counties"]

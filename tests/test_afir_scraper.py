from scrapers.factory import get_scraper


def test_factory_returns_afir_scraper():
    scraper_cls = get_scraper("romania", "afir")
    scraper = scraper_cls()
    results = scraper.run()
    assert results[0]["agency"] == "AFIR"

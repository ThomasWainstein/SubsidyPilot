from scrapers.factory import get_scraper


def test_get_scraper_returns_class():
    scraper_cls = get_scraper("france", "franceagrimer")
    assert scraper_cls.__name__ == "FranceAgriMerScraper"

from scrapers.factory import get_scraper


def test_get_scraper_returns_class():
    scraper_cls = get_scraper("france", "franceagrimer")
    assert scraper_cls.__name__ == "FranceAgriMerScraper"


def test_get_scraper_romania_afir():
    scraper_cls = get_scraper("romania", "afir")
    assert scraper_cls.__name__ == "AFIRScraper"

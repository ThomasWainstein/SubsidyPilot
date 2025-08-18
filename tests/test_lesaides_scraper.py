"""Test the les-aides.fr scraper integration."""

from scrapers.factory import get_scraper


def test_factory_returns_lesaides_scraper():
    """Test that the factory correctly returns the LesAidesScraper class."""
    scraper_cls = get_scraper("france", "lesaides")
    assert scraper_cls.__name__ == "LesAidesScraper"


def test_lesaides_scraper_dry_run():
    """Test the scraper in dry-run mode."""
    scraper_cls = get_scraper("france", "lesaides")
    scraper = scraper_cls()
    
    results = scraper.run(max_pages=1, dry_run=True)
    
    # Should return sample data
    assert len(results) > 0
    assert results[0]["agency"] == "les-aides.fr"
    assert results[0]["country"] == "france"
    assert "title" in results[0]
    assert "description" in results[0]


def test_lesaides_scraper_integration():
    """Test basic scraper functionality.""" 
    scraper_cls = get_scraper("france", "lesaides")
    scraper = scraper_cls()
    
    # Test with sample data (dry_run=True to avoid actual web requests)
    results = scraper.run(max_pages=2, dry_run=True)
    
    # Verify structure
    assert isinstance(results, list)
    for result in results:
        assert "title" in result
        assert "agency" in result
        assert "country" in result
        assert result["country"] == "france"
        assert "extracted_at" in result
        assert "source_site" in result
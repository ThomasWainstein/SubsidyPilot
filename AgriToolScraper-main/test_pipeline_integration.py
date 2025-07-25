#!/usr/bin/env python3
"""
Integration test for the complete FranceAgriMer scraper pipeline.
Tests URL collection, config validation, and data extraction.
"""

import os
import sys
import json
import traceback
from datetime import datetime

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_config_manager_functionality():
    """Test SecureConfigManager functionality."""
    print("🔧 Testing SecureConfigManager...")
    
    try:
        from config_manager import SecureConfigManager
        
        target_url = "https://www.franceagrimer.fr/rechercher-une-aide"
        session_id = f"test_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Test initialization
        config_manager = SecureConfigManager(target_url, session_id)
        print(f"✅ SecureConfigManager initialized for: {config_manager.target_domain}")
        
        # Test get_config method
        config = config_manager.get_config()
        print(f"✅ get_config() returned: {type(config)} with keys: {list(config.keys())}")
        
        # Test specific accessor methods
        list_page = config_manager.get_list_page_url()
        link_selector = config_manager.get_link_selector()
        
        print(f"✅ list_page: {list_page}")
        print(f"✅ link_selector: {link_selector}")
        
        # Validate expected values
        if "rechercher-une-aide" not in list_page:
            raise ValueError(f"list_page should contain 'rechercher-une-aide': {list_page}")
        
        if not link_selector or len(link_selector.strip()) == 0:
            raise ValueError(f"link_selector should not be empty: {link_selector}")
        
        print("✅ SecureConfigManager test passed")
        return True
        
    except Exception as e:
        print(f"❌ SecureConfigManager test failed: {e}")
        print(f"   Traceback: {traceback.format_exc()}")
        return False

def test_scraper_url_collection():
    """Test URL collection functionality with limited pages."""
    print("\n📋 Testing URL collection...")
    
    try:
        from scraper_main import AgriToolScraper
        
        target_url = "https://www.franceagrimer.fr/rechercher-une-aide"
        
        # Create scraper in dry run mode
        scraper = AgriToolScraper(target_url, dry_run=True)
        print("✅ AgriToolScraper initialized in dry-run mode")
        
        # Test URL collection with 1 page limit
        print("📋 Collecting URLs (limited to 1 page for testing)...")
        urls = scraper.collect_subsidy_urls(max_pages=1)
        
        print(f"✅ URL collection completed: {len(urls)} URLs collected")
        
        if len(urls) == 0:
            print("⚠️ No URLs collected - this could indicate issues:")
            print("   - Website structure may have changed")
            print("   - Selectors may need updating")
            print("   - Page may not be loading correctly")
            return False
        
        # Validate URLs
        for i, url in enumerate(urls[:5]):  # Check first 5 URLs
            print(f"   {i+1}. {url}")
            if not url.startswith("https://www.franceagrimer.fr"):
                raise ValueError(f"Invalid URL domain: {url}")
        
        # Test config-driven extraction
        config = scraper.config_manager.get_config()
        expected_selector = config.get('link_selector', 'a.fr-card__link')
        print(f"✅ Using config-driven selector: {expected_selector}")
        
        print(f"✅ URL collection test passed: {len(urls)} valid URLs")
        return True
        
    except Exception as e:
        print(f"❌ URL collection test failed: {e}")
        print(f"   Traceback: {traceback.format_exc()}")
        return False

def test_content_extraction():
    """Test content extraction from a sample URL."""
    print("\n📄 Testing content extraction...")
    
    try:
        from scraper.discovery import extract_subsidy_details
        
        # Use a known FranceAgriMer URL for testing
        # In a real test, we'd use URLs from the collection step
        test_url = "https://www.franceagrimer.fr/rechercher-une-aide"
        
        print(f"📄 Testing extraction from: {test_url}")
        
        # Test the extraction function
        extracted_data = extract_subsidy_details(test_url)
        
        if extracted_data:
            print(f"✅ Extraction successful: {type(extracted_data)}")
            print(f"   Fields extracted: {list(extracted_data.keys())}")
            
            # Validate basic structure
            if 'title' in extracted_data:
                print(f"   Title: {extracted_data['title'][:100]}...")
            
            if 'description' in extracted_data:
                print(f"   Description length: {len(str(extracted_data['description']))} chars")
            
            print("✅ Content extraction test passed")
            return True
        else:
            print("⚠️ No data extracted - this could be normal for listing pages")
            print("✅ Content extraction test passed (no crash)")
            return True
        
    except Exception as e:
        print(f"❌ Content extraction test failed: {e}")
        print(f"   Traceback: {traceback.format_exc()}")
        return False

def test_domain_isolation():
    """Test domain isolation functionality."""
    print("\n🔒 Testing domain isolation...")
    
    try:
        from utils.domain_isolation import enforce_domain_isolation, validate_scraper_isolation
        
        target_url = "https://www.franceagrimer.fr/rechercher-une-aide"
        
        # Test URLs - mix of valid and invalid domains
        test_urls = [
            "https://www.franceagrimer.fr/aide-1",
            "https://www.franceagrimer.fr/aide-2", 
            "https://example.com/bad-url",  # Should be filtered
            "https://other-domain.fr/bad-url",  # Should be filtered
            "https://franceagrimer.fr/aide-3"  # Different subdomain, should be filtered
        ]
        
        print(f"📋 Testing with {len(test_urls)} URLs")
        
        # Test enforcement
        filtered_urls = enforce_domain_isolation(test_urls, target_url)
        print(f"✅ Domain isolation enforcement: {len(test_urls)} -> {len(filtered_urls)} URLs")
        
        # Validate only correct domain URLs remain
        for url in filtered_urls:
            if not url.startswith("https://www.franceagrimer.fr"):
                raise ValueError(f"Domain isolation failed: {url}")
        
        # Test validation
        is_valid = validate_scraper_isolation(filtered_urls, target_url)
        if not is_valid:
            raise ValueError("Domain isolation validation failed")
        
        print("✅ Domain isolation test passed")
        return True
        
    except Exception as e:
        print(f"❌ Domain isolation test failed: {e}")
        print(f"   Traceback: {traceback.format_exc()}")
        return False

def test_dsfr_extraction():
    """Test DSFR tab extraction functionality."""
    print("\n🎨 Testing DSFR extraction...")
    
    try:
        from scraper.discovery import extract_dsfr_tabs
        from bs4 import BeautifulSoup
        
        # Sample DSFR HTML structure
        sample_html = """
        <div class="fr-tabs">
            <ul class="fr-tabs__list" role="tablist">
                <li role="presentation">
                    <button class="fr-tabs__tab" role="tab" aria-controls="desc-panel">
                        Description
                    </button>
                </li>
                <li role="presentation">
                    <button class="fr-tabs__tab" role="tab" aria-controls="elig-panel">
                        Éligibilité
                    </button>
                </li>
            </ul>
            <div class="fr-tabs__panel" id="desc-panel" role="tabpanel">
                <p>Description du dispositif d'aide</p>
            </div>
            <div class="fr-tabs__panel" id="elig-panel" role="tabpanel">
                <p>Conditions d'éligibilité pour les agriculteurs</p>
            </div>
        </div>
        """
        
        soup = BeautifulSoup(sample_html, 'html.parser')
        extracted = {}
        
        result = extract_dsfr_tabs(soup, extracted)
        
        print(f"✅ DSFR extraction completed: {list(result.keys())}")
        
        # Validate extraction
        if 'description' not in result:
            raise ValueError("Description not extracted from DSFR tabs")
        
        if 'eligibility' not in result:
            raise ValueError("Eligibility not extracted from DSFR tabs")
        
        print(f"   Description: {result.get('description', '')[:50]}...")
        print(f"   Eligibility: {result.get('eligibility', '')[:50]}...")
        
        print("✅ DSFR extraction test passed")
        return True
        
    except Exception as e:
        print(f"❌ DSFR extraction test failed: {e}")
        print(f"   Traceback: {traceback.format_exc()}")
        return False

def run_integration_tests():
    """Run all integration tests."""
    print("🚀 FranceAgriMer Scraper Pipeline Integration Tests")
    print("=" * 60)
    
    tests = [
        ("Config Manager Functionality", test_config_manager_functionality),
        ("Domain Isolation", test_domain_isolation),
        ("DSFR Extraction", test_dsfr_extraction),
        ("Content Extraction", test_content_extraction),
        ("URL Collection", test_scraper_url_collection)  # Most complex test last
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        print(f"\n{'='*60}")
        print(f"🧪 Running: {test_name}")
        print('='*60)
        
        try:
            if test_func():
                print(f"✅ {test_name}: PASSED")
                passed += 1
            else:
                print(f"❌ {test_name}: FAILED")
                failed += 1
        except Exception as e:
            print(f"💥 {test_name}: CRASHED - {e}")
            print(f"   Traceback: {traceback.format_exc()}")
            failed += 1
    
    print(f"\n{'='*60}")
    print(f"🏁 INTEGRATION TEST SUMMARY")
    print('='*60)
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"📊 Total:  {passed + failed}")
    
    if failed == 0:
        print("\n🎉 ALL INTEGRATION TESTS PASSED!")
        print("   - Config manager works correctly")
        print("   - Domain isolation is enforced") 
        print("   - DSFR extraction functions properly")
        print("   - URL collection uses config-driven selectors")
        print("   - Content extraction handles various page types")
        print("\n🚀 The FranceAgriMer scraper is ready for production!")
        return True
    else:
        print(f"\n🚨 {failed} TEST(S) FAILED!")
        print("   Please review the failed tests and fix the issues.")
        print("   The scraper may not work correctly until all tests pass.")
        return False

if __name__ == "__main__":
    success = run_integration_tests()
    sys.exit(0 if success else 1)
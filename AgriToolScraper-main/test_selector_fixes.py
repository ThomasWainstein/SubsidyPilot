#!/usr/bin/env python3
"""
Test script to validate that the FranceAgriMer selector fixes work correctly.
Verifies that URLs are collected and no more empty results.
"""

import sys
import os
import time
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config_manager import SecureConfigManager
from scraper.core import init_driver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException

def test_franceagrimer_selector_fixes():
    """Test that the CRITICAL 2025-08-01 selector fixes work with the live FranceAgriMer site."""
    print("🔧 Testing FranceAgriMer CRITICAL selector fixes (2025-08-01)...")
    
    target_url = "https://www.franceagrimer.fr/rechercher-une-aide"
    session_id = f"test_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    # Test config loading
    print("\n1. Testing critical config loading...")
    try:
        config_manager = SecureConfigManager(target_url, session_id)
        config = config_manager.get_config()
        
        print(f"✅ Config loaded successfully")
        print(f"   - Link selector: {config.get('link_selector')}")
        print(f"   - Total results selector: {config.get('total_results_selector')}")
        print(f"   - List page: {config.get('list_page')}")
        
        # Verify CRITICAL 2025-08-01 updates
        link_selector = config['link_selector']
        results_selector = config['total_results_selector']
        
        # Critical checks for the live page inspection fixes
        assert 'fr-card__title' in link_selector, "Link selector should contain fr-card__title"
        assert '/aides/' in link_selector, "Link selector should filter for /aides/ hrefs"
        assert 'résultat' in results_selector, "Results selector should contain :contains filter"
        assert 'h2' in results_selector, "Results selector should contain h2"
        
        print("✅ All critical 2025-08-01 selectors validated")
        
    except Exception as e:
        print(f"❌ Config loading failed: {e}")
        return False
    
    # Test live site access
    print("\n2. Testing live site access with Selenium...")
    driver = None
    try:
        driver = init_driver(headless=True)
        print(f"✅ Driver initialized")
        
        # Navigate to page
        driver.get(target_url)
        print(f"✅ Navigated to {target_url}")
        
        # Wait for page load
        WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        print(f"✅ Page loaded")
        
        # Test results counter with new selector
        print("\n3. Testing results counter detection...")
        total_results_selector = config['total_results_selector']
        results_found = False
        
        for selector in total_results_selector.split(', '):
            selector = selector.strip()
            try:
                print(f"   Trying selector: {selector}")
                elements = WebDriverWait(driver, 5).until(
                    EC.presence_of_all_elements_located((By.CSS_SELECTOR, selector))
                )
                
                # Filter for elements containing "résultat"
                for element in elements:
                    text = element.text
                    print(f"   Found element with text: {text}")
                    
                    if 'résultat' in text.lower():
                        results_found = True
                        print(f"✅ Results counter found: {text}")
                        break
                
                if results_found:
                    break
                    
            except TimeoutException:
                print(f"   Selector {selector} not found")
                continue
        
        if not results_found:
            print("❌ Could not find results counter with any selector")
            return False
        
        # Test card link detection
        print("\n4. Testing card link detection...")
        link_selector = config['link_selector']
        links_found = False
        
        for selector in link_selector.split(', '):
            selector = selector.strip()
            try:
                print(f"   Trying selector: {selector}")
                elements = WebDriverWait(driver, 10).until(
                    EC.presence_of_all_elements_located((By.CSS_SELECTOR, selector))
                )
                
                if elements:
                    links_found = True
                    print(f"✅ Found {len(elements)} card links with selector: {selector}")
                    
                    # Log sample links
                    for i, element in enumerate(elements[:3]):
                        href = element.get_attribute('href')
                        text = element.text[:50] + '...' if len(element.text) > 50 else element.text
                        print(f"   Link {i+1}: {href}")
                        print(f"   Text: {text}")
                    
                    break
                    
            except TimeoutException:
                print(f"   Selector {selector} not found")
                continue
        
        if not links_found:
            print("❌ Could not find card links with any selector")
            return False
        
        print("\n✅ All selector tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Selenium test failed: {e}")
        return False
        
    finally:
        if driver:
            driver.quit()

def test_url_collection():
    """Test actual URL collection with the fixed scraper."""
    print("\n🔗 Testing full URL collection...")
    
    try:
        from scraper_main import AgriToolScraper
        
        target_url = "https://www.franceagrimer.fr/rechercher-une-aide"
        scraper = AgriToolScraper(target_url, dry_run=True)  # Dry run to avoid Supabase
        
        # Initialize session paths
        scraper.session_paths = {
            'logs_dir': f"data/logs/test_{scraper.session_id}",
            'urls_file': f"data/extracted/test_urls_{scraper.session_id}.txt",
            'subsidies_file': f"data/extracted/test_subsidies_{scraper.session_id}.json",
            'failed_urls_file': f"data/extracted/test_failed_urls_{scraper.session_id}.txt"
        }
        
        # Collect URLs (limit to 1 page for testing)
        urls = scraper.collect_subsidy_urls(max_pages=1)
        
        print(f"✅ URL collection completed")
        print(f"   URLs collected: {len(urls)}")
        
        if len(urls) == 0:
            print("❌ No URLs collected - selectors still not working")
            return False
        
        # Log sample URLs
        print(f"   Sample URLs:")
        for i, url in enumerate(urls[:3]):
            print(f"   {i+1}. {url}")
        
        print("\n✅ URL collection test passed!")
        return True
        
    except Exception as e:
        print(f"❌ URL collection test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🚀 Starting FranceAgriMer selector fix validation")
    print("=" * 60)
    
    success = True
    
    # Run tests
    success &= test_franceagrimer_selector_fixes()
    success &= test_url_collection()
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 All tests passed! FranceAgriMer selector fixes are working!")
        sys.exit(0)
    else:
        print("❌ Some tests failed. Check the output above for details.")
        sys.exit(1)
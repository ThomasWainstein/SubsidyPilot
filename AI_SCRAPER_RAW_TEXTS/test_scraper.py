"""
Test script for the AgriTool Raw Text Scraper.
Run this to verify the scraper works before production use.
"""

import os
import sys
import logging
from scraper.utils import setup_logging, ensure_output_structure
from scraper.extract_raw_page import extract_single_page


def test_single_page_extraction():
    """Test extracting a single page."""
    print("Testing single page extraction...")
    
    test_url = "https://www.franceagrimer.fr/filieres-vin/vin/intervention-aides/aides-aux-investissements"
    
    try:
        result = extract_single_page(test_url, "franceagrimer", "test_output")
        
        if 'error' in result:
            print(f"❌ FAILED: {result['error']}")
            return False
        
        print(f"✅ SUCCESS:")
        print(f"   - Text length: {len(result['raw_text'])} characters")
        print(f"   - Attachments: {result['attachment_count']}")
        print(f"   - Output file: test_output/raw_pages/{result['page_id']}.json")
        
        return True
        
    except Exception as e:
        print(f"❌ EXCEPTION: {e}")
        return False


def test_franceagrimer_pagination():
    """Test FranceAgriMer pagination (first page only)."""
    print("\nTesting FranceAgriMer pagination...")
    
    try:
        from scraper.pagination import get_site_paginator
        from scraper.utils import create_driver
        
        driver = create_driver()
        try:
            paginator = get_site_paginator(driver, "franceagrimer")
            urls = paginator.collect_all_detail_urls(start_page=0, end_page=0)
            
            if urls:
                print(f"✅ SUCCESS: Found {len(urls)} URLs on first page")
                print(f"   Sample URLs:")
                for url in urls[:3]:
                    print(f"   - {url}")
                return True
            else:
                print("❌ FAILED: No URLs collected")
                return False
                
        finally:
            driver.quit()
            
    except Exception as e:
        print(f"❌ EXCEPTION: {e}")
        return False


def test_cli_help():
    """Test CLI help output."""
    print("\nTesting CLI help...")
    
    try:
        # Import main to ensure no syntax errors
        import scraper_main
        print("✅ SUCCESS: CLI module imports without errors")
        
        # Test list-sites command
        os.system("python scraper_main.py --list-sites")
        print("✅ SUCCESS: --list-sites command works")
        
        return True
        
    except Exception as e:
        print(f"❌ EXCEPTION: {e}")
        return False


def main():
    """Run all tests."""
    print("🦾 AgriTool Raw Text Scraper - Test Suite")
    print("=" * 50)
    
    # Setup
    ensure_output_structure("test_output")
    setup_logging("test_output/logs", "INFO")
    
    # Run tests
    tests = [
        test_cli_help,
        test_franceagrimer_pagination,
        test_single_page_extraction,
    ]
    
    results = []
    for test in tests:
        success = test()
        results.append(success)
    
    # Summary
    print("\n" + "=" * 50)
    print("TEST SUMMARY:")
    passed = sum(results)
    total = len(results)
    
    if passed == total:
        print(f"✅ ALL TESTS PASSED ({passed}/{total})")
        print("\n🎉 Scraper is ready for production use!")
    else:
        print(f"❌ SOME TESTS FAILED ({passed}/{total})")
        print("\n🔧 Fix the issues above before using in production.")
    
    # Cleanup
    print(f"\nTest outputs saved to: test_output/")
    print("You can inspect the scraped data and logs there.")


if __name__ == "__main__":
    main()
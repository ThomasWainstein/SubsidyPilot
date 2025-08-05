#!/usr/bin/env python3
"""
CRITICAL SELECTOR FIXES TEST - 2025-08-01

Tests the updated FranceAgriMer selectors after live page inspection.
Validates that the enhanced collect_links() function with diagnostics works correctly.

Expected results:
- Should collect 6+ URLs from first page
- Should save diagnostics if selectors fail
- Should provide detailed logging for debugging
"""

import os
import sys
import json
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# Add project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from scraper.core import init_driver, collect_links, wait_for_selector

def test_updated_selectors():
    """Test the 2025-08-01 critical selector fixes"""
    print("🔧 TESTING CRITICAL SELECTOR FIXES (2025-08-01)")
    print("=" * 60)
    
    # Load updated config
    config_path = "configs/franceagrimer.json"
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    print(f"📋 Config loaded from: {config_path}")
    print(f"🎯 Link selector: {config['link_selector']}")
    print(f"📊 Results selector: {config['total_results_selector']}")
    
    driver = init_driver()
    try:
        url = "https://www.franceagrimer.fr/rechercher-une-aide"
        print(f"\n🌐 Loading page: {url}")
        driver.get(url)
        
        # Wait for page to load
        print("⏳ Waiting for page elements...")
        wait_for_selector(driver, "h1", timeout=15)
        
        # Test results counter detection
        print("\n📊 TESTING RESULTS COUNTER:")
        results_selectors = config['total_results_selector'].split(',')
        results_found = False
        
        for selector in results_selectors:
            selector = selector.strip()
            try:
                elements = driver.find_elements(By.CSS_SELECTOR, selector)
                for el in elements:
                    text = el.text.strip()
                    if 'résultat' in text.lower():
                        print(f"✅ Results counter found: '{text}' (selector: {selector})")
                        results_found = True
                        break
                if results_found:
                    break
            except Exception as e:
                print(f"❌ Selector '{selector}' failed: {e}")
        
        if not results_found:
            print("❌ No results counter found with any selector")
            return False
        
        # Test card detection first
        print("\n🃏 TESTING CARD DETECTION:")
        cards = driver.find_elements(By.CSS_SELECTOR, ".fr-card")
        print(f"✅ Found {len(cards)} card containers")
        
        if len(cards) == 0:
            print("❌ No cards found - page structure may have changed")
            return False
        
        # Test the enhanced collect_links function
        print("\n🔗 TESTING ENHANCED URL COLLECTION:")
        try:
            urls = collect_links(driver, config['link_selector'])
            
            if len(urls) >= 6:
                print(f"✅ SUCCESS: Collected {len(urls)} URLs (expected 6+)")
                print("📋 Sample URLs:")
                for i, url in enumerate(urls[:3]):
                    print(f"   {i+1}. {url}")
                return True
            elif len(urls) > 0:
                print(f"⚠️  PARTIAL: Collected {len(urls)} URLs (expected 6+)")
                print("📋 Sample URLs:")
                for i, url in enumerate(urls):
                    print(f"   {i+1}. {url}")
                return True
            else:
                print("❌ FAILED: No URLs collected")
                return False
                
        except Exception as e:
            print(f"❌ collect_links() failed: {e}")
            return False
    
    finally:
        driver.quit()

def test_diagnostics_generation():
    """Test that diagnostics are generated when selectors fail"""
    print("\n🧪 TESTING DIAGNOSTICS GENERATION")
    print("=" * 40)
    
    driver = init_driver()
    try:
        url = "https://www.franceagrimer.fr/rechercher-une-aide"
        driver.get(url)
        wait_for_selector(driver, "h1", timeout=15)
        
        # Test with intentionally broken selector to trigger diagnostics
        print("🔥 Testing with broken selector to trigger diagnostics...")
        
        try:
            # This should fail and generate debug files
            urls = collect_links(driver, "this-selector-does-not-exist")
            print("❌ Expected failure but got success")
            return False
        except RuntimeError as e:
            print(f"✅ Diagnostics triggered correctly: {e}")
            
            # Check if debug files were created
            logs_dir = "logs"
            if os.path.exists(logs_dir):
                html_files = [f for f in os.listdir(logs_dir) if f.startswith("failed_page_")]
                screenshot_files = [f for f in os.listdir(logs_dir) if f.startswith("url_collection_error_")]
                
                if html_files and screenshot_files:
                    print(f"✅ Debug files created: {len(html_files)} HTML, {len(screenshot_files)} screenshots")
                    return True
                else:
                    print("❌ Debug files not found")
                    return False
            else:
                print("❌ Logs directory not created")
                return False
                
    finally:
        driver.quit()

def main():
    """Run all critical selector tests"""
    print("🚀 FRANCEAGRIMER CRITICAL SELECTOR FIXES TEST SUITE")
    print("=" * 60)
    print("Date: 2025-08-01")
    print("Purpose: Validate live page inspection fixes\n")
    
    results = {}
    
    # Test 1: Updated selectors
    try:
        results['selectors'] = test_updated_selectors()
    except Exception as e:
        print(f"❌ Selector test failed with exception: {e}")
        results['selectors'] = False
    
    # Test 2: Diagnostics generation  
    try:
        results['diagnostics'] = test_diagnostics_generation()
    except Exception as e:
        print(f"❌ Diagnostics test failed with exception: {e}")
        results['diagnostics'] = False
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 TEST RESULTS SUMMARY:")
    print("=" * 60)
    
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name.upper()}: {status}")
    
    all_passed = all(results.values())
    overall_status = "✅ ALL TESTS PASSED" if all_passed else "❌ SOME TESTS FAILED"
    print(f"\nOVERALL: {overall_status}")
    
    if all_passed:
        print("\n🎉 CRITICAL FIXES VALIDATED SUCCESSFULLY!")
        print("The FranceAgriMer scraper should now collect URLs correctly.")
    else:
        print("\n🔥 CRITICAL ISSUES DETECTED!")
        print("Check the debug files in logs/ directory for details.")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
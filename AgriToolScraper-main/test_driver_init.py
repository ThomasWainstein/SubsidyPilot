#!/usr/bin/env python3
"""
Critical driver initialization test for AgriToolScraper.
This test verifies that webdriver-manager works correctly and identifies any [Errno 8] issues.
"""

import os
import sys
from scraper.core import init_driver

def test_driver_init():
    """Test that ChromeDriver initializes correctly via webdriver-manager."""
    print("="*60)
    print("AGRITOOL SCRAPER - DRIVER INITIALIZATION TEST")
    print("="*60)
    
    try:
        print("[TEST] Initializing Chrome driver with webdriver-manager...")
        driver = init_driver(browser="chrome", headless=True)
        
        print("[TEST] Testing basic driver functionality...")
        driver.get("https://www.example.com")
        
        title = driver.title
        print(f"[TEST] Successfully loaded page. Title: {title}")
        
        if "Example" in title:
            print("[SUCCESS] ✅ Driver test passed!")
            result = True
        else:
            print(f"[WARN] ⚠️ Unexpected page title: {title}")
            result = False
        
        driver.quit()
        print("[TEST] Driver closed successfully")
        
        return result
        
    except Exception as e:
        print(f"[ERROR] ❌ Driver test failed: {e}")
        print(f"[ERROR] Exception type: {type(e).__name__}")
        
        # Check for specific [Errno 8] error
        if "Exec format error" in str(e) or "[Errno 8]" in str(e):
            print("[CRITICAL] 🚨 [Errno 8] detected - this is the ChromeDriver binary issue!")
            print("[CRITICAL] The system is trying to execute a non-binary file as chromedriver")
        
        return False

def main():
    """Run the driver test and exit with appropriate code."""
    success = test_driver_init()
    
    print("\n" + "="*60)
    if success:
        print("RESULT: ✅ All tests passed - webdriver-manager is working correctly")
        sys.exit(0)
    else:
        print("RESULT: ❌ Test failed - driver initialization has issues")
        print("\nDEBUGGING TIPS:")
        print("1. Check the debug output above for driver path and file details")
        print("2. Verify that webdriver-manager is using the correct binary")
        print("3. Look for any non-binary files being executed as chromedriver")
        print("4. Ensure no manual driver path logic remains in the codebase")
        sys.exit(1)

if __name__ == "__main__":
    main()
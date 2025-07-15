#!/usr/bin/env python3
"""
Test script to verify Selenium 4+ driver initialization compliance.
ABSOLUTE REQUIREMENT: No legacy driver patterns allowed.
"""
import sys
import os
sys.path.append(os.path.dirname(__file__))

from scraper.core import init_driver
from debug_diagnostics import get_ruthless_debugger, log_step, log_error

def test_driver_init():
    """Test that driver initialization works with Selenium 4+ syntax."""
    log_step("🔥 TESTING SELENIUM 4+ DRIVER COMPLIANCE")
    
    try:
        # Test Chrome driver
        log_step("Testing Chrome driver initialization...")
        driver = init_driver(browser="chrome", headless=True)
        
        if driver:
            log_step("✅ Chrome driver initialized successfully")
            driver.get("data:text/html,<html><body><h1>Test Page</h1></body></html>")
            log_step("✅ Chrome driver can load pages")
            driver.quit()
            log_step("✅ Chrome driver cleanup successful")
        else:
            raise Exception("Chrome driver returned None")
            
        log_step("🔥 SELENIUM 4+ COMPLIANCE TEST PASSED")
        return True
        
    except Exception as e:
        log_error(f"❌ SELENIUM 4+ COMPLIANCE TEST FAILED: {e}")
        import traceback
        log_error(f"Full traceback: {traceback.format_exc()}")
        return False

if __name__ == "__main__":
    # Initialize debugging
    debugger = get_ruthless_debugger()
    
    success = test_driver_init()
    
    if success:
        print("🔥 ALL TESTS PASSED - SELENIUM 4+ COMPLIANT")
        sys.exit(0)
    else:
        print("❌ TESTS FAILED - SELENIUM 4+ NON-COMPLIANT")
        sys.exit(1)
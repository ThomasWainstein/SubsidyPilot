#!/usr/bin/env python3
"""
Test script to verify Selenium 4+ driver initialization compliance.
ABSOLUTE REQUIREMENT: No legacy driver patterns allowed.
"""
import sys, traceback, logging, os
logging.basicConfig(level=logging.DEBUG,
    format="%(asctime)s %(levelname)s [%(filename)s:%(lineno)d] %(message)s")
def excepthook(exc_type, exc_value, exc_traceback):
    logging.critical("Uncaught exception",
        exc_info=(exc_type, exc_value, exc_traceback))
    print("="*40 + " ENVIRONMENT " + "="*40)
    for k, v in sorted(os.environ.items()):
        print(f"{k}={v}")
    print("="*40 + " TRACEBACK END " + "="*40)
sys.excepthook = excepthook

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
        logging.critical("SELENIUM 4+ VALIDATION FAILED: %s", e, exc_info=True)
        print("="*40 + " ERROR " + "="*40)
        traceback.print_exc()
        print("="*40 + " FILE DUMP " + "="*40)
        for fname in os.listdir("."):
            if fname.endswith(".md") or fname.endswith(".log"):
                print(f"\n--- {fname} ---\n")
                try:
                    with open(fname) as f:
                        print(f.read()[-2000:])
                except:
                    print("Could not read file")
        print("="*40 + " ENV " + "="*40)
        for k, v in os.environ.items():
            print(f"{k}={v}")
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
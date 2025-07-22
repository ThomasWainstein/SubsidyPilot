#!/usr/bin/env python3
"""
Force execution test to capture the exact driver selection logic and prove where failure occurs.
This will run a minimal test and log everything that happens.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import the core scraper
from scraper.core import init_driver
from debug_diagnostics import log_step, log_error

def test_chrome_driver_selection():
    """Test Chrome driver selection and log every step."""
    log_step("🔥 STARTING FORCED EXECUTION TEST")
    
    try:
        log_step("🔥 Calling init_driver('chrome', headless=True)")
        driver = init_driver("chrome", headless=True)
        log_step("🔥 SUCCESS: Chrome driver initialized successfully")
        
        # Clean up
        driver.quit()
        log_step("🔥 SUCCESS: Driver quit successfully")
        
        return True
        
    except Exception as e:
        log_error(f"🔥 FAILED: Chrome driver initialization failed: {e}")
        import traceback
        log_error(f"🔥 FAILED: Full traceback: {traceback.format_exc()}")
        return False

if __name__ == "__main__":
    print("🔥 FORCE EXECUTION TEST - DRIVER SELECTION LOGIC")
    
    success = test_chrome_driver_selection()
    
    if success:
        print("✅ TEST PASSED: Driver selection logic works correctly")
        sys.exit(0)
    else:
        print("❌ TEST FAILED: Driver selection logic has issues")
        sys.exit(1)
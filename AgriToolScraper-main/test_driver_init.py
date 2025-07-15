
#!/usr/bin/env python3
"""
Critical driver initialization test for AgriToolScraper.
This test verifies that webdriver-manager works correctly and identifies any [Errno 8] issues.
Enhanced with binary validation and cache management.
"""

import os
import sys
import subprocess
from scraper.core import init_driver, validate_driver_binary, purge_corrupted_wdm_cache

def debug_wdm_cache():
    """Debug the webdriver-manager cache contents to identify issues."""
    wdm_cache = os.path.expanduser("~/.wdm")
    print(f"[DEBUG] Checking .wdm cache at: {wdm_cache}")
    
    if not os.path.exists(wdm_cache):
        print("[DEBUG] No .wdm cache exists")
        return
    
    # Walk through the cache structure
    for root, dirs, files in os.walk(wdm_cache):
        level = root.replace(wdm_cache, '').count(os.sep)
        indent = ' ' * 2 * level
        print(f"{indent}{os.path.basename(root)}/")
        
        subindent = ' ' * 2 * (level + 1)
        for file in files:
            filepath = os.path.join(root, file)
            try:
                # Get file info
                stat_info = os.stat(filepath)
                size = stat_info.st_size
                executable = os.access(filepath, os.X_OK)
                
                # Get file type if possible
                file_type = "unknown"
                try:
                    result = subprocess.run(['file', filepath], capture_output=True, text=True, timeout=5)
                    if result.returncode == 0:
                        file_type = result.stdout.strip().split(':')[1].strip()
                except:
                    pass
                
                print(f"{subindent}{file} ({size} bytes, exec={executable}, type={file_type})")
                
                # Highlight problematic files
                if 'THIRD_PARTY_NOTICES' in file or 'LICENSE' in file:
                    print(f"{subindent}  ⚠️ WARNING: This is a text file that could cause [Errno 8]!")
                elif executable and 'chromedriver' in file.lower():
                    print(f"{subindent}  ✅ This looks like the correct binary")
                    
            except Exception as e:
                print(f"{subindent}{file} (error reading: {e})")

def test_driver_init():
    """Test that ChromeDriver initializes correctly via webdriver-manager."""
    print("="*80)
    print("AGRITOOL SCRAPER - ENHANCED DRIVER INITIALIZATION TEST")
    print("="*80)
    
    try:
        print("[TEST] Step 1: Debugging webdriver-manager cache...")
        debug_wdm_cache()
        
        print("\n[TEST] Step 2: Initializing Chrome driver with bulletproof validation...")
        driver = init_driver(browser="chrome", headless=True, force_cache_purge=True)
        
        print("[TEST] Step 3: Testing basic driver functionality...")
        driver.get("https://www.example.com")
        
        title = driver.title
        print(f"[TEST] Successfully loaded page. Title: {title}")
        
        if "Example" in title:
            print("[SUCCESS] ✅ Driver test passed!")
            result = True
        else:
            print(f"[WARN] ⚠️ Unexpected page title: {title}")
            result = False
        
        print("[TEST] Step 4: Verifying driver can handle navigation...")
        driver.get("https://httpbin.org/user-agent")
        page_source = driver.page_source
        if "user-agent" in page_source.lower():
            print("[SUCCESS] ✅ Navigation test passed!")
        else:
            print("[WARN] ⚠️ Navigation test unclear")
        
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
            print("[CRITICAL] Check the debug output above for text files in the driver cache")
        
        return False

def main():
    """Run the enhanced driver test and exit with appropriate code."""
    success = test_driver_init()
    
    print("\n" + "="*80)
    if success:
        print("RESULT: ✅ All tests passed - webdriver-manager is working correctly")
        sys.exit(0)
    else:
        print("RESULT: ❌ Test failed - driver initialization has issues")
        print("\nENHANCED DEBUGGING TIPS:")
        print("1. Check the cache debug output above for text files")
        print("2. Look for THIRD_PARTY_NOTICES.chromedriver files")
        print("3. Verify that executable files are marked as such")
        print("4. Force cache purge and retry if needed")
        print("5. Check Ubuntu/Chromium snap compatibility")
        sys.exit(1)

if __name__ == "__main__":
    main()

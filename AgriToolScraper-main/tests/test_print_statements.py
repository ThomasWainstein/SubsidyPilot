#!/usr/bin/env python3
"""
Test file with print statements and documentation that should NOT be flagged.
"""

from selenium import webdriver

def documentation_examples():
    """This function demonstrates patterns that should be ignored."""
    
    # Print statements mentioning forbidden patterns (should NOT be flagged)
    print("❌ Never use chrome_options= or firefox_options=")
    print("❌ Avoid executable_path= parameter")
    print("Legacy patterns to avoid: chrome_options=opts, executable_path=/path")
    
    # Comments with forbidden patterns (should NOT be flagged)
    # Legacy pattern for comparison: chrome_options=opts  # SELENIUM_COMPLIANCE_ALLOW
    # Old style: driver = webdriver.Chrome(executable_path="/path", chrome_options=opts)  # SELENIUM_COMPLIANCE_ALLOW
    
    # String assignments (should NOT be flagged)
    bad_example = "webdriver.Chrome(chrome_options=options)"
    legacy_code = "driver = webdriver.Chrome(executable_path='/path')"
    
    # ✅ ACTUAL CODE: This should be the only pattern that gets executed
    service = webdriver.chrome.service.Service()
    options = webdriver.chrome.options.Options()
    driver = webdriver.Chrome(service=service, options=options)
    
    return driver

def test_educational_content():
    """Educational content with forbidden patterns in documentation."""
    
    # These are documentation examples that should NOT trigger violations
    error_messages = [
        "Error: chrome_options is deprecated",
        "Warning: executable_path parameter removed",
        "Fix: Replace firefox_options with options"
    ]
    
    # Log statements (should NOT be flagged)
    import logging
    logging.error("Legacy chrome_options parameter detected")
    
    # Actual compliant code
    return webdriver.Chrome(service=webdriver.chrome.service.Service(), 
                           options=webdriver.chrome.options.Options())

if __name__ == "__main__":
    driver = documentation_examples()
    driver.quit()
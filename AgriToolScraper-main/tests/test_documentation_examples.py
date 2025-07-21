#!/usr/bin/env python3
"""
Test file with documentation examples that should NOT be flagged.
Contains educational examples with proper markers.
"""

from selenium import webdriver

def educational_examples():
    """Educational examples with proper documentation markers."""
    
    # Example of correct usage: driver = webdriver.Chrome(service=service, options=options)
    # Example of wrong usage (don't do this): driver = webdriver.Chrome(path, options)  # SELENIUM_COMPLIANCE_ALLOW
    # This is a forbidden pattern (for educational purposes): chrome_options=opts  # SELENIUM_COMPLIANCE_ALLOW
    
    # ✅ ACTUAL CODE: This should be the only pattern that gets executed
    service = webdriver.chrome.service.Service()
    options = webdriver.chrome.options.Options()
    driver = webdriver.Chrome(service=service, options=options)
    
    return driver

def function_with_inline_allows():
    """Function demonstrating inline allow directives."""
    
    # Bad example for docs only: webdriver.Chrome(executable_path="/path")  # SELENIUM_COMPLIANCE_ALLOW
    # Legacy pattern for comparison: chrome_options=opts  # SELENIUM_COMPLIANCE_ALLOW
    
    # ✅ Real code - compliant pattern
    service = webdriver.chrome.service.Service()
    options = webdriver.chrome.options.Options()
    return webdriver.Chrome(service=service, options=options)

# Documentation block with examples
"""
Examples of Selenium patterns:

CORRECT (use this):
driver = webdriver.Chrome(service=service, options=options)

WRONG (don't use this):
driver = webdriver.Chrome(executable_path="/path", chrome_options=opts)  # SELENIUM_COMPLIANCE_ALLOW
"""

if __name__ == "__main__":
    driver = educational_examples()
    driver.quit()
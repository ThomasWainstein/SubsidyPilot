#!/usr/bin/env python3
"""
Test file with ONLY legacy Selenium patterns that should be flagged.
This file should ALWAYS trigger violations.
"""

from selenium import webdriver

def bad_chrome_examples():
    """Examples that should trigger violations."""
    
    # ❌ VIOLATION: Positional arguments
    driver1 = webdriver.Chrome("/usr/local/bin/chromedriver", options)
    
    # ❌ VIOLATION: Legacy chrome_options keyword
    driver2 = webdriver.Chrome(chrome_options=options)
    
    # ❌ VIOLATION: Deprecated executable_path
    driver3 = webdriver.Chrome(executable_path="/usr/local/bin/chromedriver")
    
    # ❌ VIOLATION: Multiple positional arguments
    driver4 = webdriver.Chrome(service, options, capabilities)
    
    return [driver1, driver2, driver3, driver4]

def bad_firefox_examples():
    """Firefox examples that should trigger violations."""
    
    # ❌ VIOLATION: Positional arguments
    driver1 = webdriver.Firefox("/usr/local/bin/geckodriver", options)
    
    # ❌ VIOLATION: Legacy firefox_options keyword
    driver2 = webdriver.Firefox(firefox_options=options)
    
    # ❌ VIOLATION: Deprecated executable_path
    driver3 = webdriver.Firefox(executable_path="/usr/local/bin/geckodriver")
    
    return [driver1, driver2, driver3]

def mixed_bad_patterns():
    """Mixed legacy patterns."""
    
    # ❌ VIOLATION: Old-style instantiation
    chrome = webdriver.Chrome(chrome_options=chrome_opts, executable_path=chrome_path)
    
    # ❌ VIOLATION: Positional args
    firefox = webdriver.Firefox(gecko_path, firefox_opts)
    
    return [chrome, firefox]

if __name__ == "__main__":
    # This file should generate multiple violations
    pass
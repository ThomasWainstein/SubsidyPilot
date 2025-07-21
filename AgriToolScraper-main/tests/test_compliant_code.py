#!/usr/bin/env python3
"""
Test file with ONLY compliant Selenium 4+ patterns.
This file should NEVER trigger any violations.
"""

from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.firefox.service import Service as FirefoxService
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.firefox.options import Options as FirefoxOptions

def create_chrome_driver():
    """Create Chrome driver using compliant pattern."""
    service = ChromeService("/usr/local/bin/chromedriver")
    options = ChromeOptions()
    options.add_argument("--headless")
    
    # ✅ COMPLIANT: Using keyword arguments in correct order
    driver = webdriver.Chrome(service=service, options=options)
    return driver

def create_firefox_driver():
    """Create Firefox driver using compliant pattern."""
    service = FirefoxService("/usr/local/bin/geckodriver")
    options = FirefoxOptions()
    options.add_argument("--headless")
    
    # ✅ COMPLIANT: Using keyword arguments (either order is OK)
    driver = webdriver.Firefox(options=options, service=service)
    return driver

def another_chrome_example():
    """Another compliant Chrome example."""
    chrome_service = ChromeService()
    chrome_options = ChromeOptions()
    
    # ✅ COMPLIANT: Modern Selenium 4+ pattern
    driver = webdriver.Chrome(service=chrome_service, options=chrome_options)
    return driver

# Example showing compliant pattern in comments: driver = webdriver.Chrome(service=service, options=options)
# This is a correct usage example: webdriver.Firefox(service=service, options=options)

def main():
    """Main function demonstrating compliant usage."""
    # All these patterns should pass validation
    chrome = create_chrome_driver()
    firefox = create_firefox_driver()
    
    # Clean up
    chrome.quit()
    firefox.quit()

if __name__ == "__main__":
    main()
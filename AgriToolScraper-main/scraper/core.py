# scraper/core.py

import os
import time
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.common.exceptions import NoSuchElementException, WebDriverException
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from langdetect import detect, LangDetectException

FIELD_KEYWORDS_FR = {
    # ... (your FIELD_KEYWORDS_FR dictionary here, unchanged) ...
    # To save space, copy as-is from your own snippet above
    # ...
}

def log_unmapped_label(label, url=None):
    """Logs any unmapped field label for later review."""
    log_path = "data/extracted/unmapped_labels.log"
    logline = f"[{url}] {label}\n" if url else f"{label}\n"
    with open(log_path, "a", encoding="utf-8") as logf:
        logf.write(logline)

def detect_language(text):
    """
    Detect the main language for a given string.
    Returns a short language code (e.g. 'en', 'fr', 'ro'), or 'unknown'.
    """
    try:
        return detect(text)
    except LangDetectException:
        return "unknown"
    except Exception as e:
        print(f"[ERROR] Language detection failed: {e}")
        return "unknown"

def init_driver(
    browser="chrome",
    user_agent=None,
    headless=True,
    window_size="1200,800"
):
    """
    Initialize and return a Selenium WebDriver for the specified browser.
    """
    try:
        if browser == "chrome":
            from webdriver_manager.chrome import ChromeDriverManager
            from selenium.webdriver.chrome.options import Options as ChromeOptions
            from selenium.webdriver.chrome.service import Service as ChromeService
            options = ChromeOptions()
            if headless:
                options.add_argument("--headless")
            options.add_argument("--disable-gpu")
            options.add_argument(f"--window-size={window_size}")
            options.add_argument("--no-sandbox")
            if user_agent:
                options.add_argument(f"user-agent={user_agent}")

            driver_path = ChromeDriverManager().install()
            print(f"[INFO] Using ChromeDriver at: {driver_path}")

            if not os.access(driver_path, os.X_OK):
                raise RuntimeError(
                    f"Downloaded ChromeDriver is not executable: {driver_path}\n"
                    f"Check if this file is really a binary driver. You may have a corrupted webdriver-manager cache."
                )
            service = ChromeService(driver_path)
            driver = webdriver.Chrome(service=service, options=options)

        elif browser == "firefox":
            from webdriver_manager.firefox import GeckoDriverManager
            from selenium.webdriver.firefox.options import Options as FirefoxOptions
            from selenium.webdriver.firefox.service import Service as FirefoxService
            options = FirefoxOptions()
            if headless:
                options.add_argument("--headless")
            if user_agent:
                options.set_preference("general.useragent.override", user_agent)
            service = FirefoxService(GeckoDriverManager().install())
            driver = webdriver.Firefox(service=service, options=options)

        elif browser == "edge":
            from webdriver_manager.microsoft import EdgeChromiumDriverManager
            from selenium.webdriver.edge.options import Options as EdgeOptions
            from selenium.webdriver.edge.service import Service as EdgeService
            options = EdgeOptions()
            if headless:
                options.add_argument("--headless")
            options.add_argument(f"--window-size={window_size}")
            if user_agent:
                options.add_argument(f"user-agent={user_agent}")
            service = EdgeService(EdgeChromiumDriverManager().install())
            driver = webdriver.Edge(service=service, options=options)

        else:
            print(f"[WARN] Unsupported browser '{browser}', using Chrome as fallback.")
            return init_driver("chrome", user_agent, headless, window_size)

        return driver

    except WebDriverException as e:
        print(f"[ERROR] Failed to initialize driver ({browser}): {e}")
        raise

def ensure_folder(path):
    """
    Ensure a folder exists, creating it if it doesn't.
    Args:
        path (str): Directory path to create if missing.
    """
    os.makedirs(path, exist_ok=True)

def download_file(url, dest_folder):
    """
    Download a file from a given URL into a destination folder.
    Handles streaming download and creates folder if missing.
    Logs download status and errors.
    Args:
        url (str): The full URL of the file to download.
        dest_folder (str): Local directory where the file will be saved.
    Returns:
        local_path (str): Full path to the downloaded file or None if failed.
    """
    ensure_folder(dest_folder)
    local_filename = url.split("/")[-1].split("?")[0]
    local_path = os.path.join(dest_folder, local_filename)
    try:
        with requests.get(url, stream=True, timeout=20) as r:
            r.raise_for_status()
            with open(local_path, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
        print(f"[INFO] Downloaded: {local_filename} → {local_path}")
        return local_path
    except Exception as e:
        print(f"[ERROR] Failed to download {url}: {e}")
        return None

def collect_links(driver, link_selector):
    """
    Collect all 'href' URLs matching a given CSS selector.
    Returns a list of unique href URLs.
    """
    links = driver.find_elements(By.CSS_SELECTOR, link_selector)
    return list({l.get_attribute("href") for l in links if l.get_attribute("href")})

def wait_for_selector(driver, selector, timeout=10):
    """
    Wait until at least one element matching selector is present on page.
    """
    WebDriverWait(driver, timeout).until(
        EC.presence_of_all_elements_located((By.CSS_SELECTOR, selector))
    )

def click_next(driver, next_page_selector):
    """
    Attempt to click the 'next' button for pagination.
    Returns True if clicked successfully, False if no next page found.
    """
    try:
        next_btn = driver.find_element(By.CSS_SELECTOR, next_page_selector)
        if "disabled" in (next_btn.get_attribute("class") or ""):
            return False
        next_btn.click()
        return True
    except NoSuchElementException:
        return False
    except Exception as e:
        print(f"[ERROR] Pagination failed: {e}")
        return False

def guess_canonical_field_fr(text, field_keywords=FIELD_KEYWORDS_FR):
    """
    Map a French text block to the most likely canonical field based on FIELD_KEYWORDS_FR.
    Returns the field name (e.g., 'description', 'eligibility', ...) or None.
    """
    lower = text.lower()
    for field, keywords in field_keywords.items():
        for word in keywords:
            if word in lower:
                return field
    return None

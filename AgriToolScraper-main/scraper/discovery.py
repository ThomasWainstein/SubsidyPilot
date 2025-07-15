# scraper/discovery.py

import os
from scraper.core import init_driver, ensure_folder
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException

def extract_text_from_urls(urls, output_folder="data/raw_pages", browser="chrome"):
    """
    Visit a list of URLs and save the full visible body text of each page
    to separate plain-text files for AI-assisted schema discovery.

    Args:
        urls (List[str]): List of URLs to process.
        output_folder (str): Directory where extracted text files will be saved.
        browser (str): Which browser to use ("chrome", "firefox", "edge")
    """
    ensure_folder(output_folder)
    driver = init_driver(browser=browser)

    for idx, url in enumerate(urls, start=1):
        print(f"Extracting from URL {idx}: {url}")
        try:
            driver.get(url)
            WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            body_text = driver.find_element(By.TAG_NAME, "body").text
        except TimeoutException:
            print(f"[WARN] Timeout loading {url}. Skipping.")
            continue
        except WebDriverException as e:
            print(f"[ERROR] WebDriver error for {url}: {e}. Skipping.")
            continue
        except Exception as e:
            print(f"[ERROR] Failed extracting text from {url}: {e}. Skipping.")
            continue

        output_path = os.path.join(output_folder, f"raw_page_{idx}.txt")
        try:
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(body_text)
            print(f"Saved to {output_path}")
        except Exception as e:
            print(f"[ERROR] Could not save file {output_path}: {e}")

    driver.quit()

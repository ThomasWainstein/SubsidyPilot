import os
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoSuchElementException, WebDriverException
from tqdm import tqdm

URL = "https://www.afir.info/"

def init_driver():
    browser = os.environ.get("BROWSER", "chrome").lower()
    driver = None
    try:
        if browser == "chrome":
            from webdriver_manager.chrome import ChromeDriverManager
            from selenium.webdriver.chrome.options import Options as ChromeOptions
            options = ChromeOptions()
            options.add_argument("--headless")
            options.add_argument("--disable-gpu")
            options.add_argument("--window-size=1920,1080")
            options.add_argument("--no-sandbox")
            driver = webdriver.Chrome(ChromeDriverManager().install(), options=options)
        elif browser == "firefox":
            from webdriver_manager.firefox import GeckoDriverManager
            from selenium.webdriver.firefox.options import Options as FirefoxOptions
            options = FirefoxOptions()
            options.add_argument("--headless")
            driver = webdriver.Firefox(executable_path=GeckoDriverManager().install(), options=options)
        elif browser == "edge":
            from webdriver_manager.microsoft import EdgeChromiumDriverManager
            from selenium.webdriver.edge.options import Options as EdgeOptions
            options = EdgeOptions()
            options.add_argument("--headless")
            driver = webdriver.Edge(EdgeChromiumDriverManager().install(), options=options)
        else:
            raise ValueError(f"Unsupported browser: {browser}")
    except WebDriverException as e:
        print(f"[ERROR] Could not start {browser} driver: {e}")
        if browser != "chrome":
            print("[INFO] Trying fallback: Chrome.")
            os.environ["BROWSER"] = "chrome"
            return init_driver()
        raise
    except Exception as e:
        print(f"[ERROR] Failed initializing WebDriver: {e}")
        raise
    return driver

def ensure_data_folder(subfolder=None):
    path = "data" if not subfolder else os.path.join("data", subfolder)
    os.makedirs(path, exist_ok=True)
    return path

if __name__ == "__main__":
    ensure_data_folder()
    driver = None
    try:
        driver = init_driver()
        driver.get(URL)

        # Wait for page to fully load and at least one result
        WebDriverWait(driver, 15).until(
            EC.presence_of_all_elements_located((By.CSS_SELECTOR, "a[rel='bookmark']"))
        )

        collected_urls = set()
        page_count = 0

        print("Starting scrape...")

        while True:
            page_count += 1
            print(f"Processing page {page_count}...")

            # Collect all links to subsidy detail pages
            links = driver.find_elements(By.CSS_SELECTOR, "a[rel='bookmark']")
            for link in links:
                href = link.get_attribute("href")
                if href:
                    collected_urls.add(href)

            # Try next page
            try:
                next_button = driver.find_element(By.CSS_SELECTOR, 'li.pagination-next a')
                next_classes = next_button.get_attribute("class") or ""
                if "disabled" in next_classes:
                    break
                next_button.click()
                # Wait for new content
                WebDriverWait(driver, 15).until(
                    EC.presence_of_all_elements_located((By.CSS_SELECTOR, "a[rel='bookmark']"))
                )
                time.sleep(1)
            except NoSuchElementException:
                print("No next button found — assuming last page.")
                break
            except Exception as e:
                print(f"Warning: Pagination issue on page {page_count}: {e}")
                break

        print(f"Collected {len(collected_urls)} URLs.")

        # Save to file
        output_path = os.path.join("data", "raw_urls.txt")
        with open(output_path, "w", encoding="utf-8") as f:
            for url in tqdm(collected_urls, desc="Saving URLs"):
                f.write(url + "\n")

        print(f"Saved to {output_path}")

    finally:
        if driver:
            driver.quit()

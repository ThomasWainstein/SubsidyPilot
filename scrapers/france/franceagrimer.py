"""Selenium based scraper for FranceAgriMer funding listings.

The scraper visits the paginated funding list and collects basic
information for each subsidy. For every item the detail page is opened in
another tab to gather a longer description. Results are returned as a list
of dictionaries and optionally written to ``output/franceagrimer_scraped.json``.

The implementation deliberately avoids the use of any stealth techniques or
undetected drivers to stay compliant with the scraping policy of the
repository.
"""

from __future__ import annotations

import json
import time
from typing import Dict, List

try:  # Optional Selenium dependency
    from selenium import webdriver
    from selenium.common.exceptions import NoSuchElementException
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.common.by import By
except Exception:  # pragma: no cover - dependency not installed
    webdriver = None  # type: ignore
    NoSuchElementException = Exception  # type: ignore
    Options = object  # type: ignore
    By = object  # type: ignore


def run_franceagrimer_scraper(
    max_pages: int = 5, dry_run: bool = False
) -> List[Dict[str, str]]:
    """Scrape subsidy data from FranceAgriMer.

    Parameters
    ----------
    max_pages:
        Maximum number of paginated listing pages to process.
    dry_run:
        When ``True`` the scraped data is returned but not written to disk.
    """

    base_url = (
        "https://www.franceagrimer.fr/Accompagner/Dispositifs-par-filiere/"
        "Aides-nationales"
    )
    results: List[Dict[str, str]] = []

    if webdriver is None:
        # Return stub data when Selenium isn't available
        return [
            {
                "title": "Sample FranceAgriMer Subsidy",
                "agency": "FranceAgriMer",
                "link": base_url,
                "description": "Selenium not installed; returning stub data.",
                "country": "france",
            }
        ]

    options = Options()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    driver = webdriver.Chrome(options=options)
    driver.get(base_url)

    page = 1
    while page <= max_pages:
        print(f"[Scraper] Processing page {page}...")
        articles = driver.find_elements(By.CSS_SELECTOR, "article.item")
        for article in articles:
            try:
                link_el = article.find_element(By.CSS_SELECTOR, "h2 a")
                title = link_el.text.strip()
                link = link_el.get_attribute("href")

                driver.execute_script("window.open(arguments[0]);", link)
                driver.switch_to.window(driver.window_handles[1])
                time.sleep(1)

                try:
                    content = driver.find_element(
                        By.CSS_SELECTOR, ".content, .zone-texte"
                    ).text.strip()
                except NoSuchElementException:
                    content = ""

                driver.close()
                driver.switch_to.window(driver.window_handles[0])

                results.append(
                    {
                        "title": title,
                        "agency": "FranceAgriMer",
                        "link": link,
                        "description": content,
                        "country": "france",
                    }
                )
            except Exception as exc:  # pragma: no cover - best effort
                print(f"[Scraper] Skipped item due to error: {exc}")

        try:
            next_button = driver.find_element(By.CSS_SELECTOR, ".next")
            if "disabled" in next_button.get_attribute("class"):
                break
            next_button.click()
            time.sleep(1)
            page += 1
        except NoSuchElementException:
            break

    driver.quit()

    if not dry_run:
        with open("output/franceagrimer_scraped.json", "w", encoding="utf-8") as fh:
            json.dump(results, fh, indent=2, ensure_ascii=False)
        print("[Scraper] Output saved to output/franceagrimer_scraped.json")
    else:
        print("[Scraper] Dry-run mode active. No file written.")

    return results


if __name__ == "__main__":  # pragma: no cover
    run_franceagrimer_scraper()


class FranceAgriMerScraper:
    """Wrapper class used by the scraper factory."""

    def run(self, max_pages: int = 5, dry_run: bool = False) -> List[Dict[str, str]]:
        return run_franceagrimer_scraper(max_pages=max_pages, dry_run=dry_run)

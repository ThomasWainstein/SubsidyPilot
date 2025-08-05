"""Selenium-based scraper for Romania's AFIR agency."""

from __future__ import annotations

from typing import Dict, List

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By


class AFIRScraper:
    """Basic scraper extracting links from the AFIR portal."""

    def run(self) -> List[Dict[str, str]]:
        """Collect funding links from AFIR's website."""
        base_url = (
            "https://portal.afir.info/informatii_institutionale_link-uri_utile"
        )
        options = Options()
        options.add_argument("--headless")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")

        driver = webdriver.Chrome(options=options)
        driver.get(base_url)

        results: List[Dict[str, str]] = []
        for link_el in driver.find_elements(By.CSS_SELECTOR, "div#content a"):
            href = link_el.get_attribute("href")
            if not href:
                continue
            results.append(
                {
                    "title": link_el.text.strip(),
                    "link": href,
                    "agency": "AFIR",
                    "country": "romania",
                }
            )

        driver.quit()
        return results


if __name__ == "__main__":  # pragma: no cover
    AFIRScraper().run()

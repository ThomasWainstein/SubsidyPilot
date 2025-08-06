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


def extract_subsidy_details(driver, title: str, url: str) -> Dict[str, str]:
    """Extract detailed information from a subsidy page."""
    try:
        # Extract description from multiple possible selectors
        description = ""
        description_selectors = [
            ".page-content",
            ".content-main",
            ".aide-description", 
            ".description",
            "main .content",
            ".zone-texte"
        ]
        
        for selector in description_selectors:
            try:
                desc_element = driver.find_element(By.CSS_SELECTOR, selector)
                description = desc_element.text.strip()
                if description and len(description) > 50:  # Ensure meaningful content
                    break
            except NoSuchElementException:
                continue
        
        # Extract amount/funding information
        amount = ""
        amount_selectors = [
            ".montant", ".amount", ".funding-amount", 
            ".aide-montant", "[class*='montant']",
            "td:contains('Montant')", "li:contains('€')"
        ]
        
        for selector in amount_selectors:
            try:
                amount_element = driver.find_element(By.CSS_SELECTOR, selector)
                amount = amount_element.text.strip()
                if amount and ('€' in amount or 'montant' in amount.lower()):
                    break
            except NoSuchElementException:
                continue
        
        # Extract eligibility criteria
        eligibility = ""
        eligibility_selectors = [
            ".eligibility", ".conditions", ".criteres",
            "h3:contains('Conditions') + ul", "h3:contains('Éligibilité') + ul",
            ".aide-conditions", "[class*='eligib']"
        ]
        
        for selector in eligibility_selectors:
            try:
                eligibility_element = driver.find_element(By.CSS_SELECTOR, selector)
                eligibility = eligibility_element.text.strip()
                if eligibility:
                    break
            except NoSuchElementException:
                continue
        
        # Extract deadlines
        deadline = ""
        deadline_selectors = [
            ".deadline", ".date-limite", ".limite-depot", 
            ".date-limit", "[class*='deadline']",
            "td:contains('Limite')", "li:contains('jusqu')"
        ]
        
        for selector in deadline_selectors:
            try:
                deadline_element = driver.find_element(By.CSS_SELECTOR, selector)
                deadline = deadline_element.text.strip()
                if deadline and any(word in deadline.lower() for word in ['jusqu', 'limite', 'avant', '2025', '2026']):
                    break
            except NoSuchElementException:
                continue
        
        # Extract regions/sectors
        regions = ""
        sector = ""
        
        region_selectors = [".region", ".territoire", "[class*='region']"]
        for selector in region_selectors:
            try:
                region_element = driver.find_element(By.CSS_SELECTOR, selector)
                regions = region_element.text.strip()
                if regions:
                    break
            except NoSuchElementException:
                continue
        
        sector_selectors = [".filiere", ".secteur", "[class*='filiere']"]
        for selector in sector_selectors:
            try:
                sector_element = driver.find_element(By.CSS_SELECTOR, selector)
                sector = sector_element.text.strip()
                if sector:
                    break
            except NoSuchElementException:
                continue
        
        # Build comprehensive subsidy data
        subsidy_data = {
            "title": title,
            "agency": "FranceAgriMer",
            "link": url,
            "description": description[:2000] if description else "Description en cours d'extraction...",
            "country": "france",
            "amount": amount if amount else "Not specified",
            "eligibility": eligibility[:1000] if eligibility else "",
            "deadline": deadline if deadline else "",
            "regions": regions if regions else "All regions",
            "sector": sector if sector else "",
            "source_type": "crisis_aid",
            "extracted_at": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        return subsidy_data
        
    except Exception as e:
        print(f"[Extractor] Error extracting details: {e}")
        # Return minimal data if extraction fails
        return {
            "title": title,
            "agency": "FranceAgriMer", 
            "link": url,
            "description": f"Failed to extract detailed information: {str(e)}",
            "country": "france"
        }


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

    # Updated to scrape the correct crisis aids page with individual subsidies
    base_url = "https://www.franceagrimer.fr/aides/par-programme/aides-de-crises"
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

    print(f"[Scraper] Scraping crisis aids from: {base_url}")
    
    # Find all subsidy links on the crisis aids page
    subsidy_links = driver.find_elements(By.CSS_SELECTOR, "div.bloc-aide h3 a, .aide-item a")
    
    if not subsidy_links:
        # Fallback selectors for different page structures
        subsidy_links = driver.find_elements(By.CSS_SELECTOR, "a[href*='/aides/']")
    
    print(f"[Scraper] Found {len(subsidy_links)} subsidy links to process")
    
    # Limit to max_pages worth of subsidies (5 subsidies per "page")
    max_subsidies = max_pages * 5
    subsidies_to_process = subsidy_links[:max_subsidies]
    
    for idx, link_el in enumerate(subsidies_to_process):
        try:
            title = link_el.text.strip()
            link = link_el.get_attribute("href")
            
            if not title or not link:
                continue
                
            print(f"[Scraper] Processing subsidy {idx+1}/{len(subsidies_to_process)}: {title}")

            # Open subsidy detail page
            driver.execute_script("window.open(arguments[0]);", link)
            driver.switch_to.window(driver.window_handles[1])
            time.sleep(2)

            # Extract comprehensive subsidy information
            subsidy_data = extract_subsidy_details(driver, title, link)
            
            if subsidy_data:
                results.append(subsidy_data)
                print(f"[Scraper] ✅ Successfully extracted: {title}")
            else:
                print(f"[Scraper] ⚠️ Failed to extract details for: {title}")

            driver.close()
            driver.switch_to.window(driver.window_handles[0])
            
        except Exception as exc:  # pragma: no cover - best effort
            print(f"[Scraper] ❌ Error processing subsidy {idx+1}: {exc}")
            # Ensure we're back on main window
            try:
                if len(driver.window_handles) > 1:
                    driver.close()
                    driver.switch_to.window(driver.window_handles[0])
            except:
                pass

    driver.quit()

    if not dry_run:
        with open("output/franceagrimer_scraped.json", "w", encoding="utf-8") as fh:
            json.dump(results, fh, indent=2, ensure_ascii=False)
        print("[Scraper] Output saved to output/franceagrimer_scraped.json")
    else:
        print("[Scraper] Dry-run mode active. No file written.")

    return results


class FranceAgriMerScraper:
    """Thin class wrapper around :func:`run_franceagrimer_scraper`."""

    def run(self) -> List[Dict[str, str]]:
        return run_franceagrimer_scraper(dry_run=True)


if __name__ == "__main__":  # pragma: no cover
    run_franceagrimer_scraper()


class FranceAgriMerScraper:
    """Wrapper class used by the scraper factory."""

    def run(self, max_pages: int = 5, dry_run: bool = False) -> List[Dict[str, str]]:
        return run_franceagrimer_scraper(max_pages=max_pages, dry_run=dry_run)

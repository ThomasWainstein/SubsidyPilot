# scraper/runner.py
"""
Robust scraping runner with error handling and rate limiting.
"""

import time
import random
import json
import csv
import os
import argparse
from typing import List, Dict, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urljoin, urlparse
from tenacity import retry, stop_after_attempt, wait_exponential

from .core import (
    init_driver,
    ensure_folder,
    collect_links,
    click_next,
    wait_for_selector,
    detect_language,
    download_file,
    guess_canonical_field_fr,
    FIELD_KEYWORDS_FR,
    log_unmapped_label
)
from .discovery import extract_text_from_urls
from selenium.webdriver.common.by import By
from markdownify import markdownify as md


CANONICAL_FIELDS = [
    "url", "title", "description", "eligibility", "documents", "deadline",
    "amount", "program", "agency", "region", "sector", "funding_type",
    "co_financing_rate", "project_duration", "payment_terms", "application_method",
    "evaluation_criteria", "previous_acceptance_rate", "priority_groups",
    "legal_entity_type", "funding_source", "reporting_requirements",
    "compliance_requirements", "language", "technical_support", "matching_algorithm_score"
]


class ScrapingRunner:
    """
    Manages the execution of scraping tasks with rate limiting,
    error handling, and respectful crawling practices.
    """
    
    def __init__(self, base_url: str, max_workers: int = 3, delay_range: tuple = (1, 3)):
        self.base_url = base_url
        self.max_workers = max_workers
        self.delay_range = delay_range
        self.domain = urlparse(base_url).netloc
        
    def respectful_delay(self):
        """Add a random delay to be respectful to the target server."""
        delay = random.uniform(*self.delay_range)
        time.sleep(delay)
    
    def is_same_domain(self, url: str) -> bool:
        """Check if URL belongs to the same domain."""
        return urlparse(url).netloc == self.domain
    
    def process_url_batch(self, urls: List[str], processor_func) -> List[Dict]:
        """
        Process a batch of URLs with the given processor function.
        Includes error handling and rate limiting.
        """
        results = []
        
        # Filter URLs to same domain for politeness
        same_domain_urls = [url for url in urls if self.is_same_domain(url)]
        
        if len(same_domain_urls) < len(urls):
            print(f"[INFO] Filtered {len(urls) - len(same_domain_urls)} cross-domain URLs")
        
        # Process URLs with threading but controlled concurrency
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all tasks
            future_to_url = {
                executor.submit(self._safe_process_url, url, processor_func): url 
                for url in same_domain_urls
            }
            
            # Collect results as they complete
            for future in as_completed(future_to_url):
                url = future_to_url[future]
                try:
                    result = future.result()
                    if result:
                        results.append(result)
                except Exception as e:
                    print(f"[ERROR] Processing failed for {url}: {e}")
                
                # Add delay between completions to be respectful
                self.respectful_delay()
        
        return results
    
    def _safe_process_url(self, url: str, processor_func):
        """
        Safely process a single URL with error handling.
        """
        try:
            return processor_func(url)
        except Exception as e:
            print(f"[ERROR] Safe processing failed for {url}: {e}")
            return None


# Legacy functions for backward compatibility
def normalize_record(raw_record):
    """Ensure every record matches the canonical schema, filling missing fields with 'N/A'."""
    return {k: raw_record.get(k, "N/A") for k in CANONICAL_FIELDS}


def load_config(site_name):
    """Load configuration for a specific site with domain isolation validation."""
    # Import here to avoid circular imports
    try:
        from legacy_isolation import validate_legacy_function_call, isolated_config_loader
        return isolated_config_loader(site_name)
    except ImportError:
        # Fallback for non-isolated runs
        config_path = f"configs/{site_name}.json"
        if not os.path.exists(config_path):
            print(f"[ERROR] Config file not found: {config_path}")
            return {}
        
        with open(config_path, "r", encoding="utf-8") as f:
            return json.load(f)


def map_site_fields_to_canonical(raw_record, site_name):
    """Map site-specific fields to canonical field names."""
    # Helper to rename fields and their markdown counterparts
    def _rename_with_markdown(record, old, new):
        if old in record:
            record[new] = record.pop(old)
        old_md = f"{old}_markdown"
        if old_md in record:
            record[f"{new}_markdown"] = record.pop(old_md)

    # Keep existing mappings for backward compatibility
    if site_name == "afir":
        pass

    if site_name == "apia_procurements":
        _rename_with_markdown(raw_record, "attachments", "documents")

    if site_name == "franceagrimer":
        pass

    if site_name == "oportunitati_ue":
        _rename_with_markdown(raw_record, "date", "deadline")

    if site_name == "oportunitati_detail":
        _rename_with_markdown(raw_record, "call_name", "title")
        _rename_with_markdown(raw_record, "call_type", "funding_type")
        _rename_with_markdown(raw_record, "budget", "amount")
        _rename_with_markdown(raw_record, "release_date", "deadline")
        _rename_with_markdown(raw_record, "opening_date", "application_method")
        _rename_with_markdown(raw_record, "closing_date", "deadline")
        _rename_with_markdown(raw_record, "eligible_beneficiaries", "eligibility")
        _rename_with_markdown(raw_record, "programs_for_which_the_call_applies", "program")
        _rename_with_markdown(raw_record, "funding_domain", "sector")
        _rename_with_markdown(raw_record, "areas", "region")

    if site_name == "ec_horizon_detail":
        _rename_with_markdown(raw_record, "general_info", "description")
        if "topic_description" in raw_record:
            if "description" in raw_record:
                raw_record["description"] += "\n" + raw_record.pop("topic_description")
            else:
                raw_record["description"] = raw_record.pop("topic_description")
            td_md = raw_record.pop("topic_description_markdown", None)
            if td_md:
                if "description_markdown" in raw_record:
                    raw_record["description_markdown"] += "\n" + td_md
                else:
                    raw_record["description_markdown"] = td_md
        _rename_with_markdown(raw_record, "topic_updates", "reporting_requirements")
        _rename_with_markdown(raw_record, "conditions_documents", "documents")
        _rename_with_markdown(raw_record, "budget_overview", "amount")
        _rename_with_markdown(raw_record, "partner_search", "technical_support")
        _rename_with_markdown(raw_record, "submission_link", "application_method")

    if site_name == "idf_chambres_detail":
        # Add any specific mappings for IDF chambres
        pass

    return raw_record


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=2, min=2, max=10))
def robust_get(driver, url, screenshot_path=None):
    """Robust page loading with retry logic."""
    try:
        driver.get(url)
    except Exception as e:
        if screenshot_path:
            try:
                driver.save_screenshot(screenshot_path)
            except:
                pass
        raise


# Legacy runner functions for backward compatibility
def run_discovery(site_name, limit=6, browser=None):
    """Run discovery mode for a specific site."""
    # Validate against domain isolation
    try:
        from legacy_isolation import validate_legacy_function_call
        validate_legacy_function_call('run_discovery', site_name=site_name)
    except ImportError:
        pass  # No isolation active
    
    config = load_config(site_name)
    if not config:
        return
        
    driver = init_driver(browser=browser)
    driver.get(config["list_page"])
    
    try:
        wait_for_selector(driver, config["link_selector"], timeout=10)
    except Exception:
        print(f"[WARN] Timeout on list_page. Falling back to sleep(5).")
        time.sleep(5)
        
    urls = []
    while len(urls) < limit:
        page_links = collect_links(driver, config["link_selector"])
        for url in page_links:
            if url not in urls:
                urls.append(url)
                if len(urls) >= limit:
                    break
        if len(urls) < limit and config.get("next_page_selector"):
            if not click_next(driver, config["next_page_selector"]):
                break
        else:
            break
            
    driver.quit()
    extract_text_from_urls(urls, browser=browser)


def run_extract_links(site_name, browser=None):
    """Extract links from a specific site."""
    # Validate against domain isolation
    try:
        from legacy_isolation import validate_legacy_function_call
        validate_legacy_function_call('run_extract_links', site_name=site_name)
    except ImportError:
        pass  # No isolation active
    
    config = load_config(site_name)
    if not config:
        return
        
    driver = init_driver(browser=browser)
    driver.get(config["list_page"])
    
    try:
        wait_for_selector(driver, config["link_selector"], timeout=10)
    except Exception:
        print(f"[WARN] Timeout on list_page. Falling back to sleep(5).")
        time.sleep(5)
        
    links = collect_links(driver, config["link_selector"])
    driver.quit()
    
    ensure_folder("data/extracted")
    output_file = f"data/extracted/{site_name}_external_links.txt"
    with open(output_file, "w", encoding="utf-8") as f:
        for link in links:
            f.write(link + "\n")
    print(f"Extracted {len(links)} links from {site_name} and saved to {output_file}")


def run_fetch_and_extract_smart(feeder_file, browser=None, output_file=None):
    """Legacy smart extraction function."""
    # Validate against domain isolation
    try:
        from legacy_isolation import validate_legacy_function_call
        validate_legacy_function_call('run_fetch_and_extract_smart')
    except ImportError:
        pass  # No isolation active
    
    ensure_folder("data/extracted")
    ensure_folder("data/attachments")
    output_file = output_file or "data/extracted/consultant_data.csv"
    
    with open(feeder_file, "r", encoding="utf-8") as f:
        urls = [line.strip() for line in f.readlines()]
        
    driver = init_driver(browser=browser)
    extracted = []
    
    for idx, url in enumerate(urls, start=1):
        print(f"[{idx}/{len(urls)}] Processing: {url}")
        screenshot_file = f"data/extracted/error_{idx}.png"
        
        try:
            robust_get(driver, url, screenshot_path=screenshot_file)
            time.sleep(2)
        except Exception as e:
            print(f"[WARN] Could not load {url} after retries: {e}")
            with open("data/extracted/failed_urls.txt", "a", encoding="utf-8") as errf:
                errf.write(url + "\n")
            print(f"[WARN] Screenshot saved to {screenshot_file}")
            continue

        # Basic extraction logic (simplified)
        raw_record = {"url": url}
        
        # Extract title
        try:
            title_el = None
            for sel in ["h1", "h2"]:
                els = driver.find_elements(By.CSS_SELECTOR, sel)
                if els:
                    title_el = els[0]
                    break
            if title_el:
                inner_html = title_el.get_attribute("innerHTML")
                raw_record["title"] = title_el.text.strip()
                raw_record["title_markdown"] = md(inner_html).strip()
        except Exception as e:
            print(f"[WARN] Could not extract title: {e}")

        # Extract description
        try:
            desc_el = None
            p_tags = driver.find_elements(By.CSS_SELECTOR, "p")
            if p_tags:
                for p in p_tags:
                    txt = p.text.strip()
                    if len(txt) > 40:
                        desc_el = p
                        break
                if desc_el:
                    inner_html = desc_el.get_attribute("innerHTML")
                    raw_record["description"] = desc_el.text.strip()
                    raw_record["description_markdown"] = md(inner_html).strip()
        except Exception as e:
            print(f"[WARN] Could not extract description: {e}")

        # Determine config based on URL
        config_name = "afir"  # Default
        if "idf.chambres-agriculture.fr" in url:
            config_name = "idf_chambres_detail"
        elif "oportunitati-ue.gov.ro" in url:
            config_name = "oportunitati_detail"
        elif "ec.europa.eu" in url:
            config_name = "ec_horizon_detail"
        elif "franceagrimer.fr" in url:
            config_name = "franceagrimer"
        elif "apia.org.ro" in url:
            config_name = "apia_procurements"

        config = load_config(config_name)
        selectors = config.get("detail_selectors") or config.get("selectors") or {}

        # Extract additional fields based on selectors
        for field, selector in selectors.items():
            try:
                if field in ["attachments", "documents", "conditions_documents"]:
                    links = driver.find_elements(By.CSS_SELECTOR, selector)
                    doc_paths = set()
                    for link in links:
                        href = link.get_attribute("href")
                        if href and href.lower().startswith("http"):
                            local_path = download_file(href, "data/attachments")
                            if local_path:
                                doc_paths.add(local_path)
                            else:
                                doc_paths.add(href)
                    raw_record[field] = ";".join(sorted(doc_paths)) if doc_paths else "N/A"
                else:
                    try:
                        el = driver.find_element(By.CSS_SELECTOR, selector)
                        html = el.get_attribute("innerHTML")
                        value = el.text.strip()
                        raw_record[field] = value if value else "N/A"
                        raw_record[f"{field}_markdown"] = md(html).strip() if html else ""
                    except:
                        raw_record[field] = "N/A"
            except Exception as e:
                print(f"[ERROR] Failed to extract {field}: {e}")
                raw_record[field] = "N/A"

        # Map and normalize
        mapped_record = map_site_fields_to_canonical(raw_record.copy(), config_name)
        markdown_fields = {k: v for k, v in mapped_record.items() if k.endswith("_markdown")}
        normalized_record = normalize_record(mapped_record)
        normalized_record.update(markdown_fields)
        
        # Detect language
        all_text = " ".join([
            normalized_record.get("title", ""),
            normalized_record.get("description", ""),
            normalized_record.get("eligibility", ""),
        ])
        normalized_record["language"] = detect_language(all_text)
        
        extracted.append(normalized_record)
        print(f"✅ Extracted [{idx}]: {normalized_record.get('title', '')} [{normalized_record['language']}]")

    driver.quit()

    # Save results
    markdown_fieldnames = sorted({k for record in extracted for k in record.keys() if k.endswith('_markdown')})
    fieldnames = CANONICAL_FIELDS + markdown_fieldnames
    with open(output_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(extracted)
    print(f"🔥 Consultant-grade dataset saved to {output_file}")


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="AgriToolScraper Runner")
    parser.add_argument("site_or_file", help="Site config name or feeder file")
    parser.add_argument("mode", choices=["discovery", "extract_links", "fetch_and_extract_smart"], help="Scraping mode")
    parser.add_argument("--browser", default=os.environ.get("BROWSER", "chrome"), help="Browser: chrome/firefox/edge (default: chrome)")
    parser.add_argument("--output", default=None, help="Custom output file (fetch_and_extract_smart mode)")
    parser.add_argument("--limit", type=int, default=6, help="Discovery/extract_links: Max records/pages to process")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    if args.mode == "discovery":
        run_discovery(args.site_or_file, limit=args.limit, browser=args.browser)
    elif args.mode == "extract_links":
        run_extract_links(args.site_or_file, browser=args.browser)
    elif args.mode == "fetch_and_extract_smart":
        run_fetch_and_extract_smart(args.site_or_file, browser=args.browser, output_file=args.output)
    else:
        print(f"Unknown mode: {args.mode}")
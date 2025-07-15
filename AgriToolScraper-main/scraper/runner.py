import json
import sys
import csv
import time
import os
import argparse
from scraper.core import (
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

from tenacity import retry, stop_after_attempt, wait_exponential
from scraper.discovery import extract_text_from_urls
from selenium.webdriver.common.by import By

CANONICAL_FIELDS = [
    "url", "title", "description", "eligibility", "documents", "deadline",
    "amount", "program", "agency", "region", "sector", "funding_type",
    "co_financing_rate", "project_duration", "payment_terms", "application_method",
    "evaluation_criteria", "previous_acceptance_rate", "priority_groups",
    "legal_entity_type", "funding_source", "reporting_requirements",
    "compliance_requirements", "language", "technical_support", "matching_algorithm_score"
]



def normalize_record(raw_record):
    """Ensure every record matches the canonical schema, filling missing fields with 'N/A'."""
    return {k: raw_record.get(k, "N/A") for k in CANONICAL_FIELDS}

def load_config(site_name):
    with open(f"configs/{site_name}.json", "r", encoding="utf-8") as f:
        return json.load(f)

def map_site_fields_to_canonical(raw_record, site_name):
    # --- Existing site mappings (keep as needed) ---

    if site_name == "afir":
        pass

    if site_name == "apia_procurements":
        if "attachments" in raw_record:
            raw_record["documents"] = raw_record.pop("attachments")

    if site_name == "franceagrimer":
        pass

    if site_name == "oportunitati_ue":
        if "date" in raw_record:
            raw_record["deadline"] = raw_record.pop("date")

    if site_name == "oportunitati_detail":
        if "call_name" in raw_record:
            raw_record["title"] = raw_record.pop("call_name")
        if "call_type" in raw_record:
            raw_record["funding_type"] = raw_record.pop("call_type")
        if "budget" in raw_record:
            raw_record["amount"] = raw_record.pop("budget")
        if "release_date" in raw_record:
            raw_record["deadline"] = raw_record.pop("release_date")
        if "opening_date" in raw_record:
            raw_record["application_method"] = raw_record.pop("opening_date")
        if "closing_date" in raw_record:
            raw_record["deadline"] = raw_record.pop("closing_date")
        if "eligible_beneficiaries" in raw_record:
            raw_record["eligibility"] = raw_record.pop("eligible_beneficiaries")
        if "programs_for_which_the_call_applies" in raw_record:
            raw_record["program"] = raw_record.pop("programs_for_which_the_call_applies")
        if "funding_domain" in raw_record:
            raw_record["sector"] = raw_record.pop("funding_domain")
        if "areas" in raw_record:
            raw_record["region"] = raw_record.pop("areas")

    if site_name == "ec_horizon_detail":
        if "general_info" in raw_record:
            raw_record["description"] = raw_record.pop("general_info")
        if "topic_description" in raw_record:
            if "description" in raw_record:
                raw_record["description"] += "\n" + raw_record.pop("topic_description")
            else:
                raw_record["description"] = raw_record.pop("topic_description")
        if "topic_updates" in raw_record:
            raw_record["reporting_requirements"] = raw_record.pop("topic_updates")
        if "conditions_documents" in raw_record:
            raw_record["documents"] = raw_record.pop("conditions_documents")
        if "budget_overview" in raw_record:
            raw_record["amount"] = raw_record.pop("budget_overview")
        if "partner_search" in raw_record:
            raw_record["technical_support"] = raw_record.pop("partner_search")
        if "submission_link" in raw_record:
            raw_record["application_method"] = raw_record.pop("submission_link")

    # --- NEW: idf_chambres_detail mapping ---
    if site_name == "idf_chambres_detail":
        # Typical selectors: "title", "description", "eligibility", "documents", "deadline", "amount", "program", "agency", "region", "sector", "funding_type", etc.
        # Map any source-specific keys here if needed.
        # (Assume your selectors use canonical fieldnames, if not, add per-field remapping as above)
        pass

    return raw_record


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=2, min=2, max=10))
def robust_get(driver, url, screenshot_path=None):
    try:
        driver.get(url)
    except Exception as e:
        if screenshot_path:
            driver.save_screenshot(screenshot_path)
        raise

def run_discovery(site_name, limit=6, browser=None):
    config = load_config(site_name)
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
    config = load_config(site_name)
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
    from scraper.core import log_unmapped_label  # <-- Make sure this is imported!

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

        # ------- HEADER PREFERENCE LOGIC -------
        raw_record = {"url": url}
        # Title: Prefer h1, fallback to h2
        try:
            title_el = None
            for sel in ["h1", "h2"]:
                els = driver.find_elements(By.CSS_SELECTOR, sel)
                if els:
                    title_el = els[0]
                    break
            if title_el:
                raw_record["title"] = title_el.text.strip()
        except Exception as e:
            print(f"[WARN] Could not extract title header: {e}")

        # Description: First meaningful <p> after header
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
                    raw_record["description"] = desc_el.text.strip()
        except Exception as e:
            print(f"[WARN] Could not extract description: {e}")

        # Robust config_name detection (update as needed for your sources)
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
        elif "afir.info" in url:
            config_name = "afir"
        elif "oportunitati-ue" in url:
            config_name = "oportunitati_ue"
        else:
            print(f"[WARN] Unknown domain: {url}")
            continue

        print(f"DEBUG: Chosen config_name for mapping: {config_name}")
        config = load_config(config_name)
        selectors = config.get("detail_selectors") or config.get("selectors") or {}

        # --- MAIN EXTRACTION LOOP (with logging) ---
        for field, selector in selectors.items():
            if field in ["attachments", "documents", "conditions_documents"]:
                # Download all files
                try:
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
                except Exception as e:
                    print(f"[ERROR] Failed to process documents for {url}: {e}")
                    raw_record[field] = "N/A"
            else:
                try:
                    value = driver.find_element(By.CSS_SELECTOR, selector).text.strip()
                except Exception:
                    value = "N/A"
                # --- SMART AUTO-MAPPING + LOGGING ---
                if value != "N/A":
                    if field in ["title", "description"] and raw_record.get(field):
                        continue  # Don't overwrite header-extracted title/description
                    field_guess = guess_canonical_field_fr(value, FIELD_KEYWORDS_FR)
                    if field_guess and field_guess not in raw_record:
                        print(f"[DEBUG] Auto-mapped '{value[:40]}...' to '{field_guess}'")
                        raw_record[field_guess] = value
                    elif field_guess is None:
                        log_unmapped_label(value, url)
                        raw_record[field] = value
                    else:
                        raw_record[field] = value
                else:
                    raw_record[field] = value

        mapped_record = map_site_fields_to_canonical(raw_record.copy(), config_name)
        normalized_record = normalize_record(mapped_record)
        all_text = " ".join([
            normalized_record.get("title", ""),
            normalized_record.get("description", ""),
            normalized_record.get("eligibility", ""),
        ])
        normalized_record["language"] = detect_language(all_text)
        extracted.append(normalized_record)
        print(f"✅ Extracted [{idx}]: {normalized_record.get('title', '')} [{normalized_record['language']}]")

    driver.quit()
    if extracted:
        print("DEBUG output fields (first record):", extracted[0].keys())
    else:
        print("[INFO] No records extracted.")

    with open(output_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CANONICAL_FIELDS, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(extracted)
    print(f"🔥 Consultant-grade dataset saved to {output_file}")




def parse_args():
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

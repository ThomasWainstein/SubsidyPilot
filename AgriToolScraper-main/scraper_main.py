# scraper_main.py
"""
Enhanced AgriTool scraper with Supabase integration.
Combines URL collection, content extraction, and database upload.

CRITICAL: This module uses ONLY webdriver-manager for driver management.
No manual driver path handling, .wdm directory manipulation, or custom 
driver logic is permitted. All drivers are managed automatically.
"""

import os
import sys
import json
import time
import argparse
from datetime import datetime
from typing import Dict, List, Optional
from urllib.parse import urljoin, urlparse

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoSuchElementException, TimeoutException
from tqdm import tqdm

from scraper.core import (
    init_driver, ensure_folder, collect_links, wait_for_selector, 
    click_next, guess_canonical_field_fr, detect_language
)
from scraper.discovery import extract_subsidy_details
from scraper.runner import ScrapingRunner
from supabase_client import SupabaseUploader


def save_json(data, filepath):
    """Save data as JSON file."""
    ensure_folder(os.path.dirname(filepath))
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False, default=str)


def load_failed_urls():
    """Load previously failed URLs to retry."""
    failed_path = "data/extracted/failed_urls.txt"
    if not os.path.exists(failed_path):
        return []
    
    with open(failed_path, 'r', encoding='utf-8') as f:
        return [line.strip() for line in f if line.strip()]


def save_failed_url(url, error):
    """Save failed URL with error for later analysis."""
    ensure_folder("data/extracted")
    with open("data/extracted/failed_urls.txt", 'a', encoding='utf-8') as f:
        f.write(f"{url}\t{error}\n")


class AgriToolScraper:
    """Main scraper class with Supabase integration."""
    
    def __init__(self, target_url: str, dry_run: bool = False):
        self.target_url = target_url
        self.dry_run = dry_run
        self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Initialize Supabase client (unless dry run)
        self.supabase = None
        if not dry_run:
            try:
                self.supabase = SupabaseUploader()
                if not self.supabase.test_connection():
                    raise RuntimeError("Supabase connection test failed")
                print("[INFO] Supabase client initialized successfully")
            except Exception as e:
                print(f"[ERROR] Failed to initialize Supabase client: {e}")
                raise
        
        # Initialize results tracking
        self.results = {
            'session_id': self.session_id,
            'start_time': datetime.utcnow().isoformat(),
            'target_url': target_url,
            'urls_collected': 0,
            'pages_processed': 0,
            'subsidies_extracted': 0,
            'subsidies_uploaded': 0,
            'errors': [],
            'warnings': []
        }
    
    def collect_subsidy_urls(self, max_pages: int = 0) -> List[str]:
        """
        Collect all subsidy detail page URLs from the listing pages.
        Returns list of unique URLs.
        """
        print(f"[INFO] Starting URL collection from {self.target_url}")
        
        driver = None
        try:
            driver = init_driver()
            driver.get(self.target_url)
            
            # Wait for page load
            wait_for_selector(driver, "a[rel='bookmark']", timeout=15)
            
            collected_urls = set()
            page_count = 0
            
            while True:
                page_count += 1
                print(f"[INFO] Processing listing page {page_count}...")
                
                # Collect links from current page
                page_links = collect_links(driver, "a[rel='bookmark']")
                for link in page_links:
                    if link:
                        collected_urls.add(link)
                
                print(f"[INFO] Found {len(page_links)} links on page {page_count}")
                
                # Check if we should stop
                if max_pages > 0 and page_count >= max_pages:
                    print(f"[INFO] Reached max pages limit: {max_pages}")
                    break
                
                # Try to go to next page
                if not click_next(driver, 'li.pagination-next a'):
                    print("[INFO] No more pages found")
                    break
                
                # Wait for new page to load
                time.sleep(2)
                try:
                    wait_for_selector(driver, "a[rel='bookmark']", timeout=10)
                except TimeoutException:
                    print("[WARN] Timeout waiting for next page content")
                    break
            
            urls_list = list(collected_urls)
            self.results['urls_collected'] = len(urls_list)
            print(f"[INFO] Collected {len(urls_list)} unique URLs")
            
            # Save URLs for debugging
            ensure_folder("data/extracted")
            with open(f"data/extracted/urls_{self.session_id}.txt", 'w', encoding='utf-8') as f:
                for url in urls_list:
                    f.write(f"{url}\n")
            
            return urls_list
            
        except Exception as e:
            error_msg = f"URL collection failed: {e}"
            print(f"[ERROR] {error_msg}")
            self.results['errors'].append(error_msg)
            return []
        finally:
            if driver:
                driver.quit()
    
    def extract_subsidy_content(self, urls: List[str]) -> List[Dict]:
        """
        Extract structured data from subsidy detail pages.
        Returns list of subsidy dictionaries.
        """
        print(f"[INFO] Starting content extraction from {len(urls)} URLs")
        
        subsidies = []
        failed_count = 0
        
        # Use ScrapingRunner for robust extraction
        runner = ScrapingRunner(
            base_url=self.target_url,
            max_workers=3,  # Conservative for stability
            delay_range=(2, 5)  # Respectful delays
        )
        
        for i, url in enumerate(tqdm(urls, desc="Extracting subsidies")):
            try:
                # Extract subsidy details
                subsidy_data = extract_subsidy_details(url)
                
                if subsidy_data:
                    # Add metadata
                    subsidy_data['source_url'] = url
                    subsidy_data['scraped_at'] = datetime.utcnow().isoformat()
                    subsidy_data['session_id'] = self.session_id
                    
                    # Detect language if not already set
                    if 'language' not in subsidy_data and 'description' in subsidy_data:
                        detected_lang = detect_language(str(subsidy_data['description']))
                        if detected_lang != 'unknown':
                            subsidy_data['language'] = [detected_lang]
                    
                    subsidies.append(subsidy_data)
                    self.results['subsidies_extracted'] += 1
                else:
                    failed_count += 1
                    save_failed_url(url, "No data extracted")
                    
            except Exception as e:
                failed_count += 1
                error_msg = f"Extraction failed for {url}: {e}"
                print(f"[ERROR] {error_msg}")
                self.results['errors'].append(error_msg)
                save_failed_url(url, str(e))
            
            self.results['pages_processed'] += 1
            
            # Progress logging every 10 items
            if (i + 1) % 10 == 0:
                print(f"[INFO] Processed {i + 1}/{len(urls)} URLs. "
                      f"Extracted: {len(subsidies)}, Failed: {failed_count}")
        
        print(f"[INFO] Content extraction complete. "
              f"Successfully extracted: {len(subsidies)}, Failed: {failed_count}")
        
        # Save extracted data for debugging
        if subsidies:
            save_json(subsidies, f"data/extracted/subsidies_{self.session_id}.json")
        
        return subsidies
    
    def upload_to_supabase(self, subsidies: List[Dict]) -> Dict:
        """Upload subsidies to Supabase database."""
        if self.dry_run:
            print(f"[DRY RUN] Would upload {len(subsidies)} subsidies to Supabase")
            return {'inserted': 0, 'errors': [], 'dry_run': True}
        
        if not subsidies:
            print("[WARN] No subsidies to upload")
            return {'inserted': 0, 'errors': ['No data to upload']}
        
        print(f"[INFO] Uploading {len(subsidies)} subsidies to Supabase...")
        
        try:
            # Check for existing subsidies to avoid duplicates
            codes = [s.get('code', '') for s in subsidies if s.get('code')]
            existing_codes = self.supabase.check_existing_subsidies(codes)
            
            if existing_codes:
                print(f"[INFO] Found {len(existing_codes)} existing subsidies, will skip duplicates")
                subsidies = [s for s in subsidies if s.get('code', '') not in existing_codes]
                self.results['warnings'].append(f"Skipped {len(existing_codes)} duplicate subsidies")
            
            # Upload remaining subsidies
            upload_results = self.supabase.insert_subsidies(subsidies)
            
            self.results['subsidies_uploaded'] = upload_results['inserted']
            if upload_results['errors']:
                self.results['errors'].extend(upload_results['errors'])
            
            print(f"[INFO] Upload complete. Inserted: {upload_results['inserted']}")
            return upload_results
            
        except Exception as e:
            error_msg = f"Supabase upload failed: {e}"
            print(f"[ERROR] {error_msg}")
            self.results['errors'].append(error_msg)
            return {'inserted': 0, 'errors': [error_msg]}
    
    def run_full_pipeline(self, max_pages: int = 0):
        """Run the complete scraping and upload pipeline."""
        print(f"[INFO] Starting AgriTool scraper pipeline")
        print(f"[INFO] Target: {self.target_url}")
        print(f"[INFO] Max pages: {max_pages if max_pages > 0 else 'unlimited'}")
        print(f"[INFO] Dry run: {self.dry_run}")
        print(f"[INFO] Session ID: {self.session_id}")
        
        try:
            # Step 1: Collect URLs
            urls = self.collect_subsidy_urls(max_pages)
            if not urls:
                raise RuntimeError("No URLs collected")
            
            # Step 2: Extract content
            subsidies = self.extract_subsidy_content(urls)
            if not subsidies:
                raise RuntimeError("No subsidies extracted")
            
            # Step 3: Upload to Supabase
            upload_results = self.upload_to_supabase(subsidies)
            
            # Step 4: Generate summary
            self.results['end_time'] = datetime.utcnow().isoformat()
            self.results['success'] = True
            self.results['upload_results'] = upload_results
            
        except Exception as e:
            error_msg = f"Pipeline failed: {e}"
            print(f"[ERROR] {error_msg}")
            self.results['errors'].append(error_msg)
            self.results['success'] = False
            self.results['end_time'] = datetime.utcnow().isoformat()
        
        # Save final results
        ensure_folder("data/logs")
        save_json(self.results, f"data/logs/run_summary_{self.session_id}.json")
        save_json(self.results, "data/logs/run_summary.json")  # Latest run
        
        # Print summary
        self.print_summary()
        
        return self.results
    
    def print_summary(self):
        """Print a human-readable summary of the scraping run."""
        print("\n" + "="*60)
        print("SCRAPING PIPELINE SUMMARY")
        print("="*60)
        print(f"Session ID: {self.results['session_id']}")
        print(f"Target URL: {self.results['target_url']}")
        print(f"Success: {self.results.get('success', False)}")
        print(f"Dry Run: {self.dry_run}")
        print()
        print("STATISTICS:")
        print(f"  URLs collected: {self.results['urls_collected']}")
        print(f"  Pages processed: {self.results['pages_processed']}")
        print(f"  Subsidies extracted: {self.results['subsidies_extracted']}")
        print(f"  Subsidies uploaded: {self.results['subsidies_uploaded']}")
        print(f"  Errors: {len(self.results['errors'])}")
        print(f"  Warnings: {len(self.results['warnings'])}")
        
        if self.results['errors']:
            print("\nERRORS:")
            for error in self.results['errors'][:5]:  # Show first 5 errors
                print(f"  - {error}")
            if len(self.results['errors']) > 5:
                print(f"  ... and {len(self.results['errors']) - 5} more errors")
        
        if self.results['warnings']:
            print("\nWARNINGS:")
            for warning in self.results['warnings'][:3]:
                print(f"  - {warning}")
        
        print("="*60)


def main():
    """Main entry point with CLI argument parsing."""
    parser = argparse.ArgumentParser(description='AgriTool Scraper with Supabase Integration')
    parser.add_argument('--url', default='https://www.afir.info/', 
                       help='Target URL to scrape (default: AFIR)')
    parser.add_argument('--max-pages', type=int, default=0,
                       help='Maximum pages to scrape (0 = unlimited)')
    parser.add_argument('--dry-run', action='store_true',
                       help='Run scraper but do not upload to Supabase')
    parser.add_argument('--retry-failed', action='store_true',
                       help='Retry previously failed URLs')
    
    args = parser.parse_args()
    
    # Load environment variables from GitHub Actions or local .env
    target_url = os.environ.get('TARGET_URL', args.url)
    max_pages = int(os.environ.get('MAX_PAGES', args.max_pages))
    dry_run = os.environ.get('DRY_RUN', 'false').lower() == 'true' or args.dry_run
    
    # Validate required environment variables for non-dry runs
    if not dry_run:
        required_vars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY']
        missing_vars = [var for var in required_vars if not os.environ.get(var)]
        if missing_vars:
            print(f"[ERROR] Missing required environment variables: {missing_vars}")
            sys.exit(1)
    
    # Initialize and run scraper
    try:
        scraper = AgriToolScraper(target_url, dry_run)
        results = scraper.run_full_pipeline(max_pages)
        
        # Exit with appropriate code
        sys.exit(0 if results.get('success', False) else 1)
        
    except Exception as e:
        print(f"[FATAL] Scraper initialization failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

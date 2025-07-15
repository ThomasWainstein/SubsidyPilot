# scraper_main.py
"""
Enhanced AgriTool scraper with Supabase integration and ruthless debugging.
Combines URL collection, content extraction, and database upload.
"""

import sys, traceback, logging, os
logging.basicConfig(level=logging.DEBUG,
    format="%(asctime)s %(levelname)s [%(filename)s:%(lineno)d] %(message)s")
def excepthook(exc_type, exc_value, exc_traceback):
    logging.critical("Uncaught exception",
        exc_info=(exc_type, exc_value, exc_traceback))
    print("="*40 + " ENVIRONMENT " + "="*40)
    for k, v in sorted(os.environ.items()):
        print(f"{k}={v}")
    print("="*40 + " TRACEBACK END " + "="*40)
sys.excepthook = excepthook

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
from debug_diagnostics import get_ruthless_debugger, ruthless_trap, log_step, log_error, log_warning


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
    """Main scraper class with Supabase integration and ruthless debugging."""
    
    @ruthless_trap
    def __init__(self, target_url: str, dry_run: bool = False):
        self.target_url = target_url
        self.dry_run = dry_run
        self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Initialize ruthless debugger
        self.debugger = get_ruthless_debugger(self.session_id)
        log_step("Initializing AgriToolScraper", target_url=target_url, dry_run=dry_run, session_id=self.session_id)
        
        # Initialize Supabase client (unless dry run)
        self.supabase = None
        if not dry_run:
            try:
                log_step("Initializing Supabase client")
                self.supabase = SupabaseUploader()
                if not self.supabase.test_connection():
                    raise RuntimeError("Supabase connection test failed")
                log_step("Supabase client initialized successfully")
            except Exception as e:
                log_error(f"Failed to initialize Supabase client: {e}")
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
        
        log_step("AgriToolScraper initialization complete")
    
    @ruthless_trap
    def collect_subsidy_urls(self, max_pages: int = 0) -> List[str]:
        """
        Collect all subsidy detail page URLs from the listing pages with comprehensive logging.
        Returns list of unique URLs.
        """
        log_step(f"Starting URL collection from {self.target_url}", max_pages=max_pages)
        
        driver = None
        try:
            log_step("Initializing driver for URL collection")
            driver = init_driver()
            
            log_step(f"Navigating to target URL: {self.target_url}")
            driver.get(self.target_url)
            
            # Take screenshot for debugging
            try:
                screenshot_path = f"data/logs/url_collection_start_{self.session_id}.png"
                ensure_folder("data/logs")
                driver.save_screenshot(screenshot_path)
                log_step(f"Screenshot saved: {screenshot_path}")
                self.debugger.diagnostics['artifacts'].append(screenshot_path)
            except Exception as e:
                log_warning(f"Failed to save screenshot: {e}")
            
            log_step("Waiting for page load (bookmark links)")
            wait_for_selector(driver, "a[rel='bookmark']", timeout=15)
            
            collected_urls = set()
            page_count = 0
            
            while True:
                page_count += 1
                log_step(f"Processing listing page {page_count}")
                
                # Collect links from current page
                page_links = collect_links(driver, "a[rel='bookmark']")
                initial_count = len(collected_urls)
                
                for link in page_links:
                    if link:
                        collected_urls.add(link)
                
                new_links = len(collected_urls) - initial_count
                log_step(f"Found {len(page_links)} total links, {new_links} new unique links on page {page_count}")
                
                # Log sample URLs for verification
                if page_links:
                    sample_urls = page_links[:3]
                    log_step(f"Sample URLs: {sample_urls}")
                
                # Check if we should stop
                if max_pages > 0 and page_count >= max_pages:
                    log_step(f"Reached max pages limit: {max_pages}")
                    break
                
                # Try to go to next page
                log_step("Attempting to navigate to next page")
                if not click_next(driver, 'li.pagination-next a'):
                    log_step("No more pages found - pagination ended")
                    break
                
                # Wait for new page to load
                log_step("Waiting for next page to load")
                time.sleep(2)
                try:
                    wait_for_selector(driver, "a[rel='bookmark']", timeout=10)
                    log_step("Next page loaded successfully")
                except TimeoutException:
                    log_warning("Timeout waiting for next page content")
                    break
            
            urls_list = list(collected_urls)
            self.results['urls_collected'] = len(urls_list)
            log_step(f"URL collection complete: {len(urls_list)} unique URLs collected")
            
            # Save URLs for debugging
            ensure_folder("data/extracted")
            urls_file = f"data/extracted/urls_{self.session_id}.txt"
            with open(urls_file, 'w', encoding='utf-8') as f:
                for url in urls_list:
                    f.write(f"{url}\n")
            
            log_step(f"URLs saved to: {urls_file}")
            self.debugger.diagnostics['artifacts'].append(urls_file)
            
            # Take final screenshot
            try:
                final_screenshot = f"data/logs/url_collection_end_{self.session_id}.png"
                driver.save_screenshot(final_screenshot)
                log_step(f"Final screenshot saved: {final_screenshot}")
                self.debugger.diagnostics['artifacts'].append(final_screenshot)
            except Exception as e:
                log_warning(f"Failed to save final screenshot: {e}")
            
            return urls_list
            
        except Exception as e:
            error_msg = f"URL collection failed: {e}"
            log_error(error_msg)
            log_error(f"Full traceback: {traceback.format_exc()}")
            self.results['errors'].append(error_msg)
            
            # Save error screenshot
            if driver:
                try:
                    error_screenshot = f"data/logs/url_collection_error_{self.session_id}.png"
                    driver.save_screenshot(error_screenshot)
                    log_error(f"Error screenshot saved: {error_screenshot}")
                    self.debugger.diagnostics['artifacts'].append(error_screenshot)
                except Exception as screenshot_e:
                    log_error(f"Failed to save error screenshot: {screenshot_e}")
            
            return []
        finally:
            if driver:
                log_step("Quitting driver after URL collection")
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
    
    @ruthless_trap
    def run_full_pipeline(self, max_pages: int = 0):
        """Run the complete scraping and upload pipeline with comprehensive logging."""
        log_step("🚀 STARTING AGRITOOL SCRAPER PIPELINE", 
                target=self.target_url,
                max_pages=max_pages if max_pages > 0 else 'unlimited',
                dry_run=self.dry_run,
                session_id=self.session_id)
        
        pipeline_success = False
        
        try:
            # Step 1: Collect URLs
            log_step("📋 PIPELINE STEP 1: Collecting subsidy URLs")
            urls = self.collect_subsidy_urls(max_pages)
            if not urls:
                raise RuntimeError("No URLs collected - pipeline cannot continue")
            log_step(f"✅ Step 1 complete: {len(urls)} URLs collected")
            
            # Step 2: Extract content
            log_step("🔍 PIPELINE STEP 2: Extracting subsidy content")
            subsidies = self.extract_subsidy_content(urls)
            if not subsidies:
                raise RuntimeError("No subsidies extracted - pipeline cannot continue")
            log_step(f"✅ Step 2 complete: {len(subsidies)} subsidies extracted")
            
            # Step 3: Upload to Supabase
            log_step("☁️ PIPELINE STEP 3: Uploading to Supabase")
            upload_results = self.upload_to_supabase(subsidies)
            log_step(f"✅ Step 3 complete: {upload_results.get('inserted', 0)} subsidies uploaded")
            
            # Step 4: Generate summary
            log_step("📊 PIPELINE STEP 4: Generating final summary")
            self.results['end_time'] = datetime.utcnow().isoformat()
            self.results['success'] = True
            self.results['upload_results'] = upload_results
            pipeline_success = True
            log_step("✅ Pipeline completed successfully")
            
        except Exception as e:
            error_msg = f"Pipeline failed: {e}"
            log_error(error_msg)
            log_error(f"Full pipeline traceback: {traceback.format_exc()}")
            self.results['errors'].append(error_msg)
            self.results['success'] = False
            self.results['end_time'] = datetime.utcnow().isoformat()
            pipeline_success = False
        
        # Save final results with ruthless logging
        log_step("💾 Saving final results and diagnostics")
        ensure_folder("data/logs")
        
        results_file = f"data/logs/run_summary_{self.session_id}.json"
        save_json(self.results, results_file)
        save_json(self.results, "data/logs/run_summary.json")  # Latest run
        
        log_step(f"Results saved to: {results_file}")
        self.debugger.diagnostics['artifacts'].append(results_file)
        
        # Save ruthless diagnostics
        diagnostics_result = self.debugger.save_final_diagnostics(pipeline_success)
        log_step(f"Diagnostics saved: {diagnostics_result}")
        
        # Print summary
        self.print_summary()
        
        # Final status log
        status = "SUCCESS" if pipeline_success else "FAILED"
        log_step(f"🎯 FINAL PIPELINE STATUS: {status}")
        
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
    print("ARGS:", sys.argv)
    logging.info("Starting AgriTool scraper main function")
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

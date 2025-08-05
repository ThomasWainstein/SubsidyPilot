# scraper_main.py
"""
Enhanced AgriTool scraper with STRICT DOMAIN ISOLATION and Supabase integration.
Ensures zero cross-contamination between domain-specific scraper runs.
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
from utils.domain_isolation import enforce_domain_isolation, validate_scraper_isolation
from utils.run_isolation import RunIsolationManager
from config_manager import SecureConfigManager
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


def save_failed_url(url, error, session_paths=None):
    """Save failed URL with error for later analysis."""
    if session_paths and 'failed_urls_file' in session_paths:
        failed_urls_file = session_paths['failed_urls_file']
    else:
        ensure_folder("data/extracted")
        failed_urls_file = "data/extracted/failed_urls.txt"
    
    ensure_folder(os.path.dirname(failed_urls_file))
    with open(failed_urls_file, 'a', encoding='utf-8') as f:
        f.write(f"{url}\t{error}\n")


class AgriToolScraper:
    """Main scraper class with STRICT DOMAIN ISOLATION, Supabase integration and ruthless debugging."""
    
    @ruthless_trap
    def __init__(self, target_url: str, dry_run: bool = False):
        self.target_url = target_url
        self.dry_run = dry_run
        self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # CRITICAL: Validate domain isolation BEFORE any processing
        if not SecureConfigManager.validate_domain_isolation(target_url):
            raise ValueError(f"Domain isolation validation failed for: {target_url}")
        
        # Initialize secure config manager
        self.config_manager = SecureConfigManager(target_url, self.session_id)
        
        # Initialize run isolation manager  
        self.isolation_manager = RunIsolationManager(target_url, self.session_id)
        
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
        
        # Initialize results tracking with isolation info
        self.results = {
            'session_id': self.session_id,
            'start_time': datetime.utcnow().isoformat(),
            'target_url': target_url,
            'target_domain': self.isolation_manager.target_domain,
            'isolation_verified': False,
            'config_validated': False,
            'urls_collected': 0,
            'urls_filtered': 0,
            'pages_processed': 0,
            'subsidies_extracted': 0,
            'subsidies_uploaded': 0,
            'errors': [],
            'warnings': []
        }
        
        # Session-scoped file paths (set during run)
        self.session_paths = None
        
        log_step("AgriToolScraper initialization complete")
    
    @ruthless_trap
    def collect_subsidy_urls(self, max_pages: int = 0) -> List[str]:
        """
        Collect all subsidy detail page URLs using index-based pagination for FranceAgriMer.
        Returns list of unique URLs.
        """
        log_step(f"Starting URL collection from {self.target_url}", max_pages=max_pages)
        
        # Validate URL for FranceAgriMer compatibility
        if "franceagrimer.fr" in self.target_url and not "rechercher-une-aide" in self.target_url:
            raise RuntimeError(
                "ERROR: FranceAgriMer scraper only works with "
                "'https://www.franceagrimer.fr/rechercher-une-aide?page=0' as the start URL. "
                "Sector/category pages are not supported and will fail."
            )
        
        driver = None
        try:
            log_step("Initializing driver for URL collection")
            driver = init_driver()
            
            # Load first page to get total results using config list_page
            config = self.config_manager.get_config()
            list_page_template = config.get('list_page', self.target_url + "?page={page}")
            first_page_url = list_page_template.replace("{page}", "0")
            log_step(f"Navigating to first page: {first_page_url}")
            driver.get(first_page_url)
            
            # Take screenshot for debugging
            try:
                screenshot_path = f"{self.session_paths['logs_dir']}/url_collection_start.png" if self.session_paths else f"data/logs/franceagrimer_url_collection_start_{self.session_id}.png"
                ensure_folder(os.path.dirname(screenshot_path))
                driver.save_screenshot(screenshot_path)
                log_step(f"Screenshot saved: {screenshot_path}")
                self.debugger.diagnostics['artifacts'].append(screenshot_path)
            except Exception as e:
                log_warning(f"Failed to save screenshot: {e}")
            
            # Wait for results to load using config-driven selector
            log_step("Waiting for search results to load")
            config = self.config_manager.get_config()
            total_results_selector = config.get('total_results_selector', 'h2')
            # Split selector and try each one
            selectors = [s.strip() for s in total_results_selector.split(',')]
            
            # Try each selector until one works
            results_found = False
            for selector in selectors:
                try:
                    wait_for_selector(driver, selector, timeout=5)
                    results_found = True
                    log_step(f"Found results using selector: {selector}")
                    break
                except Exception as e:
                    log_step(f"Selector {selector} failed: {e}")
                    continue
            
            if not results_found:
                raise RuntimeError(f"Could not find results with any selector: {selectors}")
            
            # Parse total results from the results counter with config-driven selectors
            try:
                # Get selector from config and add DSFR fallbacks
                config = self.config_manager.get_config()
                total_results_selector = config.get('total_results_selector', 'h2')
                selectors_to_try = [
                    ".fr-container h2", 
                    "h2",
                    ".search-results-count",
                    "[data-fr-js-search-results]"
                ]
                
                results_element = None
                for selector in selectors_to_try:
                    try:
                        # Find all candidates with this selector
                        candidates = driver.find_elements(By.CSS_SELECTOR, selector)
                        # Filter by text content containing "résultat"
                        for el in candidates:
                            if "résultat" in el.text.lower():
                                results_element = el
                                break
                        if results_element:
                            break
                    except NoSuchElementException:
                        continue
                
                if results_element:
                    results_text = results_element.text
                    log_step(f"Found results text: {results_text}")
                    
                    # Extract number from text like "154 résultat(s)"
                    import re
                    match = re.search(r'(\d+)', results_text)
                    if match:
                        total_results = int(match.group(1))
                        log_step(f"Total results found: {total_results}")
                    else:
                        log_warning(f"Could not parse total results from: {results_text}")
                        total_results = 6  # Fallback to single page
                else:
                    log_warning("No results counter element found, falling back to single page")
                    total_results = 6  # Fallback to single page
            except Exception as e:
                log_warning(f"Failed to get total results: {e}")
                total_results = 6  # Fallback to single page
            
            # Calculate number of pages (6 results per page)
            results_per_page = 6
            total_pages = (total_results + results_per_page - 1) // results_per_page  # Ceiling division
            log_step(f"Calculated {total_pages} pages to process ({results_per_page} results per page)")
            
            # Apply max_pages limit if specified
            if max_pages > 0 and total_pages > max_pages:
                total_pages = max_pages
                log_step(f"Limited to {max_pages} pages due to max_pages setting")
            
            collected_urls = set()
            
            # Process each page
            for page_idx in range(total_pages):
                log_step(f"Processing page {page_idx + 1} of {total_pages}")
                
                # Construct page URL using config list_page template
                config = self.config_manager.get_config()
                list_page_template = config.get('list_page', self.target_url + "?page={page}")
                page_url = list_page_template.replace("{page}", str(page_idx))
                log_step(f"Loading page: {page_url}")
                driver.get(page_url)
                
                # Wait for subsidy cards to load using config-driven selector
                config = self.config_manager.get_config()
                link_selector = config.get('link_selector', 'h3.fr-card__title a')
                # Wait for card containers first, then specific links
                wait_for_selector(driver, ".fr-card", timeout=10)
                wait_for_selector(driver, link_selector, timeout=10)
                
                # Collect links from current page using config-driven selector
                page_links = collect_links(driver, link_selector)
                initial_count = len(collected_urls)
                
                for link in page_links:
                    if link:
                        collected_urls.add(link)
                
                new_links = len(collected_urls) - initial_count
                log_step(f"Found {len(page_links)} total links, {new_links} new unique links on page {page_idx + 1}")
                
                # Log sample URLs for verification
                if page_links:
                    sample_urls = page_links[:3]
                    log_step(f"Sample URLs: {sample_urls}")
                
                # Small delay between pages to be respectful
                if page_idx < total_pages - 1:
                    time.sleep(1)
            
            urls_list = list(collected_urls)
            
            # ENFORCE DOMAIN ISOLATION - CRITICAL FOR WORKFLOW SEPARATION
            original_count = len(urls_list)
            urls_list = enforce_domain_isolation(urls_list, self.target_url)
            filtered_count = original_count - len(urls_list)
            
            if filtered_count > 0:
                log_step(f"DOMAIN ISOLATION: Filtered out {filtered_count} cross-domain URLs")
                log_step(f"DOMAIN ISOLATION: Kept {len(urls_list)} URLs from target domain")
            
            # Validate isolation was successful
            if not validate_scraper_isolation(urls_list, self.target_url):
                raise RuntimeError("Domain isolation validation failed - cross-domain URLs detected")
            
            self.results['urls_collected'] = len(urls_list)
            self.results['urls_filtered'] = filtered_count
            log_step(f"URL collection complete: {len(urls_list)} domain-isolated URLs collected")
            
            # Save URLs for debugging using session-scoped paths
            urls_file = self.session_paths['urls_file'] if self.session_paths else f"data/extracted/urls_{self.session_id}.txt"
            ensure_folder(os.path.dirname(urls_file))
            with open(urls_file, 'w', encoding='utf-8') as f:
                for url in urls_list:
                    f.write(f"{url}\n")
            
            log_step(f"URLs saved to: {urls_file}")
            self.debugger.diagnostics['artifacts'].append(urls_file)
            
            # Take final screenshot using session-scoped path
            try:
                final_screenshot = f"{self.session_paths['logs_dir']}/url_collection_end.png" if self.session_paths else f"data/logs/franceagrimer_url_collection_end_{self.session_id}.png"
                ensure_folder(os.path.dirname(final_screenshot))
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
            
            # Save error screenshot using session-scoped path
            if driver:
                try:
                    error_screenshot = f"{self.session_paths['logs_dir']}/url_collection_error.png" if self.session_paths else f"data/logs/franceagrimer_url_collection_error_{self.session_id}.png"
                    ensure_folder(os.path.dirname(error_screenshot))
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
                    save_failed_url(url, "No data extracted", self.session_paths)
                    
            except Exception as e:
                failed_count += 1
                error_msg = f"Extraction failed for {url}: {e}"
                print(f"[ERROR] {error_msg}")
                self.results['errors'].append(error_msg)
                save_failed_url(url, str(e), self.session_paths)
            
            self.results['pages_processed'] += 1
            
            # Progress logging every 10 items
            if (i + 1) % 10 == 0:
                print(f"[INFO] Processed {i + 1}/{len(urls)} URLs. "
                      f"Extracted: {len(subsidies)}, Failed: {failed_count}")
        
        print(f"[INFO] Content extraction complete. "
              f"Successfully extracted: {len(subsidies)}, Failed: {failed_count}")
        
        # Save extracted data for debugging using session-scoped paths
        if subsidies:
            subsidies_file = self.session_paths['subsidies_file'] if self.session_paths else f"data/extracted/subsidies_{self.session_id}.json"
            save_json(subsidies, subsidies_file)
        
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
        """Run the complete scraping and upload pipeline with STRICT ISOLATION."""
        log_step("🚀 STARTING AGRITOOL SCRAPER PIPELINE WITH STRICT DOMAIN ISOLATION", 
                target=self.target_url,
                target_domain=self.isolation_manager.target_domain,
                max_pages=max_pages if max_pages > 0 else 'unlimited',
                dry_run=self.dry_run,
                session_id=self.session_id)
        
        pipeline_success = False
        
        # Use isolation manager context for complete run isolation
        with self.isolation_manager as isolation:
            self.session_paths = isolation.session_paths
            
            # Activate legacy function isolation
            from legacy_isolation import set_active_isolation, clear_active_isolation
            set_active_isolation(isolation.target_domain, self.session_id)
            
            try:
                # STEP 0: Validate complete isolation setup
                log_step("🔒 PIPELINE STEP 0: Validating domain isolation setup")
                
                # Validate config isolation
                if not isolation.validate_config_isolation():
                    raise RuntimeError("Config isolation validation failed")
                self.results['config_validated'] = True
                
                # Load and validate config
                self.config_manager.load_config()
                log_step("✅ Step 0 complete: Domain isolation validated")
                
                # Step 1: Collect URLs with isolation
                log_step("📋 PIPELINE STEP 1: Collecting domain-isolated subsidy URLs")
                urls = self.collect_subsidy_urls(max_pages)
                if not urls:
                    raise RuntimeError("No URLs collected - pipeline cannot continue")
                
                # Validate URL isolation
                if not isolation.validate_domain_isolation(urls):
                    raise RuntimeError("URL domain isolation validation failed")
                self.results['isolation_verified'] = True
                log_step(f"✅ Step 1 complete: {len(urls)} domain-isolated URLs collected")
            
                # Step 2: Extract content with domain validation
                log_step("🔍 PIPELINE STEP 2: Extracting domain-isolated subsidy content")
                subsidies = self.extract_subsidy_content(urls)
                if not subsidies:
                    raise RuntimeError("No subsidies extracted - pipeline cannot continue")
                log_step(f"✅ Step 2 complete: {len(subsidies)} subsidies extracted")
            
                # Step 3: Upload to Supabase
                log_step("☁️ PIPELINE STEP 3: Uploading to Supabase")
                upload_results = self.upload_to_supabase(subsidies)
                log_step(f"✅ Step 3 complete: {upload_results.get('inserted', 0)} subsidies uploaded")
                
                # Step 4: Validate output purity
                log_step("🔍 PIPELINE STEP 4: Validating output purity")
                output_files = [
                    self.session_paths['subsidies_file'],
                    self.session_paths['urls_file'],
                    self.session_paths['failed_urls_file']
                ]
                
                if not isolation.validate_output_purity(output_files):
                    log_error("❌ Output purity validation failed - cross-domain content detected")
                    self.results['warnings'].append("Cross-domain content detected in outputs")
                
                # Step 5: Generate final summary
                log_step("📊 PIPELINE STEP 5: Generating final summary")
                self.results['end_time'] = datetime.utcnow().isoformat()
                self.results['success'] = True
                self.results['upload_results'] = upload_results
                pipeline_success = True
                log_step("✅ Pipeline completed successfully with domain isolation verified")
                
            except Exception as e:
                error_msg = f"Pipeline failed: {e}"
                log_error(error_msg)
                log_error(f"Full pipeline traceback: {traceback.format_exc()}")
                self.results['errors'].append(error_msg)
                self.results['success'] = False
                self.results['end_time'] = datetime.utcnow().isoformat()
                pipeline_success = False
            
            finally:
                # Deactivate legacy function isolation
                clear_active_isolation()
        
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
    # Auto-load .env for local development
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass
    
    # Early validation of required environment variables
    required_vars = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
    missing_vars = [var for var in required_vars if not os.environ.get(var)]
    if missing_vars:
        print(f"ERROR: Required env vars {', '.join(missing_vars)} are missing. Exiting.")
        print("Please set the following environment variables:")
        for var in missing_vars:
            print(f"  export {var}=your_value_here")
        sys.exit(1)
    
    print("ARGS:", sys.argv)
    logging.info("Starting AgriTool scraper main function")
    parser = argparse.ArgumentParser(description='AgriTool Scraper with Supabase Integration')
    parser.add_argument('--url', default='https://www.franceagrimer.fr/rechercher-une-aide', 
                       help='Target URL to scrape (default: FranceAgriMer)')
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

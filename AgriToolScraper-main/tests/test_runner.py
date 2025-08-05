#!/usr/bin/env python3
"""
Enhanced AgriTool Scraper Runner
Comprehensive orchestration module for scraping operations, data validation, and pipeline management.
Includes both testing framework and execution capabilities.
"""

import os
import csv
import json
import time
import sys
import argparse
import logging
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass, asdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlparse

import pytest
import pandas as pd

# Import core scraping modules
from .core import (
    init_driver, RobustWebDriver, collect_links, 
    ensure_folder, FIELD_KEYWORDS_FR
)
from .discovery import extract_subsidy_details
from .multi_tab_extractor import extract_multi_tab_content


# Canonical fields for AgriTool subsidy data
CANONICAL_FIELDS = [
    "url", "title", "description", "eligibility", "documents", "deadline",
    "amount", "program", "agency", "region", "sector", "funding_type",
    "co_financing_rate", "project_duration", "payment_terms", "application_method",
    "evaluation_criteria", "previous_acceptance_rate", "priority_groups",
    "legal_entity_type", "funding_source", "reporting_requirements",
    "compliance_requirements", "language", "technical_support", "matching_algorithm_score"
]

# Required fields that must have meaningful content
REQUIRED_FIELDS = ["url", "title", "description"]

# Optional fields that can be N/A
OPTIONAL_FIELDS = [field for field in CANONICAL_FIELDS if field not in REQUIRED_FIELDS]


@dataclass
class ScrapingConfig:
    """Configuration for scraping operations."""
    max_pages: int = 10
    max_workers: int = 3
    delay_between_requests: float = 1.0
    output_dir: str = "data/extracted"
    browser: str = "chrome"
    headless: bool = True
    use_multi_tab: bool = True
    save_raw_data: bool = True
    validate_output: bool = True
    retry_failed: bool = True
    max_retries: int = 2


@dataclass
class ScrapingResults:
    """Results from a scraping operation."""
    total_attempted: int
    successful_extractions: int
    failed_extractions: int
    output_file: Optional[str]
    execution_time: float
    errors: List[str]
    warnings: List[str]
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate percentage."""
        if self.total_attempted == 0:
            return 0.0
        return (self.successful_extractions / self.total_attempted) * 100


class AgriToolRunner:
    """Main orchestration class for AgriTool scraping operations."""
    
    def __init__(self, config: ScrapingConfig = None):
        """Initialize the runner with configuration."""
        self.config = config or ScrapingConfig()
        self.logger = self._setup_logging()
        self.ensure_directories()
        
    def _setup_logging(self) -> logging.Logger:
        """Set up comprehensive logging."""
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_file = log_dir / f"runner_{timestamp}.log"
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file, encoding='utf-8'),
                logging.StreamHandler(sys.stdout)
            ]
        )
        
        logger = logging.getLogger(__name__)
        logger.info(f"🚀 AgriTool Runner initialized. Config: {asdict(self.config)}")
        return logger
    
    def ensure_directories(self):
        """Ensure all required directories exist."""
        directories = [
            self.config.output_dir,
            "logs",
            "data/raw_pages",
            "data/debug"
        ]
        
        for directory in directories:
            ensure_folder(directory)
            self.logger.debug(f"📁 Directory ensured: {directory}")

    def discover_subsidy_urls(self, base_url: str = "https://www.franceagrimer.fr/aides") -> List[str]:
        """
        Discover all subsidy URLs from FranceAgriMer.
        
        Args:
            base_url: Starting URL for discovery
            
        Returns:
            List of discovered subsidy URLs
        """
        self.logger.info(f"🔍 Starting URL discovery from: {base_url}")
        
        discovered_urls = []
        
        try:
            with RobustWebDriver(
                browser=self.config.browser,
                headless=self.config.headless
            ) as driver_wrapper:
                
                driver = driver_wrapper.driver
                
                # Load the main aids page
                if not driver_wrapper.robust_get(base_url):
                    raise Exception(f"Failed to load base URL: {base_url}")
                
                # Try multiple selectors for subsidy links
                link_selectors = [
                    'a[href*="/aides/"]',
                    'a[href*="/dispositif/"]',
                    'a[href*="/mesure/"]',
                    '.aide-item a, .subsidy-link, .measure-link'
                ]
                
                for selector in link_selectors:
                    try:
                        urls = collect_links(driver, selector, save_debug=False)
                        if urls:
                            discovered_urls.extend(urls)
                            self.logger.info(f"✅ Found {len(urls)} URLs with selector: {selector}")
                            break
                    except Exception as e:
                        self.logger.warning(f"⚠️ Selector failed: {selector} - {e}")
                        continue
                
                # Handle pagination if present
                page_count = 1
                while page_count < self.config.max_pages:
                    try:
                        if not self._handle_pagination(driver):
                            break
                        
                        page_count += 1
                        time.sleep(self.config.delay_between_requests)
                        
                        # Collect links from this page
                        for selector in link_selectors:
                            try:
                                page_urls = collect_links(driver, selector, save_debug=False)
                                if page_urls:
                                    discovered_urls.extend(page_urls)
                                    break
                            except Exception:
                                continue
                                
                    except Exception as e:
                        self.logger.warning(f"⚠️ Pagination failed on page {page_count}: {e}")
                        break
        
        except Exception as e:
            self.logger.error(f"❌ URL discovery failed: {e}")
            raise
        
        # Remove duplicates and filter valid URLs
        unique_urls = list(set(discovered_urls))
        filtered_urls = [url for url in unique_urls if self._is_valid_subsidy_url(url)]
        
        self.logger.info(f"🎯 Discovery complete: {len(filtered_urls)} unique subsidy URLs found")
        return filtered_urls
    
    def _handle_pagination(self, driver) -> bool:
        """Handle pagination to get more subsidy URLs."""
        pagination_selectors = [
            '.pagination .next:not(.disabled)',
            '.fr-pagination__link--next:not([disabled])',
            'a[aria-label="Page suivante"]',
            '.next-page:not(.disabled)'
        ]
        
        for selector in pagination_selectors:
            try:
                next_button = driver.find_element("css selector", selector)
                if next_button.is_enabled() and next_button.is_displayed():
                    next_button.click()
                    time.sleep(2)
                    return True
            except Exception:
                continue
        
        return False
    
    def _is_valid_subsidy_url(self, url: str) -> bool:
        """Validate that a URL is likely a subsidy detail page."""
        if not url or not url.startswith(('http://', 'https://')):
            return False
        
        # Check for subsidy-related path patterns
        parsed = urlparse(url)
        path = parsed.path.lower()
        
        subsidy_indicators = [
            '/aides/', '/dispositif/', '/mesure/', '/subvention/', 
            '/financement/', '/programme/', '/appel'
        ]
        
        return any(indicator in path for indicator in subsidy_indicators)

    def scrape_subsidies(self, urls: List[str] = None, 
                        discover_urls: bool = True) -> ScrapingResults:
        """
        Main scraping orchestration method.
        
        Args:
            urls: Optional list of URLs to scrape. If None, discovers URLs.
            discover_urls: Whether to discover URLs automatically
            
        Returns:
            ScrapingResults with comprehensive metrics
        """
        start_time = time.time()
        
        # Discover URLs if not provided
        if urls is None and discover_urls:
            urls = self.discover_subsidy_urls()
        elif urls is None:
            raise ValueError("Either provide URLs or enable discover_urls")
        
        self.logger.info(f"🚀 Starting scraping operation for {len(urls)} URLs")
        
        # Initialize tracking
        results = []
        errors = []
        warnings = []
        
        # Scrape URLs with optional parallel processing
        if self.config.max_workers > 1:
            results, errors, warnings = self._scrape_parallel(urls)
        else:
            results, errors, warnings = self._scrape_sequential(urls)
        
        # Process and save results
        output_file = None
        if results:
            output_file = self._save_results(results)
            
            if self.config.validate_output:
                validation_results = self._validate_results(output_file)
                if validation_results['issues']:
                    warnings.extend(validation_results['issues'])
        
        # Calculate metrics
        execution_time = time.time() - start_time
        successful_count = len([r for r in results if r.get('success', False)])
        failed_count = len(urls) - successful_count
        
        scraping_results = ScrapingResults(
            total_attempted=len(urls),
            successful_extractions=successful_count,
            failed_extractions=failed_count,
            output_file=output_file,
            execution_time=execution_time,
            errors=errors,
            warnings=warnings
        )
        
        self._log_final_results(scraping_results)
        return scraping_results
    
    def _scrape_sequential(self, urls: List[str]) -> Tuple[List[Dict], List[str], List[str]]:
        """Scrape URLs sequentially for debugging or single-threaded environments."""
        results = []
        errors = []
        warnings = []
        
        for i, url in enumerate(urls, 1):
            self.logger.info(f"📄 Processing {i}/{len(urls)}: {url}")
            
            try:
                # Extract subsidy details
                extracted_data = extract_subsidy_details(
                    url, 
                    use_multi_tab=self.config.use_multi_tab
                )
                
                if extracted_data:
                    # Normalize data to canonical format
                    normalized_data = self._normalize_to_canonical(extracted_data)
                    results.append(normalized_data)
                    self.logger.info(f"✅ Successfully extracted: {url}")
                else:
                    errors.append(f"No data extracted from {url}")
                    self.logger.warning(f"⚠️ No data extracted: {url}")
                
                # Rate limiting
                if i < len(urls):  # Don't delay after last URL
                    time.sleep(self.config.delay_between_requests)
                    
            except Exception as e:
                error_msg = f"Extraction failed for {url}: {str(e)}"
                errors.append(error_msg)
                self.logger.error(f"❌ {error_msg}")
                
                # Retry logic
                if self.config.retry_failed:
                    retry_result = self._retry_extraction(url)
                    if retry_result:
                        results.append(retry_result)
                        self.logger.info(f"✅ Retry successful: {url}")
        
        return results, errors, warnings
    
    def _scrape_parallel(self, urls: List[str]) -> Tuple[List[Dict], List[str], List[str]]:
        """Scrape URLs in parallel for better performance."""
        results = []
        errors = []
        warnings = []
        
        self.logger.info(f"🔄 Using parallel processing with {self.config.max_workers} workers")
        
        with ThreadPoolExecutor(max_workers=self.config.max_workers) as executor:
            # Submit all extraction tasks
            future_to_url = {
                executor.submit(self._extract_single_url, url): url 
                for url in urls
            }
            
            # Process completed tasks
            for future in as_completed(future_to_url):
                url = future_to_url[future]
                
                try:
                    result = future.result()
                    if result:
                        results.append(result)
                        self.logger.info(f"✅ Parallel extraction successful: {url}")
                    else:
                        errors.append(f"No data extracted from {url}")
                        
                except Exception as e:
                    error_msg = f"Parallel extraction failed for {url}: {str(e)}"
                    errors.append(error_msg)
                    self.logger.error(f"❌ {error_msg}")
        
        return results, errors, warnings
    
    def _extract_single_url(self, url: str) -> Optional[Dict[str, Any]]:
        """Extract data from a single URL (thread-safe)."""
        try:
            extracted_data = extract_subsidy_details(
                url, 
                use_multi_tab=self.config.use_multi_tab
            )
            
            if extracted_data:
                return self._normalize_to_canonical(extracted_data)
            
        except Exception as e:
            self.logger.error(f"Single URL extraction failed for {url}: {e}")
        
        return None
    
    def _retry_extraction(self, url: str) -> Optional[Dict[str, Any]]:
        """Retry extraction for failed URLs."""
        for attempt in range(self.config.max_retries):
            try:
                self.logger.info(f"🔄 Retry attempt {attempt + 1} for: {url}")
                time.sleep(2 ** attempt)  # Exponential backoff
                
                extracted_data = extract_subsidy_details(url, use_multi_tab=False)  # Try without multi-tab
                if extracted_data:
                    return self._normalize_to_canonical(extracted_data)
                    
            except Exception as e:
                self.logger.warning(f"⚠️ Retry {attempt + 1} failed for {url}: {e}")
        
        return None
    
    def _normalize_to_canonical(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize extracted data to canonical field format."""
        normalized = {}
        
        # Initialize all canonical fields with default values
        for field in CANONICAL_FIELDS:
            normalized[field] = "N/A"
        
        # Map extracted data to canonical fields
        field_mapping = {
            'url': ['url', 'source_url'],
            'title': ['title'],
            'description': ['description', 'summary'],
            'eligibility': ['eligibility', 'pour_qui'],
            'documents': ['documents', 'attachments'],
            'deadline': ['deadline', 'date_limit'],
            'amount': ['amount', 'amount_max', 'funding_amount'],
            'program': ['program', 'programme'],
            'agency': ['agency', 'organisme'],
            'region': ['region', 'regions'],
            'sector': ['sector', 'secteur'],
            'language': ['language', 'langue']
        }
        
        for canonical_field, possible_keys in field_mapping.items():
            for key in possible_keys:
                if key in data and data[key] is not None:
                    value = data[key]
                    
                    # Handle different value types
                    if isinstance(value, list):
                        normalized[canonical_field] = ', '.join(str(v) for v in value) if value else "N/A"
                    elif isinstance(value, dict):
                        normalized[canonical_field] = json.dumps(value, ensure_ascii=False)
                    else:
                        normalized[canonical_field] = str(value) if value else "N/A"
                    break
        
        # Add metadata
        normalized['extraction_timestamp'] = time.time()
        normalized['extraction_method'] = data.get('extraction_metadata', {}).get('method_used', 'unknown')
        
        return normalized
    
    def _save_results(self, results: List[Dict[str, Any]]) -> str:
        """Save extraction results to CSV file."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = os.path.join(self.config.output_dir, f"consultant_data_{timestamp}.csv")
        
        try:
            df = pd.DataFrame(results)
            
            # Ensure all canonical fields are present
            for field in CANONICAL_FIELDS:
                if field not in df.columns:
                    df[field] = "N/A"
            
            # Reorder columns to canonical order
            df = df[CANONICAL_FIELDS + [col for col in df.columns if col not in CANONICAL_FIELDS]]
            
            # Save to CSV
            df.to_csv(output_file, index=False, encoding='utf-8')
            
            # Also save a copy as the expected filename for tests
            standard_output = os.path.join(self.config.output_dir, "consultant_data.csv")
            df.to_csv(standard_output, index=False, encoding='utf-8')
            
            self.logger.info(f"💾 Results saved to: {output_file}")
            self.logger.info(f"💾 Standard output saved to: {standard_output}")
            
            # Save raw JSON for debugging
            if self.config.save_raw_data:
                json_file = output_file.replace('.csv', '_raw.json')
                with open(json_file, 'w', encoding='utf-8') as f:
                    json.dump(results, f, indent=2, ensure_ascii=False)
                self.logger.info(f"💾 Raw data saved to: {json_file}")
            
            return output_file
            
        except Exception as e:
            self.logger.error(f"❌ Failed to save results: {e}")
            raise
    
    def _validate_results(self, output_file: str) -> Dict[str, Any]:
        """Validate extraction results for quality and completeness."""
        validation_results = {
            'total_rows': 0,
            'valid_rows': 0,
            'issues': [],
            'field_completeness': {},
            'quality_score': 0.0
        }
        
        try:
            df = pd.read_csv(output_file, encoding='utf-8')
            validation_results['total_rows'] = len(df)
            
            # Check field completeness
            for field in CANONICAL_FIELDS:
                if field in df.columns:
                    non_na_count = len(df[df[field] != "N/A"])
                    completeness = (non_na_count / len(df)) * 100 if len(df) > 0 else 0
                    validation_results['field_completeness'][field] = completeness
                    
                    # Flag low completeness for required fields
                    if field in REQUIRED_FIELDS and completeness < 80:
                        validation_results['issues'].append(
                            f"Low completeness for required field '{field}': {completeness:.1f}%"
                        )
            
            # Check for completely empty rows
            empty_rows = 0
            for _, row in df.iterrows():
                if all(row[field] == "N/A" for field in REQUIRED_FIELDS):
                    empty_rows += 1
            
            if empty_rows > 0:
                validation_results['issues'].append(f"{empty_rows} rows have no required data")
            
            validation_results['valid_rows'] = len(df) - empty_rows
            
            # Calculate overall quality score
            required_completeness = sum(
                validation_results['field_completeness'].get(field, 0) 
                for field in REQUIRED_FIELDS
            ) / len(REQUIRED_FIELDS)
            
            optional_completeness = sum(
                validation_results['field_completeness'].get(field, 0) 
                for field in OPTIONAL_FIELDS
            ) / len(OPTIONAL_FIELDS)
            
            validation_results['quality_score'] = (required_completeness * 0.7 + optional_completeness * 0.3)
            
            self.logger.info(f"📊 Validation complete: {validation_results['quality_score']:.1f}% quality score")
            
        except Exception as e:
            validation_results['issues'].append(f"Validation failed: {str(e)}")
            self.logger.error(f"❌ Validation error: {e}")
        
        return validation_results
    
    def _log_final_results(self, results: ScrapingResults):
        """Log comprehensive final results."""
        self.logger.info("=" * 60)
        self.logger.info("🎯 SCRAPING OPERATION COMPLETE")
        self.logger.info("=" * 60)
        self.logger.info(f"📊 Total URLs attempted: {results.total_attempted}")
        self.logger.info(f"✅ Successful extractions: {results.successful_extractions}")
        self.logger.info(f"❌ Failed extractions: {results.failed_extractions}")
        self.logger.info(f"📈 Success rate: {results.success_rate:.1f}%")
        self.logger.info(f"⏱️ Total execution time: {results.execution_time:.1f} seconds")
        
        if results.output_file:
            self.logger.info(f"💾 Output saved to: {results.output_file}")
        
        if results.errors:
            self.logger.warning(f"⚠️ {len(results.errors)} errors occurred")
            for error in results.errors[:5]:  # Show first 5 errors
                self.logger.warning(f"   - {error}")
        
        if results.warnings:
            self.logger.warning(f"⚠️ {len(results.warnings)} warnings")


# Test functions for data validation

def test_consultant_data_csv_exists():
    """Test that the consultant_data.csv file exists."""
    csv_path = os.path.join(os.path.dirname(__file__), "..", "data", "extracted", "consultant_data.csv")
    assert os.path.exists(csv_path), \
        f"consultant_data.csv was not found at {csv_path}. Run a scrape first!"


def test_consultant_data_csv_fields():
    """Test that the CSV has all required canonical fields."""
    csv_path = os.path.join(os.path.dirname(__file__), "..", "data", "extracted", "consultant_data.csv")
    
    with open(csv_path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        header = reader.fieldnames
        
        # Analyze field coverage
        missing_fields = [f for f in CANONICAL_FIELDS if f not in header]
        extra_fields = [f for f in header if f not in CANONICAL_FIELDS]
        
        print("\n" + "=" * 50)
        print("CSV HEADER ANALYSIS")
        print("=" * 50)
        print(f"📋 Header fields ({len(header)}): {header}")
        print(f"❌ Missing canonical fields ({len(missing_fields)}): {missing_fields}")
        print(f"➕ Extra (non-canonical) fields ({len(extra_fields)}): {extra_fields}")
        
        # Analyze data rows
        rows = list(reader)
        print(f"📊 Total rows: {len(rows)}")
        
        if rows:
            # Show sample data
            print("\n📄 First row sample:")
            for field in CANONICAL_FIELDS[:10]:  # Show first 10 fields
                value = rows[0].get(field, 'MISSING')
                print(f"   {field}: {value}")
            
            # Analyze data quality
            empty_rows = sum(1 for row in rows if all(row.get(field, '') == 'N/A' for field in REQUIRED_FIELDS))
            print(f"📊 Empty rows (no required data): {empty_rows}")
            
            # Field completeness
            print("\n📈 Field completeness:")
            for field in REQUIRED_FIELDS:
                if field in header:
                    non_empty = sum(1 for row in rows if row.get(field, 'N/A') != 'N/A')
                    completeness = (non_empty / len(rows)) * 100
                    print(f"   {field}: {completeness:.1f}%")
        else:
            print("📋 CSV is empty!")
        
        print("=" * 50)
        
        # Assertions for test validation
        assert set(CANONICAL_FIELDS).issubset(set(header)), \
            f"Missing canonical fields: {missing_fields}"
        
        # Allow extra fields but warn about them
        if extra_fields:
            print(f"\n⚠️ WARNING: Extra fields found: {extra_fields}")
        
        # Skip if no data
        if len(rows) == 0:
            pytest.skip("CSV file is empty—no records to check.")
        
        # Validate row completeness
        for i, row in enumerate(rows):
            for field in CANONICAL_FIELDS:
                assert field in row, f"Missing field {field} in row {i+1}"
        
        # Warn about completely empty rows
        empty_rows = [i for i, row in enumerate(rows) if all(row[field] == "N/A" for field in REQUIRED_FIELDS)]
        if empty_rows:
            print(f"\n⚠️ WARNING: {len(empty_rows)} rows have no required data")


def test_data_quality():
    """Test data quality metrics for extracted subsidies."""
    csv_path = os.path.join(os.path.dirname(__file__), "..", "data", "extracted", "consultant_data.csv")
    
    if not os.path.exists(csv_path):
        pytest.skip("consultant_data.csv not found")
    
    df = pd.read_csv(csv_path, encoding='utf-8')
    
    # Test required field completeness
    for field in REQUIRED_FIELDS:
        if field in df.columns:
            non_empty_count = len(df[df[field] != "N/A"])
            completeness_rate = (non_empty_count / len(df)) * 100
            
            assert completeness_rate >= 50, \
                f"Required field '{field}' completeness too low: {completeness_rate:.1f}%"
    
    # Test URL validity
    if 'url' in df.columns:
        invalid_urls = df[~df['url'].str.startswith(('http://', 'https://'))]['url'].tolist()
        assert len(invalid_urls) == 0, f"Invalid URLs found: {invalid_urls[:5]}"
    
    print(f"✅ Data quality tests passed for {len(df)} records")


# Command-line interface

def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(description="AgriTool Scraper Runner")
    parser.add_argument('--mode', choices=['scrape', 'test', 'discover'], default='scrape',
                       help='Operation mode')
    parser.add_argument('--urls', nargs='+', help='Specific URLs to scrape')
    parser.add_argument('--max-pages', type=int, default=10, help='Maximum pages to discover')
    parser.add_argument('--max-workers', type=int, default=3, help='Maximum parallel workers')
    parser.add_argument('--browser', choices=['chrome', 'firefox', 'edge'], default='chrome')
    parser.add_argument('--headless', action='store_true', help='Run in headless mode')
    parser.add_argument('--output-dir', default='data/extracted', help='Output directory')
    parser.add_argument('--no-multi-tab', action='store_true', help='Disable multi-tab extraction')
    
    args = parser.parse_args()
    
    # Create configuration
    config = ScrapingConfig(
        max_pages=args.max_pages,
        max_workers=args.max_workers,
        output_dir=args.output_dir,
        browser=args.browser,
        headless=args.headless,
        use_multi_tab=not args.no_multi_tab
    )
    
    # Initialize runner
    runner = AgriToolRunner(config)
    
    try:
        if args.mode == 'discover':
            # Just discover URLs
            urls = runner.discover_subsidy_urls()
            print(f"🔍 Discovered {len(urls)} subsidy URLs:")
            for i, url in enumerate(urls[:20], 1):  # Show first 20
                print(f"  {i}. {url}")
            if len(urls) > 20:
                print(f"  ... and {len(urls) - 20} more")
                
        elif args.mode == 'scrape':
            # Full scraping operation
            urls = args.urls if args.urls else None
            results = runner.scrape_subsidies(urls=urls, discover_urls=urls is None)
            
            if results.success_rate >= 50:
                print(f"✅ Scraping completed successfully! Success rate: {results.success_rate:.1f}%")
                sys.exit(0)
            else:
                print(f"⚠️ Scraping completed with issues. Success rate: {results.success_rate:.1f}%")
                sys.exit(1)
                
        elif args.mode == 'test':
            # Run validation tests
            print("🧪 Running data validation tests...")
            pytest.main([__file__ + "::test_consultant_data_csv_exists", "-v"])
            pytest.main([__file__ + "::test_consultant_data_csv_fields", "-v"])
            pytest.main([__file__ + "::test_data_quality", "-v"])
            
    except KeyboardInterrupt:
        print("\n⚠️ Operation cancelled by user")
        sys.exit(1)
    except Exception as e:
        runner.logger.error(f"❌ Operation failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

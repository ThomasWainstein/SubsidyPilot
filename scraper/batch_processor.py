#!/usr/bin/env python3
"""
AgriTool Batch Processor - Multi-URL scraping with intelligent pagination
Handles bulk scraping operations with robust error handling and retry logic
"""

import os
import sys
import time
import json
import logging
import threading
from typing import Dict, Any, List, Optional, Iterator
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urljoin, urlparse
import random

from .core import RobustWebDriver, ScrapingLogger


class BatchScrapeConfig:
    """Configuration for batch scraping operations"""
    
    def __init__(self):
        # Default site configurations
        self.site_configs = {
            'franceagrimer': {
                'base_url': 'https://www.franceagrimer.fr',
                'list_page': '/aides',
                'detail_selectors': [
                    'a[href*="/aides/"]',
                    '.aide-card a',
                    '.subsidy-link'
                ],
                'pagination_selector': '.pagination a',
                'max_pages': 50
            },
            'chambres_agriculture': {
                'base_url': 'https://www.chambres-agriculture.fr',
                'list_page': '/actualites/toutes-les-actualites/',
                'detail_selectors': [
                    'a[href*="/actualites/"]',
                    '.actualite-card a'
                ],
                'pagination_selector': '.pager a',
                'max_pages': 30
            }
        }
        
        # Scraping parameters
        self.max_workers = 3
        self.delay_range = (1, 3)
        self.max_retries = 3
        self.timeout = 30


class URLDiscovery:
    """Intelligent URL discovery with pagination support"""
    
    def __init__(self, config: BatchScrapeConfig):
        self.config = config
        self.logger = ScrapingLogger().get_logger()
    
    def discover_urls(self, site_name: str, max_urls: int = 50, max_pages: int = 10) -> List[str]:
        """Discover URLs from a site's listing pages"""
        if site_name not in self.config.site_configs:
            self.logger.error(f"❌ Unknown site: {site_name}")
            return []
        
        site_config = self.config.site_configs[site_name]
        discovered_urls = set()
        
        try:
            with RobustWebDriver() as driver:
                # Start from the main listing page
                base_url = site_config['base_url']
                list_url = urljoin(base_url, site_config['list_page'])
                
                self.logger.info(f"🔍 Discovering URLs from: {list_url}")
                
                for page_num in range(max_pages):
                    if len(discovered_urls) >= max_urls:
                        break
                    
                    # Navigate to listing page
                    page_url = self._build_page_url(list_url, page_num)
                    self.logger.info(f"📄 Processing page {page_num + 1}: {page_url}")
                    
                    if not driver.robust_get(page_url):
                        self.logger.warning(f"⚠️ Failed to load page: {page_url}")
                        continue
                    
                    # Extract detail page URLs
                    page_urls = self._extract_detail_urls(driver, site_config)
                    discovered_urls.update(page_urls)
                    
                    self.logger.info(f"📊 Found {len(page_urls)} URLs on page {page_num + 1}")
                    
                    # Check if we should continue pagination
                    if not self._has_next_page(driver, site_config):
                        self.logger.info("🏁 No more pages found")
                        break
                    
                    # Respectful delay
                    time.sleep(random.uniform(*self.config.delay_range))
                
                result_urls = list(discovered_urls)[:max_urls]
                self.logger.info(f"✅ Discovery complete: {len(result_urls)} URLs found")
                return result_urls
                
        except Exception as e:
            self.logger.error(f"❌ URL discovery failed: {e}")
            return []
    
    def _build_page_url(self, base_url: str, page_num: int) -> str:
        """Build paginated URL"""
        if page_num == 0:
            return base_url
        
        # Common pagination patterns
        if '?' in base_url:
            return f"{base_url}&page={page_num + 1}"
        else:
            return f"{base_url}?page={page_num + 1}"
    
    def _extract_detail_urls(self, driver: RobustWebDriver, site_config: Dict) -> List[str]:
        """Extract detail page URLs from listing page"""
        urls = []
        base_url = site_config['base_url']
        
        for selector in site_config['detail_selectors']:
            try:
                elements = driver.driver.find_elements('css selector', selector)
                
                for element in elements:
                    href = element.get_attribute('href')
                    if href:
                        full_url = urljoin(base_url, href)
                        urls.append(full_url)
                        
            except Exception as e:
                self.logger.warning(f"⚠️ Selector error ({selector}): {e}")
        
        # Remove duplicates and filter valid URLs
        unique_urls = list(set(urls))
        valid_urls = [url for url in unique_urls if self._is_valid_detail_url(url)]
        
        return valid_urls
    
    def _has_next_page(self, driver: RobustWebDriver, site_config: Dict) -> bool:
        """Check if pagination has next page"""
        try:
            pagination_selector = site_config.get('pagination_selector')
            if not pagination_selector:
                return False
            
            next_links = driver.driver.find_elements('css selector', pagination_selector)
            
            for link in next_links:
                text = link.text.lower()
                if 'next' in text or 'suivant' in text or '>' in text:
                    return True
            
            return False
            
        except:
            return False
    
    def _is_valid_detail_url(self, url: str) -> bool:
        """Validate if URL is a valid detail page"""
        try:
            parsed = urlparse(url)
            path = parsed.path.lower()
            
            # Basic validation
            if not parsed.scheme or not parsed.netloc:
                return False
            
            # Exclude common non-detail pages
            excluded_patterns = [
                '/search', '/recherche', '/contact', '/mentions-legales',
                '/plan-du-site', '/sitemap', '/cookie', '/privacy'
            ]
            
            for pattern in excluded_patterns:
                if pattern in path:
                    return False
            
            return True
            
        except:
            return False


class BatchProcessor:
    """Main batch processing engine with parallel execution"""
    
    def __init__(self, config: BatchScrapeConfig = None):
        self.config = config or BatchScrapeConfig()
        self.logger = ScrapingLogger().get_logger()
        self.discovery = URLDiscovery(self.config)
        
        # Processing statistics
        self.stats = {
            'total_urls': 0,
            'successful': 0,
            'failed': 0,
            'start_time': None,
            'end_time': None,
            'errors': []
        }
    
    def process_site(self, site_name: str, max_urls: int = 50, max_pages: int = 10, 
                    output_dir: str = "data") -> Dict[str, Any]:
        """Process an entire site with URL discovery and extraction"""
        
        self.logger.info(f"🚀 Starting batch processing for site: {site_name}")
        self.stats['start_time'] = time.time()
        
        # Discover URLs
        urls = self.discovery.discover_urls(site_name, max_urls, max_pages)
        
        if not urls:
            self.logger.error(f"❌ No URLs discovered for site: {site_name}")
            return self._finalize_stats()
        
        # Process URLs in batches
        return self.process_urls(urls, output_dir, site_name)
    
    def process_urls(self, urls: List[str], output_dir: str = "data", 
                    site_name: str = "unknown") -> Dict[str, Any]:
        """Process a list of URLs with parallel execution"""
        
        self.stats['total_urls'] = len(urls)
        self.logger.info(f"📋 Processing {len(urls)} URLs with {self.config.max_workers} workers")
        
        # Create output directory
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)
        
        # Process URLs in parallel
        with ThreadPoolExecutor(max_workers=self.config.max_workers) as executor:
            # Submit all tasks
            future_to_url = {
                executor.submit(self._process_single_url, url, output_path, site_name): url 
                for url in urls
            }
            
            # Process completed tasks
            for future in as_completed(future_to_url):
                url = future_to_url[future]
                
                try:
                    result = future.result()
                    
                    if result['success']:
                        self.stats['successful'] += 1
                        self.logger.info(f"✅ Processed: {url}")
                    else:
                        self.stats['failed'] += 1
                        self.stats['errors'].append({
                            'url': url,
                            'error': result.get('error', 'Unknown error')
                        })
                        self.logger.error(f"❌ Failed: {url}")
                        
                except Exception as e:
                    self.stats['failed'] += 1
                    self.stats['errors'].append({'url': url, 'error': str(e)})
                    self.logger.error(f"❌ Exception processing {url}: {e}")
                
                # Respectful delay between requests
                time.sleep(random.uniform(*self.config.delay_range))
        
        return self._finalize_stats()
    
    def _process_single_url(self, url: str, output_path: Path, site_name: str) -> Dict[str, Any]:
        """Process a single URL with retry logic"""
        
        for attempt in range(self.config.max_retries):
            try:
                with RobustWebDriver(timeout=self.config.timeout) as driver:
                    result = driver.extract_full_content(url)
                    
                    if result['success']:
                        # Save to file
                        timestamp = int(time.time())
                        filename = f"{site_name}_{timestamp}_{hash(url) % 10000}.json"
                        output_file = output_path / filename
                        
                        with open(output_file, 'w', encoding='utf-8') as f:
                            json.dump(result, f, indent=2, ensure_ascii=False)
                        
                        result['output_file'] = str(output_file)
                        return result
                    
            except Exception as e:
                self.logger.warning(f"⚠️ Attempt {attempt + 1} failed for {url}: {e}")
                
                if attempt < self.config.max_retries - 1:
                    # Exponential backoff
                    delay = (2 ** attempt) + random.uniform(0.5, 1.5)
                    time.sleep(delay)
                else:
                    return {'url': url, 'success': False, 'error': str(e)}
        
        return {'url': url, 'success': False, 'error': 'Max retries exceeded'}
    
    def _finalize_stats(self) -> Dict[str, Any]:
        """Finalize processing statistics"""
        self.stats['end_time'] = time.time()
        self.stats['duration'] = self.stats['end_time'] - self.stats['start_time']
        self.stats['success_rate'] = (
            self.stats['successful'] / self.stats['total_urls'] * 100 
            if self.stats['total_urls'] > 0 else 0
        )
        
        # Log summary
        self.logger.info("🏁 Batch processing completed")
        self.logger.info(f"📊 Statistics:")
        self.logger.info(f"   Total URLs: {self.stats['total_urls']}")
        self.logger.info(f"   Successful: {self.stats['successful']}")
        self.logger.info(f"   Failed: {self.stats['failed']}")
        self.logger.info(f"   Success Rate: {self.stats['success_rate']:.1f}%")
        self.logger.info(f"   Duration: {self.stats['duration']:.1f} seconds")
        
        return self.stats


def main():
    """CLI entry point for batch processing"""
    import argparse
    
    parser = argparse.ArgumentParser(description="AgriTool Batch Scraper")
    parser.add_argument('--site', required=True, help='Site to scrape (franceagrimer, etc.)')
    parser.add_argument('--max-urls', type=int, default=50, help='Maximum URLs to process')
    parser.add_argument('--max-pages', type=int, default=10, help='Maximum pages to scan')
    parser.add_argument('--output-dir', default='data', help='Output directory')
    parser.add_argument('--workers', type=int, default=3, help='Number of parallel workers')
    
    args = parser.parse_args()
    
    # Configure processor
    config = BatchScrapeConfig()
    config.max_workers = args.workers
    
    processor = BatchProcessor(config)
    stats = processor.process_site(
        site_name=args.site,
        max_urls=args.max_urls,
        max_pages=args.max_pages,
        output_dir=args.output_dir
    )
    
    # Exit with appropriate code
    exit_code = 0 if stats['success_rate'] > 80 else 1
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
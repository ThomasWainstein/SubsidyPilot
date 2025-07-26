"""Pagination and URL collection functionality for different agricultural funding sites."""

import time
import logging
from typing import List, Dict, Any
from urllib.parse import urljoin, urlparse
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


class SitePaginator:
    """Handles pagination and URL collection for different agricultural funding sites."""
    
    def __init__(self, driver: webdriver.Chrome, site_config: Dict[str, Any]):
        self.driver = driver
        self.config = site_config
        self.collected_urls = set()
    
    def collect_all_detail_urls(self, start_page: int = 0, end_page: int = 50, max_pages: int = None, max_urls: int = None) -> List[str]:
        """Collect all detail URLs from paginated listing pages.
        
        Args:
            start_page: Starting page number (default: 0)
            end_page: Ending page number, or -1 for "scrape all pages" (default: 50)
            max_pages: Maximum number of pages to scrape (default: None, no limit)
            max_urls: Maximum number of URLs to collect (default: None, no limit)
        """
        # Handle "scrape all pages" mode
        if end_page == -1:
            end_page = 9999  # Large number for unlimited pagination
            logger.info(f"Starting URL collection from page {start_page} - scraping ALL pages until empty")
        else:
            logger.info(f"Starting URL collection from page {start_page} to {end_page}")
        
        # Apply max_pages limit if specified
        if max_pages is not None and max_pages > 0:
            effective_end_page = start_page + max_pages - 1
            if end_page == 9999 or effective_end_page < end_page:
                end_page = effective_end_page
                logger.info(f"Limited to {max_pages} pages due to max_pages setting (end_page: {end_page})")
        
        pages_processed = 0
        
        for page_num in range(start_page, end_page + 1):
            try:
                urls = self._collect_urls_from_page(page_num)
                if not urls:
                    logger.info(f"No URLs found on page {page_num}, stopping pagination")
                    break
                
                # Check for empty results message
                if self._has_empty_results_message():
                    logger.info(f"Empty results message detected on page {page_num}, stopping pagination")
                    break
                    
                logger.info(f"Page {page_num}: collected {len(urls)} URLs")
                self.collected_urls.update(urls)
                pages_processed += 1
                
                # Check max_urls limit
                if max_urls is not None and len(self.collected_urls) >= max_urls:
                    logger.info(f"Reached max_urls limit ({max_urls}), stopping pagination")
                    # Trim to exact limit
                    collected_list = list(self.collected_urls)
                    self.collected_urls = set(collected_list[:max_urls])
                    break
                
                # Add delay between pages
                time.sleep(1)
                
            except Exception as e:
                logger.error(f"Error on page {page_num}: {e}")
                continue
        
        final_count = len(self.collected_urls)
        logger.info(f"Pagination complete: {pages_processed} pages processed, {final_count} unique URLs collected")
        
        if max_urls is not None and final_count > max_urls:
            # Final safety trim
            collected_list = list(self.collected_urls)
            self.collected_urls = set(collected_list[:max_urls])
            logger.info(f"Trimmed to max_urls limit: {max_urls} URLs")
        
        return list(self.collected_urls)
    
    def _collect_urls_from_page(self, page_num: int) -> List[str]:
        """Collect URLs from a single listing page."""
        list_url = self.config['list_page_pattern'].format(page=page_num)
        logger.debug(f"Loading page: {list_url}")
        
        try:
            self.driver.get(list_url)
            
            # Wait for results to load
            self._wait_for_results()
            
            # Extract detail URLs
            return self._extract_detail_urls()
            
        except TimeoutException:
            logger.warning(f"Timeout waiting for results on page {page_num}")
            return []
        except Exception as e:
            logger.error(f"Error loading page {page_num}: {e}")
            return []
    
    def _wait_for_results(self, timeout: int = 20):
        """Wait for search results to appear on the page."""
        wait_selector = self.config.get('wait_selector', '.fr-card')
        
        try:
            WebDriverWait(self.driver, timeout).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, wait_selector))
            )
            logger.debug(f"Results loaded, found elements matching: {wait_selector}")
        except TimeoutException:
            # Try fallback selector
            fallback_selector = self.config.get('fallback_wait_selector')
            if fallback_selector:
                WebDriverWait(self.driver, 5).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, fallback_selector))
                )
                logger.debug(f"Results loaded with fallback selector: {fallback_selector}")
            else:
                raise
    
    def _extract_detail_urls(self) -> List[str]:
        """Extract all detail URLs from the current page."""
        link_selector = self.config['link_selector']
        base_url = self.config['base_url']
        
        # Get page source and parse with BeautifulSoup
        soup = BeautifulSoup(self.driver.page_source, 'html.parser')
        
        urls = []
        for link in soup.select(link_selector):
            href = link.get('href')
            if href:
                # Convert relative URLs to absolute
                full_url = urljoin(base_url, href)
                # Filter out anchor links and invalid URLs
                if self._is_valid_detail_url(full_url):
                    urls.append(full_url)
        
        return list(set(urls))  # Remove duplicates
    
    def _is_valid_detail_url(self, url: str) -> bool:
        """Check if URL is a valid detail page URL."""
        if not url or url.startswith('#'):
            return False
        
        # Parse URL
        parsed = urlparse(url)
        if not parsed.netloc:
            return False
        
        # Check against exclusion patterns
        exclude_patterns = self.config.get('exclude_url_patterns', [])
        for pattern in exclude_patterns:
            if pattern in url.lower():
                return False
        
        return True
    
    def _has_empty_results_message(self) -> bool:
        """Check if the current page has an empty results message."""
        try:
            # Get page source and parse with BeautifulSoup
            soup = BeautifulSoup(self.driver.page_source, 'html.parser')
            
            # Check for common empty results messages
            empty_messages = [
                "Votre recherche n'a retourné aucun résultat",
                "No results found",
                "Aucun résultat",
                "0 résultat"
            ]
            
            page_text = soup.get_text().lower()
            for message in empty_messages:
                if message.lower() in page_text:
                    return True
            
            # Check if there are no result cards/links
            link_selector = self.config['link_selector']
            results = soup.select(link_selector)
            return len(results) == 0
            
        except Exception as e:
            logger.warning(f"Error checking for empty results: {e}")
            return False


# Site-specific configurations
SITE_CONFIGS = {
    'franceagrimer': {
        'base_url': 'https://www.franceagrimer.fr',
        'list_page_pattern': 'https://www.franceagrimer.fr/rechercher-une-aide?page={page}',
        'link_selector': 'h3.fr-card__title a, .fr-card h3 a',
        'wait_selector': 'div#search-results article.fr-card h3.fr-card__title',
        'fallback_wait_selector': '.fr-card',
        'exclude_url_patterns': ['javascript:', 'mailto:', '#', '/rechercher-une-aide']
    },
    'idf_chambres': {
        'base_url': 'https://idf.chambres-agriculture.fr',
        'list_page_pattern': 'https://idf.chambres-agriculture.fr/etre-accompagne/je-suis-agriculteur/aides-a-lagriculture/page-{page}',
        'link_selector': '.part-right h2 a, .content-item h3 a',
        'wait_selector': '.part-right h2 a',
        'fallback_wait_selector': '.content-item',
        'exclude_url_patterns': ['javascript:', 'mailto:', '#']
    }
}


def get_site_paginator(driver: webdriver.Chrome, site_name: str) -> SitePaginator:
    """Factory function to create site-specific paginator."""
    if site_name not in SITE_CONFIGS:
        raise ValueError(f"Unknown site: {site_name}. Available sites: {list(SITE_CONFIGS.keys())}")
    
    config = SITE_CONFIGS[site_name]
    return SitePaginator(driver, config)
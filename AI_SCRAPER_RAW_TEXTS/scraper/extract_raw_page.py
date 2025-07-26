"""Raw page content extraction and attachment downloading."""

import os
import json
import uuid
import hashlib
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException

logger = logging.getLogger(__name__)


class RawPageExtractor:
    """Extracts raw content and attachments from detail pages."""
    
    def __init__(self, driver: webdriver.Chrome, output_dir: str = "data"):
        self.driver = driver
        self.output_dir = output_dir
        self.raw_pages_dir = os.path.join(output_dir, "raw_pages")
        self.attachments_dir = os.path.join(output_dir, "attachments")
        self._ensure_directories()
    
    def _ensure_directories(self):
        """Create output directories if they don't exist."""
        os.makedirs(self.raw_pages_dir, exist_ok=True)
        os.makedirs(self.attachments_dir, exist_ok=True)
    
    def extract_page(self, url: str, site_name: str) -> Dict[str, Any]:
        """Extract raw content and attachments from a single detail page."""
        logger.info(f"Extracting page: {url}")
        
        try:
            # Load the page
            self.driver.get(url)
            
            # Wait for page to load
            WebDriverWait(self.driver, 15).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            
            # Handle cookie consent and overlays
            self._handle_overlays()
            
            # Get raw HTML
            raw_html = self.driver.page_source
            
            # Clean and extract visible text
            cleaned_html, visible_text = self._extract_visible_content(raw_html)
            
            # Download attachments
            attachment_paths = self._download_attachments(url, cleaned_html)
            
            # Create unique identifier for this page
            page_id = self._generate_page_id(url)
            
            # Prepare result data
            result = {
                "page_id": page_id,
                "source_url": url,
                "source_site": site_name,
                "scrape_date": datetime.now().isoformat(),
                "raw_html": cleaned_html,
                "raw_text": visible_text,
                "attachment_paths": attachment_paths,
                "attachment_count": len(attachment_paths)
            }
            
            # Save to file
            output_file = self._save_raw_data(page_id, result)
            logger.info(f"Saved page data to: {output_file}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error extracting page {url}: {e}")
            return {
                "source_url": url,
                "source_site": site_name,
                "scrape_date": datetime.now().isoformat(),
                "error": str(e),
                "raw_html": "",
                "raw_text": "",
                "attachment_paths": [],
                "attachment_count": 0
            }
    
    def _handle_overlays(self):
        """Handle cookie consent dialogs and other overlays."""
        try:
            # Common cookie consent selectors
            cookie_selectors = [
                '#onetrust-accept-btn-handler',
                '.onetrust-close-btn-handler',
                '#tarteaucitronAllowed',
                '.tarteaucitron-allow',
                'button[data-testid="consent-accept"]',
                '.cookie-consent-accept',
                '[aria-label*="Accept"]',
                'button:contains("Accepter")',
                'button:contains("Accept")'
            ]
            
            for selector in cookie_selectors:
                try:
                    if ':contains(' in selector:
                        # Handle text-based selectors with JavaScript
                        script = f"""
                        var elements = Array.from(document.querySelectorAll('button'));
                        var target = elements.find(el => el.textContent.includes('Accept') || el.textContent.includes('Accepter'));
                        if (target) target.click();
                        """
                        self.driver.execute_script(script)
                    else:
                        element = self.driver.find_element(By.CSS_SELECTOR, selector)
                        if element.is_displayed():
                            element.click()
                            logger.debug(f"Clicked overlay element: {selector}")
                            break
                except:
                    continue
                    
        except Exception as e:
            logger.debug(f"No overlays to handle or error handling overlays: {e}")
    
    def _extract_visible_content(self, html: str) -> tuple[str, str]:
        """Extract main visible content, removing navigation and layout elements."""
        soup = BeautifulSoup(html, 'html.parser')
        
        # Remove unwanted elements
        unwanted_selectors = [
            'header', 'footer', 'nav', 'aside',
            '.header', '.footer', '.nav', '.sidebar',
            '.cookie-banner', '.cookie-consent',
            '.breadcrumb', '.navigation',
            'script', 'style', 'noscript',
            '.fr-header', '.fr-footer', '.fr-nav',
            '#onetrust-consent-sdk'
        ]
        
        for selector in unwanted_selectors:
            for element in soup.select(selector):
                element.decompose()
        
        # Get cleaned HTML
        cleaned_html = str(soup)
        
        # Extract visible text
        visible_text = soup.get_text(separator=' ', strip=True)
        
        # Clean up excessive whitespace
        visible_text = ' '.join(visible_text.split())
        
        return cleaned_html, visible_text
    
    def _download_attachments(self, base_url: str, html: str) -> List[str]:
        """Download all document attachments from the page."""
        soup = BeautifulSoup(html, 'html.parser')
        attachment_paths = []
        
        # File extensions to download
        document_extensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.rtf', '.odt', '.ods']
        
        # Find all links
        for link in soup.find_all('a', href=True):
            href = link['href']
            
            # Check if it's a document link
            if any(href.lower().endswith(ext) for ext in document_extensions):
                # Convert to absolute URL
                file_url = urljoin(base_url, href)
                
                # Download the file
                local_path = self._download_file(file_url, base_url)
                if local_path:
                    attachment_paths.append(local_path)
        
        logger.info(f"Downloaded {len(attachment_paths)} attachments")
        return attachment_paths
    
    def _download_file(self, url: str, base_url: str) -> Optional[str]:
        """Download a single file and return the local path."""
        try:
            # Create subdirectory for this site's attachments
            site_domain = urlparse(base_url).netloc.replace('.', '_')
            site_attachments_dir = os.path.join(self.attachments_dir, site_domain)
            os.makedirs(site_attachments_dir, exist_ok=True)
            
            # Get filename from URL
            filename = os.path.basename(urlparse(url).path)
            if not filename or '.' not in filename:
                # Generate filename from URL hash if original is invalid
                url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
                filename = f"attachment_{url_hash}.pdf"
            
            local_path = os.path.join(site_attachments_dir, filename)
            
            # Download with requests
            response = requests.get(url, stream=True, timeout=30)
            response.raise_for_status()
            
            with open(local_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            logger.debug(f"Downloaded: {filename}")
            return local_path
            
        except Exception as e:
            logger.warning(f"Failed to download {url}: {e}")
            return None
    
    def _generate_page_id(self, url: str) -> str:
        """Generate a unique but consistent ID for a page URL."""
        # Use URL hash for consistent IDs
        url_hash = hashlib.md5(url.encode()).hexdigest()
        return f"page_{url_hash[:12]}"
    
    def _save_raw_data(self, page_id: str, data: Dict[str, Any]) -> str:
        """Save extracted data to JSON file."""
        output_file = os.path.join(self.raw_pages_dir, f"{page_id}.json")
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        return output_file


def extract_single_page(url: str, site_name: str, output_dir: str = "data") -> Dict[str, Any]:
    """Convenience function to extract a single page without managing driver lifecycle."""
    from .utils import create_driver
    
    driver = None
    try:
        driver = create_driver()
        extractor = RawPageExtractor(driver, output_dir)
        return extractor.extract_page(url, site_name)
    finally:
        if driver:
            driver.quit()
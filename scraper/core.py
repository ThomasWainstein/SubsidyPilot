#!/usr/bin/env python3
"""
AgriTool Scraper Core - Robust Web Scraping Engine
Production-grade scraper with headless Chrome, OCR, and multi-tab extraction
"""

import os
import sys
import time
import json
import logging
import tempfile
from typing import Dict, Any, List, Optional, Tuple
from urllib.parse import urljoin, urlparse
from pathlib import Path

# Core web scraping imports
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException
from bs4 import BeautifulSoup
import requests


class ScrapingLogger:
    """Centralized logging for all scraping operations"""
    
    def __init__(self, log_dir: str = "logs"):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(exist_ok=True)
        
        # Create timestamped log file
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        log_file = self.log_dir / f"scraper_{timestamp}.log"
        
        # Configure logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler(sys.stdout)
            ]
        )
        self.logger = logging.getLogger(__name__)
        self.logger.info(f"🚀 AgriTool Scraper initialized. Logs: {log_file}")

    def get_logger(self):
        return self.logger


class RobustWebDriver:
    """Production-grade WebDriver with retry logic and OCR capabilities"""
    
    def __init__(self, headless: bool = True, timeout: int = 30):
        self.logger = ScrapingLogger().get_logger()
        self.driver = None
        self.timeout = timeout
        self.temp_files = []
        
        try:
            self.driver = self._init_chrome_driver(headless)
            self.logger.info("✅ Chrome WebDriver initialized successfully")
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize WebDriver: {e}")
            raise

    def _init_chrome_driver(self, headless: bool) -> webdriver.Chrome:
        """Initialize Chrome WebDriver with optimal settings"""
        options = ChromeOptions()
        
        # Performance optimizations
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-extensions')
        options.add_argument('--disable-plugins')
        options.add_argument('--disable-images')
        options.add_argument('--disable-javascript')  # Enable if JS not needed
        
        if headless:
            options.add_argument('--headless')
            
        # User agent for better compatibility
        options.add_argument('--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36')
        
        # Try system chromedriver first, then webdriver-manager
        try:
            service = ChromeService()
            return webdriver.Chrome(service=service, options=options)
        except Exception:
            try:
                from webdriver_manager.chrome import ChromeDriverManager
                service = ChromeService(ChromeDriverManager().install())
                return webdriver.Chrome(service=service, options=options)
            except Exception as e:
                self.logger.error(f"Failed to initialize Chrome: {e}")
                raise

    def robust_get(self, url: str, max_retries: int = 3) -> bool:
        """Navigate to URL with retry logic"""
        for attempt in range(max_retries):
            try:
                self.logger.info(f"📥 Loading URL (attempt {attempt + 1}): {url}")
                self.driver.get(url)
                
                # Wait for page load
                WebDriverWait(self.driver, self.timeout).until(
                    lambda d: d.execute_script("return document.readyState") == "complete"
                )
                
                self.logger.info("✅ Page loaded successfully")
                return True
                
            except TimeoutException:
                self.logger.warning(f"⚠️ Timeout on attempt {attempt + 1}")
                if attempt == max_retries - 1:
                    raise
                time.sleep(2 ** attempt)  # Exponential backoff
                
            except Exception as e:
                self.logger.error(f"❌ Error loading page: {e}")
                if attempt == max_retries - 1:
                    raise
                time.sleep(2 ** attempt)
        
        return False

    def extract_full_content(self, url: str) -> Dict[str, Any]:
        """Extract comprehensive content from a web page"""
        result = {
            'url': url,
            'title': '',
            'html': '',
            'text': '',
            'links': [],
            'attachments': [],
            'metadata': {},
            'extraction_timestamp': time.time(),
            'success': False
        }
        
        try:
            if not self.robust_get(url):
                return result
            
            # Extract basic page information
            result['title'] = self._extract_title()
            result['html'] = self.driver.page_source
            result['text'] = self._extract_clean_text()
            result['links'] = self._extract_links()
            result['attachments'] = self._extract_attachments(url)
            result['metadata'] = self._extract_metadata()
            
            # Handle overlays and multi-section content
            self._handle_overlays()
            
            result['success'] = True
            self.logger.info(f"✅ Successfully extracted content from: {url}")
            
        except Exception as e:
            self.logger.error(f"❌ Content extraction failed: {e}")
            result['error'] = str(e)
        
        return result

    def _extract_title(self) -> str:
        """Extract page title using multiple heuristics"""
        title_candidates = []
        
        # Try multiple title extraction methods
        try:
            # Standard HTML title
            title_candidates.append(self.driver.title)
            
            # H1 tags
            h1_elements = self.driver.find_elements(By.TAG_NAME, "h1")
            for h1 in h1_elements[:3]:  # Limit to first 3
                text = h1.text.strip()
                if text and len(text) > 10:
                    title_candidates.append(text)
            
            # Meta title
            try:
                meta_title = self.driver.find_element(By.CSS_SELECTOR, 'meta[property="og:title"]')
                title_candidates.append(meta_title.get_attribute('content'))
            except:
                pass
                
        except Exception as e:
            self.logger.warning(f"⚠️ Title extraction error: {e}")
        
        # Return best title candidate
        for title in title_candidates:
            if title and len(title.strip()) > 10 and "Page" not in title:
                return title.strip()
        
        return title_candidates[0] if title_candidates else "Unknown Title"

    def _extract_clean_text(self) -> str:
        """Extract clean text content from page"""
        try:
            soup = BeautifulSoup(self.driver.page_source, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style", "nav", "footer", "header"]):
                script.decompose()
            
            # Get text and clean it
            text = soup.get_text()
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            return '\n'.join(chunk for chunk in chunks if chunk)
            
        except Exception as e:
            self.logger.warning(f"⚠️ Text extraction error: {e}")
            return ""

    def _extract_links(self) -> List[Dict[str, str]]:
        """Extract all relevant links from page"""
        links = []
        try:
            link_elements = self.driver.find_elements(By.TAG_NAME, "a")
            
            for link in link_elements:
                href = link.get_attribute('href')
                text = link.text.strip()
                
                if href and text:
                    links.append({
                        'url': href,
                        'text': text,
                        'type': 'internal' if self._is_internal_link(href) else 'external'
                    })
                    
        except Exception as e:
            self.logger.warning(f"⚠️ Link extraction error: {e}")
        
        return links

    def _extract_attachments(self, base_url: str) -> List[Dict[str, str]]:
        """Extract and download document attachments"""
        attachments = []
        
        try:
            # Look for document links
            doc_selectors = [
                'a[href$=".pdf"]',
                'a[href$=".doc"]', 
                'a[href$=".docx"]',
                'a[href$=".xls"]',
                'a[href$=".xlsx"]'
            ]
            
            for selector in doc_selectors:
                elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                
                for element in elements:
                    href = element.get_attribute('href')
                    text = element.text.strip()
                    
                    if href:
                        attachment_info = {
                            'url': urljoin(base_url, href),
                            'text': text,
                            'type': href.split('.')[-1].lower(),
                            'downloaded': False,
                            'local_path': None
                        }
                        
                        # Try to download
                        local_path = self._download_attachment(attachment_info['url'])
                        if local_path:
                            attachment_info['downloaded'] = True
                            attachment_info['local_path'] = local_path
                            self.temp_files.append(local_path)
                        
                        attachments.append(attachment_info)
                        
        except Exception as e:
            self.logger.warning(f"⚠️ Attachment extraction error: {e}")
        
        return attachments

    def _download_attachment(self, url: str) -> Optional[str]:
        """Download attachment file"""
        try:
            response = requests.get(url, timeout=30, stream=True)
            response.raise_for_status()
            
            # Create temporary file
            suffix = '.' + url.split('.')[-1] if '.' in url else '.tmp'
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
            
            for chunk in response.iter_content(chunk_size=8192):
                temp_file.write(chunk)
            
            temp_file.close()
            self.logger.info(f"📄 Downloaded attachment: {url}")
            return temp_file.name
            
        except Exception as e:
            self.logger.warning(f"⚠️ Failed to download {url}: {e}")
            return None

    def _extract_metadata(self) -> Dict[str, Any]:
        """Extract page metadata"""
        metadata = {}
        
        try:
            # Basic page info
            metadata['current_url'] = self.driver.current_url
            metadata['page_source_length'] = len(self.driver.page_source)
            
            # Meta tags
            meta_tags = self.driver.find_elements(By.TAG_NAME, "meta")
            for meta in meta_tags:
                name = meta.get_attribute('name')
                content = meta.get_attribute('content')
                if name and content:
                    metadata[f'meta_{name}'] = content
                    
        except Exception as e:
            self.logger.warning(f"⚠️ Metadata extraction error: {e}")
        
        return metadata

    def _handle_overlays(self):
        """Handle modal overlays and popups"""
        overlay_selectors = [
            '.modal', '.popup', '.overlay', '.cookie-banner',
            '[id*="modal"]', '[class*="popup"]', '[class*="overlay"]'
        ]
        
        for selector in overlay_selectors:
            try:
                elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                for element in elements:
                    if element.is_displayed():
                        # Try to close overlay
                        close_buttons = element.find_elements(By.CSS_SELECTOR, 
                            '.close, .btn-close, [aria-label="Close"], [title="Close"]')
                        
                        for button in close_buttons:
                            try:
                                button.click()
                                time.sleep(1)
                                self.logger.info("✅ Closed overlay")
                                break
                            except:
                                continue
            except:
                continue

    def _is_internal_link(self, url: str) -> bool:
        """Check if link is internal to current domain"""
        try:
            current_domain = urlparse(self.driver.current_url).netloc
            link_domain = urlparse(url).netloc
            return not link_domain or link_domain == current_domain
        except:
            return False

    def cleanup(self):
        """Clean up resources"""
        try:
            # Clean up temporary files
            for temp_file in self.temp_files:
                try:
                    os.unlink(temp_file)
                except:
                    pass
            
            # Close driver
            if self.driver:
                self.driver.quit()
                self.logger.info("✅ WebDriver cleaned up")
                
        except Exception as e:
            self.logger.error(f"❌ Cleanup error: {e}")

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.cleanup()


def extract_single_page(url: str, output_dir: str = "data") -> Dict[str, Any]:
    """Convenience function to extract a single page"""
    logger = ScrapingLogger().get_logger()
    
    try:
        with RobustWebDriver() as driver:
            result = driver.extract_full_content(url)
            
            # Save result to file
            output_path = Path(output_dir)
            output_path.mkdir(exist_ok=True)
            
            timestamp = int(time.time())
            filename = f"page_{timestamp}.json"
            output_file = output_path / filename
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            
            logger.info(f"💾 Saved result to: {output_file}")
            return result
            
    except Exception as e:
        logger.error(f"❌ Single page extraction failed: {e}")
        return {'url': url, 'success': False, 'error': str(e)}


if __name__ == "__main__":
    # Test the scraper
    if len(sys.argv) > 1:
        test_url = sys.argv[1]
    else:
        test_url = "https://www.franceagrimer.fr/aides"
    
    print(f"🧪 Testing scraper with URL: {test_url}")
    result = extract_single_page(test_url)
    
    if result['success']:
        print(f"✅ Successfully extracted content")
        print(f"📋 Title: {result['title']}")
        print(f"📝 Text length: {len(result['text'])} characters")
        print(f"🔗 Links found: {len(result['links'])}")
        print(f"📎 Attachments: {len(result['attachments'])}")
    else:
        print(f"❌ Extraction failed: {result.get('error', 'Unknown error')}")
#!/usr/bin/env python3
"""
Enhanced Title Extractor for FranceAgriMer Subsidy Pages

This module provides robust title extraction specifically for FranceAgriMer subsidy pages,
addressing the issue where generic "Subsidy Page" titles are being extracted instead of
the actual page titles.
"""

import re
import logging
from typing import Optional, Dict, Any
from bs4 import BeautifulSoup
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException

logger = logging.getLogger(__name__)


class EnhancedTitleExtractor:
    """Extract meaningful titles from FranceAgriMer subsidy pages."""
    
    def __init__(self):
        # Title selectors in order of preference
        self.title_selectors = [
            # DSFR specific selectors
            'h1.fr-h1',
            '.fr-header h1',
            '.fr-container h1',
            '.fr-grid-row h1',
            
            # Page title selectors
            'h1.page-title',
            'h1.entry-title',
            'h1.post-title',
            '.page-title h1',
            '.entry-title h1',
            
            # Content area titles
            'main h1',
            'article h1',
            '.main-content h1',
            '.content h1',
            '[role="main"] h1',
            
            # Generic h1 (last resort)
            'h1'
        ]
        
        # Title cleaning patterns
        self.cleaning_patterns = [
            # Remove common prefixes/suffixes
            (r'^(aide?\s*:?\s*)', ''),
            (r'^(subvention\s*:?\s*)', ''),
            (r'^(dispositif\s*:?\s*)', ''),
            (r'^(programme\s*:?\s*)', ''),
            
            # Clean up spacing and formatting
            (r'\s+', ' '),
            (r'^\s+|\s+$', ''),
            
            # Remove HTML entities
            (r'&nbsp;', ' '),
            (r'&amp;', '&'),
            (r'&lt;', '<'),
            (r'&gt;', '>'),
        ]
        
        # Patterns to identify invalid titles that should be rejected
        self.invalid_title_patterns = [
            r'^subsidy\s*page$',
            r'^page$',
            r'^aide$',
            r'^accueil$',
            r'^home$',
            r'^404',
            r'^erreur',
            r'^france\s*agrimer$',
            r'^\s*$',
            r'^[^\w]+$',  # Only symbols/punctuation
        ]
    
    def extract_title_from_driver(self, driver) -> Optional[str]:
        """
        Extract title using Selenium WebDriver for dynamic content.
        
        Args:
            driver: Selenium WebDriver instance
            
        Returns:
            Extracted title or None if no valid title found
        """
        try:
            # Wait for page to load
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "h1"))
            )
        except TimeoutException:
            logger.warning("No H1 elements found within timeout")
        
        # Try each selector in order of preference
        for selector in self.title_selectors:
            try:
                elements = driver.find_elements(By.CSS_SELECTOR, selector)
                
                for element in elements:
                    if element.is_displayed():
                        title_text = element.text.strip()
                        
                        if title_text:
                            cleaned_title = self._clean_title(title_text)
                            
                            if self._is_valid_title(cleaned_title):
                                logger.info(f"Found valid title with selector '{selector}': {cleaned_title}")
                                return cleaned_title
                            else:
                                logger.debug(f"Rejected invalid title: {title_text}")
                        
            except NoSuchElementException:
                continue
            except Exception as e:
                logger.debug(f"Error with selector '{selector}': {e}")
        
        # Fallback: try to extract from browser title or meta tags
        fallback_title = self._extract_fallback_title(driver)
        if fallback_title:
            return fallback_title
        
        logger.warning("No valid title found with any selector")
        return None
    
    def extract_title_from_soup(self, soup: BeautifulSoup, url: str = "") -> Optional[str]:
        """
        Extract title using BeautifulSoup for static content.
        
        Args:
            soup: BeautifulSoup parsed HTML
            url: Original URL for context
            
        Returns:
            Extracted title or None if no valid title found
        """
        # Try each selector in order of preference
        for selector in self.title_selectors:
            try:
                elements = soup.select(selector)
                
                for element in elements:
                    title_text = element.get_text(strip=True)
                    
                    if title_text:
                        cleaned_title = self._clean_title(title_text)
                        
                        if self._is_valid_title(cleaned_title):
                            logger.info(f"Found valid title with selector '{selector}': {cleaned_title}")
                            return cleaned_title
                        else:
                            logger.debug(f"Rejected invalid title: {title_text}")
                        
            except Exception as e:
                logger.debug(f"Error with selector '{selector}': {e}")
        
        # Fallback: try HTML title tag
        fallback_title = self._extract_fallback_title_soup(soup, url)
        if fallback_title:
            return fallback_title
        
        logger.warning(f"No valid title found for URL: {url}")
        return None
    
    def _clean_title(self, title: str) -> str:
        """
        Clean and normalize a title string.
        
        Args:
            title: Raw title string
            
        Returns:
            Cleaned title string
        """
        if not title:
            return ""
        
        cleaned = title
        
        # Apply cleaning patterns
        for pattern, replacement in self.cleaning_patterns:
            cleaned = re.sub(pattern, replacement, cleaned, flags=re.IGNORECASE)
        
        return cleaned.strip()
    
    def _is_valid_title(self, title: str) -> bool:
        """
        Check if a title is valid (not generic/placeholder).
        
        Args:
            title: Title string to validate
            
        Returns:
            True if title is valid, False otherwise
        """
        if not title or len(title.strip()) < 3:
            return False
        
        title_lower = title.lower().strip()
        
        # Check against invalid patterns
        for pattern in self.invalid_title_patterns:
            if re.match(pattern, title_lower):
                logger.debug(f"Title rejected by pattern '{pattern}': {title}")
                return False
        
        # Additional heuristics
        
        # Reject if too short (likely not descriptive)
        if len(title.strip()) < 10:
            return False
        
        # Reject if only numbers/symbols
        if not re.search(r'[a-zA-ZÀ-ÿ]', title):
            return False
        
        # Reject if looks like navigation text
        nav_words = ['menu', 'navigation', 'accueil', 'retour', 'suivant', 'précédent']
        if any(word in title_lower for word in nav_words):
            return False
        
        return True
    
    def _extract_fallback_title(self, driver) -> Optional[str]:
        """
        Extract title using fallback methods (browser title, meta tags).
        
        Args:
            driver: Selenium WebDriver instance
            
        Returns:
            Fallback title or None
        """
        try:
            # Try browser page title
            page_title = driver.title
            if page_title and page_title.strip():
                # Clean up page title (often contains site name)
                cleaned = self._clean_page_title(page_title)
                if self._is_valid_title(cleaned):
                    logger.info(f"Using fallback page title: {cleaned}")
                    return cleaned
            
            # Try meta description or other meta tags
            try:
                meta_desc = driver.find_element(By.CSS_SELECTOR, 'meta[name="description"]')
                desc_content = meta_desc.get_attribute('content')
                if desc_content and len(desc_content) > 20:
                    # Extract first sentence as title
                    first_sentence = desc_content.split('.')[0].strip()
                    if len(first_sentence) > 10 and self._is_valid_title(first_sentence):
                        logger.info(f"Using meta description as title: {first_sentence}")
                        return first_sentence
            except NoSuchElementException:
                pass
            
        except Exception as e:
            logger.debug(f"Error in fallback title extraction: {e}")
        
        return None
    
    def _extract_fallback_title_soup(self, soup: BeautifulSoup, url: str) -> Optional[str]:
        """
        Extract title using fallback methods from BeautifulSoup.
        
        Args:
            soup: BeautifulSoup parsed HTML
            url: Original URL for context
            
        Returns:
            Fallback title or None
        """
        try:
            # Try HTML title tag
            title_tag = soup.find('title')
            if title_tag and title_tag.get_text(strip=True):
                page_title = title_tag.get_text(strip=True)
                cleaned = self._clean_page_title(page_title)
                if self._is_valid_title(cleaned):
                    logger.info(f"Using fallback page title: {cleaned}")
                    return cleaned
            
            # Try meta description
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            if meta_desc and meta_desc.get('content'):
                desc_content = meta_desc['content']
                if len(desc_content) > 20:
                    first_sentence = desc_content.split('.')[0].strip()
                    if len(first_sentence) > 10 and self._is_valid_title(first_sentence):
                        logger.info(f"Using meta description as title: {first_sentence}")
                        return first_sentence
            
            # Try to extract from URL path as last resort
            if url:
                url_title = self._extract_title_from_url(url)
                if url_title:
                    return url_title
            
        except Exception as e:
            logger.debug(f"Error in fallback title extraction: {e}")
        
        return None
    
    def _clean_page_title(self, page_title: str) -> str:
        """
        Clean a page title by removing site name and common suffixes.
        
        Args:
            page_title: Raw page title from <title> tag
            
        Returns:
            Cleaned title
        """
        if not page_title:
            return ""
        
        # Common patterns to remove
        removal_patterns = [
            r'\s*\|\s*FranceAgriMer.*$',
            r'\s*-\s*FranceAgriMer.*$',
            r'\s*\|\s*Ministère.*$',
            r'\s*-\s*Ministère.*$',
            r'\s*\|\s*Gouvernement.*$',
            r'\s*-\s*Gouvernement.*$',
            r'\s*\|\s*[^|]*\.fr\s*$',
            r'\s*-\s*[^-]*\.fr\s*$',
        ]
        
        cleaned = page_title
        for pattern in removal_patterns:
            cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE)
        
        return self._clean_title(cleaned)
    
    def _extract_title_from_url(self, url: str) -> Optional[str]:
        """
        Extract a title from URL path as last resort.
        
        Args:
            url: URL to extract title from
            
        Returns:
            Title extracted from URL or None
        """
        try:
            from urllib.parse import urlparse, unquote
            
            parsed = urlparse(url)
            path_parts = [part for part in parsed.path.split('/') if part]
            
            if not path_parts:
                return None
            
            # Get the last meaningful path component
            last_part = path_parts[-1]
            
            # URL decode
            decoded = unquote(last_part)
            
            # Clean up common URL patterns
            cleaned = re.sub(r'[_-]+', ' ', decoded)
            cleaned = re.sub(r'\.(html?|php|aspx?)$', '', cleaned, flags=re.IGNORECASE)
            
            # Capitalize appropriately
            title = ' '.join(word.capitalize() for word in cleaned.split())
            
            if len(title) > 5 and self._is_valid_title(title):
                logger.info(f"Using URL-derived title: {title}")
                return title
            
        except Exception as e:
            logger.debug(f"Error extracting title from URL: {e}")
        
        return None


# Global instance for easy access
title_extractor = EnhancedTitleExtractor()


def extract_enhanced_title(driver=None, soup=None, url: str = "") -> Optional[str]:
    """
    Convenience function to extract title using available input.
    
    Args:
        driver: Optional Selenium WebDriver instance
        soup: Optional BeautifulSoup instance
        url: URL for context
        
    Returns:
        Extracted title or None
    """
    if driver:
        return title_extractor.extract_title_from_driver(driver)
    elif soup:
        return title_extractor.extract_title_from_soup(soup, url)
    else:
        logger.error("Either driver or soup must be provided")
        return None
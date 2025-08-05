"""
Enhanced multi-tab content extractor for FranceAgriMer subsidy pages.
Captures complete content from all tabs (Présentation, Pour qui?, Quand?, Comment?)
using dynamic tab activation and comprehensive content extraction.
"""

from __future__ import annotations

import json
import time
import logging
import re
from typing import Dict, List, Any, Optional, Tuple, Union
from urllib.parse import urljoin, urlparse
from dataclasses import dataclass
from bs4 import BeautifulSoup
from markdownify import markdownify as md

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    TimeoutException, 
    NoSuchElementException, 
    ElementNotInteractableException,
    WebDriverException
)

from .core import init_driver


logger = logging.getLogger(__name__)


@dataclass
class TabContent:
    """Data class for tab content with metadata."""
    text: str
    markdown: str
    source_tab: str
    extraction_method: str
    content_length: int
    
    def _extract_file_size(self, link) -> Optional[str]:
        """Extract file size information from link text or attributes."""
        link_text = self._clean_text(link.get_text()).lower()
        
        # Look for size indicators in parentheses
        size_pattern = r'\(([^)]*(?:ko|mo|go|kb|mb|gb|bytes?)[^)]*)\)'
        size_match = re.search(size_pattern, link_text, re.IGNORECASE)
        
        if size_match:
            return size_match.group(1)
        
        # Check title or data attributes
        for attr in ['title', 'data-size', 'data-filesize']:
            attr_value = link.get(attr)
            if attr_value and any(unit in attr_value.lower() for unit in ['ko', 'mo', 'go', 'kb', 'mb', 'gb']):
                return attr_value
        
        return None
    
    def _get_link_context(self, link) -> str:
        """Get surrounding context for a document link."""
        parent = link.parent
        context_parts = []
        
        # Get text from parent elements (up to 3 levels)
        for _ in range(3):
            if not parent or parent.name == 'body':
                break
            
            parent_text = self._clean_text(parent.get_text())
            if parent_text and len(parent_text) < 200:
                context_parts.append(parent_text)
                break
            
            parent = parent.parent
        
        return context_parts[0] if context_parts else ""
    
    def _deduplicate_attachments(self, attachments: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """Remove duplicate attachments based on URL."""
        seen_urls = set()
        unique_attachments = []
        
        for attachment in attachments:
            url = attachment['url']
            if url not in seen_urls:
                seen_urls.add(url)
                unique_attachments.append(attachment)
        
        logger.info(f"Found {len(unique_attachments)} unique document attachments")
        return unique_attachments
    
    def _determine_link_source_tab(self, link_element, tab_content: Dict[str, TabContent]) -> str:
        """
        Determine which tab a document link belongs to based on its context.
        """
        link_text = self._clean_text(link_element.get_text()).lower()
        
        # Get parent context (more comprehensive)
        context_text = ""
        parent = link_element.parent
        context_depth = 0
        
        while parent and len(context_text) < 300 and context_depth < 5:
            parent_text = self._clean_text(parent.get_text()).lower()
            if parent_text and parent_text != context_text:
                context_text = parent_text
            parent = parent.parent
            context_depth += 1
            if not parent or parent.name == 'body':
                break
        
        # Match against tab content to find best fit
        best_match = 'unknown'
        best_score = 0
        
        for tab_name, tab_data in tab_content.items():
            tab_text_lower = tab_data.text.lower()
            
            # Calculate similarity score
            score = 0
            
            # Direct link text match
            if link_text and link_text in tab_text_lower:
                score += 10
            
            # Context overlap
            context_words = set(context_text.split())
            tab_words = set(tab_text_lower.split())
            common_words = context_words.intersection(tab_words)
            score += len(common_words)
            
            if score > best_score:
                best_score = score
                best_match = tab_name
        
        return best_match if best_score > 0 else 'unknown'
    
    def _combine_tab_content(self, tab_content: Dict[str, TabContent]) -> Tuple[str, str]:
        """
        Combine all tab content into plain text and markdown strings with clear section markers.
        """
        if not tab_content:
            return "", ""

        # Define preferred order for tabs
        preferred_order = ['presentation', 'pour_qui', 'quand', 'comment']

        combined_text_parts: List[str] = []
        combined_markdown_parts: List[str] = []

        # Add tabs in preferred order first
        for tab_key in preferred_order:
            if tab_key in tab_content:
                section_name = self._get_section_name(tab_key)
                text_content = tab_content[tab_key].text.strip()
                markdown_content = tab_content[tab_key].markdown.strip()
                
                if text_content:
                    combined_text_parts.append(f"== {section_name} ==\n{text_content}")
                if markdown_content:
                    combined_markdown_parts.append(f"## {section_name}\n\n{markdown_content}")

        # Add any remaining tabs
        for tab_key, content in tab_content.items():
            if tab_key not in preferred_order:
                section_name = self._get_section_name(tab_key)
                text_content = content.text.strip()
                markdown_content = content.markdown.strip()
                
                if text_content:
                    combined_text_parts.append(f"== {section_name} ==\n{text_content}")
                if markdown_content:
                    combined_markdown_parts.append(f"## {section_name}\n\n{markdown_content}")

        return "\n\n".join(combined_text_parts), "\n\n".join(combined_markdown_parts)
    
    def _get_section_name(self, tab_key: str) -> str:
        """Get a human-readable section name for a tab key."""
        section_names = {
            'presentation': 'Présentation',
            'pour_qui': 'Pour qui ?',
            'quand': 'Quand ?',
            'comment': 'Comment ?',
            'main_content': 'Contenu principal',
            'additional_content': 'Informations complémentaires',
            'documents': 'Documents'
        }
        
        return section_names.get(tab_key, tab_key.replace('_', ' ').title())
    
    def _normalize_tab_key(self, tab_text: str) -> str:
        """
        Normalize tab text to a consistent key format.
        """
        if not tab_text:
            return 'unknown'
        
        tab_text_lower = tab_text.lower().strip()
        
        # Map common variations to standard keys
        for key, variations in self.expected_tabs.items():
            if any(variation in tab_text_lower for variation in variations):
                return key
        
        # Enhanced fallback normalization
        normalized = re.sub(r'[^\w\s]', '', tab_text_lower)  # Remove punctuation
        normalized = re.sub(r'\s+', '_', normalized)  # Replace spaces with underscores
        normalized = normalized.replace('é', 'e').replace('è', 'e').replace('à', 'a')
        
        return normalized if normalized and normalized != '_' else 'unknown'
    
    def _calculate_completeness_score(self, tab_content: Dict[str, TabContent]) -> float:
        """
        Calculate a completeness score based on extracted content quality and coverage.
        """
        if not tab_content:
            return 0.0
        
        # Base score: percentage of expected tabs found
        expected_tabs_found = 0
        for expected_key in self.expected_tabs.keys():
            if expected_key in tab_content and len(tab_content[expected_key].text) > 50:
                expected_tabs_found += 1
        
        coverage_score = expected_tabs_found / len(self.expected_tabs)
        
        # Content quality bonus
        total_length = sum(content.content_length for content in tab_content.values())
        length_bonus = min(0.2, total_length / 10000)  # Up to 20% bonus
        
        # Diversity bonus (different extraction methods indicate robustness)
        methods_used = set(content.extraction_method for content in tab_content.values())
        diversity_bonus = min(0.1, len(methods_used) * 0.05)  # Up to 10% bonus
        
        final_score = min(1.0, coverage_score + length_bonus + diversity_bonus)
        
        logger.debug(
            f"Completeness calculation: coverage={coverage_score:.2f}, "
            f"length_bonus={length_bonus:.2f}, diversity_bonus={diversity_bonus:.2f}, "
            f"final={final_score:.2f}"
        )
        
        return final_score
    
    def _get_success_indicators(self, tab_content: Dict[str, TabContent]) -> Dict[str, Any]:
        """Get detailed success indicators for extraction quality assessment."""
        if not tab_content:
            return {'has_content': False}
        
        return {
            'has_content': True,
            'tab_count': len(tab_content),
            'has_presentation': 'presentation' in tab_content,
            'has_eligibility': 'pour_qui' in tab_content,
            'has_timing': 'quand' in tab_content,
            'has_process': 'comment' in tab_content,
            'total_chars': sum(content.content_length for content in tab_content.values()),
            'avg_content_length': sum(content.content_length for content in tab_content.values()) / len(tab_content),
            'extraction_methods': list(set(content.extraction_method for content in tab_content.values())),
            'content_distribution': {
                key: content.content_length for key, content in tab_content.items()
            }
        }
    
    def _clean_text(self, text: str) -> str:
        """
        Clean and normalize text content with enhanced cleaning rules.
        """
        if not text:
            return ""
        
        # Remove extra whitespace and normalize
        text = re.sub(r'\s+', ' ', text.strip())
        text = re.sub(r'\n\s*\n', '\n\n', text)  # Normalize paragraph breaks
        
        # Remove common web artifacts
        text = re.sub(r'^\s*[\d\s\-\|]+\s*', '', text)
        
        return text


@dataclass
class ExtractionResult:
    """Data class for extraction results with comprehensive metadata."""
    url: str
    tab_content: Dict[str, TabContent]
    combined_text: str
    combined_markdown: str
    attachments: List[Dict[str, str]]
    extraction_metadata: Dict[str, Any]
    original_html: Optional[str] = None
    
    @property
    def success(self) -> bool:
        """Check if extraction was successful."""
        return bool(self.tab_content and self.combined_text.strip())
    
    @property
    def total_content_length(self) -> int:
        """Get total content length across all tabs."""
        return sum(content.content_length for content in self.tab_content.values())


class MultiTabExtractor:
    """Enhanced extractor for multi-tab FranceAgriMer subsidy pages."""
    
    # Class constants for better maintainability
    DEFAULT_TIMEOUT = 15
    MIN_CONTENT_LENGTH = 20
    TAB_CLICK_DELAY = 0.5
    CONTENT_LOAD_DELAY = 1.0
    PAGE_LOAD_DELAY = 2.0
    
    def __init__(self, driver=None, timeout: int = DEFAULT_TIMEOUT):
        """
        Initialize the multi-tab extractor.
        
        Args:
            driver: Optional Selenium WebDriver instance. If None, creates new one.
            timeout: Default timeout for element waits.
        """
        self.driver = driver
        self.timeout = timeout
        self.should_quit_driver = driver is None
        
        # Enhanced tab selectors with priority order
        self.tab_selectors = [
            '.fr-tabs__tab',                    # DSFR standard tabs (highest priority)
            '[role="tab"]',                     # ARIA tabs
            '.fr-tabs__list .fr-tabs__tab',     # Nested DSFR tabs
            '.tabs-nav a',                      # Generic tab navigation
            '.nav-tabs .nav-link',              # Bootstrap-style tabs
            'button[data-tab]',                 # Custom data attributes
            '.tab-button',                      # Generic tab buttons
        ]
        
        # Enhanced panel selectors
        self.panel_selectors = [
            '.fr-tabs__panel',                  # DSFR standard panels
            '[role="tabpanel"]',                # ARIA panels
            '.tab-pane',                        # Bootstrap-style panels
            '.tab-content > div',               # Generic tab content
            '[data-tab-content]',               # Custom data attributes
        ]
        
        # Expected tab labels with comprehensive variations
        self.expected_tabs = {
            'presentation': [
                'présentation', 'description', 'objectifs', 'contexte', 
                'présentation générale', 'vue d\'ensemble', 'introduction'
            ],
            'pour_qui': [
                'pour qui', 'pour qui ?', 'bénéficiaires', 'éligibilité', 
                'qui peut en bénéficier', 'destinataires', 'public cible'
            ],
            'quand': [
                'quand', 'quand ?', 'délais', 'calendrier', 'dates', 
                'échéances', 'planning', 'temporalité'
            ],
            'comment': [
                'comment', 'comment ?', 'démarches', 'procédure', 
                'modalités', 'candidature', 'étapes', 'processus'
            ]
        }
        
        # Document extensions for attachment detection
        self.document_extensions = [
            '.pdf', '.doc', '.docx', '.xls', '.xlsx', 
            '.zip', '.txt', '.odt', '.ods', '.ppt', '.pptx'
        ]
    
    def extract_all_tabs(self, url: str) -> ExtractionResult:
        """
        Extract content from all tabs on a FranceAgriMer subsidy page.

        Args:
            url: URL of the subsidy detail page

        Returns:
            ExtractionResult object containing all extracted data and metadata
        """
        if not self.driver:
            self.driver = init_driver()
        
        start_time = time.time()
        
        try:
            logger.info(f"Loading page: {url}")
            self.driver.get(url)
            
            # Wait for page to load with better error handling
            try:
                WebDriverWait(self.driver, self.timeout).until(
                    EC.presence_of_element_located((By.TAG_NAME, "body"))
                )
            except TimeoutException:
                logger.error(f"Page load timeout for {url}")
                return self._create_empty_result(url, "Page load timeout")
            
            # Additional wait for DSFR components to initialize
            time.sleep(self.PAGE_LOAD_DELAY)
            
            # Store original HTML for title extraction
            original_html = self.driver.page_source
            
            # Extract tab content using multiple strategies
            tab_results = self._extract_tab_content()
            
            # Extract attachments from all content
            attachments = self._extract_all_attachments(tab_results['tab_content'])
            
            # Combine all text with section markers and markdown headings
            combined_text, combined_markdown = self._combine_tab_content(tab_results['tab_content'])

            # Calculate extraction metrics
            extraction_time = time.time() - start_time
            completeness_score = self._calculate_completeness_score(tab_results['tab_content'])

            # Prepare extraction metadata
            extraction_metadata = {
                'tabs_found': tab_results['tabs_found'],
                'tabs_extracted': tab_results['tabs_extracted'],
                'tabs_failed': tab_results['tabs_failed'],
                'method_used': tab_results['method_used'],
                'completeness_score': completeness_score,
                'total_content_length': len(combined_text),
                'extraction_timestamp': time.time(),
                'extraction_time_seconds': extraction_time,
                'attachments_count': len(attachments),
                'success_indicators': self._get_success_indicators(tab_results['tab_content'])
            }

            result = ExtractionResult(
                url=url,
                tab_content=tab_results['tab_content'],
                combined_text=combined_text,
                combined_markdown=combined_markdown,
                attachments=attachments,
                original_html=original_html,
                extraction_metadata=extraction_metadata
            )

            logger.info(
                f"Multi-tab extraction completed in {extraction_time:.2f}s. "
                f"Found {len(tab_results['tab_content'])} tabs, "
                f"{len(attachments)} attachments, "
                f"completeness: {completeness_score:.2f}"
            )
            
            return result
            
        except WebDriverException as e:
            logger.error(f"WebDriver error during extraction from {url}: {e}")
            return self._create_empty_result(url, f"WebDriver error: {str(e)}")
        except Exception as e:
            logger.error(f"Multi-tab extraction failed for {url}: {e}", exc_info=True)
            return self._create_empty_result(url, f"Extraction error: {str(e)}")
        
        finally:
            if self.should_quit_driver and self.driver:
                try:
                    self.driver.quit()
                except Exception as e:
                    logger.warning(f"Error closing driver: {e}")
    
    def _create_empty_result(self, url: str, error_message: str) -> ExtractionResult:
        """Create an empty result with error information."""
        return ExtractionResult(
            url=url,
            tab_content={},
            combined_text='',
            combined_markdown='',
            attachments=[],
            extraction_metadata={
                'error': error_message,
                'extraction_timestamp': time.time(),
                'success': False
            }
        )
    
    def _extract_tab_content(self) -> Dict[str, Any]:
        """
        Extract content from all available tabs using multiple strategies.
        
        Returns:
            Dictionary with extraction results and metadata
        """
        tab_content: Dict[str, TabContent] = {}
        tabs_found = []
        tabs_extracted = []
        tabs_failed = []
        method_used = "unknown"
        
        # Strategy 1: Interactive tab clicking (for AJAX tabs)
        try:
            interactive_result = self._extract_with_tab_clicking()
            if interactive_result['success'] and interactive_result['content']:
                tab_content.update(interactive_result['content'])
                tabs_found.extend(interactive_result['tabs_found'])
                tabs_extracted.extend(interactive_result['tabs_extracted'])
                tabs_failed.extend(interactive_result['tabs_failed'])
                method_used = "interactive_clicking"
                logger.info("Successfully used interactive tab clicking method")
            else:
                logger.info("Interactive tab clicking failed, trying DOM extraction")
        except Exception as e:
            logger.warning(f"Interactive tab clicking failed: {e}")
        
        # Strategy 2: DOM extraction (for hidden tabs)
        if not tab_content:
            try:
                dom_result = self._extract_from_dom()
                if dom_result['content']:
                    tab_content.update(dom_result['content'])
                    tabs_found.extend(dom_result['tabs_found'])
                    tabs_extracted.extend(dom_result['tabs_extracted'])
                    method_used = "dom_extraction"
                    logger.info("Successfully used DOM extraction method")
            except Exception as e:
                logger.warning(f"DOM extraction failed: {e}")
        
        # Strategy 3: Generic content extraction (fallback)
        if not tab_content:
            try:
                fallback_result = self._extract_generic_content()
                if fallback_result['content']:
                    tab_content.update(fallback_result['content'])
                    method_used = "generic_fallback"
                    logger.info("Used generic fallback extraction")
            except Exception as e:
                logger.error(f"All extraction methods failed: {e}")
        
        return {
            'tab_content': tab_content,
            'tabs_found': tabs_found,
            'tabs_extracted': tabs_extracted,
            'tabs_failed': tabs_failed,
            'method_used': method_used
        }
    
    def _extract_with_tab_clicking(self) -> Dict[str, Any]:
        """
        Extract content by actively clicking each tab and capturing the revealed content.
        """
        tab_content: Dict[str, TabContent] = {}
        tabs_found = []
        tabs_extracted = []
        tabs_failed = []
        
        # Find all tab elements using multiple selectors
        tab_elements = self._find_tab_elements()
        
        if not tab_elements:
            return {
                'success': False, 
                'content': {}, 
                'tabs_found': [], 
                'tabs_extracted': [], 
                'tabs_failed': []
            }
        
        logger.info(f"Found {len(tab_elements)} potential tab elements")
        
        # Process each tab with improved error handling
        for i, tab_element in enumerate(tab_elements):
            tab_text = ''
            try:
                # Get tab label with fallback methods
                tab_text = self._extract_tab_label(tab_element)
                tab_key = self._normalize_tab_key(tab_text)
                
                if not tab_text.strip() or tab_key == 'unknown':
                    continue
                
                tabs_found.append(tab_text)
                logger.debug(f"Processing tab {i+1}: '{tab_text}' -> '{tab_key}'")
                
                # Check if tab is already active
                if self._is_tab_active(tab_element):
                    logger.debug(f"Tab '{tab_text}' is already active")
                else:
                    # Activate the tab
                    if not self._activate_tab(tab_element):
                        tabs_failed.append(tab_text)
                        continue
                
                # Extract content from the now-active tab panel
                content = self._extract_active_tab_content(tab_element)

                if content and content.text.strip():
                    if tab_key in tab_content:
                        # Merge content if tab key already exists
                        merged_text = f"{tab_content[tab_key].text}\n\n{content.text}"
                        merged_markdown = f"{tab_content[tab_key].markdown}\n\n{content.markdown}"
                        tab_content[tab_key] = TabContent(
                            text=merged_text,
                            markdown=merged_markdown,
                            source_tab=tab_key,
                            extraction_method="interactive_merged"
                        )
                    else:
                        tab_content[tab_key] = content
                    
                    tabs_extracted.append(tab_text)
                    logger.debug(f"Extracted {len(content.text)} chars from tab '{tab_text}'")
                else:
                    logger.warning(f"No content extracted from tab '{tab_text}'")
                    tabs_failed.append(tab_text)
                
            except Exception as e:
                logger.warning(f"Failed to process tab {i+1} ('{tab_text}'): {e}")
                if tab_text:
                    tabs_failed.append(tab_text)
        
        success = len(tabs_extracted) > 0
        return {
            'success': success,
            'content': tab_content,
            'tabs_found': tabs_found,
            'tabs_extracted': tabs_extracted,
            'tabs_failed': tabs_failed
        }
    
    def _find_tab_elements(self) -> List:
        """Find all tab elements using multiple selectors with priority."""
        tab_elements = []
        
        for selector in self.tab_selectors:
            try:
                elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                if elements:
                    tab_elements.extend(elements)
                    logger.debug(f"Found {len(elements)} tabs with selector: {selector}")
                    # If we found tabs with a high-priority selector, prefer those
                    if selector in ['.fr-tabs__tab', '[role="tab"]']:
                        break
            except Exception as e:
                logger.debug(f"Tab selector {selector} failed: {e}")
        
        # Remove duplicates while preserving order
        seen = set()
        unique_tabs = []
        for tab in tab_elements:
            tab_id = tab.get_attribute('outerHTML')
            if tab_id not in seen:
                seen.add(tab_id)
                unique_tabs.append(tab)
        
        return unique_tabs
    
    def _extract_tab_label(self, tab_element) -> str:
        """Extract tab label using multiple fallback methods."""
        # Method 1: Get text content directly
        tab_text = self._clean_text(tab_element.text)
        if tab_text:
            return tab_text
        
        # Method 2: Get innerHTML and parse
        try:
            tab_html = tab_element.get_attribute("innerHTML") or ""
            if tab_html:
                tab_text = self._clean_text(BeautifulSoup(tab_html, 'html.parser').get_text())
                if tab_text:
                    return tab_text
        except Exception as e:
            logger.debug(f"Failed to extract tab label from innerHTML: {e}")
        
        # Method 3: Check aria-label or title attributes
        for attr in ['aria-label', 'title', 'data-tab', 'data-label']:
            attr_value = tab_element.get_attribute(attr)
            if attr_value:
                return self._clean_text(attr_value)
        
        return ""
    
    def _is_tab_active(self, tab_element) -> bool:
        """Check if a tab is currently active using multiple indicators."""
        try:
            # Check various active state indicators
            class_attr = tab_element.get_attribute('class') or ''
            aria_selected = tab_element.get_attribute('aria-selected')
            
            return (
                'active' in class_attr or
                'fr-tabs__tab--selected' in class_attr or
                'selected' in class_attr or
                aria_selected == 'true'
            )
        except Exception:
            return False
    
    def _activate_tab(self, tab_element) -> bool:
        """
        Activate a tab using multiple click strategies.
        
        Returns:
            True if tab was successfully activated, False otherwise
        """
        try:
            # Scroll tab into view
            self.driver.execute_script("arguments[0].scrollIntoView(true);", tab_element)
            time.sleep(self.TAB_CLICK_DELAY)
            
            # Check if element is interactable
            if not (tab_element.is_enabled() and tab_element.is_displayed()):
                logger.debug("Tab element is not interactable")
                return False
            
            # Try regular click first
            try:
                tab_element.click()
            except ElementNotInteractableException:
                # Fallback to JavaScript click
                self.driver.execute_script("arguments[0].click();", tab_element)
            
            # Wait for content to load
            time.sleep(self.CONTENT_LOAD_DELAY)
            
            # Verify tab was activated
            return self._is_tab_active(tab_element)
            
        except Exception as e:
            logger.debug(f"Failed to activate tab: {e}")
            return False
    
    def _extract_active_tab_content(self, tab_element) -> Optional[TabContent]:
        """
        Extract content from the currently active tab panel.
        """
        content_selectors = self._get_content_selectors_for_tab(tab_element)
        
        content_texts: List[str] = []
        content_markdowns: List[str] = []
        
        for selector in content_selectors:
            if not selector:
                continue
            
            try:
                panel_elements = self.driver.find_elements(By.CSS_SELECTOR, selector)

                for panel in panel_elements:
                    if panel.is_displayed():
                        panel_html = panel.get_attribute("innerHTML") or ""
                        panel_text = self._clean_text(BeautifulSoup(panel_html, 'html.parser').get_text())
                        
                        if panel_text and len(panel_text) > self.MIN_CONTENT_LENGTH:
                            content_texts.append(panel_text)
                            content_markdowns.append(md(panel_html))

                if content_texts:
                    break
                    
            except Exception as e:
                logger.debug(f"Content selector {selector} failed: {e}")
        
        if not content_texts:
            return None
        
        # Get tab key for source tracking
        tab_text = self._extract_tab_label(tab_element)
        tab_key = self._normalize_tab_key(tab_text)
        
        return TabContent(
            text="\n\n".join(content_texts).strip(),
            markdown="\n\n".join(content_markdowns).strip(),
            source_tab=tab_key,
            extraction_method="interactive"
        )
    
    def _get_content_selectors_for_tab(self, tab_element) -> List[str]:
        """Get prioritized list of content selectors for a specific tab."""
        selectors = []
        
        # Try to find associated panel via aria-controls
        aria_controls = tab_element.get_attribute('aria-controls')
        if aria_controls:
            selectors.append(f"#{aria_controls}")
        
        # Try data attributes
        data_target = tab_element.get_attribute('data-target')
        if data_target:
            selectors.append(data_target)
        
        # Add generic active panel selectors
        selectors.extend([
            '.fr-tabs__panel[aria-hidden="false"]',
            '.fr-tabs__panel.fr-tabs__panel--selected',
            '.tab-pane.active',
            '[role="tabpanel"]:not([hidden])',
            '.fr-tabs__panel:not([hidden])',
        ])
        
        return selectors
    
    def _extract_from_dom(self) -> Dict[str, Any]:
        """
        Extract content from DOM by examining tab panels directly.
        """
        tab_content: Dict[str, TabContent] = {}
        tabs_found = []
        tabs_extracted = []
        
        # Get page source and parse with BeautifulSoup
        soup = BeautifulSoup(self.driver.page_source, 'html.parser')
        
        # Find tab panels in the DOM
        panel_elements = self._find_panel_elements(soup)
        
        logger.info(f"Found {len(panel_elements)} tab panels in DOM")
        
        for panel in panel_elements:
            try:
                # Get panel content
                panel_html = panel.decode_contents() if hasattr(panel, 'decode_contents') else ''
                panel_text = self._clean_text(BeautifulSoup(panel_html, 'html.parser').get_text())
                panel_markdown = md(panel_html) if panel_html else ""

                if not panel_text or len(panel_text) < self.MIN_CONTENT_LENGTH:
                    continue

                # Identify which tab this panel belongs to
                tab_key = self._identify_tab_from_panel(panel, panel_text, soup)

                if tab_key and tab_key != 'unknown':
                    tabs_found.append(tab_key)

                    content = TabContent(
                        text=panel_text,
                        markdown=panel_markdown,
                        source_tab=tab_key,
                        extraction_method="dom"
                    )

                    if tab_key in tab_content:
                        # Merge content if key already exists
                        merged_text = f"{tab_content[tab_key].text}\n\n{panel_text}"
                        merged_markdown = f"{tab_content[tab_key].markdown}\n\n{panel_markdown}"
                        tab_content[tab_key] = TabContent(
                            text=merged_text,
                            markdown=merged_markdown,
                            source_tab=tab_key,
                            extraction_method="dom_merged"
                        )
                    else:
                        tab_content[tab_key] = content

                    tabs_extracted.append(tab_key)
                    logger.debug(f"Extracted {len(panel_text)} chars for tab '{tab_key}'")

            except Exception as e:
                logger.warning(f"Failed to process panel: {e}")
        
        return {
            'content': tab_content,
            'tabs_found': tabs_found,
            'tabs_extracted': tabs_extracted
        }
    
    def _find_panel_elements(self, soup: BeautifulSoup) -> List:
        """Find all panel elements in the DOM."""
        panel_elements = []
        
        for selector in self.panel_selectors:
            try:
                panels = soup.select(selector)
                panel_elements.extend(panels)
            except Exception as e:
                logger.debug(f"Panel selector {selector} failed: {e}")
        
        return panel_elements
    
    def _identify_tab_from_panel(self, panel, panel_text: str, soup: BeautifulSoup) -> str:
        """
        Identify which tab a panel belongs to based on ID, content, or structure.
        """
        # Strategy 1: Use panel ID to find associated tab
        panel_id = panel.get('id', '')
        if panel_id:
            tab_button = soup.select_one(f'[aria-controls="{panel_id}"]')
            if tab_button:
                tab_html = tab_button.decode_contents()
                tab_text = self._clean_text(BeautifulSoup(tab_html, 'html.parser').get_text())
                return self._normalize_tab_key(tab_text)
        
        # Strategy 2: Content-based analysis with enhanced heuristics
        panel_text_lower = panel_text.lower()
        
        content_indicators = {
            'presentation': [
                'objectif', 'description', 'présentation', 'contexte', 'but',
                'finalité', 'enjeu', 'stratégique', 'général'
            ],
            'pour_qui': [
                'bénéficiaire', 'éligible', 'condition', 'qui peut', 'destinataire',
                'exploitant', 'agriculteur', 'entreprise', 'organisme'
            ],
            'quand': [
                'date', 'délai', 'calendrier', 'échéance', 'période', 'avant le',
                'jusqu\'au', 'dépôt', 'candidature', 'limite'
            ],
            'comment': [
                'démarche', 'procédure', 'candidature', 'dossier', 'comment',
                'modalité', 'étape', 'formulaire', 'document'
            ]
        }
        
        # Score each tab type based on keyword frequency
        scores = {}
        for tab_type, indicators in content_indicators.items():
            score = sum(panel_text_lower.count(indicator) for indicator in indicators)
            if score > 0:
                scores[tab_type] = score
        
        if scores:
            return max(scores, key=scores.get)
        
        # Strategy 3: Structural analysis
        if len(panel_text) > 500 and any(word in panel_text_lower for word in ['objectif', 'aide']):
            return 'presentation'
        elif any(word in panel_text_lower for word in ['formulaire', 'document', 'pièce']):
            return 'comment'
        elif len(panel_text) > 200:
            return 'main_content'
        else:
            return 'additional_content'
    
    def _extract_generic_content(self) -> Dict[str, Any]:
        """
        Fallback method to extract any available content from the page.
        """
        soup = BeautifulSoup(self.driver.page_source, 'html.parser')

        # Remove unwanted elements
        for tag in soup(['header', 'footer', 'nav', 'script', 'style', 'meta']):
            tag.decompose()

        # Extract main content with multiple strategies
        main_html = self._extract_main_content_html(soup)
        
        if not main_html:
            return {'content': {}}

        main_text = self._clean_text(BeautifulSoup(main_html, 'html.parser').get_text())
        main_markdown = md(main_html)

        if not main_text or len(main_text) < self.MIN_CONTENT_LENGTH:
            return {'content': {}}

        content = TabContent(
            text=main_text,
            markdown=main_markdown,
            source_tab='main_content',
            extraction_method="generic_fallback"
        )

        return {
            'content': {'main_content': content}
        }
    
    def _extract_main_content_html(self, soup: BeautifulSoup) -> str:
        """Extract main content HTML using multiple strategies."""
        content_selectors = [
            'main', '[role="main"]', '.main-content', '.content',
            'article', '.entry-content', '.post-content', '.fr-container',
            '.container', '#content', '.page-content'
        ]

        for selector in content_selectors:
            content_elem = soup.select_one(selector)
            if content_elem:
                return content_elem.decode_contents()

        # Fallback to body content (filtered)
        body = soup.find('body')
        if body:
            # Remove navigation and other non-content elements
            for unwanted in body.select('nav, header, footer, aside, .breadcrumb'):
                unwanted.decompose()
            return body.decode_contents()

        return ""
    
    def _extract_all_attachments(self, tab_content: Dict[str, TabContent]) -> List[Dict[str, str]]:
        """
        Extract document attachments from all tab content and current page.
        """
        attachments = []
        soup = BeautifulSoup(self.driver.page_source, 'html.parser')
        base_url = self.driver.current_url
        
        # Find all document links
        for link in soup.find_all('a', href=True):
            href = link.get('href', '')
            link_text = self._clean_text(link.get_text())
            
            # Check if link points to a document
            if self._is_document_link(href):
                # Resolve relative URLs
                full_url = urljoin(base_url, href)
                
                # Determine which tab this link was found in
                source_tab = self._determine_link_source_tab(link, tab_content)
                
                # Extract additional metadata
                file_size = self._extract_file_size(link)
                file_type = self._get_file_type(href)
                
                attachment = {
                    'url': full_url,
                    'text': link_text or 'Document',
                    'filename': self._extract_filename(href),
                    'source_tab': source_tab,
                    'extension': file_type,
                    'file_size': file_size,
                    'link_context': self._get_link_context(link)
                }
                
                attachments.append(attachment)
        
        # Remove duplicates based on URL
        return self._deduplicate_attachments(attachments)
    
    def _is_document_link(self, href: str) -> bool:
        """Check if a link points to a document."""
        return any(ext in href.lower() for ext in self.document_extensions)
    
    def _extract_filename(self, href: str) -> str:
        """Extract filename from URL."""
        filename = href.split('/')[-1] if '/' in href else href
        # Remove query parameters
        return filename.split('?')[0] if '?' in filename else filename
    
    def _get_file_type(self, href: str) -> str:
        """Get file type from URL."""
        for ext in self.document_extensions:
            if ext in href.lower():
                return ext.lstrip('.')
        return 'unknown'

    def _normalize_text(self, text: str) -> str:
        """Normalize extracted text."""
        text = re.sub(r'^-{2,}$', '', text, flags=re.MULTILINE)  # Remove separator lines
        text = re.sub(r'\s*\n\s*\n\s*', '\n\n', text)  # Clean up multiple newlines

        # Remove excessive repetitive characters
        text = re.sub(r'([^\w\s])\1{3,}', r'\1', text)  # Remove repeated punctuation

        return text.strip()


# Convenience functions for backward compatibility and ease of use

def extract_multi_tab_content(url: str, driver=None, timeout: int = MultiTabExtractor.DEFAULT_TIMEOUT) -> ExtractionResult:
    """
    Convenience function to extract multi-tab content from a single URL.
    
    Args:
        url: URL of the subsidy detail page
        driver: Optional existing WebDriver instance
        timeout: Timeout for extraction operations
        
    Returns:
        ExtractionResult object containing all extracted data
    """
    extractor = MultiTabExtractor(driver=driver, timeout=timeout)
    return extractor.extract_all_tabs(url)


def enhanced_extract_subsidy_details(url: str, timeout: int = MultiTabExtractor.DEFAULT_TIMEOUT) -> Optional[Dict[str, Any]]:
    """
    Enhanced version of extract_subsidy_details with multi-tab support.
    
    Args:
        url: URL of the subsidy detail page
        timeout: Timeout for extraction operations
    
    Returns:
        Dictionary containing structured subsidy data with comprehensive tab content,
        or None if extraction fails
    """
    try:
        # Extract multi-tab content
        extraction_result = extract_multi_tab_content(url, timeout=timeout)
        
        if not extraction_result.success:
            logger.warning(f"No meaningful content extracted from {url}")
            return None
        
        # Parse structured data from combined content
        try:
            from .discovery import extract_structured_content
        except ImportError:
            logger.error("Cannot import extract_structured_content from discovery module")
            return None
        
        # Create enhanced soup for structured extraction
        enhanced_html = _create_enhanced_html_for_extraction(extraction_result)
        soup = BeautifulSoup(enhanced_html, 'html.parser')
        
        # Extract structured content
        extracted = extract_structured_content(soup, url)
        
        # Enhance with multi-tab specific data
        enhanced_data = _enhance_with_multitab_data(extracted, extraction_result, url)
        
        # Validate extraction quality
        if not _validate_extraction_quality(enhanced_data):
            logger.warning(f"Extraction quality validation failed for {url}")
            return None
        
        return enhanced_data
        
    except Exception as e:
        logger.error(f"Enhanced extraction failed for {url}: {e}", exc_info=True)
        return None


def _create_enhanced_html_for_extraction(extraction_result: ExtractionResult) -> str:
    """Create enhanced HTML that preserves title and includes tab content."""
    try:
        # Extract title from original HTML
        original_soup = BeautifulSoup(extraction_result.original_html or '', 'html.parser')
        title = _extract_page_title(original_soup, extraction_result.url)
        
        # Try enhanced title extraction if available
        try:
            from .enhanced_title_extractor import extract_enhanced_title
            enhanced_title = extract_enhanced_title(soup=original_soup, url=extraction_result.url)
            if enhanced_title:
                title = enhanced_title
        except ImportError:
            pass  # Use basic title extraction
        
        # Create structured HTML with title and tab content
        html_parts = ['<html><body>']
        
        if title:
            html_parts.append(f'<h1>{title}</h1>')
        
        # Add combined markdown content for better structure preservation
        if extraction_result.combined_markdown:
            html_parts.append(f'<div class="tab-content">{extraction_result.combined_markdown}</div>')
        elif extraction_result.combined_text:
            html_parts.append(f'<div class="tab-content">{extraction_result.combined_text}</div>')
        
        html_parts.append('</body></html>')
        
        return '\n'.join(html_parts)
        
    except Exception as e:
        logger.warning(f"Failed to create enhanced HTML: {e}")
        # Fallback to simple HTML structure
        return f'<html><body><div>{extraction_result.combined_text}</div></body></html>'


def _extract_page_title(soup: BeautifulSoup, url: str) -> str:
    """Extract page title using multiple strategies."""
    # Strategy 1: HTML title tag
    title_tag = soup.find('title')
    if title_tag and title_tag.get_text().strip():
        return _clean_title(title_tag.get_text())
    
    # Strategy 2: Main heading
    for heading_tag in ['h1', 'h2']:
        heading = soup.find(heading_tag)
        if heading and heading.get_text().strip():
            return _clean_title(heading.get_text())
    
    # Strategy 3: Meta property
    for meta_property in ['og:title', 'twitter:title']:
        meta_tag = soup.find('meta', property=meta_property)
        if meta_tag and meta_tag.get('content'):
            return _clean_title(meta_tag.get('content'))
    
    # Strategy 4: URL-based fallback
    parsed_url = urlparse(url)
    path_parts = [part for part in parsed_url.path.split('/') if part]
    if path_parts:
        return path_parts[-1].replace('-', ' ').replace('_', ' ').title()
    
    return "Subsidy Information"


def _clean_title(title: str) -> str:
    """Clean and normalize page title."""
    if not title:
        return ""

    # Remove common site suffixes
    title = re.sub(r'\s*[-|]\s*FranceAgriMer.*', '', title, flags=re.IGNORECASE)
    title = re.sub(r'\s*[-|]\s*Site officiel.*', '', title, flags=re.IGNORECASE)

    # Clean whitespace
    title = re.sub(r'\s+', ' ', title.strip())

    return title


@dataclass
class ExtractionResult:
    """Data class for extraction results with comprehensive metadata."""
    url: str
    tab_content: Dict[str, TabContent]
    combined_text: str
    combined_markdown: str
    attachments: List[Dict[str, str]]
    extraction_metadata: Dict[str, Any]
    original_html: Optional[str] = None
    
    @property
    def success(self) -> bool:
        """Check if extraction was successful."""
        return bool(self.tab_content and self.combined_text.strip())
    
    @property
    def total_content_length(self) -> int:
        """Get total content length across all tabs."""
        return sum(content.content_length for content in self.tab_content.values())


class MultiTabExtractor:
    """Enhanced extractor for multi-tab FranceAgriMer subsidy pages."""
    
    # Class constants for better maintainability
    DEFAULT_TIMEOUT = 15
    MIN_CONTENT_LENGTH = 20
    TAB_CLICK_DELAY = 0.5
    CONTENT_LOAD_DELAY = 1.0
    PAGE_LOAD_DELAY = 2.0
    
    def __init__(self, driver=None, timeout: int = DEFAULT_TIMEOUT):
        """
        Initialize the multi-tab extractor.
        
        Args:
            driver: Optional Selenium WebDriver instance. If None, creates new one.
            timeout: Default timeout for element waits.
        """
        self.driver = driver
        self.timeout = timeout
        self.should_quit_driver = driver is None
        
        # Enhanced tab selectors with priority order
        self.tab_selectors = [
            '.fr-tabs__tab',                    # DSFR standard tabs (highest priority)
            '[role="tab"]',                     # ARIA tabs
            '.fr-tabs__list .fr-tabs__tab',     # Nested DSFR tabs
            '.tabs-nav a',                      # Generic tab navigation
            '.nav-tabs .nav-link',              # Bootstrap-style tabs
            'button[data-tab]',                 # Custom data attributes
            '.tab-button',                      # Generic tab buttons
        ]
        
        # Enhanced panel selectors
        self.panel_selectors = [
            '.fr-tabs__panel',                  # DSFR standard panels
            '[role="tabpanel"]',                # ARIA panels
            '.tab-pane',                        # Bootstrap-style panels
            '.tab-content > div',               # Generic tab content
            '[data-tab-content]',               # Custom data attributes
        ]
        
        # Expected tab labels with comprehensive variations
        self.expected_tabs = {
            'presentation': [
                'présentation', 'description', 'objectifs', 'contexte', 
                'présentation générale', 'vue d\'ensemble', 'introduction'
            ],
            'pour_qui': [
                'pour qui', 'pour qui ?', 'bénéficiaires', 'éligibilité', 
                'qui peut en bénéficier', 'destinataires', 'public cible'
            ],
            'quand': [
                'quand', 'quand ?', 'délais', 'calendrier', 'dates', 
                'échéances', 'planning', 'temporalité'
            ],
            'comment': [
                'comment', 'comment ?', 'démarches', 'procédure', 
                'modalités', 'candidature', 'étapes', 'processus'
            ]
        }
        
        # Document extensions for attachment detection
        self.document_extensions = [
            '.pdf', '.doc', '.docx', '.xls', '.xlsx', 
            '.zip', '.txt', '.odt', '.ods', '.ppt', '.pptx'
        ]
    
    def extract_all_tabs(self, url: str) -> ExtractionResult:
        """
        Extract content from all tabs on a FranceAgriMer subsidy page.

        Args:
            url: URL of the subsidy detail page

        Returns:
            ExtractionResult object containing all extracted data and metadata
        """
        if not self.driver:
            self.driver = init_driver()
        
        start_time = time.time()
        
        try:
            logger.info(f"Loading page: {url}")
            self.driver.get(url)
            
            # Wait for page to load with better error handling
            try:
                WebDriverWait(self.driver, self.timeout).until(
                    EC.presence_of_element_located((By.TAG_NAME, "body"))
                )
            except TimeoutException:
                logger.error(f"Page load timeout for {url}")
                return self._create_empty_result(url, "Page load timeout")
            
            # Additional wait for DSFR components to initialize
            time.sleep(self.PAGE_LOAD_DELAY)
            
            # Store original HTML for title extraction
            original_html = self.driver.page_source
            
            # Extract tab content using multiple strategies
            tab_results = self._extract_tab_content()
            
            # Extract attachments from all content
            attachments = self._extract_all_attachments(tab_results['tab_content'])
            
            # Combine all text with section markers and markdown headings
            combined_text, combined_markdown = self._combine_tab_content(tab_results['tab_content'])

            # Calculate extraction metrics
            extraction_time = time.time() - start_time
            completeness_score = self._calculate_completeness_score(tab_results['tab_content'])

            # Prepare extraction metadata
            extraction_metadata = {
                'tabs_found': tab_results['tabs_found'],
                'tabs_extracted': tab_results['tabs_extracted'],
                'tabs_failed': tab_results['tabs_failed'],
                'method_used': tab_results['method_used'],
                'completeness_score': completeness_score,
                'total_content_length': len(combined_text),
                'extraction_timestamp': time.time(),
                'extraction_time_seconds': extraction_time,
                'attachments_count': len(attachments),
                'success_indicators': self._get_success_indicators(tab_results['tab_content'])
            }

            result = ExtractionResult(
                url=url,
                tab_content=tab_results['tab_content'],
                combined_text=combined_text,
                combined_markdown=combined_markdown,
                attachments=attachments,
                original_html=original_html,
                extraction_metadata=extraction_metadata
            )

            logger.info(
                f"Multi-tab extraction completed in {extraction_time:.2f}s. "
                f"Found {len(tab_results['tab_content'])} tabs, "
                f"{len(attachments)} attachments, "
                f"completeness: {completeness_score:.2f}"
            )
            
            return result
            
        except WebDriverException as e:
            logger.error(f"WebDriver error during extraction from {url}: {e}")
            return self._create_empty_result(url, f"WebDriver error: {str(e)}")
        except Exception as e:
            logger.error(f"Multi-tab extraction failed for {url}: {e}", exc_info=True)
            return self._create_empty_result(url, f"Extraction error: {str(e)}")
        
        finally:
            if self.should_quit_driver and self.driver:
                try:
                    self.driver.quit()
                except Exception as e:
                    logger.warning(f"Error closing driver: {e}")
    
    def _create_empty_result(self, url: str, error_message: str) -> ExtractionResult:
        """Create an empty result with error information."""
        return ExtractionResult(
            url=url,
            tab_content={},
            combined_text='',
            combined_markdown='',
            attachments=[],
            extraction_metadata={
                'error': error_message,
                'extraction_timestamp': time.time(),
                'success': False
            }
        )
    
    def _extract_tab_content(self) -> Dict[str, Any]:
        """
        Extract content from all available tabs using multiple strategies.
        
        Returns:
            Dictionary with extraction results and metadata
        """
        tab_content: Dict[str, TabContent] = {}
        tabs_found = []
        tabs_extracted = []
        tabs_failed = []
        method_used = "unknown"
        
        # Strategy 1: Interactive tab clicking (for AJAX tabs)
        try:
            interactive_result = self._extract_with_tab_clicking()
            if interactive_result['success'] and interactive_result['content']:
                tab_content.update(interactive_result['content'])
                tabs_found.extend(interactive_result['tabs_found'])
                tabs_extracted.extend(interactive_result['tabs_extracted'])
                tabs_failed.extend(interactive_result['tabs_failed'])
                method_used = "interactive_clicking"
                logger.info("Successfully used interactive tab clicking method")
            else:
                logger.info("Interactive tab clicking failed, trying DOM extraction")
        except Exception as e:
            logger.warning(f"Interactive tab clicking failed: {e}")
        
        # Strategy 2: DOM extraction (for hidden tabs)
        if not tab_content:
            try:
                dom_result = self._extract_from_dom()
                if dom_result['content']:
                    tab_content.update(dom_result['content'])
                    tabs_found.extend(dom_result['tabs_found'])
                    tabs_extracted.extend(dom_result['tabs_extracted'])
                    method_used = "dom_extraction"
                    logger.info("Successfully used DOM extraction method")
            except Exception as e:
                logger.warning(f"DOM extraction failed: {e}")
        
        # Strategy 3: Generic content extraction (fallback)
        if not tab_content:
            try:
                fallback_result = self._extract_generic_content()
                if fallback_result['content']:
                    tab_content.update(fallback_result['content'])
                    method_used = "generic_fallback"
                    logger.info("Used generic fallback extraction")
            except Exception as e:
                logger.error(f"All extraction methods failed: {e}")
        
        return {
            'tab_content': tab_content,
            'tabs_found': tabs_found,
            'tabs_extracted': tabs_extracted,
            'tabs_failed': tabs_failed,
            'method_used': method_used
        }
    
    def _extract_with_tab_clicking(self) -> Dict[str, Any]:
        """
        Extract content by actively clicking each tab and capturing the revealed content.
        """
        tab_content: Dict[str, TabContent] = {}
        tabs_found = []
        tabs_extracted = []
        tabs_failed = []
        
        # Find all tab elements using multiple selectors
        tab_elements = self._find_tab_elements()
        
        if not tab_elements:
            return {
                'success': False, 
                'content': {}, 
                'tabs_found': [], 
                'tabs_extracted': [], 
                'tabs_failed': []
            }
        
        logger.info(f"Found {len(tab_elements)} potential tab elements")
        
        # Process each tab with improved error handling
        for i, tab_element in enumerate(tab_elements):
            tab_text = ''
            try:
                # Get tab label with fallback methods
                tab_text = self._extract_tab_label(tab_element)
                tab_key = self._normalize_tab_key(tab_text)
                
                if not tab_text.strip() or tab_key == 'unknown':
                    continue
                
                tabs_found.append(tab_text)
                logger.debug(f"Processing tab {i+1}: '{tab_text}' -> '{tab_key}'")
                
                # Check if tab is already active
                if self._is_tab_active(tab_element):
                    logger.debug(f"Tab '{tab_text}' is already active")
                else:
                    # Activate the tab
                    if not self._activate_tab(tab_element):
                        tabs_failed.append(tab_text)
                        continue
                
                # Extract content from the now-active tab panel
                content = self._extract_active_tab_content(tab_element)

                if content and content.text.strip():
                    if tab_key in tab_content:
                        # Merge content if tab key already exists
                        merged_text = f"{tab_content[tab_key].text}\n\n{content.text}"
                        merged_markdown = f"{tab_content[tab_key].markdown}\n\n{content.markdown}"
                        tab_content[tab_key] = TabContent(
                            text=merged_text,
                            markdown=merged_markdown,
                            source_tab=tab_key,
                            extraction_method="interactive_merged"
                        )
                    else:
                        tab_content[tab_key] = content
                    
                    tabs_extracted.append(tab_text)
                    logger.debug(f"Extracted {len(content.text)} chars from tab '{tab_text}'")
                else:
                    logger.warning(f"No content extracted from tab '{tab_text}'")
                    tabs_failed.append(tab_text)
                
            except Exception as e:
                logger.warning(f"Failed to process tab {i+1} ('{tab_text}'): {e}")
                if tab_text:
                    tabs_failed.append(tab_text)
        
        success = len(tabs_extracted) > 0
        return {
            'success': success,
            'content': tab_content,
            'tabs_found': tabs_found,
            'tabs_extracted': tabs_extracted,
            'tabs_failed': tabs_failed
        }
    
    def _find_tab_elements(self) -> List:
        """Find all tab elements using multiple selectors with priority."""
        tab_elements = []
        
        for selector in self.tab_selectors:
            try:
                elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                if elements:
                    tab_elements.extend(elements)
                    logger.debug(f"Found {len(elements)} tabs with selector: {selector}")
                    # If we found tabs with a high-priority selector, prefer those
                    if selector in ['.fr-tabs__tab', '[role="tab"]']:
                        break
            except Exception as e:
                logger.debug(f"Tab selector {selector} failed: {e}")
        
        # Remove duplicates while preserving order
        seen = set()
        unique_tabs = []
        for tab in tab_elements:
            tab_id = tab.get_attribute('outerHTML')
            if tab_id not in seen:
                seen.add(tab_id)
                unique_tabs.append(tab)
        
        return unique_tabs
    
    def _extract_tab_label(self, tab_element) -> str:
        """Extract tab label using multiple fallback methods."""
        # Method 1: Get text content directly
        tab_text = self._clean_text(tab_element.text)
        if tab_text:
            return tab_text
        
        # Method 2: Get innerHTML and parse
        try:
            tab_html = tab_element.get_attribute("innerHTML") or ""
            if tab_html:
                tab_text = self._clean_text(BeautifulSoup(tab_html, 'html.parser').get_text())
                if tab_text:
                    return tab_text
        except Exception as e:
            logger.debug(f"Failed to extract tab label from innerHTML: {e}")
        
        # Method 3: Check aria-label or title attributes
        for attr in ['aria-label', 'title', 'data-tab', 'data-label']:
            attr_value = tab_element.get_attribute(attr)
            if attr_value:
                return self._clean_text(attr_value)
        
        return ""
    
    def _is_tab_active(self, tab_element) -> bool:
        """Check if a tab is currently active using multiple indicators."""
        try:
            # Check various active state indicators
            class_attr = tab_element.get_attribute('class') or ''
            aria_selected = tab_element.get_attribute('aria-selected')
            
            return (
                'active' in class_attr or
                'fr-tabs__tab--selected' in class_attr or
                'selected' in class_attr or
                aria_selected == 'true'
            )
        except Exception:
            return False
    
    def _activate_tab(self, tab_element) -> bool:
        """
        Activate a tab using multiple click strategies.
        
        Returns:
            True if tab was successfully activated, False otherwise
        """
        try:
            # Scroll tab into view
            self.driver.execute_script("arguments[0].scrollIntoView(true);", tab_element)
            time.sleep(self.TAB_CLICK_DELAY)
            
            # Check if element is interactable
            if not (tab_element.is_enabled() and tab_element.is_displayed()):
                logger.debug("Tab element is not interactable")
                return False
            
            # Try regular click first
            try:
                tab_element.click()
            except ElementNotInteractableException:
                # Fallback to JavaScript click
                self.driver.execute_script("arguments[0].click();", tab_element)
            
            # Wait for content to load
            time.sleep(self.CONTENT_LOAD_DELAY)
            
            # Verify tab was activated
            return self._is_tab_active(tab_element)
            
        except Exception as e:
            logger.debug(f"Failed to activate tab: {e}")
            return False
    
    def _extract_active_tab_content(self, tab_element) -> Optional[TabContent]:
        """
        Extract content from the currently active tab panel.
        """
        content_selectors = self._get_content_selectors_for_tab(tab_element)
        
        content_texts: List[str] = []
        content_markdowns: List[str] = []
        
        for selector in content_selectors:
            if not selector:
                continue
            
            try:
                panel_elements = self.driver.find_elements(By.CSS_SELECTOR, selector)

                for panel in panel_elements:
                    if panel.is_displayed():
                        panel_html = panel.get_attribute("innerHTML") or ""
                        panel_text = self._clean_text(BeautifulSoup(panel_html, 'html.parser').get_text())
                        
                        if panel_text and len(panel_text) > self.MIN_CONTENT_LENGTH:
                            content_texts.append(panel_text)
                            content_markdowns.append(md(panel_html))

                if content_texts:
                    break
                    
            except Exception as e:
                logger.debug(f"Content selector {selector} failed: {e}")
        
        if not content_texts:
            return None
        
        # Get tab key for source tracking
        tab_text = self._extract_tab_label(tab_element)
        tab_key = self._normalize_tab_key(tab_text)
        
        return TabContent(
            text="\n\n".join(content_texts).strip(),
            markdown="\n\n".join(content_markdowns).strip(),
            source_tab=tab_key,
            extraction_method="interactive"
        )
    
    def _get_content_selectors_for_tab(self, tab_element) -> List[str]:
        """Get prioritized list of content selectors for a specific tab."""
        selectors = []
        
        # Try to find associated panel via aria-controls
        aria_controls = tab_element.get_attribute('aria-controls')
        if aria_controls:
            selectors.append(f"#{aria_controls}")
        
        # Try data attributes
        data_target = tab_element.get_attribute('data-target')
        if data_target:
            selectors.append(data_target)
        
        # Add generic active panel selectors
        selectors.extend([
            '.fr-tabs__panel[aria-hidden="false"]',
            '.fr-tabs__panel.fr-tabs__panel--selected',
            '.tab-pane.active',
            '[role="tabpanel"]:not([hidden])',
            '.fr-tabs__panel:not([hidden])',
        ])
        
        return selectors
    
    def _extract_from_dom(self) -> Dict[str, Any]:
        """
        Extract content from DOM by examining tab panels directly.
        """
        tab_content: Dict[str, TabContent] = {}
        tabs_found = []
        tabs_extracted = []
        
        # Get page source and parse with BeautifulSoup
        soup = BeautifulSoup(self.driver.page_source, 'html.parser')
        
        # Find tab panels in the DOM
        panel_elements = self._find_panel_elements(soup)
        
        logger.info(f"Found {len(panel_elements)} tab panels in DOM")
        
        for panel in panel_elements:
            try:
                # Get panel content
                panel_html = panel.decode_contents() if hasattr(panel, 'decode_contents') else ''
                panel_text = self._clean_text(BeautifulSoup(panel_html, 'html.parser').get_text())
                panel_markdown = md(panel_html) if panel_html else ""

                if not panel_text or len(panel_text) < self.MIN_CONTENT_LENGTH:
                    continue

                # Identify which tab this panel belongs to
                tab_key = self._identify_tab_from_panel(panel, panel_text, soup)

                if tab_key and tab_key != 'unknown':
                    tabs_found.append(tab_key)

                    content = TabContent(
                        text=panel_text,
                        markdown=panel_markdown,
                        source_tab=tab_key,
                        extraction_method="dom"
                    )

                    if tab_key in tab_content:
                        # Merge content if key already exists
                        merged_text = f"{tab_content[tab_key].text}\n\n{panel_text}"
                        merged_markdown = f"{tab_content[tab_key].markdown}\n\n{panel_markdown}"
                        tab_content[tab_key] = TabContent(
                            text=merged_text,
                            markdown=merged_markdown,
                            source_tab=tab_key,
                            extraction_method="dom_merged"
                        )
                    else:
                        tab_content[tab_key] = content

                    tabs_extracted.append(tab_key)
                    logger.debug(f"Extracted {len(panel_text)} chars for tab '{tab_key}'")

            except Exception as e:
                logger.warning(f"Failed to process panel: {e}")
        
        return {
            'content': tab_content,
            'tabs_found': tabs_found,
            'tabs_extracted': tabs_extracted
        }
    
    def _find_panel_elements(self, soup: BeautifulSoup) -> List:
        """Find all panel elements in the DOM."""
        panel_elements = []
        
        for selector in self.panel_selectors:
            try:
                panels = soup.select(selector)
                panel_elements.extend(panels)
            except Exception as e:
                logger.debug(f"Panel selector {selector} failed: {e}")
        
        return panel_elements
    
    def _identify_tab_from_panel(self, panel, panel_text: str, soup: BeautifulSoup) -> str:
        """
        Identify which tab a panel belongs to based on ID, content, or structure.
        """
        # Strategy 1: Use panel ID to find associated tab
        panel_id = panel.get('id', '')
        if panel_id:
            tab_button = soup.select_one(f'[aria-controls="{panel_id}"]')
            if tab_button:
                tab_html = tab_button.decode_contents()
                tab_text = self._clean_text(BeautifulSoup(tab_html, 'html.parser').get_text())
                return self._normalize_tab_key(tab_text)
        
        # Strategy 2: Content-based analysis with enhanced heuristics
        panel_text_lower = panel_text.lower()
        
        content_indicators = {
            'presentation': [
                'objectif', 'description', 'présentation', 'contexte', 'but',
                'finalité', 'enjeu', 'stratégique', 'général'
            ],
            'pour_qui': [
                'bénéficiaire', 'éligible', 'condition', 'qui peut', 'destinataire',
                'exploitant', 'agriculteur', 'entreprise', 'organisme'
            ],
            'quand': [
                'date', 'délai', 'calendrier', 'échéance', 'période', 'avant le',
                'jusqu\'au', 'dépôt', 'candidature', 'limite'
            ],
            'comment': [
                'démarche', 'procédure', 'candidature', 'dossier', 'comment',
                'modalité', 'étape', 'formulaire', 'document'
            ]
        }
        
        # Score each tab type based on keyword frequency
        scores = {}
        for tab_type, indicators in content_indicators.items():
            score = sum(panel_text_lower.count(indicator) for indicator in indicators)
            if score > 0:
                scores[tab_type] = score
        
        if scores:
            return max(scores, key=scores.get)
        
        # Strategy 3: Structural analysis
        if len(panel_text) > 500 and any(word in panel_text_lower for word in ['objectif', 'aide']):
            return 'presentation'
        elif any(word in panel_text_lower for word in ['formulaire', 'document', 'pièce']):
            return 'comment'
        elif len(panel_text) > 200:
            return 'main_content'
        else:
            return 'additional_content'
    
    def _extract_generic_content(self) -> Dict[str, Any]:
        """
        Fallback method to extract any available content from the page.
        """
        soup = BeautifulSoup(self.driver.page_source, 'html.parser')

        # Remove unwanted elements
        for tag in soup(['header', 'footer', 'nav', 'script', 'style', 'meta']):
            tag.decompose()

        # Extract main content with multiple strategies
        main_html = self._extract_main_content_html(soup)
        
        if not main_html:
            return {'content': {}}

        main_text = self._clean_text(BeautifulSoup(main_html, 'html.parser').get_text())
        main_markdown = md(main_html)

        if not main_text or len(main_text) < self.MIN_CONTENT_LENGTH:
            return {'content': {}}

        content = TabContent(
            text=main_text,
            markdown=main_markdown,
            source_tab='main_content',
            extraction_method="generic_fallback"
        )

        return {
            'content': {'main_content': content}
        }
    
    def _extract_main_content_html(self, soup: BeautifulSoup) -> str:
        """Extract main content HTML using multiple strategies."""
        content_selectors = [
            'main', '[role="main"]', '.main-content', '.content',
            'article', '.entry-content', '.post-content', '.fr-container',
            '.container', '#content', '.page-content'
        ]

        for selector in content_selectors:
            content_elem = soup.select_one(selector)
            if content_elem:
                return content_elem.decode_contents()

        # Fallback to body content (filtered)
        body = soup.find('body')
        if body:
            # Remove navigation and other non-content elements
            for unwanted in body.select('nav, header, footer, aside, .breadcrumb'):
                unwanted.decompose()
            return body.decode_contents()

        return ""
    
    def _extract_all_attachments(self, tab_content: Dict[str, TabContent]) -> List[Dict[str, str]]:
        """
        Extract document attachments from all tab content and current page.
        """
        attachments = []
        soup = BeautifulSoup(self.driver.page_source, 'html.parser')
        base_url = self.driver.current_url
        
        # Find all document links
        for link in soup.find_all('a', href=True):
            href = link.get('href', '')
            link_text = self._clean_text(link.get_text())
            
            # Check if link points to a document
            if self._is_document_link(href):
                # Resolve relative URLs
                full_url = urljoin(base_url, href)
                
                # Determine which tab this link was found in
                source_tab = self._determine_link_source_tab(link, tab_content)
                
                # Extract additional metadata
                file_size = self._extract_file_size(link)
                file_type = self._get_file_type(href)
                
                attachment = {
                    'url': full_url,
                    'text': link_text or 'Document',
                    'filename': self._extract_filename(href),
                    'source_tab': source_tab,
                    'extension': file_type,
                    'file_size': file_size,
                    'link_context': self._get_link_context(link)
                }
                
                attachments.append(attachment)
        
        # Remove duplicates based on URL
        return self._deduplicate_attachments(attachments)
    
    def _is_document_link(self, href: str) -> bool:
        """Check if a link points to a document."""
        return any(ext in href.lower() for ext in self.document_extensions)
    
    def _extract_filename(self, href: str) -> str:
        """Extract filename from URL."""
def _enhance_with_multitab_data(extracted: Dict[str, Any], extraction_result: ExtractionResult, url: str) -> Dict[str, Any]:
    """Enhance extracted data with multi-tab specific information."""
    parsed_url = urlparse(url)
    
    # Convert TabContent objects to dictionaries for JSON serialization
    serializable_tab_content = {}
    for key, content in extraction_result.tab_content.items():
        serializable_tab_content[key] = {
            'text': content.text,
            'markdown': content.markdown,
            'source_tab': content.source_tab,
            'extraction_method': content.extraction_method,
            'content_length': content.content_length
        }
    
    # Enhance the extracted data
    extracted.update({
        'multi_tab_content': serializable_tab_content,
        'combined_tab_text': extraction_result.combined_text,
        'combined_tab_markdown': extraction_result.combined_markdown,
        'extraction_metadata': extraction_result.extraction_metadata,
        'documents': extraction_result.attachments,
        'source_url': url,
        'domain': parsed_url.netloc,
        'extraction_success': extraction_result.success,
        'total_content_length': extraction_result.total_content_length
    })
    
    # Generate code if missing
    if not extracted.get('code'):
        extracted['code'] = _generate_subsidy_code(extracted.get('title', ''), url)
    
    return extracted


def _generate_subsidy_code(title: str, url: str) -> str:
    """Generate a unique code for the subsidy."""
    if title:
        # Use title-based code
        code_base = re.sub(r'[^a-zA-Z0-9]', '', title[:20])
        if code_base:
            return f"AUTO_{code_base.upper()}"
    
    # Fallback to URL-based code
    parsed_url = urlparse(url)
    path_parts = [part for part in parsed_url.path.split('/') if part]
    
    if path_parts:
        code_part = re.sub(r'[^a-zA-Z0-9]', '', path_parts[-1])
        if code_part:
            return f"AUTO_{code_part.upper()[:20]}"
    
    # Final fallback
    return f"AUTO_UNKNOWN_{int(time.time())}"


def _validate_extraction_quality(extracted_data: Dict[str, Any]) -> bool:
    """
    Validate that the extraction contains meaningful content.
    
    Args:
        extracted_data: Dictionary containing extracted subsidy data
        
    Returns:
        True if extraction quality is acceptable, False otherwise
    """
    # Check for basic required fields
    if not extracted_data.get('title') and not extracted_data.get('description'):
        logger.warning("No title or description found")
        return False
    
    # Check for minimum content
    combined_text = extracted_data.get('combined_tab_text', '')
    if len(combined_text.strip()) < MultiTabExtractor.MIN_CONTENT_LENGTH:
        logger.warning(f"Insufficient content: {len(combined_text)} characters")
        return False
    
    # Check extraction metadata
    metadata = extracted_data.get('extraction_metadata', {})
    if metadata.get('error'):
        logger.warning(f"Extraction error present: {metadata['error']}")
        return False
    
    # Check completeness score
    completeness_score = metadata.get('completeness_score', 0)
    if completeness_score < 0.1:  # Very low threshold for acceptance
        logger.warning(f"Very low completeness score: {completeness_score}")
        return False
    
    return True


"""End of module definitions"""

# Export main classes and functions
__all__ = [
    "MultiTabExtractor",
    "TabContent",
    "ExtractionResult",
    "extract_multi_tab_content",
    "enhanced_extract_subsidy_details",
]

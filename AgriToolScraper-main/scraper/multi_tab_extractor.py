# multi_tab_extractor.py
"""
Enhanced multi-tab content extractor for FranceAgriMer subsidy pages.
Captures complete content from all tabs (Présentation, Pour qui?, Quand?, Comment?)
using dynamic tab activation and comprehensive content extraction.
"""

import json
import time
import logging
from typing import Dict, List, Any, Optional, Tuple
from urllib.parse import urljoin
from bs4 import BeautifulSoup

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, ElementNotInteractableException

from .core import init_driver


logger = logging.getLogger(__name__)


class MultiTabExtractor:
    """Enhanced extractor for multi-tab FranceAgriMer subsidy pages."""
    
    def __init__(self, driver=None, timeout: int = 15):
        """
        Initialize the multi-tab extractor.
        
        Args:
            driver: Optional Selenium WebDriver instance. If None, creates new one.
            timeout: Default timeout for element waits.
        """
        self.driver = driver
        self.timeout = timeout
        self.should_quit_driver = driver is None
        
        # Common FranceAgriMer tab selectors
        self.tab_selectors = [
            '.fr-tabs__tab',               # DSFR standard tabs
            '[role="tab"]',                # ARIA tabs
            '.fr-tabs__list .fr-tabs__tab', # Nested DSFR tabs
            '.tabs-nav a',                 # Generic tab navigation
            '.nav-tabs .nav-link'          # Bootstrap-style tabs
        ]
        
        # Tab content panel selectors
        self.panel_selectors = [
            '.fr-tabs__panel',             # DSFR standard panels
            '[role="tabpanel"]',           # ARIA panels
            '.tab-pane',                   # Bootstrap-style panels
            '.tab-content > div'           # Generic tab content
        ]
        
        # Expected tab labels for FranceAgriMer (with variations)
        self.expected_tabs = {
            'presentation': ['présentation', 'description', 'objectifs', 'contexte'],
            'pour_qui': ['pour qui', 'pour qui ?', 'bénéficiaires', 'éligibilité', 'qui peut en bénéficier'],
            'quand': ['quand', 'quand ?', 'délais', 'calendrier', 'dates', 'échéances'],
            'comment': ['comment', 'comment ?', 'démarches', 'procédure', 'modalités', 'candidature']
        }
    
    def extract_all_tabs(self, url: str) -> Dict[str, Any]:
        """
        Extract content from all tabs on a FranceAgriMer subsidy page.
        
        Args:
            url: URL of the subsidy detail page
            
        Returns:
            Dictionary containing:
            - tab_content: Dict with tab content by name
            - combined_text: All tab content combined with section markers
            - attachments: List of document links found across all tabs
            - extraction_metadata: Metadata about the extraction process
        """
        if not self.driver:
            self.driver = init_driver()
        
        try:
            logger.info(f"Loading page: {url}")
            self.driver.get(url)
            
            # Wait for page to load
            WebDriverWait(self.driver, self.timeout).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            
            # Additional wait for DSFR components to initialize
            time.sleep(2)
            
            # Store original HTML for title extraction
            original_html = self.driver.page_source
            
            # Extract tab content
            tab_results = self._extract_tab_content()
            
            # Extract attachments from all content
            attachments = self._extract_all_attachments(tab_results['tab_content'])
            
            # Combine all text with section markers
            combined_text = self._combine_tab_content(tab_results['tab_content'])
            
            # Prepare result
            result = {
                'url': url,
                'tab_content': tab_results['tab_content'],
                'combined_text': combined_text,
                'attachments': attachments,
                'original_html': original_html,  # Store original HTML for title extraction
                'extraction_metadata': {
                    'tabs_found': tab_results['tabs_found'],
                    'tabs_extracted': tab_results['tabs_extracted'],
                    'tabs_failed': tab_results['tabs_failed'],
                    'method_used': tab_results['method_used'],
                    'completeness_score': self._calculate_completeness_score(tab_results['tab_content']),
                    'total_content_length': len(combined_text),
                    'extraction_timestamp': time.time()
                }
            }
            
            logger.info(f"Multi-tab extraction completed. Found {len(tab_results['tab_content'])} tabs, "
                       f"{len(attachments)} attachments, {len(combined_text)} chars total")
            
            return result
            
        except Exception as e:
            logger.error(f"Multi-tab extraction failed for {url}: {e}")
            return {
                'url': url,
                'tab_content': {},
                'combined_text': '',
                'attachments': [],
                'extraction_metadata': {
                    'error': str(e),
                    'extraction_timestamp': time.time()
                }
            }
        
        finally:
            if self.should_quit_driver and self.driver:
                self.driver.quit()
    
    def _extract_tab_content(self) -> Dict[str, Any]:
        """
        Extract content from all available tabs using multiple strategies.
        
        Returns:
            Dictionary with extraction results and metadata
        """
        tab_content = {}
        tabs_found = []
        tabs_extracted = []
        tabs_failed = []
        method_used = "unknown"
        
        # Strategy 1: Try interactive tab clicking (for AJAX tabs)
        try:
            interactive_result = self._extract_with_tab_clicking()
            if interactive_result['success']:
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
        
        # Strategy 2: Extract from DOM (for hidden tabs)
        if not tab_content:
            try:
                dom_result = self._extract_from_dom()
                tab_content.update(dom_result['content'])
                tabs_found.extend(dom_result['tabs_found'])
                tabs_extracted.extend(dom_result['tabs_extracted'])
                method_used = "dom_extraction"
                logger.info("Successfully used DOM extraction method")
            except Exception as e:
                logger.warning(f"DOM extraction failed: {e}")
        
        # Strategy 3: Fallback to generic content extraction
        if not tab_content:
            try:
                fallback_result = self._extract_generic_content()
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
        tab_content = {}
        tabs_found = []
        tabs_extracted = []
        tabs_failed = []
        
        # Find all tab elements
        tab_elements = []
        for selector in self.tab_selectors:
            try:
                elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                tab_elements.extend(elements)
            except Exception as e:
                logger.debug(f"Tab selector {selector} failed: {e}")
        
        if not tab_elements:
            return {'success': False, 'content': {}, 'tabs_found': [], 'tabs_extracted': [], 'tabs_failed': []}
        
        logger.info(f"Found {len(tab_elements)} potential tab elements")
        
        # Process each tab
        for i, tab_element in enumerate(tab_elements):
            try:
                # Get tab label
                tab_text = self._clean_text(tab_element.text or tab_element.get_attribute('textContent') or '')
                tab_key = self._normalize_tab_key(tab_text)
                
                if not tab_text.strip():
                    continue
                
                tabs_found.append(tab_text)
                logger.debug(f"Processing tab {i+1}: '{tab_text}' -> '{tab_key}'")
                
                # Check if tab is already active
                is_active = (
                    'active' in (tab_element.get_attribute('class') or '') or
                    tab_element.get_attribute('aria-selected') == 'true' or
                    'fr-tabs__tab--selected' in (tab_element.get_attribute('class') or '')
                )
                
                if not is_active:
                    # Click the tab to activate it
                    try:
                        self.driver.execute_script("arguments[0].scrollIntoView(true);", tab_element)
                        time.sleep(0.5)
                        
                        if tab_element.is_enabled() and tab_element.is_displayed():
                            tab_element.click()
                        else:
                            # Try JavaScript click if regular click fails
                            self.driver.execute_script("arguments[0].click();", tab_element)
                        
                        # Wait for content to load
                        time.sleep(1)
                        
                    except (ElementNotInteractableException, TimeoutException) as e:
                        logger.warning(f"Could not click tab '{tab_text}': {e}")
                        tabs_failed.append(tab_text)
                        continue
                
                # Extract content from the now-active tab panel
                content = self._extract_active_tab_content(tab_element)
                
                if content and content.strip():
                    if tab_key in tab_content:
                        # Merge content if tab key already exists
                        tab_content[tab_key] += "\n\n" + content
                    else:
                        tab_content[tab_key] = content
                    tabs_extracted.append(tab_text)
                    logger.debug(f"Extracted {len(content)} chars from tab '{tab_text}'")
                else:
                    logger.warning(f"No content extracted from tab '{tab_text}'")
                    tabs_failed.append(tab_text)
                
            except Exception as e:
                logger.warning(f"Failed to process tab {i+1}: {e}")
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
    
    def _extract_active_tab_content(self, tab_element) -> str:
        """
        Extract content from the currently active tab panel.
        """
        content_selectors = [
            # Try to find associated panel via aria-controls
            f"#{tab_element.get_attribute('aria-controls')}" if tab_element.get_attribute('aria-controls') else None,
            # Try common active panel selectors
            '.fr-tabs__panel[aria-hidden="false"]',
            '.fr-tabs__panel.fr-tabs__panel--selected',
            '.tab-pane.active',
            '[role="tabpanel"]:not([hidden])',
            # Fallback to any visible panel
            '.fr-tabs__panel:not([hidden])',
        ]
        
        content_text = ""
        
        for selector in content_selectors:
            if not selector:
                continue
            
            try:
                panel_elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                
                for panel in panel_elements:
                    if panel.is_displayed():
                        panel_text = self._clean_text(panel.text or panel.get_attribute('textContent') or '')
                        if panel_text and len(panel_text) > 20:  # Only meaningful content
                            content_text += panel_text + "\n\n"
                
                if content_text.strip():
                    break
                    
            except Exception as e:
                logger.debug(f"Content selector {selector} failed: {e}")
        
        return content_text.strip()
    
    def _extract_from_dom(self) -> Dict[str, Any]:
        """
        Extract content from DOM by examining hidden tab panels directly.
        """
        tab_content = {}
        tabs_found = []
        tabs_extracted = []
        
        # Get page source and parse with BeautifulSoup for better DOM manipulation
        soup = BeautifulSoup(self.driver.page_source, 'html.parser')
        
        # Find tab panels in the DOM
        panel_elements = []
        for selector in self.panel_selectors:
            panels = soup.select(selector)
            panel_elements.extend(panels)
        
        logger.info(f"Found {len(panel_elements)} tab panels in DOM")
        
        for panel in panel_elements:
            try:
                # Get panel content
                panel_text = self._clean_text(panel.get_text())
                
                if not panel_text or len(panel_text) < 20:
                    continue
                
                # Try to identify which tab this panel belongs to
                panel_id = panel.get('id', '')
                tab_key = self._identify_tab_from_panel(panel, panel_text, soup)
                
                if tab_key:
                    tabs_found.append(tab_key)
                    
                    if tab_key in tab_content:
                        # Merge content if key already exists
                        tab_content[tab_key] += "\n\n" + panel_text
                    else:
                        tab_content[tab_key] = panel_text
                    
                    tabs_extracted.append(tab_key)
                    logger.debug(f"Extracted {len(panel_text)} chars for tab '{tab_key}'")
                
            except Exception as e:
                logger.warning(f"Failed to process panel: {e}")
        
        return {
            'content': tab_content,
            'tabs_found': tabs_found,
            'tabs_extracted': tabs_extracted
        }
    
    def _identify_tab_from_panel(self, panel, panel_text: str, soup) -> str:
        """
        Identify which tab a panel belongs to based on ID, label, or content.
        """
        # Strategy 1: Use panel ID to find associated tab
        panel_id = panel.get('id', '')
        if panel_id:
            # Look for tab with aria-controls pointing to this panel
            tab_button = soup.select_one(f'[aria-controls="{panel_id}"]')
            if tab_button:
                tab_text = self._clean_text(tab_button.get_text())
                return self._normalize_tab_key(tab_text)
        
        # Strategy 2: Analyze content to guess tab type
        panel_text_lower = panel_text.lower()
        
        # Content-based heuristics
        content_indicators = {
            'presentation': ['objectif', 'description', 'présentation', 'contexte', 'but'],
            'pour_qui': ['bénéficiaire', 'éligible', 'condition', 'qui peut', 'destinataire'],
            'quand': ['date', 'délai', 'calendrier', 'échéance', 'période', 'avant le'],
            'comment': ['démarche', 'procédure', 'candidature', 'dossier', 'comment', 'modalité']
        }
        
        for tab_type, indicators in content_indicators.items():
            if any(indicator in panel_text_lower for indicator in indicators):
                return tab_type
        
        # Strategy 3: Use position-based fallback
        # Return generic key based on content length and structure
        if len(panel_text) > 500:
            return 'main_content'
        elif any(word in panel_text_lower for word in ['formulaire', 'document', 'pièce']):
            return 'documents'
        else:
            return 'additional_content'
    
    def _extract_generic_content(self) -> Dict[str, Any]:
        """
        Fallback method to extract any available content from the page.
        """
        soup = BeautifulSoup(self.driver.page_source, 'html.parser')
        
        # Remove navigation and footer elements
        for tag in soup(['header', 'footer', 'nav', 'script', 'style']):
            tag.decompose()
        
        # Extract main content
        main_content = ""
        content_selectors = [
            'main', '[role="main"]', '.main-content', '.content', 
            'article', '.entry-content', '.post-content'
        ]
        
        for selector in content_selectors:
            content_elem = soup.select_one(selector)
            if content_elem:
                main_content = self._clean_text(content_elem.get_text())
                break
        
        if not main_content:
            # Fallback to body content
            body = soup.find('body')
            if body:
                main_content = self._clean_text(body.get_text())
        
        return {
            'content': {'main_content': main_content} if main_content else {}
        }
    
    def _extract_all_attachments(self, tab_content: Dict[str, str]) -> List[Dict[str, str]]:
        """
        Extract document attachments from all tab content and current page.
        """
        attachments = []
        
        # Get current page source
        soup = BeautifulSoup(self.driver.page_source, 'html.parser')
        base_url = self.driver.current_url
        
        # Find all document links
        document_extensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.txt']
        
        for link in soup.find_all('a', href=True):
            href = link.get('href', '')
            link_text = self._clean_text(link.get_text())
            
            # Check if link points to a document
            if any(ext in href.lower() for ext in document_extensions):
                # Resolve relative URLs
                full_url = urljoin(base_url, href)
                
                # Determine which tab this link was found in
                source_tab = self._determine_link_source_tab(link, tab_content)
                
                attachment = {
                    'url': full_url,
                    'text': link_text,
                    'filename': href.split('/')[-1] if '/' in href else href,
                    'source_tab': source_tab,
                    'extension': next((ext for ext in document_extensions if ext in href.lower()), 'unknown')
                }
                
                attachments.append(attachment)
        
        # Remove duplicates based on URL
        seen_urls = set()
        unique_attachments = []
        for attachment in attachments:
            if attachment['url'] not in seen_urls:
                seen_urls.add(attachment['url'])
                unique_attachments.append(attachment)
        
        logger.info(f"Found {len(unique_attachments)} unique document attachments")
        
        return unique_attachments
    
    def _determine_link_source_tab(self, link_element, tab_content: Dict[str, str]) -> str:
        """
        Determine which tab a document link belongs to based on its context.
        """
        # Get the link text and surrounding context
        link_text = self._clean_text(link_element.get_text()).lower()
        
        # Get parent context
        parent = link_element.parent
        context_text = ""
        while parent and len(context_text) < 200:
            context_text += self._clean_text(parent.get_text()).lower()
            parent = parent.parent
            if not parent or parent.name == 'body':
                break
        
        # Match against tab content to find best fit
        for tab_name, tab_text in tab_content.items():
            if link_text in tab_text.lower() or any(word in context_text for word in tab_text.lower().split()[:20]):
                return tab_name
        
        return 'unknown'
    
    def _combine_tab_content(self, tab_content: Dict[str, str]) -> str:
        """
        Combine all tab content into a single text with clear section markers.
        """
        if not tab_content:
            return ""
        
        # Define preferred order for tabs
        preferred_order = ['presentation', 'pour_qui', 'quand', 'comment']
        
        combined_parts = []
        
        # Add tabs in preferred order first
        for tab_key in preferred_order:
            if tab_key in tab_content:
                section_name = self._get_section_name(tab_key)
                content = tab_content[tab_key].strip()
                if content:
                    combined_parts.append(f"== {section_name} ==\n{content}")
        
        # Add any remaining tabs
        for tab_key, content in tab_content.items():
            if tab_key not in preferred_order:
                section_name = self._get_section_name(tab_key)
                content = content.strip()
                if content:
                    combined_parts.append(f"== {section_name} ==\n{content}")
        
        return "\n\n".join(combined_parts)
    
    def _get_section_name(self, tab_key: str) -> str:
        """
        Get a human-readable section name for a tab key.
        """
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
        
        # Fallback: create key from text
        normalized = tab_text_lower.replace(' ', '_').replace('?', '').replace('é', 'e')
        return ''.join(c for c in normalized if c.isalnum() or c == '_')
    
    def _calculate_completeness_score(self, tab_content: Dict[str, str]) -> float:
        """
        Calculate a completeness score based on extracted content.
        """
        if not tab_content:
            return 0.0
        
        # Check for presence of expected tab types
        expected_count = len(self.expected_tabs)
        found_count = 0
        
        for expected_key in self.expected_tabs.keys():
            if expected_key in tab_content and len(tab_content[expected_key]) > 50:
                found_count += 1
        
        # Base score on tab coverage
        coverage_score = found_count / expected_count
        
        # Bonus for total content amount
        total_length = sum(len(content) for content in tab_content.values())
        length_bonus = min(0.2, total_length / 10000)  # Up to 20% bonus for substantial content
        
        return min(1.0, coverage_score + length_bonus)
    
    def _clean_text(self, text: str) -> str:
        """
        Clean and normalize text content.
        """
        if not text:
            return ""
        
        # Remove extra whitespace and normalize
        import re
        text = re.sub(r'\s+', ' ', text.strip())
        text = re.sub(r'\n\s*\n', '\n\n', text)  # Normalize paragraph breaks
        
        return text


def extract_multi_tab_content(url: str, driver=None) -> Dict[str, Any]:
    """
    Convenience function to extract multi-tab content from a single URL.
    
    Args:
        url: URL of the subsidy detail page
        driver: Optional existing WebDriver instance
        
    Returns:
        Dictionary containing extracted tab content and metadata
    """
    extractor = MultiTabExtractor(driver=driver)
    return extractor.extract_all_tabs(url)


# Integration with existing extraction pipeline
def enhanced_extract_subsidy_details(url: str) -> Optional[Dict[str, Any]]:
    """
    Enhanced version of extract_subsidy_details with multi-tab support.
    
    Returns structured subsidy data with comprehensive tab content.
    """
    try:
        # Extract multi-tab content
        multi_tab_result = extract_multi_tab_content(url)
        
        if not multi_tab_result.get('tab_content'):
            logger.warning(f"No tab content extracted from {url}")
            return None
        
        # Parse structured data from combined content
        from .discovery import extract_structured_content
        from urllib.parse import urlparse
        import re
        
        # Create soup from combined text for structured extraction with proper title extraction
        # Use the original page HTML for title extraction, then augment with tab content
        from .discovery import extract_structured_content
        from urllib.parse import urlparse
        import re
        
        # First extract title from the original page
        original_soup = BeautifulSoup(multi_tab_result.get('original_html', ''), 'html.parser')
        
        # Try enhanced title extraction on original HTML
        try:
            from enhanced_title_extractor import extract_enhanced_title
            extracted_title = extract_enhanced_title(soup=original_soup, url=url)
        except ImportError:
            extracted_title = None
        
        # Create enriched soup that preserves title but includes tab content
        if extracted_title:
            fake_html = f"<html><body><h1>{extracted_title}</h1><div>{multi_tab_result['combined_text']}</div></body></html>"
        else:
            fake_html = f"<html><body><div>{multi_tab_result['combined_text']}</div></body></html>"
        
        soup = BeautifulSoup(fake_html, 'html.parser')
        
        extracted = extract_structured_content(soup, url)
        
        # Enhance with multi-tab specific data
        extracted.update({
            'multi_tab_content': multi_tab_result['tab_content'],
            'combined_tab_text': multi_tab_result['combined_text'],
            'extraction_metadata': multi_tab_result['extraction_metadata'],
            'documents': multi_tab_result['attachments'],
            'source_url': url,
            'domain': urlparse(url).netloc
        })
        
        # Generate code if missing
        if not extracted.get('code'):
            if extracted.get('title'):
                code_base = re.sub(r'[^a-zA-Z0-9]', '', extracted['title'][:20])
                extracted['code'] = f"AUTO_{code_base.upper()}"
            else:
                path_parts = urlparse(url).path.split('/')
                code_part = next((part for part in reversed(path_parts) if part), 'unknown')
                extracted['code'] = f"AUTO_{code_part.upper()}"
        
        # Validate meaningful content
        if not extracted['title'] and not extracted['description'] and not multi_tab_result['combined_text']:
            logger.warning(f"No meaningful content extracted from {url}")
            return None
        
        return extracted
        
    except Exception as e:
        logger.error(f"Enhanced extraction failed for {url}: {e}")
        return None
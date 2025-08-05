"""
Enhanced content discovery and extraction for subsidy detail pages.
Provides comprehensive content extraction with DSFR support, pattern matching,
and robust fallback mechanisms.
"""

import os
import time
import re
import logging
from typing import Dict, List, Optional, Any, Tuple, Union
from urllib.parse import urljoin, urlparse
from datetime import datetime
from dataclasses import dataclass, asdict

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException
from bs4 import BeautifulSoup, Tag
from markdownify import markdownify as md

from .core import init_driver, detect_language, guess_canonical_field_fr, log_unmapped_label
from .ro_utils import parse_romanian_date, validate_county_list


logger = logging.getLogger(__name__)


@dataclass
class AmountRange:
    """Data class for monetary amount ranges."""
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    currency: str = "EUR"
    raw_text: str = ""
    
    @property
    def as_array(self) -> List[float]:
        """Return as array format for API compatibility."""
        if self.min_amount is not None and self.max_amount is not None:
            return [self.min_amount, self.max_amount]
        elif self.max_amount is not None:
            return [self.max_amount]
        elif self.min_amount is not None:
            return [self.min_amount]
        return []


@dataclass
class ExtractedDocument:
    """Data class for document attachments."""
    url: str
    text: str
    filename: str
    file_type: str
    file_size: Optional[str] = None
    mandatory: Optional[bool] = None
    source_section: str = "unknown"


@dataclass
class StructuredContent:
    """Data class for structured content extraction results."""
    title: Optional[str] = None
    title_markdown: Optional[str] = None
    description: Optional[str] = None
    description_markdown: Optional[str] = None
    eligibility: Optional[str] = None
    eligibility_markdown: Optional[str] = None
    deadline: Optional[str] = None
    deadline_markdown: Optional[str] = None
    agency: Optional[str] = None
    agency_markdown: Optional[str] = None
    amount_range: Optional[AmountRange] = None
    categories: List[str] = None
    region: List[str] = None
    documents: List[ExtractedDocument] = None
    language: List[str] = None
    source_url: str = ""
    domain: str = ""
    code: str = ""
    raw_content: Dict[str, List[Dict[str, str]]] = None
    extraction_metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        """Initialize mutable default values."""
        if self.categories is None:
            self.categories = []
        if self.region is None:
            self.region = []
        if self.documents is None:
            self.documents = []
        if self.language is None:
            self.language = ['fr']
        if self.raw_content is None:
            self.raw_content = {}
        if self.extraction_metadata is None:
            self.extraction_metadata = {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary with proper serialization."""
        result = asdict(self)
        
        # Convert AmountRange to array format
        if self.amount_range:
            result['amount'] = self.amount_range.as_array
            result['amount_min'] = self.amount_range.min_amount
            result['amount_max'] = self.amount_range.max_amount
        else:
            result['amount'] = []
            result['amount_min'] = None
            result['amount_max'] = None
        
        # Remove the amount_range field from result
        result.pop('amount_range', None)
        
        return result


class ContentExtractor:
    """Enhanced content extractor with configurable extraction strategies."""
    
    # Extraction patterns and configurations
    MONETARY_PATTERNS = [
        r'(\d{1,3}(?:\s?\d{3})*(?:[,\.]\d{2})?)\s*(?:€|euros?)',  # 10 000€, 10.000,50€
        r'(?:€|euros?)\s*(\d{1,3}(?:\s?\d{3})*(?:[,\.]\d{2})?)',  # €10 000
        r'(\d{1,3}(?:\s?\d{3})*)\s*(?:euros?)',  # 10000 euros
        r'maximum?\s*(?:de\s*)?(\d{1,3}(?:\s?\d{3})*(?:[,\.]\d{2})?)',  # maximum de 50000
        r"jusqu['\"]?à\s*(\d{1,3}(?:\s?\d{3})*(?:[,\.]\d{2})?)",  # jusqu'à 75000
        r'plafond\s*(?:de\s*)?(\d{1,3}(?:\s?\d{3})*(?:[,\.]\d{2})?)',  # plafond de 100000
        r'entre\s*(\d{1,3}(?:\s?\d{3})*)\s*et\s*(\d{1,3}(?:\s?\d{3})*)',  # entre 5000 et 50000
        r'de\s*(\d{1,3}(?:\s?\d{3})*)\s*à\s*(\d{1,3}(?:\s?\d{3})*)',  # de 5000 à 50000
        r'(\d{1,3}(?:[\.\s]\d{3})*(?:,\d{2})?)\s*(?:lei|ron)',  # 10.000,50 lei
        r'(?:lei|ron)\s*(\d{1,3}(?:[\.\s]\d{3})*(?:,\d{2})?)',  # lei 10.000,50
    ]
    
    DATE_PATTERNS = [
        r'(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})',  # DD/MM/YYYY, DD-MM-YYYY
        r'(\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4})',
        r'(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})',  # YYYY/MM/DD
        r'(?:avant\s+le|jusqu[\'""]?au?|limite)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})',
        r'(?:date\s+limite|échéance)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})',
    ]
    
    DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.txt', '.odt', '.ods']
    
    def __init__(self):
        """Initialize the content extractor."""
        self.dsfr_field_mapping = {
            'description': ['description', 'présentation', 'objectifs', 'contexte', 'finalité'],
            'eligibility': ['éligibilité', 'conditions', 'bénéficiaires', 'qui peut', 'destinataires'],
            'deadline': ['délais', 'calendrier', 'dates', 'échéances', 'planning', 'temporalité'],
            'documents': ['documents', 'pièces jointes', 'formulaires', 'annexes', 'supports'],
            'agency': ['organisme', 'contact', 'administration', 'service', 'responsable'],
            'amount': ['montant', 'budget', 'financement', 'aide', 'subvention']
        }
        
        self.title_selectors = [
            'h1', '.entry-title', '.post-title', 'h1.title',
            '.fr-h1', '[role="heading"][aria-level="1"]',
            '.page-title', '.article-title', '.subsidy-title'
        ]
        
        self.content_selectors = [
            '.entry-content', '.post-content', '.content', 'article',
            '.main-content', '#content', '[role="main"]', '.fr-container',
            '.container', '.page-content', '.subsidy-content'
        ]
    
    def clean_text(self, text: str) -> str:
        """Clean and normalize extracted text with enhanced cleaning rules."""
        if not text:
            return ""
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Remove common artifacts
        text = re.sub(r'[\r\n\t]+', ' ', text)
        
        # Remove repeated punctuation
        text = re.sub(r'([^\w\s])\1{2,}', r'\1', text)
        
        # Clean up common web artifacts
        text = re.sub(r'^\s*[\d\s\-\|]+\s*$', '', text, flags=re.MULTILINE)
        text = re.sub(r'\s*\n\s*\n\s*', '\n\n', text)
        
        # Remove excessive spaces around punctuation
        text = re.sub(r'\s*([,.;:!?])\s*', r'\1 ', text)
        
        return text.strip()
    
    def extract_amounts_from_text(self, text: str) -> AmountRange:
        """Extract monetary amounts from text with enhanced pattern matching."""
        if not text:
            return AmountRange()
        
        found_amounts = []
        text_lower = text.lower()
        
        for pattern in self.MONETARY_PATTERNS:
            matches = re.finditer(pattern, text_lower)
            for match in matches:
                if match.groups():
                    # Handle range patterns (group 1 and 2)
                    if len(match.groups()) >= 2 and match.group(2):
                        # Range pattern: "entre X et Y" or "de X à Y"
                        try:
                            min_val = self._parse_amount_string(match.group(1))
                            max_val = self._parse_amount_string(match.group(2))
                            if min_val and max_val:
                                return AmountRange(
                                    min_amount=min_val,
                                    max_amount=max_val,
                                    raw_text=match.group(0)
                                )
                        except (ValueError, IndexError):
                            continue
                    else:
                        # Single amount
                        try:
                            amount = self._parse_amount_string(match.group(1))
                            if amount:
                                found_amounts.append((amount, match.group(0)))
                        except (ValueError, IndexError):
                            continue
        
        if found_amounts:
            # Sort amounts and determine if we have a range
            amounts_only = [amt[0] for amt in found_amounts]
            amounts_only.sort()
            
            if len(amounts_only) > 1:
                return AmountRange(
                    min_amount=amounts_only[0],
                    max_amount=amounts_only[-1],
                    raw_text="; ".join(amt[1] for amt in found_amounts)
                )
            else:
                return AmountRange(
                    max_amount=amounts_only[0],
                    raw_text=found_amounts[0][1]
                )
        
        return AmountRange()
    
    def _parse_amount_string(self, amount_str: str) -> Optional[float]:
        """Parse a monetary amount string to float."""
        if not amount_str:
            return None
        
        # Clean the amount string for both EUR and RON formats
        clean_amount = amount_str.strip()
        clean_amount = re.sub(r'(?i)(eur|euro|lei|ron)', '', clean_amount)
        clean_amount = re.sub(r'\s', '', clean_amount)
        clean_amount = clean_amount.replace('.', '').replace(',', '.')

        try:
            return float(clean_amount)
        except ValueError:
            return None
    
    def extract_dates_from_text(self, text: str) -> List[str]:
        """Extract dates from text with enhanced pattern matching and validation."""
        if not text:
            return []
        
        dates = []
        text_lower = text.lower()
        
        for pattern in self.DATE_PATTERNS:
            matches = re.finditer(pattern, text_lower)
            for match in matches:
                date_str = match.group(1) if match.groups() else match.group(0)
                
                # Validate and normalize date
                normalized_date = self._normalize_date(date_str)
                if normalized_date and normalized_date not in dates:
                    dates.append(normalized_date)
        
        # Sort dates chronologically
        dates.sort(key=lambda x: self._parse_date_for_sorting(x))
        
        return dates
    
    def _normalize_date(self, date_str: str) -> Optional[str]:
        """Normalize date string to ISO format."""
        if not date_str:
            return None
        
        # French month names mapping
        french_months = {
            'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04',
            'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08',
            'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12'
        }

        # Attempt Romanian date parsing
        ro_date = parse_romanian_date(date_str)
        if ro_date:
            return ro_date
        
        date_str = date_str.strip()
        
        # Handle French month names
        for month_name, month_num in french_months.items():
            if month_name in date_str.lower():
                # Extract day and year
                day_match = re.search(r'(\d{1,2})', date_str)
                year_match = re.search(r'(\d{4})', date_str)
                
                if day_match and year_match:
                    day = day_match.group(1).zfill(2)
                    year = year_match.group(1)
                    return f"{year}-{month_num}-{day}"
        
        # Handle numeric dates
        numeric_patterns = [
            (r'(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})', lambda m: f"{m.group(3)}-{m.group(2).zfill(2)}-{m.group(1).zfill(2)}"),  # DD/MM/YYYY
            (r'(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})', lambda m: f"{m.group(1)}-{m.group(2).zfill(2)}-{m.group(3).zfill(2)}"),  # YYYY/MM/DD
        ]
        
        for pattern, formatter in numeric_patterns:
            match = re.search(pattern, date_str)
            if match:
                try:
                    return formatter(match)
                except (ValueError, IndexError):
                    continue
        
        return None
    
    def _parse_date_for_sorting(self, date_str: str) -> datetime:
        """Parse date string for sorting purposes."""
        try:
            return datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError:
            return datetime.min
    
    def extract_structured_content(self, soup: BeautifulSoup, url: str) -> StructuredContent:
        """
        Extract structured content from a subsidy detail page.
        Uses enhanced heuristics with DSFR support and robust fallback mechanisms.
        """
        start_time = time.time()
        
        # Initialize structured content
        content = StructuredContent(
            source_url=url,
            domain=urlparse(url).netloc
        )
        
        try:
            # Extract using DSFR tab-based method first
            content = self._extract_dsfr_tabs(soup, content)
            
            # Supplement with generic extraction for missing fields
            content = self._extract_generic_content(soup, content, url)
            
            # Post-processing and validation
            content = self._post_process_content(content, soup, url)
            
            # Add extraction metadata
            extraction_time = time.time() - start_time
            content.extraction_metadata = {
                'extraction_time_seconds': extraction_time,
                'extraction_timestamp': time.time(),
                'extraction_method': 'enhanced_discovery',
                'url_parsed': urlparse(url)._asdict(),
                'content_quality_score': self._calculate_content_quality(content)
            }
            
            logger.info(f"Content extraction completed in {extraction_time:.2f}s for {url}")
            
        except Exception as e:
            logger.error(f"Error during content extraction for {url}: {e}", exc_info=True)
            content.extraction_metadata = {
                'error': str(e),
                'extraction_timestamp': time.time()
            }
        
        return content
    
    def _extract_dsfr_tabs(self, soup: BeautifulSoup, content: StructuredContent) -> StructuredContent:
        """Extract content from DSFR tab panels with enhanced field mapping."""
        tab_panels = soup.select('.fr-tabs__panel, [role="tabpanel"]')
        
        logger.debug(f"Found {len(tab_panels)} DSFR tab panels")
        
        for panel in tab_panels:
            panel_html = panel.decode_contents()
            panel_markdown = md(panel_html) if panel_html else ""
            panel_text = self.clean_text(panel.get_text())
            
            # Skip empty panels
            if not panel_text.strip():
                continue
            
            # Identify panel type
            panel_type = self._identify_panel_type(panel, panel_text, soup)
            
            if panel_type and panel_text:
                # Map panel content to structured fields
                self._map_panel_to_fields(content, panel_type, panel_text, panel_markdown)
                
                # Store raw content
                if panel_type not in content.raw_content:
                    content.raw_content[panel_type] = []
                content.raw_content[panel_type].append({
                    'text': panel_text,
                    'markdown': panel_markdown
                })
        
        return content
    
    def _identify_panel_type(self, panel: Tag, panel_text: str, soup: BeautifulSoup) -> Optional[str]:
        """Identify the type of content in a DSFR panel."""
        # Strategy 1: Use panel ID to find associated tab
        panel_id = panel.get('id', '')
        if panel_id:
            tab_button = soup.select_one(f'[aria-controls="{panel_id}"]')
            if tab_button:
                tab_text = self.clean_text(tab_button.get_text()).lower()
                return self._match_tab_text_to_field(tab_text)
        
        # Strategy 2: Content-based identification with enhanced scoring
        return self._analyze_content_for_type(panel_text)
    
    def _match_tab_text_to_field(self, tab_text: str) -> Optional[str]:
        """Match tab text to field type using keyword mapping."""
        for field_name, keywords in self.dsfr_field_mapping.items():
            if any(keyword in tab_text for keyword in keywords):
                return field_name
        return None
    
    def _analyze_content_for_type(self, panel_text: str) -> Optional[str]:
        """Analyze panel content to determine field type using keyword scoring."""
        text_lower = panel_text.lower()
        
        # Enhanced content indicators with weights
        content_indicators = {
            'description': {
                'keywords': ['objectif', 'description', 'présentation', 'contexte', 'but', 'finalité'],
                'weight': 1.0
            },
            'eligibility': {
                'keywords': ['bénéficiaire', 'éligible', 'condition', 'qui peut', 'destinataire', 'exploitant'],
                'weight': 1.0
            },
            'deadline': {
                'keywords': ['date', 'délai', 'calendrier', 'échéance', 'période', 'limite', 'dépôt'],
                'weight': 1.0
            },
            'documents': {
                'keywords': ['document', 'formulaire', 'pièce', 'annexe', 'télécharger', 'fichier'],
                'weight': 1.0
            },
            'amount': {
                'keywords': ['montant', 'budget', 'financement', 'aide', 'subvention', 'euro', '€'],
                'weight': 1.0
            },
            'agency': {
                'keywords': ['contact', 'organisme', 'service', 'administration', 'responsable'],
                'weight': 0.8
            }
        }
        
        # Calculate scores for each field type
        scores = {}
        for field_type, config in content_indicators.items():
            score = 0
            for keyword in config['keywords']:
                count = text_lower.count(keyword)
                score += count * config['weight']
            
            if score > 0:
                scores[field_type] = score
        
        # Return field type with highest score (if above threshold)
        if scores:
            best_field = max(scores, key=scores.get)
            if scores[best_field] >= 1.0:  # Minimum threshold
                return best_field
        
        return None
    
    def _map_panel_to_fields(self, content: StructuredContent, panel_type: str, panel_text: str, panel_markdown: str):
        """Map panel content to structured content fields."""
        # Only set fields if they're currently empty
        if panel_type == 'description' and not content.description:
            content.description = panel_text
            content.description_markdown = panel_markdown
            
        elif panel_type == 'eligibility' and not content.eligibility:
            content.eligibility = panel_text
            content.eligibility_markdown = panel_markdown
            
        elif panel_type == 'deadline' and not content.deadline:
            # Extract specific dates from deadline content
            dates = self.extract_dates_from_text(panel_text)
            if dates:
                content.deadline = dates[0]  # Use first/most relevant date
            content.deadline_markdown = panel_markdown
            
        elif panel_type == 'agency' and not content.agency:
            content.agency = panel_text
            content.agency_markdown = panel_markdown
            
        elif panel_type == 'documents' and not content.documents:
            # Extract document links from panel
            content.documents = self._extract_documents_from_content(panel_text, panel_markdown, content.source_url)
            
        elif panel_type == 'amount' and not content.amount_range:
            content.amount_range = self.extract_amounts_from_text(panel_text)
    
    def _extract_generic_content(self, soup: BeautifulSoup, content: StructuredContent, url: str) -> StructuredContent:
        """Extract content using generic selectors for missing fields."""
        
        # Extract title if missing
        if not content.title:
            content.title, content.title_markdown = self._extract_title(soup, url)
        
        # Find main content area
        main_content = self._find_main_content(soup)
        
        if main_content:
            # Extract text blocks for analysis
            text_blocks = self._extract_text_blocks(main_content, url)
            
            # Analyze and categorize text blocks
            content = self._categorize_text_blocks(content, text_blocks)
            
            # Extract specific patterns from combined text
            full_text = ' '.join(block['text'] for block in text_blocks)
            content = self._extract_patterns_from_text(content, full_text)
        
        # Extract metadata and categories
        content = self._extract_metadata(soup, content)
        
        return content
    
    def _extract_title(self, soup: BeautifulSoup, url: str) -> Tuple[Optional[str], Optional[str]]:
        """Extract title using multiple strategies with enhanced extraction."""
        try:
            # Try enhanced title extractor if available
            from .enhanced_title_extractor import extract_enhanced_title
            enhanced_title = extract_enhanced_title(soup=soup, url=url)
            if enhanced_title:
                return enhanced_title, enhanced_title
        except ImportError:
            pass
        
        # Fallback to selector-based extraction
        for selector in self.title_selectors:
            title_elem = soup.select_one(selector)
            if title_elem and title_elem.get_text(strip=True):
                title_text = self.clean_text(title_elem.get_text())
                if title_text and title_text.lower() not in ['subsidy page', 'page', 'untitled']:
                    title_markdown = md(str(title_elem))
                    return title_text, title_markdown
        
        # Extract from meta tags
        meta_title = soup.find('meta', attrs={'property': 'og:title'})
        if meta_title and meta_title.get('content'):
            title = self.clean_text(meta_title['content'])
            return title, title
        
        # Extract from page title tag
        title_tag = soup.find('title')
        if title_tag:
            title = self.clean_text(title_tag.get_text())
            # Clean common suffixes
            title = re.sub(r'\s*[-|]\s*FranceAgriMer.*$', '', title, flags=re.IGNORECASE)
            if title:
                return title, title
        
        return None, None
    
    def _find_main_content(self, soup: BeautifulSoup) -> Optional[Tag]:
        """Find the main content area using multiple strategies."""
        for selector in self.content_selectors:
            content_elem = soup.select_one(selector)
            if content_elem:
                return content_elem
        
        # Fallback to body (with filtering)
        body = soup.find('body')
        if body:
            # Remove navigation and other non-content elements
            for unwanted in body.select('nav, header, footer, aside, .breadcrumb, script, style'):
                unwanted.decompose()
            return body
        
        return soup
    
    def _extract_text_blocks(self, main_content: Tag, url: str) -> List[Dict[str, str]]:
        """Extract meaningful text blocks from content area."""
        text_blocks = []
        
        for elem in main_content.find_all(['p', 'div', 'section', 'li', 'td', 'th']):
            text = self.clean_text(elem.get_text())
            
            # Filter out non-meaningful content
            if len(text) > 20 and not self._is_navigation_text(text):
                text_blocks.append({
                    'text': text,
                    'markdown': md(str(elem)),
                    'tag': elem.name,
                    'classes': ' '.join(elem.get('class', []))
                })
        
        logger.debug(f"Extracted {len(text_blocks)} text blocks from {url}")
        return text_blocks
    
    def _is_navigation_text(self, text: str) -> bool:
        """Check if text is likely navigation or non-content."""
        navigation_indicators = [
            'accueil', 'navigation', 'menu', 'retour', 'suivant', 'précédent',
            'home', 'back', 'next', 'previous', 'breadcrumb', 'fil d\'ariane'
        ]
        
        text_lower = text.lower()
        return any(indicator in text_lower for indicator in navigation_indicators)
    
    def _categorize_text_blocks(self, content: StructuredContent, text_blocks: List[Dict[str, str]]) -> StructuredContent:
        """Categorize text blocks into structured fields."""
        for block in text_blocks:
            text_block = block['text']
            
            # Use existing field mapping logic
            field = guess_canonical_field_fr(text_block)
            
            if field:
                # Store in raw content
                if field not in content.raw_content:
                    content.raw_content[field] = []
                content.raw_content[field].append(block)
                
                # Set field if empty
                if field == 'description' and not content.description:
                    content.description = text_block
                    content.description_markdown = block['markdown']
                elif field == 'eligibility' and not content.eligibility:
                    content.eligibility = text_block
                    content.eligibility_markdown = block['markdown']
                elif field == 'agency' and not content.agency:
                    content.agency = text_block
                    content.agency_markdown = block['markdown']
            else:
                # Log unmapped content for analysis (only substantial text)
                if len(text_block) > 50:
                    log_unmapped_label(text_block[:100] + "...", content.source_url)
        
        return content
    
    def _extract_patterns_from_text(self, content: StructuredContent, full_text: str) -> StructuredContent:
        """Extract specific patterns (amounts, dates, etc.) from combined text."""
        
        # Extract amounts if not already set
        if not content.amount_range:
            content.amount_range = self.extract_amounts_from_text(full_text)
        
        # Extract dates if deadline not already set
        if not content.deadline:
            dates = self.extract_dates_from_text(full_text)
            if dates:
                content.deadline = dates[0]
        
        # Extract agency if not already set
        if not content.agency:
            agency = self._extract_agency_from_text(full_text)
            if agency:
                content.agency = agency
        
        return content
    
    def _extract_agency_from_text(self, text: str) -> Optional[str]:
        """Extract agency/organization name from text."""
        agency_patterns = [
            r'(FranceAgriMer)',
            r'(Ministère\s+[\w\s]+)',
            r'(Préfecture\s+[\w\s]+)',
            r'(Conseil\s+régional\s+[\w\s]+)',
            r'(Chambre\s+d[\'""]agriculture\s+[\w\s]*)',
            r'(Direction\s+[\w\s]+)',
        ]
        
        for pattern in agency_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                agency_name = self.clean_text(match.group(1))
                if len(agency_name) > 5:  # Meaningful agency name
                    return agency_name
        
        return None
    
    def _extract_documents_from_content(self, panel_text: str, panel_markdown: str, base_url: str) -> List[ExtractedDocument]:
        """Extract document links from panel content with comprehensive link detection."""
        documents = []
        
        # Parse the markdown to find actual links
        from bs4 import BeautifulSoup
        html_content = ""
        
        # Convert markdown back to HTML for link extraction
        try:
            import markdown
            html_content = markdown.markdown(panel_markdown)
        except ImportError:
            # Fallback: parse panel_markdown as HTML directly
            html_content = panel_markdown
        
        if html_content:
            doc_soup = BeautifulSoup(html_content, 'html.parser')
            
            for link in doc_soup.find_all('a', href=True):
                href = link['href']
                link_text = self.clean_text(link.get_text())
                
                if self._is_document_link(href):
                    # Resolve relative URLs
                    full_url = urljoin(base_url, href)
                    
                    document = ExtractedDocument(
                        url=full_url,
                        text=link_text or 'Document',
                        filename=self._extract_filename(href),
                        file_type=self._get_file_type(href),
                        file_size=self._extract_file_size_from_text(link_text),
                        mandatory=self._determine_if_mandatory(link_text, panel_text),
                        source_section='documents'
                    )
                    
                    documents.append(document)
        
        # Also look for document references in text patterns
        doc_patterns = [
            r'(formulaire[\s\w]*\.(?:pdf|doc|docx|xlsx))',
            r'(annexe[\s\w]*\.(?:pdf|doc|docx|xlsx))',
            r'(dossier[\s\w]*\.(?:pdf|doc|docx|xlsx))',
            r'(guide[\s\w]*\.(?:pdf|doc|docx))',
        ]
        
        for pattern in doc_patterns:
            matches = re.finditer(pattern, panel_text, re.IGNORECASE)
            for match in matches:
                filename = match.group(1)
                
                # Create document entry for referenced file
                document = ExtractedDocument(
                    url="",  # No direct URL available
                    text=f"Document référencé: {filename}",
                    filename=filename,
                    file_type=self._get_file_type(filename),
                    source_section='documents'
                )
                
                documents.append(document)
        
        return documents
    
    def _is_document_link(self, href: str) -> bool:
        """Check if a link points to a document."""
        return any(ext in href.lower() for ext in self.DOCUMENT_EXTENSIONS)
    
    def _extract_filename(self, href: str) -> str:
        """Extract filename from URL."""
        filename = href.split('/')[-1] if '/' in href else href
        return filename.split('?')[0] if '?' in filename else filename
    
    def _get_file_type(self, href: str) -> str:
        """Get file type from URL or filename."""
        for ext in self.DOCUMENT_EXTENSIONS:
            if ext in href.lower():
                return ext.lstrip('.')
        return 'unknown'
    
    def _extract_file_size_from_text(self, text: str) -> Optional[str]:
        """Extract file size from link text."""
        size_pattern = r'\(([^)]*(?:ko|mo|go|kb|mb|gb|bytes?)[^)]*)\)'
        size_match = re.search(size_pattern, text.lower())
        return size_match.group(1) if size_match else None
    
    def _determine_if_mandatory(self, link_text: str, context_text: str) -> Optional[bool]:
        """Determine if a document is mandatory based on context."""
        mandatory_indicators = ['obligatoire', 'requis', 'nécessaire', 'indispensable']
        optional_indicators = ['facultatif', 'optionnel', 'recommandé', 'si applicable']
        
        combined_text = f"{link_text} {context_text}".lower()
        
        if any(indicator in combined_text for indicator in mandatory_indicators):
            return True
        elif any(indicator in combined_text for indicator in optional_indicators):
            return False
        
        return None  # Unknown
    
    def _extract_metadata(self, soup: BeautifulSoup, content: StructuredContent) -> StructuredContent:
        """Extract metadata, categories, and additional information."""
        
        # Extract categories from breadcrumbs
        if not content.categories:
            categories = set()
            
            breadcrumb_selectors = [
                '.breadcrumb', '.breadcrumbs', 'nav[aria-label="breadcrumb"]',
                '.fr-breadcrumb', '.fr-breadcrumb__list'
            ]
            
            for selector in breadcrumb_selectors:
                breadcrumb = soup.select_one(selector)
                if breadcrumb:
                    for link in breadcrumb.find_all('a'):
                        category = self.clean_text(link.get_text())
                        if category and len(category) > 2:
                            categories.add(category)
            
            # Check meta tags
            for meta in soup.find_all('meta'):
                if meta.get('name') in ['keywords', 'category', 'subject']:
                    meta_content = meta.get('content', '')
                    if meta_content:
                        categories.update([
                            cat.strip() for cat in meta_content.split(',') 
                            if cat.strip() and len(cat.strip()) > 2
                        ])
            
            content.categories = list(categories)
        
        # Extract language if not set
        if not content.language or content.language == ['fr']:
            detected_lang = 'fr'  # Default
            if content.description:
                detected_lang = detect_language(content.description)
            content.language = [detected_lang] if detected_lang != 'unknown' else ['fr']
        
        # Extract region information
        if not content.region:
            region_patterns = [
                r'région\s+([\w\s-]+)',
                r'département\s+([\w\s-]+)',
                r'zone\s+([\w\s-]+)',
            ]
            
            full_text = ""
            if content.description:
                full_text += content.description + " "
            if content.eligibility:
                full_text += content.eligibility + " "
            
            regions = set()
            for pattern in region_patterns:
                matches = re.finditer(pattern, full_text, re.IGNORECASE)
                for match in matches:
                    region = self.clean_text(match.group(1))
                    if len(region) > 2:
                        regions.add(region)

            content.region = validate_county_list(list(regions))
        
        return content
    
    def _categorize_text_blocks(self, content: StructuredContent, text_blocks: List[Dict[str, str]]) -> StructuredContent:
        """Categorize text blocks into appropriate fields using field mapping."""
        for block in text_blocks:
            text_block = block['text']
            field = guess_canonical_field_fr(text_block)
            
            if field:
                # Store in raw content
                if field not in content.raw_content:
                    content.raw_content[field] = []
                content.raw_content[field].append(block)
                
                # Set main field if empty
                if field == 'description' and not content.description:
                    content.description = text_block
                    content.description_markdown = block['markdown']
                elif field == 'eligibility' and not content.eligibility:
                    content.eligibility = text_block
                    content.eligibility_markdown = block['markdown']
                elif field == 'agency' and not content.agency:
                    content.agency = text_block
                    content.agency_markdown = block['markdown']
        
        return content
    
    def _extract_patterns_from_text(self, content: StructuredContent, full_text: str) -> StructuredContent:
        """Extract specific patterns from combined text."""
        
        # Extract amounts if not set
        if not content.amount_range:
            content.amount_range = self.extract_amounts_from_text(full_text)
        
        # Extract dates if deadline not set
        if not content.deadline:
            dates = self.extract_dates_from_text(full_text)
            if dates:
                content.deadline = dates[0]
        
        # Extract agency if not set
        if not content.agency:
            agency = self._extract_agency_from_text(full_text)
            if agency:
                content.agency = agency
        
        return content
    
    def _post_process_content(self, content: StructuredContent, soup: BeautifulSoup, url: str) -> StructuredContent:
        """Post-process extracted content for quality and completeness."""
        
        # Generate code if missing
        if not content.code:
            content.code = self._generate_content_code(content.title, url)
        
        # Extract documents from main content if not found in tabs
        if not content.documents:
            main_content = self._find_main_content(soup)
            if main_content:
                content.documents = self._extract_document_links(main_content, url)
        
        # Validate and clean content
        content = self._validate_and_clean_content(content)
        
        return content
    
    def _generate_content_code(self, title: Optional[str], url: str) -> str:
        """Generate a unique code for the content."""
        if title:
            code_base = re.sub(r'[^a-zA-Z0-9]', '', title[:20])
            if code_base:
                return f"AUTO_{code_base.upper()}"
        
        # Fallback to URL-based code
        parsed_url = urlparse(url)
        path_parts = [part for part in parsed_url.path.split('/') if part]
        
        if path_parts:
            code_part = re.sub(r'[^a-zA-Z0-9]', '', path_parts[-1])[:20]
            if code_part:
                return f"AUTO_{code_part.upper()}"
        
        # Final fallback with timestamp
        return f"AUTO_UNKNOWN_{int(time.time())}"
    
    def _extract_document_links(self, main_content: Tag, base_url: str) -> List[ExtractedDocument]:
        """Extract document links from main content area."""
        documents = []
        
        for link in main_content.find_all('a', href=True):
            href = link['href']
            link_text = self.clean_text(link.get_text())
            
            if self._is_document_link(href):
                full_url = urljoin(base_url, href)
                
                document = ExtractedDocument(
                    url=full_url,
                    text=link_text or 'Document',
                    filename=self._extract_filename(href),
                    file_type=self._get_file_type(href),
                    file_size=self._extract_file_size_from_text(link_text),
                    source_section='main_content'
                )
                
                documents.append(document)
        
        return documents
    
    def _validate_and_clean_content(self, content: StructuredContent) -> StructuredContent:
        """Validate and clean extracted content."""
        
        # Clean up descriptions that are too short or generic
        if content.description and len(content.description) < 50:
            # Look for longer description in raw content
            if 'description' in content.raw_content:
                longer_descriptions = [
                    block['text'] for block in content.raw_content['description']
                    if len(block['text']) > 100
                ]
                if longer_descriptions:
                    content.description = longer_descriptions[0]
        
        # Validate deadline format
        if content.deadline:
            normalized_deadline = self._normalize_date(content.deadline)
            if normalized_deadline:
                content.deadline = normalized_deadline
        
        # Clean categories (remove duplicates and short entries)
        if content.categories:
            content.categories = list(set([
                cat for cat in content.categories 
                if len(cat) > 2 and cat.lower() not in ['aide', 'subsidy', 'page']
            ]))
        
        return content
    
    def _calculate_content_quality(self, content: StructuredContent) -> float:
        """Calculate a quality score for extracted content."""
        score = 0.0
        
        # Core content presence (40% of score)
        if content.title:
            score += 0.15
        if content.description and len(content.description) > 100:
            score += 0.25
        
        # Detailed information (40% of score)
        if content.eligibility:
            score += 0.15
        if content.deadline:
            score += 0.10
        if content.amount_range and content.amount_range.as_array:
            score += 0.15
        
        # Supporting information (20% of score)
        if content.agency:
            score += 0.05
        if content.documents:
            score += 0.10
        if content.categories:
            score += 0.05
        
        return min(1.0, score)


# Main extraction functions

def extract_structured_content(soup: BeautifulSoup, url: str) -> Dict[str, Any]:
    """
    Extract structured content from a subsidy detail page.
    Enhanced wrapper function maintaining backward compatibility.
    """
    extractor = ContentExtractor()
    structured_content = extractor.extract_structured_content(soup, url)
    return structured_content.to_dict()


def extract_subsidy_details(url: str, use_multi_tab: bool = True, timeout: int = 15) -> Optional[Dict[str, Any]]:
    """
    Extract detailed information from a single subsidy page.
    Enhanced with multi-tab content extraction and robust error handling.
    
    Args:
        url: URL of the subsidy detail page
        use_multi_tab: Whether to use enhanced multi-tab extraction (default: True)
        timeout: Timeout for page loading and element waits
        
    Returns:
        Structured subsidy data or None if extraction fails.
    """
    logger.info(f"Starting extraction for {url} (multi_tab={use_multi_tab})")
    
    # Try multi-tab extraction first if enabled
    if use_multi_tab:
        try:
            from .multi_tab_extractor import enhanced_extract_subsidy_details
            result = enhanced_extract_subsidy_details(url, timeout=timeout)
            if result:
                logger.info(f"Multi-tab extraction successful for {url}")
                return result
            else:
                logger.warning(f"Multi-tab extraction failed, falling back to standard extraction for {url}")
        except ImportError:
            logger.warning(f"Multi-tab extractor not available, using standard extraction for {url}")
        except Exception as e:
            logger.warning(f"Multi-tab extraction error: {e}, falling back to standard extraction for {url}")
    
    # Fallback to standard extraction
    return _standard_extract_subsidy_details(url, timeout)


def _standard_extract_subsidy_details(url: str, timeout: int = 15) -> Optional[Dict[str, Any]]:
    """Standard extraction method with enhanced error handling."""
    driver = None
    
    try:
        driver = init_driver()
        logger.debug(f"Loading page: {url}")
        driver.get(url)
        
        # Wait for page to load with better error handling
        try:
            WebDriverWait(driver, timeout).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
        except TimeoutException:
            logger.error(f"Timeout loading page: {url}")
            return None
        
        # Additional wait for dynamic content
        time.sleep(2)
        
        # Get page source and parse
        page_source = driver.page_source
        soup = BeautifulSoup(page_source, 'html.parser')
        
        # Extract structured content using enhanced extractor
        extractor = ContentExtractor()
        structured_content = extractor.extract_structured_content(soup, url)
        
        # Convert to dictionary
        result = structured_content.to_dict()
        
        # Validate extraction quality
        if not _validate_extraction_result(result):
            logger.warning(f"Extraction quality validation failed for {url}")
            return None
        
        logger.info(f"Standard extraction successful for {url}")
        return result
        
    except WebDriverException as e:
        logger.error(f"WebDriver error for {url}: {e}")
        return None
    except Exception as e:
        logger.error(f"Standard extraction failed for {url}: {e}", exc_info=True)
        return None
    finally:
        if driver:
            try:
                driver.quit()
            except Exception as e:
                logger.warning(f"Error closing driver: {e}")


def _validate_extraction_result(result: Dict[str, Any]) -> bool:
    """Validate that extraction result contains meaningful content."""
    # Check for basic required content
    if not result.get('title') and not result.get('description'):
        return False
    
    # Check minimum content length
    description = result.get('description', '')
    if len(description.strip()) < 20:
        return False
    
    # Check for extraction errors
    metadata = result.get('extraction_metadata', {})
    if metadata.get('error'):
        return False
    
    return True


# Legacy function maintained for backward compatibility
def clean_text(text: str) -> str:
    """Clean and normalize extracted text (legacy wrapper)."""
    extractor = ContentExtractor()
    return extractor.clean_text(text)


def extract_amount_from_text(text: str) -> Dict[str, Optional[float]]:
    """Extract monetary amounts from text (legacy wrapper)."""
    extractor = ContentExtractor()
    amount_range = extractor.extract_amounts_from_text(text)
    
    return {
        'min': amount_range.min_amount,
        'max': amount_range.max_amount
    }


def extract_dates_from_text(text: str) -> List[str]:
    """Extract dates from text (legacy wrapper)."""
    extractor = ContentExtractor()
    return extractor.extract_dates_from_text(text)


def extract_text_from_urls(urls: List[str], output_folder: str = "data/raw_pages", browser: str = "chrome") -> None:
    """
    Legacy function for extracting text from URLs with enhanced error handling.
    Maintained for backward compatibility.
    """
    from .core import ensure_folder
    
    ensure_folder(output_folder)
    driver = None
    
    try:
        driver = init_driver(browser=browser)
        
        for idx, url in enumerate(urls, start=1):
            logger.info(f"Extracting from URL {idx}/{len(urls)}: {url}")
            
            try:
                driver.get(url)
                WebDriverWait(driver, 15).until(
                    EC.presence_of_element_located((By.TAG_NAME, "body"))
                )
                
                body_text = driver.find_element(By.TAG_NAME, "body").text
                
                # Save extracted text
                output_path = os.path.join(output_folder, f"raw_page_{idx}.txt")
                with open(output_path, "w", encoding="utf-8") as f:
                    f.write(body_text)
                
                logger.info(f"Saved {len(body_text)} characters to {output_path}")
                
            except TimeoutException:
                logger.warning(f"Timeout loading {url}. Skipping.")
                continue
            except Exception as e:
                logger.error(f"Failed extracting text from {url}: {e}. Skipping.")
                continue
    
    except Exception as e:
        logger.error(f"Failed to initialize extraction process: {e}")
    finally:
        if driver:
            try:
                driver.quit()
            except Exception as e:
                logger.warning(f"Error closing driver: {e}")


# Export main classes and functions
__all__ = [
    'ContentExtractor',
    'StructuredContent', 
    'AmountRange',
    'ExtractedDocument',
    'extract_structured_content',
    'extract_subsidy_details',
    'extract_text_from_urls',
    'clean_text',
    'extract_amount_from_text', 
    'extract_dates_from_text'
]

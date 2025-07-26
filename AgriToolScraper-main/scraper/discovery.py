# scraper/discovery.py
"""
Enhanced content discovery and extraction for subsidy detail pages.
"""

import os
import time
import re
from typing import Dict, List, Optional, Any
from urllib.parse import urljoin, urlparse
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from bs4 import BeautifulSoup

from .core import init_driver, detect_language, guess_canonical_field_fr, log_unmapped_label


def clean_text(text: str) -> str:
    """Clean and normalize extracted text."""
    if not text:
        return ""
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text.strip())
    # Remove common artifacts
    text = re.sub(r'[\r\n\t]+', ' ', text)
    return text


def extract_amount_from_text(text: str) -> Dict[str, Optional[float]]:
    """Extract monetary amounts from text using regex patterns."""
    amounts = {'min': None, 'max': None}
    if not text:
        return amounts
    
    # Common French monetary patterns
    patterns = [
        r'(\d{1,3}(?:\s?\d{3})*(?:[,\.]\d{2})?)\s*(?:€|euros?)',  # 10 000€, 10.000,50€
        r'(?:€|euros?)\s*(\d{1,3}(?:\s?\d{3})*(?:[,\.]\d{2})?)',  # €10 000
        r'(\d{1,3}(?:\s?\d{3})*)\s*(?:euros?)',  # 10000 euros
        r'maximum?\s*(?:de\s*)?(\d{1,3}(?:\s?\d{3})*(?:[,\.]\d{2})?)',  # maximum de 50000
        r"jusqu['\"]?à\s*(\d{1,3}(?:\s?\d{3})*(?:[,\.]\d{2})?)",  # jusqu'à 75000
        r'plafond\s*(?:de\s*)?(\d{1,3}(?:\s?\d{3})*(?:[,\.]\d{2})?)',  # plafond de 100000
    ]
    
    found_amounts = []
    for pattern in patterns:
        matches = re.findall(pattern, text.lower())
        for match in matches:
            # Clean and convert to float
            clean_amount = re.sub(r'[\s,]', '', match).replace('.', '')
            try:
                amount = float(clean_amount)
                if amount > 0:
                    found_amounts.append(amount)
            except ValueError:
                continue
    
    if found_amounts:
        amounts['min'] = min(found_amounts) if len(found_amounts) > 1 else None
        amounts['max'] = max(found_amounts)
    
    return amounts


def extract_dates_from_text(text: str) -> List[str]:
    """Extract dates from text using regex patterns."""
    if not text:
        return []
    
    date_patterns = [
        r'(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})',  # DD/MM/YYYY, DD-MM-YYYY
        r'(\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4})',
        r'(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})',  # YYYY/MM/DD
    ]
    
    dates = []
    for pattern in date_patterns:
        matches = re.findall(pattern, text.lower())
        dates.extend(matches)
    
    return dates


def extract_structured_content(soup: BeautifulSoup, url: str) -> Dict[str, Any]:
    """
    Extract structured content from a subsidy detail page.
    Uses heuristics to identify and map content fields with DSFR support.
    """
    extracted = {
        'title': None,
        'description': None,
        'eligibility': None,
        'amount_min': None,
        'amount_max': None,
        'deadline': None,
        'agency': None,
        'categories': [],
        'region': [],
        'documents': [],
        'raw_content': {}
    }
    
    # First try DSFR tab-based extraction
    extracted = extract_dsfr_tabs(soup, extracted)
    
    # Then supplement with generic extraction (only for missing fields)
    extracted = extract_generic_content(soup, extracted, url)
    
    return extracted


def extract_dsfr_tabs(soup: BeautifulSoup, extracted: Dict[str, Any]) -> Dict[str, Any]:
    """Extract content from DSFR tab panels, only setting non-empty values."""
    
    # Map DSFR tab labels to our field names
    dsfr_field_mapping = {
        'description': ['description', 'présentation', 'objectifs'],
        'eligibility': ['éligibilité', 'conditions', 'bénéficiaires'],
        'deadline': ['délais', 'calendrier', 'dates'],
        'documents': ['documents', 'pièces jointes', 'formulaires'],
        'agency': ['organisme', 'contact', 'administration']
    }
    
    # Look for DSFR tab panels
    tab_panels = soup.select('.fr-tabs__panel, [role="tabpanel"]')
    
    for panel in tab_panels:
        # Get panel text content
        panel_text = clean_text(panel.get_text())
        
        # Skip empty panels
        if not panel_text.strip():
            continue
        
        # Try to match panel to a field based on tab label or content
        panel_id = panel.get('id', '')
        tab_button = soup.select_one(f'[aria-controls="{panel_id}"]')
        tab_label = clean_text(tab_button.get_text()) if tab_button else ''
        
        # Match tab label to field
        for field_name, keywords in dsfr_field_mapping.items():
            if any(keyword in tab_label.lower() for keyword in keywords):
                # Only set if field is currently empty and panel has content
                if not extracted.get(field_name) and panel_text:
                    if field_name == 'documents':
                        # Extract document links from panel
                        doc_links = []
                        for link in panel.find_all('a', href=True):
                            href = link['href']
                            link_text = clean_text(link.get_text())
                            if any(ext in href.lower() for ext in ['.pdf', '.doc', '.docx', '.xlsx', '.xls']):
                                doc_links.append({
                                    'url': href,
                                    'text': link_text
                                })
                        if doc_links:
                            extracted[field_name] = doc_links
                    else:
                        # Set text content
                        extracted[field_name] = panel_text
                break
    
    return extracted


def extract_generic_content(soup: BeautifulSoup, extracted: Dict[str, Any], url: str) -> Dict[str, Any]:
    """Extract content using generic selectors, only filling missing fields."""
    
    # Extract title (only if not already set)
    if not extracted.get('title'):
        title_selectors = ['h1', '.entry-title', '.post-title', 'h1.title']
        for selector in title_selectors:
            title_elem = soup.select_one(selector)
            if title_elem and title_elem.get_text(strip=True):
                extracted['title'] = clean_text(title_elem.get_text())
                break
    
    # Extract main content
    content_selectors = [
        '.entry-content', '.post-content', '.content', 'article', 
        '.main-content', '#content', '[role="main"]'
    ]
    
    main_content = None
    for selector in content_selectors:
        content_elem = soup.select_one(selector)
        if content_elem:
            main_content = content_elem
            break
    
    if not main_content:
        main_content = soup
    
    # Extract and categorize text content
    text_blocks = []
    for elem in main_content.find_all(['p', 'div', 'section', 'li']):
        text = clean_text(elem.get_text())
        if len(text) > 20:  # Only meaningful text blocks
            text_blocks.append(text)
    
    # Combine all text for analysis
    full_text = ' '.join(text_blocks)
    
    # Extract description (only if not already set)
    if not extracted.get('description'):
        description_candidates = [block for block in text_blocks if len(block) > 100]
        if description_candidates:
            extracted['description'] = description_candidates[0]
    
    # Use field mapping to categorize content
    for text_block in text_blocks:
        field = guess_canonical_field_fr(text_block)
        if field:
            if field not in extracted['raw_content']:
                extracted['raw_content'][field] = []
            extracted['raw_content'][field].append(text_block)
        else:
            # Log unmapped content for analysis
            if len(text_block) > 50:  # Only log substantial unmapped text
                log_unmapped_label(text_block[:100] + "...", url)
    
    # Extract specific information using patterns (only if not already set)
    if not extracted.get('amount_min') and not extracted.get('amount_max'):
        amounts = extract_amount_from_text(full_text)
        extracted['amount_min'] = amounts['min']
        extracted['amount_max'] = amounts['max']
    
    # Extract dates (only if not already set)
    if not extracted.get('deadline'):
        dates = extract_dates_from_text(full_text)
        if dates:
            extracted['deadline'] = dates[0]  # First date found
    
    # Extract agency/organization (only if not already set)
    if not extracted.get('agency'):
        agency_keywords = ['franceagrimer', 'ministère', 'préfecture', 'conseil régional', 'chambre d\'agriculture']
        for keyword in agency_keywords:
            if keyword in full_text.lower():
                # Try to extract the full organization name
                pattern = rf'(\w+\s+)*{keyword}(\s+\w+)*'
                match = re.search(pattern, full_text, re.IGNORECASE)
                if match:
                    extracted['agency'] = clean_text(match.group())
                    break
    
    # Extract document links (only if not already set)
    if not extracted.get('documents'):
        doc_links = []
        for link in main_content.find_all('a', href=True):
            href = link['href']
            link_text = clean_text(link.get_text())
            if any(ext in href.lower() for ext in ['.pdf', '.doc', '.docx', '.xlsx', '.xls']):
                doc_links.append({
                    'url': urljoin(url, href),
                    'text': link_text
                })
        
        if doc_links:
            extracted['documents'] = doc_links
    
    # Extract categories/tags from classes, breadcrumbs, or metadata (only if not already set)
    if not extracted.get('categories'):
        categories = set()
        
        # Check breadcrumbs
        breadcrumb_selectors = ['.breadcrumb', '.breadcrumbs', 'nav[aria-label="breadcrumb"]']
        for selector in breadcrumb_selectors:
            breadcrumb = soup.select_one(selector)
            if breadcrumb:
                for link in breadcrumb.find_all('a'):
                    category = clean_text(link.get_text())
                    if category and len(category) > 2:
                        categories.add(category)
        
        # Check meta tags
        for meta in soup.find_all('meta'):
            if meta.get('name') in ['keywords', 'category']:
                content = meta.get('content', '')
                if content:
                    categories.update([cat.strip() for cat in content.split(',') if cat.strip()])
        
        if categories:
            extracted['categories'] = list(categories)
    
    # Detect language (only if not already set)
    if not extracted.get('language'):
        if extracted['description']:
            detected_lang = detect_language(extracted['description'])
            extracted['language'] = [detected_lang] if detected_lang != 'unknown' else ['fr']
        else:
            extracted['language'] = ['fr']  # Default for French sites
    
    return extracted


def extract_subsidy_details(url: str, use_multi_tab: bool = True) -> Optional[Dict[str, Any]]:
    """
    Extract detailed information from a single subsidy page.
    Enhanced with multi-tab content extraction for comprehensive data capture.
    
    Args:
        url: URL of the subsidy detail page
        use_multi_tab: Whether to use enhanced multi-tab extraction (default: True)
        
    Returns:
        Structured subsidy data or None if extraction fails.
    """
    if use_multi_tab:
        try:
            from .multi_tab_extractor import enhanced_extract_subsidy_details
            result = enhanced_extract_subsidy_details(url)
            if result:
                print(f"[INFO] Multi-tab extraction successful for {url}")
                return result
            else:
                print(f"[WARN] Multi-tab extraction failed, falling back to standard extraction for {url}")
        except ImportError:
            print(f"[WARN] Multi-tab extractor not available, using standard extraction for {url}")
        except Exception as e:
            print(f"[WARN] Multi-tab extraction error: {e}, falling back to standard extraction for {url}")
    
    # Fallback to standard extraction
    driver = None
    try:
        driver = init_driver()
        driver.get(url)
        
        # Wait for page to load
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        
        # Get page source and parse with BeautifulSoup
        page_source = driver.page_source
        soup = BeautifulSoup(page_source, 'html.parser')
        
        # Extract structured content
        extracted = extract_structured_content(soup, url)
        
        # Add metadata
        extracted['source_url'] = url
        extracted['domain'] = urlparse(url).netloc
        
        # Generate a code if not present
        if not extracted.get('code'):
            # Create code from URL or title
            if extracted['title']:
                # Simple code generation from title
                code_base = re.sub(r'[^a-zA-Z0-9]', '', extracted['title'][:20])
                extracted['code'] = f"AUTO_{code_base.upper()}"
            else:
                # Fallback to URL-based code
                path_parts = urlparse(url).path.split('/')
                code_part = next((part for part in reversed(path_parts) if part), 'unknown')
                extracted['code'] = f"AUTO_{code_part.upper()}"
        
        # Validate that we extracted meaningful content
        if not extracted['title'] and not extracted['description']:
            print(f"[WARN] No meaningful content extracted from {url}")
            return None
        
        return extracted
        
    except TimeoutException:
        print(f"[ERROR] Timeout loading page: {url}")
        return None
    except Exception as e:
        print(f"[ERROR] Failed to extract from {url}: {e}")
        return None
    finally:
        if driver:
            driver.quit()


def extract_text_from_urls(urls, output_folder="data/raw_pages", browser="chrome"):
    """
    Legacy function for extracting text from URLs.
    Maintained for backward compatibility.
    """
    from .core import ensure_folder
    
    ensure_folder(output_folder)
    driver = init_driver(browser=browser)

    for idx, url in enumerate(urls, start=1):
        print(f"Extracting from URL {idx}: {url}")
        try:
            driver.get(url)
            WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            body_text = driver.find_element(By.TAG_NAME, "body").text
        except TimeoutException:
            print(f"[WARN] Timeout loading {url}. Skipping.")
            continue
        except Exception as e:
            print(f"[ERROR] Failed extracting text from {url}: {e}. Skipping.")
            continue

        output_path = os.path.join(output_folder, f"raw_page_{idx}.txt")
        try:
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(body_text)
            print(f"Saved to {output_path}")
        except Exception as e:
            print(f"[ERROR] Could not save file {output_path}: {e}")

    driver.quit()

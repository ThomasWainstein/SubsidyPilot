"""Web scraper for les-aides.fr agricultural funding database.

This scraper implements robust pagination and content extraction for the
les-aides.fr website, following the guidelines provided for comprehensive
source checking and data collection.
"""

from __future__ import annotations

import json
import time
import logging
from typing import Dict, List, Optional
from urllib.parse import urljoin, urlparse

try:
    import requests
    from bs4 import BeautifulSoup
    DEPENDENCIES_AVAILABLE = True
except ImportError:
    requests = None
    BeautifulSoup = None
    DEPENDENCIES_AVAILABLE = False

logger = logging.getLogger(__name__)


class LesAidesScraper:
    """Scraper for les-aides.fr agricultural funding database.
    
    Implements paginated scraping with comprehensive source checking
    as outlined in the scraping guidelines.
    """
    
    def __init__(self):
        self.base_url = "https://les-aides.fr/aides/"
        self.session = None
        if DEPENDENCIES_AVAILABLE:
            self.session = requests.Session()
            self.session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
            })
    
    def run(self, max_pages: int = 10, dry_run: bool = False, delay: float = 1.0) -> List[Dict[str, str]]:
        """Run the scraper to collect agricultural funding data.
        
        Args:
            max_pages: Maximum number of pages to scrape
            dry_run: If True, return sample data without actual scraping
            delay: Delay between requests in seconds
        
        Returns:
            List of dictionaries containing subsidy information
        """
        if not DEPENDENCIES_AVAILABLE:
            logger.warning("Required dependencies (requests, beautifulsoup4) not available")
            return self._get_sample_data()
        
        if dry_run:
            logger.info("Dry run mode: returning sample data")
            return self._get_sample_data()
        
        logger.info(f"Starting les-aides.fr scraper (max_pages: {max_pages})")
        
        results = []
        page_num = 1
        
        while page_num <= max_pages:
            try:
                logger.info(f"Scraping page {page_num}/{max_pages}")
                
                # Construct page URL
                page_url = f"{self.base_url}?page={page_num}"
                
                # Fetch page content
                page_results = self._scrape_page(page_url, page_num)
                
                if not page_results:
                    logger.info(f"No results found on page {page_num}, stopping pagination")
                    break
                
                results.extend(page_results)
                logger.info(f"Extracted {len(page_results)} aids from page {page_num}")
                
                # Check for next page availability
                if not self._has_next_page(page_url):
                    logger.info("No next page available, stopping pagination")
                    break
                
                # Respectful delay between requests
                if delay > 0:
                    time.sleep(delay)
                
                page_num += 1
                
            except Exception as e:
                logger.error(f"Error scraping page {page_num}: {e}")
                # Continue to next page on error
                page_num += 1
                if delay > 0:
                    time.sleep(delay * 2)  # Longer delay after error
        
        logger.info(f"Scraping completed. Total aids collected: {len(results)}")
        return results
    
    def _scrape_page(self, page_url: str, page_num: int) -> List[Dict[str, str]]:
        """Scrape a single page for aid listings.
        
        Args:
            page_url: URL of the page to scrape
            page_num: Page number for logging
        
        Returns:
            List of aid dictionaries from this page
        """
        try:
            response = self.session.get(page_url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find aid listings - adjust selectors based on actual site structure
            aid_elements = soup.select('.aide-item, .subsidy-card, .funding-item, article')
            
            if not aid_elements:
                # Try alternative selectors
                aid_elements = soup.select('.card, .listing-item, .result-item')
            
            page_results = []
            
            for aid_element in aid_elements:
                try:
                    aid_data = self._extract_aid_data(aid_element, page_url)
                    if aid_data:
                        page_results.append(aid_data)
                except Exception as e:
                    logger.warning(f"Error extracting aid data: {e}")
                    continue
            
            return page_results
            
        except requests.RequestException as e:
            logger.error(f"HTTP error fetching {page_url}: {e}")
            return []
        except Exception as e:
            logger.error(f"Error parsing page {page_url}: {e}")
            return []
    
    def _extract_aid_data(self, element, base_url: str) -> Optional[Dict[str, str]]:
        """Extract aid information from a single listing element.
        
        Args:
            element: BeautifulSoup element containing aid information
            base_url: Base URL for resolving relative links
        
        Returns:
            Dictionary containing aid data or None if extraction fails
        """
        try:
            # Extract title
            title_element = element.select_one('h2, h3, .title, .aid-title, a[href*="/aide/"]')
            title = title_element.get_text(strip=True) if title_element else "Unknown Title"
            
            # Extract link
            link_element = element.select_one('a[href*="/aide/"], a')
            link = ""
            if link_element and link_element.get('href'):
                link = urljoin(base_url, link_element.get('href'))
            
            # Extract description/summary
            description_element = element.select_one('.description, .summary, .excerpt, p')
            description = description_element.get_text(strip=True) if description_element else ""
            
            # Extract amount if available
            amount_element = element.select_one('.amount, .montant, .funding-amount')
            amount = amount_element.get_text(strip=True) if amount_element else ""
            
            # Extract deadline if available
            deadline_element = element.select_one('.deadline, .date-limite, .date')
            deadline = deadline_element.get_text(strip=True) if deadline_element else ""
            
            # Extract organization/agency
            org_element = element.select_one('.organization, .organisme, .agency')
            organization = org_element.get_text(strip=True) if org_element else "les-aides.fr"
            
            # Skip if no meaningful data
            if not title or title == "Unknown Title":
                return None
            
            aid_data = {
                "title": title,
                "agency": organization,
                "link": link,
                "description": description[:2000] if description else "Description not available",
                "country": "france",
                "amount": amount if amount else "Not specified",
                "deadline": deadline if deadline else "",
                "source_type": "agricultural_funding",
                "extracted_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "source_site": "les-aides.fr"
            }
            
            # Fetch detailed information if link is available
            if link:
                detailed_data = self._fetch_detailed_info(link)
                if detailed_data:
                    aid_data.update(detailed_data)
            
            return aid_data
            
        except Exception as e:
            logger.warning(f"Error extracting aid data: {e}")
            return None
    
    def _fetch_detailed_info(self, detail_url: str) -> Optional[Dict[str, str]]:
        """Fetch detailed information from an aid's detail page.
        
        Args:
            detail_url: URL of the aid's detail page
        
        Returns:
            Dictionary with additional aid details or None
        """
        try:
            response = self.session.get(detail_url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            details = {}
            
            # Extract detailed description
            desc_selectors = [
                '.content', '.description-complete', '.aide-description',
                'main .text-content', '.full-description'
            ]
            
            for selector in desc_selectors:
                desc_element = soup.select_one(selector)
                if desc_element:
                    full_description = desc_element.get_text(strip=True)
                    if len(full_description) > 100:  # Ensure meaningful content
                        details['description'] = full_description[:3000]
                        break
            
            # Extract eligibility criteria
            eligibility_selectors = [
                '.eligibility', '.conditions', '.criteres-eligibilite',
                'h2:contains("ligibilit") + *', 'h3:contains("Conditions") + *'
            ]
            
            for selector in eligibility_selectors:
                eligibility_element = soup.select_one(selector)
                if eligibility_element:
                    details['eligibility'] = eligibility_element.get_text(strip=True)[:1500]
                    break
            
            # Extract contact information
            contact_selectors = [
                '.contact', '.contact-info', '.organisme-contact'
            ]
            
            for selector in contact_selectors:
                contact_element = soup.select_one(selector)
                if contact_element:
                    details['contact'] = contact_element.get_text(strip=True)[:500]
                    break
            
            return details
            
        except Exception as e:
            logger.warning(f"Error fetching details from {detail_url}: {e}")
            return None
    
    def _has_next_page(self, current_url: str) -> bool:
        """Check if there's a next page available.
        
        Args:
            current_url: Current page URL
        
        Returns:
            True if next page exists, False otherwise
        """
        try:
            response = self.session.get(current_url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Look for next page indicators
            next_selectors = [
                'a.next', '.pagination-next', 'a[rel="next"]',
                '.pagination a:contains("Suivant")', '.pagination a:contains(">")'
            ]
            
            for selector in next_selectors:
                next_element = soup.select_one(selector)
                if next_element and next_element.get('href'):
                    return True
            
            return False
            
        except Exception as e:
            logger.warning(f"Error checking next page: {e}")
            return False
    
    def _get_sample_data(self) -> List[Dict[str, str]]:
        """Return sample data for testing/dry-run mode."""
        return [
            {
                "title": "Aide à l'investissement agricole - Modernisation des exploitations",
                "agency": "les-aides.fr",
                "link": "https://les-aides.fr/aide/investissement-agricole-modernisation",
                "description": "Subvention pour la modernisation et l'amélioration des exploitations agricoles. Support pour l'acquisition de matériel, la construction de bâtiments et l'amélioration des infrastructures.",
                "country": "france",
                "amount": "40% du coût des investissements éligibles",
                "deadline": "31 décembre 2024",
                "eligibility": "Exploitants agricoles installés depuis moins de 5 ans",
                "source_type": "agricultural_funding",
                "extracted_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "source_site": "les-aides.fr"
            },
            {
                "title": "Programme d'aide à la conversion biologique",
                "agency": "les-aides.fr", 
                "link": "https://les-aides.fr/aide/conversion-biologique",
                "description": "Soutien financier pour la conversion vers l'agriculture biologique. Aide à la transition et accompagnement technique.",
                "country": "france",
                "amount": "350€/ha pour les grandes cultures",
                "deadline": "15 mars 2025",
                "eligibility": "Exploitations en cours de conversion vers l'agriculture biologique",
                "source_type": "agricultural_funding",
                "extracted_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "source_site": "les-aides.fr"
            }
        ]


if __name__ == "__main__":
    scraper = LesAidesScraper()
    results = scraper.run(max_pages=3, dry_run=True)
    print(f"Collected {len(results)} aids")
    print(json.dumps(results, indent=2, ensure_ascii=False))
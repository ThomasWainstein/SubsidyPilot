# utils/domain_isolation.py
"""
Domain isolation utilities to prevent cross-contamination between scraper runs.
Ensures each workflow only processes URLs from the intended domain.
"""

from urllib.parse import urlparse
from typing import List, Set
import logging

def get_domain_from_url(url: str) -> str:
    """Extract domain from URL."""
    try:
        parsed = urlparse(url)
        return parsed.netloc.lower()
    except Exception:
        return ""

def is_same_domain(url1: str, url2: str) -> bool:
    """Check if two URLs belong to the same domain."""
    return get_domain_from_url(url1) == get_domain_from_url(url2)

def filter_urls_by_domain(urls: List[str], target_domain: str, strict: bool = True) -> List[str]:
    """
    Filter URLs to only include those from the target domain.
    
    Args:
        urls: List of URLs to filter
        target_domain: Target domain (can be URL or domain string)
        strict: If True, only exact domain matches. If False, allows subdomains.
    
    Returns:
        Filtered list of URLs from the target domain only
    """
    if not target_domain:
        logging.warning("No target domain specified - returning empty list for safety")
        return []
    
    # Extract domain from target if it's a full URL
    if target_domain.startswith('http'):
        target_domain = get_domain_from_url(target_domain)
    
    filtered_urls = []
    skipped_count = 0
    
    for url in urls:
        if not url or not url.startswith('http'):
            skipped_count += 1
            continue
            
        url_domain = get_domain_from_url(url)
        
        if strict:
            # Exact domain match
            if url_domain == target_domain:
                filtered_urls.append(url)
            else:
                skipped_count += 1
        else:
            # Allow subdomains
            if url_domain.endswith(target_domain) or target_domain.endswith(url_domain):
                filtered_urls.append(url)
            else:
                skipped_count += 1
    
    if skipped_count > 0:
        logging.info(f"Domain isolation: Filtered out {skipped_count} cross-domain URLs. "
                    f"Kept {len(filtered_urls)} URLs from domain '{target_domain}'")
    
    return filtered_urls

def enforce_domain_isolation(urls: List[str], target_url: str) -> List[str]:
    """
    Enforce strict domain isolation for scraper runs.
    This is the main function to call for ensuring workflow isolation.
    
    Args:
        urls: List of discovered URLs
        target_url: The original target URL for this scraper run
        
    Returns:
        URLs filtered to only the target domain
    """
    if not urls:
        return []
    
    target_domain = get_domain_from_url(target_url)
    if not target_domain:
        logging.error(f"Cannot determine domain from target URL: {target_url}")
        return []
    
    # Apply strict domain filtering
    filtered_urls = filter_urls_by_domain(urls, target_domain, strict=True)
    
    logging.info(f"DOMAIN ISOLATION ENFORCED: {len(urls)} -> {len(filtered_urls)} URLs "
                f"(target domain: {target_domain})")
    
    return filtered_urls

def validate_scraper_isolation(urls: List[str], target_url: str) -> bool:
    """
    Validate that all URLs belong to the expected domain.
    Returns True if isolation is properly enforced, False otherwise.
    """
    if not urls:
        return True
    
    target_domain = get_domain_from_url(target_url)
    cross_domain_urls = []
    
    for url in urls:
        if get_domain_from_url(url) != target_domain:
            cross_domain_urls.append(url)
    
    if cross_domain_urls:
        logging.error(f"DOMAIN ISOLATION VIOLATION: Found {len(cross_domain_urls)} "
                     f"cross-domain URLs in batch targeting {target_domain}")
        for url in cross_domain_urls[:5]:  # Log first 5 violations
            logging.error(f"  Cross-domain URL: {url}")
        return False
    
    return True
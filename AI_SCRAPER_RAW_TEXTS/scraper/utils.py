"""Utility functions for the scraper system."""

import os
import logging
import json
from datetime import datetime
from typing import Dict, Any, List
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager


def setup_logging(log_dir: str = "data/logs", log_level: str = "INFO") -> None:
    """Setup logging configuration."""
    os.makedirs(log_dir, exist_ok=True)
    
    # Create log filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = os.path.join(log_dir, f"scraper_{timestamp}.log")
    
    # Configure logging
    logging.basicConfig(
        level=getattr(logging, log_level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file, encoding='utf-8'),
            logging.StreamHandler()
        ]
    )
    
    logger = logging.getLogger(__name__)
    logger.info(f"Logging initialized. Log file: {log_file}")


def create_driver(headless: bool = True) -> webdriver.Chrome:
    """Create and configure Chrome WebDriver."""
    options = Options()
    
    if headless:
        options.add_argument("--headless=new")
    
    # Standard options for stability
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--disable-extensions")
    options.add_argument("--disable-plugins")
    options.add_argument("--disable-images")  # Faster loading
    options.add_argument("--window-size=1920,1080")
    
    # User agent to avoid bot detection
    options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    
    # Create service
    service = Service(ChromeDriverManager().install())
    
    # Create driver
    driver = webdriver.Chrome(service=service, options=options)
    driver.implicitly_wait(10)
    
    return driver


def save_summary_log(results: Dict[str, Any], output_dir: str = "data") -> str:
    """Save job summary to a log file."""
    logs_dir = os.path.join(output_dir, "logs")
    os.makedirs(logs_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    summary_file = os.path.join(logs_dir, f"summary_{timestamp}.txt")
    
    with open(summary_file, 'w', encoding='utf-8') as f:
        f.write("=== SCRAPER JOB SUMMARY ===\n")
        f.write(f"Date: {datetime.now().isoformat()}\n")
        f.write(f"Site: {results.get('site_name', 'unknown')}\n")
        f.write(f"Total URLs collected: {results.get('total_urls', 0)}\n")
        f.write(f"Pages successfully scraped: {results.get('successful_pages', 0)}\n")
        f.write(f"Pages with errors: {results.get('failed_pages', 0)}\n")
        f.write(f"Total attachments downloaded: {results.get('total_attachments', 0)}\n")
        f.write(f"Start page: {results.get('start_page', 0)}\n")
        f.write(f"End page: {results.get('end_page', 0)}\n")
        f.write(f"Duration: {results.get('duration_seconds', 0):.2f} seconds\n")
        
        if results.get('errors'):
            f.write("\n=== ERRORS ===\n")
            for error in results['errors']:
                f.write(f"- {error}\n")
        
        if results.get('sample_urls'):
            f.write("\n=== SAMPLE URLS ===\n")
            for url in results['sample_urls'][:10]:  # First 10 URLs
                f.write(f"- {url}\n")
    
    return summary_file


def load_existing_pages(output_dir: str = "data") -> Dict[str, Dict[str, Any]]:
    """Load existing scraped pages to avoid re-scraping."""
    raw_pages_dir = os.path.join(output_dir, "raw_pages")
    existing_pages = {}
    
    if not os.path.exists(raw_pages_dir):
        return existing_pages
    
    for filename in os.listdir(raw_pages_dir):
        if filename.endswith('.json'):
            file_path = os.path.join(raw_pages_dir, filename)
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if 'source_url' in data:
                        existing_pages[data['source_url']] = data
            except Exception as e:
                logging.warning(f"Could not load existing page {filename}: {e}")
    
    return existing_pages


def filter_new_urls(urls: List[str], existing_pages: Dict[str, Dict[str, Any]]) -> List[str]:
    """Filter out URLs that have already been scraped."""
    new_urls = []
    for url in urls:
        if url not in existing_pages:
            new_urls.append(url)
    
    logging.info(f"Filtered {len(urls)} URLs -> {len(new_urls)} new URLs to scrape")
    return new_urls


def create_job_stats() -> Dict[str, Any]:
    """Create initial job statistics dictionary."""
    return {
        'start_time': datetime.now(),
        'total_urls': 0,
        'successful_pages': 0,
        'failed_pages': 0,
        'total_attachments': 0,
        'errors': [],
        'sample_urls': []
    }


def update_job_stats(stats: Dict[str, Any], result: Dict[str, Any]) -> None:
    """Update job statistics with a page result."""
    if 'error' in result:
        stats['failed_pages'] += 1
        stats['errors'].append(f"{result['source_url']}: {result['error']}")
    else:
        stats['successful_pages'] += 1
        stats['total_attachments'] += result.get('attachment_count', 0)


def finalize_job_stats(stats: Dict[str, Any]) -> Dict[str, Any]:
    """Finalize job statistics and calculate duration."""
    end_time = datetime.now()
    duration = (end_time - stats['start_time']).total_seconds()
    
    return {
        'site_name': stats.get('site_name', 'unknown'),
        'start_page': stats.get('start_page', 0),
        'end_page': stats.get('end_page', 0),
        'total_urls': stats['total_urls'],
        'successful_pages': stats['successful_pages'],
        'failed_pages': stats['failed_pages'],
        'total_attachments': stats['total_attachments'],
        'duration_seconds': duration,
        'errors': stats['errors'],
        'sample_urls': stats['sample_urls']
    }


def ensure_output_structure(output_dir: str = "data") -> None:
    """Ensure all required output directories exist."""
    directories = [
        output_dir,
        os.path.join(output_dir, "raw_pages"),
        os.path.join(output_dir, "attachments"),
        os.path.join(output_dir, "logs")
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
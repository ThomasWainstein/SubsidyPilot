"""
AgriTool Raw Text Scraper - Main CLI Entry Point

Scrapes raw text and attachments from agricultural funding websites.
Saves everything as raw files for later AI processing.

Usage:
    python scraper_main.py --site franceagrimer --start-page 0 --end-page 10
    python scraper_main.py --site idf_chambres --start-page 0 --end-page 5
    python scraper_main.py --url https://example.com/detail-page  # Single URL
"""

import argparse
import logging
import sys
from typing import List

from scraper.pagination import get_site_paginator, SITE_CONFIGS
from scraper.extract_raw_page import RawPageExtractor, extract_single_page
from scraper.utils import (
    setup_logging, create_driver, save_summary_log, 
    load_existing_pages, filter_new_urls, create_job_stats, 
    update_job_stats, finalize_job_stats, ensure_output_structure
)


def scrape_site_batch(site_name: str, start_page: int, end_page: int, output_dir: str = "data") -> None:
    """Scrape all pages from a site using pagination."""
    logger = logging.getLogger(__name__)
    logger.info(f"Starting batch scrape: {site_name}, pages {start_page}-{end_page}")
    
    # Initialize job stats
    stats = create_job_stats()
    stats.update({
        'site_name': site_name,
        'start_page': start_page,
        'end_page': end_page
    })
    
    driver = None
    try:
        # Create driver
        driver = create_driver()
        
        # Get paginator for site
        paginator = get_site_paginator(driver, site_name)
        
        # Collect all URLs
        logger.info("Collecting URLs from paginated listings...")
        all_urls = paginator.collect_all_detail_urls(start_page, end_page)
        stats['total_urls'] = len(all_urls)
        stats['sample_urls'] = all_urls[:10]  # Store sample for logging
        
        if not all_urls:
            logger.warning("No URLs collected! Check site configuration and selectors.")
            return
        
        # Load existing pages to avoid re-scraping
        existing_pages = load_existing_pages(output_dir)
        new_urls = filter_new_urls(all_urls, existing_pages)
        
        if not new_urls:
            logger.info("All URLs have already been scraped.")
            return
        
        # Create extractor
        extractor = RawPageExtractor(driver, output_dir)
        
        # Process each URL
        logger.info(f"Starting extraction of {len(new_urls)} new pages...")
        for i, url in enumerate(new_urls, 1):
            try:
                logger.info(f"Processing {i}/{len(new_urls)}: {url}")
                result = extractor.extract_page(url, site_name)
                update_job_stats(stats, result)
                
                # Log progress every 10 pages
                if i % 10 == 0:
                    success_rate = (stats['successful_pages'] / i) * 100
                    logger.info(f"Progress: {i}/{len(new_urls)} pages, {success_rate:.1f}% success rate")
                    
            except Exception as e:
                logger.error(f"Unexpected error processing {url}: {e}")
                stats['failed_pages'] += 1
                stats['errors'].append(f"{url}: {str(e)}")
        
    except Exception as e:
        logger.error(f"Fatal error in batch scraping: {e}")
        raise
    finally:
        if driver:
            driver.quit()
        
        # Save summary
        final_stats = finalize_job_stats(stats)
        summary_file = save_summary_log(final_stats, output_dir)
        logger.info(f"Job completed. Summary saved to: {summary_file}")
        
        # Print final stats
        print(f"\n=== SCRAPING COMPLETED ===")
        print(f"Site: {site_name}")
        print(f"Total URLs found: {final_stats['total_urls']}")
        print(f"Successfully scraped: {final_stats['successful_pages']}")
        print(f"Failed: {final_stats['failed_pages']}")
        print(f"Attachments downloaded: {final_stats['total_attachments']}")
        print(f"Duration: {final_stats['duration_seconds']:.2f} seconds")


def scrape_single_url(url: str, site_name: str = "unknown", output_dir: str = "data") -> None:
    """Scrape a single URL."""
    logger = logging.getLogger(__name__)
    logger.info(f"Scraping single URL: {url}")
    
    try:
        result = extract_single_page(url, site_name, output_dir)
        
        if 'error' in result:
            logger.error(f"Failed to scrape {url}: {result['error']}")
        else:
            logger.info(f"Successfully scraped {url}")
            logger.info(f"Text length: {len(result['raw_text'])} characters")
            logger.info(f"Attachments: {result['attachment_count']}")
            
    except Exception as e:
        logger.error(f"Error scraping {url}: {e}")
        raise


def main() -> None:
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="AgriTool Raw Text Scraper",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Scrape FranceAgriMer pages 0-10
  python scraper_main.py --site franceagrimer --start-page 0 --end-page 10
  
  # Scrape single URL
  python scraper_main.py --url https://www.franceagrimer.fr/quelque-aide-specifique
  
  # List available sites
  python scraper_main.py --list-sites
        """
    )
    
    # Mutually exclusive groups
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--site', choices=list(SITE_CONFIGS.keys()), 
                      help='Site to scrape using pagination')
    group.add_argument('--url', help='Single URL to scrape')
    group.add_argument('--list-sites', action='store_true', 
                      help='List available sites and exit')
    
    # Optional arguments
    parser.add_argument('--start-page', type=int, default=0,
                       help='Starting page number for pagination (default: 0)')
    parser.add_argument('--end-page', type=int, default=50,
                       help='Ending page number for pagination (default: 50)')
    parser.add_argument('--output-dir', default='data',
                       help='Output directory for scraped data (default: data)')
    parser.add_argument('--log-level', choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'],
                       default='INFO', help='Logging level (default: INFO)')
    parser.add_argument('--headless', action='store_true', default=True,
                       help='Run browser in headless mode (default: True)')
    parser.add_argument('--no-headless', action='store_false', dest='headless',
                       help='Run browser with GUI (for debugging)')
    
    args = parser.parse_args()
    
    # Handle list-sites command
    if args.list_sites:
        print("Available sites:")
        for site_name, config in SITE_CONFIGS.items():
            print(f"  {site_name}: {config['base_url']}")
        return
    
    # Setup output directory and logging
    ensure_output_structure(args.output_dir)
    setup_logging(f"{args.output_dir}/logs", args.log_level)
    
    logger = logging.getLogger(__name__)
    logger.info(f"AgriTool Raw Text Scraper starting...")
    logger.info(f"Arguments: {vars(args)}")
    
    try:
        if args.site:
            # Batch scraping with pagination
            scrape_site_batch(args.site, args.start_page, args.end_page, args.output_dir)
        elif args.url:
            # Single URL scraping
            scrape_single_url(args.url, "manual", args.output_dir)
            
    except KeyboardInterrupt:
        logger.info("Scraping interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Scraping failed: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()

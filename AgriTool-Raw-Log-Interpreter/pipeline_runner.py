#!/usr/bin/env python3
"""
AgriTool Pipeline Runner - CLI interface for the automated pipeline
Handles command-line arguments and orchestrates the extraction workflow
"""

import argparse
import logging
import sys
from pathlib import Path

def parse_pipeline_args():
    """
    Parse command-line arguments for the AgriTool pipeline.
    Includes all GitHub Actions workflow inputs.
    """
    parser = argparse.ArgumentParser(
        description='AgriTool Automated Pipeline - Process subsidy logs and documents',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    
    # Existing workflow inputs (unchanged)
    parser.add_argument(
        '--branch',
        default='main',
        help='Branch to use (Use workflow from)'
    )
    
    parser.add_argument(
        '--max-pages',
        type=int,
        default=0,
        help='Maximum pages to scrape (0 = unlimited)'
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Dry run mode (no database writes)'
    )
    
    parser.add_argument(
        '--run-tests',
        action='store_true',
        help='Run comprehensive test suite'
    )
    
    parser.add_argument(
        '--batch-size',
        type=int,
        default=10,
        help='AI agent batch size'
    )
    
    # NEW: URLs to scrape parameter
    parser.add_argument(
        '--urls-to-scrape',
        type=int,
        default=25,
        help='Number of URLs to scrape in this run (e.g., 10, 25, 100)'
    )
    
    # Additional pipeline options
    parser.add_argument(
        '--tika-url',
        default='http://localhost:9998',
        help='Apache Tika server URL'
    )
    
    parser.add_argument(
        '--enable-ocr',
        action='store_true',
        default=True,
        help='Enable OCR for scanned PDFs'
    )
    
    parser.add_argument(
        '--max-file-size-mb',
        type=int,
        default=10,
        help='Maximum file size before optimization (MB)'
    )
    
    return parser.parse_args()


def setup_logging(dry_run: bool = False):
    """Setup logging configuration"""
    log_level = logging.DEBUG if dry_run else logging.INFO
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler('agritool_pipeline.log')
        ]
    )
    return logging.getLogger(__name__)


def run_pipeline_with_args(args):
    """
    Run the complete AgriTool pipeline with parsed arguments.
    This demonstrates how the new urls_to_scrape parameter integrates.
    """
    logger = setup_logging(args.dry_run)
    
    logger.info("🌱 Starting AgriTool Automated Pipeline")
    logger.info(f"📊 Pipeline Configuration:")
    logger.info(f"  - Branch: {args.branch}")
    logger.info(f"  - URLs to scrape: {args.urls_to_scrape}")
    logger.info(f"  - Max pages per URL: {args.max_pages}")
    logger.info(f"  - Batch size: {args.batch_size}")
    logger.info(f"  - Dry run: {args.dry_run}")
    logger.info(f"  - Run tests: {args.run_tests}")
    logger.info(f"  - Tika URL: {args.tika_url}")
    logger.info(f"  - Enable OCR: {args.enable_ocr}")
    
    try:
        # Example: Use urls_to_scrape to limit URL processing
        urls_processed = 0
        max_urls = args.urls_to_scrape
        
        logger.info(f"🎯 Processing up to {max_urls} URLs in this run")
        
        # Example pipeline steps (integrate with your existing code)
        if args.run_tests:
            logger.info("🧪 Running comprehensive test suite...")
            # Add test execution logic here
        
        # Main scraping/extraction loop
        while urls_processed < max_urls:
            logger.info(f"📄 Processing URL {urls_processed + 1}/{max_urls}")
            
            # Your existing scraping logic here
            # This is where you'd integrate with:
            # - enhanced_agent.py
            # - scraper/runner.py  
            # - pdf_extraction_pipeline_production.py
            
            if args.dry_run:
                logger.info("🔍 DRY RUN - Would process URL here")
            else:
                logger.info("⚡ Processing URL...")
                # Actual processing logic
            
            urls_processed += 1
            
            # Break early if no more URLs available
            # This would come from your URL queue/database
            break
        
        logger.info(f"✅ Pipeline completed - Processed {urls_processed} URLs")
        
    except Exception as e:
        logger.error(f"❌ Pipeline failed: {str(e)}")
        return False
    
    return True


if __name__ == "__main__":
    # Parse command-line arguments
    args = parse_pipeline_args()
    
    # Run the pipeline
    success = run_pipeline_with_args(args)
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)
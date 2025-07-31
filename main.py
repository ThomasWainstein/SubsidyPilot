#!/usr/bin/env python3
"""
AgriTool Scraper - Main CLI Entry Point
Complete scraping pipeline with multiple execution modes
"""

import os
import sys
import argparse
import logging
from pathlib import Path

# Add scraper package to path
sys.path.insert(0, str(Path(__file__).parent))

from scraper.pipeline_orchestrator import PipelineOrchestrator
from scraper.batch_processor import BatchProcessor, BatchScrapeConfig
from scraper.core import extract_single_page
from scraper.supabase_uploader import SupabaseUploader
from scraper.ai_extractor import AIExtractor


def setup_environment():
    """Setup environment and validate dependencies"""
    
    # Check for required environment variables
    required_vars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY', 
        'SCRAPER_RAW_GPT_API'
    ]
    
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print("❌ Missing required environment variables:")
        for var in missing_vars:
            print(f"   - {var}")
        print("\nSet these variables or create a .env file with:")
        print("NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co")
        print("SUPABASE_SERVICE_ROLE_KEY=your-service-role-key")
        print("SCRAPER_RAW_GPT_API=your-openai-api-key")
        sys.exit(1)
    
    print("✅ Environment variables validated")


def run_complete_pipeline(args):
    """Run the complete end-to-end pipeline"""
    
    config = {
        'output_dir': args.output_dir,
        'max_workers': args.workers
    }
    
    orchestrator = PipelineOrchestrator(config)
    
    stats = orchestrator.run_complete_pipeline(
        site_name=args.site,
        max_urls=args.urls_to_scrape,
        max_pages=args.max_pages,
        batch_size=args.batch_size,
        dry_run=args.dry_run
    )
    
    return stats


def run_scraping_only(args):
    """Run scraping stage only"""
    
    config = BatchScrapeConfig()
    config.max_workers = args.workers
    
    processor = BatchProcessor(config)
    
    stats = processor.process_site(
        site_name=args.site,
        max_urls=args.urls_to_scrape,
        max_pages=args.max_pages,
        output_dir=args.output_dir
    )
    
    return stats


def run_upload_only(args):
    """Run upload stage only"""
    
    uploader = SupabaseUploader()
    
    stats = uploader.upload_scraped_data(
        data_dir=args.data_dir,
        batch_size=args.batch_size,
        dry_run=args.dry_run
    )
    
    return stats


def run_extraction_only(args):
    """Run AI extraction stage only"""
    
    extractor = AIExtractor()
    
    stats = extractor.process_raw_logs(
        batch_size=args.batch_size,
        max_records=args.max_records
    )
    
    return stats


def run_single_url(args):
    """Extract a single URL"""
    
    result = extract_single_page(args.url, args.output_dir)
    
    if result['success']:
        print(f"✅ Successfully extracted: {args.url}")
        print(f"📋 Title: {result['title']}")
        print(f"📝 Text length: {len(result['text'])} characters")
        return True
    else:
        print(f"❌ Extraction failed: {result.get('error', 'Unknown error')}")
        return False


def main():
    """Main CLI entry point"""
    
    parser = argparse.ArgumentParser(
        description="AgriTool Scraper - Complete Agricultural Subsidy Data Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Complete pipeline
  python main.py pipeline --site franceagrimer --urls-to-scrape 25
  
  # Scraping only
  python main.py scrape --site franceagrimer --urls-to-scrape 50 --max-pages 10
  
  # Upload only
  python main.py upload --data-dir data/scraped --batch-size 20
  
  # AI extraction only
  python main.py extract --batch-size 10
  
  # Single URL
  python main.py single --url https://www.franceagrimer.fr/aides/some-specific-aid
        """
    )
    
    # Global arguments
    parser.add_argument('--dry-run', action='store_true', help='Dry run mode (no writes)')
    parser.add_argument('--output-dir', default='data/scraped', help='Output directory')
    parser.add_argument('--workers', type=int, default=3, help='Number of parallel workers')
    parser.add_argument('--batch-size', type=int, default=10, help='Batch size for processing')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose logging')
    
    # Subcommands
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Complete pipeline
    pipeline_parser = subparsers.add_parser('pipeline', help='Run complete pipeline')
    pipeline_parser.add_argument('--site', required=True, help='Site to scrape')
    pipeline_parser.add_argument('--urls-to-scrape', type=int, default=25, help='URLs to scrape')
    pipeline_parser.add_argument('--max-pages', type=int, default=10, help='Max pages to scan')
    
    # Scraping only
    scrape_parser = subparsers.add_parser('scrape', help='Run scraping only')
    scrape_parser.add_argument('--site', required=True, help='Site to scrape')
    scrape_parser.add_argument('--urls-to-scrape', type=int, default=25, help='URLs to scrape')
    scrape_parser.add_argument('--max-pages', type=int, default=10, help='Max pages to scan')
    
    # Upload only
    upload_parser = subparsers.add_parser('upload', help='Upload scraped data')
    upload_parser.add_argument('--data-dir', default='data/scraped', help='Data directory')
    
    # AI extraction only
    extract_parser = subparsers.add_parser('extract', help='Run AI extraction')
    extract_parser.add_argument('--max-records', type=int, help='Max records to process')
    
    # Single URL
    single_parser = subparsers.add_parser('single', help='Extract single URL')
    single_parser.add_argument('--url', required=True, help='URL to extract')
    
    args = parser.parse_args()
    
    # Setup logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Validate environment
    setup_environment()
    
    # Execute command
    try:
        if args.command == 'pipeline':
            stats = run_complete_pipeline(args)
            success = len(stats.get('errors', [])) == 0
            
        elif args.command == 'scrape':
            stats = run_scraping_only(args)
            success = stats.get('success_rate', 0) > 70
            
        elif args.command == 'upload':
            stats = run_upload_only(args)
            success = stats.get('success_rate', 0) > 80
            
        elif args.command == 'extract':
            stats = run_extraction_only(args)
            success = stats.get('success_rate', 0) > 80
            
        elif args.command == 'single':
            success = run_single_url(args)
            
        else:
            parser.print_help()
            sys.exit(1)
        
        # Exit with appropriate code
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print("\n🛑 Operation interrupted by user")
        sys.exit(130)
        
    except Exception as e:
        print(f"❌ Operation failed: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
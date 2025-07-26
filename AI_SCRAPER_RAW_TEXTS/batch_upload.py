#!/usr/bin/env python3
"""
Batch Upload Manager for Raw Scraped Data

This script provides advanced batch upload capabilities with monitoring,
progress tracking, and robust error handling for large datasets.

Usage:
    python batch_upload.py [--parallel] [--check-existing] [--resume-from ID]
"""

import os
import sys
import json
import logging
import argparse
import concurrent.futures
from typing import List, Dict, Any, Set
from pathlib import Path
from datetime import datetime

try:
    from supabase import create_client, Client
except ImportError:
    print("❌ Error: supabase-py not installed. Run: pip install supabase")
    exit(1)

def setup_logging():
    """Configure advanced logging for batch operations"""
    log_dir = Path('data/logs')
    log_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    log_file = log_dir / f'batch_upload_{timestamp}.log'
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger(__name__)

def get_existing_urls(supabase: Client) -> Set[str]:
    """Fetch all existing source URLs from database"""
    logger = logging.getLogger(__name__)
    try:
        response = supabase.table('raw_scraped_pages').select('source_url').execute()
        urls = {row['source_url'] for row in response.data}
        logger.info(f"📊 Found {len(urls)} existing URLs in database")
        return urls
    except Exception as e:
        logger.error(f"❌ Error fetching existing URLs: {e}")
        return set()

def upload_single_file(args_tuple) -> Dict[str, Any]:
    """Upload a single JSON file (for parallel processing)"""
    json_file, supabase_config, existing_urls = args_tuple
    
    result = {
        'file': str(json_file),
        'status': 'success',
        'error': None,
        'skipped': False
    }
    
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            raw_data = json.load(f)
        
        source_url = raw_data.get('source_url')
        if not source_url:
            result['status'] = 'skipped'
            result['error'] = 'Missing source_url'
            result['skipped'] = True
            return result
        
        # Check if already exists
        if existing_urls and source_url in existing_urls:
            result['status'] = 'skipped'
            result['error'] = 'Already exists'
            result['skipped'] = True
            return result
        
        # Prepare data
        attachment_paths = raw_data.get('attachment_paths', [])
        prepared_data = {
            'source_url': source_url,
            'source_site': raw_data.get('source_site'),
            'scrape_date': raw_data.get('scrape_date'),
            'raw_html': raw_data.get('raw_html'),
            'raw_text': raw_data.get('raw_text'),
            'attachment_paths': attachment_paths,
            'attachment_count': len(attachment_paths) if attachment_paths else 0,
            'status': 'raw'
        }
        
        # Upload to Supabase
        supabase = create_client(supabase_config['url'], supabase_config['key'])
        response = supabase.table('raw_scraped_pages').upsert(
            prepared_data,
            on_conflict='source_url'
        ).execute()
        
        if response.data:
            result['status'] = 'success'
        else:
            result['status'] = 'error'
            result['error'] = 'No data returned from upsert'
            
    except Exception as e:
        result['status'] = 'error'
        result['error'] = str(e)
    
    return result

def parallel_upload(supabase: Client, json_files: List[Path], max_workers: int = 4, check_existing: bool = True) -> Dict[str, int]:
    """Upload files in parallel for faster processing"""
    logger = logging.getLogger(__name__)
    
    # Get existing URLs if requested
    existing_urls = get_existing_urls(supabase) if check_existing else set()
    
    # Prepare arguments for parallel processing
    supabase_config = {
        'url': os.environ["NEXT_PUBLIC_SUPABASE_URL"],
        'key': os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    }
    
    args_list = [(f, supabase_config, existing_urls) for f in json_files]
    
    stats = {'uploaded': 0, 'errors': 0, 'skipped': 0}
    
    logger.info(f"🚀 Starting parallel upload with {max_workers} workers")
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_file = {executor.submit(upload_single_file, args): args[0] for args in args_list}
        
        for future in concurrent.futures.as_completed(future_to_file):
            result = future.result()
            
            if result['status'] == 'success':
                stats['uploaded'] += 1
                logger.info(f"✅ {Path(result['file']).name}")
            elif result['skipped']:
                stats['skipped'] += 1
                logger.debug(f"⏭️ {Path(result['file']).name}: {result['error']}")
            else:
                stats['errors'] += 1
                logger.error(f"❌ {Path(result['file']).name}: {result['error']}")
    
    return stats

def main():
    # Auto-load .env for local development
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass
    
    # Early validation of required environment variables
    required_vars = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
    missing_vars = [var for var in required_vars if not os.environ.get(var)]
    if missing_vars:
        print(f"ERROR: Required env vars {', '.join(missing_vars)} are missing. Exiting.")
        print("Please set the following environment variables:")
        for var in missing_vars:
            print(f"  export {var}=your_value_here")
        sys.exit(1)
    
    parser = argparse.ArgumentParser(description='Advanced batch upload for raw scraped data')
    parser.add_argument('--parallel', action='store_true', help='Enable parallel processing')
    parser.add_argument('--max-workers', type=int, default=4, help='Maximum number of worker threads')
    parser.add_argument('--check-existing', action='store_true', help='Skip files that already exist in database')
    parser.add_argument('--data-dir', default='data/raw_pages', help='Directory containing JSON files')
    
    args = parser.parse_args()
    
    # Setup logging
    logger = setup_logging()
    
    # Find JSON files
    data_dir = Path(args.data_dir)
    if not data_dir.exists():
        logger.error(f"❌ Data directory not found: {data_dir}")
        return 1
    
    json_files = list(data_dir.glob('*.json'))
    if not json_files:
        logger.warning(f"⚠️ No JSON files found in {data_dir}")
        return 0
    
    logger.info(f"📁 Found {len(json_files)} JSON files to process")
    
    try:
        # Initialize Supabase client
        supabase = create_client(
            os.environ["NEXT_PUBLIC_SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        )
        logger.info("✅ Connected to Supabase")
        
        # Choose upload method
        if args.parallel:
            stats = parallel_upload(supabase, json_files, args.max_workers, args.check_existing)
        else:
            # Use the original upload method from upload_raw_to_supabase.py
            from upload_raw_to_supabase import upload_json_files
            stats = upload_json_files(supabase, json_files, batch_size=50, dry_run=False)
        
        # Log final summary
        logger.info(f"""
🎯 BATCH UPLOAD SUMMARY:
   📤 Uploaded: {stats['uploaded']}
   ❌ Errors: {stats['errors']}
   ⏭️ Skipped: {stats['skipped']}
   📊 Total files: {len(json_files)}
   🔧 Method: {'Parallel' if args.parallel else 'Sequential'}
        """)
        
        return 0 if stats['errors'] == 0 else 1
        
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}")
        return 1

if __name__ == "__main__":
    exit(main())
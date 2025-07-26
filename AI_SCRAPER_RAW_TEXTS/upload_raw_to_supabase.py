#!/usr/bin/env python3
"""
Upload Raw Scraped Data to Supabase

This script reads JSON files from data/raw_pages/ and uploads them to 
the Supabase raw_scraped_pages table for centralized storage and processing.

Usage:
    python upload_raw_to_supabase.py [--dry-run] [--batch-size 50]
"""

import os
import sys
import json
import logging
import argparse
from typing import List, Dict, Any
from pathlib import Path

try:
    from supabase import create_client, Client
except ImportError:
    print("❌ Error: supabase-py not installed. Run: pip install supabase")
    exit(1)

def setup_logging():
    """Configure logging for upload operations"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('data/logs/supabase_upload.log'),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger(__name__)

def get_supabase_client() -> Client:
    """Initialize Supabase client with environment variables"""
    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        raise ValueError(
            "Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
        )
    
    return create_client(supabase_url, supabase_key)

def prepare_data_for_upload(data: Dict[str, Any]) -> Dict[str, Any]:
    """Transform JSON data to match Supabase table schema"""
    # Calculate attachment count
    attachment_paths = data.get('attachment_paths', [])
    attachment_count = len(attachment_paths) if attachment_paths else 0
    
    return {
        'source_url': data.get('source_url'),
        'source_site': data.get('source_site'),
        'scrape_date': data.get('scrape_date'),
        'raw_html': data.get('raw_html'),
        'raw_text': data.get('raw_text'),
        'attachment_paths': attachment_paths,
        'attachment_count': attachment_count,
        'status': 'raw'
    }

def upload_json_files(supabase: Client, json_files: List[Path], batch_size: int = 50, dry_run: bool = False) -> Dict[str, int]:
    """Upload JSON files to Supabase in batches with retry logic"""
    logger = logging.getLogger(__name__)
    stats = {'uploaded': 0, 'errors': 0, 'skipped': 0, 'retries': 0}
    
    for i in range(0, len(json_files), batch_size):
        batch = json_files[i:i + batch_size]
        batch_data = []
        
        for json_file in batch:
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    raw_data = json.load(f)
                
                prepared_data = prepare_data_for_upload(raw_data)
                
                # Validate required fields
                if not prepared_data.get('source_url'):
                    logger.warning(f"Skipping {json_file}: missing source_url")
                    stats['skipped'] += 1
                    continue
                
                # Additional validation
                if len(prepared_data.get('source_url', '')) > 2048:
                    logger.warning(f"Skipping {json_file}: source_url too long")
                    stats['skipped'] += 1
                    continue
                
                batch_data.append(prepared_data)
                
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON in {json_file}: {e}")
                stats['errors'] += 1
                continue
            except Exception as e:
                logger.error(f"Error processing {json_file}: {e}")
                stats['errors'] += 1
                continue
        
        if not batch_data:
            continue
            
        if dry_run:
            logger.info(f"DRY RUN: Would upload {len(batch_data)} records")
            stats['uploaded'] += len(batch_data)
            continue
        
        # Upload with retry logic
        success = False
        retry_count = 0
        max_retries = 3
        
        while not success and retry_count < max_retries:
            try:
                # Use upsert to handle potential duplicates
                response = supabase.table('raw_scraped_pages').upsert(
                    batch_data,
                    on_conflict='source_url'
                ).execute()
                
                uploaded_count = len(response.data) if response.data else len(batch_data)
                stats['uploaded'] += uploaded_count
                logger.info(f"✅ Uploaded batch {i//batch_size + 1}: {uploaded_count} records")
                success = True
                
            except Exception as e:
                retry_count += 1
                stats['retries'] += 1
                
                if retry_count < max_retries:
                    logger.warning(f"⚠️ Retry {retry_count}/{max_retries} for batch {i//batch_size + 1}: {e}")
                    import time
                    time.sleep(2 ** retry_count)  # Exponential backoff
                else:
                    logger.error(f"❌ Failed to upload batch {i//batch_size + 1} after {max_retries} attempts: {e}")
                    stats['errors'] += len(batch_data)
    
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
    
    parser = argparse.ArgumentParser(description='Upload raw scraped data to Supabase')
    parser.add_argument('--dry-run', action='store_true', help='Preview upload without actually inserting data')
    parser.add_argument('--batch-size', type=int, default=50, help='Number of records to upload per batch')
    parser.add_argument('--data-dir', default='data/raw_pages', help='Directory containing JSON files')
    
    args = parser.parse_args()
    
    # Setup logging
    logger = setup_logging()
    
    # Ensure data directory exists
    data_dir = Path(args.data_dir)
    if not data_dir.exists():
        logger.error(f"❌ Data directory not found: {data_dir}")
        return 1
    
    # Find all JSON files
    json_files = list(data_dir.glob('*.json'))
    if not json_files:
        logger.warning(f"⚠️ No JSON files found in {data_dir}")
        return 0
    
    logger.info(f"📁 Found {len(json_files)} JSON files to process")
    
    try:
        # Initialize Supabase client
        supabase = get_supabase_client()
        logger.info("✅ Connected to Supabase")
        
        # Upload files
        stats = upload_json_files(supabase, json_files, args.batch_size, args.dry_run)
        
        # Log summary
        mode = "DRY RUN" if args.dry_run else "UPLOAD"
        logger.info(f"""
🎯 {mode} SUMMARY:
   📤 Uploaded: {stats['uploaded']}
   ❌ Errors: {stats['errors']}
   ⏭️ Skipped: {stats['skipped']}
   🔄 Retries: {stats.get('retries', 0)}
   📊 Total files: {len(json_files)}
        """)
        
        return 0 if stats['errors'] == 0 else 1
        
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}")
        return 1

if __name__ == "__main__":
    exit(main())
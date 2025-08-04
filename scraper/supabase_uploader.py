#!/usr/bin/env python3
"""
AgriTool Supabase Uploader - Robust data upload to Supabase
Handles batch uploads, retry logic, and data validation
"""

import os
import sys
import json
import time
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path
import hashlib
from logging_setup import setup_pipeline_logging, ensure_artifact_files, log_pipeline_stats

# Supabase client
try:
    from supabase import create_client, Client
except ImportError:
    print("❌ ERROR: Supabase client not installed")
    print("Install with: pip install supabase")
    sys.exit(1)


class SupabaseUploader:
    """Robust uploader for scraped data to Supabase"""
    
    def __init__(self):
        ensure_artifact_files()
        self.logger = setup_pipeline_logging("supabase_uploader")
        self.client = self._init_supabase_client()
        
        # Upload statistics
        self.stats = {
            'total_files': 0,
            'successful_uploads': 0,
            'failed_uploads': 0,
            'duplicate_skips': 0,
            'start_time': None,
            'errors': []
        }
    
    def _setup_logging(self) -> logging.Logger:
        """Setup logging for upload operations"""
        logger = logging.getLogger('supabase_uploader')
        logger.setLevel(logging.INFO)
        
        if not logger.handlers:
            handler = logging.StreamHandler(sys.stdout)
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        
        return logger
    
    def _init_supabase_client(self) -> Client:
        """Initialize Supabase client with environment variables"""
        
        # Check for required environment variables
        required_vars = {
            'SUPABASE_URL': os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL'),
            'SUPABASE_KEY': os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')
        }
        
        missing_vars = [var for var, value in required_vars.items() if not value]
        if missing_vars:
            self.logger.error(f"❌ Missing environment variables: {missing_vars}")
            self.logger.error("Required variables:")
            self.logger.error("  - NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL")
            self.logger.error("  - SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY")
            raise ValueError("Missing required environment variables")
        
        try:
            client = create_client(required_vars['SUPABASE_URL'], required_vars['SUPABASE_KEY'])
            self.logger.info("✅ Supabase client initialized")
            return client
            
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize Supabase client: {e}")
            raise
    
    def upload_scraped_data(self, data_dir: str, batch_size: int = 50, 
                          dry_run: bool = False) -> Dict[str, Any]:
        """Upload scraped JSON files to Supabase"""
        
        self.logger.info(f"🚀 Starting Supabase upload from: {data_dir}")
        self.logger.info(f"📊 Batch size: {batch_size}, Dry run: {dry_run}")
        
        self.stats['start_time'] = time.time()
        
        # Find JSON files
        json_files = list(Path(data_dir).glob("*.json"))
        self.stats['total_files'] = len(json_files)
        
        if not json_files:
            self.logger.warning(f"⚠️ No JSON files found in: {data_dir}")
            return self._finalize_stats()
        
        self.logger.info(f"📄 Found {len(json_files)} JSON files to process")
        
        # Process files in batches
        for i in range(0, len(json_files), batch_size):
            batch = json_files[i:i + batch_size]
            self.logger.info(f"📦 Processing batch {i//batch_size + 1}: {len(batch)} files")
            
            batch_data = []
            
            # Prepare batch data
            for json_file in batch:
                try:
                    record = self._prepare_record(json_file)
                    if record:
                        batch_data.append(record)
                        
                except Exception as e:
                    self.stats['failed_uploads'] += 1
                    self.stats['errors'].append({
                        'file': str(json_file),
                        'error': str(e)
                    })
                    self.logger.error(f"❌ Failed to prepare {json_file}: {e}")
            
            # Upload batch
            if batch_data and not dry_run:
                self._upload_batch(batch_data)
            elif dry_run:
                self.logger.info(f"🧪 Dry run: Would upload {len(batch_data)} records")
                self.stats['successful_uploads'] += len(batch_data)
            
            # Respectful delay between batches
            time.sleep(1)
        
        return self._finalize_stats()
    
    def _prepare_record(self, json_file: Path) -> Optional[Dict[str, Any]]:
        """Prepare a scraped JSON file for Supabase upload"""
        
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Validate required fields
            if not data.get('success', False):
                self.logger.warning(f"⚠️ Skipping failed extraction: {json_file}")
                return None
            
            url = data.get('url')
            if not url:
                self.logger.warning(f"⚠️ Skipping record without URL: {json_file}")
                return None
            
            # Check for duplicates
            if self._is_duplicate(url):
                self.stats['duplicate_skips'] += 1
                self.logger.info(f"⏭️ Skipping duplicate URL: {url}")
                return None
            
            # Prepare record for raw_scraped_pages table
            record = {
                'source_url': url,
                'source_site': self._extract_site_name(url),
                'raw_html': data.get('html', ''),
                'raw_text': data.get('text', ''),
                'raw_markdown': data.get('text_markdown', ''),
                'attachment_paths': json.dumps(data.get('attachments', [])),
                'attachment_count': len(data.get('attachments', [])),
                'scrape_date': time.strftime('%Y-%m-%d %H:%M:%S',
                                           time.gmtime(data.get('extraction_timestamp', time.time()))),
                'status': 'raw',
                'error_message': data.get('error')
            }
            
            return record
            
        except Exception as e:
            self.logger.error(f"❌ Error preparing record from {json_file}: {e}")
            raise
    
    def _is_duplicate(self, url: str) -> bool:
        """Check if URL already exists in database"""
        try:
            response = self.client.table('raw_scraped_pages').select('id').eq('source_url', url).execute()
            return len(response.data) > 0
            
        except Exception as e:
            self.logger.warning(f"⚠️ Error checking for duplicate {url}: {e}")
            return False
    
    def _extract_site_name(self, url: str) -> str:
        """Extract site name from URL"""
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            domain = parsed.netloc.lower()
            
            # Map known domains to site names
            site_mapping = {
                'franceagrimer.fr': 'franceagrimer',
                'www.franceagrimer.fr': 'franceagrimer',
                'chambres-agriculture.fr': 'chambres_agriculture',
                'www.chambres-agriculture.fr': 'chambres_agriculture'
            }
            
            return site_mapping.get(domain, domain)
            
        except:
            return 'unknown'
    
    def _upload_batch(self, batch_data: List[Dict[str, Any]]) -> None:
        """Upload a batch of records to Supabase"""
        
        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                response = self.client.table('raw_scraped_pages').insert(batch_data).execute()
                
                if response.data:
                    self.stats['successful_uploads'] += len(batch_data)
                    self.logger.info(f"✅ Successfully uploaded batch of {len(batch_data)} records")
                    return
                else:
                    raise Exception("No data returned from insert")
                    
            except Exception as e:
                self.logger.warning(f"⚠️ Upload attempt {attempt + 1} failed: {e}")
                
                if attempt < max_retries - 1:
                    # Exponential backoff
                    delay = (2 ** attempt) + 1
                    time.sleep(delay)
                else:
                    # Final failure
                    self.stats['failed_uploads'] += len(batch_data)
                    self.stats['errors'].append({
                        'batch_size': len(batch_data),
                        'error': str(e)
                    })
                    self.logger.error(f"❌ Failed to upload batch after {max_retries} attempts: {e}")
    
    def _finalize_stats(self) -> Dict[str, Any]:
        """Finalize and return upload statistics"""
        
        self.stats['end_time'] = time.time()
        self.stats['duration'] = self.stats['end_time'] - self.stats['start_time']
        self.stats['success_rate'] = (
            self.stats['successful_uploads'] / max(self.stats['total_files'], 1) * 100
        )
        
        # Log summary
        self.logger.info("🏁 Upload process completed")
        self.logger.info(f"📊 Upload Statistics:")
        self.logger.info(f"   Total files: {self.stats['total_files']}")
        self.logger.info(f"   Successful uploads: {self.stats['successful_uploads']}")
        self.logger.info(f"   Failed uploads: {self.stats['failed_uploads']}")
        self.logger.info(f"   Duplicate skips: {self.stats['duplicate_skips']}")
        self.logger.info(f"   Success rate: {self.stats['success_rate']:.1f}%")
        self.logger.info(f"   Duration: {self.stats['duration']:.1f} seconds")
        
        if self.stats['errors']:
            self.logger.error(f"❌ {len(self.stats['errors'])} errors occurred during upload")
        
        return self.stats
    
    def upload_single_file(self, json_file: str, dry_run: bool = False) -> bool:
        """Upload a single JSON file"""
        
        try:
            record = self._prepare_record(Path(json_file))
            
            if not record:
                self.logger.warning(f"⚠️ No valid record to upload from: {json_file}")
                return False
            
            if dry_run:
                self.logger.info(f"🧪 Dry run: Would upload record for {record['source_url']}")
                return True
            
            response = self.client.table('raw_scraped_pages').insert([record]).execute()
            
            if response.data:
                self.logger.info(f"✅ Successfully uploaded: {record['source_url']}")
                return True
            else:
                self.logger.error(f"❌ Failed to upload: {record['source_url']}")
                return False
                
        except Exception as e:
            self.logger.error(f"❌ Error uploading {json_file}: {e}")
            return False


def main():
    """CLI entry point for Supabase upload"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Upload scraped data to Supabase")
    parser.add_argument('--data-dir', required=True, help='Directory containing JSON files')
    parser.add_argument('--batch-size', type=int, default=50, help='Batch size for uploads')
    parser.add_argument('--dry-run', action='store_true', help='Dry run mode (no actual uploads)')
    parser.add_argument('--file', help='Upload single file instead of directory')
    
    args = parser.parse_args()
    
    uploader = SupabaseUploader()
    
    if args.file:
        # Upload single file
        success = uploader.upload_single_file(args.file, args.dry_run)
        sys.exit(0 if success else 1)
    else:
        # Upload directory
        stats = uploader.upload_scraped_data(args.data_dir, args.batch_size, args.dry_run)
        exit_code = 0 if stats['success_rate'] > 80 else 1
        sys.exit(exit_code)


if __name__ == "__main__":
    main()
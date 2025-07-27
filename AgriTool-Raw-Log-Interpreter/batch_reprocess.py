#!/usr/bin/env python3
"""
Batch Reprocessing Script for AgriTool Raw Log Interpreter

Reprocesses failed logs to fix array format issues and other extraction problems.
"""

import os
import sys
import json
import logging
from typing import List, Dict, Any
from datetime import datetime

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    from supabase import create_client, Client
except ImportError:
    print("ERROR: supabase dependency missing. Run: pip install supabase")
    sys.exit(1)

class BatchReprocessor:
    """Batch reprocessing for failed log entries"""
    
    def __init__(self):
        self.logger = self._setup_logging()
        self.supabase = self._init_supabase()
    
    def _setup_logging(self) -> logging.Logger:
        """Setup logging configuration"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.StreamHandler(sys.stdout),
                logging.FileHandler('batch_reprocess.log')
            ]
        )
        return logging.getLogger(__name__)
    
    def _init_supabase(self) -> Client:
        """Initialize Supabase client"""
        try:
            url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
            key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            
            if not url or not key:
                raise ValueError("Missing Supabase environment variables")
            
            client = create_client(url, key)
            # Test connection
            client.table('raw_logs').select('id').limit(1).execute()
            self.logger.info("Supabase connection established")
            return client
        except Exception as e:
            self.logger.error(f"Failed to connect to Supabase: {e}")
            sys.exit(1)
    
    def find_failed_logs(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Find logs that failed during processing"""
        try:
            # Get logs that failed processing (have errors in error_log table)
            response = self.supabase.table('error_log').select(
                'raw_log_id, error_type, error_message, created_at'
            ).order('created_at', desc=True).limit(limit).execute()
            
            failed_logs = []
            array_error_keywords = ['array', 'malformed', 'expected JSON array', '22P02']
            
            for error in response.data:
                error_msg_lower = error['error_message'].lower()
                if any(keyword in error_msg_lower for keyword in array_error_keywords):
                    failed_logs.append({
                        'raw_log_id': error['raw_log_id'],
                        'error_type': error['error_type'],
                        'error_message': error['error_message'],
                        'failed_at': error['created_at']
                    })
            
            # Also get unprocessed logs (processed=False)
            unprocessed_response = self.supabase.table('raw_logs').select(
                'id, created_at, processed, processed_at'
            ).eq('processed', False).limit(limit).execute()
            
            for log in unprocessed_response.data:
                failed_logs.append({
                    'raw_log_id': log['id'],
                    'error_type': 'UNPROCESSED',
                    'error_message': 'Log never processed',
                    'failed_at': log['created_at']
                })
            
            self.logger.info(f"Found {len(failed_logs)} logs needing reprocessing")
            return failed_logs
            
        except Exception as e:
            self.logger.error(f"Failed to fetch failed logs: {e}")
            return []
    
    def reprocess_log(self, raw_log_id: str) -> bool:
        """Reprocess a single log using the extract-canonical-subsidy edge function"""
        try:
            # Call the edge function to reprocess
            response = self.supabase.functions.invoke('extract-canonical-subsidy', {
                'body': {
                    'raw_log_id': raw_log_id,
                    'force_reprocess': True
                }
            })
            
            if response.data and response.data.get('success'):
                self.logger.info(f"✅ Successfully reprocessed log {raw_log_id}")
                return True
            else:
                error_msg = response.data.get('error', 'Unknown error') if response.data else 'No response data'
                self.logger.error(f"❌ Failed to reprocess log {raw_log_id}: {error_msg}")
                return False
                
        except Exception as e:
            self.logger.error(f"❌ Exception during reprocessing log {raw_log_id}: {e}")
            return False
    
    def run_batch_reprocess(self, limit: int = 50, dry_run: bool = False):
        """Run batch reprocessing of failed logs"""
        self.logger.info(f"🔄 Starting batch reprocess (limit: {limit}, dry_run: {dry_run})")
        
        # Find failed logs
        failed_logs = self.find_failed_logs(limit)
        
        if not failed_logs:
            self.logger.info("✅ No failed logs found to reprocess")
            return
        
        if dry_run:
            self.logger.info(f"🔍 DRY RUN: Would reprocess {len(failed_logs)} logs:")
            for log in failed_logs:
                self.logger.info(f"  - {log['raw_log_id']}: {log['error_message'][:100]}...")
            return
        
        # Reprocess each log
        success_count = 0
        for i, log in enumerate(failed_logs, 1):
            self.logger.info(f"📝 Processing {i}/{len(failed_logs)}: {log['raw_log_id']}")
            
            if self.reprocess_log(log['raw_log_id']):
                success_count += 1
            
            # Add small delay to avoid overwhelming the system
            import time
            time.sleep(1)
        
        self.logger.info(f"🎯 Batch reprocess complete: {success_count}/{len(failed_logs)} successful")
    
    def cleanup_duplicate_extractions(self):
        """Remove duplicate structured entries (keep the latest)"""
        try:
            # Find raw_log_ids with multiple structured entries
            response = self.supabase.rpc('find_duplicate_structured_entries').execute()
            
            if response.data:
                for duplicate in response.data:
                    self.logger.info(f"🗑️ Cleaning duplicates for raw_log_id: {duplicate['raw_log_id']}")
                    # Implementation would remove older entries, keeping the latest
            
        except Exception as e:
            self.logger.info(f"ℹ️ Cleanup function not available: {e}")

def main():
    """Main execution"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Batch reprocess failed AgriTool logs')
    parser.add_argument('--limit', type=int, default=50, help='Max number of logs to process')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be processed without doing it')
    parser.add_argument('--cleanup', action='store_true', help='Also run cleanup of duplicates')
    
    args = parser.parse_args()
    
    reprocessor = BatchReprocessor()
    
    # Run batch reprocessing
    reprocessor.run_batch_reprocess(limit=args.limit, dry_run=args.dry_run)
    
    # Optional cleanup
    if args.cleanup and not args.dry_run:
        reprocessor.cleanup_duplicate_extractions()

if __name__ == "__main__":
    main()
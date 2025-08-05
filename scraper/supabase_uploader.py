def _add_error(self, source: str, error: str, traceback_str: str = "") -> None:
        """Add error to statistics with enhanced details"""
        
        error_record = {
            'source': source,
            'error': error,
            'timestamp': datetime.now().isoformat(),
            'session_id': self._session_id,
            'attempt_number': len([e for e in self.stats.errors if e.get('source') == source]) + 1
        }
        
        if traceback_str:
            error_record['traceback'] = traceback_str
        
        self.stats.errors.append(error_record)
    
    def _finalize_stats(self) -> UploadStats:
        """Finalize and log comprehensive upload statistics"""
        
        self.stats.end_time = time.time()
        
        # Log comprehensive summary
        self.logger.info("🏁 Upload process completed")
        self.logger.info(f"📊 Final Statistics:")
        self.logger.info(f"   ├─ Total files: {self.stats.total_files}")
        self.logger.info(f"   ├─ Successful uploads: {self.stats.successful_uploads}")
        self.logger.info(f"   ├─ Failed uploads: {self.stats.failed_uploads}")
        self.logger.info(f"   ├─ Duplicate skips: {self.stats.duplicate_skips}")
        self.logger.info(f"   ├─ Validation failures: {self.stats.validation_failures}")
        self.logger.info(f"   ├─ Retry attempts: {self.stats.retry_attempts}")
        self.logger.info(f"   ├─ Success rate: {self.stats.success_rate:.1f}%")
        self.logger.info(f"   ├─ Upload rate: {self.stats.upload_rate:.2f} files/sec")
        self.logger.info(f"   ├─ Throughput: {self.stats.throughput_mbps:.2f} MB/s")
        self.logger.info(f"   └─ Duration: {self.stats.duration:.1f} seconds")
        
        # Log file type distribution
        if self.stats.file_types:
            self.logger.info(f"📁 File types processed: {dict(self.stats.file_types)}")
        
        # Log batch performance
        if self.stats.batch_stats:
            avg_batch_success = sum(b['successful'] for b in self.stats.batch_stats) / len(self.stats.batch_stats)
            self.logger.info(f"📦 Average batch success rate: {avg_batch_success:.1f} files/batch")
        
        # Log system performance if available
        if HAS_PSUTIL:
            memory_usage = psutil.Process().memory_info().rss / (1024 * 1024)  # MB
            self.logger.info(f"💾 Peak memory usage: {memory_usage:.1f} MB")
        
        # Log errors summary
        if self.stats.errors:
            self.logger.warning(f"⚠️ Errors encountered: {len(self.stats.errors)}")
            
            # Group errors by type
            error_types = {}
            for error in self.stats.errors:
                error_type = type(error.get('error', '')).__name__
                error_types[error_type] = error_types.get(error_type, 0) + 1
            
            for error_type, count in error_types.items():
                self.logger.warning(f"   ├─ {error_type}: {count}")
            
            # Show sample errors
            for error in self.stats.errors[:3]:
                self.logger.warning(f"   └─ {error['source']}: {error['error'][:100]}...")
        
        # Log to pipeline stats if available
        if HAS_LOGGING_SETUP:
            try:
                log_pipeline_stats("supabase_uploader", asdict(self.stats))
            except Exception as e:
                self.logger.error(f"Failed to log pipeline stats: {e}")
        
        return self.stats
    
    # Synchronous wrapper methods for backward compatibility
    def upload_scraped_data(
        self, 
        data_dir: str, 
        batch_size: int = 50, 
        dry_run: bool = False
    ) -> Dict[str, Any]:
        """Synchronous wrapper for async upload processing"""
        
        # Update config with provided parameters
        self.config.batch_size = batch_size
        self.config.dry_run = dry_run
        
        # Run async processing
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            stats = loop.run_until_complete(
                self.upload_scraped_data_async(data_dir)
            )
            return asdict(stats)
        finally:
            loop.close()
    
    def upload_single_file(self, json_file: str, dry_run: bool = False) -> bool:
        """Synchronous wrapper for single file upload"""
        
        self.config.dry_run = dry_run
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # Process single file
            file_path = Path(json_file)
            
            async def upload_single():
                await self.initialize()
                return await self._process_single_file_with_retry(file_path, 1)
            
            return loop.run_until_complete(upload_single())
        finally:
            loop.close()


class UploadMonitor:
    """Monitor upload progress and system performance"""
    
    def __init__(self, uploader: SupabaseUploader):
        self.uploader = uploader
        self.start_time = time.time()
        self.last_check_time = self.start_time
        self.last_uploaded_count = 0
    
    async def monitor_progress(self, check_interval: float = 30.0) -> None:
        """Monitor upload progress with detailed metrics"""
        
        while True:
            await asyncio.sleep(check_interval)
            
            current_time = time.time()
            elapsed_total = current_time - self.start_time
            elapsed_since_check = current_time - self.last_check_time
            
            stats = self.uploader.stats
            current_uploaded = stats.successful_uploads
            
            # Calculate rates
            overall_rate = current_uploaded / elapsed_total if elapsed_total > 0 else 0
            recent_rate = (current_uploaded - self.last_uploaded_count) / elapsed_since_check
            
            # Progress calculation
            total_processed = stats.successful_uploads + stats.failed_uploads
            progress = (total_processed / stats.total_files) * 100 if stats.total_files > 0 else 0
            
            # ETA calculation
            remaining_files = stats.total_files - total_processed
            eta_seconds = remaining_files / overall_rate if overall_rate > 0 else 0
            eta_formatted = f"{eta_seconds/60:.1f} min" if eta_seconds > 60 else f"{eta_seconds:.0f} sec"
            
            self.uploader.logger.info(f"📊 Progress Monitor:")
            self.uploader.logger.info(f"   ├─ Progress: {progress:.1f}% ({total_processed}/{stats.total_files})")
            self.uploader.logger.info(f"   ├─ Overall rate: {overall_rate:.2f} files/sec")
            self.uploader.logger.info(f"   ├─ Recent rate: {recent_rate:.2f} files/sec")
            self.uploader.logger.info(f"   ├─ Success rate: {stats.success_rate:.1f}%")
            self.uploader.logger.info(f"   ├─ Duplicates skipped: {stats.duplicate_skips}")
            self.uploader.logger.info(f"   └─ ETA: {eta_formatted}")
            
            # Memory monitoring if available
            if HAS_PSUTIL:
                memory_mb = psutil.Process().memory_info().rss / (1024 * 1024)
                cpu_percent = psutil.Process().cpu_percent()
                self.uploader.logger.info(f"💻 System: {memory_mb:.1f}MB RAM, {cpu_percent:.1f}% CPU")
            
            # Update for next iteration
            self.last_check_time = current_time
            self.last_uploaded_count = current_uploaded


class DataIntegrityValidator:
    """Validate data integrity before and after upload"""
    
    def __init__(self, uploader: SupabaseUploader):
        self.uploader = uploader
        self.logger = uploader.logger
    
    async def validate_upload_integrity(
        self, 
        source_files: List[Path], 
        uploaded_session_id: str
    ) -> Dict[str, Any]:
        """Validate that uploaded data matches source files"""
        
        self.logger.info("🔍 Starting upload integrity validation")
        
        validation_results = {
            'total_source_files': len(source_files),
            'records_in_database': 0,
            'content_matches': 0,
            'content_mismatches': 0,
            'missing_records': [],
            'validation_errors': []
        }
        
        try:
            # Get uploaded records from this session
            response = self.uploader.client.table('raw_scraped_pages').select('*').eq(
                'upload_session_id', uploaded_session_id
            ).execute()
            
            uploaded_records = {r['source_url']: r for r in response.data}
            validation_results['records_in_database'] = len(uploaded_records)
            
            # Validate each source file
            for file_path in source_files:
                try:
                    await self._validate_single_file(file_path, uploaded_records, validation_results)
                except Exception as e:
                    validation_results['validation_errors'].append({
                        'file': str(file_path),
                        'error': str(e)
                    })
            
            # Calculate validation score
            total_checks = validation_results['content_matches'] + validation_results['content_mismatches']
            validation_score = (validation_results['content_matches'] / total_checks * 100) if total_checks > 0 else 0
            
            self.logger.info(f"📊 Integrity validation completed:")
            self.logger.info(f"   ├─ Source files: {validation_results['total_source_files']}")
            self.logger.info(f"   ├─ Database records: {validation_results['records_in_database']}")
            self.logger.info(f"   ├─ Content matches: {validation_results['content_matches']}")
            self.logger.info(f"   ├─ Content mismatches: {validation_results['content_mismatches']}")
            self.logger.info(f"   └─ Validation score: {validation_score:.1f}%")
            
            return validation_results
            
        except Exception as e:
            self.logger.error(f"❌ Integrity validation failed: {e}")
            validation_results['validation_errors'].append({
                'general_error': str(e)
            })
            return validation_results
    
    async def _validate_single_file(
        self, 
        file_path: Path, 
        uploaded_records: Dict[str, Dict[str, Any]], 
        results: Dict[str, Any]
    ) -> None:
        """Validate a single file against uploaded data"""
        
        try:
            # Read source file
            if HAS_AIOFILES:
                async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
                    content = await f.read()
            else:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
            
            if file_path.suffix.lower() == '.json':
                data = json.loads(content)
                url = data.get('url')
                
                if not url:
                    return
                
                # Check if record exists in uploaded data
                if url not in uploaded_records:
                    results['missing_records'].append(url)
                    return
                
                uploaded_record = uploaded_records[url]
                
                # Compare content hashes
                source_text = data.get('text', '')
                uploaded_text = uploaded_record.get('raw_text', '')
                
                if source_text and uploaded_text:
                    source_hash = hashlib.md5(source_text.encode()).hexdigest()
                    uploaded_hash = hashlib.md5(uploaded_text.encode()).hexdigest()
                    
                    if source_hash == uploaded_hash:
                        results['content_matches'] += 1
                    else:
                        results['content_mismatches'] += 1
                        self.logger.warning(f"⚠️ Content mismatch for {url}")
                
        except Exception as e:
            self.logger.error(f"❌ Error validating {file_path}: {e}")


async def main_async():
    """Enhanced async main function for CLI"""
    
    parser = argparse.ArgumentParser(
        description="Enhanced Supabase uploader with async processing and monitoring",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Upload directory with monitoring
  python supabase_uploader.py --data-dir ./scraped_data --max-workers 5
  
  # Single file upload with validation
  python supabase_uploader.py --mode single_file --file data.json --validate
  
  # Dry run with progress monitoring
  python supabase_uploader.py --data-dir ./data --dry-run --monitor-interval 10
  
  # Batch upload with custom settings
  python supabase_uploader.py --data-dir ./data --batch-size 100 --max-retries 5
        """
    )
    
    # Input/Output options
    parser.add_argument('--mode', choices=['directory', 'single_file', 'batch_files'], 
                       default='directory', help='Upload mode')
    parser.add_argument('--data-dir', type=str, help='Directory containing files to upload')
    parser.add_argument('--file', type=str, help='Single file to upload')
    parser.add_argument('--pattern', type=str, default='*.json', 
                       help='File pattern to match (default: *.json)')
    
    # Processing options
    parser.add_argument('--batch-size', type=int, default=25, 
                       help='Batch size for uploads')
    parser.add_argument('--max-workers', type=int, default=5, 
                       help='Maximum concurrent workers')
    parser.add_argument('--max-retries', type=int, default=3, 
                       help='Maximum retry attempts')
    
    # Control options
    parser.add_argument('--dry-run', action='store_true', 
                       help='Dry run mode (no actual uploads)')
    parser.add_argument('--skip-duplicates', action='store_true', 
                       help='Skip duplicate checking')
    parser.add_argument('--skip-validation', action='store_true', 
                       help='Skip content validation')
    
    # Monitoring options
    parser.add_argument('--monitor', action='store_true', 
                       help='Enable progress monitoring')
    parser.add_argument('--monitor-interval', type=float, default=30.0, 
                       help='Monitoring check interval in seconds')
    parser.add_argument('--validate-integrity', action='store_true', 
                       help='Validate upload integrity after completion')
    
    # Debug options
    parser.add_argument('--verbose', action='store_true', 
                       help='Enable verbose logging')
    parser.add_argument('--debug', action='store_true', 
                       help='Enable debug mode')
    
    args = parser.parse_args()
    
    # Configure logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    elif args.debug:
        logging.getLogger().setLevel(logging.DEBUG)
        logging.getLogger('supabase').setLevel(logging.DEBUG)
    
    # Validate arguments
    if args.mode == 'directory' and not args.data_dir:
        parser.error("--data-dir is required for directory mode")
    
    if args.mode == 'single_file' and not args.file:
        parser.error("--file is required for single_file mode")
    
    # Create configuration
    config = UploadConfig.from_args(args)
    
    # Initialize uploader
    uploader = SupabaseUploader(config)
    
    try:
        if args.mode == 'single_file':
            # Single file upload
            if not Path(args.file).exists():
                print(f"❌ File not found: {args.file}")
                return 1
            
            await uploader.initialize()
            success = await uploader._process_single_file_with_retry(Path(args.file), 1)
            
            if success:
                print(f"✅ Successfully uploaded: {args.file}")
                return 0
            else:
                print(f"❌ Failed to upload: {args.file}")
                return 1
        
        else:
            # Directory or batch upload
            data_path = Path(args.data_dir)
            if not data_path.exists():
                print(f"❌ Directory not found: {args.data_dir}")
                return 1
            
            # Start monitoring if requested
            monitor_task = None
            if args.monitor:
                monitor = UploadMonitor(uploader)
                monitor_task = asyncio.create_task(
                    monitor.monitor_progress(args.monitor_interval)
                )
            
            # Perform upload
            stats = await uploader.upload_scraped_data_async(data_path, args.pattern)
            
            # Stop monitoring
            if monitor_task:
                monitor_task.cancel()
                try:
                    await monitor_task
                except asyncio.CancelledError:
                    pass
            
            # Integrity validation if requested
            if args.validate_integrity and not config.dry_run:
                validator = DataIntegrityValidator(uploader)
                source_files = await uploader._discover_files(data_path, args.pattern)
                validation_results = await validator.validate_upload_integrity(
                    source_files, uploader._session_id
                )
                
                # Log validation summary
                if validation_results['content_mismatches'] > 0:
                    uploader.logger.warning(f"⚠️ {validation_results['content_mismatches']} content mismatches detected")
            
            # Determine exit code based on success rate
            exit_code = 0 if stats.success_rate >= 80 else 1
            return exit_code
            
    except KeyboardInterrupt:
        print("\n🛑 Upload interrupted by user")
        return 1
    except Exception as e:
        print(f"❌ Critical error: {e}")
        if args.debug:
            print(traceback.format_exc())
        return 1


def main():
    """Synchronous entry point for CLI"""
    try:
        return asyncio.run(main_async())
    except KeyboardInterrupt:
        print("\n🛑 Interrupted")
        return 1
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        return 1


# Additional utility classes and functions
class UploadQueue:
    """Async queue for managing upload operations"""
    
    def __init__(self, maxsize: int = 100):
        self.queue = asyncio.Queue(maxsize=maxsize)
        self.processed_count = 0
        self.failed_count = 0
    
    async def add_file(self, file_path: Path) -> None:
        """Add file to upload queue"""
        await self.queue.put(file_path)
    
    async def process_queue(self, uploader: SupabaseUploader) -> None:
        """Process files from queue continuously"""
        
        while True:
            try:
                # Get file from queue with timeout
                file_path = await asyncio.wait_for(self.queue.get(), timeout=5.0)
                
                # Process the file
                success = await uploader._process_single_file_with_retry(file_path, 1)
                
                if success:
                    self.processed_count += 1
                else:
                    self.failed_count += 1
                
                # Mark task as done
                self.queue.task_done()
                
            except asyncio.TimeoutError:
                # No more files to process
                break
            except Exception as e:
                uploader.logger.error(f"❌ Queue processing error: {e}")
                self.failed_count += 1


class BatchUploadOptimizer:
    """Optimize batch uploads based on system performance"""
    
    def __init__(self, initial_batch_size: int = 25):
        self.current_batch_size = initial_batch_size
        self.min_batch_size = 5
        self.max_batch_size = 100
        self.performance_history = []
    
    def adjust_batch_size(self, success_rate: float, throughput: float) -> int:
        """Dynamically adjust batch size based on performance"""
        
        self.performance_history.append({
            'batch_size': self.current_batch_size,
            'success_rate': success_rate,
            'throughput': throughput,
            'timestamp': time.time()
        })
        
        # Keep only recent history
        if len(self.performance_history) > 10:
            self.performance_history = self.performance_history[-10:]
        
        # Adjust based on success rate and throughput
        if success_rate < 80:
            # Reduce batch size if success rate is low
            self.current_batch_size = max(self.min_batch_size, self.current_batch_size - 5)
        elif success_rate > 95 and throughput > 0:
            # Increase batch size if performance is good
            self.current_batch_size = min(self.max_batch_size, self.current_batch_size + 5)
        
        return self.current_batch_size


class UploadRecovery:
    """Handle recovery from failed uploads"""
    
    def __init__(self, uploader: SupabaseUploader):
        self.uploader = uploader
        self.logger = uploader.logger
    
    async def recover_failed_uploads(self, session_id: str) -> Dict[str, Any]:
        """Attempt to recover and retry failed uploads from a session"""
        
        self.logger.info(f"🔄 Starting upload recovery for session: {session_id}")
        
        recovery_stats = {
            'attempted_recoveries': 0,
            'successful_recoveries': 0,
            'permanent_failures': 0
        }
        
        try:
            # Find failed uploads from session
            # This would require additional session tracking in the database
            # For now, we'll implement basic retry logic
            
            if self.uploader.stats.errors:
                self.logger.info(f"🔄 Attempting to recover {len(self.uploader.stats.errors)} failed uploads")
                
                for error_record in self.uploader.stats.errors:
                    source = error_record.get('source')
                    if source and Path(source).exists():
                        try:
                            recovery_stats['attempted_recoveries'] += 1
                            
                            # Retry the upload
                            success = await self.uploader._process_single_file_with_retry(
                                Path(source), 999  # Special batch number for recovery
                            )
                            
                            if success:
                                recovery_stats['successful_recoveries'] += 1
                                self.logger.info(f"✅ Recovered upload: {source}")
                            else:
                                recovery_stats['permanent_failures'] += 1
                                
                        except Exception as e:
                            recovery_stats['permanent_failures'] += 1
                            self.logger.error(f"❌ Recovery failed for {source}: {e}")
            
            self.logger.info(f"🏁 Recovery completed:")
            self.logger.info(f"   ├─ Attempted: {recovery_stats['attempted_recoveries']}")
            self.logger.info(f"   ├─ Successful: {recovery_stats['successful_recoveries']}")
            self.logger.info(f"   └─ Permanent failures: {recovery_stats['permanent_failures']}")
            
            return recovery_stats
            
        except Exception as e:
            self.logger.error(f"❌ Recovery process failed: {e}")
            return recovery_stats


# Export main classes and functions
__all__ = [
    'SupabaseUploader',
    'UploadConfig',
    'UploadStats',
    'UploadRecord',
    'UploadStatus',
    'UploadMode',
    'UploadMonitor',
    'DataIntegrityValidator',
    'BatchUploadOptimizer',
    'UploadRecovery'
]


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)#!/usr/bin/env python3
"""
AgriTool Supabase Uploader - Enhanced robust data upload to Supabase
Handles async batch uploads, retry logic, data validation, and comprehensive monitoring
"""

import os
import sys
import json
import time
import asyncio
import logging
from typing import Dict, Any, List, Optional, Union, Tuple, Set
from dataclasses import dataclass, field, asdict
from enum import Enum
from pathlib import Path
import hashlib
from datetime import datetime
import traceback
import argparse
from urllib.parse import urlparse
import mimetypes

# Third-party imports with fallbacks
try:
    from supabase import create_client, Client
    from supabase._async.client import AsyncClient, create_async_client
except ImportError:
    print("❌ ERROR: Supabase client not installed")
    print("Install with: pip install supabase")
    sys.exit(1)

# Optional imports
try:
    from logging_setup import setup_pipeline_logging, ensure_artifact_files, log_pipeline_stats
    HAS_LOGGING_SETUP = True
except ImportError:
    HAS_LOGGING_SETUP = False

try:
    import aiofiles
    HAS_AIOFILES = True
except ImportError:
    HAS_AIOFILES = False

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False


class UploadStatus(Enum):
    """Status enumeration for upload operations"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    DUPLICATE = "duplicate"
    SKIPPED = "skipped"
    RETRYING = "retrying"


class UploadMode(Enum):
    """Upload mode enumeration"""
    DIRECTORY = "directory"
    SINGLE_FILE = "single_file"
    BATCH_FILES = "batch_files"
    STREAM = "stream"


@dataclass
class UploadRecord:
    """Structured upload record with validation"""
    source_url: str
    source_site: str
    raw_html: str = ""
    raw_text: str = ""
    raw_markdown: str = ""
    attachment_paths: str = "[]"
    attachment_count: int = 0
    scrape_date: str = ""
    status: str = "raw"
    error_message: Optional[str] = None
    content_hash: Optional[str] = None
    file_path: Optional[str] = None
    upload_session_id: Optional[str] = None
    
    def __post_init__(self):
        """Validate and enhance record after initialization"""
        if not self.scrape_date:
            self.scrape_date = datetime.now().isoformat()
        
        if not self.content_hash and (self.raw_text or self.raw_html):
            content_for_hash = self.raw_text or self.raw_html
            self.content_hash = hashlib.md5(content_for_hash.encode()).hexdigest()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for database insertion"""
        return {k: v for k, v in asdict(self).items() if v is not None}


@dataclass
class UploadStats:
    """Comprehensive statistics for upload operations"""
    total_files: int = 0
    successful_uploads: int = 0
    failed_uploads: int = 0
    duplicate_skips: int = 0
    validation_failures: int = 0
    retry_attempts: int = 0
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    bytes_processed: int = 0
    errors: List[Dict[str, Any]] = field(default_factory=list)
    batch_stats: List[Dict[str, Any]] = field(default_factory=list)
    file_types: Dict[str, int] = field(default_factory=dict)
    
    @property
    def duration(self) -> float:
        """Calculate processing duration"""
        if self.start_time and self.end_time:
            return self.end_time - self.start_time
        return 0.0
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate percentage"""
        total = max(self.total_files, 1)
        return (self.successful_uploads / total) * 100
    
    @property
    def upload_rate(self) -> float:
        """Calculate upload rate (files per second)"""
        if self.duration > 0:
            return self.successful_uploads / self.duration
        return 0.0
    
    @property
    def throughput_mbps(self) -> float:
        """Calculate throughput in MB/s"""
        if self.duration > 0:
            return (self.bytes_processed / (1024 * 1024)) / self.duration
        return 0.0


@dataclass
class UploadConfig:
    """Configuration for upload operations"""
    batch_size: int = 25
    max_retries: int = 3
    concurrent_limit: int = 5
    delay_between_batches: float = 1.0
    delay_between_retries: float = 2.0
    enable_duplicate_check: bool = True
    enable_content_validation: bool = True
    enable_compression: bool = False
    max_file_size_mb: int = 50
    allowed_file_types: Set[str] = field(default_factory=lambda: {'.json', '.txt', '.html', '.md'})
    upload_mode: UploadMode = UploadMode.DIRECTORY
    dry_run: bool = False
    
    @classmethod
    def from_args(cls, args: argparse.Namespace) -> 'UploadConfig':
        """Create config from command line arguments"""
        return cls(
            batch_size=args.batch_size,
            max_retries=args.max_retries,
            concurrent_limit=args.max_workers,
            enable_duplicate_check=not args.skip_duplicates,
            enable_content_validation=not args.skip_validation,
            dry_run=args.dry_run,
            upload_mode=UploadMode(args.mode)
        )


class SupabaseUploader:
    """Enhanced robust uploader for scraped data to Supabase"""
    
    def __init__(self, config: Optional[UploadConfig] = None):
        self.config = config or UploadConfig()
        self._setup_logging()
        
        # Client initialization (will be done async)
        self.client = None
        self.async_client = None
        
        # Upload statistics
        self.stats = UploadStats()
        
        # Session management
        self._session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        self._processed_urls: Set[str] = set()
        
        # Semaphore for concurrent uploads
        self.semaphore = asyncio.Semaphore(self.config.concurrent_limit)
        
        # Cache for duplicate checking
        self._duplicate_cache: Set[str] = set()
        self._cache_loaded = False
    
    def _setup_logging(self) -> None:
        """Setup comprehensive logging for upload operations"""
        if HAS_LOGGING_SETUP:
            ensure_artifact_files()
            self.logger = setup_pipeline_logging("supabase_uploader")
        else:
            self.logger = logging.getLogger('supabase_uploader')
            self.logger.setLevel(logging.INFO)
            
            if not self.logger.handlers:
                handler = logging.StreamHandler(sys.stdout)
                formatter = logging.Formatter(
                    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
                )
                handler.setFormatter(formatter)
                self.logger.addHandler(handler)
    
    async def initialize(self) -> None:
        """Initialize Supabase clients and load caches"""
        try:
            await self._init_supabase_clients()
            if self.config.enable_duplicate_check:
                await self._load_duplicate_cache()
            self.logger.info("✅ Supabase Uploader initialized successfully")
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize Supabase Uploader: {e}")
            raise
    
    async def _init_supabase_clients(self) -> None:
        """Initialize Supabase clients with comprehensive error handling"""
        
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
            # Initialize sync client
            self.client = create_client(required_vars['SUPABASE_URL'], required_vars['SUPABASE_KEY'])
            
            # For async operations, we'll use the sync client with async wrappers
            # as the async Supabase client has limited production support
            self.async_client = self.client
            
            # Test connection
            test_response = self.client.table('raw_scraped_pages').select('id').limit(1).execute()
            
            self.logger.info("✅ Supabase clients initialized and tested")
            
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize Supabase clients: {e}")
            raise
    
    async def _load_duplicate_cache(self) -> None:
        """Load existing URLs into cache for duplicate detection"""
        
        try:
            self.logger.info("🔄 Loading duplicate detection cache...")
            
            response = self.client.table('raw_scraped_pages').select('source_url').execute()
            
            self._duplicate_cache = {record['source_url'] for record in response.data}
            self._cache_loaded = True
            
            self.logger.info(f"✅ Loaded {len(self._duplicate_cache)} URLs into duplicate cache")
            
        except Exception as e:
            self.logger.warning(f"⚠️ Failed to load duplicate cache: {e}")
            self._duplicate_cache = set()
            self._cache_loaded = False
    
    async def upload_scraped_data_async(
        self, 
        data_path: Union[str, Path],
        file_pattern: str = "*.json"
    ) -> UploadStats:
        """Upload scraped data asynchronously with enhanced processing"""
        
        self.logger.info(f"🚀 Starting async Supabase upload")
        self.logger.info(f"📍 Source: {data_path}")
        self.logger.info(f"📋 Config: {self.config.batch_size} batch size, {self.config.concurrent_limit} workers")
        
        self.stats.start_time = time.time()
        
        try:
            # Ensure clients are initialized
            if not self.client:
                await self.initialize()
            
            # Find files to process
            files = await self._discover_files(data_path, file_pattern)
            
            if not files:
                self.logger.warning(f"⚠️ No files found matching pattern: {file_pattern}")
                return self._finalize_stats()
            
            self.logger.info(f"📄 Found {len(files)} files to process")
            self.stats.total_files = len(files)
            
            # Analyze file types
            self._analyze_file_types(files)
            
            # Process files in concurrent batches
            await self._process_files_concurrent(files)
            
            return self._finalize_stats()
            
        except Exception as e:
            self.logger.error(f"❌ Critical error in async upload: {e}")
            self.logger.error(traceback.format_exc())
            return self._finalize_stats()
    
    async def _discover_files(self, data_path: Union[str, Path], pattern: str) -> List[Path]:
        """Discover files to process with enhanced filtering"""
        
        data_path = Path(data_path)
        
        if data_path.is_file():
            # Single file mode
            if self._is_valid_file(data_path):
                return [data_path]
            else:
                self.logger.warning(f"⚠️ Invalid file type: {data_path}")
                return []
        
        elif data_path.is_dir():
            # Directory mode
            files = []
            
            # Support multiple patterns
            patterns = pattern.split(',') if ',' in pattern else [pattern]
            
            for pat in patterns:
                found_files = list(data_path.glob(pat.strip()))
                files.extend(found_files)
            
            # Filter valid files
            valid_files = [f for f in files if self._is_valid_file(f)]
            
            if len(valid_files) != len(files):
                skipped = len(files) - len(valid_files)
                self.logger.warning(f"⚠️ Skipped {skipped} invalid files")
            
            return sorted(valid_files)  # Sort for consistent processing
        
        else:
            self.logger.error(f"❌ Path does not exist: {data_path}")
            return []
    
    def _is_valid_file(self, file_path: Path) -> bool:
        """Validate file for upload processing"""
        
        # Check file extension
        if file_path.suffix.lower() not in self.config.allowed_file_types:
            return False
        
        # Check file size
        try:
            file_size_mb = file_path.stat().st_size / (1024 * 1024)
            if file_size_mb > self.config.max_file_size_mb:
                self.logger.warning(f"⚠️ File too large ({file_size_mb:.1f}MB): {file_path}")
                return False
        except OSError:
            return False
        
        return True
    
    def _analyze_file_types(self, files: List[Path]) -> None:
        """Analyze and log file type distribution"""
        
        for file_path in files:
            ext = file_path.suffix.lower()
            self.stats.file_types[ext] = self.stats.file_types.get(ext, 0) + 1
            self.stats.bytes_processed += file_path.stat().st_size
        
        self.logger.info(f"📊 File analysis:")
        for ext, count in self.stats.file_types.items():
            self.logger.info(f"   ├─ {ext}: {count} files")
        
        size_mb = self.stats.bytes_processed / (1024 * 1024)
        self.logger.info(f"   └─ Total size: {size_mb:.1f} MB")
    
    async def _process_files_concurrent(self, files: List[Path]) -> None:
        """Process files concurrently with batch management"""
        
        # Create batches for processing
        batches = [files[i:i + self.config.batch_size] 
                  for i in range(0, len(files), self.config.batch_size)]
        
        self.logger.info(f"📦 Processing {len(batches)} batches")
        
        for batch_num, batch in enumerate(batches, 1):
            self.logger.info(f"📦 Processing batch {batch_num}/{len(batches)}: {len(batch)} files")
            
            # Process batch concurrently
            tasks = []
            for file_path in batch:
                task = self._process_single_file_with_retry(file_path, batch_num)
                tasks.append(task)
            
            # Execute batch with error handling
            try:
                batch_results = await asyncio.gather(*tasks, return_exceptions=True)
                
                # Analyze batch results
                batch_success = sum(1 for r in batch_results if r is True)
                batch_failed = sum(1 for r in batch_results if isinstance(r, Exception))
                
                self.stats.batch_stats.append({
                    'batch_number': batch_num,
                    'files_processed': len(batch),
                    'successful': batch_success,
                    'failed': batch_failed,
                    'timestamp': datetime.now().isoformat()
                })
                
                self.logger.info(f"✅ Batch {batch_num} completed: {batch_success} success, {batch_failed} failed")
                
            except Exception as e:
                self.logger.error(f"❌ Batch {batch_num} processing error: {e}")
            
            # Delay between batches to respect rate limits
            if batch_num < len(batches):
                await asyncio.sleep(self.config.delay_between_batches)
    
    async def _process_single_file_with_retry(
        self, 
        file_path: Path, 
        batch_num: int
    ) -> bool:
        """Process a single file with comprehensive retry logic"""
        
        async with self.semaphore:  # Limit concurrent processing
            
            for attempt in range(self.config.max_retries + 1):
                try:
                    # Load and validate file
                    record = await self._prepare_record_async(file_path)
                    
                    if not record:
                        self.logger.warning(f"⚠️ Invalid record from {file_path}")
                        return False
                    
                    # Check for duplicates
                    if self.config.enable_duplicate_check and self._is_duplicate(record.source_url):
                        self.stats.duplicate_skips += 1
                        self.logger.debug(f"⏭️ Duplicate skipped: {record.source_url}")
                        return True  # Consider duplicates as "successful"
                    
                    # Upload record
                    success = await self._upload_record_async(record, attempt + 1)
                    
                    if success:
                        self.stats.successful_uploads += 1
                        self._processed_urls.add(record.source_url)
                        self.logger.debug(f"✅ Uploaded: {file_path.name}")
                        return True
                    
                    # Retry logic
                    if attempt < self.config.max_retries:
                        self.stats.retry_attempts += 1
                        delay = self.config.delay_between_retries * (2 ** attempt)  # Exponential backoff
                        await asyncio.sleep(delay)
                        self.logger.warning(f"🔄 Retrying {file_path.name} (attempt {attempt + 2})")
                        continue
                    
                    break
                    
                except Exception as e:
                    self.logger.error(f"❌ Error processing {file_path}: {e}")
                    
                    if attempt < self.config.max_retries:
                        await asyncio.sleep(self.config.delay_between_retries * (2 ** attempt))
                        continue
                    
                    self._add_error(str(file_path), str(e), traceback.format_exc())
                    break
            
            self.stats.failed_uploads += 1
            return False
    
    async def _prepare_record_async(self, file_path: Path) -> Optional[UploadRecord]:
        """Prepare a record from file with enhanced validation"""
        
        try:
            # Read file content
            if HAS_AIOFILES:
                async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
                    content = await f.read()
            else:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
            
            # Parse based on file type
            if file_path.suffix.lower() == '.json':
                data = json.loads(content)
                return await self._prepare_from_json(data, file_path)
            else:
                return await self._prepare_from_text(content, file_path)
                
        except json.JSONDecodeError as e:
            self.logger.error(f"❌ Invalid JSON in {file_path}: {e}")
            self.stats.validation_failures += 1
            return None
        except Exception as e:
            self.logger.error(f"❌ Error reading {file_path}: {e}")
            return None
    
    async def _prepare_from_json(self, data: Dict[str, Any], file_path: Path) -> Optional[UploadRecord]:
        """Prepare record from JSON scraped data"""
        
        # Validate JSON structure
        if not self._validate_json_structure(data):
            self.logger.warning(f"⚠️ Invalid JSON structure: {file_path}")
            self.stats.validation_failures += 1
            return None
        
        # Extract URL
        url = data.get('url')
        if not url:
            self.logger.warning(f"⚠️ Missing URL in {file_path}")
            return None
        
        # Handle failed extractions
        if not data.get('success', True):
            error_msg = data.get('error', 'Unknown extraction error')
            self.logger.debug(f"⚠️ Failed extraction for {url}: {error_msg}")
            # Still upload failed extractions for analysis
        
        # Create upload record
        record = UploadRecord(
            source_url=url,
            source_site=self._extract_site_name(url),
            raw_html=data.get('html', ''),
            raw_text=data.get('text', ''),
            raw_markdown=data.get('text_markdown', ''),
            attachment_paths=json.dumps(data.get('attachments', [])),
            attachment_count=len(data.get('attachments', [])),
            scrape_date=self._format_timestamp(data.get('extraction_timestamp')),
            status='raw',
            error_message=data.get('error') if not data.get('success', True) else None,
            file_path=str(file_path),
            upload_session_id=self._session_id
        )
        
        return record
    
    async def _prepare_from_text(self, content: str, file_path: Path) -> Optional[UploadRecord]:
        """Prepare record from raw text/markdown content"""
        
        # Generate URL from file path or use filename
        url = f"file://{file_path.absolute()}"
        
        # Determine content type
        is_markdown = file_path.suffix.lower() in ['.md', '.markdown']
        
        record = UploadRecord(
            source_url=url,
            source_site="local_file",
            raw_text=content if not is_markdown else "",
            raw_markdown=content if is_markdown else "",
            scrape_date=datetime.now().isoformat(),
            status='raw',
            file_path=str(file_path),
            upload_session_id=self._session_id
        )
        
        return record
    
    def _validate_json_structure(self, data: Dict[str, Any]) -> bool:
        """Validate JSON structure for scraped data"""
        
        if not isinstance(data, dict):
            return False
        
        # Check for required fields
        required_fields = ['url']
        for field in required_fields:
            if field not in data:
                return False
        
        # Check for at least some content
        content_fields = ['html', 'text', 'text_markdown']
        has_content = any(data.get(field) for field in content_fields)
        
        return has_content
    
    def _format_timestamp(self, timestamp: Union[str, float, int, None]) -> str:
        """Format timestamp to ISO string"""
        
        if not timestamp:
            return datetime.now().isoformat()
        
        try:
            if isinstance(timestamp, (int, float)):
                return datetime.fromtimestamp(timestamp).isoformat()
            elif isinstance(timestamp, str):
                # Try to parse existing ISO format
                try:
                    datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                    return timestamp
                except ValueError:
                    # Fall back to current time
                    return datetime.now().isoformat()
            else:
                return datetime.now().isoformat()
                
        except Exception:
            return datetime.now().isoformat()
    
    def _extract_site_name(self, url: str) -> str:
        """Extract and normalize site name from URL"""
        
        try:
            parsed = urlparse(url)
            domain = parsed.netloc.lower()
            
            # Remove 'www.' prefix
            if domain.startswith('www.'):
                domain = domain[4:]
            
            # Map known domains to canonical site names
            site_mapping = {
                'franceagrimer.fr': 'franceagrimer',
                'chambres-agriculture.fr': 'chambres_agriculture',
                'agriculture.gouv.fr': 'agriculture_gouv',
                'paca.chambres-agriculture.fr': 'chambres_agriculture_paca',
                'occitanie.chambres-agriculture.fr': 'chambres_agriculture_occitanie'
            }
            
            return site_mapping.get(domain, domain.replace('.', '_'))
            
        except Exception:
            return 'unknown'
    
    def _is_duplicate(self, url: str) -> bool:
        """Check if URL is duplicate with caching"""
        
        if not self.config.enable_duplicate_check:
            return False
        
        # Check memory cache first
        if url in self._duplicate_cache:
            return True
        
        # Check recently processed URLs in this session
        if url in self._processed_urls:
            return True
        
        # If cache wasn't loaded, do real-time check
        if not self._cache_loaded:
            try:
                response = self.client.table('raw_scraped_pages').select('id').eq('source_url', url).limit(1).execute()
                is_duplicate = len(response.data) > 0
                
                if is_duplicate:
                    self._duplicate_cache.add(url)
                
                return is_duplicate
                
            except Exception as e:
                self.logger.warning(f"⚠️ Error checking duplicate for {url}: {e}")
                return False
        
        return False
    
    async def _upload_record_async(self, record: UploadRecord, attempt: int = 1) -> bool:
        """Upload a single record with enhanced error handling"""
        
        if self.config.dry_run:
            self.logger.debug(f"🧪 Dry run: Would upload {record.source_url}")
            return True
        
        try:
            # Convert record to dict for upload
            record_dict = record.to_dict()
            
            # Remove fields that shouldn't go to database
            upload_data = {k: v for k, v in record_dict.items() 
                          if k not in ['file_path', 'upload_session_id']}
            
            # Perform upload
            response = self.client.table('raw_scraped_pages').insert([upload_data]).execute()
            
            if response.data:
                # Update duplicate cache
                self._duplicate_cache.add(record.source_url)
                return True
            else:
                self.logger.warning(f"⚠️ No data returned from upload: {record.source_url}")
                return False
                
        except Exception as e:
            self.logger.error(f"❌ Upload error (attempt {attempt}): {e}")
            return False
    
    async def upload_single_content(
        self, 
        content: Union[str, Dict[str, Any]], 
        url: str,
        content_type: str = "text"
    ) -> bool:
        """Upload single content item for testing/manual uploads"""
        
        await self.initialize()
        
        try:
            if isinstance(content, dict):
                # JSON content
                record = await self._prepare_from_json(content, Path("manual_upload.json"))
            else:
                # Text content
                is_markdown = content_type.lower() == "markdown"
                
                record = UploadRecord(
                    source_url=url,
                    source_site=self._extract_site_name(url),
                    raw_text=content if not is_markdown else "",
                    raw_markdown=content if is_markdown else "",
                    upload_session_id=self._session_id
                )
            
            if not record:
                return False
            
            return await self._upload_record_async(record)
            
        except Exception as e:
            self.logger.error(f"❌ Error uploading single content: {e}")
            return False
    
    async def batch_upload_records(self, records: List[UploadRecord]) -> Tuple[int, int]:
        """Upload multiple records in a single batch with transaction support"""
        
        if self.config.dry_run:
            self.logger.info(f"🧪 Dry run: Would upload {len(records)} records")
            return len(records), 0
        
        successful = 0
        failed = 0
        
        try:
            # Convert records to upload format
            upload_data = []
            for record in records:
                if not self._is_duplicate(record.source_url):
                    upload_data.append(record.to_dict())
                else:
                    self.stats.duplicate_skips += 1
            
            if not upload_data:
                self.logger.info("📋 All records were duplicates, nothing to upload")
                return 0, 0
            
            # Perform batch upload
            response = self.client.table('raw_scraped_pages').insert(upload_data).execute()
            
            if response.data:
                successful = len(upload_data)
                self.logger.info(f"✅ Batch uploaded: {successful} records")
                
                # Update duplicate cache
                for record in records:
                    self._duplicate_cache.add(record.source_url)
            else:
                failed = len(upload_data)
                self.logger.error(f"❌ Batch upload failed: {len(upload_data)} records")
            
        except Exception as e:
            failed = len(records)
            self.logger.error(f"❌ Batch upload error: {e}")
            self._add_error("batch_upload", str(e), traceback.format_exc())
        
        return successful, failed
    
    def _add_error(self, source: str, error: str, traceback_str: str = "") -> None:
        """Add error to statistics with enhanced details"""
        
        error_record = {
            'source': source,
            'error': error,
            'timestamp': datetime.now().isoformat(),
            'session_id': self._session_id,
            'attempt_number': len

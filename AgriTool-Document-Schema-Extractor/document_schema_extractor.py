#!/usr/bin/env python3
"""
AgriTool Subsidy Document Structure Extraction & Schema Mapping (Production Version)

This module automatically extracts real application form structure from subsidy documents
(PDF, DOCX, XLSX) and maps them to standardized JSON schemas for storage in Supabase.

USAGE:
    python document_schema_extractor.py --subsidy-ids 123e4567-e89b-12d3-a456-426614174000
    python document_schema_extractor.py --all-subsidies
    python document_schema_extractor.py --batch-size 10 --max-concurrent 5 --dry-run

ENVIRONMENT VARIABLES:
    SUPABASE_URL - Supabase project URL
    SUPABASE_SERVICE_ROLE_KEY - Service role key for database access
    MAX_CONCURRENT_DOCS - Max concurrent document processing (default: 5)
    DOWNLOAD_TIMEOUT - Download timeout in seconds (default: 30)
    DOWNLOAD_RETRIES - Number of download retries (default: 3)
    LOG_LEVEL - Logging level (default: INFO)
    LOG_TO_FILE - Enable file logging (default: false)
    LOG_FILE_PATH - Log file path (default: ./extraction.log)

EXIT CODES:
    0 - Complete success
    1 - Fatal error (configuration, database, etc.)
    2 - Partial success (some extractions failed)

EXTRACTION STATUS LEVELS:
    success - All fields extracted successfully
    partial - Some fields extracted, coverage < 80%
    warning - Extraction completed but with issues
    failure - Extraction failed completely

REQUIREMENTS:
    pip install -r requirements.txt

FEATURES:
    - Async document downloading with retry/backoff
    - Multi-format support (PDF, DOCX, XLSX) with OCR fallback
    - Configurable concurrency and robust error handling
    - Structured logging with full traceability
    - Comprehensive test coverage
    - Idempotent operations for production safety
"""

import asyncio
import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

import aiofiles
import aiohttp
from supabase import create_client, Client

from extractors.pdf_extractor import PDFExtractor
from extractors.docx_extractor import DOCXExtractor
from extractors.xlsx_extractor import XLSXExtractor
from utils.download_manager import DownloadManager
from utils.logger import setup_structured_logger
from utils.schema_consolidator import SchemaConsolidator


class ExtractionStatus:
    """Enumeration of extraction status levels"""
    SUCCESS = "success"
    PARTIAL = "partial" 
    WARNING = "warning"
    FAILURE = "failure"


class DocumentSchemaExtractor:
    """
    Production-ready document schema extractor with enhanced error handling,
    structured logging, and modular architecture.
    """
    
    def __init__(self):
        """Initialize the extractor with configuration from environment variables."""
        self._validate_environment()
        
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        self.max_concurrent = int(os.getenv('MAX_CONCURRENT_DOCS', '5'))
        
        # Initialize Supabase client
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        
        # Initialize structured logger
        self.logger = setup_structured_logger()
        
        # Initialize download manager with retry logic
        self.download_manager = DownloadManager(
            timeout=int(os.getenv('DOWNLOAD_TIMEOUT', '30')),
            max_retries=int(os.getenv('DOWNLOAD_RETRIES', '3')),
            logger=self.logger
        )
        
        # Initialize extractors
        self.pdf_extractor = PDFExtractor(logger=self.logger)
        self.docx_extractor = DOCXExtractor(logger=self.logger)
        self.xlsx_extractor = XLSXExtractor(logger=self.logger)
        
        # Initialize schema consolidator
        self.schema_consolidator = SchemaConsolidator(logger=self.logger)
        
        # Concurrency control
        self.semaphore = asyncio.Semaphore(self.max_concurrent)
        
        # Statistics tracking
        self.stats = {
            "total_subsidies": 0,
            "successful_subsidies": 0,
            "partial_subsidies": 0,
            "failed_subsidies": 0,
            "total_documents": 0,
            "successful_documents": 0,
            "partial_documents": 0,
            "failed_documents": 0,
            "extraction_start_time": None,
            "extraction_end_time": None
        }
        
        self.logger.info("DocumentSchemaExtractor initialized", extra={
            "max_concurrent": self.max_concurrent,
            "download_timeout": os.getenv('DOWNLOAD_TIMEOUT', '30'),
            "download_retries": os.getenv('DOWNLOAD_RETRIES', '3')
        })

    def _validate_environment(self) -> None:
        """Validate required environment variables."""
        required_vars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        
        if missing_vars:
            print(f"ERROR: Missing required environment variables: {', '.join(missing_vars)}")
            sys.exit(1)

    async def process_subsidies(
        self, 
        subsidy_ids: Optional[List[str]] = None, 
        batch_size: int = 10,
        dry_run: bool = False
    ) -> Dict[str, Any]:
        """
        Process multiple subsidies for document extraction.
        
        Args:
            subsidy_ids: List of subsidy IDs to process. If None, process all.
            batch_size: Number of subsidies to process in each batch.
            dry_run: If True, only parse and log, don't write to DB.
            
        Returns:
            Comprehensive extraction statistics.
        """
        self.stats["extraction_start_time"] = datetime.utcnow().isoformat()
        
        self.logger.info("Starting document extraction batch", extra={
            "subsidy_ids": subsidy_ids or "ALL",
            "batch_size": batch_size,
            "dry_run": dry_run
        })
        
        # Fetch subsidies to process
        subsidies = await self._fetch_subsidies(subsidy_ids)
        if not subsidies:
            self.logger.warning("No subsidies found to process")
            return self._generate_final_stats()
        
        self.stats["total_subsidies"] = len(subsidies)
        self.logger.info(f"Found {len(subsidies)} subsidies to process")
        
        # Process subsidies in batches
        for i in range(0, len(subsidies), batch_size):
            batch = subsidies[i:i + batch_size]
            batch_num = i // batch_size + 1
            
            self.logger.info("Processing batch", extra={
                "batch_number": batch_num,
                "batch_size": len(batch),
                "subsidies_remaining": len(subsidies) - i
            })
            
            # Process batch concurrently
            tasks = [self.process_single_subsidy(subsidy, dry_run) for subsidy in batch]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Update statistics from batch results
            self._update_stats_from_batch(results)
        
        self.stats["extraction_end_time"] = datetime.utcnow().isoformat()
        final_stats = self._generate_final_stats()
        
        # Save audit log
        await self._save_audit_log(final_stats)
        
        self.logger.info("Extraction batch completed", extra=final_stats)
        return final_stats

    async def _fetch_subsidies(self, subsidy_ids: Optional[List[str]]) -> List[Dict[str, Any]]:
        """Fetch subsidies from database."""
        try:
            if subsidy_ids:
                subsidies = []
                for subsidy_id in subsidy_ids:
                    result = self.supabase.table('subsidies').select('*').eq('id', subsidy_id).execute()
                    if result.data:
                        subsidies.extend(result.data)
                    else:
                        self.logger.warning("Subsidy not found", extra={"subsidy_id": subsidy_id})
            else:
                result = self.supabase.table('subsidies').select('*').execute()
                subsidies = result.data
            
            return subsidies
            
        except Exception as e:
            self.logger.error("Failed to fetch subsidies from database", extra={
                "error": str(e),
                "error_type": type(e).__name__
            })
            return []

    async def process_single_subsidy(self, subsidy: Dict[str, Any], dry_run: bool = False) -> Dict[str, Any]:
        """
        Process a single subsidy for document extraction.
        
        Args:
            subsidy: Subsidy record from database.
            dry_run: If True, only parse and log, don't write to DB.
            
        Returns:
            Processing result with detailed status and metrics.
        """
        subsidy_id = subsidy['id']
        subsidy_title = subsidy.get('title', 'Unknown')
        
        self.logger.info("Processing subsidy", extra={
            "subsidy_id": subsidy_id,
            "subsidy_title": subsidy_title
        })
        
        try:
            # Get document URLs from application_docs field
            application_docs = subsidy.get('application_docs', [])
            if not application_docs:
                self.logger.warning("No application documents found", extra={
                    "subsidy_id": subsidy_id
                })
                return self._create_subsidy_result(subsidy_id, ExtractionStatus.WARNING, 
                                                 "No application documents found", [])
            
            # Process each document with concurrency control
            async with self.semaphore:
                extraction_results = []
                
                for doc_info in application_docs:
                    try:
                        result = await self.process_document(subsidy_id, doc_info, dry_run)
                        extraction_results.append(result)
                        self.stats["total_documents"] += 1
                        
                        # Update document stats based on result
                        if result["status"] == ExtractionStatus.SUCCESS:
                            self.stats["successful_documents"] += 1
                        elif result["status"] == ExtractionStatus.PARTIAL:
                            self.stats["partial_documents"] += 1
                        else:
                            self.stats["failed_documents"] += 1
                            
                    except Exception as e:
                        self.logger.error("Document processing failed", extra={
                            "subsidy_id": subsidy_id,
                            "document_url": doc_info.get('url', 'unknown'),
                            "error": str(e),
                            "error_type": type(e).__name__
                        })
                        
                        # Record failed extraction
                        if not dry_run:
                            await self._record_extraction_status(
                                subsidy_id=subsidy_id,
                                document_url=doc_info.get('url', 'unknown'),
                                document_type=doc_info.get('type', 'unknown'),
                                status=ExtractionStatus.FAILURE,
                                error_message=str(e)
                            )
                        
                        self.stats["failed_documents"] += 1
            
            # Determine overall subsidy status
            subsidy_status = self._determine_subsidy_status(extraction_results)
            
            # Generate consolidated schema from all documents
            if extraction_results:
                consolidated_schema = self.schema_consolidator.consolidate_schemas(extraction_results)
                
                # Update subsidy with consolidated schema
                if not dry_run:
                    await self._update_subsidy_schema(subsidy_id, consolidated_schema)
            else:
                consolidated_schema = None
            
            return self._create_subsidy_result(subsidy_id, subsidy_status, 
                                             f"Processed {len(extraction_results)} documents", 
                                             extraction_results, consolidated_schema)
            
        except Exception as e:
            self.logger.error("Subsidy processing failed", extra={
                "subsidy_id": subsidy_id,
                "error": str(e),
                "error_type": type(e).__name__
            })
            return self._create_subsidy_result(subsidy_id, ExtractionStatus.FAILURE, str(e), [])

    async def process_document(
        self, 
        subsidy_id: str, 
        doc_info: Dict[str, Any], 
        dry_run: bool = False
    ) -> Dict[str, Any]:
        """
        Process a single document for schema extraction.
        
        Args:
            subsidy_id: The subsidy ID this document belongs to.
            doc_info: Document information containing URL and type.
            dry_run: If True, only parse and log, don't write to DB.
            
        Returns:
            Extraction result with schema and detailed metadata.
        """
        doc_url = doc_info.get('url', '')
        doc_type = doc_info.get('type', '')
        
        self.logger.info("Processing document", extra={
            "subsidy_id": subsidy_id,
            "document_url": doc_url,
            "document_type": doc_type
        })
        
        try:
            # Download document with retry logic
            file_path = await self.download_manager.download_document(doc_url)
            
            # Extract schema based on document type
            extractor = self._get_extractor(doc_type, doc_url)
            extracted_data = await extractor.extract_schema(file_path)
            
            # Calculate coverage and determine status
            coverage_percentage = self._calculate_coverage(extracted_data)
            status = self._determine_document_status(extracted_data, coverage_percentage)
            
            # Record extraction status
            if not dry_run:
                await self._record_extraction_status(
                    subsidy_id=subsidy_id,
                    document_url=doc_url,
                    document_type=doc_type,
                    status=status,
                    field_count=len(extracted_data.get('fields', [])),
                    coverage_percentage=coverage_percentage,
                    extracted_schema=extracted_data
                )
            
            # Clean up downloaded file
            if os.path.exists(file_path):
                os.unlink(file_path)
            
            self.logger.info("Document processing completed", extra={
                "subsidy_id": subsidy_id,
                "document_url": doc_url,
                "status": status,
                "field_count": len(extracted_data.get('fields', [])),
                "coverage_percentage": coverage_percentage
            })
            
            return {
                "document_url": doc_url,
                "document_type": doc_type,
                "status": status,
                "field_count": len(extracted_data.get('fields', [])),
                "coverage_percentage": coverage_percentage,
                "schema": extracted_data,
                "extraction_metadata": {
                    "extractor_used": extractor.__class__.__name__,
                    "ocr_applied": extracted_data.get('metadata', {}).get('ocr_applied', False),
                    "extraction_method": extracted_data.get('metadata', {}).get('method', 'unknown')
                }
            }
            
        except Exception as e:
            self.logger.error("Document extraction failed", extra={
                "subsidy_id": subsidy_id,
                "document_url": doc_url,
                "error": str(e),
                "error_type": type(e).__name__
            })
            
            if not dry_run:
                await self._record_extraction_status(
                    subsidy_id=subsidy_id,
                    document_url=doc_url,
                    document_type=doc_type,
                    status=ExtractionStatus.FAILURE,
                    error_message=str(e)
                )
            
            raise

    def _get_extractor(self, doc_type: str, doc_url: str):
        """Get appropriate extractor based on document type."""
        doc_type_lower = doc_type.lower()
        doc_url_lower = doc_url.lower()
        
        if doc_type_lower == 'pdf' or doc_url_lower.endswith('.pdf'):
            return self.pdf_extractor
        elif doc_type_lower in ['docx', 'doc'] or doc_url_lower.endswith(('.docx', '.doc')):
            return self.docx_extractor
        elif doc_type_lower in ['xlsx', 'xls'] or doc_url_lower.endswith(('.xlsx', '.xls')):
            return self.xlsx_extractor
        else:
            raise ValueError(f"Unsupported document type: {doc_type}")

    def _calculate_coverage(self, extracted_data: Dict[str, Any]) -> float:
        """Calculate extraction coverage percentage."""
        fields_count = len(extracted_data.get('fields', []))
        unclassified_count = len(extracted_data.get('raw_unclassified', []))
        
        if fields_count + unclassified_count == 0:
            return 0.0
        
        return (fields_count / (fields_count + unclassified_count)) * 100

    def _determine_document_status(self, extracted_data: Dict[str, Any], coverage: float) -> str:
        """Determine document extraction status based on coverage and data quality."""
        if coverage >= 80 and extracted_data.get('fields'):
            return ExtractionStatus.SUCCESS
        elif coverage >= 50 and extracted_data.get('fields'):
            return ExtractionStatus.PARTIAL
        elif coverage > 0:
            return ExtractionStatus.WARNING
        else:
            return ExtractionStatus.FAILURE

    def _determine_subsidy_status(self, extraction_results: List[Dict[str, Any]]) -> str:
        """Determine overall subsidy status based on document results."""
        if not extraction_results:
            return ExtractionStatus.FAILURE
        
        success_count = sum(1 for r in extraction_results if r.get("status") == ExtractionStatus.SUCCESS)
        partial_count = sum(1 for r in extraction_results if r.get("status") == ExtractionStatus.PARTIAL)
        total_count = len(extraction_results)
        
        if success_count == total_count:
            return ExtractionStatus.SUCCESS
        elif success_count + partial_count >= total_count * 0.5:
            return ExtractionStatus.PARTIAL
        elif success_count + partial_count > 0:
            return ExtractionStatus.WARNING
        else:
            return ExtractionStatus.FAILURE

    def _create_subsidy_result(
        self, 
        subsidy_id: str, 
        status: str, 
        message: str, 
        extraction_results: List[Dict[str, Any]],
        schema: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create standardized subsidy processing result."""
        total_fields = sum(r.get('field_count', 0) for r in extraction_results)
        avg_coverage = sum(r.get('coverage_percentage', 0) for r in extraction_results) / len(extraction_results) if extraction_results else 0
        
        return {
            "success": status in [ExtractionStatus.SUCCESS, ExtractionStatus.PARTIAL],
            "subsidy_id": subsidy_id,
            "status": status,
            "message": message,
            "documents_processed": len(extraction_results),
            "total_fields": total_fields,
            "average_coverage": avg_coverage,
            "schema": schema,
            "extraction_results": extraction_results
        }

    async def _update_subsidy_schema(self, subsidy_id: str, schema: Dict[str, Any]) -> None:
        """Update subsidy record with extracted schema."""
        try:
            result = self.supabase.table('subsidies').update({
                'application_schema': schema
            }).eq('id', subsidy_id).execute()
            
            if not result.data:
                raise Exception(f"No rows updated for subsidy {subsidy_id}")
            
            self.logger.info("Subsidy schema updated", extra={
                "subsidy_id": subsidy_id,
                "total_fields": len(schema.get('fields', []))
            })
                
        except Exception as e:
            self.logger.error("Failed to update subsidy schema", extra={
                "subsidy_id": subsidy_id,
                "error": str(e),
                "error_type": type(e).__name__
            })
            raise

    async def _record_extraction_status(
        self,
        subsidy_id: str,
        document_url: str,
        document_type: str,
        status: str,
        field_count: int = 0,
        coverage_percentage: float = 0.0,
        extracted_schema: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None
    ) -> None:
        """Record document extraction status in database with strict idempotency."""
        try:
            extraction_errors = []
            if error_message:
                extraction_errors.append({
                    "error": error_message, 
                    "timestamp": datetime.utcnow().isoformat()
                })
            
            # Normalize URL to ensure idempotency
            normalized_url = document_url.strip()
            
            # Check if record already exists (strict idempotency)
            existing = self.supabase.table('document_extraction_status').select('id').eq(
                'subsidy_id', subsidy_id
            ).eq('document_url', normalized_url).execute()
            
            data = {
                'subsidy_id': subsidy_id,
                'document_url': normalized_url,
                'document_type': document_type,
                'extraction_status': status,
                'field_count': field_count,
                'coverage_percentage': coverage_percentage,
                'extraction_errors': extraction_errors,
                'extracted_schema': extracted_schema,
                'updated_at': datetime.utcnow().isoformat()
            }
            
            if existing.data:
                # Update existing record
                result = self.supabase.table('document_extraction_status').update(data).eq(
                    'id', existing.data[0]['id']
                ).execute()
                operation = "updated"
            else:
                # Insert new record
                result = self.supabase.table('document_extraction_status').insert(data).execute()
                operation = "inserted"
            
            if not result.data:
                raise Exception(f"Failed to {operation} extraction status record")
            
            self.logger.info(f"Extraction status {operation}", extra={
                "subsidy_id": subsidy_id,
                "document_url": normalized_url,
                "status": status,
                "operation": operation
            })
            
        except Exception as e:
            self.logger.error("Failed to record extraction status", extra={
                "subsidy_id": subsidy_id,
                "document_url": document_url,
                "error": str(e),
                "error_type": type(e).__name__
            })
            # Don't raise - this shouldn't stop the main process

    def _update_stats_from_batch(self, results: List[Any]) -> None:
        """Update statistics from batch processing results."""
        for result in results:
            if isinstance(result, Exception):
                self.logger.error("Batch processing exception", extra={
                    "error": str(result),
                    "error_type": type(result).__name__
                })
                self.stats["failed_subsidies"] += 1
            elif isinstance(result, dict):
                if result.get("status") == ExtractionStatus.SUCCESS:
                    self.stats["successful_subsidies"] += 1
                elif result.get("status") == ExtractionStatus.PARTIAL:
                    self.stats["partial_subsidies"] += 1
                else:
                    self.stats["failed_subsidies"] += 1

    def _generate_final_stats(self) -> Dict[str, Any]:
        """Generate final extraction statistics."""
        total_processed = self.stats["successful_subsidies"] + self.stats["partial_subsidies"] + self.stats["failed_subsidies"]
        
        duration = None
        if self.stats["extraction_start_time"] and self.stats["extraction_end_time"]:
            start = datetime.fromisoformat(self.stats["extraction_start_time"])
            end = datetime.fromisoformat(self.stats["extraction_end_time"])
            duration = (end - start).total_seconds()
        
        return {
            "extraction_summary": {
                "total_subsidies": self.stats["total_subsidies"],
                "processed_subsidies": total_processed,
                "successful_subsidies": self.stats["successful_subsidies"],
                "partial_subsidies": self.stats["partial_subsidies"],
                "failed_subsidies": self.stats["failed_subsidies"],
                "success_rate": (self.stats["successful_subsidies"] / max(total_processed, 1)) * 100
            },
            "document_summary": {
                "total_documents": self.stats["total_documents"],
                "successful_documents": self.stats["successful_documents"],
                "partial_documents": self.stats["partial_documents"],
                "failed_documents": self.stats["failed_documents"],
                "document_success_rate": (self.stats["successful_documents"] / max(self.stats["total_documents"], 1)) * 100
            },
            "timing": {
                "start_time": self.stats["extraction_start_time"],
                "end_time": self.stats["extraction_end_time"],
                "duration_seconds": duration
            }
        }

    async def _save_audit_log(self, stats: Dict[str, Any]) -> None:
        """Save extraction audit log to file."""
        try:
            audit_data = {
                "timestamp": datetime.utcnow().isoformat(),
                "extraction_stats": stats,
                "configuration": {
                    "max_concurrent": self.max_concurrent,
                    "download_timeout": os.getenv('DOWNLOAD_TIMEOUT', '30'),
                    "download_retries": os.getenv('DOWNLOAD_RETRIES', '3')
                }
            }
            
            audit_file = Path("extraction_audit.jsonl")
            
            async with aiofiles.open(audit_file, 'a') as f:
                await f.write(json.dumps(audit_data) + "\n")
                
            self.logger.info("Audit log saved", extra={"audit_file": str(audit_file)})
            
        except Exception as e:
            self.logger.error("Failed to save audit log", extra={
                "error": str(e),
                "error_type": type(e).__name__
            })


async def main():
    """Main CLI function with enhanced argument validation and exit codes."""
    parser = argparse.ArgumentParser(
        description='Extract document schemas from subsidy application forms',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument(
        '--subsidy-ids',
        nargs='+',
        help='Specific subsidy IDs to process'
    )
    parser.add_argument(
        '--all-subsidies',
        action='store_true',
        help='Process all subsidies in database'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=10,
        help='Number of subsidies to process in each batch'
    )
    parser.add_argument(
        '--max-concurrent',
        type=int,
        help='Maximum concurrent document processing (overrides env var)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Only parse and log, do not write to database'
    )
    
    args = parser.parse_args()
    
    # Validate mutually exclusive arguments
    if args.subsidy_ids and args.all_subsidies:
        parser.error('Cannot specify both --subsidy-ids and --all-subsidies')
    
    if not args.subsidy_ids and not args.all_subsidies:
        parser.error('Must specify either --subsidy-ids or --all-subsidies')
    
    # Override environment variable if specified
    if args.max_concurrent:
        os.environ['MAX_CONCURRENT_DOCS'] = str(args.max_concurrent)
    
    try:
        extractor = DocumentSchemaExtractor()
        
        subsidy_ids = args.subsidy_ids if args.subsidy_ids else None
        stats = await extractor.process_subsidies(subsidy_ids, args.batch_size, args.dry_run)
        
        # Print final summary
        print("\n" + "="*60)
        print("EXTRACTION SUMMARY")
        print("="*60)
        
        extraction_summary = stats['extraction_summary']
        document_summary = stats['document_summary']
        
        print(f"Subsidies processed: {extraction_summary['processed_subsidies']}/{extraction_summary['total_subsidies']}")
        print(f"  ✓ Successful: {extraction_summary['successful_subsidies']}")
        print(f"  ⚠ Partial: {extraction_summary['partial_subsidies']}")
        print(f"  ✗ Failed: {extraction_summary['failed_subsidies']}")
        print(f"  Success rate: {extraction_summary['success_rate']:.1f}%")
        
        print(f"\nDocuments processed: {document_summary['total_documents']}")
        print(f"  ✓ Successful: {document_summary['successful_documents']}")
        print(f"  ⚠ Partial: {document_summary['partial_documents']}")
        print(f"  ✗ Failed: {document_summary['failed_documents']}")
        print(f"  Success rate: {document_summary['document_success_rate']:.1f}%")
        
        if stats['timing']['duration_seconds']:
            print(f"\nProcessing time: {stats['timing']['duration_seconds']:.1f} seconds")
        
        print("="*60)
        
        # Determine exit code
        if extraction_summary['failed_subsidies'] == 0:
            return 0  # Complete success
        elif extraction_summary['successful_subsidies'] + extraction_summary['partial_subsidies'] > 0:
            return 2  # Partial success
        else:
            return 1  # Complete failure
        
    except KeyboardInterrupt:
        print("\nExtraction interrupted by user")
        return 1
    except Exception as e:
        print(f"Fatal error: {e}")
        return 1


if __name__ == '__main__':
    sys.exit(asyncio.run(main()))
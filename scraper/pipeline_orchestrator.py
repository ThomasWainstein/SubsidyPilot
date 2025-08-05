#!/usr/bin/env python3
"""
AgriTool Pipeline Orchestrator - Complete end-to-end pipeline
Orchestrates scraping, uploading, AI extraction, and quality assurance
"""

import os
import sys
import time
import json
import logging
import argparse
from typing import Dict, Any, List, Optional
from pathlib import Path

from .batch_processor import BatchProcessor, BatchScrapeConfig
from ai_pipeline import AIExtractor, SupabaseUploader


class PipelineOrchestrator:
    """Complete pipeline orchestration for AgriTool scraping"""

    def __init__(self, config: Dict[str, Any] = None):
        self.logger = self._setup_logging()
        self.config = config or {}

        # Pipeline statistics
        self.pipeline_stats = {
            'start_time': None,
            'end_time': None,
            'stages_completed': [],
            'total_urls_discovered': 0,
            'total_pages_scraped': 0,
            'total_uploads': 0,
            'total_extractions': 0,
            'errors': []
        }

    def _setup_logging(self) -> logging.Logger:
        """Setup comprehensive logging for pipeline"""

        # Create logs directory
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)

        # Create timestamped log file
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        log_file = log_dir / f"pipeline_{timestamp}.log"

        # Configure logging
        logger = logging.getLogger('pipeline_orchestrator')
        logger.setLevel(logging.INFO)

        # Remove existing handlers to avoid duplicates
        for handler in logger.handlers[:]:
            logger.removeHandler(handler)

        # File handler
        file_handler = logging.FileHandler(log_file)
        file_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        file_handler.setFormatter(file_formatter)

        # Console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_formatter = logging.Formatter(
            '%(asctime)s - %(levelname)s - %(message)s'
        )
        console_handler.setFormatter(console_formatter)

        logger.addHandler(file_handler)
        logger.addHandler(console_handler)

        logger.info(f"🚀 Pipeline orchestrator initialized. Logs: {log_file}")
        return logger

    def run_complete_pipeline(self, site_name: str, max_urls: int = 50,
                            max_pages: int = 10, batch_size: int = 10,
                            dry_run: bool = False) -> Dict[str, Any]:
        """Run the complete scraping and extraction pipeline"""

        self.logger.info("🌱 Starting complete AgriTool pipeline")
        self.logger.info(f"🎯 Target: {site_name}")
        self.logger.info(f"📊 Parameters: {max_urls} URLs, {max_pages} pages, batch size {batch_size}")
        self.logger.info(f"🧪 Dry run: {dry_run}")

        self.pipeline_stats['start_time'] = time.time()

        try:
            # Stage 1: Scraping
            scrape_stats = self._run_scraping_stage(site_name, max_urls, max_pages, dry_run)

            if not dry_run and scrape_stats['successful'] > 0:
                # Stage 2: Upload to Supabase
                upload_stats = self._run_upload_stage(batch_size)

                # Stage 3: AI Extraction
                extraction_stats = self._run_extraction_stage(batch_size)

                # Stage 4: Quality Assurance
                qa_stats = self._run_qa_stage()
            else:
                self.logger.info("⏭️ Skipping upload and extraction stages (dry run or no successful scrapes)")

            return self._finalize_pipeline_stats()

        except Exception as e:
            self.pipeline_stats['errors'].append({
                'stage': 'pipeline_orchestration',
                'error': str(e)
            })
            self.logger.error(f"❌ Pipeline failed: {e}")
            raise

    def _run_scraping_stage(self, site_name: str, max_urls: int, max_pages: int,
                          dry_run: bool) -> Dict[str, Any]:
        """Stage 1: Web scraping"""

        self.logger.info("🕸️ Stage 1: Web Scraping")

        try:
            # Configure scraper
            scrape_config = BatchScrapeConfig()
            scrape_config.max_workers = self.config.get('max_workers', 3)

            # Create output directory
            output_dir = self.config.get('output_dir', 'data/scraped')
            Path(output_dir).mkdir(parents=True, exist_ok=True)

            # Run scraping
            processor = BatchProcessor(scrape_config)

            if dry_run:
                # In dry run, just discover URLs
                from .batch_processor import URLDiscovery
                discovery = URLDiscovery(scrape_config)
                urls = discovery.discover_urls(site_name, max_urls, max_pages)

                stats = {
                    'total_urls': len(urls),
                    'successful': len(urls),
                    'failed': 0,
                    'success_rate': 100.0
                }

                self.logger.info(f"🧪 Dry run: Would scrape {len(urls)} URLs")

            else:
                stats = processor.process_site(
                    site_name=site_name,
                    max_urls=max_urls,
                    max_pages=max_pages,
                    output_dir=output_dir
                )

            self.pipeline_stats['total_urls_discovered'] = stats['total_urls']
            self.pipeline_stats['total_pages_scraped'] = stats['successful']
            self.pipeline_stats['stages_completed'].append('scraping')

            self.logger.info(f"✅ Scraping stage completed: {stats['successful']}/{stats['total_urls']} successful")
            return stats

        except Exception as e:
            self.logger.error(f"❌ Scraping stage failed: {e}")
            self.pipeline_stats['errors'].append({
                'stage': 'scraping',
                'error': str(e)
            })
            raise

    def _run_upload_stage(self, batch_size: int) -> Dict[str, Any]:
        """Stage 2: Upload to Supabase"""

        self.logger.info("☁️ Stage 2: Supabase Upload")

        try:
            uploader = SupabaseUploader()
            data_dir = self.config.get('output_dir', 'data/scraped')

            stats = uploader.upload_scraped_data(
                data_dir=data_dir,
                batch_size=batch_size,
                dry_run=False
            )

            self.pipeline_stats['total_uploads'] = stats['successful_uploads']
            self.pipeline_stats['stages_completed'].append('upload')

            self.logger.info(f"✅ Upload stage completed: {stats['successful_uploads']} uploads")
            return stats

        except Exception as e:
            self.logger.error(f"❌ Upload stage failed: {e}")
            self.pipeline_stats['errors'].append({
                'stage': 'upload',
                'error': str(e)
            })
            raise

    def _run_extraction_stage(self, batch_size: int) -> Dict[str, Any]:
        """Stage 3: AI Extraction"""

        self.logger.info("🤖 Stage 3: AI Extraction")

        try:
            extractor = AIExtractor()

            stats = extractor.process_raw_logs(
                batch_size=batch_size,
                max_records=None
            )

            self.pipeline_stats['total_extractions'] = stats['successful_extractions']
            self.pipeline_stats['stages_completed'].append('extraction')

            self.logger.info(f"✅ Extraction stage completed: {stats['successful_extractions']} extractions")
            return stats

        except Exception as e:
            self.logger.error(f"❌ Extraction stage failed: {e}")
            self.pipeline_stats['errors'].append({
                'stage': 'extraction',
                'error': str(e)
            })
            raise

    def _run_qa_stage(self) -> Dict[str, Any]:
        """Stage 4: Quality Assurance"""

        self.logger.info("🔍 Stage 4: Quality Assurance")

        try:
            # Basic QA checks
            qa_stats = {
                'records_checked': 0,
                'quality_issues': 0,
                'remediation_applied': 0
            }

            # Check for basic quality issues
            qa_stats.update(self._check_data_quality())

            self.pipeline_stats['stages_completed'].append('qa')

            self.logger.info(f"✅ QA stage completed: {qa_stats['records_checked']} records checked")
            return qa_stats

        except Exception as e:
            self.logger.error(f"❌ QA stage failed: {e}")
            self.pipeline_stats['errors'].append({
                'stage': 'qa',
                'error': str(e)
            })
            return {'records_checked': 0, 'quality_issues': 0}

    def _check_data_quality(self) -> Dict[str, Any]:
        """Perform basic data quality checks"""

        try:
            from .supabase_uploader import SupabaseUploader
            uploader = SupabaseUploader()
            client = uploader.client

            # Check for records with generic titles
            response = client.table('subsidies_structured').select('id, title').execute()
            records = response.data

            quality_issues = 0
            for record in records:
                title = record.get('title', '')
                if (not title or
                    len(title) < 10 or
                    'Untitled' in title or
                    'Generic' in title):
                    quality_issues += 1

            return {
                'records_checked': len(records),
                'quality_issues': quality_issues,
                'remediation_applied': 0  # Future: implement auto-remediation
            }

        except Exception as e:
            self.logger.warning(f"⚠️ QA check failed: {e}")
            return {'records_checked': 0, 'quality_issues': 0, 'remediation_applied': 0}

    def _finalize_pipeline_stats(self) -> Dict[str, Any]:
        """Finalize pipeline statistics"""

        self.pipeline_stats['end_time'] = time.time()
        self.pipeline_stats['total_duration'] = (
            self.pipeline_stats['end_time'] - self.pipeline_stats['start_time']
        )

        # Generate comprehensive report
        self._generate_pipeline_report()

        return self.pipeline_stats

    def _generate_pipeline_report(self) -> None:
        """Generate comprehensive pipeline report"""

        self.logger.info("📋 Pipeline Execution Report")
        self.logger.info("=" * 50)
        self.logger.info(f"🕐 Total Duration: {self.pipeline_stats['total_duration']:.1f} seconds")
        self.logger.info(f"📊 Stages Completed: {', '.join(self.pipeline_stats['stages_completed'])}")
        self.logger.info(f"🔍 URLs Discovered: {self.pipeline_stats['total_urls_discovered']}")
        self.logger.info(f"📄 Pages Scraped: {self.pipeline_stats['total_pages_scraped']}")
        self.logger.info(f"☁️ Records Uploaded: {self.pipeline_stats['total_uploads']}")
        self.logger.info(f"🤖 AI Extractions: {self.pipeline_stats['total_extractions']}")

        if self.pipeline_stats['errors']:
            self.logger.warning(f"⚠️ Errors Encountered: {len(self.pipeline_stats['errors'])}")
            for error in self.pipeline_stats['errors']:
                self.logger.warning(f"   {error['stage']}: {error['error']}")
        else:
            self.logger.info("✅ No errors encountered")

        # Save report to file
        report_file = Path("logs") / f"pipeline_report_{int(time.time())}.json"
        with open(report_file, 'w') as f:
            json.dump(self.pipeline_stats, f, indent=2)

        self.logger.info(f"💾 Report saved to: {report_file}")


def main():
    """CLI entry point for pipeline orchestration"""

    parser = argparse.ArgumentParser(description="AgriTool Complete Pipeline")
    parser.add_argument('--site', required=True, help='Site to scrape (franceagrimer, etc.)')
    parser.add_argument('--max-urls', type=int, default=50, help='Maximum URLs to scrape')
    parser.add_argument('--max-pages', type=int, default=10, help='Maximum pages to scan')
    parser.add_argument('--batch-size', type=int, default=10, help='Batch size for processing')
    parser.add_argument('--dry-run', action='store_true', help='Dry run mode')
    parser.add_argument('--output-dir', default='data/scraped', help='Output directory')
    parser.add_argument('--max-workers', type=int, default=3, help='Number of parallel workers')

    args = parser.parse_args()

    # Configure pipeline
    config = {
        'output_dir': args.output_dir,
        'max_workers': args.max_workers
    }

    # Run pipeline
    try:
        orchestrator = PipelineOrchestrator(config)
        stats = orchestrator.run_complete_pipeline(
            site_name=args.site,
            max_urls=args.max_urls,
            max_pages=args.max_pages,
            batch_size=args.batch_size,
            dry_run=args.dry_run
        )

        # Determine exit code based on success
        success_rate = 0
        if stats['total_pages_scraped'] > 0:
            success_rate = (stats['total_extractions'] / stats['total_pages_scraped']) * 100

        exit_code = 0 if success_rate > 70 and len(stats['errors']) == 0 else 1
        sys.exit(exit_code)

    except KeyboardInterrupt:
        print("\n🛑 Pipeline interrupted by user")
        sys.exit(130)

    except Exception as e:
        print(f"❌ Pipeline failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

"""Integration test for the scraping -> Supabase -> AI pipeline."""

import json
import sys
import types
from pathlib import Path
from typing import Any, Dict


def test_end_to_end_pipeline(monkeypatch, tmp_path):
    """Ensure orchestrator runs scraping, upload, and extraction stages."""

    # Prepare temporary directory for scraped data
    output_dir = tmp_path / "scraped"
    output_dir.mkdir()

    dummy_record = {"id": "1", "title": "Test Subsidy"}

    dummy_supabase = types.ModuleType("scraper.supabase_uploader")

    class SupabaseUploader:
        def upload_scraped_data(
            self, data_dir: str, batch_size: int, dry_run: bool
        ) -> Dict[str, int]:
            assert Path(data_dir, "test.json").exists()
            return {"successful_uploads": 1}

    dummy_supabase.SupabaseUploader = SupabaseUploader
    sys.modules["scraper.supabase_uploader"] = dummy_supabase

    from scraper.pipeline_orchestrator import PipelineOrchestrator

    class DummyBatchProcessor:
        def __init__(self, config: Any):  # pragma: no cover - simple stub
            self.config = config

        def process_site(
            self,
            site_name: str,
            max_urls: int,
            max_pages: int,
            output_dir: str,
        ) -> Dict[str, int]:
            Path(output_dir, "test.json").write_text(json.dumps(dummy_record))
            return {"total_urls": 1, "successful": 1}

    class DummyExtractor:
        def process_raw_logs(
            self, batch_size: int, max_records: Any = None
        ) -> Dict[str, int]:
            return {"successful_extractions": 1}

    class DummyConfig:
        def __init__(self):
            self.max_workers = 1

    # Patch orchestrator dependencies
    monkeypatch.setattr(
        "scraper.pipeline_orchestrator.BatchScrapeConfig",
        DummyConfig,
    )
    monkeypatch.setattr(
        "scraper.pipeline_orchestrator.BatchProcessor", DummyBatchProcessor
    )
    monkeypatch.setattr(
        "scraper.pipeline_orchestrator.AIExtractor",
        lambda: DummyExtractor(),
    )
    monkeypatch.setattr(
        PipelineOrchestrator,
        "_check_data_quality",
        lambda self: {
            "records_checked": 1,
            "quality_issues": 0,
            "remediation_applied": 0,
        },
    )

    orchestrator = PipelineOrchestrator(config={"output_dir": str(output_dir)})
    stats = orchestrator.run_complete_pipeline(
        "dummy", max_urls=1, max_pages=1, dry_run=False
    )

    assert stats["stages_completed"] == [
        "scraping",
        "upload",
        "extraction",
        "qa",
    ]

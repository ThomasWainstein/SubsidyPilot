from .extractor import AIExtractor, ExtractionConfig, ExtractionStats
from .supabase_uploader import SupabaseUploader
from .qa import compute_qa_metrics


def extract_from_records(records, config=None):
    """Run AI extraction on provided records without Selenium dependencies."""
    extractor = AIExtractor(config=config or ExtractionConfig())
    return extractor.process_records(records)

__all__ = [
    "AIExtractor",
    "ExtractionConfig",
    "ExtractionStats",
    "SupabaseUploader",
    "compute_qa_metrics",
    "extract_from_records",
]

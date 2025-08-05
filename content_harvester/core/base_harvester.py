#!/usr/bin/env python3
"""
Universal Content Harvester - Main Orchestrator
===============================================

The primary interface for content harvesting operations across multiple
countries and document types. Provides a unified API for content extraction
with format preservation and quality validation.
"""

import asyncio
import logging
import time
import uuid
from pathlib import Path
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, field
from datetime import datetime

from .content_processor import ContentProcessor
from .format_preserver import FormatPreserver
from .metadata_extractor import MetadataExtractor
from .validation_engine import ValidationEngine
from ..discovery.url_discoverer import URLDiscoverer
from ..utils.language_detector import LanguageDetector
from ..utils.performance_monitor import PerformanceMonitor


@dataclass
class HarvestConfig:
    """Configuration for content harvesting operations."""
    
    # Content extraction settings
    preserve_formatting: bool = True
    extract_documents: bool = True
    include_metadata: bool = True
    language_detection: bool = True
    content_classification: bool = True
    
    # Performance settings
    max_concurrent: int = 5
    timeout_seconds: int = 30
    retry_attempts: int = 3
    delay_between_requests: float = 1.0
    
    # Output settings
    output_format: str = "comprehensive"
    include_html: bool = True
    include_raw: bool = True
    compress_large_files: bool = True
    
    # Quality settings
    min_confidence_score: float = 0.8
    validate_content: bool = True
    enable_quality_monitoring: bool = True


@dataclass
class SourceDefinition:
    """Definition of a content source to harvest."""
    
    url: str
    source_type: str = "url"  # url, sitemap, rss
    country: str = "unknown"
    agency: str = "unknown"
    priority: str = "medium"  # high, medium, low
    filters: List[str] = field(default_factory=list)
    custom_config: Dict[str, Any] = field(default_factory=dict)


@dataclass
class HarvestResult:
    """Result of a content harvesting operation."""
    
    session_id: str
    timestamp: str
    source_url: str
    success: bool = False
    
    # Content data
    content: Dict[str, Any] = field(default_factory=dict)
    documents: List[Dict[str, Any]] = field(default_factory=list)
    relationships: Dict[str, Any] = field(default_factory=dict)
    
    # Quality metrics
    quality_metrics: Dict[str, float] = field(default_factory=dict)
    extraction_confidence: float = 0.0
    completeness_score: float = 0.0
    format_preservation: float = 0.0
    
    # Processing metadata
    processing_time: float = 0.0
    error_message: Optional[str] = None
    retry_count: int = 0


class UniversalHarvester:
    """
    Universal Content Harvester for agricultural subsidy websites.
    
    Provides comprehensive content extraction with format preservation,
    document processing, and quality validation across multiple countries
    and website structures.
    """
    
    def __init__(self, config: Optional[HarvestConfig] = None):
        """
        Initialize the Universal Content Harvester.
        
        Args:
            config: Harvesting configuration. Uses defaults if not provided.
        """
        self.config = config or HarvestConfig()
        self.session_id = str(uuid.uuid4())
        
        # Initialize core components
        self.content_processor = ContentProcessor(self.config)
        self.format_preserver = FormatPreserver(self.config)
        self.metadata_extractor = MetadataExtractor(self.config)
        self.validation_engine = ValidationEngine(self.config)
        self.url_discoverer = URLDiscoverer(self.config)
        self.language_detector = LanguageDetector()
        self.performance_monitor = PerformanceMonitor()
        
        # Setup logging
        self.logger = logging.getLogger(__name__)
        self.logger.info(f"🚀 Universal Harvester initialized - Session: {self.session_id}")
    
    async def harvest_content(
        self, 
        sources: List[Union[str, SourceDefinition]]
    ) -> List[HarvestResult]:
        """
        Harvest content from multiple sources with comprehensive processing.
        
        Args:
            sources: List of URLs or SourceDefinition objects to harvest
            
        Returns:
            List of HarvestResult objects with extracted content and metadata
        """
        start_time = time.time()
        self.logger.info(f"🔄 Starting harvest of {len(sources)} sources")
        
        # Normalize sources to SourceDefinition objects
        normalized_sources = []
        for source in sources:
            if isinstance(source, str):
                normalized_sources.append(SourceDefinition(url=source))
            else:
                normalized_sources.append(source)
        
        # Process sources concurrently
        semaphore = asyncio.Semaphore(self.config.max_concurrent)
        tasks = [
            self._harvest_single_source(semaphore, source) 
            for source in normalized_sources
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results and handle exceptions
        harvest_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                self.logger.error(f"❌ Error harvesting {normalized_sources[i].url}: {result}")
                error_result = HarvestResult(
                    session_id=self.session_id,
                    timestamp=datetime.now().isoformat(),
                    source_url=normalized_sources[i].url,
                    success=False,
                    error_message=str(result)
                )
                harvest_results.append(error_result)
            else:
                harvest_results.append(result)
        
        total_time = time.time() - start_time
        success_count = sum(1 for r in harvest_results if r.success)
        
        self.logger.info(
            f"✅ Harvest complete: {success_count}/{len(sources)} successful "
            f"in {total_time:.2f}s"
        )
        
        return harvest_results
    
    async def _harvest_single_source(
        self, 
        semaphore: asyncio.Semaphore, 
        source: SourceDefinition
    ) -> HarvestResult:
        """
        Harvest content from a single source with full processing pipeline.
        
        Args:
            semaphore: Concurrency control semaphore
            source: Source definition to harvest
            
        Returns:
            HarvestResult with extracted content and quality metrics
        """
        async with semaphore:
            start_time = time.time()
            result = HarvestResult(
                session_id=self.session_id,
                timestamp=datetime.now().isoformat(),
                source_url=source.url
            )
            
            try:
                self.logger.info(f"🔍 Harvesting: {source.url}")
                
                # Step 1: Discover URLs if this is a sitemap or RSS source
                urls_to_process = [source.url]
                if source.source_type in ["sitemap", "rss"]:
                    discovered_urls = await self.url_discoverer.discover_urls(
                        source.url, source.source_type, source.filters
                    )
                    urls_to_process.extend(discovered_urls)
                    self.logger.info(f"📋 Discovered {len(discovered_urls)} additional URLs")
                
                # Step 2: Process main content
                content_data = await self.content_processor.process_content(
                    source.url, source.custom_config
                )
                
                # Step 3: Preserve formatting and structure
                preserved_content = await self.format_preserver.preserve_format(
                    content_data
                )
                
                # Step 4: Extract comprehensive metadata
                metadata = await self.metadata_extractor.extract_metadata(
                    source.url, content_data
                )
                
                # Step 5: Detect and process language
                if self.config.language_detection:
                    language_info = self.language_detector.detect_language(
                        content_data.get('text_content', '')
                    )
                    metadata['language'] = language_info
                
                # Step 6: Discover and process related documents
                documents = []
                if self.config.extract_documents:
                    document_urls = self.content_processor.find_document_links(
                        content_data
                    )
                    for doc_url in document_urls:
                        doc_result = await self.content_processor.process_document(
                            doc_url
                        )
                        if doc_result:
                            documents.append(doc_result)
                
                # Step 7: Build relationship mapping
                relationships = await self._build_relationships(
                    source.url, content_data, documents
                )
                
                # Step 8: Validate content quality
                quality_metrics = {}
                if self.config.validate_content:
                    quality_metrics = await self.validation_engine.validate_content(
                        preserved_content, documents, metadata
                    )
                
                # Step 9: Compile final result
                result.content = preserved_content
                result.documents = documents
                result.relationships = relationships
                result.quality_metrics = quality_metrics
                result.extraction_confidence = quality_metrics.get('confidence', 0.0)
                result.completeness_score = quality_metrics.get('completeness', 0.0)
                result.format_preservation = quality_metrics.get('format_score', 0.0)
                result.processing_time = time.time() - start_time
                result.success = True
                
                self.logger.info(
                    f"✅ Harvested {source.url} - "
                    f"Confidence: {result.extraction_confidence:.2f}, "
                    f"Time: {result.processing_time:.2f}s"
                )
                
            except Exception as e:
                result.error_message = str(e)
                result.processing_time = time.time() - start_time
                self.logger.error(f"❌ Failed to harvest {source.url}: {e}")
            
            # Add small delay to be respectful
            await asyncio.sleep(self.config.delay_between_requests)
            
            return result
    
    async def _build_relationships(
        self, 
        source_url: str, 
        content_data: Dict[str, Any], 
        documents: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Build relationship mapping between content and documents.
        
        Args:
            source_url: Original source URL
            content_data: Extracted content data
            documents: List of associated documents
            
        Returns:
            Dictionary containing relationship mappings
        """
        relationships = {
            "source_url": source_url,
            "parent_pages": [],
            "child_documents": [doc.get('url') for doc in documents],
            "cross_references": [],
            "content_hierarchy": {},
            "document_types": {}
        }
        
        # Analyze content for cross-references
        text_content = content_data.get('text_content', '')
        
        # Find references to other documents or pages
        # This is a simplified version - would be enhanced with NLP
        for doc in documents:
            doc_name = doc.get('file_name', '')
            if doc_name and doc_name.lower() in text_content.lower():
                relationships["cross_references"].append({
                    "from": source_url,
                    "to": doc.get('url'),
                    "type": "document_reference",
                    "context": "mentioned_in_content"
                })
        
        # Classify document types
        for doc in documents:
            file_ext = doc.get('file_extension', '').lower()
            if file_ext in ['.pdf']:
                relationships["document_types"][doc.get('url')] = "application_form"
            elif file_ext in ['.doc', '.docx']:
                relationships["document_types"][doc.get('url')] = "guidance_document"
            elif file_ext in ['.xls', '.xlsx']:
                relationships["document_types"][doc.get('url')] = "data_template"
        
        return relationships
    
    def get_harvest_summary(self, results: List[HarvestResult]) -> Dict[str, Any]:
        """
        Generate a comprehensive summary of harvest results.
        
        Args:
            results: List of harvest results to summarize
            
        Returns:
            Dictionary containing summary statistics and metrics
        """
        if not results:
            return {"total_sources": 0, "success_rate": 0.0}
        
        successful_results = [r for r in results if r.success]
        
        summary = {
            "session_id": self.session_id,
            "timestamp": datetime.now().isoformat(),
            "total_sources": len(results),
            "successful_harvests": len(successful_results),
            "success_rate": len(successful_results) / len(results),
            "total_processing_time": sum(r.processing_time for r in results),
            "average_processing_time": sum(r.processing_time for r in results) / len(results),
            "total_documents": sum(len(r.documents) for r in successful_results),
            "average_confidence": sum(r.extraction_confidence for r in successful_results) / max(len(successful_results), 1),
            "average_completeness": sum(r.completeness_score for r in successful_results) / max(len(successful_results), 1),
            "average_format_preservation": sum(r.format_preservation for r in successful_results) / max(len(successful_results), 1),
            "errors": [r.error_message for r in results if r.error_message],
            "performance_metrics": self.performance_monitor.get_summary()
        }
        
        return summary
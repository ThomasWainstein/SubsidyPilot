#!/usr/bin/env python3
"""
AI Processing Engine for Agricultural Subsidy Canonicalization
=============================================================

Multi-country AI processing system that transforms raw scraped content
into structured, canonical subsidy data with quality validation.
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass, field
from enum import Enum
import json

from .processors.romanian_processor import RomanianProcessor
from .processors.french_processor import FrenchProcessor
from .processors.multilingual_processor import MultilingualProcessor
from .canonicalization.canonical_mapper import CanonicalMapper
from .quality.confidence_scorer import ConfidenceScorer
from .quality.completeness_validator import CompletenessValidator


class ProcessingStage(Enum):
    """AI processing pipeline stages."""
    CONTENT_ANALYSIS = "content_analysis"
    INITIAL_EXTRACTION = "initial_extraction"
    CROSS_VALIDATION = "cross_validation"
    CANONICALIZATION = "canonicalization"
    QUALITY_ENHANCEMENT = "quality_enhancement"
    FINAL_VALIDATION = "final_validation"


@dataclass
class ProcessingConfig:
    """Configuration for AI processing operations."""
    
    # Model selection
    primary_model: str = "gpt-4o"
    fallback_model: str = "gpt-4o-mini"
    validation_model: str = "claude-sonnet-4"
    
    # Processing settings
    max_concurrent: int = 10
    retry_attempts: int = 3
    confidence_threshold: float = 0.8
    
    # Quality settings
    min_completeness: float = 0.7
    enable_cross_validation: bool = True
    enable_enhancement: bool = True
    
    # Country-specific settings
    supported_countries: List[str] = field(default_factory=lambda: ["romania", "france"])
    default_target_language: str = "en"


@dataclass
class CanonicalSubsidy:
    """Canonical subsidy data structure."""
    
    # Core identification
    canonical_id: str
    source_urls: List[str] = field(default_factory=list)
    reference_codes: Dict[str, str] = field(default_factory=dict)
    title: Dict[str, str] = field(default_factory=dict)  # {lang: title}
    subsidy_type: str = "agricultural_support"
    
    # Financial details (normalized to EUR)
    total_budget: Optional[float] = None
    max_individual_grant: Optional[float] = None
    co_financing_rates: Dict[str, float] = field(default_factory=dict)
    payment_structure: List[str] = field(default_factory=list)
    currency_original: str = "EUR"
    
    # Geographic and temporal scope
    eligible_regions: List[str] = field(default_factory=list)
    country_specific_regions: Dict[str, List[str]] = field(default_factory=dict)
    application_period: Dict[str, str] = field(default_factory=dict)
    project_duration: Dict[str, int] = field(default_factory=dict)
    deadline_hierarchy: Dict[str, str] = field(default_factory=dict)
    
    # Eligibility matrix
    beneficiary_categories: List[str] = field(default_factory=list)
    size_requirements: Dict[str, Any] = field(default_factory=dict)
    sector_restrictions: List[str] = field(default_factory=list)
    compliance_requirements: List[str] = field(default_factory=list)
    exclusion_criteria: List[str] = field(default_factory=list)
    
    # Application process
    application_method: str = "online"
    required_documents: List[Dict[str, str]] = field(default_factory=list)
    evaluation_criteria: Dict[str, Any] = field(default_factory=dict)
    contact_information: Dict[str, str] = field(default_factory=dict)
    help_resources: List[Dict[str, str]] = field(default_factory=list)
    
    # Content and documentation
    description_canonical: Dict[str, str] = field(default_factory=dict)
    description_verbatim: Dict[str, str] = field(default_factory=dict)
    key_requirements: List[str] = field(default_factory=list)
    success_factors: List[str] = field(default_factory=list)
    document_library: List[Dict[str, Any]] = field(default_factory=list)
    
    # Processing metadata
    extraction_confidence: float = 0.0
    completeness_score: float = 0.0
    quality_score: float = 0.0
    processing_timestamp: str = ""
    source_country: str = ""
    processing_notes: List[str] = field(default_factory=list)


class AIProcessingEngine:
    """
    Multi-country AI processing engine for subsidy canonicalization.
    
    Transforms raw harvested content into structured canonical data
    with country-specific intelligence and robust quality validation.
    """
    
    def __init__(self, config: Optional[ProcessingConfig] = None):
        """Initialize AI processing engine."""
        self.config = config or ProcessingConfig()
        self.logger = logging.getLogger(__name__)
        
        # Initialize country-specific processors
        self.processors = {
            "romania": RomanianProcessor(self.config),
            "france": FrenchProcessor(self.config),
            "multilingual": MultilingualProcessor(self.config)
        }
        
        # Initialize core processing components
        self.canonical_mapper = CanonicalMapper()
        self.confidence_scorer = ConfidenceScorer()
        self.completeness_validator = CompletenessValidator()
        
        self.logger.info("🧠 AI Processing Engine initialized")
    
    async def process_harvest_results(
        self, 
        harvest_results: List[Any]  # From Task 1A UniversalHarvester
    ) -> List[CanonicalSubsidy]:
        """
        Process harvest results through the AI canonicalization pipeline.
        
        Args:
            harvest_results: Results from UniversalHarvester
            
        Returns:
            List of canonical subsidy structures
        """
        try:
            self.logger.info(f"🔄 Processing {len(harvest_results)} harvest results")
            
            canonical_subsidies = []
            
            # Process each harvest result through the AI pipeline
            semaphore = asyncio.Semaphore(self.config.max_concurrent)
            tasks = [
                self._process_single_harvest(semaphore, result) 
                for result in harvest_results
            ]
            
            processed_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Collect successful results
            for i, result in enumerate(processed_results):
                if isinstance(result, Exception):
                    self.logger.error(f"❌ Processing failed for result {i}: {result}")
                elif result:
                    canonical_subsidies.append(result)
            
            self.logger.info(f"✅ AI processing complete: {len(canonical_subsidies)} canonical subsidies")
            return canonical_subsidies
            
        except Exception as e:
            self.logger.error(f"❌ AI processing pipeline failed: {e}")
            return []
    
    async def _process_single_harvest(
        self, 
        semaphore: asyncio.Semaphore, 
        harvest_result: Any
    ) -> Optional[CanonicalSubsidy]:
        """Process a single harvest result through the full AI pipeline."""
        async with semaphore:
            try:
                # Stage 1: Content Analysis
                analysis = await self._analyze_content(harvest_result)
                if not analysis:
                    return None
                
                # Stage 2: Initial AI Extraction
                extraction = await self._extract_subsidy_data(harvest_result, analysis)
                if not extraction:
                    return None
                
                # Stage 3: Cross-Validation
                if self.config.enable_cross_validation:
                    extraction = await self._cross_validate_extraction(extraction, harvest_result)
                
                # Stage 4: Canonicalization
                canonical = await self._canonicalize_data(extraction, analysis)
                
                # Stage 5: Quality Enhancement
                if self.config.enable_enhancement:
                    canonical = await self._enhance_quality(canonical, harvest_result)
                
                # Stage 6: Final Validation
                canonical = await self._final_validation(canonical)
                
                return canonical
                
            except Exception as e:
                self.logger.error(f"❌ Single harvest processing failed: {e}")
                return None
    
    async def _analyze_content(self, harvest_result: Any) -> Optional[Dict[str, Any]]:
        """Analyze harvest content to determine processing strategy."""
        try:
            content_text = harvest_result.content.get('text_content', '')
            
            # Detect country and language
            country = self._detect_country(harvest_result)
            language = self._detect_language(content_text)
            
            # Classify subsidy type
            subsidy_type = self._classify_subsidy_type(content_text)
            
            # Assess content quality
            quality_metrics = self._assess_content_quality(harvest_result)
            
            analysis = {
                'country': country,
                'language': language,
                'subsidy_type': subsidy_type,
                'quality_metrics': quality_metrics,
                'content_length': len(content_text),
                'has_documents': len(harvest_result.documents) > 0,
                'processing_strategy': self._determine_processing_strategy(country, quality_metrics)
            }
            
            self.logger.debug(f"📊 Content analysis: {country}/{language}, quality: {quality_metrics.get('overall', 0):.2f}")
            return analysis
            
        except Exception as e:
            self.logger.error(f"❌ Content analysis failed: {e}")
            return None
    
    async def _extract_subsidy_data(
        self, 
        harvest_result: Any, 
        analysis: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Extract structured subsidy data using country-specific AI processing."""
        try:
            country = analysis.get('country', 'multilingual')
            processor = self.processors.get(country, self.processors['multilingual'])
            
            # Use country-specific processor
            extraction = await processor.extract_subsidy_data(
                content=harvest_result.content,
                documents=harvest_result.documents,
                metadata=harvest_result.metadata,
                analysis=analysis
            )
            
            # Add confidence scoring
            extraction['ai_confidence'] = await self.confidence_scorer.score_extraction(
                extraction, harvest_result, analysis
            )
            
            return extraction
            
        except Exception as e:
            self.logger.error(f"❌ AI extraction failed: {e}")
            return None
    
    async def _cross_validate_extraction(
        self, 
        extraction: Dict[str, Any], 
        harvest_result: Any
    ) -> Dict[str, Any]:
        """Cross-validate extraction against multiple sources and models."""
        try:
            # Validate against document content
            doc_validation = await self._validate_against_documents(extraction, harvest_result.documents)
            
            # Validate consistency
            consistency_score = await self._check_internal_consistency(extraction)
            
            # Update confidence based on validation
            original_confidence = extraction.get('ai_confidence', 0.0)
            validation_boost = (doc_validation + consistency_score) / 2
            extraction['ai_confidence'] = min(original_confidence + validation_boost * 0.1, 1.0)
            
            extraction['validation_scores'] = {
                'document_validation': doc_validation,
                'consistency_score': consistency_score
            }
            
            return extraction
            
        except Exception as e:
            self.logger.warning(f"⚠️ Cross-validation failed: {e}")
            return extraction
    
    async def _canonicalize_data(
        self, 
        extraction: Dict[str, Any], 
        analysis: Dict[str, Any]
    ) -> CanonicalSubsidy:
        """Transform extracted data to canonical structure."""
        try:
            # Use canonical mapper to transform data
            canonical = await self.canonical_mapper.transform_to_canonical(
                extraction, analysis
            )
            
            # Calculate completeness score
            canonical.completeness_score = await self.completeness_validator.validate_completeness(
                canonical
            )
            
            # Calculate overall quality score
            canonical.quality_score = (
                canonical.extraction_confidence * 0.4 +
                canonical.completeness_score * 0.4 +
                extraction.get('validation_scores', {}).get('consistency_score', 0.5) * 0.2
            )
            
            return canonical
            
        except Exception as e:
            self.logger.error(f"❌ Canonicalization failed: {e}")
            # Return minimal canonical structure
            return CanonicalSubsidy(
                canonical_id=f"error_{hash(str(extraction))}",
                processing_notes=[f"Canonicalization error: {str(e)}"]
            )
    
    async def _enhance_quality(
        self, 
        canonical: CanonicalSubsidy, 
        harvest_result: Any
    ) -> CanonicalSubsidy:
        """Enhance data quality for low-confidence extractions."""
        try:
            if canonical.quality_score < self.config.confidence_threshold:
                # Attempt quality enhancement
                enhanced = await self._enhance_low_quality_fields(canonical, harvest_result)
                
                # Re-calculate quality scores
                enhanced.completeness_score = await self.completeness_validator.validate_completeness(enhanced)
                enhanced.quality_score = (enhanced.quality_score + enhanced.completeness_score) / 2
                
                return enhanced
            
            return canonical
            
        except Exception as e:
            self.logger.warning(f"⚠️ Quality enhancement failed: {e}")
            return canonical
    
    async def _final_validation(self, canonical: CanonicalSubsidy) -> CanonicalSubsidy:
        """Perform final validation and quality checks."""
        try:
            # Validate required fields
            if not canonical.title or not canonical.source_urls:
                canonical.processing_notes.append("Missing required fields")
                canonical.quality_score *= 0.5
            
            # Validate financial data
            if canonical.total_budget and canonical.total_budget <= 0:
                canonical.processing_notes.append("Invalid financial data")
                canonical.quality_score *= 0.8
            
            # Set processing timestamp
            from datetime import datetime
            canonical.processing_timestamp = datetime.now().isoformat()
            
            return canonical
            
        except Exception as e:
            self.logger.error(f"❌ Final validation failed: {e}")
            canonical.processing_notes.append(f"Validation error: {str(e)}")
            return canonical
    
    # Helper methods for content analysis
    def _detect_country(self, harvest_result: Any) -> str:
        """Detect country from harvest result."""
        source_url = getattr(harvest_result, 'source_url', '')
        
        if '.ro' in source_url or 'romania' in source_url.lower():
            return 'romania'
        elif '.fr' in source_url or 'france' in source_url.lower():
            return 'france'
        else:
            return 'multilingual'
    
    def _detect_language(self, content: str) -> str:
        """Detect language from content."""
        content_lower = content.lower()
        
        if any(word in content_lower for word in ['și', 'de', 'cu', 'în', 'subvenție']):
            return 'ro'
        elif any(word in content_lower for word in ['et', 'de', 'le', 'la', 'subvention']):
            return 'fr'
        else:
            return 'en'
    
    def _classify_subsidy_type(self, content: str) -> str:
        """Classify subsidy type from content."""
        content_lower = content.lower()
        
        if any(term in content_lower for term in ['agriculture', 'farming', 'rural', 'agricol']):
            return 'agricultural_support'
        elif any(term in content_lower for term in ['environment', 'green', 'mediu']):
            return 'environmental_support'
        else:
            return 'general_support'
    
    def _assess_content_quality(self, harvest_result: Any) -> Dict[str, float]:
        """Assess quality of harvested content."""
        content_length = len(harvest_result.content.get('text_content', ''))
        
        return {
            'text_length_score': min(content_length / 1000, 1.0),
            'structure_score': 0.8 if harvest_result.content.get('tables') else 0.6,
            'document_score': min(len(harvest_result.documents) / 3, 1.0),
            'overall': 0.7  # Placeholder
        }
    
    def _determine_processing_strategy(self, country: str, quality_metrics: Dict[str, float]) -> str:
        """Determine optimal processing strategy."""
        overall_quality = quality_metrics.get('overall', 0.5)
        
        if overall_quality > 0.8:
            return 'standard'
        elif overall_quality > 0.5:
            return 'enhanced'
        else:
            return 'intensive'
    
    async def _validate_against_documents(self, extraction: Dict[str, Any], documents: List[Any]) -> float:
        """Validate extraction against source documents."""
        # Placeholder implementation
        return 0.8
    
    async def _check_internal_consistency(self, extraction: Dict[str, Any]) -> float:
        """Check internal consistency of extracted data."""
        # Placeholder implementation
        return 0.8
    
    async def _enhance_low_quality_fields(
        self, 
        canonical: CanonicalSubsidy, 
        harvest_result: Any
    ) -> CanonicalSubsidy:
        """Enhance low-quality fields using additional AI processing."""
        # Placeholder implementation
        return canonical
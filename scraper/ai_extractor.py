#!/usr/bin/env python3
"""
AgriTool AI Extractor - Enhanced GPT-4 powered content extraction
Converts raw scraped data into structured subsidy information with async processing
"""

import os
import sys
import json
import time
import asyncio
import logging
from typing import Dict, Any, List, Optional, Union, Tuple
from dataclasses import dataclass, asdict, field
from enum import Enum
import re
from pathlib import Path
from datetime import datetime
import traceback
import argparse

# Third-party imports with fallbacks
try:
    import openai
    from openai import AsyncOpenAI
except ImportError:
    print("❌ ERROR: OpenAI library not installed")
    print("Install with: pip install openai")
    sys.exit(1)

try:
    from supabase import create_client, Client
    try:
        from supabase._async.client import AsyncClient, create_async_client
    except ImportError:
        AsyncClient = None  # type: ignore
        create_async_client = None  # type: ignore
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


class ExtractionStatus(Enum):
    """Status enumeration for extraction processes"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"
    QUALITY_RETRY = "quality_retry"


class ModelType(Enum):
    """Supported OpenAI model types with automatic selection"""
    GPT4_TURBO = "gpt-4-turbo-preview"
    GPT4 = "gpt-4"
    GPT4_OMNI = "gpt-4o"
    GPT35_TURBO = "gpt-3.5-turbo"
    
    @classmethod
    def get_best_model(cls) -> 'ModelType':
        """Get the best available model for extraction"""
        return cls.GPT4_TURBO  # Default to most capable model


@dataclass
class ExtractionQuality:
    """Quality assessment for extracted data"""
    coverage_score: float
    completeness_score: float
    validation_score: float
    overall_score: float
    critical_missing: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    field_scores: Dict[str, float] = field(default_factory=dict)
    
    @property
    def is_acceptable(self) -> bool:
        """Check if quality is acceptable for production use"""
        return self.overall_score >= 70.0 and len(self.critical_missing) == 0
    
    @property
    def needs_retry(self) -> bool:
        """Check if extraction should be retried due to poor quality"""
        return self.overall_score < 50.0 or len(self.critical_missing) > 2


@dataclass
class ExtractionStats:
    """Comprehensive statistics for extraction operations"""
    total_processed: int = 0
    successful_extractions: int = 0
    failed_extractions: int = 0
    quality_retries: int = 0
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    tokens_used: int = 0
    estimated_cost: float = 0.0
    errors: List[Dict[str, Any]] = field(default_factory=list)
    model_usage: Dict[str, int] = field(default_factory=dict)
    quality_scores: List[float] = field(default_factory=list)
    
    @property
    def duration(self) -> float:
        """Calculate processing duration"""
        if self.start_time and self.end_time:
            return self.end_time - self.start_time
        return 0.0
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate percentage"""
        total = max(self.total_processed, 1)
        return (self.successful_extractions / total) * 100
    
    @property
    def average_quality(self) -> float:
        """Calculate average quality score"""
        if self.quality_scores:
            return sum(self.quality_scores) / len(self.quality_scores)
        return 0.0
    
    @property
    def processing_rate(self) -> float:
        """Calculate records processed per second"""
        if self.duration > 0:
            return self.total_processed / self.duration
        return 0.0


@dataclass
class ExtractionConfig:
    """Configuration for AI extraction operations"""
    model: ModelType = ModelType.GPT4_TURBO
    batch_size: int = 5
    max_retries: int = 3
    quality_threshold: float = 70.0
    max_tokens: int = 4000
    temperature: float = 0.1
    concurrent_limit: int = 3
    delay_between_requests: float = 0.5
    enable_quality_assessment: bool = True
    retry_on_quality_failure: bool = True
    content_length_limit: int = 15000
    save_debug_output: bool = False
    output_format: str = "database"  # "database", "file", "both"
    
    @classmethod
    def from_args(cls, args: argparse.Namespace) -> 'ExtractionConfig':
        """Create config from command line arguments"""
        return cls(
            model=ModelType(args.model),
            batch_size=args.batch_size,
            max_retries=args.max_retries,
            quality_threshold=args.quality_threshold,
            concurrent_limit=args.concurrent_limit,
            enable_quality_assessment=args.enable_quality,
            retry_on_quality_failure=args.retry_on_quality,
            save_debug_output=args.debug,
            output_format=args.output
        )


class AIExtractor:
    """Enhanced GPT-4 powered extraction engine for subsidy data"""
    
    def __init__(self, config: Optional[ExtractionConfig] = None):
        self.config = config or ExtractionConfig()
        self._setup_logging()
        
        # Client initialization (will be done async)
        self.openai_client = None
        self.async_openai_client = None
        self.supabase_client = None
        self.async_supabase_client = None
        
        # Extraction statistics
        self.stats = ExtractionStats()
        
        # Semaphore for concurrent processing
        self.semaphore = asyncio.Semaphore(self.config.concurrent_limit)
        
        # Cache for extraction prompt
        self._extraction_prompt_cache = None
        
        # Session management
        self._session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    def _setup_logging(self) -> None:
        """Setup comprehensive logging for extraction operations"""
        if HAS_LOGGING_SETUP:
            ensure_artifact_files()
            self.logger = setup_pipeline_logging("ai_extractor")
        else:
            self.logger = logging.getLogger('ai_extractor')
            self.logger.setLevel(logging.INFO)
            
            if not self.logger.handlers:
                handler = logging.StreamHandler(sys.stdout)
                formatter = logging.Formatter(
                    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
                )
                handler.setFormatter(formatter)
                self.logger.addHandler(handler)
    
    async def initialize(self) -> None:
        """Initialize all clients and dependencies"""
        try:
            await self._init_openai_clients()
            await self._init_supabase_clients()
            self.logger.info("✅ AI Extractor initialized successfully")
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize AI Extractor: {e}")
            raise
    
    async def _init_openai_clients(self) -> None:
        """Initialize OpenAI clients with proper error handling"""
        api_key = os.getenv('SCRAPER_RAW_GPT_API') or os.getenv('OPENAI_API_KEY')
        
        if not api_key:
            raise ValueError("Missing OpenAI API key. Set SCRAPER_RAW_GPT_API or OPENAI_API_KEY")
        
        try:
            self.openai_client = openai.OpenAI(api_key=api_key)
            self.async_openai_client = AsyncOpenAI(api_key=api_key)
            
            # Test connection
            await self.async_openai_client.models.list()
            self.logger.info(f"✅ OpenAI clients initialized (model: {self.config.model.value})")
            
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize OpenAI clients: {e}")
            raise
    
    async def _init_supabase_clients(self) -> None:
        """Initialize Supabase clients with proper error handling"""
        supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')
        
        if not supabase_url or not supabase_key:
            raise ValueError("Missing Supabase credentials")
        
        try:
            self.supabase_client = create_client(supabase_url, supabase_key)
            
            # For async operations, we'll use the sync client with async wrappers
            # as the async Supabase client has limited support
            self.async_supabase_client = self.supabase_client
            
            self.logger.info("✅ Supabase clients initialized")
            
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize Supabase clients: {e}")
            raise
    
    async def process_raw_logs_async(
        self, 
        max_records: Optional[int] = None,
        filter_status: str = 'raw'
    ) -> ExtractionStats:
        """Process raw logs asynchronously with concurrent extraction"""
        
        self.logger.info("🚀 Starting async AI extraction from raw logs")
        self.logger.info(f"📋 Config: {self.config.concurrent_limit} workers, {self.config.model.value}")
        
        self.stats.start_time = time.time()
        
        try:
            # Ensure clients are initialized
            if not self.async_openai_client:
                await self.initialize()
            
            # Fetch unprocessed raw logs
            raw_logs = await self._fetch_unprocessed_logs_async(max_records, filter_status)
            
            if not raw_logs:
                self.logger.info("✅ No unprocessed logs found")
                return self._finalize_stats()
            
            self.logger.info(f"📄 Found {len(raw_logs)} unprocessed logs")
            self.stats.total_processed = len(raw_logs)
            
            # Process logs concurrently with progress tracking
            tasks = []
            for i, log_record in enumerate(raw_logs):
                task = self._process_single_log_with_retry(log_record, i + 1)
                tasks.append(task)
            
            # Execute tasks with progress updates
            completed = 0
            for coro in asyncio.as_completed(tasks):
                try:
                    result = await coro
                    completed += 1
                    
                    if completed % 10 == 0 or completed == len(tasks):
                        progress = (completed / len(tasks)) * 100
                        self.logger.info(f"📊 Progress: {completed}/{len(tasks)} ({progress:.1f}%)")
                        
                except Exception as e:
                    self.logger.error(f"❌ Task execution error: {e}")
                    self.stats.failed_extractions += 1
            
            return self._finalize_stats()
            
        except Exception as e:
            self.logger.error(f"❌ Critical error in async processing: {e}")
            self.logger.error(traceback.format_exc())
            return self._finalize_stats()
    
    async def _process_single_log_with_retry(
        self, 
        log_record: Dict[str, Any], 
        record_number: int
    ) -> bool:
        """Process a single log with comprehensive retry logic and quality assessment"""
        
        async with self.semaphore:  # Limit concurrent processing
            log_id = log_record['id']
            url = log_record.get('source_url', '')
            
            self.logger.info(f"🔄 Processing record {record_number}: {url}")
            
            for attempt in range(self.config.max_retries + 1):
                try:
                    # Update status to processing
                    await self._update_log_status_async(log_id, ExtractionStatus.PROCESSING.value)
                    
                    # Process the log
                    success, quality_score = await self._process_single_log_async(
                        log_record, attempt + 1, record_number
                    )
                    
                    if success:
                        self.stats.successful_extractions += 1
                        if quality_score is not None:
                            self.stats.quality_scores.append(quality_score)
                        return True
                    
                    # Check if we should retry based on quality
                    if (attempt < self.config.max_retries and 
                        self.config.retry_on_quality_failure):
                        
                        self.stats.quality_retries += 1
                        await self._update_log_status_async(log_id, ExtractionStatus.QUALITY_RETRY.value)
                        
                        # Exponential backoff with jitter
                        delay = (2 ** attempt) * self.config.delay_between_requests
                        jitter = delay * 0.1 * (time.time() % 1)  # Add randomness
                        await asyncio.sleep(delay + jitter)
                        
                        self.logger.warning(f"🔄 Quality retry for {url} (attempt {attempt + 2})")
                        continue
                    
                    break
                    
                except Exception as e:
                    self.logger.error(f"❌ Error processing log {log_id}: {e}")
                    
                    if attempt < self.config.max_retries:
                        delay = (2 ** attempt) * self.config.delay_between_requests
                        await asyncio.sleep(delay)
                        continue
                    
                    self._add_error(log_id, url, str(e), traceback.format_exc())
                    await self._update_log_status_async(log_id, ExtractionStatus.FAILED.value)
                    break
            
            self.stats.failed_extractions += 1
            return False
    
    async def _process_single_log_async(
        self, 
        log_record: Dict[str, Any], 
        attempt: int,
        record_number: int
    ) -> Tuple[bool, Optional[float]]:
        """Process a single raw log record asynchronously"""
        
        log_id = log_record['id']
        url = log_record.get('source_url', '')
        raw_text = log_record.get('raw_text', '')
        raw_markdown = log_record.get('raw_markdown', '')
        
        if not raw_text and not raw_markdown:
            self.logger.warning(f"⚠️ No raw content found for {url}")
            return False, None
        
        # Choose best content source
        content = raw_markdown or raw_text
        is_markdown = bool(raw_markdown)
        
        if is_markdown:
            self.logger.debug("📝 Using markdown content for enhanced extraction")
        
        # Extract structured data using GPT-4
        extracted_data = await self._extract_with_gpt4_async(content, url, is_markdown, attempt)
        
        if not extracted_data:
            return False, None
        
        # Quality assessment
        quality_score = None
        if self.config.enable_quality_assessment:
            quality = await self._assess_extraction_quality_async(extracted_data, content)
            extracted_data['extraction_quality'] = asdict(quality)
            quality_score = quality.overall_score
            
            if quality.needs_retry and self.config.retry_on_quality_failure and attempt == 1:
                self.logger.warning(f"⚠️ Low quality extraction for {url}: {quality.overall_score:.1f}%")
                if quality.critical_missing:
                    self.logger.warning(f"Critical missing: {', '.join(quality.critical_missing[:3])}")
                return False, quality_score
        
        # Save extracted data
        if self.config.output_format in ["database", "both"]:
            await self._save_structured_data_async(extracted_data, log_id)
        
        if self.config.output_format in ["file", "both"]:
            await self._save_to_file_async(extracted_data, log_id)
        
        await self._update_log_status_async(log_id, ExtractionStatus.COMPLETED.value)
        
        title = extracted_data.get('title', 'Unknown')[:50]
        self.logger.info(f"✅ Record {record_number} extracted: {title}")
        
        return True, quality_score
    
    async def _extract_with_gpt4_async(
        self, 
        raw_content: str, 
        url: str, 
        is_markdown: bool = False,
        attempt: int = 1
    ) -> Optional[Dict[str, Any]]:
        """Extract structured data using GPT-4 with enhanced error handling"""
        
        # Prepare extraction prompt
        system_prompt = await self._get_extraction_prompt_async()
        content_label = "Content (markdown):" if is_markdown else "Content:"
        
        # Smart content limiting
        content_limited, was_truncated = self._limit_content_smart(raw_content)
        
        if was_truncated:
            self.logger.debug(f"📏 Content truncated: {len(raw_content)} → {len(content_limited)} chars")
        
        # Adjust prompt based on attempt number
        extraction_note = ""
        if attempt > 1:
            extraction_note = f"\nNOTE: This is extraction attempt #{attempt}. Focus on completeness and accuracy."
        
        user_prompt = f"""
Extract subsidy information from this French agricultural funding page:

URL: {url}
{extraction_note}

{content_label}
{content_limited}

Please extract all available information and return as valid JSON. Preserve markdown formatting when applicable.
"""
        
        try:
            # Track model usage
            model_name = self.config.model.value
            self.stats.model_usage[model_name] = self.stats.model_usage.get(model_name, 0) + 1
            
            response = await self.async_openai_client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=self.config.temperature,
                max_tokens=self.config.max_tokens
            )
            
            # Track token usage and cost
            self.stats.tokens_used += response.usage.total_tokens
            self.stats.estimated_cost += self._estimate_cost(response.usage.total_tokens, self.config.model)
            
            # Parse JSON response
            content = response.choices[0].message.content.strip()
            extracted_data = self._parse_json_response(content, url)
            
            if not extracted_data:
                return None
            
            # Add comprehensive metadata
            extracted_data.update({
                'url': url,
                'extraction_timestamp': datetime.now().isoformat(),
                'extraction_session_id': self._session_id,
                'model_used': model_name,
                'extraction_attempt': attempt,
                'content_was_markdown': is_markdown,
                'content_was_truncated': was_truncated,
                'original_content_length': len(raw_content),
                'processed_content_length': len(content_limited)
            })
            
            # Validate and enhance data
            extracted_data = self._validate_and_enhance_data(extracted_data, is_markdown)
            
            # Save debug output if enabled
            if self.config.save_debug_output:
                await self._save_debug_output(extracted_data, content, url, attempt)
            
            return extracted_data
            
        except Exception as e:
            self.logger.error(f"❌ GPT-4 extraction error for {url}: {e}")
            return None
    
    def _limit_content_smart(self, content: str) -> Tuple[str, bool]:
        """Smart content limiting that preserves important sections"""
        
        if len(content) <= self.config.content_length_limit:
            return content, False
        
        # Try to preserve important sections (headers, lists, structured content)
        lines = content.split('\n')
        limited_lines = []
        current_length = 0
        
        # Priority: lines with headers, bullets, or structured content
        priority_patterns = [
            r'^#+\s',      # Headers
            r'^\s*[-*•]\s', # Bullet points
            r'^\s*\d+\.\s', # Numbered lists
            r'(?i)(deadline|amount|eligibility|contact)', # Important keywords
        ]
        
        # First pass: include high-priority lines
        for line in lines:
            line_length = len(line) + 1  # +1 for newline
            
            if current_length + line_length > self.config.content_length_limit:
                break
            
            is_priority = any(re.search(pattern, line) for pattern in priority_patterns)
            
            if is_priority or current_length < self.config.content_length_limit * 0.7:
                limited_lines.append(line)
                current_length += line_length
            elif current_length < self.config.content_length_limit * 0.9:
                # Include regular lines if we still have room
                limited_lines.append(line)
                current_length += line_length
        
        return '\n'.join(limited_lines), True
    
    def _parse_json_response(self, content: str, url: str) -> Optional[Dict[str, Any]]:
        """Enhanced JSON parsing with better error handling"""
        
        try:
            # Handle various markdown code block formats
            json_patterns = [
                (r'```json\s*(.*?)\s*```', 1),  # ```json ... ```
                (r'```\s*(.*?)\s*```', 1),      # ``` ... ```
                (r'`(.*?)`', 1),                # `...` (inline)
            ]
            
            original_content = content
            
            for pattern, group in json_patterns:
                match = re.search(pattern, content, re.DOTALL)
                if match:
                    content = match.group(group).strip()
                    break
            
            # Additional cleaning
            content = content.strip()
            if content.startswith('json'):
                content = content[4:].strip()
            
            return json.loads(content)
            
        except json.JSONDecodeError as e:
            self.logger.error(f"❌ JSON decode error for {url}: {e}")
            self.logger.error(f"Original response length: {len(original_content)}")
            self.logger.error(f"Cleaned content preview: {content[:200]}...")
            
            # Try to fix common JSON issues
            fixed_content = self._attempt_json_fix(content)
            if fixed_content:
                try:
                    return json.loads(fixed_content)
                except json.JSONDecodeError:
                    pass
            
            return None
    
    def _attempt_json_fix(self, content: str) -> Optional[str]:
        """Attempt to fix common JSON formatting issues"""
        
        # Remove trailing commas
        content = re.sub(r',(\s*[}\]])', r'\1', content)
        
        # Fix unescaped quotes in strings
        content = re.sub(r'(?<!\\)"(?=[^",}\]\s]*[",}\]])', r'\\"', content)
        
        # Ensure proper closing brackets
        open_brackets = content.count('{') - content.count('}')
        if open_brackets > 0:
            content += '}' * open_brackets
        
        return content
    
    def _estimate_cost(self, tokens: int, model: ModelType) -> float:
        """Estimate API cost based on current pricing"""
        
        # Updated pricing (approximate, as of 2025)
        pricing = {
            ModelType.GPT4_TURBO: 0.01,   # $0.01 per 1K tokens
            ModelType.GPT4: 0.03,         # $0.03 per 1K tokens
            ModelType.GPT4_OMNI: 0.005,   # $0.005 per 1K tokens
            ModelType.GPT35_TURBO: 0.001  # $0.001 per 1K tokens
        }
        
        rate = pricing.get(model, 0.01)
        return (tokens / 1000) * rate
    
    async def _get_extraction_prompt_async(self) -> str:
        """Get the extraction system prompt with async file reading and caching"""
        
        if self._extraction_prompt_cache is not None:
            return self._extraction_prompt_cache
        
        # Try to read canonical extraction prompt
        prompt_file = Path(__file__).parent.parent / "AgriTool-Raw-Log-Interpreter" / "extraction_prompt.md"
        
        try:
            if prompt_file.exists():
                if HAS_AIOFILES:
                    async with aiofiles.open(prompt_file, 'r', encoding='utf-8') as f:
                        canonical_prompt = await f.read()
                else:
                    with open(prompt_file, 'r', encoding='utf-8') as f:
                        canonical_prompt = f.read()
                        
                self._extraction_prompt_cache = canonical_prompt
                self.logger.info("📋 Using canonical extraction prompt")
                return canonical_prompt
        except Exception as e:
            self.logger.warning(f"Could not read canonical prompt: {e}")
        
        # Enhanced fallback prompt
        fallback_prompt = """You are an expert at extracting comprehensive structured information from French agricultural subsidy and funding pages.

CRITICAL INSTRUCTIONS:
1. NEVER SIMPLIFY OR FLATTEN COMPLEX INFORMATION - Extract ALL details completely
2. If source uses markdown formatting (headings, lists), preserve this structure in output fields
3. Handle French number formatting (spaces as thousands separators, commas as decimals)
4. Convert dates to ISO format (YYYY-MM-DD) when possible
5. Extract ALL funding rates, bonuses, and conditional amounts with complete details
6. Include ALL legal references, EU regulations, and regulatory frameworks
7. Extract ALL document requirements (mandatory and optional) with descriptions
8. Capture ALL deadlines, application windows, and timing information
9. Extract ALL eligibility criteria including exclusions and special conditions
10. Return ONLY valid JSON, no explanations or commentary

REQUIRED JSON STRUCTURE:
{
  "title": "Exact title of the subsidy program",
  "description": "Complete detailed description - preserve all details",
  "description_markdown": "Description with preserved markdown formatting",
  "eligibility": "Complete eligibility criteria with all conditions",
  "eligibility_markdown": "Eligibility with preserved markdown formatting",
  "amount": [min_amount, max_amount],
  "co_financing_rate": base_percentage_as_number,
  "co_financing_bonuses": [
    {"condition": "Condition description", "bonus": bonus_percentage, "details": "Complete details"}
  ],
  "funding_calculation": "Complete funding calculation rules and limits",
  "funding_calculation_markdown": "Funding calculation with markdown",
  "regulatory_framework": "All EU regulations, laws, and legal references",
  "deadline": "YYYY-MM-DD",
  "application_window": "Complete application timing and deadlines",
  "region": ["Region1", "Region2"],
  "sector": ["Agriculture", "Livestock", "Forestry", "etc"],
  "funding_type": "Type of funding (grant, loan, subsidy, etc)",
  "agency": "Funding agency name",
  "application_method": "Complete application process description",
  "application_method_markdown": "Application method with markdown",
  "documents": [
    {"name": "Document name", "mandatory": true/false, "description": "Complete description"}
  ],
  "evaluation_criteria": ["Criterion 1", "Criterion 2"],
  "selection_process": "Detailed evaluation and selection process",
  "application_requirements": ["All specific requirements"],
  "legal_entity_type": ["All eligible entity types with any conditions"],
  "special_conditions": ["All conditional eligibility scenarios"],
  "legal_exclusions": ["All exclusion criteria and disqualifications"],
  "contact_information": "Complete contact details",
  "contact_information_markdown": "Contact with markdown formatting",
  "language": "fr",
  "project_duration": "Duration if specified",
  "requirements_extraction_status": "extracted"
}

QUALITY REQUIREMENTS:
- Extract at least 80% of available information
- Ensure critical fields (title, description, eligibility, amount, deadline) are complete
- Preserve all numerical values and percentages exactly
- Include all conditional logic and special cases
- Maintain original French terminology and phrasing"""
        
        self._extraction_prompt_cache = fallback_prompt
        self.logger.info("📋 Using enhanced fallback extraction prompt")
        return fallback_prompt
    
    def _validate_and_enhance_data(self, data: Dict[str, Any], is_markdown: bool) -> Dict[str, Any]:
        """Comprehensive validation and enhancement of extracted data"""
        
        # Ensure required array fields
        array_fields = [
            'amount', 'region', 'sector', 'documents', 'application_requirements',
            'legal_entity_type', 'evaluation_criteria', 'special_conditions',
            'legal_exclusions', 'co_financing_bonuses'
        ]
        
        for field in array_fields:
            if field in data:
                if not isinstance(data[field], list):
                    data[field] = [data[field]] if data[field] is not None else []
                # Remove None values from arrays
                data[field] = [item for item in data[field] if item is not None]
        
        # Enhanced amount validation with French number parsing
        if 'amount' in data and data['amount']:
            data['amount'] = self._parse_french_amounts(data['amount'])
        
        # Clean and validate text fields
        text_fields = ['title', 'description', 'eligibility', 'funding_calculation', 'agency']
        for field in text_fields:
            if field in data and data[field]:
                cleaned = str(data[field]).strip()
                # Remove excessive whitespace
                cleaned = re.sub(r'\s+', ' ', cleaned)
                data[field] = cleaned
        
        # Ensure text variants (markdown and plain text)
        self._ensure_text_variants(data, is_markdown)
        
        # Date normalization and validation
        if 'deadline' in data and data['deadline']:
            data['deadline'] = self._normalize_date(data['deadline'])
        
        # Validate and normalize percentages
        if 'co_financing_rate' in data and data['co_financing_rate']:
            data['co_financing_rate'] = self._normalize_percentage(data['co_financing_rate'])
        
        # Process co-financing bonuses
        if 'co_financing_bonuses' in data and data['co_financing_bonuses']:
            for bonus in data['co_financing_bonuses']:
                if isinstance(bonus, dict) and 'bonus' in bonus:
                    bonus['bonus'] = self._normalize_percentage(bonus['bonus'])
        
        # Set defaults
        data.setdefault('language', 'fr')
        data.setdefault('requirements_extraction_status', 'extracted')
        
        return data
    
    def _parse_french_amounts(self, amounts: Union[List, Any]) -> Optional[List[float]]:
        """Parse French-formatted numbers with enhanced detection"""
        
        if not amounts:
            return None
        
        if not isinstance(amounts, list):
            amounts = [amounts]
        
        parsed_amounts = []
        
        for amount in amounts:
            if amount is None:
                continue
                
            try:
                if isinstance(amount, (int, float)):
                    parsed_amounts.append(float(amount))
                    continue
                
                # Handle string amounts with French formatting
                amount_str = str(amount).strip()
                
                # Remove currency symbols and extra text
                amount_str = re.sub(r'[€$£]', '', amount_str)
                amount_str = re.sub(r'(?i)(euros?|dollars?|maximum|minimum|jusqu.?à|entre)', '', amount_str)
                amount_str = amount_str.strip()
                
                # Handle French number formatting
                # Pattern: "1 234 567,89" or "1234567,89" or "1,234,567.89"
                if ',' in amount_str:
                    # Check if comma is likely decimal separator (2 digits after)
                    comma_parts = amount_str.split(',')
                    if len(comma_parts) == 2 and len(comma_parts[1].strip()) <= 2:
                        # Comma is decimal separator
                        amount_str = amount_str.replace(' ', '').replace(',', '.')
                    else:
                        # Comma might be thousands separator
                        amount_str = amount_str.replace(',', '').replace(' ', '')
                else:
                    # No comma, just remove spaces
                    amount_str = amount_str.replace(' ', '')
                
                # Extract numeric value using regex
                numeric_match = re.search(r'(\d+(?:\.\d+)?)', amount_str)
                if numeric_match:
                    parsed_amounts.append(float(numeric_match.group(1)))
                    
            except (ValueError, TypeError, AttributeError) as e:
                self.logger.warning(f"Could not parse amount '{amount}': {e}")
                continue
        
        return parsed_amounts if parsed_amounts else None
    
    def _normalize_percentage(self, percentage: Union[str, int, float]) -> Optional[float]:
        """Normalize percentage values to decimal format"""
        
        if percentage is None:
            return None
        
        try:
            if isinstance(percentage, (int, float)):
                # Assume values > 1 are already percentages, values <= 1 are decimals
                return float(percentage) if percentage <= 1 else float(percentage) / 100
            
            # Handle string percentages
            perc_str = str(percentage).strip()
            perc_str = re.sub(r'[%\s]', '', perc_str)  # Remove % and spaces
            perc_str = perc_str.replace(',', '.')  # Handle French decimal separator
            
            value = float(perc_str)
            return value if value <= 1 else value / 100
            
        except (ValueError, TypeError):
            self.logger.warning(f"Could not normalize percentage: {percentage}")
            return None
    
    def _normalize_date(self, date_str: str) -> Optional[str]:
        """Enhanced date normalization with French date patterns"""
        
        if not date_str or not isinstance(date_str, str):
            return None
        
        date_str = date_str.strip()
        
        # French month names mapping
        french_months = {
            'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04',
            'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08',
            'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12'
        }
        
        # Date patterns (more comprehensive)
        patterns = [
            (r'(\d{4})-(\d{1,2})-(\d{1,2})', lambda m: f"{m.group(1)}-{m.group(2).zfill(2)}-{m.group(3).zfill(2)}"),  # ISO format
            (r'(\d{1,2})/(\d{1,2})/(\d{4})', lambda m: f"{m.group(3)}-{m.group(2).zfill(2)}-{m.group(1).zfill(2)}"),  # DD/MM/YYYY
            (r'(\d{1,2})-(\d{1,2})-(\d{4})', lambda m: f"{m.group(3)}-{m.group(2).zfill(2)}-{m.group(1).zfill(2)}"),  # DD-MM-YYYY
        ]
        
        # Try standard patterns first
        for pattern, formatter in patterns:
            match = re.search(pattern, date_str)
            if match:
                try:
                    return formatter(match)
                except (ValueError, IndexError):
                    continue
        
        # Try French month names
        for french_month, month_num in french_months.items():
            pattern = rf'(\d{{1,2}})\s+{french_month}\s+(\d{{4}})'
            match = re.search(pattern, date_str.lower())
            if match:
                day, year = match.groups()
                return f"{year}-{month_num}-{day.zfill(2)}"
        
        return date_str  # Return original if no pattern matches
    
    def _ensure_text_variants(self, data: Dict[str, Any], is_markdown: bool) -> None:
        """Ensure both plain text and markdown variants for key fields"""
        
        variant_fields = [
            'description', 'eligibility', 'application_method',
            'contact_information', 'funding_calculation'
        ]
        
        for field in variant_fields:
            plain_key = field
            markdown_key = f"{field}_markdown"
            
            plain_val = data.get(plain_key)
            markdown_val = data.get(markdown_key)
            
            if markdown_val and not plain_val:
                # Generate plain text from markdown
                data[plain_key] = self._strip_markdown(markdown_val)
            elif plain_val and not markdown_val and is_markdown:
                # Use plain text as markdown if source was markdown
                data[markdown_key] = plain_val
    
    def _strip_markdown(self, text: str) -> str:
        """Enhanced markdown stripper for clean plain text"""
        
        if not text:
            return ""
        
        # Remove links but keep link text
        text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
        
        # Remove emphasis markers
        text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)  # Bold
        text = re.sub(r'\*([^*]+)\*', r'\1', text)      # Italic
        text = re.sub(r'__([^_]+)__', r'\1', text)      # Bold underscore
        text = re.sub(r'_([^_]+)_', r'\1', text)        # Italic underscore
        
        # Remove headers but keep text
        text = re.sub(r'^#+\s*(.*)', r'\1', text, flags=re.MULTILINE)
        
        # Remove code blocks and inline code
        text = re.sub(r'```[^`]*```', '', text, flags=re.DOTALL)
        text = re.sub(r'`([^`]+)`', r'\1', text)
        
        # Remove blockquotes but keep content
        text = re.sub(r'^>\s*(.*)', r'\1', text, flags=re.MULTILINE)
        
        # Convert list markers to simple dashes
        text = re.sub(r'^\s*[-*+]\s*', '- ', text, flags=re.MULTILINE)
        text = re.sub(r'^\s*\d+\.\s*', '- ', text, flags=re.MULTILINE)
        
        # Clean up excessive whitespace
        text = re.sub(r'\n\s*\n\s*\n', '\n\n', text)  # Max 2 consecutive newlines
        text = re.sub(r'[ \t]+', ' ', text)            # Multiple spaces to single
        text = text.strip()
        
        return text
    
    async def _assess_extraction_quality_async(
        self, 
        extracted_data: Dict[str, Any], 
        source_text: str
    ) -> ExtractionQuality:
        """Comprehensive quality assessment with multiple metrics"""
        
        try:
            # Try to use external quality validator
            sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'AgriTool-Raw-Log-Interpreter'))
            from quality_validator import SubsidyQualityValidator
            
            validator = SubsidyQualityValidator()
            quality_result = validator.validate_extraction(extracted_data, source_text)
            
            return ExtractionQuality(
                coverage_score=quality_result.coverage_score,
                completeness_score=getattr(quality_result, 'completeness_score', 0.0),
                validation_score=getattr(quality_result, 'validation_score', 0.0),
                overall_score=quality_result.coverage_score,
                critical_missing=quality_result.critical_missing or [],
                warnings=getattr(quality_result, 'warnings', []),
                field_scores=getattr(quality_result, 'field_scores', {})
            )
            
        except ImportError:
            self.logger.debug("External quality validator not available, using built-in assessment")
            return await self._builtin_quality_assessment(extracted_data, source_text)
        except Exception as e:
            self.logger.error(f"Quality assessment failed: {e}")
            return await self._builtin_quality_assessment(extracted_data, source_text)
    
    async def _builtin_quality_assessment(
        self, 
        extracted_data: Dict[str, Any], 
        source_text: str
    ) -> ExtractionQuality:
        """Built-in quality assessment when external validator unavailable"""
        
        # Define field categories and weights
        critical_fields = ['title', 'description', 'eligibility', 'amount', 'deadline']
        important_fields = ['agency', 'region', 'sector', 'application_method', 'funding_type']
        optional_fields = ['documents', 'contact_information', 'regulatory_framework']
        
        # Calculate field presence scores
        critical_present = sum(1 for field in critical_fields if extracted_data.get(field))
        important_present = sum(1 for field in important_fields if extracted_data.get(field))
        optional_present = sum(1 for field in optional_fields if extracted_data.get(field))
        
        # Calculate weighted scores
        critical_score = (critical_present / len(critical_fields)) * 100
        important_score = (important_present / len(important_fields)) * 100
        optional_score = (optional_present / len(optional_fields)) * 100
        
        # Overall scoring with weights
        coverage_score = (critical_score * 0.6 + important_score * 0.3 + optional_score * 0.1)
        
        # Content quality assessment
        completeness_score = self._assess_content_completeness(extracted_data, source_text)
        validation_score = self._assess_data_validity(extracted_data)
        
        # Combined overall score
        overall_score = (coverage_score * 0.5 + completeness_score * 0.3 + validation_score * 0.2)
        
        # Identify missing critical fields
        critical_missing = [field for field in critical_fields if not extracted_data.get(field)]
        
        # Generate warnings
        warnings = []
        if critical_score < 80:
            warnings.append(f"Missing {len(critical_missing)} critical fields")
        if important_score < 60:
            missing_important = [f for f in important_fields if not extracted_data.get(f)]
            warnings.append(f"Missing important fields: {', '.join(missing_important[:3])}")
        
        # Field-level scores
        field_scores = {}
        for field in critical_fields + important_fields:
            field_scores[field] = 100.0 if extracted_data.get(field) else 0.0
        
        return ExtractionQuality(
            coverage_score=coverage_score,
            completeness_score=completeness_score,
            validation_score=validation_score,
            overall_score=overall_score,
            critical_missing=critical_missing,
            warnings=warnings,
            field_scores=field_scores
        )
    
    def _assess_content_completeness(self, extracted_data: Dict[str, Any], source_text: str) -> float:
        """Assess how complete the extracted content is compared to source"""
        
        # Check for key indicators in source that should be extracted
        indicators = [
            (r'(?i)(deadline|échéance)', 'deadline'),
            (r'(?i)(amount|montant|€)', 'amount'),
            (r'(?i)(eligib|admissib)', 'eligibility'),
            (r'(?i)(contact|téléphone|email)', 'contact_information'),
            (r'(?i)(document|pièce|dossier)', 'documents'),
        ]
        
        found_indicators = 0
        extracted_indicators = 0
        
        for pattern, field in indicators:
            if re.search(pattern, source_text):
                found_indicators += 1
                if extracted_data.get(field):
                    extracted_indicators += 1
        
        if found_indicators == 0:
            return 100.0  # No indicators found, assume complete
        
        return (extracted_indicators / found_indicators) * 100
    
    def _assess_data_validity(self, extracted_data: Dict[str, Any]) -> float:
        """Assess the validity and consistency of extracted data"""
        
        validity_score = 100.0
        
        # Check date format validity
        if extracted_data.get('deadline'):
            if not re.match(r'\d{4}-\d{2}-\d{2}', str(extracted_data['deadline'])):
                validity_score -= 10
        
        # Check amount validity
        if extracted_data.get('amount'):
            try:
                amounts = extracted_data['amount']
                if isinstance(amounts, list) and len(amounts) == 2:
                    if amounts[0] > amounts[1]:  # Min > Max
                        validity_score -= 15
            except (TypeError, IndexError):
                validity_score -= 10
        
        # Check percentage validity
        if extracted_data.get('co_financing_rate'):
            rate = extracted_data['co_financing_rate']
            if isinstance(rate, (int, float)) and (rate < 0 or rate > 100):
                validity_score -= 10
        
        # Check required field consistency
        if extracted_data.get('title') and len(str(extracted_data['title'])) < 5:
            validity_score -= 10
        
        return max(validity_score, 0.0)
    
    async def _fetch_unprocessed_logs_async(
        self, 
        max_records: Optional[int] = None,
        filter_status: str = 'raw'
    ) -> List[Dict[str, Any]]:
        """Fetch unprocessed raw logs with enhanced filtering"""
        
        try:
            query = self.supabase_client.table('raw_scraped_pages').select('*')
            
            # Apply status filter
            if filter_status:
                query = query.eq('status', filter_status)
            
            # Apply record limit
            if max_records:
                query = query.limit(max_records)
            
            # Order by creation date for consistent processing
            query = query.order('created_at', desc=False)
            
            response = query.execute()
            
            self.logger.info(f"📄 Fetched {len(response.data)} raw logs with status '{filter_status}'")
            return response.data
            
        except Exception as e:
            self.logger.error(f"❌ Failed to fetch raw logs: {e}")
            return []
    
    async def _save_structured_data_async(self, data: Dict[str, Any], raw_log_id: str) -> None:
        """Save structured data to database with enhanced error handling"""
        
        # Prepare comprehensive record for database
        record = {
            'raw_log_id': raw_log_id,
            'url': data.get('url'),
            'title': data.get('title'),
            'description': data.get('description'),
            'description_markdown': data.get('description_markdown'),
            'eligibility': data.get('eligibility'),
            'eligibility_markdown': data.get('eligibility_markdown'),
            'amount': data.get('amount'),
            'deadline': data.get('deadline'),
            'region': data.get('region', []),
            'sector': data.get('sector', []),
            'funding_type': data.get('funding_type'),
            'agency': data.get('agency'),
            'application_method': data.get('application_method'),
            'application_method_markdown': data.get('application_method_markdown'),
            'funding_calculation_markdown': data.get('funding_calculation_markdown'),
            'contact_information_markdown': data.get('contact_information_markdown'),
            'documents': json.dumps(data.get('documents', [])),
            'application_requirements': json.dumps(data.get('application_requirements', [])),
            'legal_entity_type': data.get('legal_entity_type', []),
            'language': data.get('language', 'fr'),
            'project_duration': data.get('project_duration'),
            'co_financing_rate': data.get('co_financing_rate'),
            'co_financing_bonuses': json.dumps(data.get('co_financing_bonuses', [])),
            'regulatory_framework': data.get('regulatory_framework'),
            'evaluation_criteria': json.dumps(data.get('evaluation_criteria', [])),
            'special_conditions': json.dumps(data.get('special_conditions', [])),
            'legal_exclusions': json.dumps(data.get('legal_exclusions', [])),
            'requirements_extraction_status': 'extracted',
            'extraction_timestamp': data.get('extraction_timestamp'),
            'extraction_session_id': data.get('extraction_session_id'),
            'model_used': data.get('model_used'),
            'extraction_quality_score': data.get('extraction_quality', {}).get('overall_score')
        }
        
        try:
            response = self.supabase_client.table('subsidies_structured').insert([record]).execute()
            
            if response.data:
                title = data.get('title', 'Unknown')[:30]
                self.logger.debug(f"💾 Saved to database: {title}")
            else:
                raise Exception("No data returned from database insert")
                
        except Exception as e:
            self.logger.error(f"❌ Failed to save structured data: {e}")
            # Don't re-raise, as we want to continue processing other records
    
    async def _save_to_file_async(self, data: Dict[str, Any], raw_log_id: str) -> None:
        """Save extracted data to JSON file for debugging/backup"""
        
        try:
            output_dir = Path("extracted_data")
            output_dir.mkdir(exist_ok=True)
            
            filename = f"{self._session_id}_{raw_log_id}.json"
            filepath = output_dir / filename
            
            if HAS_AIOFILES:
                async with aiofiles.open(filepath, 'w', encoding='utf-8') as f:
                    await f.write(json.dumps(data, indent=2, ensure_ascii=False))
            else:
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
            
            self.logger.debug(f"💾 Saved to file: {filepath}")
            
        except Exception as e:
            self.logger.error(f"❌ Failed to save to file: {e}")
    
    async def _save_debug_output(
        self, 
        extracted_data: Dict[str, Any], 
        raw_response: str, 
        url: str, 
        attempt: int
    ) -> None:
        """Save debug information for troubleshooting"""
        
        try:
            debug_dir = Path("debug_output")
            debug_dir.mkdir(exist_ok=True)
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"debug_{timestamp}_{attempt}.json"
            
            debug_data = {
                'url': url,
                'attempt': attempt,
                'timestamp': timestamp,
                'raw_gpt_response': raw_response,
                'extracted_data': extracted_data,
                'extraction_quality': extracted_data.get('extraction_quality')
            }
            
            filepath = debug_dir / filename
            
            if HAS_AIOFILES:
                async with aiofiles.open(filepath, 'w', encoding='utf-8') as f:
                    await f.write(json.dumps(debug_data, indent=2, ensure_ascii=False))
            else:
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(debug_data, f, indent=2, ensure_ascii=False)
                    
        except Exception as e:
            self.logger.error(f"❌ Failed to save debug output: {e}")
    
    async def _update_log_status_async(self, log_id: str, status: str) -> None:
        """Update log status with enhanced error handling"""
        
        try:
            response = self.supabase_client.table('raw_scraped_pages').update({
                'status': status,
                'updated_at': datetime.now().isoformat(),
                'processing_session_id': self._session_id
            }).eq('id', log_id).execute()
            
            if not response.data:
                self.logger.warning(f"⚠️ No response data when updating log {log_id}")
                
        except Exception as e:
            self.logger.error(f"❌ Error updating log status for {log_id}: {e}")
    
    def _add_error(self, log_id: str, url: str, error: str, traceback_str: str = "") -> None:
        """Add error to statistics with enhanced details"""
        
        error_record = {
            'log_id': log_id,
            'url': url,
            'error': error,
            'timestamp': datetime.now().isoformat(),
            'session_id': self._session_id
        }
        
        if traceback_str:
            error_record['traceback'] = traceback_str
        
        self.stats.errors.append(error_record)
    
    def _finalize_stats(self) -> ExtractionStats:
        """Finalize and log comprehensive extraction statistics"""
        
        self.stats.end_time = time.time()
        
        # Log comprehensive summary
        self.logger.info("🏁 AI extraction completed")
        self.logger.info(f"📊 Final Statistics:")
        self.logger.info(f"   ├─ Total processed: {self.stats.total_processed}")
        self.logger.info(f"   ├─ Successful: {self.stats.successful_extractions}")
        self.logger.info(f"   ├─ Failed: {self.stats.failed_extractions}")
        self.logger.info(f"   ├─ Quality retries: {self.stats.quality_retries}")
        self.logger.info(f"   ├─ Success rate: {self.stats.success_rate:.1f}%")
        self.logger.info(f"   ├─ Average quality: {self.stats.average_quality:.1f}%")
        self.logger.info(f"   ├─ Processing rate: {self.stats.processing_rate:.2f} records/sec")
        self.logger.info(f"   ├─ Duration: {self.stats.duration:.1f} seconds")
        self.logger.info(f"   ├─ Tokens used: {self.stats.tokens_used:,}")
        self.logger.info(f"   └─ Estimated cost: ${self.stats.estimated_cost:.4f}")
        
        if self.stats.model_usage:
            self.logger.info(f"🤖 Model usage: {dict(self.stats.model_usage)}")
        
        if self.stats.errors:
            self.logger.warning(f"⚠️ Errors encountered: {len(self.stats.errors)}")
            for error in self.stats.errors[:3]:  # Show first 3 errors
                self.logger.warning(f"   - {error['url']}: {error['error'][:100]}")
        
        # Log to pipeline stats if available
        if HAS_LOGGING_SETUP:
            try:
                log_pipeline_stats("ai_extractor", asdict(self.stats))
            except Exception as e:
                self.logger.error(f"Failed to log pipeline stats: {e}")
        
        return self.stats
    
    # Synchronous wrapper methods for backward compatibility
    def process_raw_logs(self, batch_size: int = 10, max_records: int = None) -> Dict[str, Any]:
        """Synchronous wrapper for async processing"""
        
        # Update config with provided parameters
        self.config.batch_size = batch_size
        
        # Run async processing
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            stats = loop.run_until_complete(
                self.process_raw_logs_async(max_records=max_records)
            )
            return asdict(stats)
        finally:
            loop.close()
    
    async def process_single_content(
        self, 
        content: str, 
        url: str = "manual_input",
        is_markdown: bool = False
    ) -> Optional[Dict[str, Any]]:
        """Process single content for testing/debugging"""
        
        await self.initialize()
        
        self.logger.info(f"🔍 Processing single content: {url}")
        
        try:
            extracted_data = await self._extract_with_gpt4_async(content, url, is_markdown)
            
            if extracted_data and self.config.enable_quality_assessment:
                quality = await self._assess_extraction_quality_async(extracted_data, content)
                extracted_data['extraction_quality'] = asdict(quality)
                
                self.logger.info(f"📊 Quality score: {quality.overall_score:.1f}%")
            
            return extracted_data
            
        except Exception as e:
            self.logger.error(f"❌ Error processing single content: {e}")
            return None


async def main_async():
    """Async main function for CLI"""
    
    parser = argparse.ArgumentParser(description="Enhanced AI-powered subsidy data extraction")
    
    # Processing options
    parser.add_argument('--mode', choices=['database', 'file', 'single'], default='database',
                       help='Processing mode')
    parser.add_argument('--batch-size', type=int, default=5,
                       help='Batch size for concurrent processing')
    parser.add_argument('--max-records', type=int,
                       help='Maximum records to process')
    parser.add_argument('--max-workers', type=int, default=3,
                       help='Maximum concurrent workers')
    
    # Model and quality options
    parser.add_argument('--model', choices=[m.value for m in ModelType], 
                       default=ModelType.GPT4_TURBO.value,
                       help='OpenAI model to use')
    parser.add_argument('--max-retries', type=int, default=3,
                       help='Maximum retry attempts')
    parser.add_argument('--quality-threshold', type=float, default=70.0,
                       help='Minimum quality threshold')
    parser.add_argument('--no-quality-check', dest='enable_quality', action='store_false',
                       help='Disable quality assessment')
    parser.add_argument('--no-quality-retry', dest='retry_on_quality', action='store_false',
                       help='Disable retries on quality failures')
    
    # Input/Output options
    parser.add_argument('--content', type=str,
                       help='Single content to process (for testing)')
    parser.add_argument('--input-file', type=str,
                       help='Input file containing content to process')
    parser.add_argument('--output', choices=['database', 'file', 'both'], default='database',
                       help='Output destination')
    parser.add_argument('--output-file', type=str,
                       help='Output file path (for single content mode)')
    
    # Debug and verbose options
    parser.add_argument('--debug', action='store_true',
                       help='Save debug output')
    parser.add_argument('--verbose', action='store_true',
                       help='Enable verbose logging')
    parser.add_argument('--markdown', action='store_true',
                       help='Treat input content as markdown')
    
    args = parser.parse_args()
    
    # Configure logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Create configuration
    config = ExtractionConfig.from_args(args)
    config.concurrent_limit = args.max_workers
    
    # Initialize extractor
    extractor = AIExtractor(config)
    
    try:
        if args.mode == 'single':
            # Single content processing
            content = args.content
            
            if args.input_file:
                with open(args.input_file, 'r', encoding='utf-8') as f:
                    content = f.read()
            
            if not content:
                print("❌ No content provided. Use --content or --input-file")
                return 1
            
            result = await extractor.process_single_content(
                content, 
                args.input_file or "manual_input",
                args.markdown
            )
            
            if result:
                if args.output_file:
                    with open(args.output_file, 'w', encoding='utf-8') as f:
                        json.dump(result, f, indent=2, ensure_ascii=False)
                    print(f"✅ Result saved to: {args.output_file}")
                else:
                    print(json.dumps(result, indent=2, ensure_ascii=False))
                return 0
            else:
                print("❌ Extraction failed")
                return 1
        
        elif args.mode == 'file':
            # File-based processing (future enhancement)
            print("📁 File mode not yet implemented")
            return 1
        
        else:
            # Database processing (default)
            stats = await extractor.process_raw_logs_async(
                max_records=args.max_records,
                filter_status='raw'
            )
            
            # Exit with appropriate code based on success rate
            exit_code = 0 if stats.success_rate >= 80 else 1
            return exit_code
            
    except KeyboardInterrupt:
        print("\n🛑 Processing interrupted by user")
        return 1
    except Exception as e:
        print(f"❌ Critical error: {e}")
        logging.error(traceback.format_exc())
        return 1


def main():
    """Synchronous entry point for CLI"""
    try:
        # Run the async main function
        return asyncio.run(main_async())
    except KeyboardInterrupt:
        print("\n🛑 Interrupted")
        return 1
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        return 1


# Additional utility functions for enhanced functionality
class ExtractionMode(Enum):
    """Different modes of operation for the extractor"""
    DATABASE = "database"
    FILE_BATCH = "file_batch"
    SINGLE_CONTENT = "single"
    QUALITY_CHECK = "quality_check"


async def batch_process_files(
    extractor: AIExtractor, 
    input_dir: Path, 
    output_dir: Path
) -> ExtractionStats:
    """Process multiple files from directory"""
    
    input_dir = Path(input_dir)
    output_dir = Path(output_dir)
    output_dir.mkdir(exist_ok=True)
    
    # Find all text/markdown files
    file_patterns = ['*.txt', '*.md', '*.html']
    files = []
    for pattern in file_patterns:
        files.extend(input_dir.glob(pattern))
    
    extractor.logger.info(f"📁 Found {len(files)} files to process")
    
    # Process files concurrently
    tasks = []
    for file_path in files:
        task = process_single_file(extractor, file_path, output_dir)
        tasks.append(task)
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Aggregate statistics
    stats = ExtractionStats()
    stats.total_processed = len(files)
    
    for result in results:
        if isinstance(result, Exception):
            stats.failed_extractions += 1
        else:
            stats.successful_extractions += 1
    
    return stats


async def process_single_file(
    extractor: AIExtractor, 
    file_path: Path, 
    output_dir: Path
) -> bool:
    """Process a single file"""
    
    try:
        # Read file content
        if HAS_AIOFILES:
            async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
                content = await f.read()
        else:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        
        # Determine if content is markdown
        is_markdown = file_path.suffix.lower() in ['.md', '.markdown']
        
        # Extract data
        result = await extractor.process_single_content(
            content, 
            str(file_path), 
            is_markdown
        )
        
        if result:
            # Save result
            output_file = output_dir / f"{file_path.stem}_extracted.json"
            
            if HAS_AIOFILES:
                async with aiofiles.open(output_file, 'w', encoding='utf-8') as f:
                    await f.write(json.dumps(result, indent=2, ensure_ascii=False))
            else:
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(result, f, indent=2, ensure_ascii=False)
            
            return True
        
        return False
        
    except Exception as e:
        extractor.logger.error(f"❌ Error processing file {file_path}: {e}")
        return False


class ExtractionMonitor:
    """Monitor extraction progress and quality metrics"""
    
    def __init__(self, extractor: AIExtractor):
        self.extractor = extractor
        self.start_time = time.time()
    
    async def monitor_progress(self, check_interval: float = 30.0) -> None:
        """Monitor extraction progress periodically"""
        
        while True:
            await asyncio.sleep(check_interval)
            
            # Calculate current metrics
            current_time = time.time()
            elapsed = current_time - self.start_time
            
            stats = self.extractor.stats
            
            if stats.total_processed > 0:
                progress = ((stats.successful_extractions + stats.failed_extractions) / 
                           stats.total_processed) * 100
                
                rate = (stats.successful_extractions + stats.failed_extractions) / elapsed
                
                self.extractor.logger.info(f"📊 Progress Monitor:")
                self.extractor.logger.info(f"   ├─ Progress: {progress:.1f}%")
                self.extractor.logger.info(f"   ├─ Rate: {rate:.2f} records/sec")
                self.extractor.logger.info(f"   ├─ Success rate: {stats.success_rate:.1f}%")
                self.extractor.logger.info(f"   └─ Estimated cost: ${stats.estimated_cost:.4f}")


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)

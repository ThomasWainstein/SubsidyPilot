#!/usr/bin/env python3
"""
AgriTool AI Extractor - GPT-4 powered content extraction
Converts raw scraped data into structured subsidy information
"""

import os
import sys
import json
import time
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path
from logging_setup import setup_pipeline_logging, ensure_artifact_files, log_pipeline_stats

# OpenAI client
try:
    import openai
except ImportError:
    print("❌ ERROR: OpenAI library not installed")
    print("Install with: pip install openai")
    sys.exit(1)

# Supabase client for data operations
try:
    from supabase import create_client, Client
except ImportError:
    print("❌ ERROR: Supabase client not installed")
    print("Install with: pip install supabase")
    sys.exit(1)


class AIExtractor:
    """GPT-4 powered extraction engine for subsidy data"""
    
    def __init__(self):
        ensure_artifact_files()
        self.logger = setup_pipeline_logging("ai_extractor")
        self.openai_client = self._init_openai_client()
        self.supabase_client = self._init_supabase_client()
        
        # Extraction statistics
        self.stats = {
            'total_processed': 0,
            'successful_extractions': 0,
            'failed_extractions': 0,
            'start_time': None,
            'tokens_used': 0,
            'errors': []
        }
    
    def _setup_logging(self) -> logging.Logger:
        """Setup logging for extraction operations"""
        logger = logging.getLogger('ai_extractor')
        logger.setLevel(logging.INFO)
        
        if not logger.handlers:
            handler = logging.StreamHandler(sys.stdout)
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        
        return logger
    
    def _init_openai_client(self) -> openai.OpenAI:
        """Initialize OpenAI client"""
        api_key = os.getenv('SCRAPER_RAW_GPT_API') or os.getenv('OPENAI_API_KEY')
        
        if not api_key:
            self.logger.error("❌ Missing OpenAI API key")
            self.logger.error("Set SCRAPER_RAW_GPT_API or OPENAI_API_KEY environment variable")
            raise ValueError("Missing OpenAI API key")
        
        try:
            client = openai.OpenAI(api_key=api_key)
            self.logger.info("✅ OpenAI client initialized")
            return client
            
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize OpenAI client: {e}")
            raise
    
    def _init_supabase_client(self) -> Client:
        """Initialize Supabase client"""
        supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')
        
        if not supabase_url or not supabase_key:
            self.logger.error("❌ Missing Supabase credentials")
            raise ValueError("Missing Supabase credentials")
        
        try:
            client = create_client(supabase_url, supabase_key)
            self.logger.info("✅ Supabase client initialized")
            return client
            
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize Supabase client: {e}")
            raise
    
    def process_raw_logs(self, batch_size: int = 10, max_records: int = None) -> Dict[str, Any]:
        """Process raw logs from Supabase into structured data"""
        
        self.logger.info("🚀 Starting AI extraction from raw logs")
        self.stats['start_time'] = time.time()
        
        # Fetch unprocessed raw logs
        raw_logs = self._fetch_unprocessed_logs(max_records)
        
        if not raw_logs:
            self.logger.info("✅ No unprocessed logs found")
            return self._finalize_stats()
        
        self.logger.info(f"📄 Found {len(raw_logs)} unprocessed logs")
        
        # Process in batches
        for i in range(0, len(raw_logs), batch_size):
            batch = raw_logs[i:i + batch_size]
            self.logger.info(f"📦 Processing batch {i//batch_size + 1}: {len(batch)} records")
            
            for log_record in batch:
                try:
                    self._process_single_log(log_record)
                    
                except Exception as e:
                    self.stats['failed_extractions'] += 1
                    self.stats['errors'].append({
                        'log_id': log_record['id'],
                        'url': log_record.get('source_url', 'Unknown'),
                        'error': str(e)
                    })
                    self.logger.error(f"❌ Failed to process log {log_record['id']}: {e}")
                
                # Small delay to respect API limits
                time.sleep(0.5)
        
        return self._finalize_stats()
    
    def _fetch_unprocessed_logs(self, max_records: int = None) -> List[Dict[str, Any]]:
        """Fetch unprocessed raw logs from Supabase"""
        
        try:
            query = self.supabase_client.table('raw_scraped_pages').select('*').eq('status', 'raw')
            
            if max_records:
                query = query.limit(max_records)
            
            response = query.execute()
            return response.data
            
        except Exception as e:
            self.logger.error(f"❌ Failed to fetch raw logs: {e}")
            return []
    
    def _process_single_log(self, log_record: Dict[str, Any]) -> None:
        """Process a single raw log record"""
        
        log_id = log_record['id']
        url = log_record.get('source_url', '')
        raw_text = log_record.get('raw_text', '')
        raw_markdown = log_record.get('raw_markdown', '')

        self.logger.info(f"🔍 Processing: {url}")

        if not raw_text and not raw_markdown:
            self.logger.warning(f"⚠️ No raw content found for {url}")
            return

        content = raw_markdown or raw_text

        if raw_markdown:
            self.logger.info("📝 Markdown content detected; preserving formatting in extraction")

        # Extract structured data using GPT-4
        extracted_data = self._extract_with_gpt4(content, url, bool(raw_markdown))
        
        if extracted_data:
            # Save to subsidies_structured table
            self._save_structured_data(extracted_data, log_id)
            
            # Update raw log status
            self._update_log_status(log_id, 'processed')
            
            self.stats['successful_extractions'] += 1
            self.logger.info(f"✅ Successfully extracted: {extracted_data.get('title', 'Unknown')}")
        else:
            self._update_log_status(log_id, 'failed')
            self.stats['failed_extractions'] += 1
    
    def _extract_with_gpt4(self, raw_content: str, url: str, is_markdown: bool = False) -> Optional[Dict[str, Any]]:
        """Extract structured data using GPT-4"""

        # Prepare extraction prompt
        system_prompt = self._get_extraction_prompt()
        content_label = "Content (markdown):" if is_markdown else "Content:"
        user_prompt = f"""
Extract subsidy information from this French agricultural funding page:

URL: {url}

{content_label}
{raw_content[:15000]}  # Limit content to avoid token limits

Please extract all available information and return as valid JSON. Preserve markdown formatting in your output.
"""
        
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,
                max_tokens=4000
            )
            
            # Track token usage
            self.stats['tokens_used'] += response.usage.total_tokens
            
            # Parse JSON response
            content = response.choices[0].message.content.strip()
            
            # Extract JSON from response (handle markdown code blocks)
            if "```json" in content:
                json_start = content.find("```json") + 7
                json_end = content.find("```", json_start)
                content = content[json_start:json_end].strip()
            elif "```" in content:
                json_start = content.find("```") + 3
                json_end = content.find("```", json_start)
                content = content[json_start:json_end].strip()
            
            extracted_data = json.loads(content)
            
            # Add metadata
            extracted_data['url'] = url
            extracted_data['extraction_timestamp'] = time.time()
            extracted_data['model_used'] = 'gpt-4-turbo-preview'
            
            # Validate and clean data
            extracted_data = self._validate_extracted_data(extracted_data)
        
        # Enhanced quality validation
        quality_score = self._assess_extraction_quality(extracted_data, raw_text)
        extracted_data['extraction_quality_score'] = quality_score
        
        return extracted_data
            
        except json.JSONDecodeError as e:
            self.logger.error(f"❌ JSON decode error: {e}")
            self.logger.error(f"Raw response: {content[:500]}...")
            return None
            
        except Exception as e:
            self.logger.error(f"❌ GPT-4 extraction error: {e}")
            return None
    
    def _get_extraction_prompt(self) -> str:
        """Get the enhanced extraction system prompt with comprehensive field coverage"""
        
        # Read the canonical extraction prompt
        prompt_file = Path(__file__).parent.parent / "AgriTool-Raw-Log-Interpreter" / "extraction_prompt.md"
        if prompt_file.exists():
            with open(prompt_file, 'r', encoding='utf-8') as f:
                canonical_prompt = f.read()
            return canonical_prompt
        
        # Fallback enhanced prompt if file not found
        return """You are an expert at extracting comprehensive structured information from French agricultural subsidy and funding pages.

CRITICAL: NEVER SIMPLIFY OR FLATTEN COMPLEX INFORMATION. Extract ALL details completely.
If the source uses markdown formatting (headings, lists), preserve this structure in the output fields.

Extract the following information and return it as valid JSON:

{
  "title": "Exact title of the subsidy program",
  "description": "Complete detailed description - do not summarize",
  "eligibility": "Complete eligibility criteria with all conditions and exclusions",
  "amount": [min_amount, max_amount],
  "co_financing_rate": base_percentage,
  "co_financing_bonuses": [
    {"condition": "Condition description", "bonus": bonus_percentage, "details": "Full details"}
  ],
  "funding_calculation": "Complete funding calculation rules and limits",
  "regulatory_framework": "All EU regulations, laws, and legal references",
  "deadline": "YYYY-MM-DD",
  "application_window": "Complete application timing and deadlines",
  "region": ["Region1", "Region2"],
  "sector": ["Sector1", "Sector2"],
  "funding_type": "Type of funding",
  "agency": "Funding agency name",
  "application_method": "Complete application process",
  "documents": [
    {"name": "Document name", "mandatory": true/false, "description": "Details"}
  ],
  "evaluation_criteria": ["Criterion 1", "Criterion 2"],
  "selection_process": "Detailed evaluation process",
  "application_requirements": ["All requirements"],
  "legal_entity_type": ["All eligible types with conditions"],
  "special_conditions": ["All conditional eligibility scenarios"],
  "legal_exclusions": ["All exclusion criteria"],
  "contact_information": "Complete contact details",
  "language": "fr",
  "project_duration": "Duration if specified",
  "requirements_extraction_status": "extracted"
}

CRITICAL RULES:
1. EXTRACT ALL INFORMATION - do not simplify or summarize
2. Include ALL funding rates, bonuses, and conditional amounts
3. Extract ALL legal references and regulatory frameworks
4. Include ALL document requirements (mandatory and optional)
5. Capture ALL deadlines and application windows
6. Extract ALL eligibility criteria including exclusions
7. Return ONLY valid JSON, no explanations
8. Use arrays for multi-value fields
9. Preserve markdown formatting for lists, bullets, and headings when present
10. Preserve French language exactly as written"""
    
    def _validate_extracted_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and clean extracted data"""
        
        # Ensure required array fields
        array_fields = ['amount', 'region', 'sector', 'documents', 'application_requirements', 'legal_entity_type']
        
        for field in array_fields:
            if field in data and not isinstance(data[field], list):
                if data[field] is not None:
                    data[field] = [data[field]]
                else:
                    data[field] = []
        
        # Validate amounts
        if 'amount' in data and data['amount']:
            try:
                # Convert to floats and ensure proper format
                amounts = [float(x) for x in data['amount'] if x is not None]
                data['amount'] = amounts if amounts else None
            except (ValueError, TypeError):
                data['amount'] = None
        
        # Clean text fields
        text_fields = ['title', 'description', 'eligibility']
        for field in text_fields:
            if field in data and data[field]:
                data[field] = str(data[field]).strip()
        
        # Set default language
        if 'language' not in data:
            data['language'] = 'fr'
        
        return data
    
    def _assess_extraction_quality(self, extracted_data: Dict[str, Any], source_text: str) -> float:
        """Assess the quality of extraction against source content"""
        try:
            # Import here to avoid circular dependencies
            import sys
            import os
            sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'AgriTool-Raw-Log-Interpreter'))
            from quality_validator import SubsidyQualityValidator
            
            validator = SubsidyQualityValidator()
            quality_score = validator.validate_extraction(extracted_data, source_text)
            
            # Log quality assessment
            if quality_score.coverage_score < 70:
                self.logger.warning(f"Low extraction quality: {quality_score.coverage_score:.1f}%")
                if quality_score.critical_missing:
                    self.logger.warning(f"Critical missing: {', '.join(quality_score.critical_missing)}")
            
            return quality_score.coverage_score
            
        except ImportError:
            self.logger.warning("Quality validator not available")
            return 0.0
        except Exception as e:
            self.logger.error(f"Quality assessment failed: {e}")
            return 0.0
    
    def _save_structured_data(self, data: Dict[str, Any], raw_log_id: str) -> None:
        """Save structured data to subsidies_structured table"""
        
        # Prepare record for database
        record = {
            'raw_log_id': raw_log_id,
            'url': data.get('url'),
            'title': data.get('title'),
            'description': data.get('description'),
            'eligibility': data.get('eligibility'),
            'amount': data.get('amount'),
            'deadline': data.get('deadline'),
            'region': data.get('region', []),
            'sector': data.get('sector', []),
            'funding_type': data.get('funding_type'),
            'agency': data.get('agency'),
            'application_method': data.get('application_method'),
            'documents': json.dumps(data.get('documents', [])),
            'application_requirements': json.dumps(data.get('application_requirements', [])),
            'legal_entity_type': data.get('legal_entity_type', []),
            'language': data.get('language', 'fr'),
            'project_duration': data.get('project_duration'),
            'co_financing_rate': data.get('co_financing_rate'),
            'requirements_extraction_status': 'extracted'
        }
        
        try:
            response = self.supabase_client.table('subsidies_structured').insert([record]).execute()
            
            if response.data:
                self.logger.info(f"💾 Saved structured data for: {data.get('title', 'Unknown')}")
            else:
                raise Exception("No data returned from insert")
                
        except Exception as e:
            self.logger.error(f"❌ Failed to save structured data: {e}")
            raise
    
    def _update_log_status(self, log_id: str, status: str) -> None:
        """Update the status of a raw log"""
        
        try:
            response = self.supabase_client.table('raw_scraped_pages').update({
                'status': status,
                'updated_at': time.strftime('%Y-%m-%d %H:%M:%S')
            }).eq('id', log_id).execute()
            
            if not response.data:
                self.logger.warning(f"⚠️ Failed to update status for log {log_id}")
                
        except Exception as e:
            self.logger.error(f"❌ Error updating log status: {e}")
    
    def _finalize_stats(self) -> Dict[str, Any]:
        """Finalize extraction statistics"""
        
        self.stats['end_time'] = time.time()
        self.stats['duration'] = self.stats['end_time'] - self.stats['start_time']
        self.stats['success_rate'] = (
            self.stats['successful_extractions'] / max(self.stats['total_processed'], 1) * 100
        )
        
        # Log summary
        self.logger.info("🏁 AI extraction completed")
        self.logger.info(f"📊 Extraction Statistics:")
        self.logger.info(f"   Total processed: {self.stats['total_processed']}")
        self.logger.info(f"   Successful extractions: {self.stats['successful_extractions']}")
        self.logger.info(f"   Failed extractions: {self.stats['failed_extractions']}")
        self.logger.info(f"   Success rate: {self.stats['success_rate']:.1f}%")
        self.logger.info(f"   Tokens used: {self.stats['tokens_used']}")
        self.logger.info(f"   Duration: {self.stats['duration']:.1f} seconds")
        
        return self.stats


def main():
    """CLI entry point for AI extraction"""
    import argparse
    
    parser = argparse.ArgumentParser(description="AI-powered subsidy data extraction")
    parser.add_argument('--batch-size', type=int, default=10, help='Batch size for processing')
    parser.add_argument('--max-records', type=int, help='Maximum records to process')
    
    args = parser.parse_args()
    
    extractor = AIExtractor()
    stats = extractor.process_raw_logs(args.batch_size, args.max_records)
    
    # Exit with appropriate code
    exit_code = 0 if stats['success_rate'] > 80 else 1
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
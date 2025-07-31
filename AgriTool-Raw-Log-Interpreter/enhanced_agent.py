#!/usr/bin/env python3
"""
Enhanced AgriTool Raw Log Interpreter Agent

A robust Python agent that processes unprocessed subsidy logs from Supabase,
extracts canonical fields using OpenAI Assistant with enhanced multi-tab content,
and writes structured data to the subsidies_structured table with comprehensive
audit trails and application requirements extraction.
"""

import os
import sys
import time
import json
import logging
import traceback
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, date
from decimal import Decimal
import re
import asyncio
from pathlib import Path

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Third-party imports
try:
    from supabase import create_client, Client
    from openai import OpenAI
    import requests
    import sys
    import os
    # Import Python document extractor instead of Tika
    sys.path.append(os.path.dirname(__file__))
    from python_document_extractor import PythonDocumentExtractor
    import pytesseract
    from PIL import Image
    import io
except ImportError as e:
    print(f"ERROR: Required dependency missing: {e}")
    print("Install with: pip install -r requirements.txt")
    sys.exit(1)

# Configuration
CANONICAL_FIELDS = [
    "url", "title", "description", "eligibility", "documents", "deadline",
    "amount", "program", "agency", "region", "sector", "funding_type",
    "co_financing_rate", "project_duration", "payment_terms", "application_method",
    "evaluation_criteria", "previous_acceptance_rate", "priority_groups",
    "legal_entity_type", "funding_source", "reporting_requirements",
    "compliance_requirements", "language", "technical_support", "matching_algorithm_score",
    "application_requirements", "questionnaire_steps", "requirements_extraction_status"
]

# Field type specifications for validation
FIELD_TYPES = {
    'url': str, 'title': str, 'description': str, 'eligibility': str, 'program': str,
    'agency': str, 'region': str, 'sector': str, 'funding_type': str, 'project_duration': str,
    'payment_terms': str, 'application_method': str, 'evaluation_criteria': str,
    'legal_entity_type': str, 'funding_source': str, 'reporting_requirements': str,
    'compliance_requirements': str, 'language': str, 'technical_support': str,
    'requirements_extraction_status': str, 'deadline': str,
    'amount': (int, float), 'co_financing_rate': (int, float), 'previous_acceptance_rate': (int, float),
    'matching_algorithm_score': (int, float),
    'documents': list, 'priority_groups': list, 'application_requirements': list,
    'questionnaire_steps': list
}

class Config:
    """Configuration management from environment variables"""
    
    def __init__(self):
        # Required environment variables
        self.SUPABASE_URL = self._get_required_env("SUPABASE_URL")
        self.SUPABASE_SERVICE_KEY = self._get_required_env("SUPABASE_SERVICE_ROLE_KEY")
        self.OPENAI_API_KEY = self._get_required_env("SCRAPER_RAW_GPT_API")
        
        # Optional configuration
        self.BATCH_SIZE = int(os.getenv("BATCH_SIZE", "25"))  # Reduced for more robust processing
        self.POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "300"))
        self.LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
        self.SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL")
        self.SLACK_ALERT_THRESHOLD = float(os.getenv("SLACK_ALERT_THRESHOLD", "0.25"))
        
        # OpenAI Configuration
        self.OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.ASSISTANT_ID = os.getenv("ASSISTANT_ID", "SCRAPER_RAW_LOGS_INTERPRETER")
    
    def _get_required_env(self, key: str) -> str:
        """Get required environment variable or exit with error"""
        value = os.getenv(key)
        if not value:
            print(f"ERROR: Required environment variable {key} is missing or empty.")
            print("Please set all required variables and try again.")
            sys.exit(1)
        return value

class RawLogInterpreterAgent:
    """Enhanced agent class for processing raw logs with multi-tab content"""
    
    def __init__(self):
        self.config = Config()
        self.logger = self._setup_logging()
        self.supabase = self._init_supabase()
        self.openai_client = self._init_openai()
        self.CANONICAL_FIELDS = CANONICAL_FIELDS
        self.FIELD_TYPES = FIELD_TYPES
        
    def _setup_logging(self) -> logging.Logger:
        """Setup logging configuration"""
        logging.basicConfig(
            level=getattr(logging, self.config.LOG_LEVEL.upper()),
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.StreamHandler(sys.stdout),
                logging.FileHandler('agent.log')
            ]
        )
        return logging.getLogger(__name__)
    
    def _init_supabase(self) -> Client:
        """Initialize Supabase client"""
        try:
            client = create_client(self.config.SUPABASE_URL, self.config.SUPABASE_SERVICE_KEY)
            # Test connection
            client.table('raw_logs').select('id').limit(1).execute()
            self.logger.info("Supabase connection established")
            return client
        except Exception as e:
            self.logger.error(f"Failed to connect to Supabase: {e}")
            sys.exit(1)
    
    def _init_openai(self) -> OpenAI:
        """Initialize OpenAI client"""
        try:
            client = OpenAI(api_key=self.config.OPENAI_API_KEY)
            # Test connection
            client.models.list()
            self.logger.info("OpenAI connection established")
            return client
        except Exception as e:
            self.logger.error(f"Failed to connect to OpenAI: {e}")
            sys.exit(1)
    
    def fetch_unprocessed_logs(self) -> List[Dict[str, Any]]:
        """Fetch batch of unprocessed logs from Supabase"""
        try:
            response = self.supabase.table('raw_logs').select('*').eq('processed', False).limit(self.config.BATCH_SIZE).execute()
            logs = response.data
            self.logger.info(f"Fetched {len(logs)} unprocessed logs")
            return logs
        except Exception as e:
            self.logger.error(f"Failed to fetch unprocessed logs: {e}")
            return []
    
    def extract_file_content(self, file_refs: List[str]) -> str:
        """Extract text content from attached files using Python document extraction"""
        content = ""
        
        # Initialize Python document extractor
        extractor = PythonDocumentExtractor(
            ocr_enabled=True,
            languages=['eng', 'fra', 'ron'],  # Multi-language OCR support
            max_file_size_mb=10.0
        )
        
        for file_ref in file_refs:
            try:
                # Download file from URL
                if file_ref.startswith('http'):
                    response = requests.get(file_ref, timeout=30)
                    file_content = response.content
                else:
                    # Skip non-URL references for now
                    continue
                
                # Use Python document extractor for all document types
                temp_file_path = None
                try:
                    # Determine file extension and handle supported document types
                    if file_ref.lower().endswith(('.pdf', '.docx', '.doc', '.xlsx', '.xls', '.odt')):
                        file_ext = os.path.splitext(file_ref)[1].lower()
                        
                        # Save to temp file for document extraction
                        import tempfile
                        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
                            temp_file.write(file_content)
                            temp_file_path = temp_file.name
                        
                        self.logger.info(f"📄 Attempting Python document extraction for: {file_ref}")
                        
                        # Extract using Python document extractor
                        extraction_result = extractor.extract_document_text(temp_file_path)
                        
                        if extraction_result['success'] and extraction_result.get('text_content'):
                            content += f"\n\n--- Content from {file_ref} ---\n"
                            content += extraction_result['text_content']
                            
                            # Add extraction metadata
                            metadata = extraction_result.get('metadata', {})
                            if metadata:
                                content += f"\n--- Extracted using: {metadata.get('method', 'unknown')}"
                                if metadata.get('page_count'):
                                    content += f", {metadata['page_count']} pages"
                                if metadata.get('ocr_applied'):
                                    content += f", OCR applied"
                                content += " ---"
                            
                            self.logger.info(f"✅ Python document extraction successful for: {file_ref}")
                        else:
                            error_msg = extraction_result.get('error', 'Unknown extraction error')
                            self.logger.warning(f"❌ Document extraction failed for {file_ref}: {error_msg}")
                            content += f"\n\n--- Failed to extract content from {file_ref}: {error_msg} ---\n"
                            
                    elif file_ref.lower().endswith(('.png', '.jpg', '.jpeg', '.tiff')):
                        # OCR for images
                        try:
                            image = Image.open(io.BytesIO(file_content))
                            ocr_text = pytesseract.image_to_string(image)
                            if ocr_text.strip():
                                content += f"\n\n--- OCR Content from {file_ref} ---\n"
                                content += ocr_text
                                self.logger.info(f"✅ OCR extraction successful for: {file_ref}")
                            else:
                                self.logger.warning(f"⚠️ OCR returned no text for: {file_ref}")
                        except Exception as ocr_error:
                            self.logger.error(f"❌ OCR failed for {file_ref}: {ocr_error}")
                            content += f"\n\n--- OCR failed for {file_ref}: {str(ocr_error)} ---\n"
                    
                    elif file_ref.lower().endswith(('.txt', '.text')):
                        content += f"\n\n--- Content from {file_ref} ---\n"
                        content += file_content.decode('utf-8', errors='ignore')
                        
                except Exception as extraction_error:
                    self.logger.error(f"❌ File extraction failed for {file_ref}: {extraction_error}")
                    content += f"\n\n--- Failed to extract content from {file_ref}: {str(extraction_error)} ---\n"
                
                finally:
                    # Always cleanup temp files
                    if temp_file_path and os.path.exists(temp_file_path):
                        try:
                            os.unlink(temp_file_path)
                            self.logger.debug(f"🗑️ Cleaned up temp file: {temp_file_path}")
                        except Exception as cleanup_error:
                            self.logger.warning(f"⚠️ Failed to cleanup temp file {temp_file_path}: {cleanup_error}")
                
            except Exception as e:
                self.logger.warning(f"Failed to extract content from {file_ref}: {e}")
                content += f"\n\n--- Failed to extract content from {file_ref}: {str(e)} ---\n"
        
        return content
    
    def extract_enhanced_content(self, payload: str) -> str:
        """
        Extract and combine all available content from enhanced multi-tab payload.
        """
        try:
            # Parse the enhanced payload from the scraper
            payload_data = json.loads(payload)
            
            combined_content = []
            
            # Add scraping metadata
            metadata = payload_data.get('scraping_metadata', {})
            if metadata.get('source_url'):
                combined_content.append(f"SOURCE URL: {metadata['source_url']}")
            
            # Extract raw content
            raw_content = payload_data.get('raw_content', {})
            
            # Add title and description
            if raw_content.get('title'):
                combined_content.append(f"TITLE: {raw_content['title']}")
            
            if raw_content.get('description'):
                combined_content.append(f"DESCRIPTION: {raw_content['description']}")
            
            # Add multi-tab content with section markers
            combined_tab_text = raw_content.get('combined_tab_text', '')
            if combined_tab_text:
                combined_content.append("COMPLETE TAB CONTENT:")
                combined_content.append(combined_tab_text)
            else:
                # Fallback: combine individual tab sections
                multi_tab_content = raw_content.get('multi_tab_content', {})
                if multi_tab_content:
                    combined_content.append("TAB SECTIONS:")
                    for tab_name, tab_content in multi_tab_content.items():
                        if tab_content:
                            section_name = tab_name.replace('_', ' ').title()
                            combined_content.append(f"== {section_name} ==")
                            combined_content.append(tab_content)
            
            # Add other extracted fields
            other_fields = ['eligibility', 'agency', 'amount_min', 'amount_max', 'deadline', 'categories', 'region', 'language', 'tags']
            for field in other_fields:
                value = raw_content.get(field)
                if value:
                    combined_content.append(f"{field.upper()}: {value}")
            
            # Add documents section
            documents = raw_content.get('documents', [])
            if documents:
                combined_content.append("DOCUMENTS AND ATTACHMENTS:")
                for i, doc in enumerate(documents, 1):
                    if isinstance(doc, dict):
                        doc_text = doc.get('text', 'Unknown Document')
                        doc_url = doc.get('url', 'No URL')
                        source_tab = doc.get('source_tab', 'unknown')
                        combined_content.append(f"{i}. {doc_text} (URL: {doc_url}, Source: {source_tab})")
                    else:
                        combined_content.append(f"{i}. {doc}")
            
            return "\n\n".join(combined_content)
            
        except json.JSONDecodeError:
            # Fallback to treating payload as plain text
            self.logger.warning("Payload is not valid JSON, treating as plain text")
            return payload
        except Exception as e:
            self.logger.error(f"Error extracting enhanced content: {e}")
            return payload

    def call_openai_assistant(self, payload: str, file_content: str) -> Dict[str, Any]:
        """Call OpenAI Assistant to extract canonical fields with enhanced prompting."""
        
        # Extract enhanced content from multi-tab payload
        enhanced_content = self.extract_enhanced_content(payload)
        
        system_prompt = """You are the SCRAPER_RAW_LOGS_INTERPRETER assistant specialized in extracting comprehensive subsidy information from French agricultural funding pages.

CRITICAL INSTRUCTIONS:
1. Extract information from ALL sections of the provided content (Présentation, Pour qui ?, Quand ?, Comment ?, etc.)
2. Return ONLY a valid JSON object with exactly the specified fields
3. Use null for missing values - do not omit fields
4. Ensure consistent language per field (French content → French fields)
5. Focus on APPLICATION DEADLINE (not publish date) for the deadline field
6. Extract ALL document requirements for complete application guidance

REQUIRED JSON STRUCTURE:
{
  "url": "source URL",
  "title": "full subsidy title",
  "description": "comprehensive description from all tabs",
  "eligibility": "complete eligibility criteria from Pour qui ? section",
  "documents": ["list of document names/URLs found"],
  "deadline": "application deadline in YYYY-MM-DD format or null",
  "amount": "numeric amount without currency symbols or null",
  "program": "program/scheme name",
  "agency": "administering agency/organization",
  "region": "geographic scope",
  "sector": "target sector/industry",
  "funding_type": "type of funding (grant, loan, etc.)",
  "co_financing_rate": "co-financing percentage as decimal or null",
  "project_duration": "project duration requirements",
  "payment_terms": "payment schedule/terms",
  "application_method": "how to apply from Comment ? section",
  "evaluation_criteria": "selection criteria",
  "previous_acceptance_rate": "success rate as decimal or null",
  "priority_groups": ["array of priority beneficiary groups"],
  "legal_entity_type": "required legal status",
  "funding_source": "source of funds (EU, national, etc.)",
  "reporting_requirements": "reporting obligations",
  "compliance_requirements": "compliance obligations",
  "language": "content language (fr, en, etc.)",
  "technical_support": "available technical assistance",
  "matching_algorithm_score": null,
  "application_requirements": ["Business Plan", "EU Farm ID", "Financial Statements", "Technical Certifications", etc.],
  "questionnaire_steps": [
    {"requirement": "Business Plan", "question": "Please upload your business plan (PDF or DOCX format)."},
    {"requirement": "EU Farm ID", "question": "Enter your EU Farm ID number or upload supporting documentation."}
  ],
  "requirements_extraction_status": "extracted" | "not_found" | "partial"
}

FIELD EXTRACTION PRIORITIES:
- Title: Use the main heading from the page
- Description: Combine content from Présentation and any overview sections
- Eligibility: Extract from "Pour qui ?" or eligibility sections
- Deadline: Look for "Date limite", "Avant le", or similar in "Quand ?" section
- Application Method: Extract from "Comment ?" or procedure sections
- Requirements: Look for required documents, forms, certifications, proofs needed to apply
- Questionnaire: Create user-friendly upload/input instructions for each requirement

Return only the JSON object, no explanations or additional text."""

        # Combine enhanced content with file content
        full_content = f"{enhanced_content}\n\nATTACHED FILE CONTENT:\n{file_content}"
        
        try:
            response = self.openai_client.chat.completions.create(
                model=self.config.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": full_content}
                ],
                temperature=0.05,  # Very low temperature for consistency
                max_tokens=6000    # Increased for comprehensive extraction
            )
            
            result_text = response.choices[0].message.content.strip()
            
            # Parse JSON response with robust error handling
            try:
                # Try direct JSON parsing first
                result = json.loads(result_text)
                return self.validate_and_normalize_fields(result)
                
            except json.JSONDecodeError:
                # Try to extract JSON from markdown code blocks
                json_patterns = [
                    r'```json\s*(\{.*?\})\s*```',
                    r'```\s*(\{.*?\})\s*```',
                    r'(\{.*?\})',
                ]
                
                for pattern in json_patterns:
                    json_match = re.search(pattern, result_text, re.DOTALL)
                    if json_match:
                        try:
                            result = json.loads(json_match.group(1))
                            return self.validate_and_normalize_fields(result)
                        except json.JSONDecodeError:
                            continue
                
                # If all parsing fails, create minimal valid result
                self.logger.error(f"Failed to parse JSON from OpenAI response: {result_text[:200]}...")
                return self.create_minimal_valid_result(payload)
                
        except Exception as e:
            self.logger.error(f"OpenAI API call failed: {e}")
            return self.create_minimal_valid_result(payload)
    
    def validate_and_normalize_fields(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate and normalize extracted fields according to canonical schema.
        """
        normalized = {}
        audit_notes = []
        
        # Ensure all canonical fields are present
        for field in CANONICAL_FIELDS:
            if field in result:
                value = result[field]
                
                # Type validation and normalization
                expected_type = FIELD_TYPES.get(field)
                
                if expected_type == str:
                    normalized[field] = str(value) if value is not None else None
                elif expected_type == list:
                    if isinstance(value, list):
                        normalized[field] = value
                    elif isinstance(value, str) and value:
                        normalized[field] = [value]  # Convert single string to list
                    else:
                        normalized[field] = []
                elif expected_type in [(int, float), int, float]:
                    if isinstance(value, (int, float)):
                        normalized[field] = value
                    elif isinstance(value, str) and value:
                        # Try to extract numeric value
                        numeric_match = re.search(r'[\d,\.]+', value.replace(',', ''))
                        if numeric_match:
                            try:
                                normalized[field] = float(numeric_match.group())
                            except ValueError:
                                normalized[field] = None
                                audit_notes.append(f"Could not parse numeric value for {field}: {value}")
                        else:
                            normalized[field] = None
                    else:
                        normalized[field] = None
                else:
                    normalized[field] = value
            else:
                normalized[field] = None
                audit_notes.append(f"Missing field: {field}")
        
        # Date normalization for deadline
        if normalized.get('deadline'):
            normalized['deadline'] = self.normalize_date(normalized['deadline'])
            if not normalized['deadline']:
                audit_notes.append("Invalid date format for deadline")
        
        # Add audit information
        normalized['audit'] = {
            'extraction_timestamp': datetime.utcnow().isoformat(),
            'missing_fields': [f for f in CANONICAL_FIELDS if not normalized.get(f)],
            'validation_notes': audit_notes,
            'field_completeness': len([f for f in CANONICAL_FIELDS if normalized.get(f)]) / len(CANONICAL_FIELDS)
        }
        
        return normalized
    
    def normalize_date(self, date_str: str) -> Optional[str]:
        """Normalize various date formats to YYYY-MM-DD."""
        if not date_str:
            return None
        
        # Common French date patterns
        date_patterns = [
            r'(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})',  # DD/MM/YYYY or DD-MM-YYYY
            r'(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})',  # YYYY/MM/DD or YYYY-MM-DD
            r'(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})',  # DD month YYYY (French)
        ]
        
        french_months = {
            'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04',
            'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08',
            'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12'
        }
        
        for pattern in date_patterns:
            match = re.search(pattern, date_str.lower())
            if match:
                if len(match.groups()) == 3:
                    if match.group(2) in french_months:
                        # French month name format
                        day, month_name, year = match.groups()
                        month = french_months[month_name]
                        return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                    else:
                        # Numeric format
                        g1, g2, g3 = match.groups()
                        if len(g1) == 4:  # YYYY-MM-DD format
                            return f"{g1}-{g2.zfill(2)}-{g3.zfill(2)}"
                        else:  # DD/MM/YYYY format
                            return f"{g3}-{g2.zfill(2)}-{g1.zfill(2)}"
        
        return None
    
    def create_minimal_valid_result(self, payload: str) -> Dict[str, Any]:
        """Create a minimal valid result when extraction fails."""
        result = {field: None for field in CANONICAL_FIELDS}
        
        # Try to extract basic info from payload
        try:
            payload_data = json.loads(payload)
            metadata = payload_data.get('scraping_metadata', {})
            raw_content = payload_data.get('raw_content', {})
            
            result['url'] = metadata.get('source_url')
            result['title'] = raw_content.get('title')
            result['description'] = raw_content.get('description')
            result['language'] = 'fr'  # Default for FranceAgriMer
            result['requirements_extraction_status'] = 'failed'
            
        except json.JSONDecodeError:
            result['requirements_extraction_status'] = 'failed'
        
        result['audit'] = {
            'extraction_timestamp': datetime.utcnow().isoformat(),
            'extraction_failed': True,
            'field_completeness': 0.0
        }
        
        return result

    def save_to_database(self, log_data: Dict[str, Any], extracted_data: Dict[str, Any]) -> bool:
        """Save extracted data to subsidies_structured table with enhanced audit trail."""
        try:
            # Prepare the record for insertion with all canonical fields
            record = {
                'raw_log_id': log_data['id'],
                'url': extracted_data.get('url'),
                'title': extracted_data.get('title'),
                'description': extracted_data.get('description'),
                'eligibility': extracted_data.get('eligibility'),
                'program': extracted_data.get('program'),
                'agency': extracted_data.get('agency'),
                'region': extracted_data.get('region'),
                'sector': extracted_data.get('sector'),
                'funding_type': extracted_data.get('funding_type'),
                'project_duration': extracted_data.get('project_duration'),
                'payment_terms': extracted_data.get('payment_terms'),
                'application_method': extracted_data.get('application_method'),
                'evaluation_criteria': extracted_data.get('evaluation_criteria'),
                'legal_entity_type': extracted_data.get('legal_entity_type'),
                'funding_source': extracted_data.get('funding_source'),
                'reporting_requirements': extracted_data.get('reporting_requirements'),
                'compliance_requirements': extracted_data.get('compliance_requirements'),
                'language': extracted_data.get('language'),
                'technical_support': extracted_data.get('technical_support'),
                'deadline': extracted_data.get('deadline'),
                'amount': extracted_data.get('amount'),
                'co_financing_rate': extracted_data.get('co_financing_rate'),
                'previous_acceptance_rate': extracted_data.get('previous_acceptance_rate'),
                'matching_algorithm_score': extracted_data.get('matching_algorithm_score'),
                'documents': extracted_data.get('documents', []),
                'priority_groups': extracted_data.get('priority_groups', []),
                'application_requirements': extracted_data.get('application_requirements', []),
                'questionnaire_steps': extracted_data.get('questionnaire_steps', []),
                'requirements_extraction_status': extracted_data.get('requirements_extraction_status', 'extracted'),
                'audit': extracted_data.get('audit', {}),
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            # Insert into subsidies_structured
            response = self.supabase.table('subsidies_structured').insert(record).execute()
            
            if response.data:
                self.logger.info(f"Successfully saved extracted data for log {log_data['id']}")
                return True
            else:
                self.logger.error(f"Failed to save data for log {log_data['id']}: No data returned")
                return False
                
        except Exception as e:
            self.logger.error(f"Database save failed for log {log_data['id']}: {e}")
            
            # Log the error to error_log table
            try:
                error_record = {
                    'raw_log_id': log_data['id'],
                    'error_type': 'database_save_error',
                    'error_message': str(e),
                    'stack_trace': traceback.format_exc(),
                    'metadata': {'extracted_data_keys': list(extracted_data.keys()) if extracted_data else []}
                }
                self.supabase.table('error_log').insert(error_record).execute()
            except Exception as log_error:
                self.logger.error(f"Failed to log database error: {log_error}")
            
            return False

    def process_single_log(self, log_data: Dict[str, Any]) -> bool:
        """Process a single log entry with enhanced error handling and retry logic."""
        log_id = log_data['id']
        
        # Acquire processing lock
        try:
            lock_acquired = self.supabase.rpc('acquire_processing_lock', {'log_id': log_id}).execute()
            if not lock_acquired.data:
                self.logger.info(f"Log {log_id} is already being processed by another instance")
                return False
        except Exception as e:
            self.logger.error(f"Failed to acquire lock for log {log_id}: {e}")
            return False
        
        try:
            # Extract file content with retry logic
            file_content = ""
            for attempt in range(3):  # 3 retry attempts
                try:
                    file_content = self.extract_file_content(log_data.get('file_refs', []))
                    break
                except Exception as e:
                    self.logger.warning(f"File extraction attempt {attempt + 1} failed for log {log_id}: {e}")
                    if attempt == 2:  # Last attempt
                        self.logger.error(f"All file extraction attempts failed for log {log_id}")
                        file_content = "File extraction failed after multiple attempts."
                    else:
                        time.sleep(2 ** attempt)  # Exponential backoff
            
            # Call OpenAI Assistant with retry logic
            extracted_data = None
            for attempt in range(3):  # 3 retry attempts for OpenAI
                try:
                    extracted_data = self.call_openai_assistant(log_data['payload'], file_content)
                    if extracted_data and isinstance(extracted_data, dict):
                        break
                    else:
                        raise ValueError("OpenAI returned empty or invalid data")
                except Exception as e:
                    self.logger.warning(f"OpenAI attempt {attempt + 1} failed for log {log_id}: {e}")
                    if attempt == 2:  # Last attempt
                        self.logger.error(f"All OpenAI attempts failed for log {log_id}")
                        extracted_data = self.create_minimal_valid_result(log_data['payload'])
                    else:
                        time.sleep(5 * (attempt + 1))  # Progressive delay
            
            if not extracted_data:
                self.logger.error(f"No extracted data for log {log_id}")
                return False
            
            # Validate extraction quality
            audit_info = extracted_data.get('audit', {})
            completeness = audit_info.get('field_completeness', 0)
            
            if completeness < 0.3:  # Less than 30% completeness
                self.logger.warning(f"Low extraction quality for log {log_id}: {completeness:.2%} completeness")
                
                # Log quality issue
                try:
                    quality_issue = {
                        'raw_log_id': log_id,
                        'error_type': 'low_extraction_quality',
                        'error_message': f"Field completeness: {completeness:.2%}",
                        'metadata': {
                            'completeness_score': completeness,
                            'missing_fields': audit_info.get('missing_fields', [])
                        }
                    }
                    self.supabase.table('error_log').insert(quality_issue).execute()
                except Exception as e:
                    self.logger.error(f"Failed to log quality issue: {e}")
            
            # Save to database
            if self.save_to_database(log_data, extracted_data):
                # Mark as processed
                try:
                    self.supabase.table('raw_logs').update({
                        'processed': True,
                        'processed_at': datetime.utcnow().isoformat()
                    }).eq('id', log_id).execute()
                    
                    self.logger.info(f"Successfully processed log {log_id} with {completeness:.2%} completeness")
                    return True
                except Exception as e:
                    self.logger.error(f"Failed to mark log {log_id} as processed: {e}")
                    return False
            else:
                self.logger.error(f"Failed to save extracted data for log {log_id}")
                return False
                
        except Exception as e:
            self.logger.error(f"Unexpected error processing log {log_id}: {e}")
            self.logger.error(f"Traceback: {traceback.format_exc()}")
            
            # Log the error
            try:
                error_record = {
                    'raw_log_id': log_id,
                    'error_type': 'processing_error',
                    'error_message': str(e),
                    'stack_trace': traceback.format_exc()
                }
                self.supabase.table('error_log').insert(error_record).execute()
            except Exception as log_error:
                self.logger.error(f"Failed to log processing error: {log_error}")
            
            return False
            
        finally:
            # Always release the processing lock
            try:
                self.supabase.rpc('release_processing_lock', {'log_id': log_id}).execute()
            except Exception as e:
                self.logger.error(f"Failed to release lock for log {log_id}: {e}")

    def process_batch(self) -> Dict[str, int]:
        """Process a batch of logs with enhanced statistics"""
        logs = self.fetch_unprocessed_logs()
        
        if not logs:
            self.logger.info("No unprocessed logs found")
            return {"processed": 0, "failed": 0, "total": 0, "completeness_avg": 0.0}
        
        stats = {"processed": 0, "failed": 0, "total": len(logs), "completeness_scores": []}
        
        for log_data in logs:
            if self.process_single_log(log_data):
                stats["processed"] += 1
            else:
                stats["failed"] += 1
        
        # Calculate average completeness
        if stats["completeness_scores"]:
            stats["completeness_avg"] = sum(stats["completeness_scores"]) / len(stats["completeness_scores"])
        else:
            stats["completeness_avg"] = 0.0
        
        # Check failure rate
        failure_rate = stats["failed"] / stats["total"] if stats["total"] > 0 else 0
        
        if failure_rate > 0.25:  # 25% threshold
            self.logger.warning(f"High failure rate: {failure_rate:.2%} ({stats['failed']}/{stats['total']} failed)")
        
        self.logger.info(f"Batch processing complete: {stats}")
        return stats
    
    def run_continuous(self):
        """Run the agent continuously with polling"""
        self.logger.info("Starting Enhanced AgriTool Raw Log Interpreter Agent")
        self.logger.info(f"Configuration: batch_size={self.config.BATCH_SIZE}, poll_interval={self.config.POLL_INTERVAL}s")
        
        while True:
            try:
                stats = self.process_batch()
                if stats["total"] > 0:
                    self.logger.info(f"Processed {stats['processed']}/{stats['total']} logs, "
                                   f"avg completeness: {stats['completeness_avg']:.2%}")
                time.sleep(self.config.POLL_INTERVAL)
            except KeyboardInterrupt:
                self.logger.info("Received interrupt signal, shutting down...")
                break
            except Exception as e:
                self.logger.error(f"Unexpected error in main loop: {e}")
                time.sleep(60)  # Wait before retrying

def main():
    """Main entry point"""
    # Create and run enhanced agent
    agent = RawLogInterpreterAgent()
    
    # Check if running single batch or continuous
    if "--single-batch" in sys.argv:
        stats = agent.process_batch()
        print(f"Single batch processing complete: {stats}")
        sys.exit(0)
    else:
        agent.run_continuous()

if __name__ == "__main__":
    main()
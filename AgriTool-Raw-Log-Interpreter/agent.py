#!/usr/bin/env python3
"""
AgriTool Raw Log Interpreter Agent

A robust Python agent that processes unprocessed subsidy logs from Supabase,
extracts canonical fields using OpenAI Assistant, and writes structured data
to the subsidies_structured table.
"""

import os
import sys
import time
import json
import logging
import traceback
from typing import List, Dict, Any, Optional, Tuple
from enhanced_agent import RawLogInterpreterAgent as _EnhancedRawLogInterpreterAgent
from datetime import datetime, date
from decimal import Decimal
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
    from tika import parser as tika_parser
    import sys
    import os
    sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'AgriToolScraper-main'))
    from pdf_extraction_pipeline import PDFExtractionPipeline
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
        print("✅ SCRAPER_RAW_GPT_API detected")
        
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

class LogInterpreterAgent:
    """Main agent class for processing raw logs"""
    
    def __init__(self, config: Config):
        self.config = config
        self.logger = self._setup_logging()
        self.supabase = self._init_supabase()
        self.openai_client = self._init_openai()
        
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
    
    def acquire_lock(self, log_id: str) -> bool:
        """Acquire processing lock for a log entry"""
        try:
            response = self.supabase.rpc('acquire_processing_lock', {'log_id': log_id}).execute()
            return response.data if response.data is not None else False
        except Exception as e:
            self.logger.warning(f"Failed to acquire lock for {log_id}: {e}")
            return False
    
    def release_lock(self, log_id: str) -> bool:
        """Release processing lock for a log entry"""
        try:
            response = self.supabase.rpc('release_processing_lock', {'log_id': log_id}).execute()
            return response.data if response.data is not None else False
        except Exception as e:
            self.logger.warning(f"Failed to release lock for {log_id}: {e}")
            return False
    
    def extract_file_content(self, file_refs: List[str]) -> str:
        """Extract text content from attached files using robust PDF extraction pipeline"""
        content = ""
        
        # Initialize robust PDF extraction pipeline
        pdf_pipeline = PDFExtractionPipeline(
            max_file_size_mb=10.0,  # Allow larger files since we have preprocessing
            max_retries=3,
            initial_retry_delay=5.0,
            max_retry_delay=60.0,
            enable_ocr=True  # Enable OCR for scanned documents
        )
        
        for file_ref in file_refs:
            try:
                # Download file from Supabase storage or URL
                if file_ref.startswith('http'):
                    response = requests.get(file_ref, timeout=30)
                    file_content = response.content
                else:
                    # Assume it's a Supabase storage path
                    response = self.supabase.storage.from_('attachments').download(file_ref)
                    file_content = response
                
                # Extract text based on file type
                if file_ref.lower().endswith('.pdf'):
                    # Use robust PDF extraction pipeline
                    temp_file_path = None
                    try:
                        self.logger.info(f"🔄 Starting robust PDF extraction for: {file_ref}")
                        
                        # Save to temp file for processing
                        import tempfile
                        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
                            temp_file.write(file_content)
                            temp_file.flush()
                            temp_file_path = temp_file.name
                            
                        # Extract using robust pipeline
                        extracted_text, temp_files = pdf_pipeline.extract_text(temp_file_path)
                        
                        if extracted_text and extracted_text.strip():
                            content += f"\n\n--- Content from {file_ref} ---\n"
                            content += extracted_text
                            self.logger.info(f"✅ Successfully extracted {len(extracted_text)} characters from PDF: {file_ref}")
                        else:
                            self.logger.warning(f"⚠️ No text extracted from PDF: {file_ref}")
                            content += f"\n\n--- No text content extracted from {file_ref} ---\n"
                        
                        # Cleanup temp files
                        pdf_pipeline.cleanup_temp_files(temp_files)
                        
                    except Exception as pdf_error:
                        self.logger.warning(f"❌ Robust PDF extraction failed for {file_ref}: {pdf_error}")
                        self.logger.debug(f"PDF extraction error details: {traceback.format_exc()}")
                        
                        # Fallback to basic tika parsing
                        try:
                            self.logger.info(f"🔄 Attempting fallback extraction for: {file_ref}")
                            parsed = tika_parser.from_buffer(file_content)
                            if parsed.get('content'):
                                content += f"\n\n--- Content from {file_ref} (fallback) ---\n"
                                content += parsed['content']
                                self.logger.info(f"✅ Fallback extraction successful for: {file_ref}")
                            else:
                                self.logger.warning(f"⚠️ Fallback extraction returned no content for: {file_ref}")
                                content += f"\n\n--- Failed to extract content from {file_ref}: {str(pdf_error)} ---\n"
                        except Exception as fallback_error:
                            self.logger.error(f"❌ Both robust and fallback extraction failed for {file_ref}: {fallback_error}")
                            content += f"\n\n--- Failed to extract content from {file_ref}: {str(fallback_error)} ---\n"
                    
                    finally:
                        # Always cleanup the original temp file
                        if temp_file_path and os.path.exists(temp_file_path):
                            try:
                                os.unlink(temp_file_path)
                                self.logger.debug(f"🗑️ Cleaned up temp file: {temp_file_path}")
                            except Exception as cleanup_error:
                                self.logger.warning(f"⚠️ Failed to cleanup temp file {temp_file_path}: {cleanup_error}")
                
                elif file_ref.lower().endswith(('.docx', '.doc')):
                    parsed = tika_parser.from_buffer(file_content)
                    if parsed.get('content'):
                        content += f"\n\n--- Content from {file_ref} ---\n"
                        content += parsed['content']
                
                elif file_ref.lower().endswith(('.txt', '.text')):
                    content += f"\n\n--- Content from {file_ref} ---\n"
                    content += file_content.decode('utf-8', errors='ignore')
                
                elif file_ref.lower().endswith(('.png', '.jpg', '.jpeg', '.tiff')):
                    # OCR for images
                    image = Image.open(io.BytesIO(file_content))
                    ocr_text = pytesseract.image_to_string(image)
                    if ocr_text.strip():
                        content += f"\n\n--- OCR from {file_ref} ---\n"
                        content += ocr_text
                
            except Exception as e:
                self.logger.warning(f"Failed to extract content from {file_ref}: {e}")
                content += f"\n\n--- Failed to extract content from {file_ref}: {str(e)} ---\n"
        
        return content
    
    def call_openai_assistant(self, payload: str, file_content: str) -> Dict[str, Any]:
        """Call OpenAI Assistant to extract canonical fields"""
        system_prompt = """You are the SCRAPER_RAW_LOGS_INTERPRETER assistant. 
        Extract canonical subsidy fields from the provided text content with ABSOLUTE PRECISION.
        
        CRITICAL TITLE EXTRACTION REQUIREMENTS:
        - NEVER use "Subsidy Page" as a title - this is a placeholder that must be avoided
        - Extract the ACTUAL, SPECIFIC title from the source page content
        - Look for headings like "Aide à...", "Subvention pour...", specific program names
        - If no clear title is found, create a descriptive title from agency + sector + purpose
        - Title must be unique, descriptive, and reflect the actual subsidy program
        
        CONTENT EXTRACTION REQUIREMENTS:
        - Extract content VERBATIM from source - no summarization or paraphrasing
        - Preserve ALL original formatting, line breaks, and structure exactly as in source
        - For lists (eligibility, documents, steps), maintain original order and wording
        - Empty sections should be null, not {} or generic text
        
        CRITICAL: Always return array fields (amount, region, sector, documents, priority_groups, 
        application_requirements, questionnaire_steps, legal_entity_type, objectives, 
        eligible_actions, ineligible_actions, beneficiary_types, investment_types, rejection_conditions) 
        as JSON arrays — e.g., amount: [5000] or amount: [5000, 15000]. Do NOT output scalars or 
        strings for these fields. Return empty arrays if no data is present.
        
        Return a JSON object with exactly these fields (use null for missing values):
        - url, title (NEVER "Subsidy Page"), description, eligibility, documents (array), deadline (YYYY-MM-DD),
        - amount (array of numbers), program, agency, region (array), sector (array), funding_type,
        - co_financing_rate (numeric), project_duration, payment_terms, application_method,
        - evaluation_criteria, previous_acceptance_rate (numeric), priority_groups (array),
        - legal_entity_type (array), funding_source, reporting_requirements,
        - compliance_requirements, language, technical_support, matching_algorithm_score (numeric)
        
        NEW REQUIREMENT EXTRACTION FIELDS:
        - application_requirements (array): Extract ALL required documents, forms, or proofs needed to apply 
          (e.g. "Business Plan", "EU Farm ID", "Sustainability Report", "Carbon Assessment", "Technical Certification")
        - questionnaire_steps (array): For each requirement, generate a user-friendly question/instruction
          (e.g. [{"requirement": "Business Plan", "question": "Please upload your business plan (PDF or DOCX)."}])
        - requirements_extraction_status (string): Set to "extracted" if requirements found, "not_found" if unclear
        
        QUALITY ASSURANCE:
        - Validate that title is meaningful and specific (not generic)
        - Ensure all text fields contain actual content, not placeholders
        - Verify arrays contain actual data items, not empty or generic entries
        
        Ensure all fields are present in your response."""
        
        full_content = f"Raw Log Payload:\n{payload}\n\nAttached File Content:\n{file_content}"
        
        try:
            if self.config.ASSISTANT_ID.startswith("asst_") and hasattr(self.openai_client, "beta"):
                # Use OpenAI Assistants API when an Assistant ID is provided
                thread = self.openai_client.beta.threads.create(messages=[{"role": "user", "content": full_content}])
                run = self.openai_client.beta.threads.runs.create(
                    thread_id=thread.id,
                    assistant_id=self.config.ASSISTANT_ID,
                    instructions=system_prompt
                )

                # Poll until completion
                while run.status not in ["completed", "failed", "cancelled", "expired"]:
                    time.sleep(1)
                    run = self.openai_client.beta.threads.runs.retrieve(thread_id=thread.id, run_id=run.id)

                if run.status != "completed":
                    raise RuntimeError(f"Assistant run failed: {run.status}")

                messages = self.openai_client.beta.threads.messages.list(thread_id=thread.id)
                result_text = messages.data[0].content[0].text.value
            else:
                # Fallback to Chat Completions API
                response = self.openai_client.chat.completions.create(
                    model=self.config.OPENAI_MODEL,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": full_content}
                    ],
                    temperature=0.1,
                    max_tokens=4000
                )

                result_text = response.choices[0].message.content
            
            # Parse JSON response
            try:
                result = json.loads(result_text)
                return result
            except json.JSONDecodeError:
                # Try to extract JSON from response if wrapped in markdown
                import re
                json_match = re.search(r'```json\s*(\{.*?\})\s*```', result_text, re.DOTALL)
                if json_match:
                    result = json.loads(json_match.group(1))
                    return result
                else:
                    raise ValueError("Could not parse JSON from OpenAI response")
                    
        except Exception as e:
            self.logger.error(f"OpenAI API call failed: {e}")
            raise
    
    def enforce_array(self, value):
        """Ensure value is an array for array-type fields"""
        if value is None or value == "":
            return []

        # Already a list
        if isinstance(value, list):
            return value

        # Attempt to parse JSON array strings like '["foo", "bar"]'
        if isinstance(value, str):
            stripped = value.strip()

            if stripped.startswith('[') and stripped.endswith(']'):
                try:
                    parsed = json.loads(stripped)
                    if isinstance(parsed, list):
                        return parsed
                except json.JSONDecodeError:
                    # Fallback to simple split of Python-style lists
                    inner = stripped[1:-1].strip()
                    if not inner:
                        return []
                    parts = [p.strip().strip('"\'') for p in inner.split(',')]
                    return [p for p in parts if p]

            if ',' in stripped:
                # Handle comma-separated values like "cereal, livestock"
                return [v.strip() for v in stripped.split(',') if v.strip()]

        # Fallback - wrap single value in list
        return [value]

    def validate_and_normalize(self, extracted_data: Dict[str, Any]) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """Validate and normalize extracted data"""
        normalized = {}
        audit = {
            "missing_fields": [],
            "validation_notes": [],
            "attachment_sources_used": []
        }
        
        # Array fields that must be enforced as arrays - CRITICAL FOR DB COMPATIBILITY
        array_fields = [
            "amount", "region", "sector", "documents", "priority_groups", 
            "application_requirements", "questionnaire_steps", "legal_entity_type",
            "objectives", "eligible_actions", "ineligible_actions", 
            "beneficiary_types", "investment_types", "rejection_conditions"
        ]
        
        for field in CANONICAL_FIELDS:
            value = extracted_data.get(field)

            # Array-type fields are coerced first
            if field in array_fields:
                coerced = self.enforce_array(value)
                if coerced != value:
                    audit["validation_notes"].append(f"Field '{field}' coerced to array")

                if not coerced and (value is None or value == ""):
                    normalized[field] = []
                elif field == "amount":
                    try:
                        normalized[field] = [Decimal(str(v)) for v in coerced if v is not None]
                        if not normalized[field]:
                            audit["missing_fields"].append(field)
                    except (ValueError, TypeError):
                        normalized[field] = []
                        audit["missing_fields"].append(field)
                        audit["validation_notes"].append(f"Failed to convert amount array: {value}")
                elif field in ["documents", "priority_groups", "application_requirements", "questionnaire_steps"]:
                    normalized[field] = coerced
                    if field == "questionnaire_steps" and coerced:
                        for step in coerced:
                            if not isinstance(step, dict) or "requirement" not in step or "question" not in step:
                                audit["validation_notes"].append(f"Invalid questionnaire step format: {step}")
                else:
                    normalized[field] = coerced
                continue

            if value is None or (isinstance(value, str) and value == ""):
                normalized[field] = None
                audit["missing_fields"].append(field)
                continue
            
            # Type-specific validation and normalization
            if field == "deadline":
                try:
                    if isinstance(value, str):
                        # Parse date string
                        parsed_date = datetime.strptime(value, "%Y-%m-%d").date()
                        normalized[field] = parsed_date
                        audit["validation_notes"].append(f"deadline parsed as {parsed_date}")
                    else:
                        normalized[field] = None
                        audit["missing_fields"].append(field)
                except ValueError:
                    normalized[field] = None
                    audit["missing_fields"].append(field)
                    audit["validation_notes"].append(f"Failed to parse deadline: {value}")
            
            elif field in ["co_financing_rate", "previous_acceptance_rate", "matching_algorithm_score"]:
                try:
                    normalized[field] = Decimal(str(value)) if value is not None else None
                except (ValueError, TypeError):
                    normalized[field] = None
                    audit["missing_fields"].append(field)
            
            elif field == "requirements_extraction_status":
                # Validate extraction status
                valid_statuses = ["extracted", "not_found", "pending"]
                if value in valid_statuses:
                    normalized[field] = value
                else:
                    normalized[field] = "pending"
                    audit["validation_notes"].append(f"Invalid extraction status: {value}, defaulted to pending")
            
            else:
                # String fields
                normalized[field] = str(value) if value is not None else None
        
        return normalized, audit
    
    def _convert_for_json_serialization(self, obj):
        """Recursively convert objects that aren't JSON serializable"""
        if isinstance(obj, Decimal):
            return float(obj)
        elif isinstance(obj, (date, datetime)):
            return obj.isoformat()
        elif isinstance(obj, dict):
            return {k: self._convert_for_json_serialization(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._convert_for_json_serialization(item) for item in obj]
        else:
            return obj

    def save_structured_data(self, raw_log_id: str, normalized_data: Dict[str, Any], audit: Dict[str, Any]) -> bool:
        """Save normalized data to subsidies_structured table"""
        try:
            # Prepare data for insertion
            insert_data = {
                "raw_log_id": raw_log_id,
                "audit": audit,
                **normalized_data
            }
            
            # Convert all data to be JSON serializable (handle Decimal, date objects, etc.)
            insert_data = self._convert_for_json_serialization(insert_data)
            
            # Log the exact payload being inserted for debugging - CRITICAL FOR ARRAY VALIDATION
            self.logger.info(f"Inserting data for raw_log_id {raw_log_id}:")
            array_fields_log = ["amount", "region", "sector", "legal_entity_type", "objectives", "beneficiary_types"]
            for field in array_fields_log:
                if field in insert_data:
                    field_value = insert_data.get(field)
                    self.logger.info(f"{field} field type: {type(field_value)}, value: {field_value}")
                    if not isinstance(field_value, list):
                        self.logger.error(f"CRITICAL ERROR: {field} is not an array! Type: {type(field_value)}")
            
            # Double-check all array fields are actually arrays before insert
            array_validation_errors = []
            for field in ["amount", "region", "sector", "documents", "priority_groups", 
                         "application_requirements", "questionnaire_steps", "legal_entity_type",
                         "objectives", "eligible_actions", "ineligible_actions", 
                         "beneficiary_types", "investment_types", "rejection_conditions"]:
                if field in insert_data and not isinstance(insert_data[field], list):
                    array_validation_errors.append(f"{field} is not an array: {type(insert_data[field])}")
            
            if array_validation_errors:
                self.logger.error(f"ARRAY VALIDATION FAILED: {array_validation_errors}")
                raise ValueError(f"Array validation failed: {array_validation_errors}")
            
            response = self.supabase.table('subsidies_structured').insert(insert_data).execute()
            
            if response.data:
                self.logger.info(f"Successfully saved structured data for log {raw_log_id}")
                return True
            else:
                self.logger.error(f"Failed to save structured data for log {raw_log_id}")
                return False
                
        except Exception as e:
            self.logger.error(f"Error saving structured data for log {raw_log_id}: {e}")
            return False
    
    def mark_as_processed(self, log_id: str) -> bool:
        """Mark raw log as processed"""
        try:
            response = self.supabase.table('raw_logs').update({
                'processed': True,
                'processed_at': datetime.now().isoformat()
            }).eq('id', log_id).execute()
            
            return len(response.data) > 0
        except Exception as e:
            self.logger.error(f"Failed to mark log {log_id} as processed: {e}")
            return False
    
    def log_error(self, raw_log_id: str, error_type: str, error_message: str, metadata: Dict[str, Any] = None):
        """Log processing error to error_log table"""
        try:
            self.supabase.table('error_log').insert({
                'raw_log_id': raw_log_id,
                'error_type': error_type,
                'error_message': error_message,
                'stack_trace': traceback.format_exc(),
                'metadata': metadata or {}
            }).execute()
        except Exception as e:
            self.logger.error(f"Failed to log error to database: {e}")
    
    def send_alert(self, message: str):
        """Send alert to Slack if configured"""
        if not self.config.SLACK_WEBHOOK_URL:
            return
        
        try:
            requests.post(self.config.SLACK_WEBHOOK_URL, json={
                'text': f"🚨 AgriTool Log Interpreter Alert: {message}"
            }, timeout=10)
        except Exception as e:
            self.logger.warning(f"Failed to send Slack alert: {e}")
    
    def process_single_log(self, log_data: Dict[str, Any]) -> bool:
        """Process a single log entry"""
        log_id = log_data['id']
        
        # Acquire processing lock
        if not self.acquire_lock(log_id):
            self.logger.info(f"Could not acquire lock for log {log_id}, skipping")
            return False
        
        try:
            # Extract file content if any
            file_content = ""
            if log_data.get('file_refs'):
                file_content = self.extract_file_content(log_data['file_refs'])
            
            # Call OpenAI Assistant
            extracted_data = self.call_openai_assistant(log_data['payload'], file_content)
            
            # Validate and normalize
            normalized_data, audit = self.validate_and_normalize(extracted_data)
            
            # Add attachment sources to audit
            if log_data.get('file_refs'):
                audit['attachment_sources_used'] = log_data['file_refs']
            
            # Save structured data
            if self.save_structured_data(log_id, normalized_data, audit):
                # Mark as processed
                if self.mark_as_processed(log_id):
                    self.logger.info(f"Successfully processed log {log_id}")
                    return True
                else:
                    self.logger.error(f"Failed to mark log {log_id} as processed")
                    return False
            else:
                self.log_error(log_id, "SAVE_ERROR", "Failed to save structured data")
                return False
                
        except Exception as e:
            error_msg = f"Processing failed for log {log_id}: {str(e)}"
            self.logger.error(error_msg)
            self.log_error(log_id, "PROCESSING_ERROR", str(e))
            return False
        
        finally:
            # Always release the lock
            self.release_lock(log_id)
    
    def process_batch(self) -> Dict[str, int]:
        """Process a batch of logs"""
        logs = self.fetch_unprocessed_logs()
        
        if not logs:
            self.logger.info("No unprocessed logs found")
            return {"processed": 0, "failed": 0, "total": 0}
        
        stats = {"processed": 0, "failed": 0, "total": len(logs)}
        
        for log_data in logs:
            if self.process_single_log(log_data):
                stats["processed"] += 1
            else:
                stats["failed"] += 1
        
        # Check failure rate
        failure_rate = stats["failed"] / stats["total"] if stats["total"] > 0 else 0
        
        if failure_rate > self.config.SLACK_ALERT_THRESHOLD:
            self.send_alert(f"High failure rate: {failure_rate:.2%} ({stats['failed']}/{stats['total']} failed)")
        
        self.logger.info(f"Batch processing complete: {stats}")
        return stats
    
    def run_continuous(self):
        """Run the agent continuously with polling"""
        self.logger.info("Starting AgriTool Raw Log Interpreter Agent")
        self.logger.info(f"Configuration: batch_size={self.config.BATCH_SIZE}, poll_interval={self.config.POLL_INTERVAL}s")
        
        while True:
            try:
                self.process_batch()
                time.sleep(self.config.POLL_INTERVAL)
            except KeyboardInterrupt:
                self.logger.info("Received interrupt signal, shutting down...")
                break
            except Exception as e:
                self.logger.error(f"Unexpected error in main loop: {e}")
                self.send_alert(f"Unexpected error in main loop: {str(e)}")
                time.sleep(60)  # Wait before retrying

# Backwards compatibility alias for older test suites
class RawLogInterpreterAgent(_EnhancedRawLogInterpreterAgent):
    """Compatibility wrapper used in legacy tests"""

    def __init__(self):
        # Initialize configuration but skip external connections
        self.config = Config()
        self.logger = self._setup_logging()
        self.supabase = None
        self.openai_client = None
        self.CANONICAL_FIELDS = CANONICAL_FIELDS
        self.FIELD_TYPES = FIELD_TYPES

def main():
    """Main entry point"""
    # Validate environment variables early
    config = Config()
    
    # Create and run agent
    agent = LogInterpreterAgent(config)
    
    # Check if running single batch or continuous
    if "--single-batch" in sys.argv:
        stats = agent.process_batch()
        print(f"Single batch processing complete: {stats}")
        try:
            with open("agent_stats.json", "w", encoding="utf-8") as f:
                json.dump(stats, f)
        except Exception as e:
            print(f"Failed to write agent_stats.json: {e}")
        sys.exit(0)
    else:
        agent.run_continuous()

if __name__ == "__main__":
    main()
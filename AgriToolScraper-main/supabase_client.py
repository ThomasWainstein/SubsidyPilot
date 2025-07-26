# supabase_client.py
"""
Supabase integration client for AgriTool scraper.
Handles authentication, data validation, and batch uploads.
NOW WRITES TO raw_logs TABLE for AI agent processing.
"""

import os
import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any
from supabase import create_client, Client
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import requests


def get_supabase_client():
    """Legacy helper function for backward compatibility."""
    uploader = SupabaseUploader()
    return uploader.client


class SupabaseUploader:
    """Handles all Supabase operations for the scraper."""
    
    def __init__(self):
        self.url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
        self.key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
        
        if not self.url or not self.key:
            raise ValueError("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are REQUIRED environment variables")
            
        self.client: Client = create_client(self.url, self.key)
        self.session_id = str(uuid.uuid4())
        self.run_start = datetime.utcnow().isoformat()
        
    def test_connection(self) -> bool:
        """Test the Supabase connection and permissions."""
        try:
            # Test basic connection to raw_logs table (where scraper now writes)
            result = self.client.table('raw_logs').select('id').limit(1).execute()
            print(f"[INFO] Supabase connection successful. Can access raw_logs table.")
            
            # Also test subsidies table for legacy compatibility
            self.client.table('subsidies').select('id').limit(1).execute()
            print(f"[INFO] Can also access subsidies table for compatibility.")
            return True
        except Exception as e:
            print(f"[ERROR] Supabase connection failed: {e}")
            return False
    
    def create_log_entry(self, status: str, message: str, details: Optional[Dict] = None):
        """Create a log entry in scraper_logs table."""
        try:
            log_data = {
                'session_id': self.session_id,
                'timestamp': datetime.utcnow().isoformat(),
                'status': status,
                'message': message,
                'details': details or {},
                'run_start': self.run_start
            }
            
            # Create logs table if it doesn't exist (in case it's first run)
            self.client.table('scraper_logs').insert(log_data).execute()
        except Exception as e:
            print(f"[WARN] Could not log to scraper_logs table: {e}")
    
    def validate_subsidy_data(self, data: Dict) -> Dict:
        """
        Validate and transform scraped data to match Supabase subsidies schema.
        Returns cleaned data ready for insertion with all 26 fields mapped.
        """
        # Map common scraper fields to Supabase schema
        mapped_data = {}
        
        # Required fields with multilingual JSON transformation
        if 'title' in data:
            if isinstance(data['title'], str):
                mapped_data['title'] = {'fr': data['title']}  # FranceAgriMer = French
            else:
                mapped_data['title'] = data['title']
        else:
            mapped_data['title'] = {'fr': 'Aide sans titre'}
            
        # Primary Fix: Ensure description is never null with explicit validation
        if 'description' in data and data['description']:
            if isinstance(data['description'], str):
                mapped_data['description'] = {'fr': data['description']}  # FranceAgriMer = French
            else:
                mapped_data['description'] = data['description']
        else:
            # Fallback: Always provide default description if missing or null
            mapped_data['description'] = {'fr': 'Description non disponible'}
            print(f"[WARN] Description missing for subsidy code {data.get('code', 'unknown')}, using fallback")
            
        # Code (required, generate if missing)
        mapped_data['code'] = data.get('code', f"AUTO_{uuid.uuid4().hex[:8].upper()}")
        
        # Optional numeric fields
        if 'amount_min' in data:
            try:
                mapped_data['amount_min'] = float(data['amount_min'])
            except (ValueError, TypeError):
                mapped_data['amount_min'] = None
                
        if 'amount_max' in data:
            try:
                mapped_data['amount_max'] = float(data['amount_max'])
            except (ValueError, TypeError):
                mapped_data['amount_max'] = None
        
        # Date fields - ensure proper format
        if 'deadline' in data and data['deadline']:
            try:
                mapped_data['deadline'] = data['deadline']
            except:
                mapped_data['deadline'] = None
        
        # Array fields
        array_fields = ['categories', 'language', 'tags', 'region', 'legal_entities', 'matching_tags']
        for field in array_fields:
            if field in data and data[field]:
                if isinstance(data[field], list):
                    mapped_data[field] = data[field]
                elif isinstance(data[field], str):
                    mapped_data[field] = [data[field]]
            else:
                mapped_data[field] = []
        
        # Default language for FranceAgriMer
        if not mapped_data.get('language'):
            mapped_data['language'] = ['fr']
            
        # Status and funding type
        mapped_data['status'] = data.get('status', 'open')
        mapped_data['funding_type'] = data.get('funding_type', 'public')
        
        # Eligibility criteria (JSON field) - Fixed mapping
        if 'eligibility' in data and data['eligibility']:
            if isinstance(data['eligibility'], str):
                mapped_data['eligibility_criteria'] = {'fr': data['eligibility']}
            else:
                mapped_data['eligibility_criteria'] = data['eligibility']
        
        # NEW FIELDS - Map previously missing scraped fields
        # Raw content (all unmapped text blocks)
        if 'raw_content' in data:
            mapped_data['raw_content'] = data['raw_content']
        
        # Agency/organization
        if 'agency' in data:
            mapped_data['agency'] = data['agency']
        
        # Documents list (download links)
        if 'documents' in data:
            mapped_data['documents'] = data['documents']
        
        # Source metadata
        if 'source_url' in data:
            mapped_data['source_url'] = data['source_url']
            
        if 'domain' in data:
            mapped_data['domain'] = data['domain']
            
        return mapped_data
    
    def prepare_raw_log_data(self, subsidies: List[Dict]) -> List[Dict]:
        """
        Prepare scraped subsidy data for insertion into raw_logs table.
        This is the NEW method that replaces raw_scraped_pages workflow.
        """
        raw_log_entries = []
        
        for subsidy in subsidies:
            try:
                # Create payload with all scraped data
                payload_data = {
                    "scraping_metadata": {
                        "source_url": subsidy.get('source_url'),
                        "domain": subsidy.get('domain'),
                        "scraped_at": datetime.utcnow().isoformat(),
                        "session_id": self.session_id,
                        "extraction_method": subsidy.get('extraction_metadata', {}).get('method_used', 'standard')
                    },
                    "raw_content": {
                        "title": subsidy.get('title'),
                        "description": subsidy.get('description'),
                        "eligibility": subsidy.get('eligibility'),
                        "agency": subsidy.get('agency'),
                        "raw_text": subsidy.get('raw_content', {}),
                        "multi_tab_content": subsidy.get('multi_tab_content', {}),
                        "combined_tab_text": subsidy.get('combined_tab_text', ''),
                        "amount_min": subsidy.get('amount_min'),
                        "amount_max": subsidy.get('amount_max'),
                        "deadline": subsidy.get('deadline'),
                        "categories": subsidy.get('categories', []),
                        "region": subsidy.get('region', []),
                        "language": subsidy.get('language', ['fr']),
                        "tags": subsidy.get('tags', []),
                        "documents": subsidy.get('documents', [])
                    }
                }
                
                # Convert to JSON string for payload field
                payload_json = json.dumps(payload_data, ensure_ascii=False, indent=2, default=str)
                
                # Prepare file references from documents
                file_refs = []
                documents = subsidy.get('documents', [])
                if isinstance(documents, list):
                    for doc in documents:
                        if isinstance(doc, dict) and 'url' in doc:
                            file_refs.append(doc['url'])
                        elif isinstance(doc, str):
                            file_refs.append(doc)
                
                # Create raw_logs entry
                raw_log_entry = {
                    'payload': payload_json,
                    'file_refs': file_refs,
                    'processed': False,  # CRITICAL: Set to False for AI agent processing
                    'created_at': datetime.utcnow().isoformat(),
                    'updated_at': datetime.utcnow().isoformat()
                }
                
                raw_log_entries.append(raw_log_entry)
                
            except Exception as e:
                print(f"[ERROR] Failed to prepare raw log data for subsidy: {e}")
                continue
        
        return raw_log_entries
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        retry=retry_if_exception_type((requests.exceptions.RequestException, Exception))
    )
    def insert_raw_logs(self, raw_log_entries: List[Dict]) -> Dict:
        """
        Insert raw log entries into raw_logs table for AI agent processing.
        This is the NEW primary method replacing insert_subsidies.
        """
        if not raw_log_entries:
            return {'inserted': 0, 'errors': [], 'total_attempted': 0}
            
        results = {
            'inserted': 0,
            'errors': [],
            'total_attempted': len(raw_log_entries)
        }
        
        # Process in batches of 50 (smaller batches for large payload field)
        batch_size = 50
        for i in range(0, len(raw_log_entries), batch_size):
            batch = raw_log_entries[i:i + batch_size]
            
            try:
                # Insert batch into raw_logs
                response = self.client.table('raw_logs').insert(batch).execute()
                
                if response.data:
                    batch_inserted = len(response.data)
                    results['inserted'] += batch_inserted
                    print(f"[INFO] Inserted batch of {batch_inserted} raw log entries")
                else:
                    results['errors'].append("Insert returned no data")
                    
            except Exception as e:
                error_msg = str(e)
                results['errors'].append(f"Batch insert error: {error_msg}")
                print(f"[ERROR] Failed to insert raw logs batch: {error_msg}")
        
        # Log final results
        self.create_log_entry(
            'raw_logs_insert_complete',
            f"Processed {results['total_attempted']} raw log entries",
            results
        )
        
        return results

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        retry=retry_if_exception_type((requests.exceptions.RequestException, Exception))
    )
    def insert_subsidies(self, subsidies: List[Dict]) -> Dict:
        """
        UPDATED: Now writes to raw_logs instead of subsidies table.
        This maintains backward compatibility while fixing the data pipeline.
        """
        if not subsidies:
            return {'inserted': 0, 'errors': [], 'total_attempted': 0}
        
        print(f"[INFO] Converting {len(subsidies)} subsidies to raw_logs format...")
        
        # Convert subsidies to raw_logs format
        raw_log_entries = self.prepare_raw_log_data(subsidies)
        
        if not raw_log_entries:
            return {'inserted': 0, 'errors': ['Failed to convert any subsidies to raw_logs format'], 'total_attempted': len(subsidies)}
        
        print(f"[INFO] Inserting {len(raw_log_entries)} entries into raw_logs for AI agent processing...")
        
        # Insert into raw_logs instead of subsidies
        results = self.insert_raw_logs(raw_log_entries)
        
        # Update messaging for clarity
        if results['inserted'] > 0:
            print(f"[INFO] Successfully inserted {results['inserted']} raw log entries.")
            print(f"[INFO] These will be processed by the AI agent to extract structured data.")
        
        return results
    
    def check_existing_subsidies(self, codes: List[str]) -> List[str]:
        """
        UPDATED: Check raw_logs for existing data instead of subsidies table.
        This prevents duplicate processing of the same source URLs.
        """
        try:
            existing_urls = []
            
            # Check for existing source URLs in raw_logs
            for code in codes:
                # Search payloads for source_url matches
                result = self.client.table('raw_logs').select('id,payload').execute()
                for row in result.data:
                    try:
                        payload_data = json.loads(row['payload'])
                        source_url = payload_data.get('scraping_metadata', {}).get('source_url', '')
                        if code in source_url:  # Simple URL-based deduplication
                            existing_urls.append(code)
                            break
                    except (json.JSONDecodeError, KeyError):
                        continue
            
            return existing_urls
        except Exception as e:
            print(f"[WARN] Could not check existing raw logs: {e}")
            return []
    
    def get_scraper_stats(self, days: int = 30) -> Dict:
        """Get scraper statistics for the last N days."""
        try:
            # Query scraper_logs and raw_logs for statistics
            logs_result = self.client.table('scraper_logs').select('*').execute()
            raw_logs_result = self.client.table('raw_logs').select('id,processed,created_at').execute()
            
            stats = {
                'total_sessions': len(logs_result.data),
                'total_raw_logs': len(raw_logs_result.data),
                'processed_logs': len([r for r in raw_logs_result.data if r.get('processed', False)]),
                'pending_logs': len([r for r in raw_logs_result.data if not r.get('processed', False)])
            }
            
            return stats
        except Exception as e:
            return {'error': str(e)}
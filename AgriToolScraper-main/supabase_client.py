# supabase_client.py
"""
Supabase integration client for AgriTool scraper.
Handles authentication, data validation, and batch uploads.
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
            # Test basic connection
            result = self.client.table('subsidies').select('id').limit(1).execute()
            print(f"[INFO] Supabase connection successful. Can access subsidies table.")
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
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        retry=retry_if_exception_type((requests.exceptions.RequestException, Exception))
    )
    def insert_subsidies(self, subsidies: List[Dict]) -> Dict:
        """
        Insert a batch of subsidies into Supabase with retry logic.
        Returns summary of results.
        """
        if not subsidies:
            return {'inserted': 0, 'errors': [], 'duplicates': 0}
            
        results = {
            'inserted': 0,
            'errors': [],
            'duplicates': 0,
            'total_attempted': len(subsidies)
        }
        
        # Process in batches of 100 (Supabase recommended batch size)
        batch_size = 100
        for i in range(0, len(subsidies), batch_size):
            batch = subsidies[i:i + batch_size]
            
            try:
                # Validate each subsidy in the batch
                validated_batch = []
                for subsidy in batch:
                    try:
                        validated = self.validate_subsidy_data(subsidy)
                        
                        # Secondary Failsafe Fix: Final check before insertion
                        if not validated.get('description'):
                            validated['description'] = {'fr': 'Description non disponible'}
                            print(f"[WARN] Failsafe: Fixed null description for subsidy code {validated.get('code', 'unknown')}")
                        
                        validated_batch.append(validated)
                    except Exception as e:
                        results['errors'].append(f"Validation error: {e}")
                        continue
                
                if not validated_batch:
                    continue
                    
                # Insert batch
                response = self.client.table('subsidies').insert(validated_batch).execute()
                
                if response.data:
                    batch_inserted = len(response.data)
                    results['inserted'] += batch_inserted
                    print(f"[INFO] Inserted batch of {batch_inserted} subsidies")
                else:
                    results['errors'].append("Insert returned no data")
                    
            except Exception as e:
                error_msg = str(e)
                if 'duplicate key' in error_msg.lower():
                    results['duplicates'] += len(batch)
                    print(f"[WARN] Batch contained duplicates: {len(batch)} skipped")
                else:
                    results['errors'].append(f"Batch insert error: {error_msg}")
                    print(f"[ERROR] Failed to insert batch: {error_msg}")
        
        # Log final results
        self.create_log_entry(
            'batch_insert_complete',
            f"Processed {results['total_attempted']} subsidies",
            results
        )
        
        return results
    
    def check_existing_subsidies(self, codes: List[str]) -> List[str]:
        """Check which subsidy codes already exist in the database."""
        try:
            result = self.client.table('subsidies').select('code').in_('code', codes).execute()
            existing_codes = [row['code'] for row in result.data]
            return existing_codes
        except Exception as e:
            print(f"[WARN] Could not check existing subsidies: {e}")
            return []
    
    def get_scraper_stats(self, days: int = 30) -> Dict:
        """Get scraper statistics for the last N days."""
        try:
            # This would query scraper_logs for statistics
            # Implementation depends on having scraper_logs table
            return {'message': 'Stats feature requires scraper_logs table setup'}
        except Exception as e:
            return {'error': str(e)}
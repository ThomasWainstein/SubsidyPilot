#!/usr/bin/env python3
"""
Fix Poor Quality Subsidies Script

This script identifies and fixes subsidies with poor quality data, specifically:
1. Generic "Subsidy Page" titles
2. Missing or truncated descriptions
3. Empty or malformed arrays
4. Placeholder content

It re-processes the raw logs to extract better quality data.
"""

import os
import sys
import logging
import json
from datetime import datetime
from typing import List, Dict, Any
from supabase import create_client, Client

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SubsidyQualityFixer:
    """Fix poor quality subsidy data by re-extracting from source."""
    
    def __init__(self):
        self.supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not self.supabase_url or not self.supabase_key:
            logger.error("Missing Supabase credentials")
            sys.exit(1)
        
        self.supabase = create_client(self.supabase_url, self.supabase_key)
        
    def identify_poor_quality_subsidies(self) -> List[Dict[str, Any]]:
        """Identify subsidies with poor quality data."""
        logger.info("Identifying poor quality subsidies...")
        
        # Query for subsidies with quality issues
        poor_quality_subsidies = []
        
        # 1. Subsidies with generic "Subsidy Page" title
        result = self.supabase.table('subsidies_structured').select('*').eq('title', 'Subsidy Page').execute()
        poor_quality_subsidies.extend(result.data)
        logger.info(f"Found {len(result.data)} subsidies with generic 'Subsidy Page' title")
        
        # 2. Subsidies with very short descriptions (likely truncated)
        result = self.supabase.table('subsidies_structured').select('*').execute()
        short_description_subsidies = [
            s for s in result.data 
            if s.get('description') and len(str(s['description'])) < 100
        ]
        poor_quality_subsidies.extend(short_description_subsidies)
        logger.info(f"Found {len(short_description_subsidies)} subsidies with very short descriptions")
        
        # 3. Subsidies with missing essential fields
        missing_fields_subsidies = [
            s for s in result.data 
            if not s.get('agency') or not s.get('description') or not s.get('title')
        ]
        poor_quality_subsidies.extend(missing_fields_subsidies)
        logger.info(f"Found {len(missing_fields_subsidies)} subsidies with missing essential fields")
        
        # Remove duplicates
        seen_ids = set()
        unique_poor_quality = []
        for subsidy in poor_quality_subsidies:
            if subsidy['id'] not in seen_ids:
                seen_ids.add(subsidy['id'])
                unique_poor_quality.append(subsidy)
        
        logger.info(f"Total unique poor quality subsidies: {len(unique_poor_quality)}")
        return unique_poor_quality
    
    def find_related_raw_logs(self, subsidy: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Find raw logs that might contain better data for this subsidy."""
        # Try to match by URL if available
        if subsidy.get('url'):
            result = self.supabase.table('raw_logs').select('*').execute()
            
            # Look for raw logs that mention the subsidy URL
            related_logs = []
            for log in result.data:
                payload = log.get('payload', '')
                if subsidy['url'] in payload:
                    related_logs.append(log)
            
            if related_logs:
                logger.info(f"Found {len(related_logs)} related raw logs for subsidy {subsidy['id']}")
                return related_logs
        
        # If no URL match, try matching by similar content
        if subsidy.get('agency'):
            result = self.supabase.table('raw_logs').select('*').execute()
            
            # Look for raw logs mentioning the same agency
            related_logs = []
            for log in result.data:
                payload = log.get('payload', '')
                if subsidy['agency'].lower() in payload.lower():
                    related_logs.append(log)
            
            # Limit to most recent logs to avoid processing old data
            related_logs = sorted(related_logs, key=lambda x: x['created_at'], reverse=True)[:5]
            
            if related_logs:
                logger.info(f"Found {len(related_logs)} potentially related raw logs for subsidy {subsidy['id']}")
                return related_logs
        
        return []
    
    def re_extract_subsidy_data(self, raw_log: Dict[str, Any]) -> Dict[str, Any]:
        """Re-extract subsidy data from raw log using enhanced extraction."""
        try:
            from enhanced_agent import RawLogInterpreterAgent
            
            # Initialize enhanced agent
            config = type('Config', (), {
                'SUPABASE_URL': self.supabase_url,
                'SUPABASE_SERVICE_KEY': self.supabase_key,
                'OPENAI_API_KEY': os.getenv('SCRAPER_RAW_GPT_API'),
                'OPENAI_MODEL': 'gpt-4o-mini',
                'ASSISTANT_ID': 'SCRAPER_RAW_LOGS_INTERPRETER'
            })()
            
            agent = RawLogInterpreterAgent(config)
            
            # Extract data using enhanced prompts
            payload = raw_log.get('payload', '')
            file_refs = raw_log.get('file_refs', [])
            
            # Extract file content if available
            file_content = ""
            if file_refs:
                file_content = agent.extract_file_content(file_refs)
            
            # Call OpenAI with enhanced extraction
            extracted_data = agent.call_openai_assistant(payload, file_content)
            
            # Validate and normalize
            normalized_data, audit = agent.validate_and_normalize(extracted_data)
            
            if normalized_data.get('title') and normalized_data['title'] != 'Subsidy Page':
                logger.info(f"Successfully re-extracted data with title: {normalized_data['title']}")
                return normalized_data
            else:
                logger.warning("Re-extraction still produced poor quality title")
                return {}
                
        except Exception as e:
            logger.error(f"Failed to re-extract data from raw log {raw_log['id']}: {e}")
            return {}
    
    def fix_subsidy_data(self, subsidy: Dict[str, Any], improved_data: Dict[str, Any]) -> bool:
        """Update subsidy with improved data."""
        try:
            # Prepare update data - only update fields that are genuinely improved
            update_data = {}
            
            # Update title if improved
            if (improved_data.get('title') and 
                improved_data['title'] != 'Subsidy Page' and 
                improved_data['title'] != subsidy.get('title')):
                update_data['title'] = improved_data['title']
                logger.info(f"Updating title from '{subsidy.get('title')}' to '{improved_data['title']}'")
            
            # Update description if improved (longer and more detailed)
            if (improved_data.get('description') and 
                len(str(improved_data['description'])) > len(str(subsidy.get('description', '')))):
                update_data['description'] = improved_data['description']
                logger.info("Updating description with more detailed content")
            
            # Update agency if missing or generic
            if (improved_data.get('agency') and 
                (not subsidy.get('agency') or len(subsidy.get('agency', '')) < 5)):
                update_data['agency'] = improved_data['agency']
                logger.info(f"Updating agency to '{improved_data['agency']}'")
            
            # Update arrays if they have more data
            array_fields = ['region', 'sector', 'documents', 'application_requirements']
            for field in array_fields:
                if (improved_data.get(field) and 
                    isinstance(improved_data[field], list) and 
                    len(improved_data[field]) > len(subsidy.get(field, []))):
                    update_data[field] = improved_data[field]
                    logger.info(f"Updating {field} with {len(improved_data[field])} items")
            
            # Update other important fields if missing
            important_fields = ['eligibility', 'deadline', 'amount', 'funding_type']
            for field in important_fields:
                if improved_data.get(field) and not subsidy.get(field):
                    update_data[field] = improved_data[field]
                    logger.info(f"Adding missing {field}")
            
            if update_data:
                # Add metadata about the fix
                update_data['audit'] = {
                    **subsidy.get('audit', {}),
                    'quality_fix_applied': datetime.utcnow().isoformat(),
                    'fields_improved': list(update_data.keys())
                }
                
                # Update in database
                self.supabase.table('subsidies_structured').update(update_data).eq('id', subsidy['id']).execute()
                logger.info(f"Successfully updated subsidy {subsidy['id']} with {len(update_data)} improved fields")
                return True
            else:
                logger.info(f"No improvements found for subsidy {subsidy['id']}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to update subsidy {subsidy['id']}: {e}")
            return False
    
    def run_quality_fix(self, max_records: int = 100) -> Dict[str, int]:
        """Run the complete quality fix process.
        
        Args:
            max_records: Maximum number of records to process (default: 100)
        """
        logger.info(f"Starting subsidy quality fix process (max_records={max_records})...")
        
        stats = {
            'poor_quality_found': 0,
            'processed': 0,
            'improved': 0,
            'failed': 0
        }
        
        # 1. Identify poor quality subsidies
        poor_quality_subsidies = self.identify_poor_quality_subsidies()
        stats['poor_quality_found'] = len(poor_quality_subsidies)
        
        if not poor_quality_subsidies:
            logger.info("No poor quality subsidies found!")
            return stats
        
        # 2. Process each poor quality subsidy (limited by max_records)
        process_count = min(max_records, len(poor_quality_subsidies))
        for subsidy in poor_quality_subsidies[:process_count]:
            logger.info(f"Processing subsidy {subsidy['id']}: {subsidy.get('title', 'No title')}")
            stats['processed'] += 1
            
            # Find related raw logs
            related_logs = self.find_related_raw_logs(subsidy)
            
            if not related_logs:
                logger.warning(f"No related raw logs found for subsidy {subsidy['id']}")
                stats['failed'] += 1
                continue
            
            # Try to re-extract from the most recent related log
            improved_data = self.re_extract_subsidy_data(related_logs[0])
            
            if improved_data:
                # Fix the subsidy data
                if self.fix_subsidy_data(subsidy, improved_data):
                    stats['improved'] += 1
                else:
                    stats['failed'] += 1
            else:
                logger.warning(f"Failed to improve data for subsidy {subsidy['id']}")
                stats['failed'] += 1
        
        logger.info(f"Quality fix completed. Stats: {stats}")
        return stats


def main():
    """Main entry point for the quality fix script."""
    logger.info("AgriTool Subsidy Quality Fix Tool")
    logger.info("=" * 50)
    
    # Check environment variables
    required_env_vars = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SCRAPER_RAW_GPT_API']
    missing_vars = [var for var in required_env_vars if not os.getenv(var)]
    
    if missing_vars:
        logger.error(f"Missing required environment variables: {missing_vars}")
        sys.exit(1)
    
    # Initialize and run the fixer
    fixer = SubsidyQualityFixer()
    stats = fixer.run_quality_fix()
    
    # Print final report
    print("\n" + "=" * 50)
    print("QUALITY FIX REPORT")
    print("=" * 50)
    print(f"Poor quality subsidies found: {stats['poor_quality_found']}")
    print(f"Subsidies processed: {stats['processed']}")
    print(f"Subsidies improved: {stats['improved']}")
    print(f"Failed improvements: {stats['failed']}")
    
    if stats['improved'] > 0:
        success_rate = (stats['improved'] / stats['processed']) * 100
        print(f"Success rate: {success_rate:.1f}%")
    
    print("\nRecommendations:")
    if stats['poor_quality_found'] > stats['processed']:
        remaining = stats['poor_quality_found'] - stats['processed']
        print(f"- {remaining} subsidies still need attention")
    
    if stats['failed'] > 0:
        print("- Review failed improvements for common patterns")
        print("- Consider enhancing extraction prompts further")
    
    print("- Run the scraper again with enhanced title extraction")
    print("- Monitor future extractions for quality improvements")


if __name__ == "__main__":
    main()
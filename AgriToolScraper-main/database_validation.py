#!/usr/bin/env python3
"""
Database validation script to verify FranceAgriMer subsidies are properly ingested.
This script validates the scraper's database insertion success.
"""

import os
import sys
from supabase_client import get_supabase_client

def validate_franceagrimer_data():
    """
    Validate that FranceAgriMer subsidies were successfully scraped and inserted.
    
    Returns:
        tuple: (success: bool, count: int, message: str)
    """
    print("🚨 DATABASE VALIDATION: Starting FranceAgriMer data validation")
    print("[STEP 1] Connecting to Supabase database")
    
    try:
        # Get Supabase client
        supabase = get_supabase_client()
        if not supabase:
            error_msg = "❌ VALIDATION FAILED: Could not connect to Supabase"
            print(f"[CRASH] {error_msg}")
            return False, 0, error_msg
        
        print("[EVIDENCE] Supabase client connected successfully")
        print("✅ VALIDATION: Supabase client connected successfully")
        
        # AGGRESSIVE DATABASE QUERY: Multiple search strategies for FranceAgriMer
        print("[STEP 2] Querying database for FranceAgriMer subsidies using multiple search criteria")
        
        # Strategy 1: Search by domain
        print("[EVIDENCE] Strategy 1: Searching by domain containing 'franceagrimer'")
        query_result = supabase.table("subsidies").select("*").ilike("domain", "%franceagrimer%").execute()
        domain_count = len(query_result.data) if query_result.data else 0
        print(f"[EVIDENCE] Domain search found: {domain_count} records")
        
        if not query_result.data:
            # Strategy 2: Search by agency
            print("[EVIDENCE] Strategy 2: Searching by agency containing 'franceagrimer'")
            query_result = supabase.table("subsidies").select("*").ilike("agency", "%franceagrimer%").execute()
            agency_count = len(query_result.data) if query_result.data else 0
            print(f"[EVIDENCE] Agency search found: {agency_count} records")
        
        if not query_result.data:
            # Strategy 3: Search by source_url
            print("[EVIDENCE] Strategy 3: Searching by source_url containing 'franceagrimer'")
            query_result = supabase.table("subsidies").select("*").ilike("source_url", "%franceagrimer%").execute()
            url_count = len(query_result.data) if query_result.data else 0
            print(f"[EVIDENCE] Source URL search found: {url_count} records")
        
        if not query_result.data:
            # Strategy 4: Get total count for debugging
            print("[EVIDENCE] Strategy 4: Getting total subsidy count for debugging")
            query_result = supabase.table("subsidies").select("*").execute()
            print(f"[EVIDENCE] Total subsidies in database: {len(query_result.data) if query_result.data else 0}")
        
        subsidy_count = len(query_result.data) if query_result.data else 0
        
        print(f"[STEP 3] Final validation result: {subsidy_count} subsidies found")
        print(f"🚨 VALIDATION RESULT: Found {subsidy_count} subsidies in database")
        
        if subsidy_count > 0:
            print("[ASSERTION] VALIDATION SUCCESS: FranceAgriMer subsidies found in database")
            print("[EVIDENCE] Detailed records of found FranceAgriMer subsidies:")
            
            # Log details of found subsidies with full evidence
            for i, subsidy in enumerate(query_result.data[:5]):  # Show first 5
                print(f"[DB RECORD {i+1}] ID: {subsidy.get('id', 'N/A')}")
                print(f"[DB RECORD {i+1}] Title: {subsidy.get('title', 'N/A')}")
                print(f"[DB RECORD {i+1}] Domain: {subsidy.get('domain', 'N/A')}")
                print(f"[DB RECORD {i+1}] Agency: {subsidy.get('agency', 'N/A')}")
                print(f"[DB RECORD {i+1}] Source URL: {subsidy.get('source_url', 'N/A')}")
                print(f"[DB RECORD {i+1}] Created: {subsidy.get('created_at', 'N/A')}")
                print(f"[DB RECORD {i+1}] Status: {subsidy.get('status', 'N/A')}")
                print()
            
            if subsidy_count > 5:
                print(f"[EVIDENCE] ... and {subsidy_count - 5} more subsidies not shown")
            
            success_msg = f"✅ VALIDATION SUCCESS: {subsidy_count} FranceAgriMer subsidies found in database"
            print(f"[ASSERTION] {success_msg}")
            return True, subsidy_count, success_msg
        else:
            # No subsidies found - this is a CRITICAL failure
            error_msg = "❌ VALIDATION FAILED: No FranceAgriMer subsidies found in database"
            print(f"[CRASH] {error_msg}")
            
            # AGGRESSIVE DEBUGGING: Full table analysis
            print("[STEP 4] CRITICAL FAILURE ANALYSIS: Investigating empty results")
            try:
                # Check total count
                all_subsidies = supabase.table("subsidies").select("count", count="exact").execute()
                total_count = all_subsidies.count if hasattr(all_subsidies, 'count') else 0
                print(f"[EVIDENCE] Total subsidies in table: {total_count}")
                
                if total_count == 0:
                    print("[CRASH] CRITICAL: Subsidies table is completely empty - scraper failed to insert any data")
                else:
                    print(f"[EVIDENCE] Table has {total_count} subsidies but none match FranceAgriMer criteria")
                    
                    # Sample some existing records for debugging
                    sample_query = supabase.table("subsidies").select("id, domain, agency, source_url").limit(3).execute()
                    if sample_query.data:
                        print("[EVIDENCE] Sample existing records for debugging:")
                        for i, record in enumerate(sample_query.data):
                            print(f"[SAMPLE {i+1}] ID: {record.get('id')}, Domain: {record.get('domain')}, Agency: {record.get('agency')}")
                    
            except Exception as debug_e:
                print(f"[CRASH] DEBUG ERROR: Could not analyze subsidies table: {debug_e}")
                import traceback
                print(f"[CRASH] Debug traceback: {traceback.format_exc()}")
            
            return False, 0, error_msg
            
    except Exception as e:
        error_msg = f"❌ VALIDATION ERROR: Database validation failed: {e}"
        print(f"[CRASH] {error_msg}")
        import traceback
        print(f"[CRASH] VALIDATION TRACEBACK: {traceback.format_exc()}")
        
        # Log all relevant debugging information
        print(f"[CRASH] Exception type: {type(e).__name__}")
        print(f"[CRASH] Exception message: {str(e)}")
        print(f"[CRASH] Full error context captured for debugging")
        
        return False, 0, error_msg

def main():
    """Main validation function with exit codes."""
    print("🚨 DATABASE VALIDATION SCRIPT - FRANCEAGRIMER SUBSIDIES")
    print("=" * 60)
    
    success, count, message = validate_franceagrimer_data()
    
    print("=" * 60)
    print(f"🚨 FINAL VALIDATION RESULT: {message}")
    
    if success:
        print(f"✅ SUCCESS: Database validation passed with {count} subsidies")
        sys.exit(0)
    else:
        print(f"❌ FAILURE: Database validation failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
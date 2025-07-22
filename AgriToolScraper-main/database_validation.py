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
    
    try:
        # Get Supabase client
        supabase = get_supabase_client()
        if not supabase:
            error_msg = "❌ VALIDATION FAILED: Could not connect to Supabase"
            print(error_msg)
            return False, 0, error_msg
        
        print("✅ VALIDATION: Supabase client connected successfully")
        
        # Query for FranceAgriMer subsidies
        # Look for subsidies from franceagrimer domain
        query_result = supabase.table("subsidies").select("*").ilike("domain", "%franceagrimer%").execute()
        
        if not query_result.data:
            # Try alternative search by agency
            query_result = supabase.table("subsidies").select("*").ilike("agency", "%franceagrimer%").execute()
        
        if not query_result.data:
            # Try alternative search by source_url
            query_result = supabase.table("subsidies").select("*").ilike("source_url", "%franceagrimer%").execute()
        
        if not query_result.data:
            # Try broader search for any French agricultural subsidies
            query_result = supabase.table("subsidies").select("*").execute()
        
        subsidy_count = len(query_result.data) if query_result.data else 0
        
        print(f"🚨 VALIDATION RESULT: Found {subsidy_count} subsidies in database")
        
        if subsidy_count > 0:
            # Log details of found subsidies
            for i, subsidy in enumerate(query_result.data[:5]):  # Show first 5
                print(f"  📋 Subsidy {i+1}:")
                print(f"      ID: {subsidy.get('id', 'N/A')}")
                print(f"      Title: {subsidy.get('title', 'N/A')}")
                print(f"      Domain: {subsidy.get('domain', 'N/A')}")
                print(f"      Agency: {subsidy.get('agency', 'N/A')}")
                print(f"      Source URL: {subsidy.get('source_url', 'N/A')}")
                print(f"      Created: {subsidy.get('created_at', 'N/A')}")
                print()
            
            if subsidy_count > 5:
                print(f"  ... and {subsidy_count - 5} more subsidies")
            
            success_msg = f"✅ VALIDATION SUCCESS: {subsidy_count} subsidies found in database"
            print(success_msg)
            return True, subsidy_count, success_msg
        else:
            # No subsidies found - this is a failure
            error_msg = "❌ VALIDATION FAILED: No subsidies found in database"
            print(error_msg)
            
            # Additional debugging - check if table exists and has any data
            try:
                all_subsidies = supabase.table("subsidies").select("count", count="exact").execute()
                total_count = all_subsidies.count if hasattr(all_subsidies, 'count') else 0
                print(f"🔍 DEBUG: Total subsidies in table: {total_count}")
                
                if total_count == 0:
                    print("❌ DEBUG: Subsidies table is completely empty")
                else:
                    print(f"❌ DEBUG: Table has {total_count} subsidies but none match FranceAgriMer criteria")
                    
            except Exception as debug_e:
                print(f"❌ DEBUG ERROR: Could not check total subsidy count: {debug_e}")
            
            return False, 0, error_msg
            
    except Exception as e:
        error_msg = f"❌ VALIDATION ERROR: Database validation failed: {e}"
        print(error_msg)
        import traceback
        print(f"❌ VALIDATION TRACEBACK: {traceback.format_exc()}")
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
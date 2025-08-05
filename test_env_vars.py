#!/usr/bin/env python3
"""
Fast Environment Variable Validation Test

This script validates that the required environment variables
for Supabase access and the OpenAI-powered extraction pipeline
are present and properly formatted. It runs in <1 second and fails
fast if variables are missing or invalid.

Usage:
    python test_env_vars.py

Exit codes:
    0: All variables present and valid
    1: Missing or invalid variables
"""

import os
import sys
import re
from typing import List, Tuple

def validate_supabase_url(url: str) -> Tuple[bool, str]:
    """Validate NEXT_PUBLIC_SUPABASE_URL format"""
    if not url:
        return False, "URL is empty"
    
    # Must be a valid Supabase URL format
    supabase_pattern = r'^https://[a-z0-9]+\.supabase\.co$'
    if not re.match(supabase_pattern, url):
        return False, f"Invalid Supabase URL format. Expected: https://[project-id].supabase.co, got: {url}"
    
    return True, "Valid"

def validate_service_role_key(key: str) -> Tuple[bool, str]:
    """Validate SUPABASE_SERVICE_ROLE_KEY format"""
    if not key:
        return False, "Service role key is empty"
    
    # Service role keys should start with specific prefixes and be JWT format
    if not key.startswith(('eyJ', 'sbp_')):
        return False, f"Invalid service role key format. Should start with 'eyJ' (JWT) or 'sbp_', got: {key[:10]}..."
    
    # Basic length check for JWT tokens
    if key.startswith('eyJ') and len(key) < 100:
        return False, f"Service role key too short. Expected JWT token >100 chars, got: {len(key)}"
    
    return True, "Valid"

def validate_scraper_raw_gpt_api(key: str) -> Tuple[bool, str]:
    """Basic validation for OpenAI API key"""
    if not key:
        return False, "API key is empty"
    if not key.startswith('sk-'):
        return False, "API key should start with 'sk-'"
    if len(key) < 20:
        return False, f"API key too short. Got length {len(key)}"
    return True, "Valid"

def main() -> int:
    """Main validation function"""
    print("🔍 Validating environment variables...")

    # Print found environment variables at start
    print("🔍 Environment variables found:")
    for key in [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON',
        'SUPABASE_SERVICE_ROLE_KEY',
        'SCRAPPER_RAW_GPT_API',
        'SCRAPER_RAW_GPT_API',
    ]:
        value = os.getenv(key, 'NOT_SET')
        if 'KEY' in key or 'API' in key:
            # Mask sensitive values
            masked = f"{value[:8]}..." if value != 'NOT_SET' and len(value) > 8 else value
            print(f"  {key}: {masked}")
        else:
            print(f"  {key}: {value}")
    
    required_vars = [
        ('NEXT_PUBLIC_SUPABASE_URL', validate_supabase_url),
        ('NEXT_PUBLIC_SUPABASE_ANON', lambda x: (True, "Valid") if x and len(x) > 20 else (False, "Invalid anon key")),
        ('SUPABASE_SERVICE_ROLE_KEY', validate_service_role_key),
        ('SCRAPPER_RAW_GPT_API', validate_scraper_raw_gpt_api),
        ('SCRAPER_RAW_GPT_API', validate_scraper_raw_gpt_api),
    ]
    
    errors: List[str] = []
    
    for var_name, validator in required_vars:
        value = os.environ.get(var_name)
        
        if value is None:
            errors.append(f"❌ {var_name}: Environment variable not set")
            continue
        
        is_valid, message = validator(value)
        
        if is_valid:
            print(f"✅ {var_name}: {message}")
        else:
            errors.append(f"❌ {var_name}: {message}")
    
    if errors:
        print("\n💥 VALIDATION FAILED:")
        for error in errors:
            print(f"   {error}")
        
        print(f"\n📋 REQUIRED ENVIRONMENT VARIABLES:")
        print(f"   export NEXT_PUBLIC_SUPABASE_URL='https://your-project.supabase.co'")
        print(f"   export NEXT_PUBLIC_SUPABASE_ANON='your-anon-key'")
        print(f"   export SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'")
        print(f"   export SCRAPPER_RAW_GPT_API='your-openai-api-key'")
        print(f"   export SCRAPER_RAW_GPT_API='your-openai-api-key'")
        
        return 1
    
    print("\n🎉 All environment variables are valid!")
    return 0

if __name__ == "__main__":
    exit(main())
#!/usr/bin/env python3
"""
Environment Variable Loader for AgriTool Pipeline
=================================================

This module provides consistent environment variable handling across all scripts,
ensuring compatibility between different naming conventions and preventing
env var mismatch errors.

CRITICAL: This MUST be imported at the start of EVERY Python script that uses 
database or API environment variables.

Usage:
    from utils.env_loader import load_env_vars
    load_env_vars()  # Call this FIRST in your script
"""

import os
import logging
from typing import Dict, List

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment variable mapping - handles legacy naming inconsistencies
ENV_VAR_MAPPINGS = {
    # Supabase URL variations
    'SUPABASE_URL': ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL'],
    'NEXT_PUBLIC_SUPABASE_URL': ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL'],
    
    # Supabase keys variations
    'SUPABASE_SERVICE_ROLE_KEY': ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY', 'SUPABASE_KEY'],
    'SUPABASE_SERVICE_KEY': ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY', 'SUPABASE_KEY'],
    'SUPABASE_KEY': ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY', 'SUPABASE_KEY'],
    
    # Supabase anon key variations
    'NEXT_PUBLIC_SUPABASE_ANON': ['NEXT_PUBLIC_SUPABASE_ANON', 'SUPABASE_ANON_KEY', 'SUPABASE_ANON'],
    'SUPABASE_ANON_KEY': ['NEXT_PUBLIC_SUPABASE_ANON', 'SUPABASE_ANON_KEY', 'SUPABASE_ANON'],
    
    # OpenAI API key variations
    'SCRAPER_RAW_GPT_API': ['SCRAPER_RAW_GPT_API', 'SCRAPPER_RAW_GPT_API', 'OPENAI_API_KEY'],
    'SCRAPPER_RAW_GPT_API': ['SCRAPER_RAW_GPT_API', 'SCRAPPER_RAW_GPT_API', 'OPENAI_API_KEY'],
    'OPENAI_API_KEY': ['SCRAPER_RAW_GPT_API', 'SCRAPPER_RAW_GPT_API', 'OPENAI_API_KEY'],
}

# Required environment variables for pipeline operations
REQUIRED_ENV_VARS = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SCRAPER_RAW_GPT_API'
]

def load_env_vars(debug: bool = False) -> Dict[str, str]:
    """
    Load and normalize environment variables across the entire pipeline.
    
    This function:
    1. Maps legacy variable names to current standard names
    2. Sets aliases for backward compatibility
    3. Validates required variables are present
    4. Provides debug output if requested
    
    Args:
        debug (bool): If True, print environment variable status
        
    Returns:
        Dict[str, str]: Dictionary of loaded environment variables
        
    Raises:
        ValueError: If required environment variables are missing
    """
    loaded_vars = {}
    
    if debug:
        logger.info("🔍 Loading and normalizing environment variables...")
    
    # Step 1: Load and map all environment variables
    for target_var, source_vars in ENV_VAR_MAPPINGS.items():
        value = None
        source_used = None
        
        # Try each source variable in order of preference
        for source_var in source_vars:
            value = os.environ.get(source_var)
            if value:
                source_used = source_var
                break
        
        if value:
            # Set the target variable if not already set
            if target_var not in os.environ:
                os.environ[target_var] = value
                if debug:
                    logger.info(f"✅ Mapped {source_used} -> {target_var}")
            
            loaded_vars[target_var] = value
        elif debug:
            logger.warning(f"⚠️ No value found for {target_var} (tried: {source_vars})")
    
    # Step 2: Validate required variables
    missing_vars = []
    for var in REQUIRED_ENV_VARS:
        if not os.environ.get(var):
            missing_vars.append(var)
    
    if missing_vars:
        error_msg = f"❌ Required environment variables missing: {missing_vars}"
        logger.error(error_msg)
        logger.error("💡 Available secrets should include:")
        for var in REQUIRED_ENV_VARS:
            logger.error(f"   - {var}")
        raise ValueError(error_msg)
    
    # Step 3: Debug output
    if debug:
        logger.info("📊 Environment Variable Status:")
        for var in REQUIRED_ENV_VARS:
            value = os.environ.get(var, 'NOT_SET')
            status = 'SET' if value != 'NOT_SET' else 'MISSING'
            logger.info(f"   {var}: {status}")
    
    logger.info("✅ Environment variables loaded and validated successfully")
    return loaded_vars

def get_supabase_config() -> Dict[str, str]:
    """
    Get standardized Supabase configuration.
    
    Returns:
        Dict containing 'url' and 'key' for Supabase client initialization
    """
    load_env_vars()  # Ensure variables are loaded
    
    return {
        'url': os.environ['NEXT_PUBLIC_SUPABASE_URL'],
        'key': os.environ['SUPABASE_SERVICE_ROLE_KEY']
    }

def get_openai_api_key() -> str:
    """
    Get OpenAI API key with fallback support.
    
    Returns:
        OpenAI API key string
    """
    load_env_vars()  # Ensure variables are loaded
    return os.environ['SCRAPER_RAW_GPT_API']

def validate_environment(script_name: str = "Unknown") -> bool:
    """
    Validate environment for a specific script.
    
    Args:
        script_name (str): Name of the calling script for logging
        
    Returns:
        bool: True if environment is valid
    """
    try:
        load_env_vars(debug=True)
        logger.info(f"🚀 {script_name} environment validation successful")
        return True
    except ValueError as e:
        logger.error(f"❌ {script_name} environment validation failed: {e}")
        return False

if __name__ == "__main__":
    """Test environment variable loading"""
    print("🧪 Testing environment variable loader...")
    try:
        vars_loaded = load_env_vars(debug=True)
        print(f"✅ Successfully loaded {len(vars_loaded)} environment variables")
        
        # Test specific functions
        supabase_config = get_supabase_config()
        print(f"✅ Supabase config: URL={supabase_config['url'][:50]}...")
        
        openai_key = get_openai_api_key()
        print(f"✅ OpenAI key: {openai_key[:10]}..." if openai_key else "❌ OpenAI key missing")
        
    except Exception as e:
        print(f"❌ Environment test failed: {e}")
        exit(1)
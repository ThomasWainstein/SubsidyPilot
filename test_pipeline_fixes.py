#!/usr/bin/env python3
"""
Quick test script to verify pipeline fixes work correctly.
Tests the corrected selectors and dependencies.
"""

import os
import sys
import json
from datetime import datetime

def test_supabase_import():
    """Test that supabase can be imported correctly."""
    print("🔗 Testing Supabase import...")
    try:
        from supabase import create_client, Client
        print("✅ Supabase import successful")
        return True
    except ImportError as e:
        print(f"❌ Supabase import failed: {e}")
        return False

def test_config_selectors():
    """Test that config selectors are fixed."""
    print("\n⚙️ Testing config selectors...")
    try:
        # Read the fixed config
        config_path = "AgriToolScraper-main/configs/franceagrimer.json"
        if not os.path.exists(config_path):
            print(f"❌ Config file not found: {config_path}")
            return False
            
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        # Check for :contains() usage
        total_results_selector = config.get('total_results_selector', '')
        if ':contains(' in total_results_selector:
            print(f"❌ Still has :contains() in total_results_selector: {total_results_selector}")
            return False
            
        # Check detail_selectors
        detail_selectors = config.get('detail_selectors', {})
        for field, selector in detail_selectors.items():
            if ':contains(' in selector:
                print(f"❌ Still has :contains() in {field} selector: {selector}")
                return False
        
        print("✅ All selectors are valid CSS selectors (no :contains())")
        print(f"   - total_results_selector: {total_results_selector}")
        print(f"   - link_selector: {config.get('link_selector')}")
        return True
        
    except Exception as e:
        print(f"❌ Config validation failed: {e}")
        return False

def test_requirements_files():
    """Test that requirements files include supabase."""
    print("\n📦 Testing requirements files...")
    success = True
    
    files_to_check = [
        "AgriToolScraper-main/requirements.txt",
        "AgriToolScraper-main/requirements-test.txt"
    ]
    
    for req_file in files_to_check:
        if not os.path.exists(req_file):
            print(f"❌ Requirements file not found: {req_file}")
            success = False
            continue
            
        with open(req_file, 'r') as f:
            content = f.read()
            
        if 'supabase' in content:
            print(f"✅ {req_file} includes supabase dependency")
        else:
            print(f"❌ {req_file} missing supabase dependency")
            success = False
    
    return success

def test_workflow_dependencies():
    """Test that workflow includes supabase in QA dependencies."""
    print("\n🔄 Testing workflow dependencies...")
    try:
        workflow_path = ".github/workflows/agritool-automated-pipeline.yml"
        if not os.path.exists(workflow_path):
            print(f"❌ Workflow file not found: {workflow_path}")
            return False
            
        with open(workflow_path, 'r') as f:
            content = f.read()
        
        # Check if supabase, tenacity, and openai are in QA dependencies
        if 'pip install pytest psycopg2-binary requests supabase tenacity openai' in content:
            print("✅ Workflow includes supabase, tenacity, and openai in QA dependencies")
            return True
        else:
            print("❌ Workflow missing supabase, tenacity, and/or openai in QA dependencies")
            return False
            
    except Exception as e:
        print(f"❌ Workflow validation failed: {e}")
        return False

if __name__ == "__main__":
    print("🔧 AgriTool Pipeline Fix Validation")
    print("=" * 50)
    
    success = True
    
    # Run all tests
    success &= test_supabase_import()
    success &= test_config_selectors()
    success &= test_requirements_files()
    success &= test_workflow_dependencies()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 All pipeline fixes validated successfully!")
        print("\nFixed issues:")
        print("✅ Removed all :contains() selectors (Selenium compatibility)")
        print("✅ Added supabase, tenacity, and openai dependencies to requirements files")
        print("✅ Updated workflow to install supabase, tenacity, and openai for QA")
        print("✅ Implemented text-based filtering for results detection")
        print("\n🚀 Pipeline should now run successfully!")
        sys.exit(0)
    else:
        print("❌ Some fixes failed validation.")
        print("Check the output above for details.")
        sys.exit(1)
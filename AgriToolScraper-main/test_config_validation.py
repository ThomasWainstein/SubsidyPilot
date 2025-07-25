#!/usr/bin/env python3
"""
Configuration validation test script.
Validates that all configs are consistent, selectors are config-driven, and URLs are updated.
"""

import os
import sys
import json
import traceback
from urllib.parse import urlparse

def validate_franceagrimer_config():
    """Validate FranceAgriMer config file."""
    print("🔧 Validating FranceAgriMer configuration...")
    
    config_path = "configs/franceagrimer.json"
    if not os.path.exists(config_path):
        print(f"❌ Config file not found: {config_path}")
        return False
    
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        # Validate required fields
        required_fields = ['list_page', 'link_selector']
        for field in required_fields:
            if field not in config:
                print(f"❌ Missing required field in config: {field}")
                return False
        
        # Validate URL format
        list_page = config['list_page']
        if not list_page.startswith('https://www.franceagrimer.fr/rechercher-une-aide'):
            print(f"❌ Invalid list_page URL: {list_page}")
            print("   Expected: https://www.franceagrimer.fr/rechercher-une-aide")
            return False
        
        # Validate selectors
        link_selector = config['link_selector']
        if not link_selector or len(link_selector.strip()) == 0:
            print(f"❌ Invalid link_selector: {link_selector}")
            return False
        
        print(f"✅ Config validation passed")
        print(f"   list_page: {list_page}")
        print(f"   link_selector: {link_selector}")
        
        return True
        
    except Exception as e:
        print(f"❌ Config validation failed: {e}")
        return False

def validate_all_url_references():
    """Validate that all URL references use the correct FranceAgriMer endpoint."""
    print("\n📋 Validating URL references across all files...")
    
    correct_url = "https://www.franceagrimer.fr/rechercher-une-aide"
    old_url = "https://www.franceagrimer.fr/Accompagner/Dispositifs-par-filiere/Aides-nationales"
    
    files_to_check = [
        ".env.example",
        "job_controller.py", 
        "scraper_main.py",
        "test_frances_scraper.py",
        "configs/franceagrimer.json",
        "../.github/workflows/agritool-scraper-franceagrimer.yml",
        "../.github/workflows/franceagrimer-scraper.yml",
        "RUN_SCRAPER.md"
    ]
    
    issues_found = []
    
    for file_path in files_to_check:
        if not os.path.exists(file_path):
            print(f"⚠️ File not found (skipping): {file_path}")
            continue
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if old_url in content:
                issues_found.append(f"❌ {file_path}: Contains old URL: {old_url}")
            
            if correct_url in content:
                print(f"✅ {file_path}: Uses correct URL")
            elif "franceagrimer.fr" in content:
                issues_found.append(f"⚠️ {file_path}: Contains FranceAgriMer references but not the correct URL")
                
        except Exception as e:
            print(f"❌ Error reading {file_path}: {e}")
            issues_found.append(f"❌ {file_path}: Read error: {e}")
    
    if issues_found:
        print("\n🚨 URL Reference Issues Found:")
        for issue in issues_found:
            print(f"   {issue}")
        return False
    else:
        print("✅ All URL references validated")
        return True

def validate_config_manager():
    """Validate SecureConfigManager has required methods."""
    print("\n🔧 Validating SecureConfigManager...")
    
    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from config_manager import SecureConfigManager
        
        # Test instance creation
        test_url = "https://www.franceagrimer.fr/rechercher-une-aide"
        config_manager = SecureConfigManager(test_url, "test_session")
        
        # Test required methods exist
        required_methods = ['get_config', 'load_config', 'get_link_selector', 'get_list_page_url']
        for method in required_methods:
            if not hasattr(config_manager, method):
                print(f"❌ Missing method: {method}")
                return False
            
            if not callable(getattr(config_manager, method)):
                print(f"❌ {method} is not callable")
                return False
        
        # Test get_config method works
        try:
            config = config_manager.get_config()
            if not isinstance(config, dict):
                print(f"❌ get_config() should return dict, got {type(config)}")
                return False
            
            print(f"✅ get_config() returns: {list(config.keys())}")
            
        except Exception as e:
            print(f"❌ get_config() failed: {e}")
            return False
        
        print("✅ SecureConfigManager validation passed")
        return True
        
    except Exception as e:
        print(f"❌ SecureConfigManager validation failed: {e}")
        print(f"   Traceback: {traceback.format_exc()}")
        return False

def validate_no_hardcoded_selectors():
    """Validate that no hardcoded selectors exist in critical functions."""
    print("\n🔍 Validating no hardcoded selectors...")
    
    files_to_check = [
        "scraper/core.py",
        "scraper/runner.py", 
        "scraper/discovery.py",
        "scraper_main.py"
    ]
    
    hardcoded_patterns = [
        'a[rel="bookmark"]',
        'a[rel=bookmark]',
        '"h3 a[href*=\'/aides/\']"'  # Should be config-driven
    ]
    
    issues_found = []
    
    for file_path in files_to_check:
        if not os.path.exists(file_path):
            print(f"⚠️ File not found (skipping): {file_path}")
            continue
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            for pattern in hardcoded_patterns:
                if pattern in content:
                    # Check if it's in a comment or test context
                    lines = content.split('\n')
                    for i, line in enumerate(lines):
                        if pattern in line:
                            if line.strip().startswith('#') or 'test' in line.lower() or 'fallback' in line.lower():
                                continue  # Allow in comments, tests, or fallbacks
                            else:
                                issues_found.append(f"❌ {file_path}:{i+1}: Hardcoded selector: {pattern}")
                
        except Exception as e:
            print(f"❌ Error checking {file_path}: {e}")
    
    if issues_found:
        print("🚨 Hardcoded Selector Issues Found:")
        for issue in issues_found:
            print(f"   {issue}")
        return False
    else:
        print("✅ No problematic hardcoded selectors found")
        return True

def test_scraper_initialization():
    """Test that scraper can be initialized properly."""
    print("\n🚀 Testing scraper initialization...")
    
    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from scraper_main import AgriToolScraper
        
        test_url = "https://www.franceagrimer.fr/rechercher-une-aide"
        
        # Test dry run initialization
        scraper = AgriToolScraper(test_url, dry_run=True)
        
        # Verify initialization
        if scraper.target_url != test_url:
            print(f"❌ Wrong target_url: {scraper.target_url}")
            return False
        
        if not hasattr(scraper, 'config_manager'):
            print("❌ Missing config_manager")
            return False
        
        if not hasattr(scraper, 'isolation_manager'):
            print("❌ Missing isolation_manager")
            return False
        
        # Test config access
        try:
            config = scraper.config_manager.get_config()
            print(f"✅ Config loaded: {list(config.keys())}")
        except Exception as e:
            print(f"❌ Config loading failed: {e}")
            return False
        
        print("✅ Scraper initialization test passed")
        return True
        
    except Exception as e:
        print(f"❌ Scraper initialization test failed: {e}")
        print(f"   Traceback: {traceback.format_exc()}")
        return False

def main():
    """Run all validation tests."""
    print("🔥 FranceAgriMer Scraper Configuration Validation")
    print("=" * 60)
    
    tests = [
        ("Config File Validation", validate_franceagrimer_config),
        ("URL Reference Validation", validate_all_url_references), 
        ("Config Manager Validation", validate_config_manager),
        ("Hardcoded Selector Check", validate_no_hardcoded_selectors),
        ("Scraper Initialization Test", test_scraper_initialization)
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        print(f"\n{'='*60}")
        print(f"🧪 Running: {test_name}")
        print('='*60)
        
        try:
            if test_func():
                print(f"✅ {test_name}: PASSED")
                passed += 1
            else:
                print(f"❌ {test_name}: FAILED")
                failed += 1
        except Exception as e:
            print(f"💥 {test_name}: CRASHED - {e}")
            print(f"   Traceback: {traceback.format_exc()}")
            failed += 1
    
    print(f"\n{'='*60}")
    print(f"🏁 VALIDATION SUMMARY")
    print('='*60)
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"📊 Total:  {passed + failed}")
    
    if failed == 0:
        print("\n🎉 ALL VALIDATIONS PASSED - Scraper is ready!")
        return True
    else:
        print(f"\n🚨 {failed} VALIDATION(S) FAILED - Issues must be fixed!")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
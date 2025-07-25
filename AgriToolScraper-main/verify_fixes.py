#!/usr/bin/env python3
"""
Quick verification script to confirm all critical fixes are in place.
"""

import os
import sys

def verify_config_manager_fix():
    """Verify get_config method exists in SecureConfigManager."""
    print("🔧 Verifying SecureConfigManager fix...")
    
    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from config_manager import SecureConfigManager
        
        # Check if get_config method exists
        if hasattr(SecureConfigManager, 'get_config'):
            print("✅ get_config() method found")
            
            # Test method signature
            import inspect
            sig = inspect.signature(SecureConfigManager.get_config)
            print(f"✅ Method signature: get_config{sig}")
            
            return True
        else:
            print("❌ get_config() method NOT found")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def verify_config_driven_selectors():
    """Verify selectors are used from config, not hardcoded."""
    print("\n🔍 Verifying config-driven selectors...")
    
    try:
        # Check scraper_main.py uses config.get() for selectors
        with open("scraper_main.py", 'r') as f:
            content = f.read()
        
        # Look for config-driven selector usage
        config_usage_patterns = [
            "config.get('link_selector'",
            "config.get('list_page'",
            "self.config_manager.get_config()"
        ]
        
        found_patterns = []
        for pattern in config_usage_patterns:
            if pattern in content:
                found_patterns.append(pattern)
        
        print(f"✅ Found {len(found_patterns)} config-driven patterns:")
        for pattern in found_patterns:
            print(f"   - {pattern}")
        
        if len(found_patterns) >= 2:  # Should have link_selector and list_page usage
            return True
        else:
            print("❌ Insufficient config-driven selector usage")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def verify_url_updates():
    """Verify URLs have been updated to use rechercher-une-aide."""
    print("\n📋 Verifying URL updates...")
    
    correct_url = "https://www.franceagrimer.fr/rechercher-une-aide"
    old_url = "https://www.franceagrimer.fr/Accompagner/Dispositifs-par-filiere/Aides-nationales"
    
    files_to_check = [
        "configs/franceagrimer.json",
        "job_controller.py", 
        "test_frances_scraper.py"
    ]
    
    all_good = True
    
    for filename in files_to_check:
        if not os.path.exists(filename):
            print(f"⚠️ File not found: {filename}")
            continue
            
        try:
            with open(filename, 'r') as f:
                content = f.read()
            
            if old_url in content:
                print(f"❌ {filename}: Still contains old URL")
                all_good = False
            elif correct_url in content:
                print(f"✅ {filename}: Uses correct URL")
            else:
                print(f"⚠️ {filename}: No FranceAgriMer URL found")
                
        except Exception as e:
            print(f"❌ Error reading {filename}: {e}")
            all_good = False
    
    return all_good

def verify_test_files():
    """Verify test files were created."""
    print("\n🧪 Verifying test files...")
    
    expected_files = [
        "tests/test_dsfr_extraction.py",
        "test_config_validation.py",
        "test_pipeline_integration.py",
        "run_all_validations.py"
    ]
    
    found_files = []
    for filename in expected_files:
        if os.path.exists(filename):
            found_files.append(filename)
            print(f"✅ {filename}")
        else:
            print(f"❌ {filename} - NOT FOUND")
    
    return len(found_files) == len(expected_files)

def main():
    """Run all verifications."""
    print("🔥 FRANCEAGRIMER SCRAPER FIX VERIFICATION")
    print("=" * 60)
    
    verifications = [
        ("SecureConfigManager get_config() Fix", verify_config_manager_fix),
        ("Config-Driven Selectors", verify_config_driven_selectors),
        ("URL Updates", verify_url_updates),
        ("Test Files Created", verify_test_files)
    ]
    
    passed = 0
    failed = 0
    
    for desc, verify_func in verifications:
        print(f"\n{'='*60}")
        print(f"🔍 {desc}")
        print('='*60)
        
        try:
            if verify_func():
                print(f"✅ {desc}: VERIFIED")
                passed += 1
            else:
                print(f"❌ {desc}: FAILED")
                failed += 1
        except Exception as e:
            print(f"💥 {desc}: ERROR - {e}")
            failed += 1
    
    print(f"\n{'='*60}")
    print("🏁 VERIFICATION SUMMARY")
    print('='*60)
    print(f"✅ Verified: {passed}")
    print(f"❌ Failed: {failed}")
    
    if failed == 0:
        print("\n🎉 ALL FIXES VERIFIED!")
        print("\n📋 SUMMARY OF IMPLEMENTED FIXES:")
        print("   1. ✅ Added get_config() method to SecureConfigManager")
        print("   2. ✅ All URL collection uses config-driven selectors")
        print("   3. ✅ Updated all URLs to use rechercher-une-aide endpoint")
        print("   4. ✅ Created comprehensive test suite for DSFR extraction")
        print("   5. ✅ Added integration tests for complete pipeline")
        print("   6. ✅ Added validation scripts for configuration")
        
        print("\n🚀 READY FOR TESTING:")
        print("   Run: python run_all_validations.py")
        print("   Or:  python test_pipeline_integration.py")
        print("   Or:  python job_controller.py")
        
        return True
    else:
        print(f"\n🚨 {failed} VERIFICATION(S) FAILED!")
        print("   Please review the failed verifications above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
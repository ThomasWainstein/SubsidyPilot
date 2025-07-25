#!/usr/bin/env python3
"""
Comprehensive validation runner that executes all tests and validations.
This script verifies that all fixes have been properly implemented.
"""

import os
import sys
import subprocess
import traceback
from datetime import datetime

def run_command(command, description, timeout=120):
    """Run a command and return success status with output."""
    print(f"\n🔧 {description}")
    print(f"   Command: {' '.join(command)}")
    print("-" * 60)
    
    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=os.path.dirname(os.path.abspath(__file__))
        )
        
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        
        if result.returncode == 0:
            print(f"✅ {description}: SUCCESS")
            return True, result.stdout
        else:
            print(f"❌ {description}: FAILED (exit code: {result.returncode})")
            return False, result.stderr
            
    except subprocess.TimeoutExpired:
        print(f"⏰ {description}: TIMEOUT after {timeout}s")
        return False, "Command timed out"
    except Exception as e:
        print(f"💥 {description}: EXCEPTION - {e}")
        return False, str(e)

def main():
    """Run all validations and tests."""
    start_time = datetime.now()
    
    print("🔥 COMPREHENSIVE FRANCEAGRIMER SCRAPER VALIDATION")
    print("=" * 80)
    print(f"Start time: {start_time}")
    print("=" * 80)
    
    validations = [
        # Basic configuration validation
        ([sys.executable, "test_config_validation.py"], 
         "Configuration Validation"),
        
        # Unit tests for DSFR extraction
        ([sys.executable, "-m", "pytest", "tests/test_dsfr_extraction.py", "-v"], 
         "DSFR Extraction Unit Tests"),
        
        # Integration tests for complete pipeline
        ([sys.executable, "test_pipeline_integration.py"], 
         "Pipeline Integration Tests"),
        
        # Selenium compliance validation 
        ([sys.executable, "selenium_compliance_validator.py"], 
         "Selenium 4+ Compliance Check"),
        
        # Driver initialization test
        ([sys.executable, "test_driver_compliance.py"], 
         "Driver Initialization Test"),
        
        # Quick scraper functionality test
        ([sys.executable, "test_frances_scraper.py"], 
         "FranceAgriMer Scraper Functionality Test")
    ]
    
    passed = 0
    failed = 0
    results = []
    
    for command, description in validations:
        success, output = run_command(command, description)
        
        results.append({
            'name': description,
            'success': success,
            'output': output[:500] if output else ""  # Truncate for summary
        })
        
        if success:
            passed += 1
        else:
            failed += 1
    
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    print("\n" + "=" * 80)
    print("🏁 VALIDATION SUMMARY")
    print("=" * 80)
    print(f"⏱️  Duration: {duration:.1f} seconds")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"📊 Total:  {passed + failed}")
    
    print("\n📋 DETAILED RESULTS:")
    for result in results:
        status = "✅ PASS" if result['success'] else "❌ FAIL"
        print(f"   {status} - {result['name']}")
    
    if failed == 0:
        print("\n🎉 ALL VALIDATIONS PASSED!")
        print("\n🚀 NEXT STEPS:")
        print("   1. The FranceAgriMer scraper is now fully functional")
        print("   2. All config-driven selectors are working correctly") 
        print("   3. Domain isolation is enforced")
        print("   4. DSFR extraction handles French Design System properly")
        print("   5. URL collection uses the correct endpoint")
        print("\n💡 To run the production scraper:")
        print("   python job_controller.py")
        print("   OR")
        print("   python scraper_main.py --url https://www.franceagrimer.fr/rechercher-une-aide --max-pages 2")
        
        return True
    else:
        print(f"\n🚨 {failed} VALIDATION(S) FAILED!")
        print("\n🔧 ISSUES TO FIX:")
        for result in results:
            if not result['success']:
                print(f"   ❌ {result['name']}")
                if result['output']:
                    print(f"      Error: {result['output'][:200]}...")
        
        print("\n💡 TROUBLESHOOTING:")
        print("   1. Check that all dependencies are installed:")
        print("      pip install -r requirements.txt")
        print("      pip install -r requirements-test.txt")
        print("   2. Ensure Chrome/Chromium is installed for Selenium tests")
        print("   3. Verify network connectivity to franceagrimer.fr")
        print("   4. Review the specific error messages above")
        
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
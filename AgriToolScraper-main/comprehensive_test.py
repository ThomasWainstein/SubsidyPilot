#!/usr/bin/env python3
"""
Comprehensive test script that combines driver testing and database validation.
This script implements the AGGRESSIVE TECHNICAL DEBUGGING requirements.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from force_execution_test import test_chrome_driver_selection
from analyze_driver_directory import analyze_chrome_driver_directory
from database_validation import validate_franceagrimer_data
from debug_diagnostics import log_step, log_error

def comprehensive_driver_and_db_test():
    """
    Execute comprehensive testing as demanded in the aggressive technical prompt.
    
    This covers:
    1. Driver directory analysis
    2. Driver selection and initialization testing
    3. Database validation
    4. Full evidence collection
    
    Returns:
        bool: True if all tests pass, False otherwise
    """
    print("🚨 COMPREHENSIVE AGGRESSIVE TECHNICAL TEST SUITE")
    print("=" * 80)
    
    test_results = {
        "directory_analysis": False,
        "driver_selection": False,
        "database_validation": False
    }
    
    # STEP 1: DIRECTORY ANALYSIS
    print("\n[STEP 1] DIRECTORY ANALYSIS")
    print("-" * 40)
    try:
        log_step("🚨 STEP 1: Starting directory analysis")
        analyze_chrome_driver_directory()
        test_results["directory_analysis"] = True
        log_step("✅ STEP 1: Directory analysis completed")
    except Exception as e:
        log_error(f"❌ STEP 1 FAILED: Directory analysis error: {e}")
        test_results["directory_analysis"] = False
    
    # STEP 2: DRIVER SELECTION TEST
    print("\n[STEP 2] DRIVER SELECTION TEST")
    print("-" * 40)
    try:
        log_step("🚨 STEP 2: Starting driver selection test")
        driver_success = test_chrome_driver_selection()
        test_results["driver_selection"] = driver_success
        if driver_success:
            log_step("✅ STEP 2: Driver selection test passed")
        else:
            log_error("❌ STEP 2: Driver selection test failed")
    except Exception as e:
        log_error(f"❌ STEP 2 FAILED: Driver selection error: {e}")
        test_results["driver_selection"] = False
    
    # STEP 3: DATABASE VALIDATION
    print("\n[STEP 3] DATABASE VALIDATION")
    print("-" * 40)
    try:
        log_step("🚨 STEP 3: Starting database validation")
        db_success, db_count, db_message = validate_franceagrimer_data()
        test_results["database_validation"] = db_success
        
        if db_success:
            log_step(f"✅ STEP 3: Database validation passed - {db_count} subsidies found")
        else:
            log_error(f"❌ STEP 3: Database validation failed - {db_message}")
    except Exception as e:
        log_error(f"❌ STEP 3 FAILED: Database validation error: {e}")
        test_results["database_validation"] = False
    
    # FINAL RESULTS
    print("\n" + "=" * 80)
    print("🚨 COMPREHENSIVE TEST RESULTS SUMMARY")
    print("=" * 80)
    
    all_passed = True
    for test_name, result in test_results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"  {test_name.upper().replace('_', ' ')}: {status}")
        if not result:
            all_passed = False
    
    print("=" * 80)
    
    if all_passed:
        print("🎉 ALL TESTS PASSED: Comprehensive validation successful")
        return True
    else:
        print("💥 TESTS FAILED: One or more validation steps failed")
        return False

def main():
    """Main function with exit codes for CI/CD integration."""
    success = comprehensive_driver_and_db_test()
    
    if success:
        print("\n✅ COMPREHENSIVE TEST SUITE: SUCCESS")
        sys.exit(0)
    else:
        print("\n❌ COMPREHENSIVE TEST SUITE: FAILURE")
        sys.exit(1)

if __name__ == "__main__":
    main()
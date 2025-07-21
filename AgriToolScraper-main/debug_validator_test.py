#!/usr/bin/env python3
"""
Debug script to test validator on specific patterns and identify false positives.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from selenium_compliance_validator import ComplianceValidator

def test_specific_patterns():
    """Test specific patterns that should NOT be flagged."""
    validator = ComplianceValidator()
    
    # Test patterns that should NOT trigger violations
    test_cases = [
        'print("❌ Never use chrome_options= or firefox_options=")',
        '# Legacy pattern: chrome_options=opts  # SELENIUM_COMPLIANCE_ALLOW',
        'bad_example = "webdriver.Chrome(chrome_options=options)"',
        'driver = webdriver.Chrome(service=service, options=options)',
        'logging.error("Legacy chrome_options parameter detected")'
    ]
    
    print("🔍 Testing specific patterns for false positives...")
    
    for i, pattern in enumerate(test_cases):
        print(f"\n📝 Testing pattern {i+1}: {pattern}")
        
        # Create temp file
        temp_file = f'temp_test_{i}.py'
        try:
            with open(temp_file, 'w') as f:
                f.write(f'from selenium import webdriver\n{pattern}\n')
            
            violations = validator.scan_file(temp_file)
            
            if violations:
                print(f"❌ FALSE POSITIVE DETECTED:")
                for violation in violations:
                    print(f"   - {violation}")
            else:
                print(f"✅ Correctly ignored (no false positive)")
                
        finally:
            if os.path.exists(temp_file):
                os.remove(temp_file)

def test_legacy_patterns():
    """Test patterns that SHOULD be flagged."""
    validator = ComplianceValidator()
    
    # Test patterns that SHOULD trigger violations
    legacy_cases = [
        'driver = webdriver.Chrome(chrome_options=options)',
        'driver = webdriver.Chrome(executable_path="/path")',
        'driver = webdriver.Chrome("/path", options)',
        'driver = webdriver.Firefox(firefox_options=options)'
    ]
    
    print("\n🚨 Testing legacy patterns that SHOULD be flagged...")
    
    for i, pattern in enumerate(legacy_cases):
        print(f"\n📝 Testing legacy pattern {i+1}: {pattern}")
        
        # Create temp file
        temp_file = f'temp_legacy_{i}.py'
        try:
            with open(temp_file, 'w') as f:
                f.write(f'from selenium import webdriver\n{pattern}\n')
            
            violations = validator.scan_file(temp_file)
            
            if violations:
                print(f"✅ Correctly flagged as violation:")
                for violation in violations:
                    print(f"   - {violation}")
            else:
                print(f"❌ FALSE NEGATIVE: Legacy pattern not detected!")
                
        finally:
            if os.path.exists(temp_file):
                os.remove(temp_file)

if __name__ == "__main__":
    print("🧪 DEBUGGING VALIDATOR BEHAVIOR")
    print("=" * 60)
    
    test_specific_patterns()
    test_legacy_patterns()
    
    print("\n" + "=" * 60)
    print("🔍 Debug testing complete")
#!/usr/bin/env python3
"""
Unit tests for Selenium compliance validator.
Tests both compliant and legacy code patterns.
"""

import sys
import os

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from selenium_compliance_validator import ComplianceValidator

def test_compliant_code():
    """Test that compliant code passes validation."""
    print("Testing compliant code (should pass)...")
    validator = ComplianceValidator()
    violations = validator.scan_file('tests/test_compliant_code.py')
    
    if violations:
        print('❌ FALSE POSITIVE: Compliant code flagged')
        for violation in violations:
            print(f"  - {violation}")
        sys.exit(1)
    else:
        print('✅ Compliant code validation passed')

def test_legacy_code():
    """Test that legacy code triggers violations."""
    print("Testing legacy code (should fail)...")
    validator = ComplianceValidator()
    violations = validator.scan_file('tests/test_legacy_violations.py')
    
    if not violations:
        print('❌ FALSE NEGATIVE: Legacy violations not detected')
        sys.exit(1)
    else:
        print(f'✅ Legacy violations detected correctly: {len(violations)} violations')

def test_documentation_examples():
    """Test that documentation examples with allow directives pass."""
    print("Testing documentation examples (should pass)...")
    validator = ComplianceValidator()
    violations = validator.scan_file('tests/test_documentation_examples.py')
    
    if violations:
        print('❌ FALSE POSITIVE: Documentation examples flagged')
        for violation in violations:
            print(f"  - {violation}")
        sys.exit(1)
    else:
        print('✅ Documentation examples validation passed')

def test_print_statements():
    """Test that print statements mentioning forbidden patterns are ignored."""
    print("Testing print statements (should pass)...")
    validator = ComplianceValidator()
    violations = validator.scan_file('tests/test_print_statements.py')
    
    if violations:
        print('❌ FALSE POSITIVE: Print statements flagged')
        for violation in violations:
            print(f"  - {violation}")
        sys.exit(1)
    else:
        print('✅ Print statements validation passed')

if __name__ == "__main__":
    print("🧪 RUNNING VALIDATOR UNIT TESTS")
    print("=" * 50)
    
    try:
        test_compliant_code()
        test_legacy_code()
        test_documentation_examples()
        test_print_statements()
        
        print("=" * 50)
        print("🎉 ALL UNIT TESTS PASSED")
        print("✅ Validator is working correctly")
        
    except Exception as e:
        print(f"❌ UNIT TEST FAILED: {e}")
        sys.exit(1)
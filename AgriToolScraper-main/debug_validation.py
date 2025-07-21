#!/usr/bin/env python3
"""
DEBUGGING SCRIPT - Find exact lines causing CI failures
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from selenium_compliance_validator import ComplianceValidator

def debug_specific_files():
    """Debug the specific files that are likely causing failures."""
    
    # Files mentioned in previous error logs
    problematic_files = [
        'scraper/core.py',
        'SELENIUM_4_COMPLIANCE_MANIFEST.md',
        'validate_selenium_compliance.py'
    ]
    
    validator = ComplianceValidator()
    
    print("🔍 DEBUGGING SPECIFIC FILES THAT WERE FAILING IN CI")
    print("=" * 70)
    
    for file_path in problematic_files:
        full_path = os.path.join('.', file_path)
        
        if not os.path.exists(full_path):
            print(f"\n📁 FILE: {file_path}")
            print(f"❌ FILE NOT FOUND - SKIPPING")
            continue
            
        print(f"\n📁 FILE: {file_path}")
        print(f"📂 EXISTS: {os.path.exists(full_path)}")
        print("-" * 50)
        
        violations = validator.scan_file(full_path)
        
        if violations:
            print(f"❌ VIOLATIONS FOUND: {len(violations)}")
            for v in violations:
                print(f"   - Pattern: {v[0]}, Line: {v[1]}, Content: {v[2][:60]}...")
        else:
            print(f"✅ NO VIOLATIONS - THIS FILE IS CLEAN")
        
        # Show first few lines of actual content
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()[:20]  # First 20 lines
            
            print(f"\n📝 FIRST 20 LINES OF FILE:")
            for i, line in enumerate(lines, 1):
                if 'webdriver' in line.lower() or 'chrome' in line.lower() or 'firefox' in line.lower():
                    print(f"  {i:3d}: 🔍 {line.rstrip()}")
                else:
                    print(f"  {i:3d}:     {line.rstrip()}")
        except Exception as e:
            print(f"❌ Could not read file: {e}")

def test_compliant_patterns():
    """Test individual compliant patterns."""
    
    validator = ComplianceValidator()
    
    test_lines = [
        "driver = webdriver.Chrome(service=service, options=options)",
        "driver = webdriver.Firefox(service=service, options=options)",
        "driver = webdriver.Chrome(options=options, service=service)",
        "driver = webdriver.Firefox(options=options, service=service)",
    ]
    
    print("\n🧪 TESTING INDIVIDUAL COMPLIANT PATTERNS")
    print("=" * 50)
    
    for line in test_lines:
        print(f"\n📝 Testing: {line}")
        print(f"   ✅ Is compliant? {validator.is_compliant_pattern(line)}")
        print(f"   🔍 Has ignore? {validator.has_ignore_directive(line)}")
        
        # Test against forbidden patterns
        from selenium_compliance_validator import FORBIDDEN_PATTERNS
        for pattern_name, pattern_info in FORBIDDEN_PATTERNS.items():
            import re
            matches = bool(re.search(pattern_info['regex'], line))
            if matches:
                print(f"   ❌ MATCHES FORBIDDEN: {pattern_name} -> {pattern_info['regex']}")

if __name__ == "__main__":
    debug_specific_files()
    test_compliant_patterns()
    
    # Run the comprehensive test
    print("\n" + "=" * 70)
    print("🔥 RUNNING COMPREHENSIVE VALIDATOR TEST")
    from run_validator_tests import main as run_tests
    success = run_tests()
    
    print(f"\n🎯 FINAL RESULT: {'SUCCESS' if success else 'FAILURE'}")
    if not success:
        print("❌ VALIDATOR IS NOT READY FOR CI/CD")
        print("❌ MUST FIX FALSE POSITIVES BEFORE PUSHING")
    else:
        print("✅ VALIDATOR IS READY FOR CI/CD")
        print("✅ SAFE TO COMMIT AND PUSH")
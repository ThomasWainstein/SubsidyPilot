#!/usr/bin/env python3
"""
Array Fix Validation Script for AgriTool Raw Log Interpreter

Validates that array enforcement is working correctly before production deployment.
"""

import json
import sys
import os
from typing import Dict, Any, List

# Add the current directory to path to import agent
sys.path.append(os.path.dirname(__file__))

def test_enforce_array():
    """Test the enforce_array function with various inputs"""
    from agent import LogInterpreterAgent, Config
    
    # Create dummy config and agent for testing
    config = Config.__new__(Config)
    config.LOG_LEVEL = "INFO"
    agent = LogInterpreterAgent.__new__(LogInterpreterAgent)
    
    test_cases = [
        # (input, expected_output, description)
        (None, [], "None should become empty array"),
        ("", [], "Empty string should become empty array"),
        ([], [], "Empty array should stay empty array"),
        ([1, 2, 3], [1, 2, 3], "Existing array should remain unchanged"),
        ("single_value", ["single_value"], "Single string should become array"),
        (42, [42], "Single number should become array"),
        ("cereal, livestock", ["cereal", "livestock"], "Comma-separated should split"),
        ("  item1  ,  item2  ", ["item1", "item2"], "Comma-separated with spaces should trim"),
        ("single,", ["single"], "Trailing comma should be handled"),
        (",leading", ["leading"], "Leading comma should be handled"),
        ({"key": "value"}, [{"key": "value"}], "Object should become array"),
        (True, [True], "Boolean should become array"),
    ]
    
    print("🧪 Testing enforce_array function...")
    all_passed = True
    
    for i, (input_val, expected, description) in enumerate(test_cases, 1):
        try:
            result = agent.enforce_array(input_val)
            if result == expected:
                print(f"✅ Test {i}: {description}")
            else:
                print(f"❌ Test {i}: {description}")
                print(f"   Input: {input_val}")
                print(f"   Expected: {expected}")
                print(f"   Got: {result}")
                all_passed = False
        except Exception as e:
            print(f"❌ Test {i}: {description} - Exception: {e}")
            all_passed = False
    
    return all_passed

def validate_sample_payload():
    """Validate a sample extracted payload has all array fields as arrays"""
    print("\n🔍 Validating sample payload array enforcement...")
    
    # Sample extracted data that might come from OpenAI
    sample_data = {
        "url": "https://example.com/subsidy",
        "title": "Digital Agriculture Support",
        "description": "Financial support for digital farming technologies.",
        "eligibility": "Available to agricultural cooperatives",
        "amount": 5000,  # This should become [5000]
        "region": "PACA",  # This should become ["PACA"]
        "sector": "viticulture, aromatics",  # This should become ["viticulture", "aromatics"]
        "legal_entity_type": "EARL",  # This should become ["EARL"]
        "documents": ["Business plan", "Financial statements"],  # Already array
        "objectives": None,  # Should become []
        "beneficiary_types": "",  # Should become []
        "investment_types": 42,  # Should become [42]
    }
    
    from agent import LogInterpreterAgent, Config
    config = Config.__new__(Config)
    agent = LogInterpreterAgent.__new__(LogInterpreterAgent)
    
    # Simulate the validation process
    try:
        normalized_data, audit = agent.validate_and_normalize(sample_data)
        
        # Check all array fields
        array_fields = [
            "amount", "region", "sector", "documents", "priority_groups", 
            "application_requirements", "questionnaire_steps", "legal_entity_type",
            "objectives", "eligible_actions", "ineligible_actions", 
            "beneficiary_types", "investment_types", "rejection_conditions"
        ]
        
        errors = []
        for field in array_fields:
            if field in normalized_data:
                value = normalized_data[field]
                if not isinstance(value, list):
                    errors.append(f"{field} is not an array: {type(value)} = {value}")
                else:
                    print(f"✅ {field}: {value}")
        
        if errors:
            print("❌ Array validation failed:")
            for error in errors:
                print(f"   {error}")
            return False
        else:
            print("✅ All array fields validated successfully!")
            return True
            
    except Exception as e:
        print(f"❌ Validation failed with exception: {e}")
        return False

def main():
    """Run all validation tests"""
    print("🚀 AgriTool Array Fix Validation\n")
    
    success = True
    
    # Test enforce_array function
    if not test_enforce_array():
        success = False
    
    # Test sample payload validation
    if not validate_sample_payload():
        success = False
    
    print("\n" + "="*50)
    if success:
        print("✅ ALL TESTS PASSED! Array enforcement is working correctly.")
        print("\nReady for production deployment:")
        print("1. Array fields will be properly enforced")
        print("2. Database insert errors should be eliminated")
        print("3. Comma-separated values will be properly split")
    else:
        print("❌ TESTS FAILED! Fix the issues before deploying.")
        sys.exit(1)

if __name__ == "__main__":
    main()
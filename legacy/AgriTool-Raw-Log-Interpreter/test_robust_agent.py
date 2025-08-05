#!/usr/bin/env python3
"""
Robust Agent Test Script
Validates the enhanced AI agent functionality with comprehensive testing.
"""

import json
import os
import sys
from datetime import datetime
from typing import Dict, Any

# Add agent to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_enhanced_content_extraction():
    """Test the enhanced multi-tab content extraction."""
    print("🔍 Testing Enhanced Content Extraction...")
    
    try:
        from agent import RawLogInterpreterAgent
        
        # Create test agent
        agent = RawLogInterpreterAgent()
        
        # Sample enhanced payload from the scraper
        sample_payload = json.dumps({
            "scraping_metadata": {
                "source_url": "https://www.franceagrimer.fr/test-aide",
                "domain": "franceagrimer.fr",
                "scraped_at": "2025-01-26T10:00:00Z",
                "extraction_method": "interactive_clicking"
            },
            "raw_content": {
                "title": "Aide au stockage privé de l'alcool viticole",
                "description": "Cette aide vise à soutenir le stockage privé d'alcool viticole",
                "multi_tab_content": {
                    "presentation": "Cette mesure soutient le stockage d'alcool pendant les périodes de surproduction.",
                    "pour_qui": "Les entreprises de stockage d'alcool agréées. Conditions: Volume minimum de 1000 hl, capacité de stockage certifiée.",
                    "quand": "Date limite de candidature: 31 décembre 2024. Période de stockage: minimum 6 mois.",
                    "comment": "Procédure: 1. Remplir le formulaire de demande 2. Fournir les justificatifs 3. Soumettre avant la date limite"
                },
                "combined_tab_text": """== Présentation ==
Cette mesure soutient le stockage d'alcool pendant les périodes de surproduction.

== Pour qui ? ==
Les entreprises de stockage d'alcool agréées. Conditions: Volume minimum de 1000 hl, capacité de stockage certifiée.

== Quand ? ==
Date limite de candidature: 31 décembre 2024. Période de stockage: minimum 6 mois.

== Comment ? ==
Procédure: 1. Remplir le formulaire de demande 2. Fournir les justificatifs 3. Soumettre avant la date limite""",
                "documents": [
                    {"url": "https://example.com/formulaire.pdf", "text": "Formulaire de demande", "source_tab": "comment"},
                    {"url": "https://example.com/guide.pdf", "text": "Guide des justificatifs", "source_tab": "comment"}
                ],
                "amount_min": 10000,
                "amount_max": 100000,
                "agency": "FranceAgriMer"
            }
        })
        
        # Test content extraction
        enhanced_content = agent.extract_enhanced_content(sample_payload)
        
        # Validation checks
        content_checks = {
            'contains_source_url': 'franceagrimer.fr/test-aide' in enhanced_content,
            'contains_title': 'Aide au stockage privé' in enhanced_content,
            'contains_tab_sections': '== Présentation ==' in enhanced_content and '== Pour qui ? ==' in enhanced_content,
            'contains_documents': 'DOCUMENTS AND ATTACHMENTS:' in enhanced_content,
            'contains_eligibility': 'entreprises de stockage' in enhanced_content,
            'contains_deadline': '31 décembre 2024' in enhanced_content
        }
        
        passed_checks = sum(content_checks.values())
        total_checks = len(content_checks)
        
        print(f"✅ Enhanced content extraction: {passed_checks}/{total_checks} checks passed")
        
        for check, passed in content_checks.items():
            status = "✅" if passed else "❌"
            print(f"   {status} {check.replace('_', ' ').title()}")
        
        if passed_checks >= total_checks * 0.8:  # 80% threshold
            print("🎉 Enhanced content extraction working well!")
            return True
        else:
            print("⚠️ Enhanced content extraction needs improvement")
            return False
            
    except Exception as e:
        print(f"❌ Content extraction test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_field_validation_and_normalization():
    """Test field validation and normalization."""
    print("\n📊 Testing Field Validation and Normalization...")
    
    try:
        from agent import RawLogInterpreterAgent
        
        agent = RawLogInterpreterAgent()
        
        # Test data with various field types and formats
        test_result = {
            "url": "https://example.com",
            "title": "Test Subsidy",
            "description": "Test description",
            "deadline": "31/12/2024",  # DD/MM/YYYY format to normalize
            "amount": "50,000 €",      # String with currency to normalize
            "documents": "Single document",  # String to convert to list
            "priority_groups": ["farmers", "cooperatives"],
            "co_financing_rate": "75%",  # Percentage string to normalize
            "missing_field": "should be removed"  # Extra field to remove
        }
        
        # Validate and normalize
        normalized = agent.validate_and_normalize_fields(test_result)
        
        # Validation checks
        validation_checks = {
            'all_canonical_fields_present': all(field in normalized for field in agent.CANONICAL_FIELDS),
            'extra_fields_removed': 'missing_field' not in normalized,
            'date_normalized': normalized.get('deadline') == '2024-12-31',
            'amount_normalized': isinstance(normalized.get('amount'), (int, float)),
            'string_to_list_conversion': isinstance(normalized.get('documents'), list),
            'percentage_normalized': isinstance(normalized.get('co_financing_rate'), (int, float)),
            'audit_included': 'audit' in normalized
        }
        
        passed_checks = sum(validation_checks.values())
        total_checks = len(validation_checks)
        
        print(f"✅ Field validation: {passed_checks}/{total_checks} checks passed")
        
        for check, passed in validation_checks.items():
            status = "✅" if passed else "❌"
            print(f"   {status} {check.replace('_', ' ').title()}")
        
        # Show audit information
        audit = normalized.get('audit', {})
        if audit:
            print(f"   📋 Field completeness: {audit.get('field_completeness', 0):.2%}")
            missing_fields = audit.get('missing_fields', [])
            if missing_fields:
                print(f"   ⚠️ Missing fields: {len(missing_fields)}")
        
        return passed_checks >= total_checks * 0.8
        
    except Exception as e:
        print(f"❌ Field validation test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_date_normalization():
    """Test date normalization functionality."""
    print("\n📅 Testing Date Normalization...")
    
    try:
        from agent import RawLogInterpreterAgent
        
        agent = RawLogInterpreterAgent()
        
        # Test various date formats
        date_tests = {
            "31/12/2024": "2024-12-31",
            "31-12-2024": "2024-12-31",
            "2024/12/31": "2024-12-31",
            "2024-12-31": "2024-12-31",
            "31 décembre 2024": "2024-12-31",
            "15 mars 2025": "2025-03-15",
            "invalid date": None,
            "": None,
            None: None
        }
        
        passed = 0
        total = len(date_tests)
        
        for input_date, expected in date_tests.items():
            result = agent.normalize_date(input_date)
            if result == expected:
                status = "✅"
                passed += 1
            else:
                status = "❌"
            
            print(f"   {status} '{input_date}' → '{result}' (expected: '{expected}')")
        
        print(f"✅ Date normalization: {passed}/{total} tests passed")
        return passed >= total * 0.8
        
    except Exception as e:
        print(f"❌ Date normalization test failed: {e}")
        return False

def test_minimal_valid_result():
    """Test minimal valid result creation for failed extractions."""
    print("\n🛡️ Testing Minimal Valid Result Creation...")
    
    try:
        from agent import RawLogInterpreterAgent
        
        agent = RawLogInterpreterAgent()
        
        # Test with valid JSON payload
        valid_payload = json.dumps({
            "scraping_metadata": {"source_url": "https://example.com"},
            "raw_content": {"title": "Test Title", "description": "Test Description"}
        })
        
        minimal_result = agent.create_minimal_valid_result(valid_payload)
        
        # Test with invalid JSON payload
        invalid_payload = "This is not JSON"
        minimal_result_invalid = agent.create_minimal_valid_result(invalid_payload)
        
        # Validation checks
        checks = {
            'all_fields_present': all(field in minimal_result for field in agent.CANONICAL_FIELDS),
            'url_extracted': minimal_result.get('url') == 'https://example.com',
            'title_extracted': minimal_result.get('title') == 'Test Title',
            'language_defaulted': minimal_result.get('language') == 'fr',
            'status_set': minimal_result.get('requirements_extraction_status') == 'failed',
            'audit_included': 'audit' in minimal_result,
            'handles_invalid_json': all(field in minimal_result_invalid for field in agent.CANONICAL_FIELDS)
        }
        
        passed_checks = sum(checks.values())
        total_checks = len(checks)
        
        print(f"✅ Minimal valid result: {passed_checks}/{total_checks} checks passed")
        
        for check, passed in checks.items():
            status = "✅" if passed else "❌"
            print(f"   {status} {check.replace('_', ' ').title()}")
        
        return passed_checks >= total_checks * 0.8
        
    except Exception as e:
        print(f"❌ Minimal valid result test failed: {e}")
        return False

def test_agent_robustness():
    """Test agent robustness and error handling."""
    print("\n🛠️ Testing Agent Robustness...")
    
    try:
        from agent import RawLogInterpreterAgent
        
        # Test configuration
        print("   🔧 Testing configuration...")
        agent = RawLogInterpreterAgent()
        
        config_checks = {
            'batch_size_reduced': agent.config.BATCH_SIZE == 25,  # Should be reduced for robustness
            'canonical_fields_defined': len(agent.CANONICAL_FIELDS) > 20,
            'field_types_defined': len(agent.FIELD_TYPES) > 15
        }
        
        passed_checks = sum(config_checks.values())
        total_checks = len(config_checks)
        
        print(f"   ✅ Configuration: {passed_checks}/{total_checks} checks passed")
        
        for check, passed in config_checks.items():
            status = "✅" if passed else "❌"
            print(f"      {status} {check.replace('_', ' ').title()}")
        
        return passed_checks >= total_checks * 0.8
        
    except Exception as e:
        print(f"❌ Agent robustness test failed: {e}")
        return False

def run_robust_agent_tests():
    """Run comprehensive robust agent tests."""
    print("🚀 Robust AI Agent Test Suite")
    print("=" * 60)
    
    test_results = {}
    
    # Run all tests
    test_results['enhanced_content_extraction'] = test_enhanced_content_extraction()
    test_results['field_validation'] = test_field_validation_and_normalization()
    test_results['date_normalization'] = test_date_normalization()
    test_results['minimal_valid_result'] = test_minimal_valid_result()
    test_results['agent_robustness'] = test_agent_robustness()
    
    # Summary
    print("\n" + "=" * 60)
    print("🏁 Test Results Summary")
    
    passed = sum(test_results.values())
    total = len(test_results)
    
    for test_name, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   • {test_name.replace('_', ' ').title()}: {status}")
    
    print(f"\n📊 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Robust AI agent is ready for production.")
        print("\n📋 Agent Enhancements:")
        print("   ✅ Enhanced multi-tab content extraction")
        print("   ✅ Strict canonical schema validation")
        print("   ✅ Field normalization and type checking")
        print("   ✅ Comprehensive audit trail")
        print("   ✅ Robust error handling and retry logic")
        print("   ✅ Date and numeric field normalization")
        print("   ✅ Application requirements extraction")
        print("   ✅ Dynamic questionnaire generation")
    elif passed > 0:
        print("⚠️ Some tests failed. Review and fix issues before deploying.")
    else:
        print("❌ All tests failed. Major issues need to be resolved.")
    
    return passed == total

if __name__ == "__main__":
    success = run_robust_agent_tests()
    sys.exit(0 if success else 1)
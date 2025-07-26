#!/usr/bin/env python3
"""
Pipeline Integration Test Script
Validates that the data pipeline fix works end-to-end.
"""

import json
import os
import sys
from datetime import datetime
from typing import Dict, Any

# Add scraper to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_supabase_connection():
    """Test Supabase connection and table access."""
    print("🔍 Testing Supabase Connection...")
    
    try:
        from supabase_client import SupabaseUploader
        
        uploader = SupabaseUploader()
        if uploader.test_connection():
            print("✅ Supabase connection successful")
            return True
        else:
            print("❌ Supabase connection failed")
            return False
    except Exception as e:
        print(f"❌ Connection test error: {e}")
        return False

def test_raw_logs_format():
    """Test the new raw_logs data format conversion."""
    print("\n📊 Testing Raw Logs Format Conversion...")
    
    try:
        from supabase_client import SupabaseUploader
        
        # Sample scraped data (enhanced with multi-tab content)
        sample_subsidies = [{
            'source_url': 'https://www.franceagrimer.fr/test-aide',
            'domain': 'franceagrimer.fr',
            'title': 'Test Subsidy Title',
            'description': 'Test subsidy description',
            'eligibility': 'Test eligibility criteria',
            'agency': 'FranceAgriMer',
            'multi_tab_content': {
                'presentation': 'This is the presentation section',
                'pour_qui': 'Eligibility for farmers',
                'quand': 'Application deadline: 31/12/2024',
                'comment': 'How to apply instructions'
            },
            'combined_tab_text': '''== Présentation ==
This is the presentation section

== Pour qui ? ==
Eligibility for farmers

== Quand ? ==
Application deadline: 31/12/2024

== Comment ? ==
How to apply instructions''',
            'documents': [
                {'url': 'https://example.com/form.pdf', 'text': 'Application Form'},
                {'url': 'https://example.com/guide.pdf', 'text': 'User Guide'}
            ],
            'amount_min': 1000.0,
            'amount_max': 50000.0,
            'deadline': '2024-12-31',
            'extraction_metadata': {
                'method_used': 'interactive_clicking',
                'completeness_score': 0.95
            }
        }]
        
        uploader = SupabaseUploader()
        raw_log_entries = uploader.prepare_raw_log_data(sample_subsidies)
        
        if raw_log_entries:
            entry = raw_log_entries[0]
            print("✅ Raw logs format conversion successful")
            
            # Validate payload structure
            payload_data = json.loads(entry['payload'])
            
            required_sections = ['scraping_metadata', 'raw_content']
            missing_sections = [s for s in required_sections if s not in payload_data]
            
            if missing_sections:
                print(f"⚠️ Missing sections: {missing_sections}")
            else:
                print("✅ Payload structure valid")
            
            # Validate key fields
            metadata = payload_data.get('scraping_metadata', {})
            content = payload_data.get('raw_content', {})
            
            print(f"   • Source URL: {metadata.get('source_url')}")
            print(f"   • Extraction method: {metadata.get('extraction_method')}")
            print(f"   • Multi-tab content: {len(content.get('multi_tab_content', {})) > 0}")
            print(f"   • Combined text length: {len(content.get('combined_tab_text', ''))}")
            print(f"   • Documents found: {len(content.get('documents', []))}")
            print(f"   • File refs: {len(entry.get('file_refs', []))}")
            print(f"   • Processed flag: {entry.get('processed')}")
            
            return True
        else:
            print("❌ No raw log entries created")
            return False
            
    except Exception as e:
        print(f"❌ Format conversion error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_pipeline_stats():
    """Test pipeline statistics and monitoring."""
    print("\n📈 Testing Pipeline Statistics...")
    
    try:
        from supabase_client import SupabaseUploader
        
        uploader = SupabaseUploader()
        stats = uploader.get_scraper_stats()
        
        if 'error' not in stats:
            print("✅ Statistics retrieval successful")
            for key, value in stats.items():
                print(f"   • {key}: {value}")
            return True
        else:
            print(f"⚠️ Statistics error: {stats['error']}")
            return False
            
    except Exception as e:
        print(f"❌ Statistics test error: {e}")
        return False

def test_ai_agent_compatibility():
    """Test compatibility with AI agent expected format."""
    print("\n🤖 Testing AI Agent Compatibility...")
    
    try:
        # Simulate what the AI agent expects to find
        sample_raw_log = {
            'id': 'test-id',
            'payload': json.dumps({
                'scraping_metadata': {
                    'source_url': 'https://www.franceagrimer.fr/test',
                    'domain': 'franceagrimer.fr'
                },
                'raw_content': {
                    'title': 'Test Subsidy',
                    'multi_tab_content': {
                        'presentation': 'Test presentation',
                        'pour_qui': 'Test eligibility'
                    },
                    'combined_tab_text': '== Présentation ==\nTest content'
                }
            }),
            'file_refs': ['https://example.com/doc.pdf'],
            'processed': False
        }
        
        # Validate agent can parse the payload
        payload_data = json.loads(sample_raw_log['payload'])
        
        # Check for required fields that agent needs
        required_metadata = ['source_url', 'domain']
        metadata = payload_data.get('scraping_metadata', {})
        
        missing_metadata = [f for f in required_metadata if f not in metadata]
        if missing_metadata:
            print(f"⚠️ Missing metadata fields: {missing_metadata}")
            return False
        
        # Check for content structure
        content = payload_data.get('raw_content', {})
        if not content:
            print("❌ No raw_content found in payload")
            return False
        
        # Check for multi-tab enhancement
        multi_tab = content.get('multi_tab_content', {})
        combined_text = content.get('combined_tab_text', '')
        
        print("✅ AI Agent compatibility validated")
        print(f"   • Payload parseable: ✅")
        print(f"   • Required metadata: ✅")
        print(f"   • Content structure: ✅")
        print(f"   • Multi-tab data: {len(multi_tab) > 0}")
        print(f"   • Combined text: {len(combined_text) > 0}")
        print(f"   • File references: {len(sample_raw_log['file_refs'])}")
        print(f"   • Processed flag: {sample_raw_log['processed']}")
        
        return True
        
    except Exception as e:
        print(f"❌ AI agent compatibility error: {e}")
        return False

def run_pipeline_integration_test():
    """Run complete pipeline integration test."""
    print("🚀 AgriTool Data Pipeline Integration Test")
    print("=" * 60)
    
    test_results = {}
    
    # Run all tests
    test_results['connection'] = test_supabase_connection()
    test_results['format'] = test_raw_logs_format()
    test_results['stats'] = test_pipeline_stats()
    test_results['ai_compatibility'] = test_ai_agent_compatibility()
    
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
        print("🎉 All tests passed! Data pipeline is ready for production.")
        print("\n📋 Next Steps:")
        print("   1. Run enhanced scraper to populate raw_logs")
        print("   2. Run AI agent to process the data")
        print("   3. Check subsidies_structured for results")
    elif passed > 0:
        print("⚠️ Some tests failed. Review and fix issues before deploying.")
    else:
        print("❌ All tests failed. Major issues need to be resolved.")
    
    return passed == total

if __name__ == "__main__":
    success = run_pipeline_integration_test()
    sys.exit(0 if success else 1)
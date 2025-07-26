#!/usr/bin/env python3
"""
Test script for multi-tab extraction functionality.
Validates complete tab content extraction from FranceAgriMer subsidy pages.
"""

import json
import logging
from typing import Dict, Any

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def test_multi_tab_extraction():
    """Test multi-tab extraction on a known FranceAgriMer URL."""
    
    print("🧪 Testing Multi-Tab Extraction")
    print("=" * 50)
    
    # Test URL - use a known FranceAgriMer subsidy page
    test_url = "https://www.franceagrimer.fr/aides/aide-au-stockage-prive-de-lalcool-viticole"
    
    try:
        from scraper.multi_tab_extractor import extract_multi_tab_content
        
        print(f"📄 Testing URL: {test_url}")
        print("🔍 Starting multi-tab extraction...")
        
        # Extract content
        result = extract_multi_tab_content(test_url)
        
        if not result:
            print("❌ No result returned from extraction")
            return False
        
        # Display results
        print("\n✅ Extraction completed!")
        print(f"📊 Extraction Summary:")
        
        metadata = result.get('extraction_metadata', {})
        print(f"   • Method used: {metadata.get('method_used', 'unknown')}")
        print(f"   • Tabs found: {len(metadata.get('tabs_found', []))}")
        print(f"   • Tabs extracted: {len(metadata.get('tabs_extracted', []))}")
        print(f"   • Tabs failed: {len(metadata.get('tabs_failed', []))}")
        print(f"   • Completeness score: {metadata.get('completeness_score', 0):.2f}")
        print(f"   • Total content length: {metadata.get('total_content_length', 0)} chars")
        print(f"   • Attachments found: {len(result.get('attachments', []))}")
        
        # Show tab content
        tab_content = result.get('tab_content', {})
        if tab_content:
            print(f"\n📋 Tab Content Extracted:")
            for tab_name, content in tab_content.items():
                content_preview = content[:100] + "..." if len(content) > 100 else content
                print(f"   • {tab_name}: {len(content)} chars")
                print(f"     Preview: {content_preview}")
        
        # Show attachments
        attachments = result.get('attachments', [])
        if attachments:
            print(f"\n📎 Attachments Found:")
            for att in attachments:
                print(f"   • {att.get('text', 'Unknown')} ({att.get('extension', 'unknown')})")
                print(f"     URL: {att.get('url', 'No URL')}")
                print(f"     Source: {att.get('source_tab', 'unknown')}")
        
        # Validate expected tabs
        expected_tabs = ['presentation', 'pour_qui', 'quand', 'comment']
        found_expected = [tab for tab in expected_tabs if tab in tab_content]
        
        print(f"\n🎯 Tab Validation:")
        print(f"   • Expected tabs: {expected_tabs}")
        print(f"   • Found expected: {found_expected}")
        print(f"   • Coverage: {len(found_expected)}/{len(expected_tabs)} ({len(found_expected)/len(expected_tabs)*100:.1f}%)")
        
        # Test quality metrics
        combined_length = len(result.get('combined_text', ''))
        print(f"\n📏 Quality Metrics:")
        print(f"   • Combined text length: {combined_length} chars")
        print(f"   • Average per tab: {combined_length // len(tab_content) if tab_content else 0} chars")
        
        # Check for required content indicators
        combined_text = result.get('combined_text', '').lower()
        quality_indicators = {
            'eligibility_info': any(word in combined_text for word in ['éligible', 'condition', 'bénéficiaire']),
            'procedure_info': any(word in combined_text for word in ['démarche', 'procédure', 'candidature']),
            'timing_info': any(word in combined_text for word in ['date', 'délai', 'calendrier']),
            'amount_info': any(word in combined_text for word in ['montant', 'aide', 'subvention', '€'])
        }
        
        print(f"   • Content quality indicators:")
        for indicator, found in quality_indicators.items():
            status = "✅" if found else "❌"
            print(f"     {status} {indicator.replace('_', ' ').title()}")
        
        # Overall assessment
        success_score = (
            len(found_expected) / len(expected_tabs) * 0.4 +  # Tab coverage (40%)
            min(1.0, combined_length / 1000) * 0.3 +          # Content amount (30%)
            sum(quality_indicators.values()) / len(quality_indicators) * 0.3  # Quality indicators (30%)
        )
        
        print(f"\n🏆 Overall Success Score: {success_score:.2f}/1.0")
        
        if success_score >= 0.7:
            print("🎉 Multi-tab extraction is working well!")
            return True
        elif success_score >= 0.5:
            print("⚠️ Multi-tab extraction is partially working - may need tuning")
            return True
        else:
            print("❌ Multi-tab extraction needs improvement")
            return False
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure the multi_tab_extractor module is available")
        return False
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_enhanced_extraction():
    """Test the enhanced extraction with multi-tab support."""
    
    print("\n🔬 Testing Enhanced Extraction Pipeline")
    print("=" * 50)
    
    test_url = "https://www.franceagrimer.fr/aides/aide-au-stockage-prive-de-lalcool-viticole"
    
    try:
        from scraper.discovery import extract_subsidy_details
        
        print(f"📄 Testing enhanced extraction on: {test_url}")
        
        # Test with multi-tab enabled
        result = extract_subsidy_details(test_url, use_multi_tab=True)
        
        if result:
            print("✅ Enhanced extraction successful!")
            
            # Show key fields
            key_fields = ['title', 'description', 'eligibility', 'amount_min', 'amount_max', 'deadline', 'agency']
            print(f"\n📋 Extracted Fields:")
            for field in key_fields:
                value = result.get(field)
                if value:
                    preview = str(value)[:100] + "..." if len(str(value)) > 100 else str(value)
                    print(f"   • {field}: {preview}")
                else:
                    print(f"   • {field}: [Not found]")
            
            # Show multi-tab specific data
            if 'multi_tab_content' in result:
                print(f"\n🔖 Multi-tab Data Available:")
                print(f"   • Tab sections: {list(result['multi_tab_content'].keys())}")
                print(f"   • Combined text length: {len(result.get('combined_tab_text', ''))}")
                
            if 'documents' in result and result['documents']:
                print(f"\n📎 Documents: {len(result['documents'])} found")
                
            return True
        else:
            print("❌ Enhanced extraction returned no results")
            return False
            
    except Exception as e:
        print(f"❌ Enhanced extraction test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def save_test_results(results: Dict[str, Any]):
    """Save test results for analysis."""
    
    try:
        with open('data/multi_tab_test_results.json', 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False, default=str)
        print(f"\n💾 Test results saved to: data/multi_tab_test_results.json")
    except Exception as e:
        print(f"⚠️ Failed to save test results: {e}")


if __name__ == "__main__":
    print("🚀 Multi-Tab Extraction Test Suite")
    print("=" * 60)
    
    # Ensure data directory exists
    import os
    os.makedirs('data', exist_ok=True)
    
    test_results = {
        'timestamp': str(logging.Formatter().formatTime(logging.LogRecord(
            '', 0, '', 0, '', (), None), '%Y-%m-%d %H:%M:%S')),
        'tests': {}
    }
    
    # Run tests
    print("\n" + "="*60)
    test_results['tests']['multi_tab_extraction'] = test_multi_tab_extraction()
    
    print("\n" + "="*60)
    test_results['tests']['enhanced_extraction'] = test_enhanced_extraction()
    
    # Summary
    print("\n" + "="*60)
    print("🏁 Test Suite Complete")
    
    passed = sum(test_results['tests'].values())
    total = len(test_results['tests'])
    
    print(f"📊 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Multi-tab extraction is ready for production.")
    elif passed > 0:
        print("⚠️ Some tests passed. Review failed tests and improve as needed.")
    else:
        print("❌ All tests failed. Multi-tab extraction needs debugging.")
    
    # Save results
    test_results['summary'] = {
        'passed': passed,
        'total': total,
        'success_rate': passed / total if total > 0 else 0
    }
    
    save_test_results(test_results)
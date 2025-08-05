#!/usr/bin/env python3
"""
Robust Quality Assurance script for AgriTool pipeline
Never fails silently - always produces complete artifacts and summaries
"""

import os
import sys
import json
import traceback
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any


class QAResults:
    """Track all QA check results"""
    
    def __init__(self):
        self.results = {
            'imports': {},
            'connections': {},
            'extractions': {},
            'overall_status': 'running',
            'timestamp': datetime.now().isoformat(),
            'summary': []
        }
        self.ensure_logs_directory()
    
    def ensure_logs_directory(self):
        """Always create logs directory and basic files"""
        logs_dir = Path("logs")
        logs_dir.mkdir(parents=True, exist_ok=True)
        
        # Always create basic log files
        basic_logs = [
            "logs/qa_results.log",
            "logs/ci_stub.log", 
            "logs/pipeline_status.log"
        ]
        
        for log_file in basic_logs:
            Path(log_file).touch()
    
    def add_result(self, category: str, name: str, success: bool, details: str = ""):
        """Add a test result"""
        self.results[category][name] = {
            'success': success,
            'details': details,
            'timestamp': datetime.now().isoformat()
        }
        
        status = "✅ PASS" if success else "❌ FAIL"
        message = f"{status}: {category.upper()} - {name}"
        if details:
            message += f" ({details})"
        
        print(message)
        self.results['summary'].append(message)
        
        # Log to file
        with open("logs/qa_results.log", "a") as f:
            f.write(f"{message}\n")
    
    def finalize(self):
        """Finalize results and create artifacts"""
        # Determine overall status
        all_success = True
        for category in ['imports', 'connections', 'extractions']:
            for result in self.results[category].values():
                if not result['success']:
                    all_success = False
                    break
        
        self.results['overall_status'] = 'success' if all_success else 'failure'
        
        # Print summary
        print("\n" + "="*60)
        print("🔍 QUALITY ASSURANCE FINAL SUMMARY")
        print("="*60)
        
        for message in self.results['summary']:
            print(message)
        
        print(f"\n📊 OVERALL STATUS: {self.results['overall_status'].upper()}")
        print("="*60)
        
        # Save detailed results
        with open("logs/qa_detailed_results.json", "w") as f:
            json.dump(self.results, f, indent=2)
        
        # Create failure summary if needed
        if not all_success:
            self.create_failure_summary()
        
        # Create final status file
        with open("logs/pipeline_status.log", "w") as f:
            f.write(f"QA Status: {self.results['overall_status']}\n")
            f.write(f"Timestamp: {self.results['timestamp']}\n")
            f.write(f"Total Checks: {sum(len(cat) for cat in [self.results['imports'], self.results['connections'], self.results['extractions']])}\n")
            
        return all_success
    
    def create_failure_summary(self):
        """Create detailed failure summary for debugging"""
        failures = []
        
        for category, tests in self.results.items():
            if isinstance(tests, dict):
                for test_name, result in tests.items():
                    if not result.get('success', True):
                        failures.append({
                            'category': category,
                            'test': test_name,
                            'details': result.get('details', 'No details available')
                        })
        
        summary_content = [
            "AGRITOOL PIPELINE FAILURE SUMMARY",
            "=" * 50,
            f"Timestamp: {datetime.now().isoformat()}",
            f"Job: Quality Assurance",
            f"Total Failures: {len(failures)}",
            "",
            "FAILED CHECKS:",
            "-" * 20
        ]
        
        for failure in failures:
            summary_content.extend([
                f"• Category: {failure['category'].upper()}",
                f"  Test: {failure['test']}",
                f"  Error: {failure['details']}",
                ""
            ])
        
        summary_content.extend([
            "SUGGESTED ACTIONS:",
            "-" * 20,
            "1. Check logs/qa_detailed_results.json for full details",
            "2. Verify all required dependencies are installed",
            "3. Check database connectivity and credentials",
            "4. Ensure all required modules are present in the repository",
            "",
            "ARTIFACT LOCATIONS:",
            "- logs/qa_results.log - Basic test output",
            "- logs/qa_detailed_results.json - Full structured results",
            "- logs/pipeline_failure_summary.txt - This summary"
        ])
        
        with open("logs/pipeline_failure_summary.txt", "w") as f:
            f.write("\n".join(summary_content))


def test_imports(qa: QAResults):
    """Test all critical imports with graceful handling"""
    print("\n🔧 Testing Critical Imports...")
    
    import_tests = [
        ('logging_setup', 'logging_setup'),
        ('python_document_extractor', 'AgriTool-Raw-Log-Interpreter.python_document_extractor'),
        ('quality_validator', 'AgriTool-Raw-Log-Interpreter.quality_validator'),
        ('supabase', 'supabase'),
        ('openai', 'openai')
    ]
    
    for name, module_path in import_tests:
        try:
            if '.' in module_path:
                # Handle nested imports
                parts = module_path.split('.')
                mod = __import__(parts[0])
                for part in parts[1:]:
                    mod = getattr(mod, part)
            else:
                __import__(module_path)
            
            qa.add_result('imports', name, True, f"Module {module_path} imported successfully")
            
        except ImportError as e:
            qa.add_result('imports', name, False, f"ImportError: {str(e)}")
        except Exception as e:
            qa.add_result('imports', name, False, f"Unexpected error: {str(e)}")


def test_database_connection(qa: QAResults):
    """Test database connectivity"""
    print("\n🗄️ Testing Database Connection...")
    
    try:
        # Check if Supabase credentials are available
        supabase_url = os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_ANON_KEY')
        
        if not supabase_url or not supabase_key:
            qa.add_result('connections', 'supabase_credentials', False, 
                         "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables")
            return
        
        qa.add_result('connections', 'supabase_credentials', True, 
                     "Supabase credentials found in environment")
        
        # Try to import and connect to Supabase
        try:
            from supabase import create_client
            supabase = create_client(supabase_url, supabase_key)
            
            # Simple connection test
            response = supabase.table('subsidies').select('count').limit(1).execute()
            qa.add_result('connections', 'supabase_connection', True, 
                         "Successfully connected to Supabase database")
            
        except Exception as e:
            qa.add_result('connections', 'supabase_connection', False, 
                         f"Database connection failed: {str(e)}")
            
    except Exception as e:
        qa.add_result('connections', 'database_test', False, 
                     f"Database test setup failed: {str(e)}")


def test_ai_extraction(qa: QAResults):
    """Test AI extraction capabilities"""
    print("\n🤖 Testing AI Extraction...")
    
    try:
        # Check OpenAI API key
        openai_key = os.getenv('OPENAI_API_KEY') or os.getenv('SCRAPER_RAW_GPT_API')
        
        if not openai_key:
            qa.add_result('extractions', 'openai_credentials', False, 
                         "Missing OPENAI_API_KEY or SCRAPER_RAW_GPT_API environment variable")
        else:
            qa.add_result('extractions', 'openai_credentials', True, 
                         "OpenAI API key found in environment")
        
        # Test document extractor if available
        try:
            sys.path.append('AgriTool-Raw-Log-Interpreter')
            from python_document_extractor import PythonDocumentExtractor
            
            extractor = PythonDocumentExtractor(
                enable_ocr=True,
                ocr_language='eng+fra+ron',
                max_file_size_mb=10.0
            )
            
            qa.add_result('extractions', 'document_extractor', True, 
                         "PythonDocumentExtractor initialized successfully")
            
        except Exception as e:
            qa.add_result('extractions', 'document_extractor', False, 
                         f"Document extractor test failed: {str(e)}")
        
        # Test quality validator if available
        try:
            from quality_validator import SubsidyQualityValidator
            validator = SubsidyQualityValidator()
            qa.add_result('extractions', 'quality_validator', True, 
                         "Quality validator initialized successfully")
            
        except Exception as e:
            qa.add_result('extractions', 'quality_validator', False, 
                         f"Quality validator test failed: {str(e)}")
            
    except Exception as e:
        qa.add_result('extractions', 'ai_test_setup', False, 
                     f"AI extraction test setup failed: {str(e)}")


def main():
    """Run comprehensive QA with robust error handling"""
    print("🚀 AGRITOOL QUALITY ASSURANCE - ROBUST MODE")
    print("=" * 60)
    
    qa = QAResults()
    
    try:
        # Run all tests - never abort early
        test_imports(qa)
        test_database_connection(qa)
        test_ai_extraction(qa)
        
    except Exception as e:
        print(f"❌ Critical QA error: {str(e)}")
        print(f"❌ Traceback: {traceback.format_exc()}")
        
        qa.add_result('overall', 'qa_execution', False, 
                     f"Critical QA error: {str(e)}")
    
    # Always finalize and create artifacts
    success = qa.finalize()
    
    # Always create completion marker
    with open("logs/qa_completed.txt", "w") as f:
        f.write(f"QA completed at {datetime.now().isoformat()}\n")
        f.write(f"Status: {'SUCCESS' if success else 'FAILURE'}\n")
    
    return success


if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"❌ FATAL QA ERROR: {str(e)}")
        print(f"❌ TRACEBACK: {traceback.format_exc()}")
        
        # Even on fatal error, create artifacts
        Path("logs").mkdir(exist_ok=True)
        with open("logs/pipeline_failure_summary.txt", "w") as f:
            f.write(f"FATAL QA ERROR\n")
            f.write(f"Error: {str(e)}\n")
            f.write(f"Traceback: {traceback.format_exc()}\n")
            f.write(f"Timestamp: {datetime.now().isoformat()}\n")
        
        sys.exit(1)
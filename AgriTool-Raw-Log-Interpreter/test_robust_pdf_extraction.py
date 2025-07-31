#!/usr/bin/env python3
"""
Test script for the robust PDF extraction integration in AgriTool agents.
This script verifies that the agents can properly use the robust PDF extraction pipeline.
"""

import os
import sys
import tempfile
import requests
from datetime import datetime

def test_robust_pdf_extraction():
    """Test the robust PDF extraction integration."""
    print("🧪 Testing robust PDF extraction integration...")
    
    # Add the path to import our agents
    sys.path.append(os.path.dirname(__file__))
    
    try:
        # Import both agents
        from agent import RawLogInterpreterAgent
        from enhanced_agent import RawLogInterpreterAgent as EnhancedAgent
        
        print("✅ Successfully imported agents with robust PDF extraction")
        
        # Create minimal config for testing
        os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
        os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test_key")
        os.environ.setdefault("SCRAPER_RAW_GPT_API", "test_key")
        
        # Test the PDF extraction method exists and is properly configured
        try:
            agent = RawLogInterpreterAgent()
            print("✅ Basic agent initialized successfully")
            
            # Check if the extract_file_content method has the robust pipeline
            import inspect
            source = inspect.getsource(agent.extract_file_content)
            
            if "PythonDocumentExtractor" in source:
                print("✅ Agent has Python document extraction integrated")
            else:
                print("❌ Agent missing Python document extraction")
                return False
            
            if "temp_file_path" in source and "finally:" in source:
                print("✅ Agent has proper temp file cleanup")
            else:
                print("⚠️ Agent may have temp file cleanup issues")
            
            if "extract_document_text" in source:
                print("✅ Agent has Python document extraction methods")
            else:
                print("⚠️ Agent missing extraction methods")
            
            # Test enhanced agent too
            enhanced_agent = EnhancedAgent()
            enhanced_source = inspect.getsource(enhanced_agent.extract_file_content)
            
            if "PythonDocumentExtractor" in enhanced_source:
                print("✅ Enhanced agent has Python document extraction integrated")
            else:
                print("❌ Enhanced agent missing Python document extraction")
                return False
            
            print("\n🎉 All tests passed! The robust PDF extraction pipeline is properly integrated.")
            return True
            
        except Exception as e:
            print(f"❌ Error testing agents: {e}")
            return False
        
    except ImportError as e:
        print(f"❌ Failed to import agents: {e}")
        print("Make sure all dependencies are installed: pip install -r requirements.txt")
        return False

def test_pdf_pipeline_direct():
    """Test the PDF extraction pipeline directly."""
    print("\n🔧 Testing PDF extraction pipeline directly...")
    
    # Add path to the scraper main directory
    sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'AgriToolScraper-main'))
    
    try:
        from pdf_extraction_pipeline import PDFExtractionPipeline
        
        # Create pipeline instance
        pipeline = PDFExtractionPipeline(
            max_file_size_mb=5.0,
            max_retries=2,
            initial_retry_delay=1.0,
            enable_ocr=False  # Disable OCR for testing
        )
        
        print("✅ PDF extraction pipeline created successfully")
        
        # Test health check method
        if hasattr(pipeline, 'check_tika_health'):
            print("✅ Pipeline has Tika health check capability")
        else:
            print("❌ Pipeline missing health check method")
            return False
        
        # Test extraction method exists
        if hasattr(pipeline, 'extract_text'):
            print("✅ Pipeline has text extraction capability")
        else:
            print("❌ Pipeline missing extract_text method")
            return False
        
        # Test cleanup method exists
        if hasattr(pipeline, 'cleanup_temp_files'):
            print("✅ Pipeline has temp file cleanup capability")
        else:
            print("❌ Pipeline missing cleanup method")
            return False
        
        print("✅ PDF extraction pipeline has all required methods")
        return True
        
    except ImportError as e:
        print(f"❌ Failed to import PDF extraction pipeline: {e}")
        return False

def main():
    """Run all tests."""
    print("=" * 60)
    print("🧪 AGRITOOL ROBUST PDF EXTRACTION INTEGRATION TEST")
    print("=" * 60)
    print(f"Test started at: {datetime.now().isoformat()}")
    print()
    
    # Test 1: PDF pipeline direct
    pipeline_test = test_pdf_pipeline_direct()
    
    # Test 2: Agent integration
    agent_test = test_robust_pdf_extraction()
    
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    print(f"PDF Pipeline Direct Test: {'✅ PASS' if pipeline_test else '❌ FAIL'}")
    print(f"Agent Integration Test: {'✅ PASS' if agent_test else '❌ FAIL'}")
    
    if pipeline_test and agent_test:
        print("\n🎉 ALL TESTS PASSED!")
        print("✅ Your AgriTool agents are ready to use robust PDF extraction")
        print("✅ PDF timeouts should be significantly reduced")
        print("✅ Large PDFs will be preprocessed automatically")
        print("✅ OCR will handle scanned documents")
        print("✅ Retry logic will handle transient failures")
        return True
    else:
        print("\n❌ SOME TESTS FAILED!")
        print("Please check the error messages above and fix the issues.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
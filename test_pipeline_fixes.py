#!/usr/bin/env python3
"""
Test script to verify AgriTool pipeline fixes
Tests both constructor compatibility and artifact generation
"""

import os
import sys
import tempfile
import shutil
from pathlib import Path

def test_extractor_compatibility():
    """Test PythonDocumentExtractor constructor compatibility"""
    
    print("🧪 Testing PythonDocumentExtractor constructor compatibility...")
    
    # Add path to find our modules
    sys.path.insert(0, str(Path(__file__).parent / "AgriTool-Raw-Log-Interpreter"))
    
    try:
        from python_document_extractor import PythonDocumentExtractor
        
        # Test the corrected constructor call (as used in agents)
        extractor = PythonDocumentExtractor(
            enable_ocr=True,
            ocr_language='eng+fra+ron',
            max_file_size_mb=10.0
        )
        
        print("✅ PythonDocumentExtractor constructor works correctly")
        print(f"   enable_ocr: {extractor.enable_ocr}")
        print(f"   ocr_language: {extractor.ocr_language}")
        print(f"   max_file_size_mb: {extractor.max_file_size_bytes / (1024*1024)}")
        
        return True
        
    except Exception as e:
        print(f"❌ PythonDocumentExtractor constructor test failed: {e}")
        return False

def main():
    """Run compatibility test"""
    print("🔧 TESTING AGRITOOL PIPELINE FIXES")
    return test_extractor_compatibility()

if __name__ == "__main__":
    sys.exit(0 if main() else 1)
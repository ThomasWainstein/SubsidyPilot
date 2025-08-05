#!/usr/bin/env python3
"""
Test runner for AgriTool Raw Log Interpreter Agent

Verifies dependencies and runs basic functionality tests.
"""

import sys
import os

def test_dependencies():
    """Test all required dependencies are installed"""
    print("🔍 Testing dependencies...")
    
    missing_deps = []
    
    try:
        import supabase
        print("✅ supabase")
    except ImportError:
        missing_deps.append("supabase")
        
    try:
        import openai
        print("✅ openai")
    except ImportError:
        missing_deps.append("openai")
        
    try:
        from python_document_extractor import PythonDocumentExtractor
        print("✅ python_document_extractor")
    except ImportError:
        missing_deps.append("python_document_extractor")
        print("❌ python_document_extractor - Check module installation")
        
    try:
        import pytesseract
        print("✅ pytesseract")
    except ImportError:
        missing_deps.append("pytesseract")
        
    try:
        from PIL import Image
        print("✅ Pillow")
    except ImportError:
        missing_deps.append("Pillow")
    
    if missing_deps:
        print(f"\n❌ Missing dependencies: {', '.join(missing_deps)}")
        print("Run: pip install -r requirements.txt")
        return False
    else:
        print("\n✅ All dependencies installed successfully!")
        return True

def test_array_enforcement():
    """Test the array enforcement logic"""
    print("\n🔍 Testing array enforcement...")
    
    # Import the agent
    sys.path.append(os.path.dirname(__file__))
    from agent import LogInterpreterAgent, Config
    
    # Create dummy config (won't connect to services)
    config = Config.__new__(Config)
    config.LOG_LEVEL = "INFO"
    
    # Create agent instance for testing
    agent = LogInterpreterAgent.__new__(LogInterpreterAgent)
    
    # Test enforce_array method
    test_cases = [
        (None, []),
        ([], []),
        ([1, 2, 3], [1, 2, 3]),
        ("single_value", ["single_value"]),
        (42, [42]),
        ({"key": "value"}, [{"key": "value"}])
    ]
    
    for input_val, expected in test_cases:
        result = agent.enforce_array(input_val)
        if result == expected:
            print(f"✅ enforce_array({input_val}) -> {result}")
        else:
            print(f"❌ enforce_array({input_val}) -> {result}, expected {expected}")
            return False
    
    print("✅ Array enforcement tests passed!")
    return True

def main():
    """Run all tests"""
    print("🧪 AgriTool Raw Log Interpreter - Test Suite\n")
    
    success = True
    
    # Test dependencies
    if not test_dependencies():
        success = False
    
    # Test array enforcement if dependencies are available
    try:
        if not test_array_enforcement():
            success = False
    except Exception as e:
        print(f"❌ Array enforcement test failed: {e}")
        success = False
    
    print("\n" + "="*50)
    if success:
        print("✅ All tests passed! Agent is ready to run.")
        print("\nTo run the agent:")
        print("  python agent.py --single-batch  # Process one batch")
        print("  python agent.py                 # Run continuously")
    else:
        print("❌ Some tests failed. Please fix the issues above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
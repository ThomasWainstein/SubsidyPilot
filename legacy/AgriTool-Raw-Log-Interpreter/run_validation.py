#!/usr/bin/env python3
"""
Quick validation runner for the array fixes
"""

import sys
import os

# Add current directory to Python path
sys.path.append(os.path.dirname(__file__))

if __name__ == "__main__":
    try:
        from validate_array_fix import main
        main()
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure all dependencies are installed: pip install -r requirements.txt")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Validation failed: {e}")
        sys.exit(1)
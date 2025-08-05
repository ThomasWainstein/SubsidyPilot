#!/usr/bin/env python3
"""
Selenium Compliance Validation Wrapper Script
This script serves as the entry point for selenium compliance validation
as referenced in the GitHub Actions workflows.
"""

import sys
import os

# Add the current directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def main():
    """Main entry point for selenium compliance validation."""
    try:
        # Import and run the existing selenium compliance validator
        from selenium_compliance_validator import main as validator_main
        return validator_main()
    except ImportError as e:
        print(f"ERROR: Could not import selenium compliance validator: {e}")
        return False
    except Exception as e:
        print(f"ERROR: Selenium compliance validation failed: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
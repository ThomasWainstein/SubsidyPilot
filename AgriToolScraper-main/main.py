# main.py - Enhanced AgriTool scraper entry point
"""
Legacy entry point - now redirects to the enhanced scraper_main.py
This file maintains backward compatibility while using the new Supabase-integrated pipeline.
"""

import sys
import os

# Add the current directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from scraper_main import main

if __name__ == "__main__":
    # Run the enhanced scraper pipeline
    main()

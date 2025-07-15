# main.py - Enhanced AgriTool scraper entry point
"""
Legacy entry point - now redirects to the enhanced scraper_main.py
This file maintains backward compatibility while using the new Supabase-integrated pipeline.
"""

import sys, traceback, logging, os
logging.basicConfig(level=logging.DEBUG,
    format="%(asctime)s %(levelname)s [%(filename)s:%(lineno)d] %(message)s")
def excepthook(exc_type, exc_value, exc_traceback):
    logging.critical("Uncaught exception",
        exc_info=(exc_type, exc_value, exc_traceback))
    print("="*40 + " ENVIRONMENT " + "="*40)
    for k, v in sorted(os.environ.items()):
        print(f"{k}={v}")
    print("="*40 + " TRACEBACK END " + "="*40)
sys.excepthook = excepthook

# Add the current directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from scraper_main import main

if __name__ == "__main__":
    # Run the enhanced scraper pipeline
    main()

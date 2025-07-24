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
    print("="*40 + " DEBUG INFO " + "="*40)
    print(f"Exception Type: {exc_type.__name__}")
    print(f"Exception Message: {exc_value}")
    print(f"File: {exc_traceback.tb_frame.f_code.co_filename}")
    print(f"Line: {exc_traceback.tb_lineno}")
    print("="*40 + " SAFE ENV INFO " + "="*40)
    # Only print non-sensitive environment variables
    safe_vars = ['DISPLAY', 'BROWSER', 'DRY_RUN', 'MAX_PAGES', 'TARGET_URL', 'LOG_LEVEL']
    for k in sorted(safe_vars):
        v = os.environ.get(k, 'NOT_SET')
        print(f"{k}={v}")
    # Count but don't expose sensitive variables
    sensitive_count = 0
    for k in os.environ:
        if any(pattern in k.upper() for pattern in ['KEY', 'SECRET', 'TOKEN', 'SUPABASE']):
            sensitive_count += 1
    print(f"Sensitive variables configured: {sensitive_count}")
    print("="*40 + " DEBUG END " + "="*40)
sys.excepthook = excepthook

# Add the current directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from scraper_main import main

if __name__ == "__main__":
    # Run the enhanced scraper pipeline
    main()

#!/usr/bin/env python3
"""
Debug logging utility for AgriToolScraper
Gates debug output behind environment flags
"""

import os

def debug_log(*args, **kwargs):
    """Print debug information only if DEBUG_LOGGING is enabled"""
    if os.environ.get("DEBUG_LOGGING") == "1":
        print(*args, **kwargs)

def is_debug_enabled():
    """Check if debug logging is enabled"""
    return os.environ.get("DEBUG_LOGGING") == "1"

def log_step(message, **kwargs):
    """Log a processing step with optional debug data"""
    print(f"📋 {message}")
    if is_debug_enabled() and kwargs:
        print(f"   Debug data: {kwargs}")

def log_error(message, **kwargs):
    """Log an error message (always displayed)"""
    print(f"❌ {message}")
    if is_debug_enabled() and kwargs:
        print(f"   Error details: {kwargs}")
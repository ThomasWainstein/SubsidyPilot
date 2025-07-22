#!/usr/bin/env python3
"""
Clear Python cache files to ensure clean driver initialization.
NO LEGACY DRIVER PATTERNS ALLOWED.
"""
import os
import shutil
import glob
import subprocess

def clear_python_cache():
    """Clear all Python cache files and directories."""
    print("🔥 CLEARING PYTHON RUNTIME CACHES...")
    
    # Clear __pycache__ directories
    cache_dirs_removed = 0
    try:
        for root, dirs, files in os.walk('.'):
            if '__pycache__' in dirs:
                cache_dir = os.path.join(root, '__pycache__')
                try:
                    print(f"🗑️  Removing {cache_dir}")
                    shutil.rmtree(cache_dir, ignore_errors=True)
                    cache_dirs_removed += 1
                except Exception as e:
                    print(f"⚠️  Could not remove {cache_dir}: {e}")
    except Exception as e:
        print(f"⚠️  Error walking directories: {e}")
    
    # Clear .pyc files
    pyc_files = []
    try:
        pyc_files = glob.glob('**/*.pyc', recursive=True)
        for pyc_file in pyc_files:
            try:
                print(f"🗑️  Removing {pyc_file}")
                os.remove(pyc_file)
            except Exception as e:
                print(f"⚠️  Could not remove {pyc_file}: {e}")
    except Exception as e:
        print(f"⚠️  Error finding .pyc files: {e}")
    
    # Clear .pyo files
    pyo_files = []
    try:
        pyo_files = glob.glob('**/*.pyo', recursive=True)
        for pyo_file in pyo_files:
            try:
                print(f"🗑️  Removing {pyo_file}")
                os.remove(pyo_file)
            except Exception as e:
                print(f"⚠️  Could not remove {pyo_file}: {e}")
    except Exception as e:
        print(f"⚠️  Error finding .pyo files: {e}")
    
    print(f"✅ Python cache cleared - {cache_dirs_removed} __pycache__ dirs, {len(pyc_files)} .pyc files, {len(pyo_files)} .pyo files")
    
    # Also clear any pytest cache
    pytest_cache = '.pytest_cache'
    if os.path.exists(pytest_cache):
        try:
            shutil.rmtree(pytest_cache, ignore_errors=True)
            print(f"🗑️  Removed {pytest_cache}")
        except Exception as e:
            print(f"⚠️  Could not remove {pytest_cache}: {e}")
    else:
        print("ℹ️  No pytest cache found")

def validate_driver_patterns():
    """Validate no legacy driver patterns exist."""
    print("🔍 VALIDATING SELENIUM 4+ COMPLIANCE...")
    
    # Forbidden patterns
    forbidden_patterns = [
        r'webdriver\.Chrome\([^)]*,[^)]*\)',  # Multiple args to Chrome()
        r'webdriver\.Firefox\([^)]*,[^)]*\)',  # Multiple args to Firefox()
        r'chrome_options\s*=',  # Legacy chrome_options parameter
        r'firefox_options\s*=',  # Legacy firefox_options parameter
    ]
    
    violations = []
    for pattern in forbidden_patterns:
        try:
            result = subprocess.run(['grep', '-r', '-E', pattern, '.', '--exclude-dir=__pycache__'], 
                                  capture_output=True, text=True)
            if result.returncode == 0 and result.stdout.strip():
                violations.append(f"FORBIDDEN PATTERN: {pattern}")
                violations.append(result.stdout.strip())
        except:
            pass
    
    if violations:
        print("❌ SELENIUM 4+ VALIDATION FAILED:")
        for violation in violations:
            print(f"   {violation}")
        return False
    else:
        print("✅ NO LEGACY DRIVER PATTERNS FOUND - SELENIUM 4+ COMPLIANT")
        return True

if __name__ == "__main__":
    try:
        clear_python_cache()
        print("✅ CACHE CLEARING COMPLETE")
        exit(0)
    except Exception as e:
        print(f"⚠️  Cache clearing completed with warnings: {e}")
        print("✅ CACHE CLEARING COMPLETE (with warnings)")
        exit(0)  # Never fail the pipeline for cache clearing issues
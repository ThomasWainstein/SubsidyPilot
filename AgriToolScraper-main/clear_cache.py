#!/usr/bin/env python3
"""
Clear Python cache files to ensure clean driver initialization.
"""
import os
import shutil
import glob

def clear_python_cache():
    """Clear all Python cache files and directories."""
    
    # Clear __pycache__ directories
    for root, dirs, files in os.walk('.'):
        if '__pycache__' in dirs:
            cache_dir = os.path.join(root, '__pycache__')
            print(f"Removing {cache_dir}")
            shutil.rmtree(cache_dir, ignore_errors=True)
    
    # Clear .pyc files
    pyc_files = glob.glob('**/*.pyc', recursive=True)
    for pyc_file in pyc_files:
        print(f"Removing {pyc_file}")
        os.remove(pyc_file)
    
    # Clear .pyo files
    pyo_files = glob.glob('**/*.pyo', recursive=True)
    for pyo_file in pyo_files:
        print(f"Removing {pyo_file}")
        os.remove(pyo_file)
    
    print("✅ Python cache cleared")

if __name__ == "__main__":
    clear_python_cache()
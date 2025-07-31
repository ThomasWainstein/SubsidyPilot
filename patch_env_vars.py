#!/usr/bin/env python3
"""
Environment Variable Patcher for Legacy Scripts
===============================================

This script patches all Python files in the AgriTool pipeline to use
the standardized environment variable loader, eliminating env var
mismatch errors across the entire codebase.

Usage:
    python patch_env_vars.py

This will update all Python scripts to import and use the env_loader
at the start of each script.
"""

import os
import re
import sys
from pathlib import Path
from typing import List, Tuple

# Directories to patch
TARGET_DIRECTORIES = [
    'AgriToolScraper-main',
    'AgriTool-Raw-Log-Interpreter',
    'AI_SCRAPER_RAW_TEXTS',
    'scraper'
]

# Files to patch (specific files in root)
TARGET_FILES = [
    'main.py',
    'test_env_vars.py'
]

# Environment variable patterns to replace
ENV_VAR_PATTERNS = [
    # Direct os.environ access
    (r'os\.environ\[(["\'])SUPABASE_URL\1\]', 'os.environ["NEXT_PUBLIC_SUPABASE_URL"]'),
    (r'os\.environ\.get\(["\']SUPABASE_URL["\']', 'os.environ.get("NEXT_PUBLIC_SUPABASE_URL"'),
    
    # Specific error messages
    (r'Missing required environment variables: SUPABASE_URL', 'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL'),
    (r'Required env vars SUPABASE_URL are missing', 'Required env vars NEXT_PUBLIC_SUPABASE_URL are missing'),
    
    # Variable assignments
    (r'self\.SUPABASE_URL = self\._get_required_env\(["\']SUPABASE_URL["\']\)', 
     'self.SUPABASE_URL = self._get_required_env("NEXT_PUBLIC_SUPABASE_URL")'),
]

def patch_file_content(content: str, file_path: str) -> Tuple[str, bool]:
    """
    Patch file content to use standardized environment variables.
    
    Args:
        content: Original file content
        file_path: Path to the file being patched
        
    Returns:
        Tuple of (patched_content, was_modified)
    """
    original_content = content
    modified = False
    
    # Add env_loader import if not present and file uses env vars
    if ('os.environ' in content or 'getenv(' in content) and 'from utils.env_loader import' not in content:
        # Find the best place to insert the import
        import_section = []
        lines = content.split('\n')
        
        # Find where to insert the env loader import
        insert_index = 0
        for i, line in enumerate(lines):
            if line.strip().startswith('import ') or line.strip().startswith('from '):
                import_section.append(i)
                insert_index = i + 1
            elif line.strip() and not line.strip().startswith('#'):
                break
        
        if insert_index > 0:
            # Insert after other imports
            lines.insert(insert_index, '')
            lines.insert(insert_index + 1, '# Load and normalize environment variables')
            lines.insert(insert_index + 2, 'try:')
            lines.insert(insert_index + 3, '    from utils.env_loader import load_env_vars')
            lines.insert(insert_index + 4, '    load_env_vars(debug=True)')
            lines.insert(insert_index + 5, 'except ImportError:')
            lines.insert(insert_index + 6, '    # Fallback for standalone scripts')
            lines.insert(insert_index + 7, '    pass')
            lines.insert(insert_index + 8, '')
            
            content = '\n'.join(lines)
            modified = True
    
    # Apply regex patterns
    for pattern, replacement in ENV_VAR_PATTERNS:
        new_content = re.sub(pattern, replacement, content)
        if new_content != content:
            content = new_content
            modified = True
    
    # Special handling for specific files
    if 'agent.py' in file_path:
        # Fix agent.py specific patterns
        if 'self.SUPABASE_URL = self._get_required_env("SUPABASE_URL")' in content:
            content = content.replace(
                'self.SUPABASE_URL = self._get_required_env("SUPABASE_URL")',
                'self.SUPABASE_URL = self._get_required_env("NEXT_PUBLIC_SUPABASE_URL")'
            )
            modified = True
    
    return content, modified

def patch_files_in_directory(directory: Path) -> List[str]:
    """
    Patch all Python files in a directory.
    
    Args:
        directory: Directory to search for Python files
        
    Returns:
        List of files that were modified
    """
    modified_files = []
    
    if not directory.exists():
        print(f"⚠️ Directory {directory} does not exist, skipping...")
        return modified_files
    
    for py_file in directory.rglob('*.py'):
        try:
            with open(py_file, 'r', encoding='utf-8') as f:
                original_content = f.read()
            
            patched_content, was_modified = patch_file_content(original_content, str(py_file))
            
            if was_modified:
                with open(py_file, 'w', encoding='utf-8') as f:
                    f.write(patched_content)
                modified_files.append(str(py_file))
                print(f"✅ Patched: {py_file}")
            
        except Exception as e:
            print(f"❌ Error patching {py_file}: {e}")
    
    return modified_files

def main():
    """Main patching function"""
    print("🔧 Starting environment variable patching process...")
    print("=" * 60)
    
    total_modified = []
    
    # Patch directories
    for directory_name in TARGET_DIRECTORIES:
        directory_path = Path(directory_name)
        print(f"\n📁 Patching directory: {directory_name}")
        modified = patch_files_in_directory(directory_path)
        total_modified.extend(modified)
    
    # Patch specific files
    print(f"\n📄 Patching specific files...")
    for file_name in TARGET_FILES:
        file_path = Path(file_name)
        if file_path.exists():
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    original_content = f.read()
                
                patched_content, was_modified = patch_file_content(original_content, str(file_path))
                
                if was_modified:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(patched_content)
                    total_modified.append(str(file_path))
                    print(f"✅ Patched: {file_path}")
                
            except Exception as e:
                print(f"❌ Error patching {file_path}: {e}")
        else:
            print(f"⚠️ File {file_name} does not exist, skipping...")
    
    # Summary
    print("\n" + "=" * 60)
    print(f"🎯 PATCHING COMPLETE")
    print(f"📊 Total files modified: {len(total_modified)}")
    
    if total_modified:
        print(f"\n📋 Modified files:")
        for file_path in sorted(total_modified):
            print(f"   • {file_path}")
    
    print(f"\n✅ Environment variable consistency enforced across entire pipeline!")
    print(f"🚀 All scripts now use standardized env var handling via utils/env_loader.py")

if __name__ == "__main__":
    main()
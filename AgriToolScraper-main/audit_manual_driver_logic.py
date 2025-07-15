#!/usr/bin/env python3
"""
Critical audit script to detect any remaining manual ChromeDriver path logic.
This script scans the entire codebase for patterns that could cause [Errno 8] issues.
"""

import os
import re
import sys
from pathlib import Path

# Patterns that indicate manual driver path handling (FORBIDDEN)
FORBIDDEN_PATTERNS = [
    r'os\.listdir.*driver',
    r'glob\.glob.*driver',
    r'chromedriver_path\s*=',
    r'executable_path\s*=',
    r'driver.*path.*=.*usr/bin',
    r'driver.*path.*=.*home.*\.wdm',
    r'\.wdm.*drivers.*linux',
    r'THIRD_PARTY_NOTICES\.chromedriver',
    r'find.*chromedriver',
    r'which\s+chromedriver',
    r'shutil\.which.*chromedriver',
    r'os\.path\.join.*chromedriver',
    r'\/usr\/bin\/chromedriver',
    r'\/snap.*chromium.*chromedriver',
    r'chromium-chromedriver',
    r'apt.*chromedriver',
    r'rm.*\.wdm',
    r'rmdir.*\.wdm',
    r'shutil\.rmtree.*\.wdm',
]

# Allowed patterns (webdriver-manager usage)
ALLOWED_PATTERNS = [
    r'ChromeDriverManager\(\)\.install\(\)',
    r'from webdriver_manager\.chrome import ChromeDriverManager',
    r'# .*webdriver-manager',  # Comments about webdriver-manager
]

def scan_file(filepath):
    """Scan a single file for forbidden patterns."""
    issues = []
    
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            lines = content.split('\n')
            
        for line_num, line in enumerate(lines, 1):
            # Skip comments and docstrings for most checks
            stripped_line = line.strip()
            if stripped_line.startswith('#') or stripped_line.startswith('"""') or stripped_line.startswith("'''"):
                continue
                
            # Check for forbidden patterns
            for pattern in FORBIDDEN_PATTERNS:
                if re.search(pattern, line, re.IGNORECASE):
                    issues.append({
                        'file': filepath,
                        'line': line_num,
                        'content': line.strip(),
                        'pattern': pattern,
                        'severity': 'CRITICAL' if any(x in pattern for x in ['listdir', 'executable_path', 'THIRD_PARTY']) else 'HIGH'
                    })
    
    except Exception as e:
        print(f"[WARN] Could not scan {filepath}: {e}")
    
    return issues

def scan_directory(directory):
    """Scan all Python files in a directory."""
    all_issues = []
    
    # File patterns to scan
    patterns = ['*.py', '*.yml', '*.yaml', '*.sh', '*.json']
    
    for pattern in patterns:
        for filepath in Path(directory).rglob(pattern):
            # Skip cache and build directories
            if any(skip in str(filepath) for skip in ['__pycache__', '.git', 'node_modules', '.pytest_cache']):
                continue
                
            issues = scan_file(filepath)
            all_issues.extend(issues)
    
    return all_issues

def main():
    """Run the audit and report results."""
    print("="*80)
    print("AGRITOOL SCRAPER - MANUAL DRIVER LOGIC AUDIT")
    print("="*80)
    print()
    print("Scanning for forbidden patterns that could cause [Errno 8] ChromeDriver issues...")
    print()
    
    # Scan the entire project
    project_root = Path(__file__).parent
    issues = scan_directory(project_root)
    
    if not issues:
        print("✅ SUCCESS: No forbidden manual driver logic found!")
        print("✅ The codebase appears to use only webdriver-manager")
        print()
        print("VERIFIED COMPLIANCE:")
        print("- No os.listdir() or glob patterns for drivers")
        print("- No executable_path references") 
        print("- No manual .wdm directory manipulation")
        print("- No hardcoded driver paths")
        print()
        return True
    
    # Group issues by severity
    critical_issues = [i for i in issues if i['severity'] == 'CRITICAL']
    high_issues = [i for i in issues if i['severity'] == 'HIGH']
    
    print(f"❌ AUDIT FAILED: Found {len(issues)} potential issues")
    print(f"   - Critical: {len(critical_issues)}")
    print(f"   - High: {len(high_issues)}")
    print()
    
    # Report critical issues first
    if critical_issues:
        print("🚨 CRITICAL ISSUES (will cause [Errno 8]):")
        print("-" * 60)
        for issue in critical_issues:
            print(f"File: {issue['file']}")
            print(f"Line {issue['line']}: {issue['content']}")
            print(f"Pattern: {issue['pattern']}")
            print()
    
    # Report high priority issues
    if high_issues:
        print("⚠️ HIGH PRIORITY ISSUES:")
        print("-" * 60)
        for issue in high_issues:
            print(f"File: {issue['file']}")
            print(f"Line {issue['line']}: {issue['content']}")
            print(f"Pattern: {issue['pattern']}")
            print()
    
    print("REMEDIATION REQUIRED:")
    print("1. Remove all manual driver path logic")
    print("2. Use ONLY webdriver-manager APIs") 
    print("3. Remove any directory scanning for drivers")
    print("4. Remove manual .wdm directory manipulation")
    print()
    
    return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

#!/usr/bin/env python3
"""
Enhanced audit script to detect any remaining manual ChromeDriver path logic.
This script scans the entire codebase for patterns that could cause [Errno 8] issues.
Now includes YAML workflow analysis and cache manipulation detection.
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
    r'wget.*chromedriver',
    r'curl.*chromedriver',
    r'download.*chromedriver',
    # Cache manipulation patterns (dangerous)
    r'rm.*\.wdm',
    r'rmdir.*\.wdm', 
    r'shutil\.rmtree.*\.wdm',
    r'os\.remove.*\.wdm',
    r'os\.rmdir.*\.wdm',
    r'unlink.*\.wdm',
]

# YAML-specific forbidden patterns
YAML_FORBIDDEN_PATTERNS = [
    r'apt.*install.*chromedriver',
    r'wget.*chromedriver',
    r'curl.*chromedriver',
    r'download.*chromedriver',
    r'rm.*\.wdm',
    r'rmdir.*\.wdm',
    r'chromedriver.*binary',
    r'executable_path',
    r'CHROMEDRIVER_PATH',
]

# Allowed patterns (webdriver-manager usage)
ALLOWED_PATTERNS = [
    r'ChromeDriverManager\(\)\.install\(\)',
    r'from webdriver_manager\.chrome import ChromeDriverManager',
    r'# .*webdriver-manager',  # Comments about webdriver-manager
    r'purge_corrupted_wdm_cache',  # Our controlled cache purge function
    r'validate_driver_binary',  # Our validation function
]

def scan_file(filepath, is_yaml=False):
    """Scan a single file for forbidden patterns."""
    issues = []
    patterns = YAML_FORBIDDEN_PATTERNS if is_yaml else FORBIDDEN_PATTERNS
    
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            lines = content.split('\n')
            
        for line_num, line in enumerate(lines, 1):
            # Skip comments for Python files (but not YAML)
            stripped_line = line.strip()
            if not is_yaml and (stripped_line.startswith('#') or stripped_line.startswith('"""') or stripped_line.startswith("'''")):
                continue
                
            # Check for forbidden patterns
            for pattern in patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    # Check if it's an allowed exception
                    is_allowed = False
                    for allowed_pattern in ALLOWED_PATTERNS:
                        if re.search(allowed_pattern, line, re.IGNORECASE):
                            is_allowed = True
                            break
                    
                    if not is_allowed:
                        severity = 'CRITICAL'
                        if any(x in pattern for x in ['apt', 'wget', 'curl']):
                            severity = 'CRITICAL'
                        elif any(x in pattern for x in ['listdir', 'executable_path', 'THIRD_PARTY']):
                            severity = 'CRITICAL'
                        else:
                            severity = 'HIGH'
                            
                        issues.append({
                            'file': filepath,
                            'line': line_num,
                            'content': line.strip(),
                            'pattern': pattern,
                            'severity': severity,
                            'file_type': 'YAML' if is_yaml else 'Python'
                        })
    
    except Exception as e:
        print(f"[WARN] Could not scan {filepath}: {e}")
    
    return issues

def scan_directory(directory):
    """Scan all relevant files in a directory."""
    all_issues = []
    
    # File patterns to scan
    python_patterns = ['*.py']
    yaml_patterns = ['*.yml', '*.yaml']
    other_patterns = ['*.sh', '*.json', '*.md']
    
    # Scan Python files
    for pattern in python_patterns:
        for filepath in Path(directory).rglob(pattern):
            if any(skip in str(filepath) for skip in ['__pycache__', '.git', 'node_modules', '.pytest_cache']):
                continue
            issues = scan_file(filepath, is_yaml=False)
            all_issues.extend(issues)
    
    # Scan YAML files (GitHub Actions workflows)
    for pattern in yaml_patterns:
        for filepath in Path(directory).rglob(pattern):
            if any(skip in str(filepath) for skip in ['.git', 'node_modules']):
                continue
            issues = scan_file(filepath, is_yaml=True)
            all_issues.extend(issues)
    
    # Scan other files
    for pattern in other_patterns:
        for filepath in Path(directory).rglob(pattern):
            if any(skip in str(filepath) for skip in ['__pycache__', '.git', 'node_modules']):
                continue
            issues = scan_file(filepath, is_yaml=False)
            all_issues.extend(issues)
    
    return all_issues

def main():
    """Run the enhanced audit and report results."""
    print("="*80)
    print("AGRITOOL SCRAPER - ENHANCED MANUAL DRIVER LOGIC AUDIT")
    print("="*80)
    print()
    print("Scanning for forbidden patterns that could cause [Errno 8] ChromeDriver issues...")
    print("Now includes YAML workflow analysis and cache manipulation detection...")
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
        print("- No YAML workflow driver installations")
        print("- No dangerous cache manipulation")
        print()
        return True
    
    # Group issues by severity and file type
    critical_issues = [i for i in issues if i['severity'] == 'CRITICAL']
    high_issues = [i for i in issues if i['severity'] == 'HIGH']
    python_issues = [i for i in issues if i['file_type'] == 'Python']
    yaml_issues = [i for i in issues if i['file_type'] == 'YAML']
    
    print(f"❌ AUDIT FAILED: Found {len(issues)} potential issues")
    print(f"   - Critical: {len(critical_issues)}")
    print(f"   - High: {len(high_issues)}")
    print(f"   - Python files: {len(python_issues)}")
    print(f"   - YAML files: {len(yaml_issues)}")
    print()
    
    # Report critical issues first
    if critical_issues:
        print("🚨 CRITICAL ISSUES (will cause [Errno 8]):")
        print("-" * 60)
        for issue in critical_issues:
            print(f"File: {issue['file']} ({issue['file_type']})")
            print(f"Line {issue['line']}: {issue['content']}")
            print(f"Pattern: {issue['pattern']}")
            print()
    
    # Report high priority issues
    if high_issues:
        print("⚠️ HIGH PRIORITY ISSUES:")
        print("-" * 60)
        for issue in high_issues:
            print(f"File: {issue['file']} ({issue['file_type']})")
            print(f"Line {issue['line']}: {issue['content']}")
            print(f"Pattern: {issue['pattern']}")
            print()
    
    print("ENHANCED REMEDIATION REQUIRED:")
    print("1. Remove all manual driver path logic from Python code")
    print("2. Remove all manual driver installations from YAML workflows") 
    print("3. Use ONLY webdriver-manager APIs")
    print("4. Remove any directory scanning for drivers")
    print("5. Only use controlled cache purging (purge_corrupted_wdm_cache)")
    print("6. Never install chromedriver via apt/wget/curl in CI")
    print()
    
    return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

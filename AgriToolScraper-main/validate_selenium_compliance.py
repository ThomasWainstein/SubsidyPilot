#!/usr/bin/env python3
"""
RUTHLESS SELENIUM 4+ COMPLIANCE VALIDATOR
Scans entire codebase for forbidden patterns.
ZERO TOLERANCE - Any violation causes immediate failure.
"""

import os
import re
import sys
import glob
from typing import List, Tuple, Dict

# Forbidden patterns that cause build failure
FORBIDDEN_PATTERNS = {
    'multiple_args_chrome': {
        'regex': r'webdriver\.Chrome\([^)]*,[^)]*\)',
        'description': 'Multiple positional arguments to webdriver.Chrome()',
        'severity': 'CRITICAL'
    },
    'multiple_args_firefox': {
        'regex': r'webdriver\.Firefox\([^)]*,[^)]*\)',
        'description': 'Multiple positional arguments to webdriver.Firefox()',
        'severity': 'CRITICAL'
    },
    'chrome_options_keyword': {
        'regex': r'chrome_options\s*=',
        'description': 'Legacy chrome_options keyword parameter',
        'severity': 'CRITICAL'
    },
    'firefox_options_keyword': {
        'regex': r'firefox_options\s*=',
        'description': 'Legacy firefox_options keyword parameter',
        'severity': 'CRITICAL'
    },
    'executable_path_keyword': {
        'regex': r'executable_path\s*=',
        'description': 'Deprecated executable_path parameter',
        'severity': 'CRITICAL'
    },
    'webdriver_chrome_legacy': {
        'regex': r'webdriver\.Chrome\([^)]*\w+[^)]*options\s*=',
        'description': 'Legacy Chrome instantiation pattern',
        'severity': 'HIGH'
    },
    'webdriver_firefox_legacy': {
        'regex': r'webdriver\.Firefox\([^)]*\w+[^)]*options\s*=',
        'description': 'Legacy Firefox instantiation pattern',
        'severity': 'HIGH'
    }
}

# Documentation files with educational examples (excluded from violations)
EXCLUDED_DOC_FILES = {
    'README.md',
    'SELENIUM_4_COMPLIANCE_ENFORCEMENT.md', 
    'SELENIUM_4_COMPLIANCE_PROOF.md',
    'SELENIUM_4_AUDIT_SUMMARY.md'
}

def scan_file(file_path: str) -> List[Tuple[str, int, str, str]]:
    """
    Scan a single file for forbidden patterns.
    Excludes documentation files with educational examples.
    
    Returns:
        List of (pattern_name, line_number, line_content, severity)
    """
    violations = []
    
    # Skip documentation files that contain educational examples
    filename = os.path.basename(file_path)
    if filename in EXCLUDED_DOC_FILES:
        return violations
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            in_code_block = False
            
            for line_num, line in enumerate(lines, 1):
                # Track if we're in a code block in markdown files
                if file_path.endswith('.md'):
                    if line.strip().startswith('```'):
                        in_code_block = not in_code_block
                        continue
                    # Skip lines that are clearly documentation examples
                    if in_code_block and ('# ❌' in line or '# FORBIDDEN' in line or '# WRONG' in line):
                        continue
                
                # Check for forbidden patterns in actual code
                for pattern_name, pattern_info in FORBIDDEN_PATTERNS.items():
                    if re.search(pattern_info['regex'], line):
                        # Additional context check for .py files
                        if file_path.endswith('.py'):
                            # Skip commented examples
                            stripped = line.strip()
                            if stripped.startswith('#') and ('example' in stripped.lower() or 'wrong' in stripped.lower() or 'forbidden' in stripped.lower()):
                                continue
                        
                        violations.append((
                            pattern_name,
                            line_num,
                            line.strip(),
                            pattern_info['severity']
                        ))
    except UnicodeDecodeError:
        # Skip binary files
        pass
    except Exception as e:
        print(f"Warning: Could not scan {file_path}: {e}")
    
    return violations

def scan_codebase(root_dir: str = ".") -> Dict[str, List[Tuple[str, int, str, str]]]:
    """
    Scan entire codebase for forbidden patterns.
    
    Returns:
        Dictionary mapping file paths to their violations
    """
    all_violations = {}
    
    # File patterns to scan
    file_patterns = [
        "**/*.py",
        "**/*.md", 
        "**/*.rst",
        "**/*.txt",
        "**/*.yml",
        "**/*.yaml"
    ]
    
    scanned_files = set()
    
    for pattern in file_patterns:
        for file_path in glob.glob(os.path.join(root_dir, pattern), recursive=True):
            if file_path in scanned_files:
                continue
            
            scanned_files.add(file_path)
            violations = scan_file(file_path)
            
            if violations:
                all_violations[file_path] = violations
    
    return all_violations

def print_violation_report(violations: Dict[str, List[Tuple[str, int, str, str]]]) -> bool:
    """
    Print detailed violation report.
    
    Returns:
        True if violations found, False otherwise
    """
    if not violations:
        print("🔥 SELENIUM 4+ COMPLIANCE VALIDATION PASSED")
        print("✅ ZERO VIOLATIONS DETECTED")
        print("✅ 100% SELENIUM 4+ COMPLIANT")
        return False
    
    print("❌ SELENIUM 4+ COMPLIANCE VIOLATIONS DETECTED")
    print("=" * 80)
    
    total_violations = 0
    critical_violations = 0
    
    for file_path, file_violations in violations.items():
        print(f"\n📁 FILE: {file_path}")
        print("-" * 60)
        
        for pattern_name, line_num, line_content, severity in file_violations:
            total_violations += 1
            if severity == 'CRITICAL':
                critical_violations += 1
            
            pattern_info = FORBIDDEN_PATTERNS[pattern_name]
            
            print(f"🚨 {severity}: Line {line_num}")
            print(f"   Pattern: {pattern_name}")
            print(f"   Issue: {pattern_info['description']}")
            print(f"   Code: {line_content}")
            print(f"   Regex: {pattern_info['regex']}")
            print()
    
    print("=" * 80)
    print(f"📊 VIOLATION SUMMARY")
    print(f"   Total violations: {total_violations}")
    print(f"   Critical violations: {critical_violations}")
    print(f"   Files affected: {len(violations)}")
    print()
    
    if critical_violations > 0:
        print("🔥 CRITICAL VIOLATIONS DETECTED - BUILD MUST FAIL")
        print("❌ ALL CRITICAL ISSUES MUST BE FIXED BEFORE PROCEEDING")
    
    print("\n📋 REQUIRED FIXES:")
    print("1. Replace all webdriver.Chrome(path, options=opts) with service pattern")
    print("2. Replace all chrome_options= with options=")
    print("3. Replace all executable_path= with service=Service(path)")
    print("4. Update documentation to show only compliant patterns")
    print()
    print("📖 See SELENIUM_4_COMPLIANCE_ENFORCEMENT.md for examples")
    
    return True

def main():
    """Main compliance validation entry point."""
    print("🔥 STARTING RUTHLESS SELENIUM 4+ COMPLIANCE VALIDATION")
    print("🔍 Scanning entire codebase for forbidden patterns...")
    print()
    
    # Scan from current directory
    violations = scan_codebase()
    
    # Print detailed report
    has_violations = print_violation_report(violations)
    
    if has_violations:
        print("\n❌ COMPLIANCE VALIDATION FAILED")
        print("❌ DO NOT COMMIT OR MERGE")
        print("❌ FIX ALL VIOLATIONS FIRST")
        sys.exit(1)
    else:
        print("\n🔥 COMPLIANCE VALIDATION PASSED")
        print("✅ READY FOR COMMIT/MERGE")
        print("✅ SELENIUM 4+ ENFORCEMENT SUCCESSFUL")
        sys.exit(0)

if __name__ == "__main__":
    main()
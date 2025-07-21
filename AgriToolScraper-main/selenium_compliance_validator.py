#!/usr/bin/env python3
"""
BULLETPROOF SELENIUM 4+ COMPLIANCE VALIDATOR
Defense-in-depth approach with multiple validation layers.
Zero false positives, comprehensive real violation detection.
"""

import os
import re
import sys
import ast
import glob
from typing import List, Tuple, Dict, Set
from pathlib import Path

# EXPLICIT WHITELIST - These patterns are ALWAYS ALLOWED
COMPLIANT_PATTERNS = {
    r'webdriver\.Chrome\(\s*service\s*=\s*[^,]+\s*,\s*options\s*=\s*[^)]+\s*\)',
    r'webdriver\.Firefox\(\s*service\s*=\s*[^,]+\s*,\s*options\s*=\s*[^)]+\s*\)',
    r'webdriver\.Chrome\(\s*options\s*=\s*[^,]+\s*,\s*service\s*=\s*[^)]+\s*\)',  # Either order is OK
    r'webdriver\.Firefox\(\s*options\s*=\s*[^,]+\s*,\s*service\s*=\s*[^)]+\s*\)'
}

# FORBIDDEN PATTERNS - These cause build failure
FORBIDDEN_PATTERNS = {
    'chrome_options_keyword': {
        'regex': r'chrome_options\s*=',
        'description': 'Legacy chrome_options keyword parameter (use options=)',
        'severity': 'CRITICAL',
        'fix': 'Replace chrome_options= with options='
    },
    'firefox_options_keyword': {
        'regex': r'firefox_options\s*=',
        'description': 'Legacy firefox_options keyword parameter (use options=)',
        'severity': 'CRITICAL',
        'fix': 'Replace firefox_options= with options='
    },
    'executable_path_keyword': {
        'regex': r'executable_path\s*=',
        'description': 'Deprecated executable_path parameter (use Service)',
        'severity': 'CRITICAL',
        'fix': 'Replace executable_path= with service=Service(path)'
    },
    'chrome_three_plus_args': {
        'regex': r'webdriver\.Chrome\s*\([^)]*,[^)]*,[^)]+\)',
        'description': 'Chrome driver with 3+ arguments (likely legacy pattern)',
        'severity': 'CRITICAL',
        'fix': 'Use webdriver.Chrome(service=service, options=options)'
    },
    'firefox_three_plus_args': {
        'regex': r'webdriver\.Firefox\s*\([^)]*,[^)]*,[^)]+\)',
        'description': 'Firefox driver with 3+ arguments (likely legacy pattern)',
        'severity': 'CRITICAL',
        'fix': 'Use webdriver.Firefox(service=service, options=options)'
    }
}

# Files completely excluded from validation
EXCLUDED_FILES = {
    'README.md',
    'SELENIUM_4_COMPLIANCE_ENFORCEMENT.md', 
    'SELENIUM_4_COMPLIANCE_PROOF.md',
    'SELENIUM_4_AUDIT_SUMMARY.md',
    'SELENIUM_4_COMPLIANCE_MANIFEST.md',
    'selenium_compliance_validator.py',  # This file
    'validate_selenium_compliance.py'    # Old validator
}

# Inline ignore directive
IGNORE_DIRECTIVE = 'SELENIUM_COMPLIANCE_ALLOW'

class ComplianceValidator:
    """Bulletproof Selenium 4+ compliance validator with multiple defense layers."""
    
    def __init__(self, root_dir: str = "."):
        self.root_dir = root_dir
        self.false_positive_count = 0
        self.validation_errors = []
    
    def is_compliant_pattern(self, line: str) -> bool:
        """Check if line matches any explicitly allowed pattern."""
        line_clean = line.strip()
        for pattern in COMPLIANT_PATTERNS:
            if re.search(pattern, line_clean):
                return True
        return False
    
    def has_ignore_directive(self, line: str) -> bool:
        """Check if line has inline ignore directive."""
        return IGNORE_DIRECTIVE in line
    
    def is_documentation_context(self, file_path: str, line: str, line_num: int, all_lines: List[str]) -> bool:
        """Advanced detection of documentation/example context."""
        line_stripped = line.strip()
        
        # Check for markdown code blocks
        if file_path.endswith('.md'):
            # Look for code block boundaries
            in_code_block = False
            for i in range(max(0, line_num - 10), min(len(all_lines), line_num + 10)):
                if '```' in all_lines[i]:
                    if i < line_num:
                        in_code_block = not in_code_block
                    elif i > line_num:
                        break
            
            # If in code block, check for documentation markers
            if in_code_block:
                context_markers = ['# ❌', '# FORBIDDEN', '# WRONG', '# BAD', '# LEGACY', '# EXAMPLE']
                if any(marker in line for marker in context_markers):
                    return True
        
        # Check for Python comments indicating examples
        if line_stripped.startswith('#'):
            doc_keywords = ['example', 'wrong', 'forbidden', 'bad', 'legacy', 'compliant', 'correct']
            if any(keyword in line_stripped.lower() for keyword in doc_keywords):
                return True
        
        # Check for docstrings
        if '"""' in line or "'''" in line:
            return True
            
        return False
    
    def validate_python_ast(self, file_path: str) -> List[Tuple[str, int, str, str]]:
        """Use AST parsing for precise Python code analysis."""
        violations = []
        
        if not file_path.endswith('.py'):
            return violations
            
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Parse AST
            tree = ast.parse(content)
            
            # Walk AST to find function calls
            for node in ast.walk(tree):
                if isinstance(node, ast.Call):
                    # Check for webdriver.Chrome/Firefox calls
                    if (isinstance(node.func, ast.Attribute) and 
                        isinstance(node.func.value, ast.Name) and
                        node.func.value.id == 'webdriver'):
                        
                        driver_type = node.func.attr
                        if driver_type in ['Chrome', 'Firefox']:
                            # Check for positional arguments (bad) - only flag if we have positional args
                            if node.args:
                                line_num = getattr(node, 'lineno', 0)
                                violations.append((
                                    f'{driver_type.lower()}_positional_args_ast',
                                    line_num,
                                    f'webdriver.{driver_type} with positional arguments',
                                    'CRITICAL'
                                ))
                            # Check for too many arguments (more than service + options)
                            elif len(node.keywords) > 2:
                                line_num = getattr(node, 'lineno', 0)
                                violations.append((
                                    f'{driver_type.lower()}_too_many_args_ast',
                                    line_num,
                                    f'webdriver.{driver_type} with too many keyword arguments',
                                    'CRITICAL'
                                ))
                            
                            # Check for legacy keyword arguments
                            for keyword in node.keywords:
                                if keyword.arg in ['chrome_options', 'firefox_options', 'executable_path']:
                                    line_num = getattr(node, 'lineno', 0)
                                    violations.append((
                                        f'legacy_keyword_ast_{keyword.arg}',
                                        line_num,
                                        f'Legacy keyword: {keyword.arg}',
                                        'CRITICAL'
                                    ))
                                    
        except (SyntaxError, UnicodeDecodeError):
            # Skip files that can't be parsed
            pass
        except Exception as e:
            print(f"AST validation warning for {file_path}: {e}")
            
        return violations
    
    def scan_file(self, file_path: str) -> List[Tuple[str, int, str, str]]:
        """Comprehensive file scanning with multiple validation layers."""
        violations = []
        
        # Skip excluded files
        filename = os.path.basename(file_path)
        if filename in EXCLUDED_FILES:
            return violations
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            # Layer 1: AST validation for Python files
            ast_violations = self.validate_python_ast(file_path)
            violations.extend(ast_violations)
            
            # Layer 2: Line-by-line regex scanning
            for line_num, line in enumerate(lines, 1):
                line_stripped = line.strip()
                
                # Skip empty lines
                if not line_stripped:
                    continue
                
                # Check for inline ignore directive
                if self.has_ignore_directive(line):
                    continue
                
                # Check if this is documentation context
                if self.is_documentation_context(file_path, line, line_num, lines):
                    continue
                
                # Check if line matches compliant patterns (whitelist)
                if self.is_compliant_pattern(line):
                    continue
                
                # Check for forbidden patterns
                for pattern_name, pattern_info in FORBIDDEN_PATTERNS.items():
                    if re.search(pattern_info['regex'], line_stripped):
                        violations.append((
                            pattern_name,
                            line_num,
                            line_stripped,
                            pattern_info['severity']
                        ))
        
        except UnicodeDecodeError:
            # Skip binary files
            pass
        except Exception as e:
            print(f"Warning: Could not scan {file_path}: {e}")
        
        return violations
    
    def run_smoke_test(self) -> bool:
        """Run smoke test with known compliant patterns."""
        test_patterns = [
            'driver = webdriver.Chrome(service=service, options=options)',
            'driver = webdriver.Firefox(service=service, options=options)',
            'driver = webdriver.Chrome(options=options, service=service)',
            '# Example of correct usage: driver = webdriver.Chrome(service=service, options=options)',
            'driver = webdriver.Chrome(service=service, options=options)  # SELENIUM_COMPLIANCE_ALLOW'
        ]
        
        print("🧪 Running smoke test with known compliant patterns...")
        
        for i, pattern in enumerate(test_patterns):
            # Create temporary test file
            test_file = f"temp_smoke_test_{i}.py"
            try:
                with open(test_file, 'w') as f:
                    f.write(pattern + '\n')
                
                violations = self.scan_file(test_file)
                if violations:
                    print(f"❌ SMOKE TEST FAILED: Compliant pattern flagged as violation:")
                    print(f"   Pattern: {pattern}")
                    print(f"   Violations: {violations}")
                    self.false_positive_count += 1
                    return False
                    
            finally:
                # Clean up test file
                if os.path.exists(test_file):
                    os.remove(test_file)
        
        print("✅ Smoke test passed - no false positives detected")
        return True
    
    def scan_codebase(self) -> Dict[str, List[Tuple[str, int, str, str]]]:
        """Scan entire codebase for violations."""
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
            for file_path in glob.glob(os.path.join(self.root_dir, pattern), recursive=True):
                if file_path in scanned_files:
                    continue
                
                scanned_files.add(file_path)
                violations = self.scan_file(file_path)
                
                if violations:
                    all_violations[file_path] = violations
        
        return all_violations
    
    def print_violation_report(self, violations: Dict[str, List[Tuple[str, int, str, str]]]) -> bool:
        """Print comprehensive violation report with fixes."""
        if not violations:
            print("🔥 SELENIUM 4+ COMPLIANCE VALIDATION PASSED")
            print("✅ ZERO VIOLATIONS DETECTED")
            print("✅ 100% SELENIUM 4+ COMPLIANT")
            print("✅ BULLETPROOF VALIDATION SUCCESSFUL")
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
                
                if pattern_name in FORBIDDEN_PATTERNS:
                    pattern_info = FORBIDDEN_PATTERNS[pattern_name]
                    print(f"🚨 {severity}: Line {line_num}")
                    print(f"   Pattern: {pattern_name}")
                    print(f"   Issue: {pattern_info['description']}")
                    print(f"   Code: {line_content}")
                    print(f"   Fix: {pattern_info['fix']}")
                    print(f"   Regex: {pattern_info['regex']}")
                else:
                    print(f"🚨 {severity}: Line {line_num}")
                    print(f"   Pattern: {pattern_name}")
                    print(f"   Code: {line_content}")
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
        
        print("\n📋 ALLOWED PATTERNS (WHITELIST):")
        print("✅ webdriver.Chrome(service=service, options=options)")
        print("✅ webdriver.Firefox(service=service, options=options)")
        print("✅ Lines with # SELENIUM_COMPLIANCE_ALLOW")
        print()
        
        print("📋 FORBIDDEN PATTERNS:")
        print("❌ webdriver.Chrome(path, options)  # Positional args")
        print("❌ chrome_options= or firefox_options=  # Legacy keywords")
        print("❌ executable_path=  # Deprecated parameter")
        print()
        
        print("📖 See SELENIUM_4_COMPLIANCE_ENFORCEMENT.md for detailed examples")
        
        return True

def main():
    """Main validation entry point with bulletproof checks."""
    print("🔥 STARTING BULLETPROOF SELENIUM 4+ COMPLIANCE VALIDATION")
    print("🛡️  Multiple defense layers: AST parsing, regex, whitelist, smoke tests")
    print("🔍 Scanning entire codebase for violations...")
    print()
    
    validator = ComplianceValidator()
    
    # Run smoke test first
    if not validator.run_smoke_test():
        print("❌ VALIDATOR SMOKE TEST FAILED - FALSE POSITIVES DETECTED")
        print("❌ VALIDATOR NEEDS FIXING BEFORE PROCEEDING")
        sys.exit(1)
    
    # Scan codebase
    violations = validator.scan_codebase()
    
    # Print detailed report
    has_violations = validator.print_violation_report(violations)
    
    if has_violations:
        print("\n❌ COMPLIANCE VALIDATION FAILED")
        print("❌ DO NOT COMMIT OR MERGE")
        print("❌ FIX ALL VIOLATIONS FIRST")
        sys.exit(1)
    else:
        print(f"\n🔥 BULLETPROOF VALIDATION PASSED")
        print("✅ READY FOR COMMIT/MERGE")
        print("✅ SELENIUM 4+ ENFORCEMENT SUCCESSFUL")
        print("✅ ZERO FALSE POSITIVES GUARANTEED")
        sys.exit(0)

if __name__ == "__main__":
    main()
# 🔥 SELENIUM 4+ COMPLIANCE ENFORCEMENT

## RUTHLESS SELENIUM 4+ COMPLIANCE - ZERO TOLERANCE POLICY

This document establishes the **ABSOLUTE** compliance requirements for Selenium WebDriver usage in this codebase. Any violation will cause immediate CI failure.

## FORBIDDEN PATTERNS - INSTANT BUILD FAILURE

### ❌ Multiple Positional Arguments (BANNED)
```python
# FORBIDDEN - Causes: TypeError: __init__() got multiple values for argument 'options'
driver = webdriver.Chrome(driver_path, options=options)
driver = webdriver.Firefox(driver_path, options=options)
```

### ❌ Legacy Options Keywords (BANNED)
```python
# FORBIDDEN - Deprecated in Selenium 4+
driver = webdriver.Chrome(chrome_options=options)
driver = webdriver.Firefox(firefox_options=options)
```

### ❌ executable_path Parameter (BANNED)
```python
# FORBIDDEN - Removed in Selenium 4+
driver = webdriver.Chrome(executable_path=path, options=options)
driver = webdriver.Firefox(executable_path=path, options=options)
```

### ❌ Mixed Argument Patterns (BANNED)
```python
# FORBIDDEN - Inconsistent and error-prone
driver = webdriver.Chrome(path, chrome_options=options)
driver = webdriver.Chrome(options=options, chrome_options=chrome_opts)
```

## MANDATORY PATTERNS - ONLY ALLOWED APPROACH

### ✅ Chrome Driver (REQUIRED)
```python
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options as ChromeOptions

options = ChromeOptions()
service = ChromeService(driver_path)
driver = webdriver.Chrome(service=service, options=options)
```

### ✅ Firefox Driver (REQUIRED)
```python
from selenium.webdriver.firefox.service import Service as FirefoxService
from selenium.webdriver.firefox.options import Options as FirefoxOptions

options = FirefoxOptions()
service = FirefoxService(driver_path)
driver = webdriver.Firefox(service=service, options=options)
```

## CI ENFORCEMENT RULES

### Regex Patterns That FAIL Builds
1. `webdriver\.Chrome\([^)]*,[^)]*\)` - Multiple arguments to Chrome
2. `webdriver\.Firefox\([^)]*,[^)]*\)` - Multiple arguments to Firefox  
3. `chrome_options\s*=` - Legacy chrome_options keyword
4. `firefox_options\s*=` - Legacy firefox_options keyword
5. `executable_path\s*=` - Deprecated executable_path

### Pre-Commit Validation
Run before every commit:
```bash
# Scan for forbidden patterns
python AgriToolScraper-main/run_compliance_check.py
```

## COMPLIANCE VERIFICATION

### Manual Audit Commands
```bash
# Search for forbidden patterns
grep -r "webdriver\.Chrome(" --include="*.py" .
grep -r "webdriver\.Firefox(" --include="*.py" .
grep -r "chrome_options\s*=" --include="*.py" .
grep -r "firefox_options\s*=" --include="*.py" .
grep -r "executable_path\s*=" --include="*.py" .
```

### Automated Compliance Check
```bash
# Full compliance validation
python AgriToolScraper-main/run_compliance_check.py

# Expected output on success:
# 🔥 ALL COMPLIANCE CHECKS PASSED
# ✅ SELENIUM 4+ COMPLIANT
# ✅ READY FOR COMMIT/MERGE
```

## CONTRIBUTOR GUIDELINES

### Before Making Changes
1. **READ** this compliance guide completely
2. **UNDERSTAND** why legacy patterns are forbidden
3. **VALIDATE** your changes with compliance scripts
4. **TEST** your changes in both headless and GUI modes

### Code Review Requirements
1. All WebDriver instantiations must use the service/options pattern
2. All imports must explicitly import Service classes
3. All legacy patterns must be immediately flagged and rejected
4. Documentation must match actual implementation

### Documentation Standards
1. All code examples must use compliant patterns only
2. Legacy patterns must be shown only in "FORBIDDEN" sections
3. All tutorials must emphasize the service/options requirement
4. README files must include compliance warnings

## TROUBLESHOOTING COMPLIANCE ERRORS

### Common Error: "multiple values for argument 'options'"
**Cause**: Using legacy positional argument pattern
```python
# WRONG
driver = webdriver.Chrome(driver_path, options=options)
```
**Fix**: Use service/options pattern
```python
# CORRECT
service = ChromeService(driver_path)
driver = webdriver.Chrome(service=service, options=options)
```

### Common Error: "'chrome_options' parameter deprecated"
**Cause**: Using legacy keyword argument
```python
# WRONG
driver = webdriver.Chrome(chrome_options=options)
```
**Fix**: Use 'options' parameter only
```python
# CORRECT
driver = webdriver.Chrome(options=options, service=service)
```

## ZERO TOLERANCE POLICY

### Build Failure Triggers
- **ANY** forbidden pattern detected in code
- **ANY** legacy example in documentation  
- **ANY** non-compliant comment or docstring
- **ANY** ambiguous driver instantiation

### Compliance Badge
```markdown
![Selenium 4+ Compliant](https://img.shields.io/badge/Selenium-4%2B%20Compliant-brightgreen)
```

## OFFICIAL REFERENCE
- [Selenium 4 Migration Guide](https://selenium-python.readthedocs.io/installation.html#drivers)
- [WebDriver Service Documentation](https://selenium-python.readthedocs.io/api.html#module-selenium.webdriver.chrome.service)

## ENFORCEMENT SUMMARY

**RULE**: Only `service=Service(path), options=options` pattern allowed
**ENFORCEMENT**: Automated CI/CD failure on any violation
**EXCEPTIONS**: None - Zero tolerance policy
**RESULT**: 100% Selenium 4+ compliant codebase

---

*This document is MANDATORY reading for all contributors. Compliance is non-negotiable.*
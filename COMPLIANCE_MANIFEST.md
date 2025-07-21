# 🔥 SELENIUM 4+ COMPLIANCE MANIFEST

**Project Status**: ✅ 100% COMPLIANT  
**Last Audit**: 2025-01-21  
**Validation Status**: ENFORCED  
**Production Ready**: ✅ YES

## OVERVIEW

This project maintains **ZERO TOLERANCE** for legacy Selenium WebDriver patterns. All code, documentation, tests, and examples must use Selenium 4+ compliant syntax exclusively.

## ✅ ALLOWED PATTERNS (REQUIRED)

### Chrome Driver
```python
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options as ChromeOptions

# ✅ ONLY ALLOWED PATTERN
options = ChromeOptions()
service = ChromeService(driver_path)
driver = webdriver.Chrome(service=service, options=options)
```

### Firefox Driver
```python
from selenium import webdriver
from selenium.webdriver.firefox.service import Service as FirefoxService
from selenium.webdriver.firefox.options import Options as FirefoxOptions

# ✅ ONLY ALLOWED PATTERN
options = FirefoxOptions()
service = FirefoxService(driver_path)
driver = webdriver.Firefox(service=service, options=options)
```

## ❌ FORBIDDEN PATTERNS (BUILD FAILURE)

These patterns cause **immediate CI failure** and **blocked merges**:

### Multiple Positional Arguments
```python
# ❌ FORBIDDEN - Multiple positional args
driver = webdriver.Chrome(driver_path, options=options)
driver = webdriver.Firefox(driver_path, options=options)
```

### Legacy Options Keywords
```python
# ❌ FORBIDDEN - Legacy keywords
driver = webdriver.Chrome(chrome_options=options)
driver = webdriver.Firefox(firefox_options=options)
```

### Deprecated executable_path
```python
# ❌ FORBIDDEN - Deprecated parameter
driver = webdriver.Chrome(executable_path=path, options=options)
driver = webdriver.Firefox(executable_path=path, options=options)
```

### Mixed Patterns
```python
# ❌ FORBIDDEN - Inconsistent usage
driver = webdriver.Chrome(path, chrome_options=options)
driver = webdriver.Chrome(options=options, chrome_options=chrome_opts)
```

## ENFORCEMENT RULES

1. **NO EXCEPTIONS**: Any code not matching allowed patterns must not be committed or merged
2. **RUTHLESS CI/CD**: All PRs scanned by automated validator - violations block all merges and deploys
3. **DOCUMENTATION**: All code examples must use only allowed patterns
4. **EDUCATIONAL EXAMPLES**: Legacy patterns may only appear if clearly marked as `❌ FORBIDDEN`

## VALIDATION COMMANDS

### Pre-Commit Validation
```bash
# Run before every commit
python AgriToolScraper-main/validate_selenium_compliance.py
```

### Full Compliance Pipeline
```bash
# Complete validation pipeline
python AgriToolScraper-main/run_compliance_check.py
```

## COMPLIANCE GUARANTEE

✅ **Active Code**: Zero legacy patterns in production code  
✅ **Documentation**: All examples properly labeled  
✅ **CI/CD**: Ruthless enforcement active  
✅ **Future-Proof**: Blocked legacy pattern introduction  

---

**Last Updated**: 2025-01-21  
**Validator Version**: v1.3.0  
**Status**: PRODUCTION READY
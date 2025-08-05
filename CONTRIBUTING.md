# Contributing to AgriTool

Thank you for your interest in contributing to AgriTool! This document provides guidelines and requirements for all contributors.

## 🔥 Selenium 4+ Compliance - MANDATORY

**CRITICAL**: This project maintains **ZERO TOLERANCE** for legacy Selenium WebDriver patterns. All code contributions must follow strict compliance rules.

### ✅ Required Patterns (ONLY ALLOWED)

```python
# Chrome Driver - REQUIRED PATTERN
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options as ChromeOptions

options = ChromeOptions()
service = ChromeService(driver_path)
driver = webdriver.Chrome(service=service, options=options)

# Firefox Driver - REQUIRED PATTERN
from selenium.webdriver.firefox.service import Service as FirefoxService
from selenium.webdriver.firefox.options import Options as FirefoxOptions

options = FirefoxOptions()
service = FirefoxService(driver_path)
driver = webdriver.Firefox(service=service, options=options)
```

### ❌ Forbidden Patterns (WILL CAUSE BUILD FAILURE)

```python
# ❌ FORBIDDEN - Multiple positional arguments
driver = webdriver.Chrome(driver_path, options=options)
driver = webdriver.Firefox(driver_path, options=options)

# ❌ FORBIDDEN - Legacy options keywords
driver = webdriver.Chrome(chrome_options=options)
driver = webdriver.Firefox(firefox_options=options)

# ❌ FORBIDDEN - Deprecated executable_path
driver = webdriver.Chrome(executable_path=path, options=options)
driver = webdriver.Firefox(executable_path=path, options=options)
```

### Enforcement

**All PRs and new scripts are scanned by ruthless validator. Violations block all merges and deploys.**

**MANDATORY PRE-COMMIT VALIDATION**:
```bash
python AgriToolScraper-main/validate_selenium_compliance.py
```

## Development Workflow

### 1. Before You Start

1. **Fork the repository** and clone your fork
2. **Install dependencies**:
   ```bash
   npm install  # For frontend
   cd AgriToolScraper-main && pip install -r requirements.txt  # For scraper
   ```
3. **Run compliance validation** to ensure your environment is ready:
   ```bash
   python AgriToolScraper-main/validate_selenium_compliance.py
   ```

### 2. Making Changes

1. **Create a feature branch**: `git checkout -b feature/your-feature-name`
2. **Make your changes** following the project guidelines
3. **Run tests and validation** before committing:
   ```bash
   # Frontend tests
   npm run test

   # Selenium compliance check (MANDATORY)
   python AgriToolScraper-main/validate_selenium_compliance.py

   # Full compliance pipeline
   python AgriToolScraper-main/run_compliance_check.py
   ```

### 3. Submitting Changes

1. **Commit your changes** with descriptive messages
2. **Push to your fork**: `git push origin feature/your-feature-name`
3. **Create a Pull Request** with:
   - Clear description of changes
   - Test results
   - Compliance validation output

## Commit Standards

To keep history clean and useful, follow these commit rules:

- Use the present tense and an imperative tone (e.g., `add feature`)
- Keep the subject line under 72 characters
- Reference related issues in the message body when applicable
- Make each commit self‑contained and focused on a single topic
- Include tests and documentation relevant to the change

## Code Standards

### Frontend (React/TypeScript)

- Use TypeScript for all new code
- Follow existing component patterns
- Use semantic design tokens from the design system
- Ensure mobile responsiveness
- Include proper ARIA labels for accessibility

### Backend/Scraper (Python)

- **MANDATORY**: Follow Selenium 4+ compliance rules
- Use type hints for all function signatures
- Include comprehensive error handling
- Follow PEP 8 style guidelines
- Add logging for all critical operations

### Documentation

- Update relevant documentation for any changes
- Include code examples using only compliant patterns
- Mark any legacy patterns as `❌ FORBIDDEN` if mentioned for educational purposes

## Testing Requirements

### Frontend
```bash
npm run test          # Unit tests
npm run build         # Build verification
npm run lint          # Code quality
```

### Scraper
```bash
# MANDATORY - Selenium compliance
python AgriToolScraper-main/validate_selenium_compliance.py

# Optional - Full pipeline test
python AgriToolScraper-main/run_compliance_check.py

# Scraper functionality
python AgriToolScraper-main/scraper_main.py --test-mode
```

## Pull Request Guidelines

### Requirements

1. **Compliance Check**: All PRs must pass Selenium 4+ compliance validation
2. **Tests**: All existing tests must pass
3. **Documentation**: Update docs for any API or behavior changes
4. **No Breaking Changes**: Unless explicitly approved by maintainers
5. **Small & Focused**: Limit PRs to a single topic and roughly 500 lines of diff with accompanying tests

### Review Process

1. **Automated Checks**: CI/CD pipeline validates compliance and runs tests
2. **Code Review**: Branch protection requires at least one maintainer approval
3. **Status Checks**: All required workflows (including `Tests`) must pass
4. **Compliance Verification**: Zero tolerance for legacy Selenium patterns
5. **Merge**: Only after all checks pass and approval received

## Onboarding for New Contributors

**IMPORTANT**: All code contributions must follow the Selenium 4+ compliance rules above.

- **Pre-commit hook and CI pipeline block any legacy WebDriver code**
- **Zero tolerance policy**: Any forbidden pattern causes immediate build failure
- **Required validation**: Run compliance check before each commit

See `COMPLIANCE_MANIFEST.md` for exact requirements.

## Error Handling

### If Compliance Check Fails

1. **Review the error output** for specific violations
2. **Fix all flagged patterns** using the required Selenium 4+ syntax
3. **Re-run validation** until zero violations remain
4. **Only then commit and push** your changes

### Common Issues

| Issue | Solution |
|-------|----------|
| Legacy WebDriver patterns | Use only `service=Service(path), options=options` pattern |
| CI/CD build failure | Run local compliance check and fix all violations |
| Documentation examples | Ensure all code examples use compliant patterns |

## Getting Help

- **Documentation**: Check `COMPLIANCE_MANIFEST.md` for detailed requirements
- **Issues**: Open a GitHub issue for bugs or questions
- **Discussions**: Use GitHub Discussions for general questions
- **Compliance**: Run `python AgriToolScraper-main/validate_selenium_compliance.py` for immediate validation

## License

By contributing to AgriTool, you agree that your contributions will be licensed under the same license as the project.

---

**Remember**: This project maintains ruthless Selenium 4+ compliance. All contributions must follow these standards without exception.

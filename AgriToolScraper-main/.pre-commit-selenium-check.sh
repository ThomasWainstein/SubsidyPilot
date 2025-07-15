#!/bin/bash
# Pre-commit hook for Selenium 4+ compliance
# Add to .git/hooks/pre-commit and make executable

echo "🔥 PRE-COMMIT: SELENIUM 4+ COMPLIANCE CHECK"
echo "🔍 Scanning for forbidden patterns..."

# Change to repo root
cd "$(git rev-parse --show-toplevel)"

# Run compliance validation
python AgriToolScraper-main/validate_selenium_compliance.py

if [ $? -eq 0 ]; then
    echo "✅ PRE-COMMIT: SELENIUM 4+ COMPLIANCE PASSED"
    echo "✅ COMMIT ALLOWED"
    exit 0
else
    echo "❌ PRE-COMMIT: SELENIUM 4+ COMPLIANCE FAILED"
    echo "❌ COMMIT BLOCKED"
    echo ""
    echo "📋 TO FIX:"
    echo "1. Review violations listed above"
    echo "2. Fix all forbidden patterns"
    echo "3. Re-run: python AgriToolScraper-main/validate_selenium_compliance.py"
    echo "4. Try commit again"
    exit 1
fi
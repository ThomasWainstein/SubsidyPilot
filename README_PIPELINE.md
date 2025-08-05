# AgriTool Pipeline Documentation

## Overview

The AgriTool automated pipeline consists of several jobs that scrape subsidies, process them with AI, and validate the results. This document outlines the robust pipeline architecture and requirements.

## Pipeline Jobs

### 1. Scrape & Upload
- **Purpose**: Scrape subsidy data from various sources
- **Artifacts**: 
  - `logs/scraper.log` - Scraper execution log
  - `data/raw_pages/` - Raw HTML pages
  - `data/logs/scraper.log` - Detailed scraper logs

### 2. AI Log Interpreter  
- **Purpose**: Process raw logs with AI extraction
- **Artifacts**:
  - `logs/ai_extractor.log` - AI processing log
  - `data/logs/ai_extractor.log` - Detailed AI logs

### 3. Quality Assurance (QA)
- **Purpose**: Validate modules, DB connectivity, AI extraction
- **Artifacts**:
  - `logs/qa_results.log` - Basic QA test output
  - `logs/qa_detailed_results.json` - Structured QA results
  - `logs/pipeline_status.log` - Final QA status
  - `logs/pipeline_failure_summary.txt` - Failure details (if any)

### 4. Summary/Notification
- **Purpose**: Generate final pipeline summary
- **Artifacts**:
  - `logs/pipeline_summary.json` - Detailed results
  - `logs/pipeline_summary.txt` - Human-readable summary

## Required Files for CI/CD

### Core Modules
- `logging_setup.py` - Logging configuration (stub version for CI)
- `qa_robust.py` - Robust QA testing with full error handling
- `ensure_artifacts.py` - Guarantees artifact creation
- `pipeline_summary.py` - Final summary generation

### Stub Files Policy
When developing modules that may not be available in all CI environments:
1. **Always create a stub version** in the repo root for CI compatibility
2. **Wrap imports in try/except** blocks for graceful degradation
3. **Never abort tests** on missing modules - log and continue

### Example Stub Implementation
```python
# For CI/CD compatibility
try:
    from full_module import advanced_function
except ImportError:
    def advanced_function(*args, **kwargs):
        return {"status": "unavailable", "reason": "Module not found in CI"}
```

## Robustness Features

### 1. Guaranteed Artifacts
- Every job **always** creates log files, even on failure
- Use `ensure_artifacts.py` at job start to create stub files
- Prevents "No artifacts found" warnings in CI

### 2. Graceful Degradation  
- QA tests **never fail silently**
- Missing modules are logged, not fatal
- Each test runs independently

### 3. Comprehensive Error Reporting
- `pipeline_failure_summary.txt` created on any failure
- Contains job name, step, error message, and suggested actions
- Always uploaded as artifact for debugging

### 4. Full Test Coverage
QA validates:
- ✅ Critical module imports (logging_setup, document_extractor, etc.)
- ✅ Database connectivity (Supabase credentials and connection)
- ✅ AI extraction (OpenAI API key, extractor initialization)
- ✅ Quality validation (validator setup and basic functionality)

## Environment Variables

### Required for Full Functionality
```bash
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Processing  
OPENAI_API_KEY=your-openai-key
SCRAPER_RAW_GPT_API=your-openai-key  # Alternative name
```

### CI/CD Behavior
- **Missing credentials**: Tests marked as failed but pipeline continues
- **Partial credentials**: Basic connectivity tested where possible
- **No credentials**: All external tests skipped, logged as missing

## Running the Pipeline

### Local Testing
```bash
# Ensure artifacts exist
python ensure_artifacts.py

# Run robust QA
python qa_robust.py

# Generate summary
python pipeline_summary.py
```

### CI/CD Integration
Each job should:
1. Start with `python ensure_artifacts.py`
2. Run its primary function
3. End with artifact upload (guaranteed to exist)
4. Final job runs `python pipeline_summary.py`

## Debugging Pipeline Issues

### 1. Check Summary Files
- `logs/pipeline_summary.txt` - High-level status
- `logs/pipeline_failure_summary.txt` - Failure details

### 2. Review Detailed Logs  
- `logs/qa_detailed_results.json` - Structured test results
- Individual job logs in `logs/` directory

### 3. Artifact Analysis
- All artifacts are always created (even if empty)
- Missing functionality logged, not hidden
- Full traceback included in failure summaries

## Best Practices

### For Developers
1. **Always create stub versions** of dev-only modules
2. **Test imports gracefully** with try/except
3. **Log everything** - success and failure  
4. **Never hide errors** - surface them in artifacts

### For CI/CD Maintainers
1. **Run ensure_artifacts.py first** in every job
2. **Always upload logs/** directory** as artifacts
3. **Check pipeline_summary.txt** for overall status
4. **Use failure summaries** for quick debugging

## Status Codes

| Exit Code | Meaning | Action Required |
|-----------|---------|-----------------|
| 0 | Success | None - all systems operational |
| 1 | Partial Success | Review warnings in summary |
| 2 | Failure | Check failure summary, fix issues |

## Maintenance

### When Adding New Modules
1. Create stub version for CI compatibility
2. Add import test to `qa_robust.py`
3. Update expected artifacts in `pipeline_summary.py`
4. Document any new environment variables

### When Debugging CI Issues
1. Check most recent `pipeline_summary.txt`
2. Review `pipeline_failure_summary.txt` if present
3. Examine individual job logs for details
4. Verify all required environment variables are set

This pipeline is designed to **never fail silently** - every issue is logged, every artifact is created, and every failure includes actionable debugging information.
# AgriTool Pipeline Rollback Documentation

## Status: **TIKA SERVER INTEGRATION DISABLED**

Date: 2025-07-30
Reason: Tika server infrastructure instability causing pipeline failures

## Changes Made

### 1. GitHub Actions Workflow (`.github/workflows/agritool-automated-pipeline.yml`)
- **DISABLED**: Tika server start/stop management
- **DISABLED**: Tika health checks
- **PRESERVED**: All existing workflow inputs including new `urls_to_scrape` parameter
- **UPDATED**: Pipeline command to use `enhanced_agent.py --no-tika`

### 2. Enhanced Agent (`AgriTool-Raw-Log-Interpreter/enhanced_agent.py`)
- **REMOVED**: PDFExtractionPipeline dependency (Tika server based)
- **ADDED**: RobustPDFExtractor import (buffer-based extraction)
- **UPDATED**: extract_file_content() method to use DocumentExtractor
- **ADDED**: Command-line arguments for pipeline parameters
- **PRESERVED**: All existing functionality and retry logic

### 3. New Robust Extractor (`AgriTool-Raw-Log-Interpreter/robust_pdf_extractor.py`)
- **CREATED**: Tika-free document extraction pipeline
- **FEATURES**: 
  - Buffer-based PDF/DOCX/TXT extraction
  - Comprehensive retry logic
  - Error handling and logging
  - File size validation
  - Multi-format support

## Current Pipeline State

### ✅ **WORKING** - Tika-Free Extraction
- Uses `tika-python` buffer parsing (no server required)
- Supports PDF, DOCX, DOC, TXT files
- Robust retry mechanisms
- Comprehensive error handling
- Self-contained and reliable

### 🚫 **DISABLED** - Tika Server Features
- Server health checks
- Advanced PDF preprocessing
- OCR capabilities  
- Server-based optimization

## Pipeline Invocation

### Command Line
```bash
# Single batch processing
python enhanced_agent.py --single-batch --no-tika --batch-size 25 --urls-to-scrape 25

# Continuous processing
python enhanced_agent.py --no-tika --batch-size 25 --urls-to-scrape 25
```

### GitHub Actions
```yaml
# Automatically uses --no-tika flag
# All existing inputs preserved:
# - branch, max_pages, dry_run, run_tests, batch_size
# - NEW: urls_to_scrape
```

## Infrastructure Required

### Current (Stable)
- Python 3.11+
- tika-python library
- Basic system dependencies

### Disabled (Until Server Stable)
- Apache Tika server
- Ghostscript
- Tesseract OCR
- Java runtime

## Re-enabling Tika Server

When Tika server infrastructure is stable:

1. **Uncomment** Tika server management in workflow
2. **Switch** enhanced_agent.py imports back to PDFExtractionPipeline
3. **Remove** `--no-tika` flag from pipeline commands
4. **Test** server health checks and extraction quality

## Testing Status

✅ **Verified Working**:
- Document extraction (PDF, DOCX, TXT)
- Error handling and retries
- Batch processing
- Command-line interface
- GitHub Actions integration

⏳ **Pending Verification**:
- Large-scale pipeline runs
- Performance under load
- Long-term stability

## Support

For issues or questions regarding this rollback:
- Check logs for extraction errors
- Verify tika-python installation
- Ensure file format support
- Review error handling in robust_pdf_extractor.py

---
**Note**: This is a temporary rollback to ensure pipeline stability. Tika server integration will be restored once infrastructure is proven reliable.
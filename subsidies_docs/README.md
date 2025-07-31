# Subsidies Documents Directory

This directory contains PDF documents related to agricultural subsidies that will be processed by the PDF extraction pipeline.

## Directory Structure

```
subsidies_docs/
├── README.md                    # This file
├── samples/                     # Sample PDF files for testing
├── franceagrimer/              # FranceAgriMer subsidy documents  
├── europa/                     # European subsidy documents
└── processed/                  # Output directory for processed files
```

## PDF Extraction Pipeline

The GitHub Actions workflow includes an automated PDF extraction pipeline that:

1. **Health Checks**: Verifies Python document extraction dependencies
2. **Preprocessing**: Optimizes large PDFs using Ghostscript
3. **OCR Support**: Processes scanned PDFs with Tesseract OCR
4. **Retry Logic**: Handles extraction failures with exponential backoff
5. **Clear Logging**: Provides detailed progress and error reporting

## Usage

### Manual Extraction

You can run the PDF extraction pipeline manually:

```bash
# Basic extraction
python AgriToolScraper-main/pdf_extraction_pipeline.py path/to/document.pdf

# With OCR enabled for scanned documents
python -c "
from AgriToolScraper.pdf_extraction_pipeline import extract_pdf_text
text = extract_pdf_text('path/to/document.pdf', enable_ocr=True)
print(text)
"
```

### GitHub Actions Integration

The pipeline automatically runs as part of the "Agritool Automated Pipeline" workflow:

- **Triggers**: On push/PR to main branch or manual dispatch
- **Dependencies**: Runs after successful scraping and AI processing
- **Outputs**: Extracts text from all PDFs in this directory
- **Artifacts**: Uploads processed files and logs for review

## Configuration

### Environment Variables

- `EXTRACTION_METHOD`: Document extraction method (default: python-native)
- `PYTHONPATH`: Set to include AgriToolScraper-main directory

### Customization Options

The pipeline can be customized through the `PDFExtractionPipeline` class:

```python
pipeline = PDFExtractionPipeline(
    extraction_method="python-native",
    max_file_size_mb=5.0,          # Size threshold for optimization
    max_retries=3,                 # Number of retry attempts
    initial_retry_delay=5.0,       # Initial retry delay in seconds
    max_retry_delay=60.0,          # Maximum retry delay in seconds
    enable_ocr=False,              # Enable OCR for scanned documents
    ghostscript_quality="/screen"   # Quality setting for optimization
)
```

## Dependencies

### System Requirements

- **Ghostscript**: PDF optimization
- **Tesseract OCR**: Text extraction from scanned documents
- **Python Libraries**: Document extraction libraries (pdfplumber, python-docx, etc.)
- **ocrmypdf**: OCR processing pipeline

### Installation

The GitHub Actions workflow automatically installs all dependencies. For local development:

```bash
# Ubuntu/Debian
sudo apt-get install ghostscript tesseract-ocr tesseract-ocr-eng tesseract-ocr-fra ocrmypdf poppler-utils

# Python dependencies
pip install requests ocrmypdf
```

## File Processing Logic

1. **Size Check**: Files larger than 5MB are optimized with Ghostscript
2. **OCR Detection**: Scanned PDFs are detected and processed with OCR if enabled
3. **Extraction**: Text extraction via Python-native libraries with retry logic
4. **Cleanup**: Temporary files are automatically cleaned up

## Troubleshooting

### Common Issues

- **Python Libraries Missing**: Check pip installation and library dependencies
- **Ghostscript Optimization Fails**: Verify Ghostscript installation
- **OCR Processing Errors**: Ensure Tesseract and ocrmypdf are properly installed
- **Large File Timeouts**: Increase timeout values or enable preprocessing

### Log Analysis

The pipeline provides detailed logging at each step:

- ✅ Success indicators for completed operations
- ⚠️ Warning messages for non-critical issues  
- ❌ Error messages with specific failure details
- 📊 Processing statistics and file counts

## Integration with AgriTool

Extracted text from subsidy documents can be:

1. **Indexed**: Added to the search database for quick retrieval
2. **Analyzed**: Processed by AI agents for structured data extraction
3. **Classified**: Automatically categorized by subsidy type and eligibility
4. **Linked**: Connected to scraped subsidy listings for complete documentation

## Sample Files

Place sample PDF files in the `samples/` directory for testing the extraction pipeline. The workflow will process all PDF files found in any subdirectory.
# 🌾 AgriTool Complete Scraper Pipeline Documentation

## Overview

The AgriTool scraper pipeline is a complete, production-grade system for extracting, processing, and structuring agricultural subsidy data from French government websites. The pipeline consists of four main stages:

1. **Web Scraping** - Extract raw content from subsidy websites
2. **Data Upload** - Store raw data in Supabase database  
3. **AI Extraction** - Convert raw content to structured data using GPT-4
4. **Quality Assurance** - Validate and improve data quality

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Scraping  │───▶│  Supabase Upload │───▶│  AI Extraction  │───▶│ Quality Assurance│
│                 │    │                 │    │                 │    │                 │
│ • Selenium      │    │ • Batch uploads │    │ • GPT-4 powered │    │ • Data validation│
│ • Multi-tab     │    │ • Retry logic   │    │ • Structured    │    │ • Remediation    │
│ • OCR ready     │    │ • Deduplication │    │   extraction    │    │ • Monitoring     │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Quick Start

### Prerequisites

1. **Environment Variables** (required):
```bash
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export SCRAPER_RAW_GPT_API="your-openai-api-key"
```

2. **Python Dependencies**:
```bash
pip install -r requirements.txt
```

3. **System Dependencies** (Ubuntu/Debian):
```bash
sudo apt-get update
sudo apt-get install -y wget curl chromium-browser xvfb google-chrome-stable
```

### Basic Usage

#### Complete Pipeline
```bash
# Run full pipeline for FranceAgriMer with 25 URLs
python main.py pipeline --site franceagrimer --urls-to-scrape 25

# Dry run to test without database writes
python main.py pipeline --site franceagrimer --urls-to-scrape 10 --dry-run

# Custom parameters
python main.py pipeline --site franceagrimer \
  --urls-to-scrape 50 \
  --max-pages 15 \
  --batch-size 20 \
  --workers 5
```

#### Individual Stages
```bash
# Scraping only
python main.py scrape --site franceagrimer --urls-to-scrape 25

# Upload only (after scraping)
python main.py upload --data-dir data/scraped --batch-size 50

# AI extraction only
python main.py extract --batch-size 10

# Single URL extraction
python main.py single --url https://www.franceagrimer.fr/aides/some-aid
```

## Stage Details

### 1. Web Scraping Stage

**Module**: `scraper/core.py`, `scraper/batch_processor.py`

**Features**:
- Headless Chrome with Selenium 4+
- Intelligent URL discovery with pagination
- Multi-tab content extraction
- Attachment downloading (PDF, DOC, XLS)
- Overlay and popup handling
- Robust retry logic with exponential backoff
- Parallel processing with respectful delays

**Configuration**:
```python
# Site configurations in batch_processor.py
site_configs = {
    'franceagrimer': {
        'base_url': 'https://www.franceagrimer.fr',
        'list_page': '/aides',
        'detail_selectors': ['a[href*="/aides/"]'],
        'pagination_selector': '.pagination a',
        'max_pages': 50
    }
}
```

**Output**: JSON files with complete page content, metadata, and attachments

### 2. Data Upload Stage

**Module**: `scraper/supabase_uploader.py`

**Features**:
- Batch uploading to `raw_scraped_pages` table
- Duplicate detection and skipping
- Connection retry with exponential backoff
- Data validation and preparation
- Comprehensive error handling

**Database Schema** (`raw_scraped_pages`):
```sql
- id (uuid, primary key)
- source_url (text, unique)
- source_site (text)
- raw_html (text)
- raw_text (text)
- attachment_paths (jsonb)
- attachment_count (integer)
- scrape_date (timestamp)
- status (text: 'raw', 'processed', 'failed')
- error_message (text, nullable)
```

### 3. AI Extraction Stage

**Module**: `scraper/ai_extractor.py`

**Features**:
- GPT-4 Turbo powered extraction
- Comprehensive subsidy data extraction
- Multi-language support (French/English)
- Structured JSON output with validation
- Token usage tracking
- Chunked processing for large content

**Extraction Schema**:
```json
{
  "title": "Exact program title",
  "description": "Full program description", 
  "eligibility": "Eligibility criteria",
  "amount": [min_amount, max_amount],
  "deadline": "YYYY-MM-DD",
  "region": ["Region1", "Region2"],
  "sector": ["Sector1", "Sector2"],
  "funding_type": "grant/loan/etc",
  "agency": "Funding agency",
  "documents": [{"type": "doc_type", "description": "desc"}],
  "application_requirements": ["Req1", "Req2"],
  "legal_entity_type": ["Type1", "Type2"]
}
```

**Database Schema** (`subsidies_structured`):
- All extracted fields with proper typing
- Array fields for multi-value data
- Audit trail with timestamps and model info

### 4. Quality Assurance Stage

**Features**:
- Data completeness validation
- Title quality checks (no generic titles)
- Field format validation
- Automated remediation (future enhancement)
- Quality metrics reporting

## GitHub Actions Integration

**Workflow**: `.github/workflows/agritool-automated-pipeline.yml`

**Trigger**: Manual with configurable parameters
- `branch`: Git branch to use
- `max_pages`: Maximum pages to scrape per site
- `urls_to_scrape`: Number of URLs to process
- `batch_size`: AI processing batch size
- `dry_run`: Test mode without database writes
- `run_tests`: Execute test suite

**Environment**:
- Ubuntu latest with Chrome and Xvfb
- Python 3.11 with all dependencies
- Secrets injection for API keys

**Artifacts**:
- Complete pipeline logs
- Scraped data files
- Error reports and diagnostics

## Configuration

### Site Configuration

Add new sites in `scraper/batch_processor.py`:

```python
'new_site': {
    'base_url': 'https://example.com',
    'list_page': '/subsidies',
    'detail_selectors': ['a[href*="/subsidy/"]'],
    'pagination_selector': '.next-page',
    'max_pages': 20
}
```

### Scraping Parameters

```python
class BatchScrapeConfig:
    max_workers = 3          # Parallel workers
    delay_range = (1, 3)     # Delay between requests (seconds)
    max_retries = 3          # Retry attempts
    timeout = 30             # Page load timeout
```

### AI Extraction Parameters

```python
# GPT-4 settings
model = "gpt-4-turbo-preview"
temperature = 0.1           # Low for consistent extraction
max_tokens = 4000          # Sufficient for detailed extraction
```

## Monitoring and Logging

### Log Levels
- **INFO**: Normal operation flow
- **WARNING**: Non-critical issues (skipped URLs, etc.)
- **ERROR**: Critical failures requiring attention

### Log Locations
- `logs/pipeline_TIMESTAMP.log` - Main pipeline log
- `logs/scraper_TIMESTAMP.log` - Scraping operations
- `logs/pipeline_report_TIMESTAMP.json` - Execution summary

### Key Metrics
- URLs discovered vs. successfully scraped
- Upload success rate and duplicate handling
- AI extraction success rate and token usage
- Overall pipeline duration and throughput

## Error Handling

### Common Issues and Solutions

1. **Chrome/Selenium Issues**:
   ```bash
   # Install latest Chrome
   sudo apt-get update
   sudo apt-get install -y google-chrome-stable
   ```

2. **Supabase Connection Errors**:
   - Verify environment variables are set
   - Check network connectivity
   - Validate API keys and permissions

3. **OpenAI API Errors**:
   - Check API key validity
   - Monitor rate limits and quotas
   - Handle token limit errors with chunking

4. **Memory Issues**:
   - Reduce batch sizes
   - Increase worker delays
   - Monitor system resources

### Retry Logic
- **Network requests**: 3 retries with exponential backoff
- **Database operations**: 3 retries with 1-2 second delays
- **AI extraction**: Single attempt with error logging

## Performance Optimization

### Scraping Performance
- Use headless Chrome for better speed
- Disable images and unnecessary resources
- Implement respectful delays (1-3 seconds)
- Limit concurrent workers (3-5 maximum)

### Database Performance
- Use batch uploads (50 records per batch)
- Implement connection pooling
- Add appropriate indexes on frequently queried fields

### AI Extraction Performance
- Process in smaller batches (10-20 records)
- Monitor token usage and costs
- Implement smart content chunking for large texts

## Testing

### Unit Tests
```bash
# Run all tests
python -m pytest tests/ -v

# Run specific test module
python -m pytest tests/test_scraper.py -v
```

### Integration Tests
```bash
# Test complete pipeline with dry run
python main.py pipeline --site franceagrimer --urls-to-scrape 5 --dry-run

# Test single URL extraction
python main.py single --url https://www.franceagrimer.fr/aides/vitilience-2025
```

### Validation Tests
```bash
# Validate Selenium compliance
python validate_selenium_compliance.py

# Check environment setup
python -c "from scraper.core import *; print('✅ All imports successful')"
```

## Deployment

### Local Development
1. Clone repository
2. Install dependencies: `pip install -r requirements.txt`
3. Set environment variables
4. Run tests: `python main.py pipeline --dry-run`

### Production Deployment
1. Set up CI/CD with GitHub Actions
2. Configure secrets in repository settings
3. Monitor execution through GitHub Actions interface
4. Set up log aggregation and alerting

### Scaling Considerations
- Use queue systems for large-scale processing
- Implement distributed scraping with multiple workers
- Add caching layer for frequently accessed data
- Monitor and optimize database queries

## Troubleshooting

### Debug Mode
```bash
# Enable verbose logging
python main.py pipeline --site franceagrimer --verbose

# Single URL with debug
python main.py single --url https://example.com --verbose
```

### Common Commands
```bash
# Check pipeline status
tail -f logs/pipeline_*.log

# Validate environment
python -c "import os; print([k for k in os.environ if 'SUPABASE' in k or 'GPT' in k])"

# Test Supabase connection
python -c "from scraper.supabase_uploader import SupabaseUploader; SupabaseUploader()"

# Test OpenAI connection  
python -c "from scraper.ai_extractor import AIExtractor; AIExtractor()"
```

## Contributing

### Development Setup
1. Fork the repository
2. Create feature branch
3. Install development dependencies: `pip install -r requirements.txt`
4. Run compliance checks: `python validate_selenium_compliance.py`
5. Submit pull request with tests

### Code Standards
- Follow PEP 8 style guidelines
- Use type hints for function signatures
- Include comprehensive docstrings
- Maintain test coverage above 80%
- Use Selenium 4+ compliant patterns only

### Adding New Sites
1. Add site configuration to `batch_processor.py`
2. Test URL discovery and extraction
3. Validate against existing data schema
4. Update documentation and tests

## Security

### Data Protection
- Environment variables for all secrets
- No hardcoded API keys or credentials
- Secure Supabase RLS policies
- Audit trail for all operations

### Network Security
- Use HTTPS for all external requests
- Implement rate limiting and respectful delays
- Validate and sanitize all extracted data
- Monitor for suspicious activity patterns

## Support

### Documentation
- This file: Complete pipeline overview
- `scraper/core.py`: Core scraping functionality
- `scraper/batch_processor.py`: Batch processing logic
- `scraper/ai_extractor.py`: AI extraction details

### Community
- GitHub Issues: Bug reports and feature requests
- GitHub Discussions: Questions and community support
- Pull Requests: Code contributions welcome

### Professional Support
Contact the AgriTool team for:
- Custom site integrations
- Enterprise deployments
- Performance optimization
- Training and consulting
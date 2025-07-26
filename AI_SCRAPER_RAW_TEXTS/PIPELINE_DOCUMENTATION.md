# 🌾 AgriTool Raw Data Pipeline Documentation

## Overview

The AgriTool Raw Data Pipeline is a three-stage system that extracts, stores, and processes agricultural funding data from French government websites. This document outlines how the pipeline works and how each component integrates.

## Pipeline Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   1. SCRAPING   │───▶│   2. STORAGE    │───▶│ 3. AI PROCESSING│
│                 │    │                 │    │                 │
│ Raw Text +      │    │ Supabase        │    │ GPT Analysis +  │
│ Attachments     │    │ Central DB      │    │ Categorization  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Stage 1: Raw Data Scraping

### Purpose
Extract all available content (text + attachments) from agricultural funding websites without any structure or interpretation.

### Components
- **Location**: `AI_SCRAPER_RAW_TEXTS/`
- **Entry Point**: `scraper_main.py`
- **Core Modules**:
  - `scraper/pagination.py` - Navigate through result pages
  - `scraper/extract_raw_page.py` - Extract content and download attachments
  - `scraper/utils.py` - Logging and utilities

### Target Websites
- **FranceAgriMer**: `https://www.franceagrimer.fr/rechercher-une-aide`
- **IDF Chambres d'Agriculture**: `https://idf.chambres-agriculture.fr/etre-accompagne/je-suis-agriculteur/aides-a-lagriculture/`

### Output Format
Each scraped page creates a JSON file in `data/raw_pages/`:

```json
{
    "source_url": "https://example.com/aide-123",
    "source_site": "franceagrimer",
    "scrape_date": "2024-01-20T10:30:00Z",
    "raw_html": "<html>...</html>",
    "raw_text": "Clean visible text...",
    "attachment_paths": [
        "data/attachments/aide-123_document.pdf",
        "data/attachments/aide-123_form.xlsx"
    ]
}
```

### CLI Usage
```bash
# Scrape specific site and page range
python scraper_main.py --site franceagrimer --start-page 0 --end-page 50

# Test with single URL
python scraper_main.py --url "https://www.franceagrimer.fr/aide-xyz"

# Dry run (no downloads)
python scraper_main.py --site franceagrimer --start-page 0 --end-page 2 --dry-run
```

## Stage 2: Centralized Storage

### Purpose
Upload all raw scraped data to Supabase for centralized access, deduplication, and processing coordination.

### Database Schema
**Table**: `raw_scraped_pages`

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `source_url` | text | Original page URL (unique) |
| `source_site` | text | Site identifier (franceagrimer, idf_chambres) |
| `scrape_date` | timestamptz | When the page was scraped |
| `raw_html` | text | Full HTML content |
| `raw_text` | text | Clean text content |
| `attachment_paths` | jsonb | Array of attachment file paths |
| `attachment_count` | integer | Number of attachments |
| `status` | text | Processing status (raw, processed, error) |
| `error_message` | text | Error details if processing failed |
| `created_at` | timestamptz | Record creation time |
| `updated_at` | timestamptz | Last update time |

### Upload Process
**Script**: `upload_raw_to_supabase.py`

```bash
# Upload all JSON files to Supabase
python upload_raw_to_supabase.py

# Preview upload without inserting
python upload_raw_to_supabase.py --dry-run

# Custom batch size
python upload_raw_to_supabase.py --batch-size 25
```

### Data Flow
1. Scraper saves JSON files to `data/raw_pages/`
2. Upload script reads JSON files and transforms data for Supabase schema
3. Data is upserted to `raw_scraped_pages` table (handles duplicates by `source_url`)
4. Status is set to `raw` for new records

## Stage 3: AI Processing (Future)

### Purpose
Analyze raw content and extract structured information for the AgriTool dashboard.

### Planned Components
- **AI Categorization Service**: Uses GPT/OpenAI to analyze raw text
- **Field Extraction**: Extracts eligibility, deadlines, amounts, agencies
- **Tag Generation**: Creates searchable tags and categories
- **Quality Scoring**: Assigns confidence scores to extracted data

### Expected Output
Structured records in existing `subsidies` table with fields like:
- `title`, `description`, `eligibility_criteria`
- `amount_min`, `amount_max`, `deadline`
- `tags`, `categories`, `region`
- `agency`, `funding_type`, `status`

## CI/CD Integration

### GitHub Actions Workflow
**File**: `.github/workflows/AgriTool Raw Scraper CI.yml`

**Automated Steps**:
1. Set up Python environment
2. Install dependencies
3. Run scraper for sample pages
4. Upload results to Supabase
5. Archive logs and outputs

**Triggers**:
- Push to `AI_SCRAPER_RAW_TEXTS/**`
- Manual workflow dispatch
- Pull requests

### Environment Variables
Required secrets in GitHub repository:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Monitoring and Logging

### Log Files
- **Scraper logs**: `data/logs/scraper_YYYYMMDD.log`
- **Upload logs**: `data/logs/supabase_upload.log`
- **CI artifacts**: Uploaded as GitHub Actions artifacts

### Error Handling
- Robust try/catch around all network operations
- Detailed error logging with stack traces
- Graceful degradation (continue on individual page failures)
- Duplicate detection and handling

## Extending the Pipeline

### Adding New Websites
1. Add site configuration to scraper configs
2. Define CSS selectors for pagination and content extraction
3. Test with small page range
4. Update documentation

### Customizing Extraction
- Modify `extract_raw_page.py` for site-specific content cleaning
- Update attachment download logic for different file types
- Adjust pagination patterns in `pagination.py`

## Data Governance

### Deduplication
- Primary key: `source_url` ensures no duplicate pages
- Incremental scraping: re-scraping updates existing records
- Attachment versioning: file timestamps track updates

### Privacy and Compliance
- Only public agricultural funding information is scraped
- No personal data collection
- Respects robots.txt and reasonable request rates
- All data stored in EU-compliant Supabase infrastructure

## Performance Considerations

### Scalability
- Batch processing for large datasets
- Configurable request delays to avoid rate limiting
- Parallel processing capabilities for multiple sites
- Incremental updates vs. full re-scrapes

### Storage
- Raw HTML can be large - consider compression for long-term storage
- Attachment files stored locally, paths stored in database
- Regular cleanup of old logs and temporary files

## Next Steps

1. **Immediate**: Deploy and test the complete pipeline
2. **Short-term**: Implement AI processing stage
3. **Medium-term**: Add more agricultural funding websites
4. **Long-term**: Real-time monitoring and alerting for new funding opportunities

---

*For technical support or questions about this pipeline, refer to the repository documentation or contact the development team.*
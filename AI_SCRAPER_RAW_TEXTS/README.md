# AgriTool Raw Text Scraper

A modular web scraper system for extracting raw text and attachments from agricultural funding websites. This system collects unstructured data for later AI processing and categorization.

## Overview

The scraper is designed to:
1. **Paginate** through listing pages to collect all program detail URLs
2. **Extract** raw HTML and visible text from each detail page
3. **Download** all document attachments (PDF, DOC, XLS, etc.)
4. **Save** everything as raw files for later AI processing

**Important**: This scraper does NOT structure or categorize data. It saves raw content that will be processed by AI agents later.

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Scrape FranceAgriMer (pages 0-10)
python scraper_main.py --site franceagrimer --start-page 0 --end-page 10

# Scrape IDF Chambres d'Agriculture (pages 0-5)
python scraper_main.py --site idf_chambres --start-page 0 --end-page 5

# Scrape a single URL
python scraper_main.py --url https://www.franceagrimer.fr/some-aid-program

# List available sites
python scraper_main.py --list-sites
```

## Folder Structure

```
AI_SCRAPER_RAW_TEXTS/
├── scraper_main.py           # CLI entry point
├── scraper/                  # Core scraping modules
│   ├── __init__.py
│   ├── pagination.py         # Site pagination and URL collection
│   ├── extract_raw_page.py   # Content extraction and file downloads
│   └── utils.py              # Logging, driver setup, utilities
├── data/                     # Output directory
│   ├── raw_pages/           # JSON files with extracted content
│   ├── attachments/         # Downloaded documents
│   └── logs/                # Scraping logs and summaries
├── requirements.txt          # Python dependencies
└── README.md                # This file
```

## Output Format

Each scraped page creates a JSON file in `data/raw_pages/`:

```json
{
  "page_id": "page_a1b2c3d4e5f6",
  "source_url": "https://www.franceagrimer.fr/some-aid",
  "source_site": "franceagrimer",
  "scrape_date": "2025-01-26T10:30:00",
  "raw_html": "<!DOCTYPE html>...",
  "raw_text": "Clean visible text content...",
  "attachment_paths": [
    "data/attachments/www_franceagrimer_fr/application_form.pdf",
    "data/attachments/www_franceagrimer_fr/guidelines.docx"
  ],
  "attachment_count": 2
}
```

## Supported Sites

### FranceAgriMer
- **URL**: https://www.franceagrimer.fr/rechercher-une-aide
- **Pattern**: Pagination through `?page={n}` parameter
- **Content**: Agricultural aid programs and funding opportunities

### IDF Chambres d'Agriculture  
- **URL**: https://idf.chambres-agriculture.fr/etre-accompagne/je-suis-agriculteur/aides-a-lagriculture/
- **Pattern**: Page-based URLs with `/page-{n}` suffix
- **Content**: Regional agricultural support and funding

## Configuration

Site configurations are defined in `scraper/pagination.py` in the `SITE_CONFIGS` dictionary:

```python
SITE_CONFIGS = {
    'franceagrimer': {
        'base_url': 'https://www.franceagrimer.fr',
        'list_page_pattern': 'https://www.franceagrimer.fr/rechercher-une-aide?page={page}',
        'link_selector': 'h3.fr-card__title a, .fr-card h3 a',
        'wait_selector': 'div#search-results article.fr-card h3.fr-card__title',
        # ... more config
    }
}
```

## Features

### Robust Content Extraction
- Removes navigation, headers, footers, and cookie banners
- Extracts clean visible text while preserving original HTML
- Handles JavaScript-rendered content with Selenium

### Attachment Downloading
- Automatically detects and downloads PDF, DOC, XLS, TXT files
- Organizes downloads by source domain
- Generates consistent filenames with fallbacks

### Error Handling & Logging
- Comprehensive logging to files and console
- Graceful handling of page load errors and timeouts
- Summary statistics and error reports

### Incremental Scraping
- Checks for existing scraped pages to avoid duplicates
- Resume interrupted scraping jobs
- Consistent page IDs based on URL hashes

## Command Line Options

```bash
python scraper_main.py [options]

Required (choose one):
  --site {franceagrimer,idf_chambres}  Site to scrape using pagination
  --url URL                           Single URL to scrape  
  --list-sites                        List available sites

Optional:
  --start-page N                      Starting page number (default: 0)
  --end-page N                        Ending page number (default: 50)
  --output-dir DIR                    Output directory (default: data)
  --log-level {DEBUG,INFO,WARNING,ERROR}  Logging level (default: INFO)
  --no-headless                       Run browser with GUI (for debugging)
```

## Adding New Sites

1. Add site configuration to `SITE_CONFIGS` in `scraper/pagination.py`
2. Define CSS selectors for:
   - `link_selector`: Links to detail pages
   - `wait_selector`: Element to wait for on listing pages
   - `list_page_pattern`: URL pattern with `{page}` placeholder

Example:
```python
'new_site': {
    'base_url': 'https://example.com',
    'list_page_pattern': 'https://example.com/programs?page={page}',
    'link_selector': '.program-link a',
    'wait_selector': '.program-list',
    'exclude_url_patterns': ['javascript:', '#']
}
```

## Logging and Monitoring

### Log Files
- `data/logs/scraper_YYYYMMDD_HHMMSS.log`: Detailed scraping logs
- `data/logs/summary_YYYYMMDD_HHMMSS.txt`: Job summary with statistics

### Console Output
- Real-time progress updates
- Success/failure rates
- Final statistics summary

## Integration with AgriTool

This scraper is part of the larger AgriTool ecosystem:

1. **Raw Scraping** (this system): Collect unstructured content
2. **AI Processing** (separate): Categorize and extract structured data
3. **Dashboard Display** (AgriTool app): Present funding opportunities to users

The raw JSON files serve as input for the next stage in the pipeline.

## Troubleshooting

### No URLs Collected
- Check site selectors are up-to-date with live website
- Verify site is accessible and responding
- Run with `--no-headless` to see browser interaction

### Download Failures
- Network timeouts are logged but don't stop scraping
- Check attachment file permissions and disk space
- Verify target URLs are accessible

### Memory Issues
- Large sites may require processing in smaller page batches
- Monitor disk space for downloaded attachments
- Consider adding delays between requests

## Development

### Testing
```bash
# Test single page extraction
python scraper_main.py --url https://www.franceagrimer.fr/some-test-page --log-level DEBUG

# Test pagination (small range)
python scraper_main.py --site franceagrimer --start-page 0 --end-page 2 --log-level DEBUG
```

### Dependencies
- **Selenium 4.15.2**: Web automation and JavaScript rendering
- **BeautifulSoup4**: HTML parsing and content extraction  
- **Requests**: HTTP downloads for attachments
- **WebDriver Manager**: Automatic Chrome driver management

## License

Part of the AgriTool project. See main project for licensing information.
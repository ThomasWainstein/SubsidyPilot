# AgriTool Scraper - Supabase Integration

A robust web scraper for agricultural subsidy data with direct Supabase database integration. Designed for automated data collection and upload via GitHub Actions.

## Features

- **Multi-source scraping**: Currently supports AFIR (French agricultural subsidies)
- **Supabase integration**: Direct upload to subsidies table
- **GitHub Actions support**: Automated scheduling and execution
- **Error handling**: Comprehensive logging and retry mechanisms
- **Rate limiting**: Respectful crawling with configurable delays
- **Data validation**: Schema validation and duplicate detection
- **Multi-language support**: Automatic language detection

## Quick Start

### 1. GitHub Actions Setup (Recommended)

1. **Set up secrets** in your GitHub repository:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_KEY`: Your Supabase service role key

2. **Trigger the workflow**:
   - Automatically: Runs daily at 6 AM UTC
   - Manually: Go to Actions → "AgriTool Scraper Pipeline" → "Run workflow"

3. **Monitor results**:
   - Check the Actions tab for execution logs
   - Download artifacts for detailed results
   - View uploaded data in your Supabase dashboard

### 2. Local Development Setup

```bash
# Clone and navigate to scraper directory
cd AgriToolScraper-main

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Test the scraper (dry run)
python main.py --dry-run --max-pages 1

# Run full scraper
python main.py
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | Required |
| `SUPABASE_SERVICE_KEY` | Service role key | Required |
| `TARGET_URL` | Website to scrape | `https://www.afir.info/` |
| `MAX_PAGES` | Max pages to scrape (0=all) | `0` |
| `DRY_RUN` | Test mode (no upload) | `false` |
| `BROWSER` | Browser for scraping | `chrome` |

### GitHub Actions Inputs

When running manually, you can configure:

- **Target URL**: Override the default scraping target
- **Max Pages**: Limit the number of pages scraped
- **Dry Run**: Test the scraper without uploading data

## Architecture

```
AgriToolScraper-main/
├── .github/workflows/scraper.yml    # GitHub Actions workflow
├── scraper/
│   ├── core.py                      # Core scraping utilities
│   ├── discovery.py                 # Content extraction logic
│   └── runner.py                    # Execution management
├── supabase_client.py               # Supabase integration
├── scraper_main.py                  # Main pipeline orchestrator
├── main.py                          # Entry point (legacy compatibility)
├── requirements.txt                 # Python dependencies
└── README.md                        # This file
```

## Data Pipeline

1. **URL Collection**: Scrapes listing pages for subsidy detail URLs
2. **Content Extraction**: Extracts structured data from each subsidy page
3. **Data Validation**: Validates and maps data to Supabase schema
4. **Duplicate Detection**: Checks for existing subsidies to avoid duplicates
5. **Batch Upload**: Uploads validated data to Supabase in batches
6. **Logging**: Records all operations for monitoring and debugging

## Monitoring & Analytics

### Run Summary

Each scraper run generates a comprehensive summary:

```json
{
  "session_id": "20241215_093045",
  "success": true,
  "urls_collected": 1247,
  "pages_processed": 1247,
  "subsidies_extracted": 1203,
  "subsidies_uploaded": 1156,
  "errors": [],
  "warnings": ["Skipped 47 duplicate subsidies"]
}
```

### Logs and Artifacts

- **GitHub Actions**: Automatic artifact upload on completion
- **Local runs**: Logs saved to `data/logs/`
- **Error tracking**: Failed URLs logged for retry
- **Debug info**: Raw content samples for troubleshooting

## Data Schema

The scraper extracts and maps the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `title` | JSON | Multilingual subsidy title |
| `description` | JSON | Detailed description |
| `code` | String | Unique identifier |
| `amount_min/max` | Number | Funding range |
| `deadline` | Date | Application deadline |
| `categories` | Array | Subsidy categories |
| `region` | Array | Geographic eligibility |
| `language` | Array | Languages supported |
| `eligibility_criteria` | JSON | Eligibility requirements |

## Error Handling

### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|---------|
| Connection timeout | Target site slow/down | Automatic retry with backoff |
| Duplicate key error | Subsidy already exists | Skip and continue processing |
| Schema validation | Missing required fields | Log error and skip record |
| Rate limiting | Too many requests | Built-in delays and throttling |

### Debugging

1. **Enable dry run mode** to test without uploading
2. **Check GitHub Actions logs** for detailed execution info
3. **Download artifacts** for local analysis
4. **Review failed URLs** in `data/extracted/failed_urls.txt`

## Extending the Scraper

### Adding New Sources

1. Create a new configuration in `configs/` directory
2. Implement source-specific extraction logic
3. Add URL patterns and field mappings
4. Test with dry run mode

### Custom Field Mapping

Edit `scraper/core.py` and update `FIELD_KEYWORDS_FR` for French sources or create new language mappings.

## Production Checklist

- [ ] Supabase secrets configured in GitHub
- [ ] RLS policies allow service role to insert/update subsidies
- [ ] GitHub Actions workflow enabled
- [ ] Error monitoring set up (email/Slack notifications)
- [ ] Regular data quality checks scheduled
- [ ] Backup and recovery procedures documented

## Troubleshooting

### GitHub Actions Failures

1. Check if secrets are properly configured
2. Verify Supabase service key has correct permissions
3. Review browser dependencies installation
4. Check for website structure changes

## WebDriver Management

This project uses `webdriver-manager` exclusively for all ChromeDriver installation and management.

### Usage

```python
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

options = Options()
options.add_argument('--headless')
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')

driver = webdriver.Chrome(ChromeDriverManager().install(), options=options)
```

### Important Notes

- Driver installation and management is 100% handled by webdriver-manager
- No manual driver install, path, or cache logic is allowed or required, even in CI
- webdriver-manager handles all cross-platform compatibility automatically

### Local Development Issues

1. **Browser Requirements**: Chrome/Chromium installed (webdriver-manager handles the driver)
2. Verify Python version compatibility (3.8+)
3. Check network connectivity to target sites
4. Validate Supabase credentials

### Data Quality Issues

1. Review unmapped labels in logs for new field types
2. Check language detection accuracy
3. Validate extracted amounts and dates
4. Monitor duplicate detection effectiveness

## Support

For issues and questions:

1. Check the GitHub Actions logs first
2. Review this documentation
3. Check the [Supabase documentation](https://supabase.com/docs)
4. Open an issue in the repository

## License

This scraper is part of the AgriTool project and follows the project's licensing terms.
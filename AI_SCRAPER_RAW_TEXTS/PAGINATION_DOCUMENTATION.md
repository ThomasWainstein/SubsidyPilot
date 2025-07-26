# AgriTool Scraper - Flexible Pagination Documentation

## Overview

The AgriTool scraper now supports flexible pagination with multiple options for controlling how many pages and URLs are scraped.

## CLI Arguments

### Basic Pagination
- `--start-page N`: Starting page number (default: 0)
- `--end-page N`: Ending page number (default: 50)
  - Use `-1` to scrape ALL pages until no more results

### Advanced Limits
- `--max-pages N`: Maximum number of pages to scrape (optional limit)
- `--max-urls N`: Maximum number of URLs to collect (optional limit)
- `--scrape-all`: Scrape all pages until no more results (equivalent to `--end-page -1`)

## Usage Examples

### Basic Range Scraping
```bash
# Scrape pages 0-10
python scraper_main.py --site franceagrimer --start-page 0 --end-page 10
```

### Scrape All Pages
```bash
# Scrape all pages until no more results
python scraper_main.py --site franceagrimer --scrape-all

# Or equivalently:
python scraper_main.py --site franceagrimer --end-page -1
```

### With Limits
```bash
# Scrape all pages but stop after 5 pages
python scraper_main.py --site franceagrimer --scrape-all --max-pages 5

# Scrape pages 0-20 but stop after collecting 100 URLs
python scraper_main.py --site franceagrimer --start-page 0 --end-page 20 --max-urls 100

# Scrape all pages but stop after either 10 pages OR 200 URLs (whichever comes first)
python scraper_main.py --site franceagrimer --scrape-all --max-pages 10 --max-urls 200
```

## GitHub Actions Workflow

The CI workflow now supports these new parameters:

- `end_page`: Set to `-1` to scrape all pages
- `max_pages`: Maximum number of pages to scrape
- `max_urls`: Maximum number of URLs to collect
- `scrape_all`: Boolean flag to scrape all pages

## How It Works

### Pagination Logic
1. **Start-End Range**: If `end_page` is specified (and not -1), scrape from `start_page` to `end_page`
2. **Scrape All Mode**: If `end_page` is -1 or `--scrape-all` is used, continue pagination until:
   - No URLs found on a page
   - Empty results message detected ("Votre recherche n'a retourné aucun résultat.")
   - Limits are reached

### Limit Application
- **max_pages**: Stops after processing the specified number of pages
- **max_urls**: Stops after collecting the specified number of URLs, even if more pages remain
- **Both limits**: Both limits work together - scraping stops when either limit is reached

### Empty Results Detection
The scraper automatically detects empty result pages by:
1. Looking for common "no results" messages in French and English
2. Checking if no result links are found using the configured selectors
3. Stopping pagination gracefully when empty pages are encountered

## Error Handling

- Invalid limits (≤ 0) cause immediate exit with clear error messages
- Page load errors are logged but don't stop the overall process
- Missing URLs on a page trigger graceful pagination stop

## Robustness Features

- **Early Validation**: All limits are validated before scraping begins
- **Progressive Limits**: URL limits are checked after each page to avoid overscraping
- **Graceful Stopping**: Multiple conditions can trigger pagination stop
- **Clear Logging**: All pagination decisions are logged with explanations

## Default Behavior

If no special options are provided, the scraper uses the original behavior:
- `start_page`: 0
- `end_page`: 50
- No max limits applied

This ensures backward compatibility with existing scripts and workflows.
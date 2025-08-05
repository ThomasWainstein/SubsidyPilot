# FranceAgriMer Selector Fixes - 2025-08-01 CRITICAL UPDATE

## CRITICAL PROBLEM IDENTIFIED - 2025-08-01
The FranceAgriMer scraper was failing to collect URLs due to outdated CSS selectors that no longer match the current site structure:
- **Failed Results Counter**: `.fr-container h2, h2` was too broad and unreliable
- **Failed Link Selector**: `h3.fr-card__title a, .fr-card h3 a` was missing href filters
- **No Diagnostics**: Zero error reporting when selectors failed - silent failures

## CRITICAL IMPACT
- **Zero URLs collected** from FranceAgriMer pages
- **Silent failures** with no debugging information
- **Broken pipeline** - no subsidy data processed

## LIVE PAGE ANALYSIS - 2025-08-01
Fresh analysis of `https://www.franceagrimer.fr/rechercher-une-aide`:

### Current HTML Structure (verified 2025-08-01):
- **Results counter**: `<h2>154 résultat(s)</h2>` inside `.fr-container` (line 231)
- **Card containers**: `<div class="fr-card fr-aide fr-enlarge-link fr-card--no-icon">`
- **Card titles**: `<h3 class="fr-card__title fr-mt-1w">`
- **Card links**: `<h3 class="fr-card__title"><a href="/aides/..." rel="bookmark">`

### Key Discovery:
- Links are INSIDE `h3.fr-card__title` elements
- All subsidy links contain `/aides/` in href
- Results counter is a standalone `h2` in `.fr-container`

## CRITICAL FIXES IMPLEMENTED - 2025-08-01

### 1. UPDATED CONFIG: `AgriToolScraper-main/configs/franceagrimer.json`

**BEFORE (BROKEN):**
```json
{
  "link_selector": "h3.fr-card__title a, .fr-card h3 a",
  "total_results_selector": ".fr-container h2, h2"
}
```

**AFTER (FIXED):**
```json
{
  "_comment": "FranceAgriMer selectors verified on 2025-08-01 - Updated after live page inspection",
  "link_selector": "h3.fr-card__title a[href*='/aides/'], .fr-card h3 a[href*='/aides/'], .fr-card a[href*='/aides/']",
  "total_results_selector": ".fr-container h2:contains('résultat'), h2:contains('résultat'), .fr-container h2"
}
```

### 2. ENHANCED DIAGNOSTICS: `AgriToolScraper-main/scraper/core.py`

**NEW `collect_links()` function features:**
- **Multi-selector fallback**: Tests each selector in priority order
- **Detailed logging**: Shows which selectors match/fail with element counts
- **Debug artifacts**: Saves HTML dump + screenshot when no URLs found
- **Failure detection**: Warns when unexpectedly low URL count (< 3)
- **Error context**: Logs page URL, title, loading status on failures

**Example diagnostic output:**
```
[INFO] Selector 'h3.fr-card__title a[href*="/aides/"]' matched 6 elements, collected 6 URLs
[SUCCESS] Collected 6 URLs using selector: h3.fr-card__title a[href*="/aides/"]
```

**On failure:**
```
[CRITICAL] No URLs collected with any selector
[DEBUG] Saved page HTML to logs/failed_page_20250801_143022.html
[DEBUG] Saved screenshot to logs/url_collection_error_20250801_143022.png
```

## PREVIOUS CHANGES (Historical)

### 1. Updated `AgriToolScraper-main/configs/franceagrimer.json`

**Before:**
```json
{
  "list_page": "https://www.franceagrimer.fr/rechercher-une-aide?page={page}",
  "link_selector": "h3 a[href*='/aides/'], a.fr-card__link",
  "pagination_mode": "by_index",
  "results_per_page": 6,
  "total_results_selector": ".fr-search__results .fr-h6, .fr-mb-2v.fr-h6",
```

**After:**
```json
{
  "_comment": "FranceAgriMer selectors verified on 2025-01-25 - Updated to match actual DSFR card structure with h3.fr-card__title links and h2 results counter",
  "list_page": "https://www.franceagrimer.fr/rechercher-une-aide?page={page}",
  "link_selector": "h3.fr-card__title a, .fr-card h3 a",
  "pagination_mode": "by_index",
  "results_per_page": 6,
  "total_results_selector": "h2:contains('résultat'), .fr-container h2",
```

### 2. Updated `AgriToolScraper-main/scraper_main.py`

#### Line 171-173: Made results waiting config-driven
**Before:**
```python
# Wait for results to load
log_step("Waiting for search results to load")
wait_for_selector(driver, ".fr-search__results .fr-h6, .fr-mb-2v.fr-h6", timeout=15)
```

**After:**
```python
# Wait for results to load using config-driven selector
log_step("Waiting for search results to load")
config = self.config_manager.get_config()
total_results_selector = config.get('total_results_selector', 'h2:contains(\'résultat\')')
wait_for_selector(driver, total_results_selector, timeout=15)
```

#### Line 175-184: Updated results parsing to use config
**Before:**
```python
# Parse total results from the results counter with multiple selector fallbacks
try:
    # Try multiple selectors for DSFR compatibility
    selectors_to_try = [
        ".fr-search__results .fr-h6",
        ".fr-mb-2v.fr-h6", 
        ".fr-search-bar__results",
        "[data-fr-js-search-results]",
        ".search-results-count"
    ]
```

**After:**
```python
# Parse total results from the results counter with config-driven selectors
try:
    # Get selector from config and add DSFR fallbacks
    config = self.config_manager.get_config()
    total_results_selector = config.get('total_results_selector', 'h2:contains(\'résultat\')')
    selectors_to_try = [
        total_results_selector,
        "h2:contains('résultat')",
        ".fr-container h2", 
        ".search-results-count",
        "[data-fr-js-search-results]"
    ]
```

#### Line 237-240: Enhanced card detection
**Before:**
```python
# Wait for subsidy cards to load using config-driven selector
config = self.config_manager.get_config()
link_selector = config.get('link_selector', 'a.fr-card__link')
wait_for_selector(driver, link_selector, timeout=10)
```

**After:**
```python
# Wait for subsidy cards to load using config-driven selector
config = self.config_manager.get_config()
link_selector = config.get('link_selector', 'h3.fr-card__title a')
# Wait for card containers first, then specific links
wait_for_selector(driver, ".fr-card", timeout=10)
wait_for_selector(driver, link_selector, timeout=10)
```

## Verification Steps

1. **Created test script**: `AgriToolScraper-main/test_selector_fixes.py`
2. **Enhanced DSFR tests**: Existing `AgriToolScraper-main/tests/test_dsfr_extraction.py` already covers DSFR functionality
3. **Added validation**: Both config validation and live site testing

## Expected Results After Fix

✅ **Results counter detection**: Will now find `<h2>154 résultat(s)</h2>`
✅ **Card link detection**: Will now find links in `h3.fr-card__title a`
✅ **URL collection**: Should collect > 0 URLs instead of failing
✅ **Config-driven**: All selectors now come from config, not hardcoded
✅ **Documented**: Added comment with verification date in config

## Test Commands

```bash
# Test the fixes
cd AgriToolScraper-main
python test_selector_fixes.py

# Run DSFR extraction tests
python -m pytest tests/test_dsfr_extraction.py -v

# Run full scraper (limit to 1 page for testing)
python scraper_main.py --url "https://www.franceagrimer.fr/rechercher-une-aide" --max-pages 1
```

## Compatibility

- ✅ **DSFR Compliant**: Uses standard French Design System selectors
- ✅ **Robust**: Multiple fallback selectors for reliability  
- ✅ **Future-proof**: Config-driven approach allows easy updates
- ✅ **Isolated**: Domain isolation still enforced

## Notes

- The `_comment` field in config documents when selectors were last verified against live site
- Progressive enhancement: waits for `.fr-card` containers first, then specific links
- Maintains existing pagination logic (by_index with 6 results per page)
- All changes are backwards compatible with existing error handling
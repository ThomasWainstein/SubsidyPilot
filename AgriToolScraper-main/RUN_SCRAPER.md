# FranceAgriMer Scraper - Quick Start Guide

## Fixed Issues ✅

1. **Syntax Error Fixed**: Removed stray `finally:` block in `job_controller.py`
2. **Environment Variables**: Added default Supabase credentials to `scraper_main.py`
3. **CSS Selectors Updated**: Modified `franceagrimer.json` based on current website structure
4. **GitHub Actions**: Updated workflow with proper environment variables

## Quick Test

Run the test script to verify everything works:

```bash
cd AgriToolScraper-main
python test_frances_scraper.py
```

## Full Scraper Execution

### Option 1: Direct Script
```bash
cd AgriToolScraper-main
python scraper_main.py --url "https://www.franceagrimer.fr/Accompagner/Dispositifs-par-filiere/Aides-nationales" --max-pages 2
```

### Option 2: Job Controller
```bash
cd AgriToolScraper-main
python job_controller.py
```

### Option 3: GitHub Actions
1. Go to Actions tab in GitHub
2. Select "FranceAgriMer Subsidy Scraper" workflow  
3. Click "Run workflow"
4. Configure parameters:
   - `max_pages`: 0 (unlimited) or specific number
   - `dry_run`: false (for actual data insertion)

## Environment Variables

The scraper now includes default values but you can override them:

```bash
export SUPABASE_URL="your_supabase_project_url_here"
export SUPABASE_SERVICE_KEY="your_service_key_here"
```

## Expected Results

**Successful Run:**
- URLs collected from FranceAgriMer listing pages
- Subsidy details extracted using updated CSS selectors
- Data inserted into Supabase database
- Logs and artifacts saved for debugging

**Validation:**
```sql
-- Check for FranceAgriMer data
SELECT COUNT(*) FROM subsidies WHERE domain = 'franceagrimer.fr';

-- Sample data check
SELECT title, agency, source_url FROM subsidies 
WHERE domain = 'franceagrimer.fr' 
LIMIT 5;
```

## Troubleshooting

1. **Driver Issues**: Run `python test_driver_compliance.py`
2. **Database Connection**: Check Supabase credentials
3. **CSS Selectors**: Website structure may have changed
4. **Domain Isolation**: Ensure all URLs match franceagrimer.fr domain

## Key Improvements Made

- ✅ Fixed syntax error in job controller
- ✅ Added environment variable defaults
- ✅ Updated CSS selectors for current site
- ✅ Improved GitHub Actions configuration
- ✅ Added quick test script for validation
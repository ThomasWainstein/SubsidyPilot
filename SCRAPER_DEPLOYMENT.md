# FranceAgriMer Scraper Deployment Guide

## GitHub Secrets Configuration

To enable the automated scraper, add the following secrets to your GitHub repository:

### Required Secrets

1. **SUPABASE_URL**
   - Value: `https://gvfgvbztagafjykncwto.supabase.co`
   - Purpose: Supabase project endpoint

2. **SUPABASE_SERVICE_ROLE_KEY**
   - Value: [Service role key from Supabase dashboard]
   - Purpose: Full database access for scraper operations

### How to Add Secrets

1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Click "New repository secret"
4. Add each secret with the exact name and value

## Manual Execution

### Immediate Scraper Run
1. Go to GitHub repository
2. Click Actions tab
3. Select "FranceAgriMer Subsidy Scraper" workflow
4. Click "Run workflow"
5. Configure parameters:
   - **max_pages**: `0` (unlimited) or specific number
   - **dry_run**: `false` (for actual data insertion)

### Expected Results

**Successful Run:**
- 540+ subsidies inserted into database
- All fields populated (title, description, agency, documents, etc.)
- Logs uploaded as artifacts

**Failed Run:**
- Error screenshots in artifacts
- Detailed logs for debugging
- No database changes (safe failure)

## Monitoring

### Check Scraper Logs Table
```sql
SELECT * FROM scraper_logs 
WHERE session_id LIKE 'sess_%' 
ORDER BY created_at DESC 
LIMIT 10;
```

### Verify Subsidy Count
```sql
SELECT COUNT(*) as total_subsidies FROM subsidies;
```

### Sample Data Check
```sql
SELECT title, agency, source_url, domain 
FROM subsidies 
WHERE domain = 'franceagrimer.fr' 
LIMIT 5;
```

## Troubleshooting

### Common Issues
1. **Chrome/Selenium errors**: Usually resolved by dependency installation
2. **Network timeouts**: Retry with manual dispatch
3. **Database connection**: Check Supabase secrets
4. **Permission errors**: Ensure service role key is correct

### Debug Commands
```bash
# Local testing (if needed)
cd AgriToolScraper-main
python test_driver_compliance.py
python main.py --url "https://www.franceagrimer.fr/..." --max_pages 2 --dry_run true
```
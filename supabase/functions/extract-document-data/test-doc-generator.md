# Phase D Test Document Generator

Since I can't create actual PDF/DOCX files, here's a template for creating test documents with tables that Phase D can extract:

## Sample Table Structure for Testing

### 1. Simple Subsidy Table (3 rows)
```
| Subsidy Program | Amount Min | Amount Max | Co-financing Rate | Eligibility |
|-----------------|------------|------------|-------------------|-------------|
| Organic Farming Support | €1,000 | €25,000 | 75% | Certified organic farms |
| Young Farmer Grant | €5,000 | €50,000 | 80% | Farmers under 35 years |
| Equipment Modernization | €2,500 | €100,000 | 60% | All registered farms |
```

### 2. Multi-page Table Test
Create a table that spans multiple pages with:
- Headers on page 1
- Continuing data on page 2 (no headers)
- Phase D should merge these automatically

### 3. Complex Table Test
```
| Program | Details | Financial Info | Requirements |
|---------|---------|----------------|--------------|
| Rural Development | Support for infrastructure projects | Min: €10,000 Max: €500,000 Rate: 70% | Environmental permit required |
| Livestock Support | Animal welfare improvements | Min: €500 Max: €15,000 Rate: 50% | Minimum 10 animals |
```

## Testing Commands

### 1. Local Test
```bash
# Start the function
supabase functions serve extract-document-data --env-file supabase/.env

# Test with curl
curl -i -X POST \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@your-test-document.pdf" \
  http://127.0.0.1:54321/functions/v1/extract-document-data
```

### 2. Validation Script
```bash
# Run the validation
deno run --allow-net --allow-env supabase/functions/extract-document-data/phase-d-test.ts
```

### 3. Database Check
```sql
-- Check recent Phase D extractions
SELECT 
  id,
  created_at,
  tables_extracted,
  table_count,
  table_quality,
  (table_data->'metadata'->>'extractionMethod') as method,
  (table_data->'metadata'->>'aiModel') as ai_model,
  (table_data->'metadata'->>'version') as version
FROM document_extractions 
WHERE table_data->'metadata'->>'extractionMethod' = 'phase-d-advanced'
ORDER BY created_at DESC 
LIMIT 5;
```

## Expected Results

For a successful Phase D extraction, you should see:
- `tables_extracted = true`
- `table_count > 0`
- `table_quality` between 0.1-1.0
- `table_data.metadata.extractionMethod = 'phase-d-advanced'`
- `table_data.metadata.aiModel` showing the OpenAI model used
- `table_data.raw` containing extracted table structure
- `table_data.processed` containing AI-enhanced table data

## Troubleshooting

If tables aren't being extracted:
1. Check `ENABLE_PHASE_D=true` is set
2. Verify `OPENAI_API_KEY` is configured
3. Look for Phase D logs in function output
4. Check document actually contains detectable tables
5. Ensure table has clear structure (borders, alignment)
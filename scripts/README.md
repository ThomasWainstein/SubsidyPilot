# Phase D Test Scripts

## Quick Start

### 1. Generate Test Fixtures
```bash
deno run -A scripts/make_golden_fixtures.ts
```

Creates `fixtures/` directory with:
- `pdf_golden.pdf` - 3-row subsidy table in PDF
- `docx_golden.docx` - Same table in DOCX format  
- `xlsx_golden.xlsx` - Same table in XLSX format

### 2. Set Environment Variables
```bash
export SUPABASE_URL="https://gvfgvbztagafjykncwto.supabase.co"
export SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export HARNESS_BUCKET="farm-documents"  # optional, defaults to farm-documents
export HARNESS_USE_SERVICE_ROLE="false"  # optional, set to "true" for admin-only functions
```

### 3. Configure Function Secrets
In Supabase dashboard → Functions → Secrets:
```bash
ENABLE_PHASE_D=true
OPENAI_API_KEY=sk-proj-...
OPENAI_TABLES_MODEL=gpt-4o-mini
MAX_TABLES_PER_DOC=50
MAX_CELLS_PER_DOC=50000
```

### 4. Run End-to-End Test
```bash
deno run -A scripts/phase_d_harness.ts
```

## Expected Output

✅ **Success case:**
```
🚀 Phase D Harness Starting
📋 Environment check:
   SUPABASE_URL: ✓
   SUPABASE_ANON_KEY: ✓
   SUPABASE_SERVICE_ROLE_KEY: ✓

📤 Uploading pdf_golden.pdf → farm-documents/harness/...
⚡ Calling function: https://gvfgvbztagafjykncwto.functions.supabase.co/extract-document-data
⏳ Waiting for extraction to complete…
✅ Extraction completed with status: completed

🧪 Assertions for pdf_golden.pdf: 7/7 passed
  ✓ tables_extracted === true
  ✓ table_count > 0
  ✓ table_quality is number
  ✓ metadata.extractionMethod === 'phase-d-advanced'
  ✓ metadata.aiModel present
  ✓ table_data.raw is array
  ✓ table_data.processed is array

🏁 Harness complete: 21/21 checks passed across 3 files
```

## Troubleshooting

### Function Not Found (404)
- Ensure `extract-document-data` function is deployed
- Check function name matches exactly

### Authentication Issues (401/403)
- For admin-only functions: `export HARNESS_USE_SERVICE_ROLE="true"`
- Verify service role key has correct permissions
- Check bucket policies allow uploads

### Timeout (180s)
- Function may be cold starting (first run)
- Check function logs for errors
- Verify OpenAI API key is valid
- Ensure `ENABLE_PHASE_D=true` in function secrets

### No Phase D Data
- Check `ENABLE_PHASE_D=true` in function secrets
- Verify `OPENAI_API_KEY` is set
- Look for Phase D logs in function output

### Rate Limits
- OpenAI API rate limits may cause retries
- Function includes exponential backoff
- Monitor token usage in function logs

## Validation Criteria

Each test file must pass all assertions:
1. `tables_extracted === true` - Tables were found and extracted
2. `table_count > 0` - At least one table counted
3. `table_quality` is number - Quality score assigned
4. `metadata.extractionMethod === 'phase-d-advanced'` - Phase D was used
5. `metadata.aiModel` present - AI model logged
6. `table_data.raw` is array - Raw extraction data stored
7. `table_data.processed` is array - AI-processed data stored

Total: 21 assertions across 3 file types (PDF, DOCX, XLSX)
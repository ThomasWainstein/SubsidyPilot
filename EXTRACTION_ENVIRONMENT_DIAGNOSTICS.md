# Document Extraction Environment Variable Diagnostics Report

## Root Cause Analysis

### Critical Issues Identified

1. **Environment Variable Naming Inconsistency** ⚠️
   - Extraction function was using `SCRAPER_RAW_GPT_API` instead of standard `OPENAI_API_KEY`
   - Supabase environment variables using mixed naming conventions
   - No environment validation at function startup

2. **Missing OpenAI API Key Configuration** 🔑
   - Document extraction requires OpenAI API for text processing
   - Key not configured in Supabase secrets or GitHub secrets
   - Function fails immediately without proper error handling

3. **Inconsistent Error Handling** ❌
   - No comprehensive environment variable validation
   - Generic error responses without specific diagnostics
   - Missing error context for troubleshooting

## Resolution Implementation

### 1. Fixed Environment Variable Names

**Before (Problematic)**:
```typescript
const openAIApiKey = Deno.env.get('SCRAPER_RAW_GPT_API');
const supabaseUrl = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
```

**After (Standardized)**:
```typescript
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
```

### 2. Added Comprehensive Environment Validation

```typescript
function validateEnvironment() {
  console.log('🔧 Environment Check for extract-document-data:', {
    hasOpenAI: !!Deno.env.get('OPENAI_API_KEY'),
    hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
    hasServiceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    availableVars: Object.keys(Deno.env.toObject()).filter(k => 
      k.startsWith('SUPABASE') || k.startsWith('OPENAI')
    ),
  });

  // Validate all required variables
  if (!openAIApiKey || !supabaseUrl || !supabaseServiceKey) {
    const missingVars = [];
    if (!openAIApiKey) missingVars.push('OPENAI_API_KEY');
    if (!supabaseUrl) missingVars.push('SUPABASE_URL');
    if (!supabaseServiceKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
    
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}
```

### 3. Updated GitHub Actions Deployment

Added OpenAI API key to deployment pipeline:
```yaml
- name: Configure Supabase secrets
  env:
    SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
    SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  run: |
    supabase secrets set SUPABASE_URL="$SUPABASE_URL" SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" OPENAI_API_KEY="$OPENAI_API_KEY"
```

## Required Actions

### Immediate Setup Required

**Step 1: Configure OpenAI API Key**
You need to set up the OpenAI API key for document extraction to work.

**Step 2: Set GitHub Repository Secret**
1. Go to GitHub repository Settings > Secrets and variables > Actions
2. Add new repository secret: `OPENAI_API_KEY` with your OpenAI API key

**Step 3: Set Supabase Secrets Manually**
```bash
supabase secrets set \
  SUPABASE_URL="https://gvfgvbztagafjykncwto.supabase.co" \
  SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  SUPABASE_SERVICE_ROLE_KEY="[service-role-key]" \
  OPENAI_API_KEY="[your-openai-api-key]"
```

**Step 4: Redeploy Edge Functions**
```bash
supabase functions deploy extract-document-data
supabase functions deploy upload-farm-document
```

## Environment Variable Standards

| Function | Variable | Purpose | Source |
|----------|----------|---------|---------|
| upload-farm-document | `SUPABASE_URL` | Supabase project URL | GitHub → Supabase Secrets |
| upload-farm-document | `SUPABASE_ANON_KEY` | Supabase anon key | GitHub → Supabase Secrets |
| extract-document-data | `SUPABASE_URL` | Supabase project URL | GitHub → Supabase Secrets |
| extract-document-data | `SUPABASE_SERVICE_ROLE_KEY` | Service role key | GitHub → Supabase Secrets |
| extract-document-data | `OPENAI_API_KEY` | OpenAI API access | GitHub → Supabase Secrets |

## Validation Testing

### Test Environment Variables
```bash
# Check secrets are set
supabase secrets list

# Expected output should include:
# - SUPABASE_URL
# - SUPABASE_ANON_KEY  
# - SUPABASE_SERVICE_ROLE_KEY
# - OPENAI_API_KEY
```

### Test Document Upload + Extraction Pipeline
1. **Upload Document**: Via frontend, should return success
2. **Check Extraction**: Function logs should show environment validation success
3. **Monitor Status**: Check for 200 responses in analytics

## Enhanced Diagnostics Added

### Function Startup Logging
- Environment variable presence check
- Available variable listing (safely)
- Missing variable identification

### Error Context
- Specific error messages for environment issues
- Detailed timestamp and context logging
- Separation of environment vs. processing errors

### Recovery Information
- Clear indication of missing configuration
- Specific steps to resolve environment issues
- Fallback behavior documentation

## Expected Results After Fixes

✅ **Environment Check Logs**: Should show all required variables present  
✅ **Upload Function**: Returns 200 status for valid uploads  
✅ **Extraction Function**: Returns 200 status for valid extractions  
✅ **End-to-End Pipeline**: Document upload → extraction → storage works  
✅ **Error Handling**: Clear messages when configuration is missing  

## Prevention Measures

1. **Standardized Variable Names**: All functions use consistent `SUPABASE_*` and `OPENAI_*` naming
2. **Environment Validation**: Every function validates environment on startup
3. **Clear Error Messages**: Specific messages indicate which variables are missing
4. **Documentation**: Clear setup instructions and troubleshooting guides

---

**Status**: Requires OpenAI API key configuration before deployment  
**Next Steps**: Configure API key → Deploy → Test pipeline
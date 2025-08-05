# Environment Variable Standards and Casing Guidelines

## Critical Production Issue Resolution

### Background
A production bug was identified where environment variables had inconsistent casing across the codebase:
- **Code expected**: `lovable_reguline` (lowercase)
- **Documentation specified**: `SCRAPER_RAW_GPT_API` (uppercase)
- **Result**: OpenAI API key not found, causing extraction failures

### Solution Applied
All environment variable references have been standardized to **UPPERCASE** format across the entire codebase.

## Environment Variable Naming Standards

### 🚨 CRITICAL RULE: All environment variables MUST use UPPERCASE naming

Environment variables are **case-sensitive** in all deployment environments. This project enforces strict uppercase naming to prevent configuration mismatches.

### Required Environment Variables

| Variable Name | Purpose | Format |
|---------------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://project-id.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key for frontend | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for backend operations | `eyJ...` or `sbp_...` |
| `SCRAPER_RAW_GPT_API` | OpenAI API key for extraction pipeline | `sk-...` |

### Files Updated for Consistency

1. **Edge Functions**:
   - `supabase/functions/extract-document-data/index.ts`: Updated to use `SCRAPER_RAW_GPT_API`
   - `supabase/functions/extract-canonical-subsidy/index.ts`: Updated to use `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SCRAPER_RAW_GPT_API`
   - `supabase/functions/improve-subsidy-titles/index.ts`: Updated to use `NEXT_PUBLIC_SUPABASE_URL`
   - `supabase/functions/upload-farm-document/index.ts`: Updated to use `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   
2. **Configuration Files**:
   - `supabase/config.toml`: Updated `openai_api_key = "env(SCRAPER_RAW_GPT_API)"`
   
3. **Documentation**:
   - `.env.example`: Added `NEXT_PUBLIC_SUPABASE_ANON_KEY` and consistent uppercase format
   - `src/config/environment.ts`: Added critical comments about case sensitivity
   - `ENVIRONMENT_VARIABLE_STANDARDS.md`: Comprehensive documentation
   
4. **Testing & Validation**:
   - `test_env_vars.py`: Validates all standardized variables including `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - All error messages reference uppercase variable names
   - Added `LICENSE` file for proper open-source licensing

## Deployment Checklist

Before deploying any changes involving environment variables:

### ✅ Code Review Checklist
- [ ] All `Deno.env.get()` calls use UPPERCASE variable names
- [ ] All config files reference UPPERCASE environment variables  
- [ ] Documentation examples show UPPERCASE format
- [ ] Error messages reference correct variable names
- [ ] No lowercase environment variable references remain

### ✅ Testing Checklist
- [ ] Run `python test_env_vars.py` to validate all required variables
- [ ] Test edge function deployment with uppercase secrets
- [ ] Verify document extraction works with real uploads
- [ ] Check production logs for configuration errors

### ✅ Secret Configuration
```bash
# Supabase Edge Function Secrets (required for production)
supabase secrets set SCRAPER_RAW_GPT_API=sk-your-openai-api-key-here

# Verify secrets are configured
supabase secrets list
```

## Enforcement Rules

### 🚫 Forbidden Patterns
```javascript
// ❌ WRONG - Lowercase environment variables
const key = Deno.env.get('lovable_reguline');
const key = Deno.env.get('openai_api_key');

// ❌ WRONG - Mixed case
const key = Deno.env.get('Lovable_Reguline');
```

### ✅ Required Patterns
```javascript
// ✅ CORRECT - Uppercase environment variables
const key = Deno.env.get('SCRAPER_RAW_GPT_API');
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
```

### Automated Validation
- **Pre-commit hooks**: Scan for lowercase environment variable patterns
- **CI Pipeline**: Reject deployments with inconsistent variable naming
- **Code Review**: Flag any new environment variables not following uppercase convention

## Future Environment Variables

When adding new environment variables:

1. **Always use UPPERCASE_WITH_UNDERSCORES format**
2. **Update `test_env_vars.py`** with validation logic
3. **Add to `.env.example`** with descriptive comments
4. **Document in README.md** with usage examples
5. **Test in all deployment environments** before merging

## Emergency Recovery

If environment variable casing issues are discovered in production:

1. **Immediate**: Configure secrets with correct uppercase names
2. **Verify**: Test critical functions (document extraction, authentication)
3. **Monitor**: Check edge function logs for remaining configuration errors
4. **Document**: Update this file with lessons learned

---

**Last Updated**: 2025-01-28  
**Critical Status**: Production environment variable standardization complete
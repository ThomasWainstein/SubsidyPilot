# Edge Function Environment Variable Diagnostics Report

## Issue Summary
The `upload-farm-document` edge function fails at runtime with environment variable access errors, specifically unable to read `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON`.

## Root Cause Analysis

### 1. **Environment Variable Name Inconsistency** ⚠️
The most critical issue identified is an inconsistency in environment variable naming:

**In the GitHub Actions workflow (Line 40):**
```bash
supabase secrets set NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON=$NEXT_PUBLIC_SUPABASE_ANON
```

**In the edge function code (Lines 117-118):**
```typescript
const supabaseUrl = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnon = Deno.env.get('NEXT_PUBLIC_SUPABASE_ANON');
```

**However, the expected standard naming should be:**
- `NEXT_PUBLIC_SUPABASE_URL` (✅ correct)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (❌ should be `ANON_KEY` not `ANON`)

### 2. **Deployment Pipeline Issues**
- GitHub Actions workflow is correctly passing secrets to the deployment environment
- The `supabase secrets set` command syntax is correct
- However, there may be a timing issue where secrets are not fully propagated before function deployment

### 3. **Missing Validation Step**
- No verification that secrets were successfully set before deploying functions
- No diagnostic logging to show available environment variables (safely)

## Immediate Fixes Required

### Fix 1: Correct Environment Variable Names
Update the edge function to use the correct standard naming:

```typescript
// Current (incorrect):
const supabaseAnon = Deno.env.get('NEXT_PUBLIC_SUPABASE_ANON');

// Should be (correct):
const supabaseAnon = Deno.env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY');
```

### Fix 2: Add Secret Verification Step
Add a verification step in GitHub Actions after setting secrets:

```yaml
- name: Verify Supabase secrets
  run: |
    supabase secrets list
```

### Fix 3: Enhanced Diagnostic Logging
Add safe environment variable diagnostic logging to the edge function:

```typescript
// Add after line 115 in upload-farm-document/index.ts
console.log('🔧 Environment Check:', {
  hasUrl: !!Deno.env.get('NEXT_PUBLIC_SUPABASE_URL'),
  hasAnon: !!Deno.env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  availableVars: Object.keys(Deno.env.toObject()).filter(k => k.startsWith('NEXT_PUBLIC')),
});
```

## Configuration Verification Checklist

### GitHub Repository Secrets
Ensure these secrets exist in GitHub repository settings:
- [ ] `SUPABASE_ACCESS_TOKEN`
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` (not `ANON`)
- [ ] `SUPABASE_SERVICE_ROLE_KEY`

### Supabase Project Secrets
Verify these secrets in Supabase dashboard:
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`

## Recommended Solution Steps

1. **Immediate**: Update edge function code to use correct variable names
2. **Immediate**: Update GitHub Actions workflow to use correct names
3. **Immediate**: Add secret verification step to deployment
4. **Monitor**: Add enhanced logging for future diagnostics
5. **Test**: Deploy and verify functionality

## Prevention Measures

1. **Standardize naming** across all configuration files
2. **Add validation steps** in CI/CD pipeline
3. **Document exact variable names** in troubleshooting guides
4. **Use environment variable constants** to prevent typos

## Next Steps

1. Implement the naming fixes
2. Update deployment workflow with verification
3. Test deployment with enhanced logging
4. Update documentation with correct variable names
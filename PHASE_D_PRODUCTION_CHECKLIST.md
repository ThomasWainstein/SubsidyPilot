# Phase D Production Deployment Checklist

## ✅ Infrastructure Setup

### GitHub Actions CI/CD
- [x] **Workflow created**: `.github/workflows/phase-d-e2e.yml`
- [ ] **Repository secrets configured**:
  - `SUPABASE_URL` 
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [ ] **Initial workflow run**: Test manually with "Run workflow" button
- [ ] **Notification setup** (optional): Add Slack/email alerts for failures

### Supabase Function Configuration
- [ ] **Phase D enabled**: `ENABLE_PHASE_D=true` in function secrets
- [ ] **OpenAI API key**: `OPENAI_API_KEY=sk-proj-...` in function secrets  
- [ ] **AI model configured**: `OPENAI_TABLES_MODEL=gpt-4o-mini` (or preferred)
- [ ] **Resource limits** (optional):
  - `MAX_TABLES_PER_DOC=50`
  - `MAX_CELLS_PER_DOC=50000`

### Database Analytics
- [x] **Analytics views created**: `phase_d_extractions` and `phase_d_stats_daily`
- [x] **Optimized indexes**: Performance indexes for Phase D queries
- [ ] **Permissions verified**: Views accessible to authenticated users

## ✅ Security & Access Control

### Row Level Security (RLS)
- [x] **document_extractions table**: RLS enabled with user-based policies
- [x] **Storage bucket**: `farm-documents` bucket configured
- [ ] **Function auth mode**: Verify service-role vs anon requirements
- [ ] **Bucket permissions**: Function can read uploaded objects

### Security Linter Warnings
- [ ] **Review security warnings**: Check any SECURITY DEFINER view warnings
- [ ] **Apply fixes**: Follow Supabase documentation links to resolve issues

## ✅ Testing & Validation

### End-to-End Testing
- [x] **Golden fixtures**: PDF/DOCX/XLSX test files generated
- [x] **Test harness**: Complete E2E validation script
- [ ] **Staging deployment**: Run harness against staging environment
- [ ] **Assertion validation**: Verify all 21/21 checks pass
- [ ] **Performance baseline**: Document typical processing times and token usage

### Manual Testing Scenarios
- [ ] **Large documents**: Test with documents >50 tables or >50k cells
- [ ] **Multi-page tables**: Verify table merging across pages works
- [ ] **Error handling**: Test with corrupted/invalid files
- [ ] **Rate limiting**: Verify OpenAI 429 handling with retries

## ✅ Monitoring & Observability

### Analytics Dashboard
- [ ] **Query analytics views**: Test `phase_d_extractions` and `phase_d_stats_daily`
- [ ] **Grafana/dashboard setup** (optional): Create visual monitoring
- [ ] **Key metrics tracked**:
  - Success/failure rates
  - Average processing times
  - Token consumption
  - Table quality scores
  - Subsidy field detection rates

### Operational Monitoring
- [ ] **Function logs**: Verify Phase D logs are clear and informative
- [ ] **Error tracking**: Monitor extraction failures and timeouts
- [ ] **Cost tracking**: Monitor OpenAI API usage and costs
- [ ] **Performance metrics**: Track processing times and resource usage

## ✅ Rollout Strategy

### Staging Deployment
- [ ] **Environment variables**: Set in staging environment
- [ ] **Function secrets**: Configure staging function secrets
- [ ] **Test with real data**: Use production-like documents
- [ ] **User acceptance**: Validate with stakeholder testing

### Production Rollout
- [ ] **Feature flags ready**: `VITE_ENABLE_PDF_VIEWER` configured
- [ ] **Gradual rollout**: Consider percentage-based rollout
- [ ] **Monitoring alerts**: Set up alerts for errors/performance degradation
- [ ] **Rollback plan**: Document quick disable procedures

### Post-Deployment
- [ ] **24h monitoring**: Watch for any issues in first day
- [ ] **Performance validation**: Confirm processing times meet expectations
- [ ] **User feedback**: Collect feedback on PDF viewer and extraction quality
- [ ] **Cost analysis**: Validate OpenAI usage aligns with budget

## 🚨 Emergency Procedures

### Quick Disable
```bash
# Disable Phase D processing
supabase secrets set ENABLE_PHASE_D=false --project-ref <ref>

# Disable PDF viewer
# Set VITE_ENABLE_PDF_VIEWER=false in environment
```

### Rollback Edge Function
```bash
# Revert to previous function version
supabase functions deploy extract-document-data --project-ref <ref>
```

### Emergency Contacts
- [ ] **Technical lead**: [contact info]
- [ ] **DevOps/Infrastructure**: [contact info]  
- [ ] **OpenAI support**: [contact info for API issues]

## 📊 Success Metrics

### Technical KPIs
- **Extraction success rate**: >95% for documents with tables
- **Processing time**: <30s average for typical documents
- **Table quality**: >0.7 average quality score
- **Error rate**: <5% function failures

### Business KPIs  
- **Subsidy detection**: >80% of relevant tables identified
- **User engagement**: Increased document uploads with table content
- **Cost efficiency**: OpenAI token usage within budget targets

---

## Quick Commands

### Test harness locally:
```bash
deno run -A scripts/make_golden_fixtures.ts
deno run -A scripts/phase_d_harness.ts
```

### Monitor Phase D extractions:
```sql
SELECT * FROM phase_d_stats_daily ORDER BY extraction_date DESC LIMIT 7;
```

### Validate recent extractions:
```bash
deno run --allow-net --allow-env supabase/functions/extract-document-data/phase-d-test.ts
```
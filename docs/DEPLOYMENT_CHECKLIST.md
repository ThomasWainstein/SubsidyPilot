# Production Deployment Checklist

## ✅ Pre-Merge Sanity (2-3 minutes)

### Branch Protection & Environments
- [ ] **Branch protection**: main branch requires status checks
  - [ ] `Phase D E2E Testing / run-harness` (required)  
  - [ ] `Phase D E2E Testing / health-check` (required)
- [ ] **GitHub Environments**: staging/production configured
  - [ ] Environment-scoped secrets (not repo-level)
  - [ ] Required reviewers for production deployments
- [ ] **Concurrency groups**: prevent overlapping workflow runs
- [ ] **Timeouts**: 15min for harness, 30min for backfill

### Security & Secrets
- [ ] **Slack webhook**: org/environment secret (not repo-level)
- [ ] **API keys**: no secrets logged in workflow output
- [ ] **RLS policies**: authenticated users can view analytics
- [ ] **PII audit**: no sensitive data in extraction logs

### Scripts & Workflows  
- [ ] **Error handling**: `set -Eeuo pipefail` with failure traps
- [ ] **Deno permissions**: minimal flags (no `-A` in CI)
- [ ] **Artifact retention**: 7 days for test fixtures/logs

## 🚀 Launch Day Run-of-Show

### T-60 minutes: Staging Validation
```bash
./scripts/deploy-phase-d.sh staging
# Expect: 21/21 core harness, 0 critical errors in extended
```

### T-30 minutes: Production Deploy  
```bash
./scripts/deploy-phase-d.sh production --dry-run
./scripts/deploy-phase-d.sh production
# Manually run "Phase D E2E Testing" workflow → green
```

### T-15 minutes: Initial Backfill
```bash
BACKFILL_DAYS=1 DRY_RUN=false deno run --allow-read --allow-write --allow-net --allow-env scripts/backfill_phase_d.ts
```

### T+15 / T+60 minutes: Health Validation
Health queries should show:
- ✅ **Healthy** status
- **>95% success rate**  
- **<30s average processing**
- **Slack notifications** working for both success/failure

## 🛡️ Guardrails in Place

- **Deployment gating**: deploys blocked on failed harness
- **Emergency rollback**: 90-second disable procedure
- **Monitoring**: automated alerts on failure rate >5%
- **Budget protection**: token usage limits with graceful degradation

## 📊 Success Criteria

- [ ] All staging validations pass
- [ ] Production harness shows 21/21 
- [ ] Health metrics within target ranges
- [ ] Slack alerts functioning correctly
- [ ] Backfill processes documents successfully  
- [ ] Emergency procedures tested and documented

---

**Emergency Contact**: Check `docs/PRODUCTION_SHAKEDOWN.md` for rollback procedures
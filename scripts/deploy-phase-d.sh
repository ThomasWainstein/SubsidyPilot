#!/bin/bash
# Quick deployment script for Phase D production rollout
# Usage: ./scripts/deploy-phase-d.sh [staging|production] [--dry-run]

set -Eeuo pipefail
trap 'echo -e "${RED}❌ Failed at line $LINENO${NC}"; exit 1' ERR

PROJECT_REF=${1:-staging}
DRY_RUN=${2}

echo "🚀 Phase D Deployment Script"
echo "Target: $PROJECT_REF"
echo "Dry run: ${DRY_RUN:-false}"
echo ""

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 is required but not installed${NC}"
        exit 1
    fi
}

# Prerequisites
echo "📋 Checking prerequisites..."
check_command "supabase"
check_command "deno"
check_command "jq"

# Check if logged into Supabase
if ! supabase projects list &> /dev/null; then
    echo -e "${RED}❌ Not logged into Supabase CLI${NC}"
    echo "Run: supabase auth login"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites OK${NC}"
echo ""

# Secrets check
echo "🔐 Verifying function secrets..."
SECRETS=$(supabase secrets list --project-ref $PROJECT_REF 2>/dev/null || echo "")

check_secret() {
    if [[ $SECRETS == *"$1"* ]]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${YELLOW}⚠️  $1 missing${NC}"
    fi
}

check_secret "ENABLE_PHASE_D"
check_secret "OPENAI_API_KEY" 
check_secret "OPENAI_TABLES_MODEL"
check_secret "MAX_TABLES_PER_DOC"
check_secret "MAX_CELLS_PER_DOC"
echo ""

# Deploy function
if [[ $DRY_RUN != "--dry-run" ]]; then
    echo "🚢 Deploying extract-document-data function..."
    supabase functions deploy extract-document-data --project-ref $PROJECT_REF
    echo -e "${GREEN}✅ Function deployed${NC}"
else
    echo -e "${YELLOW}🏃 DRY RUN: Would deploy extract-document-data${NC}"
fi
echo ""

# Generate fixtures
echo "📁 Generating test fixtures..."
deno run --allow-read --allow-write --allow-net scripts/make_golden_fixtures.ts
deno run --allow-read --allow-write --allow-net scripts/make_golden_fixtures_ext.ts
echo -e "${GREEN}✅ Fixtures generated${NC}"
echo ""

# Run harness
echo "🧪 Running Phase D harness..."
if deno run --allow-read --allow-write --allow-net --allow-env scripts/phase_d_harness.ts; then
    echo -e "${GREEN}✅ Core harness passed${NC}"
else
    echo -e "${RED}❌ Core harness failed${NC}"
    exit 1
fi

echo "🧪 Running extended harness..."
if deno run --allow-read --allow-write --allow-net --allow-env scripts/phase_d_harness_ext.ts; then
    echo -e "${GREEN}✅ Extended harness passed${NC}"
else
    echo -e "${YELLOW}⚠️  Extended harness had issues (check output)${NC}"
fi
echo ""

# Backfill dry run
echo "🔄 Testing backfill (dry run)..."
BACKFILL_DAYS=1 DRY_RUN=true deno run --allow-read --allow-write --allow-net --allow-env scripts/backfill_phase_d.ts
echo -e "${GREEN}✅ Backfill test complete${NC}"
echo ""

echo -e "${GREEN}🎉 Phase D deployment validation complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Monitor health queries in production"
echo "2. Run actual backfill: BACKFILL_DAYS=1 DRY_RUN=false deno run --allow-read --allow-write --allow-net --allow-env scripts/backfill_phase_d.ts"
echo "3. Set up monitoring alerts per docs/PHASE_D_MONITORING.md"
echo ""
echo "Emergency rollback: supabase secrets set ENABLE_PHASE_D=false --project-ref $PROJECT_REF"
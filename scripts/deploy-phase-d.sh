#!/usr/bin/env bash
# Phase D secure deploy + smoke: no secrets in code, read from env/CI only.

set -Eeuo pipefail
trap 'echo "❌ Failed at line $LINENO"; exit 1' ERR

# --- Optional: auto-load local env (never commit this file) ---
for f in .env.local .env; do
  [[ -f "$f" ]] && { set -a; # export all
    # shellcheck disable=SC1090
    source "$f"
    set +a;
  }
done

# --- Required env (CI secrets or .env) ---
: "${PROJECT_REF:?Set PROJECT_REF (e.g., gvfgvbztagafjykncwto)}"
: "${SUPABASE_URL:="https://${PROJECT_REF}.supabase.co"}"
: "${SUPABASE_ANON_KEY:?Set SUPABASE_ANON_KEY via CI/.env}"
: "${SUPABASE_SERVICE_ROLE_KEY:?Set SUPABASE_SERVICE_ROLE_KEY via CI/.env}"

# --- Harness / function flags (safe defaults) ---
: "${HARNESS_BUCKET:=farm-documents}"
: "${HARNESS_USE_SERVICE_ROLE:=true}"
: "${OPENAI_TABLES_MODEL:=gpt-4o-mini}"
: "${MAX_TABLES_PER_DOC:=50}"
: "${MAX_CELLS_PER_DOC:=50000}"

# --- Optional SQL spot-check (skip if not set) ---
: "${DATABASE_URL:=}"

# --- Preflight ---
need() { command -v "$1" >/dev/null || { echo "✗ missing: $1"; exit 1; }; }
echo "📋 Checking prerequisites…"
need supabase; need deno
echo "✅ CLI tools present"

# Verify Supabase auth
supabase projects list >/dev/null || { echo "✗ Not logged in. Run: supabase auth login"; exit 1; }
echo "✅ Supabase auth OK"

# --- Set function secrets (do NOT echo values) ---
# We do not fetch secrets from Supabase (not supported for secure values).
# We only *set* non-sensitive flags and rely on your OPENAI_API_KEY already stored in Supabase.
echo "🔐 Setting safe function flags (not printing values)…"
supabase secrets set \
  ENABLE_PHASE_D=true \
  OPENAI_TABLES_MODEL="$OPENAI_TABLES_MODEL" \
  MAX_TABLES_PER_DOC="$MAX_TABLES_PER_DOC" \
  MAX_CELLS_PER_DOC="$MAX_CELLS_PER_DOC" \
  --project-ref "$PROJECT_REF" >/dev/null
echo "✅ Function flags set"

# --- Deploy Edge Function ---
echo "🚢 Deploying edge function…"
supabase functions deploy extract-document-data --project-ref "$PROJECT_REF"
echo "✅ Function deployed"

# --- Generate fixtures & run harness (minimal Deno perms) ---
echo "📁 Generating fixtures…"
deno run --allow-read --allow-write --allow-net scripts/make_golden_fixtures.ts

echo "🧪 Running core harness (expect 21/21)…"
SUPABASE_URL="$SUPABASE_URL" \
SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
HARNESS_BUCKET="$HARNESS_BUCKET" \
HARNESS_USE_SERVICE_ROLE="$HARNESS_USE_SERVICE_ROLE" \
deno run --allow-read --allow-write --allow-net --allow-env scripts/phase_d_harness.ts

# --- Optional quick SQL health check ---
if [[ -n "$DATABASE_URL" ]]; then
  echo "📈 Health (last 2h)…"
  psql "$DATABASE_URL" -Atc "
    SELECT 'success_rate='||
           ROUND(AVG((extraction_outcome='success')::int)::numeric,3)
    FROM phase_d_extractions
    WHERE created_at > NOW() - INTERVAL '2 hours';" || true
  psql "$DATABASE_URL" -Atc "
    SELECT extraction_outcome||':'||quality_tier||'='||COUNT(*)
    FROM phase_d_extractions
    WHERE created_at > NOW() - INTERVAL '2 hours'
    GROUP BY extraction_outcome, quality_tier
    ORDER BY COUNT(*) DESC;" || true
else
  echo "ℹ️  Skip SQL spot-check (set DATABASE_URL to enable)."
fi

echo "✅ Done. Watch logs & metrics for the first hour."
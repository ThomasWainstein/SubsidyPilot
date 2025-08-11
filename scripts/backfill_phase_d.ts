// deno run -A scripts/backfill_phase_d.ts
// Reprocess docs that (a) have no Phase D row, or (b) Phase D < target version

// ENV needed:
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// BACKFILL_DAYS=7 (default), TARGET_PHASE_D_VERSION=1.0.0 (default)
// EDGE_FUNCTION=extract-document-data (default)
// CONCURRENCY=2 (default), DRY_RUN=true|false

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BACKFILL_DAYS = parseInt(Deno.env.get("BACKFILL_DAYS") || "7");
const TARGET_VERSION = Deno.env.get("TARGET_PHASE_D_VERSION") || "1.0.0";
const EDGE_FUNCTION = Deno.env.get("EDGE_FUNCTION") || "extract-document-data";
const CONCURRENCY = parseInt(Deno.env.get("CONCURRENCY") || "2");
const DRY_RUN = (Deno.env.get("DRY_RUN") || "false").toLowerCase() === "true";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  Deno.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

// Pull candidates: docs updated in last N days where latest Phase D is missing/mismatched
async function findCandidates() {
  // Get most recent extraction per document
  const { data, error } = await admin
    .from("document_extractions")
    .select(`
      id, document_id, created_at, status,
      table_data
    `)
    .gte("created_at", new Date(Date.now() - BACKFILL_DAYS * 864e5).toISOString())
    .order("created_at", { ascending: false });

  if (error) throw error;

  // keep one per doc, decide if needs backfill
  const seen = new Set<string>();
  const needs: Array<{ document_id: string; reason: string }> = [];

  for (const row of data || []) {
    const docId = row.document_id as string;
    if (seen.has(docId)) continue;
    seen.add(docId);

    const meta = row.table_data?.metadata;
    const method = meta?.extractionMethod;
    const version = meta?.version;

    const isPhaseD = method === "phase-d-advanced";
    const isTarget = version === TARGET_VERSION;
    const succeeded = row.status && ["completed", "success", "succeeded"].includes(row.status);

    if (!isPhaseD || !isTarget || !succeeded) {
      needs.push({
        document_id: docId,
        reason: !isPhaseD ? "no_phase_d" : !isTarget ? "old_version" : "not_succeeded",
      });
    }
  }
  return needs;
}

async function invokeFunction(document_id: string) {
  const url = `${SUPABASE_URL}/functions/v1/${EDGE_FUNCTION}`;
  const runId = `backfill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const body = {
    documentId: document_id,
    force: true,
    enablePhaseD: true,
    runId,
  };

  if (DRY_RUN) {
    console.log(`[DRY] would invoke for ${document_id} runId=${runId}`);
    return { ok: true, dry: true };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`invoke ${document_id} -> ${res.status}: ${text}`);
  }
  return { ok: true, runId };
}

// simple pool
async function runPool<T, R>(items: T[], size: number, worker: (t: T) => Promise<R>) {
  const ret: R[] = [];
  let i = 0;
  const lanes = Array.from({ length: Math.min(size, items.length) }, async function lane() {
    while (i < items.length) {
      const idx = i++;
      try {
        ret[idx] = await worker(items[idx]);
      } catch (e) {
        console.error("worker error:", e);
      }
      // jitter to be gentle
      await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
    }
  });
  await Promise.all(lanes);
  return ret;
}

if (import.meta.main) {
  console.log(`🔎 Backfill scan: last ${BACKFILL_DAYS} days → target Phase D v${TARGET_VERSION}`);
  const candidates = await findCandidates();
  console.log(`Found ${candidates.length} document(s) needing backfill.`);

  const results = await runPool(candidates, CONCURRENCY, async (c) => {
    console.log(`→ ${c.document_id} (${c.reason})`);
    return invokeFunction(c.document_id);
  });

  const ok = results.filter(r => (r as any)?.ok).length;
  console.log(`\n✅ Backfill queued: ${ok}/${candidates.length} (dryRun=${DRY_RUN})`);
}

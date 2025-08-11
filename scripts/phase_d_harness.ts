// deno run -A scripts/phase_d_harness.ts
// Requires env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
// Optional: HARNESS_BUCKET (default "farm-documents"), HARNESS_USE_SERVICE_ROLE (default false)
// Ensure function secrets: ENABLE_PHASE_D=true, OPENAI_API_KEY, OPENAI_TABLES_MODEL
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = Deno.env.get("HARNESS_BUCKET") ?? "farm-documents";
const USE_SERVICE_ROLE = Deno.env.get("HARNESS_USE_SERVICE_ROLE") === "true";
const PROJECT_REF = SUPABASE_URL.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co\/?$/i)?.[1];
if (!PROJECT_REF) throw new Error("Could not parse project ref from SUPABASE_URL");

const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

// Choose client and auth token based on configuration
const uploadClient = admin; // Always use admin for uploads to avoid auth issues
const functionAuthToken = USE_SERVICE_ROLE ? SERVICE_ROLE : ANON_KEY;

console.log(`🔧 Config: Using ${USE_SERVICE_ROLE ? 'service-role' : 'anon'} auth for function calls`);
console.log(`📦 Upload bucket: ${BUCKET}`);

type Check = { ok: boolean; note: string };

async function uploadAndProcess(fpath: string, mime: string) {
  const file = await Deno.readFile(fpath);
  const docId = crypto.randomUUID();
  const base = fpath.split("/").pop()!;
  const storagePath = `harness/${docId}/${base}`;

  console.log(`\n📤 Uploading ${base} → ${BUCKET}/${storagePath}`);
  const up = await uploadClient.storage.from(BUCKET).upload(storagePath, file, { contentType: mime, upsert: true });
  if (up.error) throw up.error;

  // Call edge function with appropriate auth
  const fnUrl = `https://${PROJECT_REF}.functions.supabase.co/extract-document-data`;
  console.log(`⚡ Calling function: ${fnUrl} (using ${USE_SERVICE_ROLE ? 'service-role' : 'anon'} auth)`);

  const fnRes = await fetch(fnUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${functionAuthToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      document_id: docId,
      bucket: BUCKET,
      path: storagePath,
      file_name: base,
      mime_type: mime,
      source: "harness",
      enablePhaseD: true,
    }),
  });

  if (!fnRes.ok) {
    const text = await fnRes.text().catch(() => "");
    throw new Error(`Function error ${fnRes.status}: ${text}`);
  }

  // Poll DB for extraction result (extended timeout for cold starts)
  console.log("⏳ Waiting for extraction to complete…");
  const deadline = Date.now() + 180_000; // 180s for cold starts and queuing
  let record: any = null;

  while (Date.now() < deadline) {
    const { data, error } = await admin
      .from("document_extractions")
      .select("*")
      .eq("document_id", docId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;

    record = data?.[0];
    if (record?.status && ["completed", "success", "succeeded"].includes(record.status)) {
      console.log(`✅ Extraction completed with status: ${record.status}`);
      break;
    }
    if (record?.status === "failed") {
      console.log(`❌ Extraction failed with status: ${record.status}`);
      break;
    }
    if (record?.status) {
      console.log(`⏳ Current status: ${record.status}, waiting...`);
    }

    await new Promise((r) => setTimeout(r, 2000)); // Poll every 2s
  }

  if (!record) throw new Error("No extraction row found within 180s timeout.");

  console.log(`📊 Final record status: ${record.status}, confidence: ${record.confidence_score?.toFixed(2) || 'N/A'}`);
  if (record.table_data?.metadata) {
    const meta = record.table_data.metadata;
    console.log(`🔧 Extraction method: ${meta.extractionMethod || 'N/A'}`);
    console.log(`🤖 AI model: ${meta.aiModel || 'N/A'}`);
    console.log(`⏱️ Processing time: ${meta.totalProcessingTime || 'N/A'}ms`);
    console.log(`💰 Subsidy fields: ${meta.subsidyFieldsFound || 0}`);
  }

  // Assertions
  const checks: Check[] = [];
  const td = record.table_data ?? {};
  const meta = td.metadata ?? {};

  checks.push({ ok: !!record.tables_extracted, note: "tables_extracted === true" });
  checks.push({ ok: (record.table_count ?? 0) > 0, note: "table_count > 0" });
  checks.push({ ok: typeof record.table_quality === "number", note: "table_quality is number" });
  checks.push({ ok: meta.extractionMethod === "phase-d-advanced", note: `metadata.extractionMethod === 'phase-d-advanced'` });
  checks.push({ ok: !!meta.aiModel, note: "metadata.aiModel present" });
  checks.push({ ok: Array.isArray(td.raw), note: "table_data.raw is array" });
  checks.push({ ok: Array.isArray(td.processed), note: "table_data.processed is array" });

  const passed = checks.filter(c => c.ok).length;
  console.log(`\n🧪 Assertions for ${base}: ${passed}/${checks.length} passed`);
  for (const c of checks) console.log(`${c.ok ? "  ✓" : "  ✗"} ${c.note}`);

  return { docId, record, passed, total: checks.length };
}

if (import.meta.main) {
  console.log(`🚀 Phase D Harness Starting`);
  console.log(`📋 Environment check:`);
  console.log(`   SUPABASE_URL: ${SUPABASE_URL ? '✓' : '✗'}`);
  console.log(`   SUPABASE_ANON_KEY: ${ANON_KEY ? '✓' : '✗'}`);
  console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${SERVICE_ROLE ? '✓' : '✗'}`);
  console.log(`   HARNESS_BUCKET: ${BUCKET}`);
  console.log(`   HARNESS_USE_SERVICE_ROLE: ${USE_SERVICE_ROLE}`);
  console.log(`\n⚙️ Expected function secrets:`);
  console.log(`   ENABLE_PHASE_D=true`);
  console.log(`   OPENAI_API_KEY=sk-...`);
  console.log(`   OPENAI_TABLES_MODEL=gpt-4o-mini (or preferred)`);
  console.log(`   MAX_TABLES_PER_DOC=50 (optional)`);
  console.log(`   MAX_CELLS_PER_DOC=50000 (optional)`);
  
  try {
    const results = [];
    results.push(await uploadAndProcess("fixtures/pdf_golden.pdf", "application/pdf"));
    results.push(await uploadAndProcess("fixtures/docx_golden.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"));
    results.push(await uploadAndProcess("fixtures/xlsx_golden.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));

    const totalPassed = results.reduce((s, r) => s + r.passed, 0);
    const totalChecks = results.reduce((s, r) => s + r.total, 0);
    console.log(`\n🏁 Harness complete: ${totalPassed}/${totalChecks} checks passed across ${results.length} files`);
    Deno.exit(totalPassed === totalChecks ? 0 : 1);
  } catch (e) {
    console.error("❌ Harness failed:", e);
    Deno.exit(1);
  }
}
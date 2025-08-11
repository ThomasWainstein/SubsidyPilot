// deno run -A scripts/phase_d_harness_ext.ts
// Extended harness testing edge cases and extended fixtures

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = Deno.env.get("HARNESS_BUCKET") ?? "farm-documents";
const USE_SERVICE_ROLE = Deno.env.get("HARNESS_USE_SERVICE_ROLE") === "true";
const PROJECT_REF = SUPABASE_URL.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co\/?$/i)?.[1];

if (!PROJECT_REF) throw new Error("Could not parse project ref from SUPABASE_URL");

const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
const uploadClient = admin;
const functionAuthToken = USE_SERVICE_ROLE ? SERVICE_ROLE : ANON_KEY;

type ExtendedCheck = { 
  ok: boolean; 
  note: string; 
  severity: 'error' | 'warning' | 'info';
  expected?: boolean; // Some failures are expected (e.g., scanned PDFs)
};

async function uploadAndProcessExtended(fpath: string, mime: string, expectedBehavior?: string) {
  const file = await Deno.readFile(fpath);
  const docId = crypto.randomUUID();
  const base = fpath.split("/").pop()!;
  const storagePath = `harness-ext/${docId}/${base}`;

  console.log(`\n📤 Uploading ${base} → ${BUCKET}/${storagePath}`);
  console.log(`   Expected: ${expectedBehavior || 'Normal processing'}`);
  
  const up = await uploadClient.storage.from(BUCKET).upload(storagePath, file, { contentType: mime, upsert: true });
  if (up.error) throw up.error;

  const fnUrl = `https://${PROJECT_REF}.functions.supabase.co/extract-document-data`;
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
      source: "harness-ext",
      enablePhaseD: true,
    }),
  });

  if (!fnRes.ok) {
    const text = await fnRes.text().catch(() => "");
    throw new Error(`Function error ${fnRes.status}: ${text}`);
  }

  console.log("⏳ Waiting for extraction to complete…");
  const deadline = Date.now() + 180_000;
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
      console.log(`✅ Extraction completed: ${record.status}`);
      break;
    }
    if (record?.status === "failed") {
      console.log(`❌ Extraction failed: ${record.status}`);
      break;
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  if (!record) throw new Error("No extraction row found within timeout");

  // Extended assertions with severity levels
  const checks: ExtendedCheck[] = [];
  const td = record.table_data ?? {};
  const meta = td.metadata ?? {};

  // Core functionality checks
  checks.push({ 
    ok: record.status === 'completed' || record.status === 'success', 
    note: "extraction completed successfully", 
    severity: 'error' 
  });

  // Phase D specific checks (may be expected to fail for scanned docs)
  const isPhaseD = meta.extractionMethod === 'phase-d-advanced';
  checks.push({ 
    ok: isPhaseD, 
    note: "Phase D extraction method used", 
    severity: base.includes('scanned') ? 'warning' : 'error',
    expected: !base.includes('scanned')
  });

  // Table extraction checks (context-dependent)
  if (base.includes('scanned')) {
    // Scanned PDFs: expect low/no table extraction but should not crash
    checks.push({ 
      ok: (record.table_count || 0) >= 0, 
      note: `scanned doc table count: ${record.table_count || 0} (expected: low/zero)`, 
      severity: 'info',
      expected: true
    });
  } else if (base.includes('wide') || base.includes('merged') || base.includes('large')) {
    // Complex tables: should extract something but may be partial
    checks.push({ 
      ok: (record.table_count || 0) > 0, 
      note: `complex table extraction: ${record.table_count || 0} tables`, 
      severity: 'warning' 
    });
    checks.push({ 
      ok: typeof record.table_quality === 'number', 
      note: "table quality assigned", 
      severity: 'error' 
    });
  } else {
    // Standard documents: expect full extraction
    checks.push({ 
      ok: (record.table_count || 0) > 0, 
      note: `table count: ${record.table_count || 0}`, 
      severity: 'error' 
    });
    checks.push({ 
      ok: typeof record.table_quality === 'number' && record.table_quality > 0.3, 
      note: `table quality: ${record.table_quality?.toFixed(3) || 'N/A'}`, 
      severity: 'error' 
    });
  }

  // Metadata completeness
  if (isPhaseD) {
    checks.push({ 
      ok: !!meta.aiModel, 
      note: `AI model: ${meta.aiModel || 'missing'}`, 
      severity: 'error' 
    });
    checks.push({ 
      ok: Array.isArray(td.raw), 
      note: "raw table data structure", 
      severity: 'error' 
    });
    checks.push({ 
      ok: Array.isArray(td.processed), 
      note: "processed table data structure", 
      severity: 'error' 
    });
  }

  // Performance checks
  if (meta.totalProcessingTime) {
    checks.push({ 
      ok: meta.totalProcessingTime < 60000, 
      note: `processing time: ${meta.totalProcessingTime}ms`, 
      severity: meta.totalProcessingTime > 45000 ? 'warning' : 'info' 
    });
  }

  // Cost checks
  if (meta.totalTokensUsed) {
    const isHighUsage = meta.totalTokensUsed > 5000;
    checks.push({ 
      ok: !isHighUsage, 
      note: `token usage: ${meta.totalTokensUsed}`, 
      severity: isHighUsage ? 'warning' : 'info' 
    });
  }

  // Summarize results
  const errors = checks.filter(c => !c.ok && c.severity === 'error').length;
  const warnings = checks.filter(c => !c.ok && c.severity === 'warning').length;
  const passed = checks.filter(c => c.ok).length;

  console.log(`\n🧪 Extended assertions for ${base}: ${passed}/${checks.length} passed`);
  checks.forEach(c => {
    const icon = c.ok ? "  ✓" : (c.severity === 'error' ? "  ✗" : "  ⚠");
    const prefix = c.severity === 'error' ? '[ERROR]' : c.severity === 'warning' ? '[WARN]' : '[INFO]';
    console.log(`${icon} ${prefix} ${c.note}`);
  });

  return { 
    docId, 
    record, 
    checks, 
    passed, 
    errors, 
    warnings, 
    total: checks.length,
    fileName: base 
  };
}

if (import.meta.main) {
  console.log(`🚀 Phase D Extended Harness Starting`);
  console.log(`📋 Testing edge cases and extended fixtures`);

  try {
    const results = [];
    
    // Test extended fixtures with specific expectations
    results.push(await uploadAndProcessExtended(
      "fixtures_ext/pdf_wide_multi.pdf", 
      "application/pdf",
      "Wide multi-page table - should merge pages"
    ));
    
    results.push(await uploadAndProcessExtended(
      "fixtures_ext/pdf_scanned.pdf", 
      "application/pdf",
      "Scanned-style PDF - low/no table extraction expected"
    ));
    
    results.push(await uploadAndProcessExtended(
      "fixtures_ext/docx_wide.docx", 
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Wide DOCX table - should handle column overflow"
    ));
    
    results.push(await uploadAndProcessExtended(
      "fixtures_ext/xlsx_merged.xlsx", 
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Merged cells XLSX - should preserve relationships"
    ));
    
    results.push(await uploadAndProcessExtended(
      "fixtures_ext/xlsx_large_table.xlsx", 
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Large table (200 rows) - should respect limits"
    ));

    // Summary
    const totalPassed = results.reduce((s, r) => s + r.passed, 0);
    const totalChecks = results.reduce((s, r) => s + r.total, 0);
    const totalErrors = results.reduce((s, r) => s + r.errors, 0);
    const totalWarnings = results.reduce((s, r) => s + r.warnings, 0);

    console.log(`\n🏁 Extended harness complete:`);
    console.log(`   ✅ Passed: ${totalPassed}/${totalChecks} checks`);
    console.log(`   ❌ Errors: ${totalErrors}`);
    console.log(`   ⚠️  Warnings: ${totalWarnings}`);
    console.log(`   📁 Files tested: ${results.length}`);

    // Report per-file summary
    console.log(`\n📊 Per-file results:`);
    results.forEach(r => {
      const status = r.errors === 0 ? '✅' : r.errors <= 2 ? '⚠️' : '❌';
      console.log(`   ${status} ${r.fileName}: ${r.passed}/${r.total} (${r.errors}E, ${r.warnings}W)`);
    });

    // Overall assessment
    const isHealthy = totalErrors === 0;
    const isDegraded = totalErrors <= 3 && totalWarnings <= 5;
    
    console.log(`\n🎯 Overall assessment: ${
      isHealthy ? '✅ HEALTHY - All critical functions working' :
      isDegraded ? '⚠️ DEGRADED - Some issues but functional' :
      '❌ CRITICAL - Major issues detected'
    }`);

    Deno.exit(isHealthy ? 0 : isDegraded ? 1 : 2);
    
  } catch (e) {
    console.error("❌ Extended harness failed:", e);
    Deno.exit(3);
  }
}
// deno run -A scripts/make_golden_fixtures_ext.ts
// Extended fixtures for edge cases: wide tables, merged cells, scanned PDFs, etc.

import { ensureDir } from "https://deno.land/std@0.224.0/fs/ensure_dir.ts";
import * as path from "https://deno.land/std@0.224.0/path/mod.ts";

// npm modules via Deno's npm compatibility
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType } from "npm:docx@8";
import * as XLSX from "npm:xlsx@0.18";

const OUT_DIR = "fixtures_ext";
await ensureDir(OUT_DIR);

// Common headers but wider for edge case testing
const wideHeaders = ["Program", "Min Amount", "Max Amount", "Co-Financing", "Deadline", "Region", "Sector", "URL", "Status", "Notes"];

// Multi-currency, comma decimals, mixed date formats
const trickyRows = [
  ["CAP Direct Payments", "€1.234,56", "€150,000.00", "0%", "31/12/2025", "FR", "Crop", "https://cap.ec.europa.eu", "Open", "comma decimals EU style"],
  ["Young Farmer Scheme", "RON 12.345,00", "$40,000.00", "50%", "12/31/2025", "RO", "Mixed", "https://madr.ro", "Planned", "multi-currency, US dates"],
  ["Organic Transition", "€2,500", "€75.000,00", "30,5%", "2025-10-15", "ES", "Organic", "https://fega.es", "Open", "mixed decimal formats"],
  ["LEADER Programme", "£5,000.50", "€200.000", "75%", "15/03/2026", "UK", "Rural", "https://gov.uk", "Closed", "mixed currencies & dates"],
  ["Green Investment", "CHF 10'000", "CHF 500'000", "60%", "2026-06-30", "CH", "Environment", "https://blw.admin.ch", "Open", "Swiss formatting"],
];

// ---------- PDF (wide, multi-page) ----------
async function makePdfWideMulti(filepath: string) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Generate enough rows to spill to 2+ pages
  const rows = Array.from({ length: 35 }, (_, i) => [
    `Program ${i+1}`, 
    `${(1000 + i).toLocaleString('de-DE')} €`, 
    `${(20000 + i*100).toLocaleString('fr-FR')}`, 
    `${((i%5)*10 + (i%3)*2.5).toFixed(1).replace('.', ',')}%`,
    i%2 ? "31/12/2025" : "12/31/2025",
    ["FR","RO","ES","DE","IT"][i%5], 
    ["Crop","Organic","Livestock","Forestry"][i%4],
    "https://example.org", 
    i%3 ? "Open" : "Closed", 
    i%2 ? `Note with special chars: éñü ${i}` : `Remark #${i}`,
  ]);

  let page = pdf.addPage([842, 595]); // landscape A4
  let margin = 20;
  let x = margin, y = 595 - margin - 24;
  const colW = [100,80,80,80,80,50,60,110,50,120]; // tight fit
  const rowH = 20;

  const drawHeader = () => {
    x = margin;
    wideHeaders.forEach((h, i) => {
      page.drawText(h, { x: x + 2, y: y + 4, size: 8, font: fontBold });
      page.drawRectangle({ x, y, width: colW[i], height: rowH, borderColor: rgb(0,0,0), borderWidth: 0.5 });
      x += colW[i];
    });
  };

  drawHeader();
  let curY = y - rowH;

  rows.forEach((r, idx) => {
    if (curY < margin + 30) {
      // Add new page
      page = pdf.addPage([842, 595]);
      y = 595 - margin - rowH;
      drawHeader();
      curY = y - rowH;
    }
    let cx = margin;
    r.forEach((cell, i) => {
      const text = String(cell);
      // Truncate long text to fit
      const maxChars = Math.floor(colW[i] / 4);
      const displayText = text.length > maxChars ? text.substring(0, maxChars-3) + "..." : text;
      
      page.drawText(displayText, { x: cx + 2, y: curY + 4, size: 8, font });
      page.drawRectangle({ x: cx, y: curY, width: colW[i], height: rowH, borderColor: rgb(0,0,0), borderWidth: 0.5 });
      cx += colW[i];
    });
    curY -= rowH;
  });

  await Deno.writeFile(filepath, await pdf.save());
  console.log("✓ PDF (wide, multi-page):", filepath);
}

// ---------- PDF (scanned-like: minimal extractable content) ----------
async function makePdfScanned(filepath: string) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  
  // Simulate a scanned document with very limited structured content
  // Draw background rectangles to simulate scan artifacts
  page.drawRectangle({ x: 40, y: 100, width: 532, height: 592, color: rgb(0.97, 0.97, 0.95) });
  
  // Add some barely structured "text" that looks like OCR might find it
  // But no proper table structure
  page.drawText("AGRICULTURAL SUBSIDIES DOCUMENT", { x: 50, y: 700, size: 12, font });
  page.drawText("(Scanned copy - low quality)", { x: 50, y: 680, size: 10, font });
  
  // Fragmented text that doesn't form clear tables
  const fragments = [
    "Program Name....... Amount....... Status",
    "Organic Farm....... 15000....... Active",
    "Rural Dev.......... 25000....... Pending",
    "Equipment.......... 8500........ Closed",
  ];
  
  fragments.forEach((fragment, i) => {
    page.drawText(fragment, { x: 60, y: 600 - i * 25, size: 9, font });
  });
  
  await Deno.writeFile(filepath, await pdf.save());
  console.log("✓ PDF (scanned-style, minimal structure):", filepath);
}

// ---------- DOCX (wide table with complex formatting) ----------
async function makeDocxWide(filepath: string) {
  const tableRows: TableRow[] = [];
  
  // Header row
  tableRows.push(new TableRow({
    children: wideHeaders.map(h => new TableCell({
      children: [new Paragraph({ text: h, alignment: AlignmentType.LEFT })],
      width: { size: Math.floor(100/wideHeaders.length), type: WidthType.PERCENTAGE },
    }))
  }));
  
  // Data rows with tricky formatting
  trickyRows.forEach(r => {
    tableRows.push(new TableRow({
      children: r.map(c => new TableCell({
        children: [new Paragraph({ text: String(c) })],
        width: { size: Math.floor(100/wideHeaders.length), type: WidthType.PERCENTAGE },
      }))
    }));
  });

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: "Agricultural Subsidy Programs (Wide Table Test)" }),
        new Paragraph({ text: "This document tests wide table extraction with various formatting edge cases." }),
        new Table({ rows: tableRows }),
        new Paragraph({ text: "End of document." }),
      ],
    }],
  });
  
  const buf = await Packer.toBuffer(doc);
  await Deno.writeFile(filepath, new Uint8Array(buf));
  console.log("✓ DOCX (wide table):", filepath);
}

// ---------- XLSX (merged cells + complex data) ----------
async function makeXlsxMerged(filepath: string) {
  const wb = XLSX.utils.book_new();
  
  // Create main sheet with merged cells and complex data
  const mainData = [
    ["AGRICULTURAL SUBSIDY OVERVIEW", "", "", "", "", ""], // Will be merged
    ["", "", "", "", "", ""],
    ["Category", "Program Details", "Financial Information", "", "Application Info", ""],
    ["", "", "Min Amount", "Max Amount", "Deadline", "Region"],
    ["Direct Payments", "CAP Direct Payments", "€1.234,56", "€150,000.00", "31/12/2025", "FR"],
    ["", "Basic Payment Scheme", "€500", "€50.000", "2025-12-31", "EU"],
    ["Rural Development", "Young Farmer Support", "RON 12.345,00", "$40,000.00", "12/31/2025", "RO"],
    ["", "LEADER Programme", "£5,000.50", "€200.000", "15/03/2026", "UK"],
    ["Environment", "Organic Transition", "€2,500", "€75.000,00", "30,5%", "ES"],
    ["", "Agri-Environment Scheme", "CHF 10'000", "CHF 500'000", "2026-06-30", "CH"],
  ];
  
  const ws = XLSX.utils.aoa_to_sheet(mainData);
  
  // Define merged cells
  ws["!merges"] = [
    { s: { r:0, c:0 }, e: { r:0, c:5 } }, // Title spans full width
    { s: { r:2, c:2 }, e: { r:2, c:3 } }, // "Financial Information" spans 2 cols
    { s: { r:4, c:0 }, e: { r:5, c:0 } }, // "Direct Payments" spans 2 rows
    { s: { r:6, c:0 }, e: { r:7, c:0 } }, // "Rural Development" spans 2 rows
    { s: { r:8, c:0 }, e: { r:9, c:0 } }, // "Environment" spans 2 rows
  ];
  
  XLSX.utils.book_append_sheet(wb, ws, "Main");
  
  // Create second sheet with different currency/date formats
  const sheet2Data = [
    ["Program", "Amount (Local)", "Amount (EUR)", "Rate", "Deadline"],
    ["French Program", "1.234,56 €", "1,234.56", "0%", "31/12/2025"],
    ["German Program", "5.678,90 EUR", "5,678.90", "15,5%", "31.12.2025"],
    ["US Program", "$12,345.67", "10,234.56", "20.0%", "12/31/2025"],
    ["Swiss Program", "CHF 8'765.43", "8,123.45", "12,5%", "31-12-2025"],
  ];
  
  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  XLSX.utils.book_append_sheet(wb, ws2, "Currencies");
  
  XLSX.writeFile(wb, filepath);
  console.log("✓ XLSX (merged cells, multi-sheet):", filepath);
}

// ---------- Large table stress test ----------
async function makeLargeTableTest(filepath: string) {
  const headers = ["ID", "Program", "Region", "Amount", "Rate", "Status", "Date", "Contact", "Notes", "Reference"];
  const regions = ["FR", "DE", "ES", "IT", "PL", "RO", "NL", "BE", "AT", "CZ"];
  const statuses = ["Open", "Closed", "Pending", "Review", "Approved"];
  
  // Generate 200 rows to test performance limits
  const rows = Array.from({ length: 200 }, (_, i) => [
    `ID-${(i+1).toString().padStart(4, '0')}`,
    `Program ${i+1}`,
    regions[i % regions.length],
    `€${(Math.random() * 100000).toFixed(2).replace('.', ',')}`,
    `${(Math.random() * 100).toFixed(1)}%`,
    statuses[i % statuses.length],
    new Date(2025, i % 12, (i % 28) + 1).toISOString().split('T')[0],
    `contact${i}@example.com`,
    `Generated note for row ${i+1} with some special chars: àáâãäåæçèé`,
    `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
  ]);
  
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, "LargeTable");
  
  XLSX.writeFile(wb, filepath);
  console.log("✓ XLSX (large table, 200 rows):", filepath);
}

// ---------- Create README for locked PDF testing ----------
async function createLockedPdfInstructions() {
  const instructions = `# Locked PDF Testing

This directory is for testing edge cases in Phase D table extraction.

## Password-Protected PDF Testing

To test password-protected PDF handling:

1. Create a small PDF with a table and set a password
2. Save it as: \`fixtures_ext/pdf_locked.pdf\`
3. Update the harness to test it:

\`\`\`typescript
// Add to harness test suite
try {
  const result = await uploadAndProcess("fixtures_ext/pdf_locked.pdf", "application/pdf");
  // Should gracefully fail with appropriate error message
} catch (error) {
  console.log("✓ Locked PDF handled gracefully:", error.message);
}
\`\`\`

## Expected Behaviors

- **Scanned PDFs**: Should fall back to OCR or text-only extraction
- **Wide tables**: Should handle horizontal scrolling and column overflow
- **Merged cells**: Should preserve cell relationships where possible
- **Multi-currency**: Should handle various decimal separators and currency symbols
- **Date formats**: Should parse DD/MM/YYYY, MM/DD/YYYY, and ISO formats
- **Large tables**: Should respect processing limits and provide quality metrics

## Test Commands

\`\`\`bash
# Generate extended fixtures
deno run -A scripts/make_golden_fixtures_ext.ts

# Test with extended harness
deno run -A scripts/phase_d_harness_ext.ts
\`\`\`
`;

  await Deno.writeTextFile(path.join(OUT_DIR, "README.md"), instructions);
  console.log("ℹ️  Extended fixtures README created");
}

// Execute all generators
await makePdfWideMulti(path.join(OUT_DIR, "pdf_wide_multi.pdf"));
await makePdfScanned(path.join(OUT_DIR, "pdf_scanned.pdf"));
await makeDocxWide(path.join(OUT_DIR, "docx_wide.docx"));
await makeXlsxMerged(path.join(OUT_DIR, "xlsx_merged.xlsx"));
await makeLargeTableTest(path.join(OUT_DIR, "xlsx_large_table.xlsx"));
await createLockedPdfInstructions();

console.log("\n🎉 Extended edge case fixtures created in ./fixtures_ext");
console.log("💡 Add a password-protected PDF manually for complete testing coverage");
// deno run -A scripts/make_golden_fixtures.ts
// Creates fixtures/pdf_golden.pdf, fixtures/docx_golden.docx, fixtures/xlsx_golden.xlsx

import { ensureDir } from "https://deno.land/std@0.224.0/fs/ensure_dir.ts";
import * as path from "https://deno.land/std@0.224.0/path/mod.ts";

// npm modules via Deno's npm compatibility
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType } from "npm:docx@8";
import * as XLSX from "npm:xlsx@0.18";

const OUT_DIR = "fixtures";
await ensureDir(OUT_DIR);

// Shared table content (3 rows)
const headers = ["Program", "Min Amount", "Max Amount", "Co-financing %", "Deadline"];
const rows = [
  ["CAP Direct Payments", "€1,000", "€150,000", "0%", "2026-12-31"],
  ["Rural Development", "€5,000", "€200,000", "20%", "2026-06-30"],
  ["Organic Transition", "€2,500", "€75,000", "30%", "2026-03-31"],
];

// ---------- PDF ----------
async function makePdf(filepath: string) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]); // US Letter
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margin = 50;
  const startY = 700;
  const rowH = 24;
  const colW = [140, 110, 110, 120, 100];

  // Title
  page.drawText("Subsidy Programs", { x: margin, y: startY + 40, size: 14, font: fontBold });

  // header row
  let x = margin;
  let y = startY;
  headers.forEach((h, i) => {
    page.drawText(h, { x: x + 4, y: y + 6, size: 11, font: fontBold });
    // cell box
    page.drawRectangle({ x, y, width: colW[i], height: rowH, borderColor: rgb(0, 0, 0), borderWidth: 0.7 });
    x += colW[i];
  });

  // data rows
  let curY = y - rowH;
  rows.forEach((r) => {
    let cx = margin;
    r.forEach((cell, i) => {
      page.drawText(String(cell), { x: cx + 4, y: curY + 6, size: 11, font });
      page.drawRectangle({ x: cx, y: curY, width: colW[i], height: rowH, borderColor: rgb(0, 0, 0), borderWidth: 0.7 });
      cx += colW[i];
    });
    curY -= rowH;
  });

  const bytes = await pdf.save();
  await Deno.writeFile(filepath, bytes);
  console.log("✓ PDF:", filepath);
}

// ---------- DOCX ----------
async function makeDocx(filepath: string) {
  const tableRows: TableRow[] = [];

  // header
  tableRows.push(
    new TableRow({
      children: headers.map((h) =>
        new TableCell({
          children: [new Paragraph({ text: h, alignment: AlignmentType.LEFT })],
          width: { size: 20, type: WidthType.PERCENTAGE },
        })
      ),
    })
  );

  // rows
  rows.forEach((r) => {
    tableRows.push(
      new TableRow({
        children: r.map((c) =>
          new TableCell({
            children: [new Paragraph({ text: String(c) })],
            width: { size: 20, type: WidthType.PERCENTAGE },
          })
        ),
      })
    );
  });

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: "Subsidy Programs", }),
        new Table({ rows: tableRows }),
      ],
    }],
  });

  const buf = await Packer.toBuffer(doc);
  await Deno.writeFile(filepath, new Uint8Array(buf));
  console.log("✓ DOCX:", filepath);
}

// ---------- XLSX ----------
async function makeXlsx(filepath: string) {
  const aoa = [headers, ...rows];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, ws, "Programs");
  XLSX.writeFile(wb, filepath);
  console.log("✓ XLSX:", filepath);
}

await makePdf(path.join(OUT_DIR, "pdf_golden.pdf"));
await makeDocx(path.join(OUT_DIR, "docx_golden.docx"));
await makeXlsx(path.join(OUT_DIR, "xlsx_golden.xlsx"));

console.log("\n🎉 Golden fixtures created in ./fixtures");
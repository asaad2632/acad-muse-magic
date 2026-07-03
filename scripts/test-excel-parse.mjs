// Programmatic verification of parseLibraryExcel against the finalized workbook.
// Not a unit test; a one-shot check invoked via `node scripts/test-excel-parse.mjs`.

import fs from "node:fs";
import { parseLibraryExcel } from "../src/lib/excelImport.js";

const path = "/tmp/test.xlsx";
const buf = fs.readFileSync(path);

// Minimal File-like object matching what the browser passes to parseLibraryExcel:
// only `.arrayBuffer()` is used.
const fakeFile = {
  name: "test.xlsx",
  arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
};

// Emulate the caller's `chapters` shape (id + titleAr + sections[]).
const chapters = [
  { id: 1, titleAr: "الفصل الأول", sections: [] },
  { id: 2, titleAr: "الفصل الثاني", sections: [] },
  { id: 3, titleAr: "الفصل الثالث", sections: [] },
  { id: 4, titleAr: "الفصل الرابع", sections: [] },
];

const parsed = await parseLibraryExcel(fakeFile, { chapters });
console.log("Sheets:", parsed.dataSheets.length, "| Skipped:", parsed.skippedSheets.length, "| Sheet errors:", parsed.sheetErrors.length, "| Row errors:", parsed.rowErrors.length);
console.log("Totals:", parsed.totals);

// Roll-up per chapterIdFromRow
const perChapter = {};
let noTitle = 0;
let noRef = 0;
for (const s of parsed.dataSheets) {
  for (const r of s.rows) {
    const k = r.chapterIdFromRow ?? "null";
    perChapter[k] = (perChapter[k] || 0) + 1;
    if (!r.title) noTitle += 1;
    if (!r.archiveRef) noRef += 1;
  }
}
console.log("Per chapterIdFromRow:", perChapter);
console.log("Rows with empty title (should be 0):", noTitle);
console.log("Rows with empty archiveRef (allowed):", noRef);

// Simulate the App.jsx dedup pass against an empty library.
// Contract: dedup ONLY against existingRefs (the pre-import snapshot).
// We do NOT add row.archiveRef into existingRefs during import — so intra-
// file archiveRef collisions do not silently drop rows.
const existingRefs = new Set(); // empty library
let imported = 0;
let skippedDup = 0;
for (const s of parsed.dataSheets) {
  for (const r of s.rows) {
    if (r.archiveRef && existingRefs.has(r.archiveRef)) {
      skippedDup += 1;
      continue;
    }
    imported += 1;
  }
}
console.log("Simulated import (empty library): imported =", imported, "| skippedDup =", skippedDup);

// Second pass: simulate re-uploading the same file over an already-populated
// library. Every non-empty-ref row that already exists should be skipped.
const populated = new Set();
for (const s of parsed.dataSheets) for (const r of s.rows) if (r.archiveRef) populated.add(r.archiveRef);
let imported2 = 0, skipped2 = 0;
for (const s of parsed.dataSheets) {
  for (const r of s.rows) {
    if (r.archiveRef && populated.has(r.archiveRef)) { skipped2 += 1; continue; }
    imported2 += 1;
  }
}
console.log("Simulated re-upload (already populated): imported =", imported2, "(should equal empty-ref count = 28) | skipped =", skipped2);

// Also check dedup of empty-archiveRef pairs: must NOT collapse
const emptyRefRows = [];
for (const s of parsed.dataSheets) for (const r of s.rows) if (!r.archiveRef) emptyRefRows.push(r.title);
console.log("Distinct empty-ref rows:", emptyRefRows.length, "(all should be imported, none deduped)");

// Final check
if (imported === 143) {
  console.log("\n✅ PASS: imported count = 143 as expected");
} else {
  console.log(`\n❌ FAIL: imported count = ${imported}, expected 143`);
  process.exit(1);
}

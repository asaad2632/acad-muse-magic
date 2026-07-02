// End-to-end simulation of handleLibExcelImport including dedup.
// Runs the parser then reproduces the exact insert/skip loop from App.jsx.
import * as XLSX from "xlsx";
import { parseLibraryExcel, buildNotesWithRef, extractRefFromNotes } from "../src/lib/excelImport.js";

const chapters = [
  { id: 2, titleAr: "الفصل الثاني: النفوذ البريطاني في الخليج", sections: [
    { id: "2-1", title: "معاهدات الحماية" },
    { id: "2-2", title: "دور المقيم السياسي في بوشهر" },
    { id: "2-3", title: "قواعد الأسطول البريطاني" },
  ]},
  { id: 3, titleAr: "الفصل الثالث: العراق والخليج خلال الحرب", sections: [
    { id: "3-1", title: "ميناء البصرة كمعبر للإمدادات" },
  ]},
];

function makeWorkbook() {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["دليل الاستخدام"], ["اقرأ قبل الاستيراد"]]), "دليل الاستخدام");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["م","عنوان الملف","المرجع الأرشيفي","المبحث في خطتك","العنصر الفرعي","الأولوية","نوع الوثيقة","جديد؟","الحالة","الأوراق المفيدة","ملاحظات"],
    [1,"تقرير المقيم السياسي في بوشهر 1941","IOR/L/PS/12/3720","دور المقيم السياسي في بوشهر","","★★★","تقرير","نعم","متاح","ص1-45",""],
    [2,"مراسلات قواعد الأسطول","IOR/R/15/1/456","قواعد الأسطول البريطاني","","★★","مراسلات","لا","متاح","","يشمل البحرين"],
  ]), "الفصل الثاني");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["م","عنوان الملف","المرجع الأرشيفي","المبحث في خطتك","العنصر الفرعي","الأولوية","نوع الوثيقة","جديد؟","الحالة","الأوراق المفيدة","ملاحظات"],
    [1,"إحصائيات البصرة 1942","IOR/L/PS/12/9999","ميناء البصرة كمعبر للإمدادات","","★★★","إحصائيات","نعم","متاح","",""],
  ]), "الفصل الثالث");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

async function main() {
  const buf = makeWorkbook();
  const fileFactory = () => ({
    name: "test-thesis-sources.xlsx",
    arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  });

  // ---- Pass 1: empty library ----
  const library1 = [];
  const result1 = await simulateImport(fileFactory(), library1);
  console.log("========== PASS 1: empty library ==========");
  console.log(result1.summary);
  console.log("Library size after:", result1.newLibrary.length);

  // ---- Pass 2: same file, library already has 2 of the 3 refs ----
  //     (simulates the user re-uploading — dedup must skip 2, import 1)
  const library2 = result1.newLibrary.slice(0, 2); // pretend 2 rows persisted
  const result2 = await simulateImport(fileFactory(), library2);
  console.log("\n========== PASS 2: re-import with 2 refs already present ==========");
  console.log(result2.summary);
  console.log("Library size after:", result2.newLibrary.length);

  // ---- Pass 3: library has ALL 3 refs — everything should be skipped ----
  const library3 = result1.newLibrary;
  const result3 = await simulateImport(fileFactory(), library3);
  console.log("\n========== PASS 3: re-import when all refs already present ==========");
  console.log(result3.summary);
  console.log("Library size after:", result3.newLibrary.length);

  // ---- Assertions ----
  const fail = [];
  const ok = (cond, name) => { console.log((cond ? "  PASS " : "  FAIL ") + name); if (!cond) fail.push(name); };
  console.log("\n=== FINAL ASSERTIONS ===");
  ok(result1.importedCount === 3 && result1.skippedDup === 0, "Pass 1: 3 imported, 0 duplicates");
  ok(result2.importedCount === 1 && result2.skippedDup === 2, "Pass 2: 1 imported, 2 duplicates skipped");
  ok(result3.importedCount === 0 && result3.skippedDup === 3, "Pass 3: 0 imported, 3 duplicates skipped");

  // Row shape check
  const first = result1.toInsert[0];
  ok(first.title === "تقرير المقيم السياسي في بوشهر 1941", "row.title populated from column");
  ok(first.priority === "★★★", "row.priority string preserved");
  ok(first.chapterId === 2, "row.chapterId matched from sheet name");
  ok(first.sectionId === "2-2", "row.sectionId matched from column text");
  ok(first.fileName.startsWith("https://www.qdl.qa/"), "row.fileName holds QDL url for IOR ref");
  ok(first.fileType === "url", "row.fileType='url' when QDL synthesized");
  ok(extractRefFromNotes(first.notes) === "IOR/L/PS/12/3720", "row.notes embeds archive ref for dedup");
  ok(first.status === "تم الاستيراد ✅", "row.status set to imported");

  console.log(`\nResult: ${fail.length === 0 ? "ALL PASSED ✅" : "FAILED: " + fail.length}`);
  process.exit(fail.length === 0 ? 0 : 1);
}

// Reproduces exactly what handleLibExcelImport does (minus the React state/network calls).
async function simulateImport(file, library) {
  const parsed = await parseLibraryExcel(file, { chapters });
  const existingRefs = new Set();
  for (const src of library) {
    const ref = extractRefFromNotes(src.notes);
    if (ref) existingRefs.add(ref);
  }

  let importedCount = 0, skippedDup = 0, errorCount = 0;
  const perChapter = {};
  const toInsert = [];

  for (const sheet of parsed.dataSheets) {
    const chKey = sheet.chapterTitle || sheet.sheetName;
    if (!perChapter[chKey]) perChapter[chKey] = { imported: 0, skipped: 0, errors: 0 };
    for (const row of sheet.rows) {
      if (row.archiveRef && existingRefs.has(row.archiveRef)) {
        skippedDup += 1; perChapter[chKey].skipped += 1; continue;
      }
      const displayName = row.url || row.archiveRef || row.title || "excel-row";
      const src = {
        id: Date.now() + Math.random(),
        fileName: displayName,
        fileType: row.url ? "url" : "excel",
        uploadDate: new Date().toLocaleDateString("ar-IQ"),
        status: "تم الاستيراد ✅",
        analyzed: true,
        title: row.title || row.archiveRef || "(بدون عنوان)",
        sourceType: row.sourceType || "",
        chapterId: sheet.chapterId,
        sectionId: row.sectionIdMatched || "",
        priority: row.priorityStars,
        importantPages: row.importantPages || "",
        notes: buildNotesWithRef(row.archiveRef, row.notes),
      };
      toInsert.push(src);
      if (row.archiveRef) existingRefs.add(row.archiveRef);
      importedCount += 1; perChapter[chKey].imported += 1;
    }
  }

  const chapterLines = Object.entries(perChapter)
    .map(([name, c]) => `   • ${name}: مستورد ${c.imported}${c.skipped ? ` — متجاهل (مكرر) ${c.skipped}` : ""}${c.errors ? ` — أخطاء ${c.errors}` : ""}`)
    .join("\n");
  const skippedSheetsLine = parsed.skippedSheets.length
    ? `\nأوراق تم تخطيها: ${parsed.skippedSheets.map(s => s.sheetName).join("، ")}`
    : "";
  const summary =
    `✅ اكتمل الاستيراد من ${file.name}\n` +
    `عدد الوثائق المستوردة: ${importedCount}\n` +
    `عدد التي تم تجاهلها (مكررة): ${skippedDup}\n` +
    `عدد الأخطاء: ${errorCount}${chapterLines ? "\n\nتوزيع حسب الفصل:\n" + chapterLines : ""}${skippedSheetsLine}`;

  return { importedCount, skippedDup, errorCount, perChapter, toInsert, summary, newLibrary: [...toInsert, ...library] };
}

main().catch(e => { console.error(e); process.exit(1); });

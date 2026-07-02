// Standalone parser test — synthesizes a workbook matching the real file
// structure the user described, feeds it to parseLibraryExcel, prints a report.
import * as XLSX from "xlsx";
import { parseLibraryExcel, qdlUrlForRef, buildNotesWithRef, extractRefFromNotes } from "../src/lib/excelImport.js";
import fs from "fs";

// Simulated live `chapters` state (same shape App.jsx uses).
const chapters = [
  { id: 1, titleAr: "الفصل الأول: الأهمية الاستراتيجية للخليج العربي", sections: [
    { id: "1-1", title: "الموقع الجغرافي والممرات المائية" },
    { id: "1-2", title: "الثروة النفطية" },
  ]},
  { id: 2, titleAr: "الفصل الثاني: النفوذ البريطاني في الخليج", sections: [
    { id: "2-1", title: "معاهدات الحماية" },
    { id: "2-2", title: "دور المقيم السياسي في بوشهر" },
    { id: "2-3", title: "قواعد الأسطول البريطاني" },
  ]},
  { id: 3, titleAr: "الفصل الثالث: العراق والخليج خلال الحرب", sections: [
    { id: "3-1", title: "ميناء البصرة كمعبر للإمدادات" },
    { id: "3-2", title: "حقول النفط في كركوك" },
  ]},
  { id: 4, titleAr: "الفصل الرابع: الدور الأمريكي المتنامي", sections: [
    { id: "4-1", title: "امتيازات النفط في السعودية" },
  ]},
];

function buildTestWorkbook() {
  const wb = XLSX.utils.book_new();

  // ---- Instructional sheet 1 (should be SKIPPED) ----
  const guide = XLSX.utils.aoa_to_sheet([
    ["دليل الاستخدام"],
    ["هذا الملف يحتوي على مصادر أرشيفية مرتبة حسب فصول الأطروحة."],
    ["كل ورقة تمثل فصلاً واحداً."],
    [""],
    ["ملاحظة: راجع الأولويات قبل الاستيراد."],
  ]);
  XLSX.utils.book_append_sheet(wb, guide, "دليل الاستخدام");

  // ---- Instructional sheet 2 (should be SKIPPED) ----
  const otherSeries = XLSX.utils.aoa_to_sheet([
    ["سلاسل أخرى مكتشفة"],
    ["FO 371", "أرشيف وزارة الخارجية"],
    ["CO 732", "أرشيف وزارة المستعمرات"],
  ]);
  XLSX.utils.book_append_sheet(wb, otherSeries, "سلاسل أخرى مكتشفة");

  // ---- Data sheet: الفصل الثاني ----
  const ch2 = XLSX.utils.aoa_to_sheet([
    ["م","عنوان الملف","المرجع الأرشيفي","المبحث في خطتك","العنصر الفرعي","الأولوية","نوع الوثيقة","جديد؟","الحالة","الأوراق المفيدة","ملاحظات"],
    [1,"تقرير المقيم السياسي في بوشهر 1941","IOR/L/PS/12/3720","دور المقيم السياسي في بوشهر","","★★★","تقرير رسمي","نعم","متاح","ص12-45","تقرير مهم عن التحركات المحورية"],
    [2,"مراسلات حول قواعد الأسطول","IOR/R/15/1/456","قواعد الأسطول البريطاني","","★★","مراسلات","لا","متاح","ص1-30","يشمل قاعدة البحرين"],
    [3,"معاهدة الحماية مع الكويت 1899","FO 371/12345","معاهدات الحماية","","★","نص معاهدة","لا","متاح","","تم استخدامه سابقاً"],
    [4,"","","","","","","","","",""], // fully empty row — should be skipped
  ]);
  XLSX.utils.book_append_sheet(wb, ch2, "الفصل الثاني");

  // ---- Data sheet: الفصل الثالث ----
  const ch3 = XLSX.utils.aoa_to_sheet([
    ["م","عنوان الملف","المرجع الأرشيفي","المبحث في خطتك","العنصر الفرعي","الأولوية","نوع الوثيقة","جديد؟","الحالة","الأوراق المفيدة","ملاحظات"],
    [1,"إحصائيات ميناء البصرة 1942","IOR/L/PS/12/9999","ميناء البصرة كمعبر للإمدادات","","★★★","إحصائيات","نعم","متاح","ص50-100",""],
    [2,"تقرير عن حقول كركوك","IOR/L/PS/12/8888","حقول النفط في كركوك","","★★","تقرير","نعم","متاح","","تفاصيل إنتاج"],
  ]);
  XLSX.utils.book_append_sheet(wb, ch3, "الفصل الثالث");

  // ---- Instructional sheet 3 (should be SKIPPED) ----
  const dist = XLSX.utils.aoa_to_sheet([
    ["توزيع المباحث"],
    ["الفصل الأول", "12 وثيقة"],
    ["الفصل الثاني", "45 وثيقة"],
    ["الفصل الثالث", "23 وثيقة"],
  ]);
  XLSX.utils.book_append_sheet(wb, dist, "توزيع المباحث");

  return wb;
}

async function main() {
  const wb = buildTestWorkbook();
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  // parseLibraryExcel expects a File-like object with arrayBuffer(). Fake one.
  const fakeFile = {
    arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  };

  const result = await parseLibraryExcel(fakeFile, { chapters });
  console.log("=== SKIPPED SHEETS ===");
  console.log(JSON.stringify(result.skippedSheets, null, 2));
  console.log("\n=== DATA SHEETS ===");
  for (const s of result.dataSheets) {
    console.log(`\n  Sheet: "${s.sheetName}"  →  chapterId=${s.chapterId}  chapterTitle="${s.chapterTitle}"  rowCount=${s.rows.length}`);
    for (const r of s.rows) {
      console.log(`    - [${r.rowIndex}] title="${r.title}" ref="${r.archiveRef}" priorityStars=${r.priorityStars} numeric=${r.priorityNumeric} sectionId=${r.sectionIdMatched} sectionTitleMatched="${r.sectionTitleMatched}" url="${r.url || '(none)'}"`);
    }
  }
  console.log("\n=== TOTALS ===");
  console.log(JSON.stringify(result.totals, null, 2));

  // ---- Assertions -----
  const fail = [];
  const ok = (cond, name) => { console.log((cond ? "  PASS " : "  FAIL ") + name); if (!cond) fail.push(name); };

  console.log("\n=== ASSERTIONS ===");
  ok(result.skippedSheets.length === 3, "3 instructional sheets skipped");
  ok(result.skippedSheets.some(s => s.sheetName === "دليل الاستخدام"), "دليل الاستخدام skipped");
  ok(result.skippedSheets.some(s => s.sheetName === "سلاسل أخرى مكتشفة"), "سلاسل أخرى مكتشفة skipped");
  ok(result.skippedSheets.some(s => s.sheetName === "توزيع المباحث"), "توزيع المباحث skipped");
  ok(result.dataSheets.length === 2, "2 data sheets recognised");
  const ch2parsed = result.dataSheets.find(s => s.sheetName === "الفصل الثاني");
  const ch3parsed = result.dataSheets.find(s => s.sheetName === "الفصل الثالث");
  ok(!!ch2parsed && ch2parsed.chapterId === 2, "الفصل الثاني → chapterId=2");
  ok(!!ch3parsed && ch3parsed.chapterId === 3, "الفصل الثالث → chapterId=3");
  ok(ch2parsed && ch2parsed.rows.length === 3, "ch2 has 3 rows (empty row filtered)");
  ok(ch3parsed && ch3parsed.rows.length === 2, "ch3 has 2 rows");
  // Row-level checks
  const row1 = ch2parsed.rows[0];
  ok(row1.title === "تقرير المقيم السياسي في بوشهر 1941", "row1 title parsed");
  ok(row1.archiveRef === "IOR/L/PS/12/3720", "row1 archiveRef parsed");
  ok(row1.priorityStars === "★★★" && row1.priorityNumeric === 3, "row1 priority ★★★→3");
  ok(row1.sectionIdMatched === "2-2", `row1 section matched to 2-2 (got ${row1.sectionIdMatched})`);
  ok(row1.url === "https://www.qdl.qa/en/search#q=IOR%2FL%2FPS%2F12%2F3720&start=0", `row1 QDL url synthesized (got ${row1.url})`);
  const row3 = ch2parsed.rows[2];
  ok(row3.archiveRef === "FO 371/12345", "row3 non-IOR ref preserved");
  ok(row3.url === null, "row3 (FO 371) → no QDL url");
  // Notes tagging
  const notes = buildNotesWithRef("IOR/L/PS/12/3720", "hello notes");
  ok(notes.includes("المرجع الأرشيفي: IOR/L/PS/12/3720"), "buildNotesWithRef embeds ref");
  ok(extractRefFromNotes(notes) === "IOR/L/PS/12/3720", "extractRefFromNotes round-trips");

  console.log(`\nResult: ${fail.length === 0 ? "ALL PASSED ✅" : "FAILED: " + fail.length}`);
  process.exit(fail.length === 0 ? 0 : 1);
}
main().catch(e => { console.error(e); process.exit(1); });

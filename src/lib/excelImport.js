// Bulk-import parser for library-sources Excel files.
//
// Contract with the caller:
//   parseLibraryExcel(file, { chapters }) -> {
//     dataSheets: [{ sheetName, chapterId | null, chapterTitle | null,
//                    rows: [{ title, archiveRef, sectionText, subElement,
//                             priorityStars, priorityNumeric, sourceType,
//                             isNew, status, importantPages, notes,
//                             url, sectionIdMatched, sectionTitleMatched }] }],
//     skippedSheets: [{ sheetName, reason }],
//     sheetErrors:   [{ sheetName, reason }],      // sheets that threw during parse
//     rowErrors:     [{ sheetName, rowIndex, reason }],
//     totals: { dataSheetCount, rowCount, scannedRowCount, sheetCount }
//   }
//
// Design notes:
//   - Never hard-coded to a specific workbook; header detection is by content
//     match (a sheet is treated as data iff any row within the first 15 rows
//     has EITHER a title-alias header OR an archive-ref-alias header — plus at
//     least one additional recognized column). Instructional/summary sheets
//     are skipped with a reason.
//   - Column order is discovered from the header row, so future files that add
//     or reorder columns still work.
//   - Every sheet is processed independently inside its own try/catch. A single
//     failing sheet or a single failing row never aborts the whole import.
//   - Chapter matching: parse Arabic ordinal from sheet name → numeric → look
//     up in the caller-provided `chapters` array. Falls back to substring.
//   - Section matching: three-tier (deterministic "م<N>" → substring → token
//     overlap) against `chapter.sections[].title`.
//   - QDL fallback URL: only for archiveRef starting with "IOR/".

import * as XLSX from "xlsx";

// ---- constants -------------------------------------------------------------
const HEADER_ALIASES = {
  serial:         ["م", "#", "الرقم"],
  chapter:        ["الفصل", "رقم الفصل"],
  title:          ["عنوان الملف", "العنوان", "اسم الملف", "عنوان المصدر", "عنوان الوثيقة"],
  archiveRef:     ["المرجع الأرشيفي", "المرجع", "الرقم الأرشيفي", "رقم الوثيقة", "رقم الوثيقة الأرشيفية"],
  sectionText:    ["المبحث في خطتك", "المبحث", "الفرع", "المبحث في الخطة"],
  subElement:     ["العنصر الفرعي", "الفقرة", "المطلب", "العنصر"],
  priority:       ["الأولوية", "الأهمية"],
  sourceType:     ["نوع الوثيقة", "نوع المصدر", "النوع", "التصنيف"],
  isNew:          ["جديد؟", "جديد"],
  status:         ["الحالة"],
  importantPages: ["الأوراق المفيدة", "الصفحات المفيدة", "الأوراق", "الصفحات"],
  notes:          ["ملاحظات", "الملاحظات"],
};

// Arabic ordinal → number (extend as chapters grow — safe defaults up to 10).
const AR_ORDINALS = {
  "الأول": 1, "الاول": 1, "الأولى": 1, "الاولى": 1,
  "الثاني": 2, "الثانية": 2,
  "الثالث": 3, "الثالثة": 3,
  "الرابع": 4, "الرابعة": 4,
  "الخامس": 5, "الخامسة": 5,
  "السادس": 6, "السادسة": 6,
  "السابع": 7, "السابعة": 7,
  "الثامن": 8, "الثامنة": 8,
  "التاسع": 9, "التاسعة": 9,
  "العاشر": 10, "العاشرة": 10,
};

const HEADER_SCAN_LIMIT = 15; // rows to scan for the header row per sheet

// ---- helpers ---------------------------------------------------------------
const clean = (v) => (v == null ? "" : String(v).replace(/\s+/g, " ").trim());

// Normalize an Arabic string for loose matching (strip diacritics, unify alef, ya).
function normalizeAr(s) {
  return clean(s)
    .replace(/[\u064B-\u0652\u0670]/g, "")   // tashkeel
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[«»"'،.؛:؟]/g, "")
    .toLowerCase();
}

// Try to identify a field name from a header cell using alias matching.
// Two-pass strategy so single-character aliases (e.g. "م" for serial, "#")
// don't spuriously match inside longer Arabic headers ("الملف", "المبحث").
//   Pass 1: exact equality with any alias — highest confidence.
//   Pass 2: substring match, BUT only when the alias is ≥ 3 characters, so
//           short noise-aliases never win over real headers.
function fieldOfCell(cellNorm) {
  if (!cellNorm) return null;
  // Pass 1: exact.
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    for (const a of aliases) {
      const an = normalizeAr(a);
      if (an && cellNorm === an) return field;
    }
  }
  // Pass 2: substring (only for aliases ≥ 3 chars). Longest alias wins so a
  // more specific header ("عنوان الملف") beats a subset ("العنوان").
  let bestField = null;
  let bestLen = 0;
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    for (const a of aliases) {
      const an = normalizeAr(a);
      if (!an || an.length < 3) continue;
      if (cellNorm.includes(an) || an.includes(cellNorm)) {
        if (an.length > bestLen) {
          bestLen = an.length;
          bestField = field;
        }
      }
    }
  }
  return bestField;
}

// Locate the header row in a sheet-of-arrays. Scans first HEADER_SCAN_LIMIT
// rows. A row qualifies as a header row iff it contains EITHER a title-alias
// OR an archive-ref-alias, PLUS at least one other recognized column (to
// avoid mistaking a single-cell title row for a header).
// Returns { rowIndex, columnMap } or null.
function detectHeaderRow(rows) {
  const scanLimit = Math.min(rows.length, HEADER_SCAN_LIMIT);
  for (let r = 0; r < scanLimit; r++) {
    const cells = (rows[r] || []).map(clean);
    if (!cells.length) continue;
    const cellsNorm = cells.map(normalizeAr);

    // Build a column map: field -> column index
    const columnMap = {};
    for (let c = 0; c < cellsNorm.length; c++) {
      const f = fieldOfCell(cellsNorm[c]);
      if (f && columnMap[f] == null) columnMap[f] = c;
    }
    const hasTitleOrRef = columnMap.title != null || columnMap.archiveRef != null;
    const otherCount = Object.keys(columnMap).filter(
      (k) => k !== "title" && k !== "archiveRef"
    ).length;
    if (hasTitleOrRef && otherCount >= 1) {
      return { rowIndex: r, columnMap };
    }
  }
  return null;
}

// Match a sheet name like "الفصل الثاني" → chapter id 2 from the live chapters array.
function matchChapter(sheetName, chapters = []) {
  const name = clean(sheetName);
  const nameNorm = normalizeAr(name);

  // 1. Arabic ordinal
  const ordMatch = Object.keys(AR_ORDINALS).find((ord) => nameNorm.includes(normalizeAr(ord)));
  if (ordMatch) {
    const n = AR_ORDINALS[ordMatch];
    const hit = chapters.find((c) => Number(c.id) === n);
    if (hit) return { chapterId: hit.id, chapterTitle: hit.titleAr };
  }

  // 2. Latin digit
  const digitMatch = name.match(/\d+/);
  if (digitMatch) {
    const n = Number(digitMatch[0]);
    const hit = chapters.find((c) => Number(c.id) === n);
    if (hit) return { chapterId: hit.id, chapterTitle: hit.titleAr };
  }

  // 3. Substring against titleAr
  const sub = chapters.find((c) => {
    const t = normalizeAr(c.titleAr || "");
    return t && (t.includes(nameNorm) || nameNorm.includes(t));
  });
  if (sub) return { chapterId: sub.id, chapterTitle: sub.titleAr };

  return { chapterId: null, chapterTitle: null };
}

// Match "المبحث في خطتك" text to a section within a chapter. (Unchanged logic.)
function matchSection(sectionText, chapter) {
  if (!chapter || !sectionText) return { sectionId: null, sectionTitle: null };
  const secs = chapter.sections || [];
  if (!secs.length) return { sectionId: null, sectionTitle: null };
  const raw = clean(sectionText);
  if (!raw) return { sectionId: null, sectionTitle: null };

  // ---- Tier 1: parse "م<N>" and look up "<chapterId>-<N>" directly.
  const numMatch = raw.match(/م\s*(\d+)/);
  if (numMatch) {
    const wantId = `${chapter.id}-${numMatch[1]}`;
    const hit = secs.find((s) => String(s.id) === wantId);
    if (hit) return { sectionId: hit.id, sectionTitle: hit.title };
  }

  // Strip prefixes/indent so wording comparisons focus on meaningful text.
  const stripSectionPrefix = (t) =>
    String(t || "")
      .replace(/^\s*↳\s*/, "")
      .replace(/^\s*م\s*\d+\s*[:：\-]?\s*/, "")
      .trim();
  const qStripped = normalizeAr(stripSectionPrefix(raw));

  // ---- Tier 2: bidirectional substring on prefix-stripped, normalized text.
  if (qStripped) {
    const hit = secs.find((s) => {
      const t = normalizeAr(stripSectionPrefix(s.title || ""));
      if (!t) return false;
      return t === qStripped || t.includes(qStripped) || qStripped.includes(t);
    });
    if (hit) return { sectionId: hit.id, sectionTitle: hit.title };
  }

  // ---- Tier 3: token-overlap fallback.
  const AR_STOP = new Set([
    "في","من","على","الى","إلى","عن","مع","بين","او","أو","و","أن","ان","ما",
    "هذا","هذه","ذلك","تلك","هو","هي","التي","الذي","الذين","اللواتي","بعد","قبل",
    "خلال","ضمن","حول","نحو","دون","تحت","فوق","الى","الى","ما","لم","لا","لن","قد",
    "الخليج","العربي","الحرب","العالمية","الثانية","الفصل","المبحث",
  ]);
  const toTokens = (t) =>
    normalizeAr(stripSectionPrefix(t))
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !AR_STOP.has(w));

  const qTokens = new Set(toTokens(raw));
  if (qTokens.size >= 2) {
    let best = null;
    let bestScore = 1;
    for (const s of secs) {
      const sTokens = toTokens(s.title || "");
      let overlap = 0;
      for (const w of sTokens) if (qTokens.has(w)) overlap += 1;
      if (overlap > bestScore) {
        bestScore = overlap;
        best = s;
      }
    }
    if (best) return { sectionId: best.id, sectionTitle: best.title };
  }

  return { sectionId: null, sectionTitle: null };
}

// Normalize a priority cell to the star-string used elsewhere in the app.
function normalizePriority(raw) {
  const s = clean(raw);
  if (!s) return { stars: "★★", numeric: 2 };
  const starCount = (s.match(/★/g) || []).length;
  if (starCount >= 3) return { stars: "★★★", numeric: 3 };
  if (starCount === 2) return { stars: "★★", numeric: 2 };
  if (starCount === 1) return { stars: "★", numeric: 1 };
  const n = parseInt(s, 10);
  if (n === 3) return { stars: "★★★", numeric: 3 };
  if (n === 2) return { stars: "★★", numeric: 2 };
  if (n === 1) return { stars: "★", numeric: 1 };
  return { stars: "★★", numeric: 2 };
}

// Deterministic QDL fallback URL for IOR archive refs.
export function qdlUrlForRef(archiveRef) {
  const r = clean(archiveRef);
  if (!r || !/^IOR\//i.test(r)) return null;
  return `https://www.qdl.qa/en/search#q=${encodeURIComponent(r)}&start=0`;
}

// ---- main parser -----------------------------------------------------------
export async function parseLibraryExcel(file, { chapters = [] } = {}) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });

  const dataSheets = [];
  const skippedSheets = [];
  const sheetErrors = [];
  const rowErrors = [];
  let scannedRowCount = 0;

  for (const sheetName of wb.SheetNames) {
    try {
      const ws = wb.Sheets[sheetName];
      // blankrows:true keeps every physical row so `r + 1` stays a truthful
      // reference to the 1-based Excel row number in error messages.
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: true });
      if (!aoa || !aoa.length) {
        skippedSheets.push({ sheetName, reason: "فارغة" });
        continue;
      }
      const header = detectHeaderRow(aoa);
      if (!header) {
        skippedSheets.push({
          sheetName,
          reason: "لا يحتوي على أعمدة عنوان الملف/المرجع الأرشيفي في أول 15 صفاً",
        });
        continue;
      }

      const { chapterId, chapterTitle } = matchChapter(sheetName, chapters);
      const chapter = chapters.find((c) => c.id === chapterId) || null;
      const colMap = header.columnMap;
      const rows = [];

      for (let r = header.rowIndex + 1; r < aoa.length; r++) {
        const row = aoa[r];
        // Genuinely empty rows (all cells null/blank) don't count as scanned.
        if (!row || row.every((v) => v == null || String(v).trim() === "")) continue;
        scannedRowCount += 1;
        try {
          const cell = (field) => (colMap[field] != null ? clean(row[colMap[field]]) : "");
          const title = cell("title");
          // NEW REQUIREMENT (Priority 1 lock): title is the ONLY mandatory
          // field. Rows without a title (e.g. lonely archive refs with no
          // descriptive title) are skipped as they are not usable sources.
          if (!title) continue;
          const archiveRef = cell("archiveRef");

          const priority = normalizePriority(cell("priority"));
          const sectionText = cell("sectionText");
          const url = qdlUrlForRef(archiveRef);

          // Per-row chapter: parse from "الفصل" column if present. Falls back
          // to whatever chapter the sheet name matched (legacy multi-sheet
          // files). Single-sheet workbooks with a "الفصل" column now resolve
          // chapter per row.
          const chapterCell = cell("chapter");
          const rowChapterMatch = chapterCell ? matchChapter(chapterCell, chapters) : null;
          const effectiveChapter = rowChapterMatch && rowChapterMatch.chapterId != null
            ? chapters.find((c) => c.id === rowChapterMatch.chapterId) || null
            : chapter;
          const { sectionId, sectionTitle } = matchSection(sectionText, effectiveChapter);

          rows.push({
            rowIndex: r + 1, // 1-based real Excel row number
            title,
            archiveRef,
            sectionText,
            subElement:     cell("subElement"),
            priorityStars:  priority.stars,
            priorityNumeric: priority.numeric,
            sourceType:     cell("sourceType"),
            isNew:          cell("isNew"),
            status:         cell("status"),
            importantPages: cell("importantPages"),
            notes:          cell("notes"),
            url,
            chapterIdFromRow: rowChapterMatch ? rowChapterMatch.chapterId : null,
            chapterTitleFromRow: rowChapterMatch ? rowChapterMatch.chapterTitle : null,
            sectionIdMatched: sectionId,
            sectionTitleMatched: sectionTitle,
          });
        } catch (rowErr) {
          rowErrors.push({
            sheetName,
            rowIndex: r + 1,
            reason: rowErr?.message || String(rowErr),
          });
        }
      }

      dataSheets.push({ sheetName, chapterId, chapterTitle, rows });
    } catch (sheetErr) {
      sheetErrors.push({
        sheetName,
        reason: sheetErr?.message || String(sheetErr),
      });
    }
  }

  const rowCount = dataSheets.reduce((n, s) => n + s.rows.length, 0);
  return {
    dataSheets,
    skippedSheets,
    sheetErrors,
    rowErrors,
    totals: {
      dataSheetCount: dataSheets.length,
      rowCount,
      scannedRowCount,
      sheetCount: wb.SheetNames.length,
    },
  };
}

// Small helper the caller uses to build/parse the archive-ref tag stored in
// `notes`. Kept here so dedupe logic lives with the parser.
export const REF_TAG = "المرجع الأرشيفي:";
export function buildNotesWithRef(archiveRef, originalNotes) {
  const ref = clean(archiveRef);
  const notes = clean(originalNotes);
  const parts = [];
  if (ref) parts.push(`${REF_TAG} ${ref}`);
  if (notes) parts.push(`ملاحظات: ${notes}`);
  return parts.join("\n\n");
}
export function extractRefFromNotes(notes) {
  const m = String(notes || "").match(new RegExp(`${REF_TAG}\\s*([^\\n]+)`));
  return m ? clean(m[1]) : "";
}

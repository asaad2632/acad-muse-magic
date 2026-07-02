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
//     totals: { dataSheetCount, rowCount }
//   }
//
// Design notes:
//   - Never hard-coded to a specific workbook; header detection is by content match
//     (a sheet is a "data sheet" iff row 1..5 contains both "عنوان الملف" AND
//     "المرجع الأرشيفي" — instructional/summary sheets are skipped).
//   - Column order is discovered from the header row, so future files that add or
//     reorder columns still work.
//   - Chapter matching: parse Arabic ordinal from sheet name → numeric → look up in
//     the caller-provided `chapters` array. Falls back to substring match.
//   - Section matching: exact-then-substring against `chapter.sections[].title`.
//   - QDL fallback URL: only for archiveRef starting with "IOR/".

import * as XLSX from "xlsx";

// ---- constants -------------------------------------------------------------
const REQUIRED_HEADERS = ["عنوان الملف", "المرجع الأرشيفي"];

const HEADER_ALIASES = {
  serial:         ["م", "#", "الرقم"],
  title:          ["عنوان الملف", "العنوان", "اسم الملف"],
  archiveRef:     ["المرجع الأرشيفي", "المرجع", "الرقم الأرشيفي"],
  sectionText:    ["المبحث في خطتك", "المبحث", "الفرع"],
  subElement:     ["العنصر الفرعي", "الفقرة", "المطلب"],
  priority:       ["الأولوية", "الأهمية"],
  sourceType:     ["نوع الوثيقة", "نوع المصدر", "النوع"],
  isNew:          ["جديد؟", "جديد"],
  status:         ["الحالة"],
  importantPages: ["الأوراق المفيدة", "الصفحات المفيدة", "الأوراق"],
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

// ---- helpers ---------------------------------------------------------------
const clean = (v) => (v == null ? "" : String(v).replace(/\s+/g, " ").trim());

// Normalize an Arabic string for loose matching (strip diacritics, unify alef, ya).
function normalizeAr(s) {
  return clean(s)
    .replace(/[\u064B-\u0652\u0670]/g, "")   // tashkeel
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[«»"'،.]/g, "")
    .toLowerCase();
}

// Locate the header row in a sheet-of-arrays. Scans first 8 rows; returns
// { rowIndex, columnMap } or null if no matching header found.
function detectHeaderRow(rows) {
  const scanLimit = Math.min(rows.length, 8);
  for (let r = 0; r < scanLimit; r++) {
    const cells = (rows[r] || []).map(clean);
    if (!cells.length) continue;
    const cellsNorm = cells.map(normalizeAr);
    const hasAll = REQUIRED_HEADERS.every((h) =>
      cellsNorm.some((c) => c.includes(normalizeAr(h)))
    );
    if (!hasAll) continue;

    // Build a column map: field -> column index
    const columnMap = {};
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      const aliasesNorm = aliases.map(normalizeAr);
      const idx = cellsNorm.findIndex((c) => aliasesNorm.some((a) => c === a || c.includes(a)));
      if (idx !== -1) columnMap[field] = idx;
    }
    return { rowIndex: r, columnMap };
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

// Match "المبحث في خطتك" text to a section within a chapter.
// The stored `section.title` in CHAPTERS_DATA / DB uses a numbering prefix on
// every main section ("م1: ...", "م2: ...") and an indent + arrow on sub-sections
// ("   ↳ ..."). The Excel cell often either uses the same prefix with shorter or
// paraphrased wording after it, or drops the prefix entirely. Three-tier match:
//   Tier 1 — deterministic: parse "م<N>" from the Excel cell → build "<chapterId>-<N>"
//            → direct lookup by id. Always wins if present.
//   Tier 2 — normalized substring after stripping the numbering prefix and the
//            "   ↳ " sub-section indent from BOTH sides. Bidirectional.
//   Tier 3 — token-overlap: after normalization + stop-word removal, pick the
//            section that shares the largest count of meaningful tokens (≥ 2).
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
      .replace(/^\s*↳\s*/, "")               // sub-section arrow (any leading spaces)
      .replace(/^\s*م\s*\d+\s*[:：\-]?\s*/, "") // main "م1:" / "م 2 -" prefix
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
  // Split on whitespace, drop tokens shorter than 3 chars and Arabic stop-words.
  const AR_STOP = new Set([
    "في","من","على","الى","إلى","عن","مع","بين","او","أو","و","أن","ان","ما",
    "هذا","هذه","ذلك","تلك","هو","هي","التي","الذي","الذين","اللواتي","بعد","قبل",
    "خلال","ضمن","حول","نحو","دون","تحت","فوق","الى","الى","ما","لم","لا","لن","قد",
    // very-common thesis-domain tokens that don't discriminate between sections
    "الخليج","العربي","الحرب","العالمية","الثانية","الفصل","المبحث",
  ]);
  const toTokens = (t) =>
    normalizeAr(stripSectionPrefix(t))
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !AR_STOP.has(w));

  const qTokens = new Set(toTokens(raw));
  if (qTokens.size >= 2) {
    let best = null;
    let bestScore = 1; // require at least 2 shared tokens
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
  // fallback: numeric input in cell
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

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false });
    if (!aoa || !aoa.length) {
      skippedSheets.push({ sheetName, reason: "فارغة" });
      continue;
    }
    const header = detectHeaderRow(aoa);
    if (!header) {
      skippedSheets.push({ sheetName, reason: "لا يحتوي على أعمدة عنوان الملف/المرجع الأرشيفي" });
      continue;
    }

    const { chapterId, chapterTitle } = matchChapter(sheetName, chapters);
    const chapter = chapters.find((c) => c.id === chapterId) || null;
    const colMap = header.columnMap;
    const rows = [];

    for (let r = header.rowIndex + 1; r < aoa.length; r++) {
      const row = aoa[r] || [];
      const cell = (field) => (colMap[field] != null ? clean(row[colMap[field]]) : "");
      const title = cell("title");
      const archiveRef = cell("archiveRef");
      if (!title && !archiveRef) continue; // fully empty row

      const priority = normalizePriority(cell("priority"));
      const sectionText = cell("sectionText");
      const { sectionId, sectionTitle } = matchSection(sectionText, chapter);
      const url = qdlUrlForRef(archiveRef);

      rows.push({
        rowIndex: r + 1, // 1-based for user-facing errors
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
        sectionIdMatched: sectionId,
        sectionTitleMatched: sectionTitle,
      });
    }

    dataSheets.push({ sheetName, chapterId, chapterTitle, rows });
  }

  const rowCount = dataSheets.reduce((n, s) => n + s.rows.length, 0);
  return {
    dataSheets,
    skippedSheets,
    totals: { dataSheetCount: dataSheets.length, rowCount },
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

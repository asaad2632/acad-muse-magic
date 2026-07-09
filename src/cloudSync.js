// Cloud sync layer — talks to /api/data/* (DigitalOcean Postgres) instead of
// Supabase. Keeps localStorage as a fast cache; the server is source of truth.
// Every exported function here keeps its original name/signature so App.jsx,
// SupervisorRoom.jsx, and NotificationBell.jsx need no changes.

// ---------- generic fetch helpers ----------
// Identity comes from the httpOnly session cookie (sent automatically on
// same-origin requests) — no bearer token, no client-side uid() lookup.
async function apiGet(path) {
  const res = await fetch(path);
  if (!res.ok) {
    if (res.status !== 401) console.warn(`[apiGet:${path}]`, res.status, await res.text().catch(() => ""));
    return null;
  }
  return res.json();
}

async function apiSend(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    console.warn(`[api${method}:${path}]`, res.status, await res.text().catch(() => ""));
    return { ok: false, status: res.status };
  }
  return res.json().catch(() => ({ ok: true }));
}

// Cached "who am I" — only used where client code needs to know its own
// identity (filtering which Supervisor Room rows are mine to push). Never
// used to authorize writes; the server always derives the real owner from
// the session cookie itself, independent of anything sent here.
let _sessionPromise = null;
async function getSession() {
  if (!_sessionPromise) {
    _sessionPromise = fetch("/api/session")
      .then((r) => r.json())
      .then((d) => d.user || null)
      .catch(() => null);
  }
  return _sessionPromise;
}

// Map a user-added doc (local shape) into a sources-table row.
function docToRow(doc) {
  return {
    client_id: String(doc.id),
    title: doc.title ?? null,
    author: doc.author ?? null,
    year: doc.year != null ? String(doc.year) : null,
    source_type: doc.sourceType ?? doc.category ?? null,
    category: doc.category ?? null,
    chapter_id: doc.chapterId ?? null,
    section_id: doc.sectionId ?? doc.subSectionId ?? null,
    archive_ref: doc.archiveRef ?? null,
    priority: doc.priority ?? null,
    notes: doc.notes ?? null,
    status: doc.status ?? null,
    is_new: !!doc.isNew,
    publisher: doc.publisher ?? null,
    place: doc.place ?? null,
    university: doc.university ?? null,
    college: doc.college ?? null,
    journal: doc.journal ?? null,
    volume: doc.volume ?? null,
    issue: doc.issue ?? null,
    pages: doc.pages ?? null,
    url: doc.url ?? null,
    access_date: doc.visitDate ?? doc.accessDate ?? null,
    edition: doc.edition ?? null,
    degree: doc.degree ?? null,
    newspaper: doc.newspaper ?? null,
    institution: doc.institution ?? doc.agency ?? null,
  };
}

// Map a sources row back to local doc shape.
function rowToDoc(row) {
  const clientId = row.client_id;
  const idNum = clientId != null && /^-?\d+$/.test(clientId) ? Number(clientId) : clientId;
  return {
    id: idNum,
    title: row.title || "",
    author: row.author || "",
    year: row.year || "",
    sourceType: row.source_type || row.category || "",
    category: row.category || "",
    chapterId: row.chapter_id ?? "",
    sectionId: row.section_id || "",
    archiveRef: row.archive_ref || "",
    priority: row.priority || "",
    notes: row.notes || "",
    status: row.status || "",
    isNew: !!row.is_new,
    publisher: row.publisher || "",
    place: row.place || "",
    university: row.university || "",
    college: row.college || "",
    journal: row.journal || "",
    volume: row.volume || "",
    issue: row.issue || "",
    pages: row.pages || "",
    url: row.url || "",
    visitDate: row.access_date || "",
    edition: row.edition || "",
    degree: row.degree || "",
    newspaper: row.newspaper || "",
    institution: row.institution || "",
  };
}

// ---------- LOAD (call once on app mount, after auth) ----------
export async function loadPhase3a(defaultChapters) {
  const [chaptersRows, sourcesRows, delRows] = await Promise.all([
    apiGet("/api/data/chapters"),
    apiGet("/api/data/sources"),
    apiGet("/api/data/deleted-base-docs"),
  ]);
  if (!chaptersRows && !sourcesRows && !delRows) return null;

  // Chapters: merge DB rows over defaults (by chapter_id). Shared workspace —
  // if multiple users edited the same chapter, take the most recently updated row.
  let chapters = defaultChapters.map(ch => ({ ...ch, sections: ch.sections.map(s => ({ ...s })) }));
  if (chaptersRows && chaptersRows.length) {
    const byId = new Map();
    for (const r of chaptersRows) {
      const prev = byId.get(r.chapter_id);
      if (!prev || new Date(r.updated_at || 0) > new Date(prev.updated_at || 0)) byId.set(r.chapter_id, r);
    }
    chapters = chapters.map(ch => {
      const r = byId.get(ch.id);
      if (!r) return ch;
      return {
        ...ch,
        titleAr: r.title_ar ?? ch.titleAr,
        color:   r.color   ?? ch.color,
        sections: Array.isArray(r.sections) ? r.sections : ch.sections,
      };
    });
  }

  // User-added sources: dedupe across users by client_id (latest update wins).
  const docMap = new Map();
  for (const r of (sourcesRows || [])) {
    const prev = docMap.get(r.client_id);
    if (!prev || new Date(r.updated_at || 0) > new Date(prev.updated_at || 0)) docMap.set(r.client_id, r);
  }
  const userDocs = [...docMap.values()].map(rowToDoc);

  // Deleted base docs: union across the workspace.
  const deletedBaseDocs = new Set((delRows || []).map(r => r.base_doc_id));

  return { chapters, userDocs, deletedBaseDocs };
}

// ---------- WRITE: chapters (full upsert; cheap — small number of rows) ----------
export async function syncChapters(chapters) {
  const rows = chapters.map(ch => ({
    chapter_id: ch.id,
    title_ar: ch.titleAr || null,
    color: ch.color || null,
    sections: ch.sections || [],
  }));
  await apiSend("POST", "/api/data/chapters", rows);
}

// ---------- WRITE: user-added sources (full sync vs current set) ----------
export async function syncUserDocs(userDocs) {
  const rows = userDocs.map(docToRow);
  await apiSend("POST", "/api/data/sources", rows);
}

// ---------- WRITE: deleted base docs (full sync) ----------
export async function syncDeletedBaseDocs(deletedSet) {
  const ids = [...deletedSet].map(Number).filter(Number.isFinite);
  await apiSend("POST", "/api/data/deleted-base-docs", ids);
}

// ---------- debounce helper ----------
export function debounce(fn, ms = 600) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// ==================== Phase 3b: library_sources + Storage ====================
// File bytes live in DigitalOcean Spaces, proxied through /api/spaces-storage
// (see src/routes/api/spaces-storage.ts + src/spacesStorage.js). Auth is the
// same session cookie as everything else — no manual header needed.

async function uploadToSpaces(file) {
  if (!file) return null;
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/spaces-storage", { method: "POST", body: form });
  if (!res.ok) { console.warn("[uploadToSpaces]", res.status, await res.text().catch(() => "")); return null; }
  const data = await res.json();
  return data?.storagePath || null;
}

async function getSpacesFileUrl(path) {
  if (!path) return null;
  const res = await fetch(`/api/spaces-storage?path=${encodeURIComponent(path)}`);
  if (!res.ok) { console.warn("[getSpacesFileUrl]", res.status, await res.text().catch(() => "")); return null; }
  const data = await res.json();
  return data?.signedUrl || null;
}

async function deleteFromSpaces(path) {
  if (!path) return;
  const res = await fetch(`/api/spaces-storage?path=${encodeURIComponent(path)}`, { method: "DELETE" });
  if (!res.ok) console.warn("[deleteFromSpaces]", res.status, await res.text().catch(() => ""));
}

function libToRow(s) {
  return {
    client_id: String(s.id),
    file_name: s.fileName ?? null,
    file_type: s.fileType ?? null,
    file_size: s.fileSize ?? null,
    upload_date: s.uploadDate ?? null,
    status: s.status ?? null,
    analyzed: !!s.analyzed,
    title: s.title ?? null,
    author: s.author ?? null,
    year: s.year != null ? String(s.year) : null,
    language: s.language ?? null,
    source_type: s.sourceType ?? null,
    chapter_id: s.chapterId ?? null,
    section_id: s.sectionId ?? null,
    sub_section_id: s.subSectionId ?? null,
    priority: s.priority ?? null,
    important_pages: s.importantPages ?? null,
    summary: s.summary ?? null,
    keywords: Array.isArray(s.keywords) ? s.keywords : [],
    why_important: s.whyImportant ?? null,
    how_to_use: s.howToUse ?? null,
    key_points: Array.isArray(s.keyPoints) ? s.keyPoints : [],
    storage_path: s.storagePath ?? null,
    notes: s.notes ?? null,
    archive_ref: s.archiveRef ?? null,
  };
}

function rowToLib(r) {
  const cid = r.client_id;
  const idNum = cid != null && /^-?\d+(\.\d+)?$/.test(cid) ? Number(cid) : cid;
  return {
    id: idNum,
    fileName: r.file_name || "",
    fileType: r.file_type || "",
    fileSize: r.file_size || 0,
    uploadDate: r.upload_date || "",
    status: r.status || "",
    analyzed: !!r.analyzed,
    title: r.title || "",
    author: r.author || "",
    year: r.year || "",
    language: r.language || "",
    sourceType: r.source_type || "",
    chapterId: r.chapter_id ?? null,
    sectionId: r.section_id || "",
    subSectionId: r.sub_section_id || "",
    priority: r.priority || "★★",
    importantPages: r.important_pages || "",
    summary: r.summary || "",
    keywords: r.keywords || [],
    whyImportant: r.why_important || "",
    howToUse: r.how_to_use || "",
    keyPoints: r.key_points || [],
    storagePath: r.storage_path || "",
    notes: r.notes || "",
    archiveRef: r.archive_ref || "",
    sections: [],
  };
}

// Upload a File to Spaces via /api/spaces-storage. Returns storage_path or null.
export async function uploadLibraryFile(file) {
  return uploadToSpaces(file);
}

export async function getLibraryFileUrl(path) {
  return getSpacesFileUrl(path);
}

export async function deleteLibraryFile(path) {
  return deleteFromSpaces(path);
}

export async function loadLibrary() {
  const rows = await apiGet("/api/data/library");
  if (!rows) return [];
  // Shared workspace dedupe by client_id, latest updated_at wins
  const map = new Map();
  for (const r of rows) {
    const prev = map.get(r.client_id);
    if (!prev || new Date(r.updated_at || 0) > new Date(prev.updated_at || 0)) map.set(r.client_id, r);
  }
  return [...map.values()].map(rowToLib);
}

// Bulk "sync whole set" — kept for API compatibility, not currently called
// from App.jsx (per-row insert/update/delete below is what the UI uses).
export async function syncLibrary(libraryArr) {
  for (const s of libraryArr) {
    await apiSend("POST", "/api/data/library", libToRow(s));
  }
}

export async function insertLibraryRow(src) {
  const res = await apiSend("POST", "/api/data/library", libToRow(src));
  if (res.ok === false) return { error: new Error(`http-${res.status}`), errorType: "http" };
  return { error: null, errorType: null };
}

export async function updateLibraryRow(clientId, changes) {
  // Build a partial row using libToRow mapping, then keep only fields present in `changes`.
  const full = libToRow({ id: clientId, ...changes });
  const patch = {};
  const map = {
    fileName:"file_name", fileType:"file_type", fileSize:"file_size", uploadDate:"upload_date",
    status:"status", analyzed:"analyzed", title:"title", author:"author", year:"year",
    language:"language", sourceType:"source_type", chapterId:"chapter_id", sectionId:"section_id",
    subSectionId:"sub_section_id", priority:"priority", importantPages:"important_pages",
    summary:"summary", keywords:"keywords", whyImportant:"why_important", howToUse:"how_to_use",
    keyPoints:"key_points", storagePath:"storage_path", notes:"notes",
    archiveRef:"archive_ref",
  };
  for (const k of Object.keys(changes)) {
    if (map[k]) patch[map[k]] = full[map[k]];
  }
  const res = await apiSend("PATCH", "/api/data/library", { clientId: String(clientId), patch });
  if (res.ok === false) return { error: new Error(`http-${res.status}`), errorType: "http" };
  return { error: null, errorType: null };
}

export async function deleteLibraryRow(clientId) {
  const res = await apiSend("DELETE", `/api/data/library?clientId=${encodeURIComponent(String(clientId))}`);
  if (res.ok === false) return { error: new Error(`http-${res.status}`) };
  return { error: null };
}

// Bulk delete: single round-trip for a list of client_ids. Used by the
// multi-select "delete selected" flow in the Library page so we don't fire
// one request per row (240 rows would otherwise = 240 requests).
export async function deleteLibraryRows(clientIds) {
  const ids = (clientIds || []).map((x) => String(x)).filter(Boolean);
  if (!ids.length) return { error: null, count: 0 };
  const res = await apiSend("DELETE", "/api/data/library", { clientIds: ids });
  if (res.ok === false) return { error: new Error(`http-${res.status}`), count: 0 };
  return { error: null, count: res.count ?? ids.length };
}


// ==================== Phase 3c: bibliography / cards / translations / custom_formats / researcher_analysis ====================

// Generic shared-workspace dedupe loader (by client_id, latest updated_at wins).
async function loadByClientId(path) {
  const rows = await apiGet(path);
  if (!rows) return [];
  const map = new Map();
  for (const r of rows) {
    const prev = map.get(r.client_id);
    if (!prev || new Date(r.updated_at || 0) > new Date(prev.updated_at || 0)) map.set(r.client_id, r);
  }
  return [...map.values()];
}

// ---------- bibliography ----------
function bibToRow(b) {
  return {
    client_id: String(b.id),
    doc_id: b.docId != null ? String(b.docId) : null,
    section: b.section ?? null,
    author: b.author ?? null,
    title: b.title ?? null,
    year: b.year != null ? String(b.year) : null,
    category: b.category ?? null,
    bib_entry: b.bibEntry ?? null,
    sort_key: b.sortKey ?? null,
    added_at: b.addedAt ?? null,
  };
}
function rowToBib(r) {
  const cid = r.client_id;
  const idNum = cid != null && /^-?\d+(\.\d+)?$/.test(cid) ? Number(cid) : cid;
  const docId = r.doc_id != null && /^-?\d+(\.\d+)?$/.test(r.doc_id) ? Number(r.doc_id) : r.doc_id;
  return {
    id: idNum, docId, section: r.section || "", author: r.author || "",
    title: r.title || "", year: r.year || "", category: r.category || "",
    bibEntry: r.bib_entry || "", sortKey: r.sort_key || "", addedAt: r.added_at || "",
  };
}
export async function loadBibliography() { return (await loadByClientId("/api/data/bibliography")).map(rowToBib); }
export async function syncBibliography(arr) {
  await apiSend("POST", "/api/data/bibliography", arr.map(bibToRow));
}

// ---------- cards ----------
function cardToRow(c) {
  return {
    client_id: String(c.id),
    title: c.title ?? null,
    topic: c.topic ?? null,
    date: c.date ?? null,
    chapter_id: c.chapterId ?? null,
    section_id: c.sectionId ?? null,
    tags: Array.isArray(c.tags) ? c.tags : [],
    notes: c.notes ?? null,
    ai_content: c.aiContent ?? null,
    related_doc_ids: Array.isArray(c.relatedDocIds) ? c.relatedDocIds.map(String) : [],
  };
}
function rowToCard(r) {
  const cid = r.client_id;
  const idNum = cid != null && /^-?\d+(\.\d+)?$/.test(cid) ? Number(cid) : cid;
  return {
    id: idNum, title: r.title || "", topic: r.topic || "", date: r.date || "",
    chapterId: r.chapter_id ?? null, sectionId: r.section_id || "",
    tags: r.tags || [], notes: r.notes || "", aiContent: r.ai_content || "",
    relatedDocIds: (r.related_doc_ids || []).map(x => /^-?\d+(\.\d+)?$/.test(x) ? Number(x) : x),
    createdAt: r.added_at || "",
  };
}
export async function loadCards() { return (await loadByClientId("/api/data/cards")).map(rowToCard); }
export async function syncCards(arr) {
  await apiSend("POST", "/api/data/cards", arr.map(cardToRow));
}

// ---------- translations ----------
function trToRow(t) {
  return {
    client_id: String(t.id),
    file_name: t.fileName ?? null,
    original_text: t.originalText ?? null,
    translation: t.translation ?? null,
    key_points: Array.isArray(t.keyPoints) ? t.keyPoints : (t.keyPoints || []),
    doc_meta: t.docMeta ?? null,
    saved_at: t.savedAt ?? null,
    source: t.source === "gemini" ? "gemini" : "groq",
  };
}
function rowToTr(r) {
  const cid = r.client_id;
  const idNum = cid != null && /^-?\d+(\.\d+)?$/.test(cid) ? Number(cid) : cid;
  return {
    id: idNum, fileName: r.file_name || "", originalText: r.original_text || "",
    translation: r.translation || "", keyPoints: r.key_points || [],
    docMeta: r.doc_meta || null, savedAt: r.saved_at || "",
    source: r.source === "gemini" ? "gemini" : "groq",
  };
}
export async function loadTranslations() { return (await loadByClientId("/api/data/translations")).map(rowToTr); }
export async function syncTranslations(arr) {
  await apiSend("POST", "/api/data/translations", arr.map(trToRow));
}

// ---------- custom_formats ----------
function fmtToRow(f, idx) {
  return {
    client_id: f.client_id ? String(f.client_id) : `fmt-${idx}-${f.name || ""}`,
    name: f.name ?? null,
    templates: f.templates ?? {},
  };
}
function rowToFmt(r) { return { name: r.name || "", templates: r.templates || {}, client_id: r.client_id }; }
export async function loadCustomFormats() { return (await loadByClientId("/api/data/custom-formats")).map(rowToFmt); }
export async function syncCustomFormats(arr) {
  await apiSend("POST", "/api/data/custom-formats", arr.map((f, i) => fmtToRow(f, i)));
}

// ---------- researcher_analysis (keyed by chapter_id/section_id) ----------
export async function loadResearcherAnalysis() {
  const data = await apiGet("/api/data/researcher-analysis");
  if (!data) return [];
  // dedupe by (chapter_id||section_id), latest wins
  const map = new Map();
  for (const r of data) {
    const k = `${r.chapter_id ?? ""}::${r.section_id ?? ""}`;
    const prev = map.get(k);
    if (!prev || new Date(r.updated_at || 0) > new Date(prev.updated_at || 0)) map.set(k, r);
  }
  return [...map.values()].map(r => ({
    chapterId: r.chapter_id ?? null,
    sectionId: r.section_id || "",
    content: r.content || "",
    version: r.version ?? 1,
  }));
}
export async function syncResearcherAnalysis(arr) {
  const rows = arr.map(a => ({
    chapter_id: a.chapterId ?? null,
    section_id: a.sectionId || null,
    content: a.content || "",
    version: a.version ?? 1,
  }));
  await apiSend("POST", "/api/data/researcher-analysis", rows);
}

// ==================== Phase 3d: Supervisor Room ====================
// Tables use created_by / uploaded_by (not user_id), and — unlike the
// fully-collaborative shared tables above — items keep a respected author:
// a supervisor's note isn't editable/deletable by the researcher and vice
// versa. Reads are unfiltered (shared merged view, dedupe by client_id,
// latest updated_at wins); writes only ever push the caller's own rows —
// the server also independently only ever deletes/upserts rows scoped to
// the authenticated caller, but filtering here too avoids resending (and
// thus accidentally re-claiming) rows merged in from the other account.

async function loadSupervisorTable(path) {
  const rows = await apiGet(path);
  if (!rows) return [];
  const map = new Map();
  for (const r of rows) {
    const prev = map.get(r.client_id);
    if (!prev || new Date(r.updated_at || 0) > new Date(prev.updated_at || 0)) map.set(r.client_id, r);
  }
  return [...map.values()];
}

async function syncSupervisorTable(path, arr, toRow) {
  const user = await getSession();
  if (!user) return;
  const mine = arr.filter(r => !r.ownerId || r.ownerId === user.id);
  await apiSend("POST", path, mine.map(toRow));
}

// ----- questions -----
function qToRow(q) {
  return {
    client_id: String(q.id),
    chapter: q.chapter ?? null, note_type: q.type ?? null, content: q.text ?? null,
    date: q.date ?? null, priority: q.priority ?? null,
    student_reply: q.reply ?? null, status: q.status ?? null,
  };
}
function rowToQ(r) {
  return {
    id: r.client_id, ownerId: r.created_by,
    chapter: r.chapter || "general", type: r.note_type || "سؤال",
    text: r.content || "", date: r.date || "", priority: r.priority || "عادي",
    reply: r.student_reply || "", status: r.status || "pending",
    createdAt: r.created_at ? new Date(r.created_at).getTime() : 0,
  };
}
export async function loadSupervisorQuestions() { return (await loadSupervisorTable("/api/data/supervisor-questions")).map(rowToQ); }
export async function syncSupervisorQuestions(arr) {
  await syncSupervisorTable("/api/data/supervisor-questions", arr, qToRow);
}

// ----- files -----
function fToRow(f) {
  return {
    client_id: String(f.id),
    chapter: f.chapter ?? null, version: f.version ?? null,
    upload_date: f.date ?? null, note: f.note ?? null,
    file_name: f.fileName ?? null, file_type: f.fileType ?? null,
    file_url: null, // dataUrl kept locally only; storage_path is canonical
    storage_path: f.storagePath ?? null, file_size: f.size ?? null,
    status: f.status ?? null,
  };
}
function rowToF(r) {
  return {
    id: r.client_id, ownerId: r.uploaded_by,
    fileName: r.file_name || "", fileType: r.file_type || "",
    size: r.file_size || 0, dataUrl: "", storagePath: r.storage_path || "",
    chapter: r.chapter || "1", version: r.version || "النسخة الأولى",
    date: r.upload_date || "", note: r.note || "",
    status: r.status || "بانتظار المراجعة",
    uploadedAt: r.created_at ? new Date(r.created_at).getTime() : 0,
  };
}
export async function loadSupervisorFiles() { return (await loadSupervisorTable("/api/data/supervisor-files")).map(rowToF); }
export async function syncSupervisorFiles(arr) {
  await syncSupervisorTable("/api/data/supervisor-files", arr, fToRow);
}
export async function uploadSupervisorFile(file) {
  return uploadToSpaces(file);
}
export async function getSupervisorFileUrl(path) {
  return getSpacesFileUrl(path);
}
export async function deleteSupervisorFile(path) {
  return deleteFromSpaces(path);
}

// ----- notes -----
function nToRow(n) {
  return {
    client_id: String(n.id),
    chapter: n.chapterId != null ? String(n.chapterId) : null,
    section: n.sectionId ?? null, note_type: n.type ?? null,
    content: n.text ?? null, date: n.date ?? null, done: !!n.done,
  };
}
function rowToN(r) {
  const ch = r.chapter;
  return {
    id: r.client_id, ownerId: r.created_by,
    chapterId: ch != null && /^-?\d+$/.test(ch) ? Number(ch) : ch,
    sectionId: r.section || "", type: r.note_type || "مصادر ناقصة",
    text: r.content || "", date: r.date || "", done: !!r.done,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : 0,
  };
}
export async function loadSupervisorNotes() { return (await loadSupervisorTable("/api/data/supervisor-notes")).map(rowToN); }
export async function syncSupervisorNotes(arr) {
  await syncSupervisorTable("/api/data/supervisor-notes", arr, nToRow);
}

// ----- meetings -----
function mToRow(m) {
  return {
    client_id: String(m.id),
    meeting_date: m.date ?? null, location: m.place ?? null,
    summary: m.summary ?? null, decisions: m.decisions ?? null,
    next_requirements: m.todo ?? null, next_meeting_date: m.nextDate ?? null,
  };
}
function rowToM(r) {
  return {
    id: r.client_id, ownerId: r.created_by,
    date: r.meeting_date || "", place: r.location || "",
    summary: r.summary || "", decisions: r.decisions || "",
    todo: r.next_requirements || "", nextDate: r.next_meeting_date || "",
    createdAt: r.created_at ? new Date(r.created_at).getTime() : 0,
  };
}
export async function loadSupervisorMeetings() { return (await loadSupervisorTable("/api/data/supervisor-meetings")).map(rowToM); }
export async function syncSupervisorMeetings(arr) {
  await syncSupervisorTable("/api/data/supervisor-meetings", arr, mToRow);
}

// ----- decisions -----
function dToRow(d) {
  return {
    client_id: String(d.id),
    subject: d.subject ?? null, decision_type: d.type ?? null,
    content: d.text ?? null, date: d.date ?? null,
  };
}
function rowToD(r) {
  return {
    id: r.client_id, ownerId: r.created_by,
    subject: r.subject || "", type: r.decision_type || "تمت الموافقة",
    text: r.content || "", date: r.date || "",
    createdAt: r.created_at ? new Date(r.created_at).getTime() : 0,
  };
}
export async function loadSupervisorDecisions() { return (await loadSupervisorTable("/api/data/supervisor-decisions")).map(rowToD); }
export async function syncSupervisorDecisions(arr) {
  await syncSupervisorTable("/api/data/supervisor-decisions", arr, dToRow);
}

// ----- reports -----
function rToRow(r) {
  return {
    client_id: String(r.id),
    content: r.text ?? null, saved_at: r.date ?? null,
  };
}
function rowToR(r) {
  return {
    id: r.client_id, ownerId: r.created_by,
    date: r.saved_at || "", text: r.content || "",
    createdAt: r.created_at ? new Date(r.created_at).getTime() : 0,
  };
}
export async function loadSupervisorReports() { return (await loadSupervisorTable("/api/data/supervisor-reports")).map(rowToR); }
export async function syncSupervisorReports(arr) {
  await syncSupervisorTable("/api/data/supervisor-reports", arr, rToRow);
}

// ==================== Phase 3: Notification Inbox ====================
// Tracks each user's last-read timestamp for supervisor-generated activity
// (questions / notes / decisions / files / meetings / reports). Any row in
// those tables that (a) is authored by someone other than the current user
// and (b) has created_at > last_read_at is counted as "unread" — computed
// server-side now (see src/dataAccess.server.ts's loadNotifications).

export async function markAllNotificationsRead() {
  await apiSend("POST", "/api/data/notifications");
}

// Load all unread supervisor-room items authored by someone other than caller.
// Returns { count, items: [{table, type, label, icon, tab, id, title, chapter, date, ownerId, createdAt}] }
export async function loadNotifications({ limit = 20 } = {}) {
  const data = await apiGet(`/api/data/notifications?limit=${limit}`);
  return data || { count: 0, items: [] };
}

// ==================== Access-control helper ====================
// Role now comes straight from the session cookie's users.role (NOT NULL by
// schema, so every seeded account always has one) — no more separate
// allow-list table/round-trip.
export async function getMyRole() {
  const user = await getSession();
  return { role: user?.role || null, enforced: true };
}

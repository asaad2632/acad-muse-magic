// Phase 3a cloud sync layer (chapters + user-added sources + deleted base docs).
// Keeps localStorage as a fast cache during this phase; Supabase is source of truth.
import { supabase } from "@/integrations/supabase/client";

// ---------- helpers ----------
async function uid() {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id || null;
}

// Map a user-added doc (local shape) into a sources-table row.
function docToRow(doc, userId) {
  return {
    user_id: userId,
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
  const userId = await uid();
  if (!userId) return null;

  const [chaptersRes, sourcesRes, delRes] = await Promise.all([
    supabase.from("chapters").select("*").order("chapter_id"),
    supabase.from("sources").select("*").not("client_id", "is", null),
    supabase.from("deleted_base_docs").select("base_doc_id"),
  ]);

  // Chapters: merge DB rows over defaults (by chapter_id). Shared workspace —
  // if multiple users edited the same chapter, take the most recently updated row.
  let chapters = defaultChapters.map(ch => ({ ...ch, sections: ch.sections.map(s => ({ ...s })) }));
  if (chaptersRes.data && chaptersRes.data.length) {
    const byId = new Map();
    for (const r of chaptersRes.data) {
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
  for (const r of (sourcesRes.data || [])) {
    const prev = docMap.get(r.client_id);
    if (!prev || new Date(r.updated_at || 0) > new Date(prev.updated_at || 0)) docMap.set(r.client_id, r);
  }
  const userDocs = [...docMap.values()].map(rowToDoc);

  // Deleted base docs: union across the workspace.
  const deletedBaseDocs = new Set((delRes.data || []).map(r => r.base_doc_id));

  return { chapters, userDocs, deletedBaseDocs };
}

// ---------- WRITE: chapters (full upsert; cheap — small number of rows) ----------
export async function syncChapters(chapters) {
  const userId = await uid();
  if (!userId) return;
  const rows = chapters.map(ch => ({
    user_id: userId,
    chapter_id: ch.id,
    title_ar: ch.titleAr || null,
    color: ch.color || null,
    sections: ch.sections || [],
  }));
  await supabase.from("chapters").upsert(rows, { onConflict: "user_id,chapter_id" });
}

// ---------- WRITE: user-added sources (full sync vs current set) ----------
export async function syncUserDocs(userDocs) {
  const userId = await uid();
  if (!userId) return;
  const rows = userDocs.map(d => docToRow(d, userId));

  // Upsert current set
  if (rows.length) {
    await supabase.from("sources").upsert(rows, { onConflict: "user_id,client_id" });
  }

  // Delete DB rows whose client_id is no longer present locally
  const keepIds = rows.map(r => r.client_id);
  let del = supabase.from("sources").delete().eq("user_id", userId).not("client_id", "is", null);
  if (keepIds.length) del = del.not("client_id", "in", `(${keepIds.map(id => `"${id}"`).join(",")})`);
  await del;
}

// ---------- WRITE: deleted base docs (full sync) ----------
export async function syncDeletedBaseDocs(deletedSet) {
  const userId = await uid();
  if (!userId) return;
  const ids = [...deletedSet].map(Number).filter(Number.isFinite);
  // Wipe then insert (small set — fine)
  await supabase.from("deleted_base_docs").delete().eq("user_id", userId);
  if (ids.length) {
    await supabase.from("deleted_base_docs").insert(
      ids.map(base_doc_id => ({ user_id: userId, base_doc_id }))
    );
  }
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

const BUCKET = "thesis-files";

function libToRow(s, userId) {
  return {
    user_id: userId,
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
    sections: [],
  };
}

// Upload a File to thesis-files bucket. Returns storage_path or null.
export async function uploadLibraryFile(file) {
  const userId = await uid();
  if (!userId || !file) return null;
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) { console.warn("[uploadLibraryFile]", error); return null; }
  return path;
}

export async function getLibraryFileUrl(path) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error) { console.warn("[getLibraryFileUrl]", error); return null; }
  return data?.signedUrl || null;
}

export async function deleteLibraryFile(path) {
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([path]);
}

export async function loadLibrary() {
  const userId = await uid();
  if (!userId) return [];
  const { data, error } = await supabase
    .from("library_sources")
    .select("*")
    .not("client_id", "is", null);
  if (error) { console.warn("[loadLibrary]", error); return []; }
  // Shared workspace dedupe by client_id, latest updated_at wins
  const map = new Map();
  for (const r of data || []) {
    const prev = map.get(r.client_id);
    if (!prev || new Date(r.updated_at || 0) > new Date(prev.updated_at || 0)) map.set(r.client_id, r);
  }
  return [...map.values()].map(rowToLib);
}

export async function syncLibrary(libraryArr) {
  const userId = await uid();
  if (!userId) return;
  const rows = libraryArr.map(s => libToRow(s, userId));
  if (rows.length) {
    const { error } = await supabase.from("library_sources").upsert(rows, { onConflict: "user_id,client_id" });
    if (error) console.warn("[syncLibrary:upsert]", error);
  }
  const keepIds = rows.map(r => r.client_id);
  let del = supabase.from("library_sources").delete().eq("user_id", userId).not("client_id", "is", null);
  if (keepIds.length) del = del.not("client_id", "in", `(${keepIds.map(id => `"${id}"`).join(",")})`);
  const { error: delError } = await del;
  if (delError) console.warn("[syncLibrary:delete]", delError);
}

// Direct per-row writes (Phase 3b hardening — used by My Library UI so data
// lands in library_sources immediately without waiting for debounce).
export async function insertLibraryRow(src) {
  const userId = await uid();
  if (!userId) return { error: new Error("no-user") };
  const row = libToRow(src, userId);
  const { error } = await supabase.from("library_sources").upsert(row, { onConflict: "user_id,client_id" });
  if (error) console.warn("[insertLibraryRow]", error);
  return { error };
}

export async function updateLibraryRow(clientId, changes) {
  const userId = await uid();
  if (!userId) return { error: new Error("no-user") };
  // Build a partial row using libToRow mapping, then keep only fields present in `changes`.
  const full = libToRow({ id: clientId, ...changes }, userId);
  const patch = {};
  const map = {
    fileName:"file_name", fileType:"file_type", fileSize:"file_size", uploadDate:"upload_date",
    status:"status", analyzed:"analyzed", title:"title", author:"author", year:"year",
    language:"language", sourceType:"source_type", chapterId:"chapter_id", sectionId:"section_id",
    subSectionId:"sub_section_id", priority:"priority", importantPages:"important_pages",
    summary:"summary", keywords:"keywords", whyImportant:"why_important", howToUse:"how_to_use",
    keyPoints:"key_points", storagePath:"storage_path", notes:"notes",
  };
  for (const k of Object.keys(changes)) {
    if (map[k]) patch[map[k]] = full[map[k]];
  }
  patch.updated_at = new Date().toISOString();
  const { error } = await supabase
    .from("library_sources")
    .update(patch)
    .eq("user_id", userId)
    .eq("client_id", String(clientId));
  if (error) console.warn("[updateLibraryRow]", error);
  return { error };
}

export async function deleteLibraryRow(clientId) {
  const userId = await uid();
  if (!userId) return { error: new Error("no-user") };
  const { error } = await supabase
    .from("library_sources")
    .delete()
    .eq("user_id", userId)
    .eq("client_id", String(clientId));
  if (error) console.warn("[deleteLibraryRow]", error);
  return { error };
}


// ==================== Phase 3c: bibliography / cards / translations / custom_formats / researcher_analysis ====================

// Generic shared-workspace dedupe loader (by client_id, latest updated_at wins).
async function loadByClientId(table) {
  const userId = await uid();
  if (!userId) return [];
  const { data, error } = await supabase.from(table).select("*").not("client_id", "is", null);
  if (error) { console.warn(`[load:${table}]`, error); return []; }
  const map = new Map();
  for (const r of data || []) {
    const prev = map.get(r.client_id);
    if (!prev || new Date(r.updated_at || 0) > new Date(prev.updated_at || 0)) map.set(r.client_id, r);
  }
  return [...map.values()];
}

// Generic set-based sync: upsert current rows + delete rows whose client_id is gone.
async function syncSet(table, rows) {
  const userId = await uid();
  if (!userId) return;
  if (rows.length) await supabase.from(table).upsert(rows, { onConflict: "user_id,client_id" });
  const keepIds = rows.map(r => r.client_id);
  let del = supabase.from(table).delete().eq("user_id", userId).not("client_id", "is", null);
  if (keepIds.length) del = del.not("client_id", "in", `(${keepIds.map(id => `"${id}"`).join(",")})`);
  await del;
}

// ---------- bibliography ----------
function bibToRow(b, userId) {
  return {
    user_id: userId,
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
export async function loadBibliography() { return (await loadByClientId("bibliography")).map(rowToBib); }
export async function syncBibliography(arr) {
  const userId = await uid();
  if (!userId) return;
  await syncSet("bibliography", arr.map(b => bibToRow(b, userId)));
}

// ---------- cards ----------
function cardToRow(c, userId) {
  return {
    user_id: userId,
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
export async function loadCards() { return (await loadByClientId("cards")).map(rowToCard); }
export async function syncCards(arr) {
  const userId = await uid();
  if (!userId) return;
  await syncSet("cards", arr.map(c => cardToRow(c, userId)));
}

// ---------- translations ----------
function trToRow(t, userId) {
  return {
    user_id: userId,
    client_id: String(t.id),
    file_name: t.fileName ?? null,
    original_text: t.originalText ?? null,
    translation: t.translation ?? null,
    key_points: Array.isArray(t.keyPoints) ? t.keyPoints : (t.keyPoints || []),
    doc_meta: t.docMeta ?? null,
    saved_at: t.savedAt ?? null,
  };
}
function rowToTr(r) {
  const cid = r.client_id;
  const idNum = cid != null && /^-?\d+(\.\d+)?$/.test(cid) ? Number(cid) : cid;
  return {
    id: idNum, fileName: r.file_name || "", originalText: r.original_text || "",
    translation: r.translation || "", keyPoints: r.key_points || [],
    docMeta: r.doc_meta || null, savedAt: r.saved_at || "",
  };
}
export async function loadTranslations() { return (await loadByClientId("translations")).map(rowToTr); }
export async function syncTranslations(arr) {
  const userId = await uid();
  if (!userId) return;
  await syncSet("translations", arr.map(t => trToRow(t, userId)));
}

// ---------- custom_formats ----------
function fmtToRow(f, userId, idx) {
  return {
    user_id: userId,
    client_id: f.client_id ? String(f.client_id) : `fmt-${idx}-${f.name || ""}`,
    name: f.name ?? null,
    templates: f.templates ?? {},
  };
}
function rowToFmt(r) { return { name: r.name || "", templates: r.templates || {}, client_id: r.client_id }; }
export async function loadCustomFormats() { return (await loadByClientId("custom_formats")).map(rowToFmt); }
export async function syncCustomFormats(arr) {
  const userId = await uid();
  if (!userId) return;
  const rows = arr.map((f, i) => fmtToRow(f, userId, i));
  await syncSet("custom_formats", rows);
}

// ---------- researcher_analysis (keyed by chapter_id/section_id) ----------
export async function loadResearcherAnalysis() {
  const userId = await uid();
  if (!userId) return [];
  const { data, error } = await supabase.from("researcher_analysis").select("*");
  if (error) { console.warn("[loadResearcherAnalysis]", error); return []; }
  // dedupe by (chapter_id||section_id), latest wins
  const map = new Map();
  for (const r of data || []) {
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
  const userId = await uid();
  if (!userId) return;
  // wipe + insert is simplest (small dataset)
  await supabase.from("researcher_analysis").delete().eq("user_id", userId);
  if (arr.length) {
    await supabase.from("researcher_analysis").insert(arr.map(a => ({
      user_id: userId,
      chapter_id: a.chapterId ?? null,
      section_id: a.sectionId || null,
      content: a.content || "",
      version: a.version ?? 1,
    })));
  }
}

// ==================== Phase 3d: Supervisor Room ====================
// Tables use created_by / uploaded_by (not user_id). Shared workspace =
// read all rows, dedupe by client_id (latest updated_at wins). On write,
// upsert as the current user and only delete rows authored by current user.

async function loadSupervisorTable(table) {
  const userId = await uid();
  if (!userId) return [];
  const { data, error } = await supabase.from(table).select("*").not("client_id", "is", null);
  if (error) { console.warn(`[load:${table}]`, error); return []; }
  const map = new Map();
  for (const r of data || []) {
    const prev = map.get(r.client_id);
    if (!prev || new Date(r.updated_at || 0) > new Date(prev.updated_at || 0)) map.set(r.client_id, r);
  }
  return [...map.values()];
}

async function syncSupervisorTable(table, rows, ownerCol /* 'created_by' | 'uploaded_by' */) {
  const userId = await uid();
  if (!userId) return;
  // Only push rows that belong to current user (avoid stomping other user's edits)
  const myRows = rows.filter(r => r[ownerCol] === userId);
  if (myRows.length) {
    await supabase.from(table).upsert(myRows, { onConflict: `${ownerCol},client_id` });
  }
  const keepIds = myRows.map(r => r.client_id);
  let del = supabase.from(table).delete().eq(ownerCol, userId).not("client_id", "is", null);
  if (keepIds.length) del = del.not("client_id", "in", `(${keepIds.map(id => `"${id}"`).join(",")})`);
  await del;
}

// ----- questions -----
function qToRow(q, userId) {
  return {
    created_by: q.ownerId || userId, client_id: String(q.id),
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
export async function loadSupervisorQuestions() { return (await loadSupervisorTable("supervisor_questions")).map(rowToQ); }
export async function syncSupervisorQuestions(arr) {
  const userId = await uid(); if (!userId) return;
  await syncSupervisorTable("supervisor_questions", arr.map(q => qToRow(q, userId)), "created_by");
}

// ----- files -----
function fToRow(f, userId) {
  return {
    uploaded_by: f.ownerId || userId, client_id: String(f.id),
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
export async function loadSupervisorFiles() { return (await loadSupervisorTable("supervisor_files")).map(rowToF); }
export async function syncSupervisorFiles(arr) {
  const userId = await uid(); if (!userId) return;
  await syncSupervisorTable("supervisor_files", arr.map(f => fToRow(f, userId)), "uploaded_by");
}
export async function uploadSupervisorFile(file) {
  const userId = await uid();
  if (!userId || !file) return null;
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const path = `${userId}/supervisor/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined, upsert: false,
  });
  if (error) { console.warn("[uploadSupervisorFile]", error); return null; }
  return path;
}
export async function getSupervisorFileUrl(path) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error) { console.warn("[getSupervisorFileUrl]", error); return null; }
  return data?.signedUrl || null;
}
export async function deleteSupervisorFile(path) {
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([path]);
}

// ----- notes -----
function nToRow(n, userId) {
  return {
    created_by: n.ownerId || userId, client_id: String(n.id),
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
export async function loadSupervisorNotes() { return (await loadSupervisorTable("supervisor_notes")).map(rowToN); }
export async function syncSupervisorNotes(arr) {
  const userId = await uid(); if (!userId) return;
  await syncSupervisorTable("supervisor_notes", arr.map(n => nToRow(n, userId)), "created_by");
}

// ----- meetings -----
function mToRow(m, userId) {
  return {
    created_by: m.ownerId || userId, client_id: String(m.id),
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
export async function loadSupervisorMeetings() { return (await loadSupervisorTable("supervisor_meetings")).map(rowToM); }
export async function syncSupervisorMeetings(arr) {
  const userId = await uid(); if (!userId) return;
  await syncSupervisorTable("supervisor_meetings", arr.map(m => mToRow(m, userId)), "created_by");
}

// ----- decisions -----
function dToRow(d, userId) {
  return {
    created_by: d.ownerId || userId, client_id: String(d.id),
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
export async function loadSupervisorDecisions() { return (await loadSupervisorTable("supervisor_decisions")).map(rowToD); }
export async function syncSupervisorDecisions(arr) {
  const userId = await uid(); if (!userId) return;
  await syncSupervisorTable("supervisor_decisions", arr.map(d => dToRow(d, userId)), "created_by");
}

// ----- reports -----
function rToRow(r, userId) {
  return {
    created_by: r.ownerId || userId, client_id: String(r.id),
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
export async function loadSupervisorReports() { return (await loadSupervisorTable("supervisor_reports")).map(rowToR); }
export async function syncSupervisorReports(arr) {
  const userId = await uid(); if (!userId) return;
  await syncSupervisorTable("supervisor_reports", arr.map(r => rToRow(r, userId)), "created_by");
}

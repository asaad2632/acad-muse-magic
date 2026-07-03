import { i as __toESM } from "./_runtime.mjs";
import { t as supabase } from "./_ssr/client-BfzyRf7F.mjs";
import { n as require_jsx_runtime, r as require_react } from "./_libs/react+tanstack__react-query.mjs";
import { t as require_lib } from "./_libs/mammoth+[...].mjs";
import { n as utils, t as readSync } from "./_libs/xlsx.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_authenticated-DZ2qeoHq.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var import_lib = /* @__PURE__ */ __toESM(require_lib());
var AI_MODELS = [
	{
		id: "groq/llama-3.3-70b-versatile",
		label: "Groq — Llama 3.3 70B (مفتاحك الخاص)"
	},
	{
		id: "openrouter/meta-llama/llama-3.3-70b-instruct:free",
		label: "OpenRouter — Llama 3.3 70B (مجاني)"
	},
	{
		id: "google/gemini-3-flash-preview",
		label: "Lovable Cloud — Gemini 3 Flash"
	}
];
var MODEL_STORAGE_KEY = "acadarchiv_ai_model";
var DEFAULT_MODEL = "groq/llama-3.3-70b-versatile";
function getSelectedModel() {
	try {
		const v = localStorage.getItem(MODEL_STORAGE_KEY);
		if (v && AI_MODELS.some((m) => m.id === v)) return v;
	} catch {}
	return DEFAULT_MODEL;
}
function setSelectedModel(id) {
	try {
		localStorage.setItem(MODEL_STORAGE_KEY, id);
	} catch {}
}
async function callLLM({ system, messages = [], max_tokens = 1024, forceProvider } = {}) {
	const model = getSelectedModel();
	try {
		const resp = await fetch("/api/ai-chat", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				system,
				messages,
				max_tokens,
				model,
				forceProvider
			})
		});
		const data = await resp.json().catch(() => ({}));
		if (!resp.ok || data?.error) throw new Error(data?.error || `HTTP ${resp.status}`);
		return { content: [{
			type: "text",
			text: data?.content?.[0]?.text || ""
		}] };
	} catch (err) {
		console.error("[callLLM]", model, err);
		return { content: [{
			type: "text",
			text: `حدث خطأ في الاتصال بالذكاء الاصطناعي: ${err.message || err}`
		}] };
	}
}
async function analyzeDocumentLLM({ prompt, fileName, mimeType, base64, text, max_tokens = 1800 }) {
	return callLLM({
		max_tokens,
		messages: [{
			role: "user",
			content: text ? `${prompt}\n\n--- محتوى الملف (${fileName}) ---\n${(text || "").substring(0, 6e4)}` : base64 ? `${prompt}\n\n--- ملاحظة ---\nهذا ملف صورة/ثنائي (${mimeType || "unknown"}) باسم "${fileName}". لا يمكن استخراج محتوى نصي منه تلقائياً؛ استنتج ما تستطيع من اسم الملف فقط، ثم اترك حقول summary/keywords/importantPages فارغة إن لزم.` : `${prompt}\n\n--- الملف ---\n${fileName || "unknown"}`
		}]
	});
}
async function uid$1() {
	const { data } = await supabase.auth.getUser();
	return data?.user?.id || null;
}
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
		institution: doc.institution ?? doc.agency ?? null
	};
}
function rowToDoc(row) {
	const clientId = row.client_id;
	return {
		id: clientId != null && /^-?\d+$/.test(clientId) ? Number(clientId) : clientId,
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
		institution: row.institution || ""
	};
}
async function loadPhase3a(defaultChapters) {
	if (!await uid$1()) return null;
	const [chaptersRes, sourcesRes, delRes] = await Promise.all([
		supabase.from("chapters").select("*").order("chapter_id"),
		supabase.from("sources").select("*").not("client_id", "is", null),
		supabase.from("deleted_base_docs").select("base_doc_id")
	]);
	let chapters = defaultChapters.map((ch) => ({
		...ch,
		sections: ch.sections.map((s) => ({ ...s }))
	}));
	if (chaptersRes.data && chaptersRes.data.length) {
		const byId = /* @__PURE__ */ new Map();
		for (const r of chaptersRes.data) {
			const prev = byId.get(r.chapter_id);
			if (!prev || new Date(r.updated_at || 0) > new Date(prev.updated_at || 0)) byId.set(r.chapter_id, r);
		}
		chapters = chapters.map((ch) => {
			const r = byId.get(ch.id);
			if (!r) return ch;
			return {
				...ch,
				titleAr: r.title_ar ?? ch.titleAr,
				color: r.color ?? ch.color,
				sections: Array.isArray(r.sections) ? r.sections : ch.sections
			};
		});
	}
	const docMap = /* @__PURE__ */ new Map();
	for (const r of sourcesRes.data || []) {
		const prev = docMap.get(r.client_id);
		if (!prev || new Date(r.updated_at || 0) > new Date(prev.updated_at || 0)) docMap.set(r.client_id, r);
	}
	const userDocs = [...docMap.values()].map(rowToDoc);
	const deletedBaseDocs = new Set((delRes.data || []).map((r) => r.base_doc_id));
	return {
		chapters,
		userDocs,
		deletedBaseDocs
	};
}
async function syncChapters(chapters) {
	const userId = await uid$1();
	if (!userId) return;
	const rows = chapters.map((ch) => ({
		user_id: userId,
		chapter_id: ch.id,
		title_ar: ch.titleAr || null,
		color: ch.color || null,
		sections: ch.sections || []
	}));
	await supabase.from("chapters").upsert(rows, { onConflict: "user_id,chapter_id" });
}
async function syncUserDocs(userDocs) {
	const userId = await uid$1();
	if (!userId) return;
	const rows = userDocs.map((d) => docToRow(d, userId));
	if (rows.length) await supabase.from("sources").upsert(rows, { onConflict: "user_id,client_id" });
	const keepIds = rows.map((r) => r.client_id);
	let del = supabase.from("sources").delete().eq("user_id", userId).not("client_id", "is", null);
	if (keepIds.length) del = del.not("client_id", "in", `(${keepIds.map((id) => `"${id}"`).join(",")})`);
	await del;
}
async function syncDeletedBaseDocs(deletedSet) {
	const userId = await uid$1();
	if (!userId) return;
	const ids = [...deletedSet].map(Number).filter(Number.isFinite);
	await supabase.from("deleted_base_docs").delete().eq("user_id", userId);
	if (ids.length) await supabase.from("deleted_base_docs").insert(ids.map((base_doc_id) => ({
		user_id: userId,
		base_doc_id
	})));
}
function debounce(fn, ms = 600) {
	let t;
	return (...args) => {
		clearTimeout(t);
		t = setTimeout(() => fn(...args), ms);
	};
}
var BUCKET = "thesis-files";
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
		notes: s.notes ?? null
	};
}
function rowToLib(r) {
	const cid = r.client_id;
	return {
		id: cid != null && /^-?\d+(\.\d+)?$/.test(cid) ? Number(cid) : cid,
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
		sections: []
	};
}
async function uploadLibraryFile(file) {
	const userId = await uid$1();
	if (!userId || !file) return null;
	const ext = (file.name.split(".").pop() || "bin").toLowerCase();
	const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
	const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
		contentType: file.type || void 0,
		upsert: false
	});
	if (error) {
		console.warn("[uploadLibraryFile]", error);
		return null;
	}
	return path;
}
async function deleteLibraryFile(path) {
	if (!path) return;
	await supabase.storage.from(BUCKET).remove([path]);
}
async function loadLibrary() {
	if (!await uid$1()) return [];
	const { data, error } = await supabase.from("library_sources").select("*").not("client_id", "is", null);
	if (error) {
		console.warn("[loadLibrary]", error);
		return [];
	}
	const map = /* @__PURE__ */ new Map();
	for (const r of data || []) {
		const prev = map.get(r.client_id);
		if (!prev || new Date(r.updated_at || 0) > new Date(prev.updated_at || 0)) map.set(r.client_id, r);
	}
	return [...map.values()].map(rowToLib);
}
async function syncLibrary(libraryArr) {
	const userId = await uid$1();
	if (!userId) return;
	const rows = libraryArr.map((s) => libToRow(s, userId));
	if (rows.length) {
		const { error } = await supabase.from("library_sources").upsert(rows, { onConflict: "user_id,client_id" });
		if (error) console.warn("[syncLibrary:upsert]", error);
	}
	const keepIds = rows.map((r) => r.client_id);
	let del = supabase.from("library_sources").delete().eq("user_id", userId).not("client_id", "is", null);
	if (keepIds.length) del = del.not("client_id", "in", `(${keepIds.map((id) => `"${id}"`).join(",")})`);
	const { error: delError } = await del;
	if (delError) console.warn("[syncLibrary:delete]", delError);
}
function classifyError(error, status) {
	if (!error) return null;
	const msg = String(error.message || error || "").toLowerCase();
	if ((error.code || "") === "42501" || status === 403 || msg.includes("row-level security")) return "rls";
	if (status === 401 || msg.includes("jwt") || msg.includes("expired") || msg.includes("invalid token")) return "jwt";
	if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("timeout") || msg.includes("aborted")) return "network";
	return "unknown";
}
async function _writeLibraryRowWithRetry(userId, row) {
	const delays = [
		500,
		2e3,
		5e3
	];
	let lastError = null, lastStatus = null;
	for (let attempt = 0; attempt <= delays.length; attempt++) {
		let { error, status } = await supabase.from("library_sources").insert(row);
		if (!error) return {
			error: null,
			errorType: null,
			path: "insert",
			attempts: attempt + 1
		};
		if (error.code === "23505" || status === 409) {
			const upd = await supabase.from("library_sources").update(row).eq("user_id", userId).eq("client_id", row.client_id);
			if (!upd.error) return {
				error: null,
				errorType: null,
				path: "update",
				attempts: attempt + 1
			};
			error = upd.error;
			status = upd.status;
		}
		lastError = error;
		lastStatus = status;
		const type = classifyError(error, status);
		console.warn(`[insertLibraryRow attempt ${attempt + 1}/${delays.length + 1}] type=${type}`, error);
		if (type === "rls" || type === "jwt") break;
		if (attempt < delays.length) await new Promise((r) => setTimeout(r, delays[attempt]));
	}
	return {
		error: lastError,
		errorType: classifyError(lastError, lastStatus),
		attempts: delays.length + 1
	};
}
async function insertLibraryRow(src) {
	const userId = await uid$1();
	if (!userId) return {
		error: /* @__PURE__ */ new Error("no-user"),
		errorType: "no-user"
	};
	return _writeLibraryRowWithRetry(userId, libToRow(src, userId));
}
async function updateLibraryRow(clientId, changes) {
	const userId = await uid$1();
	if (!userId) return {
		error: /* @__PURE__ */ new Error("no-user"),
		errorType: "no-user"
	};
	const full = libToRow({
		id: clientId,
		...changes
	}, userId);
	const patch = {};
	const map = {
		fileName: "file_name",
		fileType: "file_type",
		fileSize: "file_size",
		uploadDate: "upload_date",
		status: "status",
		analyzed: "analyzed",
		title: "title",
		author: "author",
		year: "year",
		language: "language",
		sourceType: "source_type",
		chapterId: "chapter_id",
		sectionId: "section_id",
		subSectionId: "sub_section_id",
		priority: "priority",
		importantPages: "important_pages",
		summary: "summary",
		keywords: "keywords",
		whyImportant: "why_important",
		howToUse: "how_to_use",
		keyPoints: "key_points",
		storagePath: "storage_path",
		notes: "notes"
	};
	for (const k of Object.keys(changes)) if (map[k]) patch[map[k]] = full[map[k]];
	patch.updated_at = (/* @__PURE__ */ new Date()).toISOString();
	const delays = [
		500,
		2e3,
		5e3
	];
	let lastError = null, lastStatus = null;
	for (let attempt = 0; attempt <= delays.length; attempt++) {
		const { error, status } = await supabase.from("library_sources").update(patch).eq("user_id", userId).eq("client_id", String(clientId));
		if (!error) return {
			error: null,
			errorType: null
		};
		lastError = error;
		lastStatus = status;
		const type = classifyError(error, status);
		console.warn(`[updateLibraryRow attempt ${attempt + 1}/${delays.length + 1}] type=${type}`, error);
		if (type === "rls" || type === "jwt") break;
		if (attempt < delays.length) await new Promise((r) => setTimeout(r, delays[attempt]));
	}
	return {
		error: lastError,
		errorType: classifyError(lastError, lastStatus)
	};
}
async function deleteLibraryRow(clientId) {
	const userId = await uid$1();
	if (!userId) return { error: /* @__PURE__ */ new Error("no-user") };
	const { error } = await supabase.from("library_sources").delete().eq("user_id", userId).eq("client_id", String(clientId));
	if (error) console.warn("[deleteLibraryRow]", error);
	return { error };
}
async function deleteLibraryRows(clientIds) {
	const userId = await uid$1();
	if (!userId) return {
		error: /* @__PURE__ */ new Error("no-user"),
		count: 0
	};
	const ids = (clientIds || []).map((x) => String(x)).filter(Boolean);
	if (!ids.length) return {
		error: null,
		count: 0
	};
	const { error } = await supabase.from("library_sources").delete().eq("user_id", userId).in("client_id", ids);
	if (error) console.warn("[deleteLibraryRows]", error);
	return {
		error,
		count: ids.length
	};
}
async function loadByClientId(table) {
	if (!await uid$1()) return [];
	const { data, error } = await supabase.from(table).select("*").not("client_id", "is", null);
	if (error) {
		console.warn(`[load:${table}]`, error);
		return [];
	}
	const map = /* @__PURE__ */ new Map();
	for (const r of data || []) {
		const prev = map.get(r.client_id);
		if (!prev || new Date(r.updated_at || 0) > new Date(prev.updated_at || 0)) map.set(r.client_id, r);
	}
	return [...map.values()];
}
async function syncSet(table, rows) {
	const userId = await uid$1();
	if (!userId) return;
	if (rows.length) await supabase.from(table).upsert(rows, { onConflict: "user_id,client_id" });
	const keepIds = rows.map((r) => r.client_id);
	let del = supabase.from(table).delete().eq("user_id", userId).not("client_id", "is", null);
	if (keepIds.length) del = del.not("client_id", "in", `(${keepIds.map((id) => `"${id}"`).join(",")})`);
	await del;
}
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
		added_at: b.addedAt ?? null
	};
}
function rowToBib(r) {
	const cid = r.client_id;
	return {
		id: cid != null && /^-?\d+(\.\d+)?$/.test(cid) ? Number(cid) : cid,
		docId: r.doc_id != null && /^-?\d+(\.\d+)?$/.test(r.doc_id) ? Number(r.doc_id) : r.doc_id,
		section: r.section || "",
		author: r.author || "",
		title: r.title || "",
		year: r.year || "",
		category: r.category || "",
		bibEntry: r.bib_entry || "",
		sortKey: r.sort_key || "",
		addedAt: r.added_at || ""
	};
}
async function loadBibliography() {
	return (await loadByClientId("bibliography")).map(rowToBib);
}
async function syncBibliography(arr) {
	const userId = await uid$1();
	if (!userId) return;
	await syncSet("bibliography", arr.map((b) => bibToRow(b, userId)));
}
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
		related_doc_ids: Array.isArray(c.relatedDocIds) ? c.relatedDocIds.map(String) : []
	};
}
function rowToCard(r) {
	const cid = r.client_id;
	return {
		id: cid != null && /^-?\d+(\.\d+)?$/.test(cid) ? Number(cid) : cid,
		title: r.title || "",
		topic: r.topic || "",
		date: r.date || "",
		chapterId: r.chapter_id ?? null,
		sectionId: r.section_id || "",
		tags: r.tags || [],
		notes: r.notes || "",
		aiContent: r.ai_content || "",
		relatedDocIds: (r.related_doc_ids || []).map((x) => /^-?\d+(\.\d+)?$/.test(x) ? Number(x) : x),
		createdAt: r.added_at || ""
	};
}
async function loadCards() {
	return (await loadByClientId("cards")).map(rowToCard);
}
async function syncCards(arr) {
	const userId = await uid$1();
	if (!userId) return;
	await syncSet("cards", arr.map((c) => cardToRow(c, userId)));
}
function trToRow(t, userId) {
	return {
		user_id: userId,
		client_id: String(t.id),
		file_name: t.fileName ?? null,
		original_text: t.originalText ?? null,
		translation: t.translation ?? null,
		key_points: Array.isArray(t.keyPoints) ? t.keyPoints : t.keyPoints || [],
		doc_meta: t.docMeta ?? null,
		saved_at: t.savedAt ?? null
	};
}
function rowToTr(r) {
	const cid = r.client_id;
	return {
		id: cid != null && /^-?\d+(\.\d+)?$/.test(cid) ? Number(cid) : cid,
		fileName: r.file_name || "",
		originalText: r.original_text || "",
		translation: r.translation || "",
		keyPoints: r.key_points || [],
		docMeta: r.doc_meta || null,
		savedAt: r.saved_at || ""
	};
}
async function loadTranslations() {
	return (await loadByClientId("translations")).map(rowToTr);
}
async function syncTranslations(arr) {
	const userId = await uid$1();
	if (!userId) return;
	await syncSet("translations", arr.map((t) => trToRow(t, userId)));
}
function fmtToRow(f, userId, idx) {
	return {
		user_id: userId,
		client_id: f.client_id ? String(f.client_id) : `fmt-${idx}-${f.name || ""}`,
		name: f.name ?? null,
		templates: f.templates ?? {}
	};
}
function rowToFmt(r) {
	return {
		name: r.name || "",
		templates: r.templates || {},
		client_id: r.client_id
	};
}
async function loadCustomFormats() {
	return (await loadByClientId("custom_formats")).map(rowToFmt);
}
async function syncCustomFormats(arr) {
	const userId = await uid$1();
	if (!userId) return;
	await syncSet("custom_formats", arr.map((f, i) => fmtToRow(f, userId, i)));
}
async function loadSupervisorTable(table) {
	if (!await uid$1()) return [];
	const { data, error } = await supabase.from(table).select("*").not("client_id", "is", null);
	if (error) {
		console.warn(`[load:${table}]`, error);
		return [];
	}
	const map = /* @__PURE__ */ new Map();
	for (const r of data || []) {
		const prev = map.get(r.client_id);
		if (!prev || new Date(r.updated_at || 0) > new Date(prev.updated_at || 0)) map.set(r.client_id, r);
	}
	return [...map.values()];
}
async function syncSupervisorTable(table, rows, ownerCol) {
	const userId = await uid$1();
	if (!userId) return;
	const myRows = rows.filter((r) => r[ownerCol] === userId);
	if (myRows.length) await supabase.from(table).upsert(myRows, { onConflict: `${ownerCol},client_id` });
	const keepIds = myRows.map((r) => r.client_id);
	let del = supabase.from(table).delete().eq(ownerCol, userId).not("client_id", "is", null);
	if (keepIds.length) del = del.not("client_id", "in", `(${keepIds.map((id) => `"${id}"`).join(",")})`);
	await del;
}
function qToRow(q, userId) {
	return {
		created_by: q.ownerId || userId,
		client_id: String(q.id),
		chapter: q.chapter ?? null,
		note_type: q.type ?? null,
		content: q.text ?? null,
		date: q.date ?? null,
		priority: q.priority ?? null,
		student_reply: q.reply ?? null,
		status: q.status ?? null
	};
}
function rowToQ(r) {
	return {
		id: r.client_id,
		ownerId: r.created_by,
		chapter: r.chapter || "general",
		type: r.note_type || "سؤال",
		text: r.content || "",
		date: r.date || "",
		priority: r.priority || "عادي",
		reply: r.student_reply || "",
		status: r.status || "pending",
		createdAt: r.created_at ? new Date(r.created_at).getTime() : 0
	};
}
async function loadSupervisorQuestions() {
	return (await loadSupervisorTable("supervisor_questions")).map(rowToQ);
}
async function syncSupervisorQuestions(arr) {
	const userId = await uid$1();
	if (!userId) return;
	await syncSupervisorTable("supervisor_questions", arr.map((q) => qToRow(q, userId)), "created_by");
}
function fToRow(f, userId) {
	return {
		uploaded_by: f.ownerId || userId,
		client_id: String(f.id),
		chapter: f.chapter ?? null,
		version: f.version ?? null,
		upload_date: f.date ?? null,
		note: f.note ?? null,
		file_name: f.fileName ?? null,
		file_type: f.fileType ?? null,
		file_url: null,
		storage_path: f.storagePath ?? null,
		file_size: f.size ?? null,
		status: f.status ?? null
	};
}
function rowToF(r) {
	return {
		id: r.client_id,
		ownerId: r.uploaded_by,
		fileName: r.file_name || "",
		fileType: r.file_type || "",
		size: r.file_size || 0,
		dataUrl: "",
		storagePath: r.storage_path || "",
		chapter: r.chapter || "1",
		version: r.version || "النسخة الأولى",
		date: r.upload_date || "",
		note: r.note || "",
		status: r.status || "بانتظار المراجعة",
		uploadedAt: r.created_at ? new Date(r.created_at).getTime() : 0
	};
}
async function loadSupervisorFiles() {
	return (await loadSupervisorTable("supervisor_files")).map(rowToF);
}
async function syncSupervisorFiles(arr) {
	const userId = await uid$1();
	if (!userId) return;
	await syncSupervisorTable("supervisor_files", arr.map((f) => fToRow(f, userId)), "uploaded_by");
}
async function uploadSupervisorFile(file) {
	const userId = await uid$1();
	if (!userId || !file) return null;
	const ext = (file.name.split(".").pop() || "bin").toLowerCase();
	const path = `${userId}/supervisor/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
	const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
		contentType: file.type || void 0,
		upsert: false
	});
	if (error) {
		console.warn("[uploadSupervisorFile]", error);
		return null;
	}
	return path;
}
async function getSupervisorFileUrl(path) {
	if (!path) return null;
	const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
	if (error) {
		console.warn("[getSupervisorFileUrl]", error);
		return null;
	}
	return data?.signedUrl || null;
}
async function deleteSupervisorFile(path) {
	if (!path) return;
	await supabase.storage.from(BUCKET).remove([path]);
}
function nToRow(n, userId) {
	return {
		created_by: n.ownerId || userId,
		client_id: String(n.id),
		chapter: n.chapterId != null ? String(n.chapterId) : null,
		section: n.sectionId ?? null,
		note_type: n.type ?? null,
		content: n.text ?? null,
		date: n.date ?? null,
		done: !!n.done
	};
}
function rowToN(r) {
	const ch = r.chapter;
	return {
		id: r.client_id,
		ownerId: r.created_by,
		chapterId: ch != null && /^-?\d+$/.test(ch) ? Number(ch) : ch,
		sectionId: r.section || "",
		type: r.note_type || "مصادر ناقصة",
		text: r.content || "",
		date: r.date || "",
		done: !!r.done,
		createdAt: r.created_at ? new Date(r.created_at).getTime() : 0
	};
}
async function loadSupervisorNotes() {
	return (await loadSupervisorTable("supervisor_notes")).map(rowToN);
}
async function syncSupervisorNotes(arr) {
	const userId = await uid$1();
	if (!userId) return;
	await syncSupervisorTable("supervisor_notes", arr.map((n) => nToRow(n, userId)), "created_by");
}
function mToRow(m, userId) {
	return {
		created_by: m.ownerId || userId,
		client_id: String(m.id),
		meeting_date: m.date ?? null,
		location: m.place ?? null,
		summary: m.summary ?? null,
		decisions: m.decisions ?? null,
		next_requirements: m.todo ?? null,
		next_meeting_date: m.nextDate ?? null
	};
}
function rowToM(r) {
	return {
		id: r.client_id,
		ownerId: r.created_by,
		date: r.meeting_date || "",
		place: r.location || "",
		summary: r.summary || "",
		decisions: r.decisions || "",
		todo: r.next_requirements || "",
		nextDate: r.next_meeting_date || "",
		createdAt: r.created_at ? new Date(r.created_at).getTime() : 0
	};
}
async function loadSupervisorMeetings() {
	return (await loadSupervisorTable("supervisor_meetings")).map(rowToM);
}
async function syncSupervisorMeetings(arr) {
	const userId = await uid$1();
	if (!userId) return;
	await syncSupervisorTable("supervisor_meetings", arr.map((m) => mToRow(m, userId)), "created_by");
}
function dToRow(d, userId) {
	return {
		created_by: d.ownerId || userId,
		client_id: String(d.id),
		subject: d.subject ?? null,
		decision_type: d.type ?? null,
		content: d.text ?? null,
		date: d.date ?? null
	};
}
function rowToD(r) {
	return {
		id: r.client_id,
		ownerId: r.created_by,
		subject: r.subject || "",
		type: r.decision_type || "تمت الموافقة",
		text: r.content || "",
		date: r.date || "",
		createdAt: r.created_at ? new Date(r.created_at).getTime() : 0
	};
}
async function loadSupervisorDecisions() {
	return (await loadSupervisorTable("supervisor_decisions")).map(rowToD);
}
async function syncSupervisorDecisions(arr) {
	const userId = await uid$1();
	if (!userId) return;
	await syncSupervisorTable("supervisor_decisions", arr.map((d) => dToRow(d, userId)), "created_by");
}
function rToRow(r, userId) {
	return {
		created_by: r.ownerId || userId,
		client_id: String(r.id),
		content: r.text ?? null,
		saved_at: r.date ?? null
	};
}
function rowToR(r) {
	return {
		id: r.client_id,
		ownerId: r.created_by,
		date: r.saved_at || "",
		text: r.content || "",
		createdAt: r.created_at ? new Date(r.created_at).getTime() : 0
	};
}
async function loadSupervisorReports() {
	return (await loadSupervisorTable("supervisor_reports")).map(rowToR);
}
async function syncSupervisorReports(arr) {
	const userId = await uid$1();
	if (!userId) return;
	await syncSupervisorTable("supervisor_reports", arr.map((r) => rToRow(r, userId)), "created_by");
}
var NOTIF_TABLES = [
	{
		table: "supervisor_questions",
		ownerCol: "created_by",
		type: "سؤال",
		label: "سؤال جديد",
		icon: "❓",
		tab: "questions"
	},
	{
		table: "supervisor_notes",
		ownerCol: "created_by",
		type: "ملاحظة",
		label: "ملاحظة جديدة",
		icon: "📝",
		tab: "notes"
	},
	{
		table: "supervisor_decisions",
		ownerCol: "created_by",
		type: "قرار",
		label: "قرار جديد",
		icon: "⚖️",
		tab: "decisions"
	},
	{
		table: "supervisor_files",
		ownerCol: "uploaded_by",
		type: "ملف",
		label: "ملف مرفوع",
		icon: "📎",
		tab: "files"
	},
	{
		table: "supervisor_meetings",
		ownerCol: "created_by",
		type: "اجتماع",
		label: "اجتماع مسجَّل",
		icon: "📅",
		tab: "meetings"
	},
	{
		table: "supervisor_reports",
		ownerCol: "created_by",
		type: "تقرير",
		label: "تقرير جديد",
		icon: "📊",
		tab: "reports"
	}
];
async function getLastReadAt() {
	const userId = await uid$1();
	if (!userId) return null;
	const { data } = await supabase.from("notification_reads").select("last_read_at").eq("user_id", userId).maybeSingle();
	if (data?.last_read_at) return data.last_read_at;
	await supabase.from("notification_reads").upsert({
		user_id: userId,
		last_read_at: "1970-01-01T00:00:00Z"
	}, { onConflict: "user_id" });
	return "1970-01-01T00:00:00Z";
}
async function markAllNotificationsRead() {
	const userId = await uid$1();
	if (!userId) return;
	const nowIso = (/* @__PURE__ */ new Date()).toISOString();
	await supabase.from("notification_reads").upsert({
		user_id: userId,
		last_read_at: nowIso
	}, { onConflict: "user_id" });
}
async function loadNotifications({ limit = 20 } = {}) {
	const userId = await uid$1();
	if (!userId) return {
		count: 0,
		items: []
	};
	const lastRead = await getLastReadAt() || "1970-01-01T00:00:00Z";
	const items = (await Promise.all(NOTIF_TABLES.map(async ({ table, ownerCol, type, label, icon, tab }) => {
		const { data, error } = await supabase.from(table).select("*").gt("created_at", lastRead).neq(ownerCol, userId).order("created_at", { ascending: false }).limit(limit);
		if (error) {
			console.warn(`[loadNotifications:${table}]`, error);
			return [];
		}
		return (data || []).map((r) => ({
			table,
			type,
			label,
			icon,
			tab,
			id: r.id,
			title: r.content || r.note || r.file_name || r.subject || r.summary || label,
			chapter: r.chapter || r.section || null,
			date: r.date || r.upload_date || r.meeting_date || null,
			ownerId: r[ownerCol],
			createdAt: r.created_at
		}));
	}))).flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
	return {
		count: items.length,
		items
	};
}
async function getMyRole() {
	const userId = await uid$1();
	if (!userId) return {
		role: null,
		enforced: false
	};
	const { data, error } = await supabase.from("allowed_users").select("role").eq("user_id", userId).maybeSingle();
	if (error) {
		if ((error.code || "") === "PGRST205" || /not exist|relation .* does not exist/i.test(error.message || "")) {
			console.info("[getMyRole] allow-list not deployed yet — access unrestricted.");
			return {
				role: null,
				enforced: false
			};
		}
		console.warn("[getMyRole]", error);
		return {
			role: null,
			enforced: false
		};
	}
	return {
		role: data?.role || null,
		enforced: true
	};
}
var LS = {
	questions: "acadarchiv_supervisor_questions",
	files: "acadarchiv_supervisor_files",
	notes: "acadarchiv_supervisor_notes",
	meetings: "acadarchiv_supervisor_meetings",
	decisions: "acadarchiv_supervisor_decisions",
	reports: "acadarchiv_supervisor_reports"
};
var loadLS = (k, fb) => {
	try {
		const v = localStorage.getItem(k);
		return v ? JSON.parse(v) : fb;
	} catch {
		return fb;
	}
};
var saveLS = (k, v) => {
	try {
		localStorage.setItem(k, JSON.stringify(v));
	} catch {}
};
var todayISO = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
var uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
var PRIMARY = "#1e3a5f";
var FONT = "'Cairo','Segoe UI',Tahoma,sans-serif";
var CHAPTER_OPTIONS = [
	{
		v: "1",
		l: "الفصل الأول"
	},
	{
		v: "2",
		l: "الفصل الثاني"
	},
	{
		v: "3",
		l: "الفصل الثالث"
	},
	{
		v: "4",
		l: "الفصل الرابع"
	},
	{
		v: "intro",
		l: "المقدمة"
	},
	{
		v: "conclusion",
		l: "الخاتمة"
	},
	{
		v: "general",
		l: "عام"
	}
];
var Q_TYPES = [
	{
		v: "سؤال",
		color: "#3B82F6"
	},
	{
		v: "ملاحظة",
		color: "#6366F1"
	},
	{
		v: "تعديل مطلوب",
		color: "#F59E0B"
	},
	{
		v: "موافقة",
		color: "#10B981"
	},
	{
		v: "تحذير",
		color: "#EF4444"
	}
];
var PRIORITIES = [
	{
		v: "عاجل",
		icon: "🔴",
		color: "#EF4444"
	},
	{
		v: "مهم",
		icon: "🟡",
		color: "#F59E0B"
	},
	{
		v: "عادي",
		icon: "🟢",
		color: "#10B981"
	}
];
var PRIORITY_RANK = {
	"عاجل": 0,
	"مهم": 1,
	"عادي": 2
};
var FILE_STATUSES = [
	{
		v: "بانتظار المراجعة",
		icon: "⏳",
		color: "#64748b"
	},
	{
		v: "قيد المراجعة",
		icon: "👁️",
		color: "#3B82F6"
	},
	{
		v: "يحتاج تعديل",
		icon: "✏️",
		color: "#F59E0B"
	},
	{
		v: "مقبول",
		icon: "✅",
		color: "#10B981"
	}
];
var NOTE_TYPES = [
	{
		v: "مصادر ناقصة",
		color: "#F59E0B"
	},
	{
		v: "صياغة ضعيفة",
		color: "#EF4444"
	},
	{
		v: "معلومة خاطئة",
		color: "#DC2626"
	},
	{
		v: "إضافة مطلوبة",
		color: "#3B82F6"
	},
	{
		v: "ممتاز",
		color: "#10B981"
	},
	{
		v: "يحتاج توسيع",
		color: "#8B5CF6"
	}
];
var DECISION_SUBJECTS = [
	"الفصل الأول",
	"الفصل الثاني",
	"الفصل الثالث",
	"الفصل الرابع",
	"العنوان",
	"المنهجية",
	"المصادر",
	"الهيكل العام"
];
var DECISION_TYPES = [
	{
		v: "تمت الموافقة",
		icon: "✅",
		border: "#10B981",
		bg: "#ecfdf5"
	},
	{
		v: "يحتاج مراجعة",
		icon: "🔄",
		border: "#F59E0B",
		bg: "#fffbeb"
	},
	{
		v: "مرفوض",
		icon: "❌",
		border: "#EF4444",
		bg: "#fef2f2"
	},
	{
		v: "موقوف",
		icon: "⏸️",
		border: "#64748b",
		bg: "#f8fafc"
	}
];
var cardSx = {
	background: "white",
	borderRadius: 12,
	padding: 16,
	border: "1px solid #e2e8f0",
	marginBottom: 12
};
var labelSx = {
	fontSize: 12,
	fontWeight: 600,
	color: "#334155",
	marginBottom: 4,
	display: "block"
};
var inputSx = {
	width: "100%",
	padding: "8px 12px",
	borderRadius: 8,
	border: "1px solid #cbd5e1",
	fontSize: 13,
	fontFamily: "inherit",
	boxSizing: "border-box"
};
var btnPrimary = {
	padding: "9px 18px",
	borderRadius: 8,
	background: PRIMARY,
	color: "white",
	border: "none",
	cursor: "pointer",
	fontFamily: "inherit",
	fontSize: 13,
	fontWeight: 600
};
var btnGhost = {
	padding: "6px 12px",
	borderRadius: 6,
	background: "#f1f5f9",
	color: "#334155",
	border: "1px solid #e2e8f0",
	cursor: "pointer",
	fontFamily: "inherit",
	fontSize: 12
};
var btnDanger = {
	padding: "6px 10px",
	borderRadius: 6,
	background: "#fee2e2",
	color: "#dc2626",
	border: "none",
	cursor: "pointer",
	fontFamily: "inherit",
	fontSize: 12
};
var chapterLabel = (v) => CHAPTER_OPTIONS.find((c) => c.v === String(v))?.l || v;
function SupervisorRoom({ chapters = [], combinedDocs = [], bibliography = [], showNotif, setConfirmDialog, initialTab = null, onOpened }) {
	const [tab, setTab] = (0, import_react.useState)(initialTab || "questions");
	(0, import_react.useEffect)(() => {
		if (initialTab) {
			setTab(initialTab);
			markAllNotificationsRead().catch(() => {});
			if (onOpened) onOpened();
		}
		markAllNotificationsRead().catch(() => {});
	}, [initialTab]);
	const [questions, setQuestions] = (0, import_react.useState)(() => loadLS(LS.questions, []));
	const [files, setFiles] = (0, import_react.useState)(() => loadLS(LS.files, []));
	const [notes, setNotes] = (0, import_react.useState)(() => loadLS(LS.notes, []));
	const [meetings, setMeetings] = (0, import_react.useState)(() => loadLS(LS.meetings, []));
	const [decisions, setDecisions] = (0, import_react.useState)(() => loadLS(LS.decisions, []));
	const [reports, setReports] = (0, import_react.useState)(() => loadLS(LS.reports, []));
	(0, import_react.useEffect)(() => saveLS(LS.questions, questions), [questions]);
	(0, import_react.useEffect)(() => saveLS(LS.files, files), [files]);
	(0, import_react.useEffect)(() => saveLS(LS.notes, notes), [notes]);
	(0, import_react.useEffect)(() => saveLS(LS.meetings, meetings), [meetings]);
	(0, import_react.useEffect)(() => saveLS(LS.decisions, decisions), [decisions]);
	(0, import_react.useEffect)(() => saveLS(LS.reports, reports), [reports]);
	const hydratedRef = (0, import_react.useRef)(false);
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		(async () => {
			try {
				const [q, f, n, m, d, r] = await Promise.all([
					loadSupervisorQuestions(),
					loadSupervisorFiles(),
					loadSupervisorNotes(),
					loadSupervisorMeetings(),
					loadSupervisorDecisions(),
					loadSupervisorReports()
				]);
				if (cancelled) return;
				if (q.length) setQuestions(q);
				if (f.length) setFiles(f);
				if (n.length) setNotes(n);
				if (m.length) setMeetings(m);
				if (d.length) setDecisions(d);
				if (r.length) setReports(r);
			} catch (err) {
				console.warn("[SupervisorRoom hydration]", err);
			} finally {
				hydratedRef.current = true;
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);
	const debSyncQ = (0, import_react.useMemo)(() => debounce(syncSupervisorQuestions, 800), []);
	const debSyncF = (0, import_react.useMemo)(() => debounce(syncSupervisorFiles, 800), []);
	const debSyncN = (0, import_react.useMemo)(() => debounce(syncSupervisorNotes, 800), []);
	const debSyncM = (0, import_react.useMemo)(() => debounce(syncSupervisorMeetings, 800), []);
	const debSyncD = (0, import_react.useMemo)(() => debounce(syncSupervisorDecisions, 800), []);
	const debSyncR = (0, import_react.useMemo)(() => debounce(syncSupervisorReports, 800), []);
	(0, import_react.useEffect)(() => {
		if (hydratedRef.current) debSyncQ(questions);
	}, [questions, debSyncQ]);
	(0, import_react.useEffect)(() => {
		if (hydratedRef.current) debSyncF(files);
	}, [files, debSyncF]);
	(0, import_react.useEffect)(() => {
		if (hydratedRef.current) debSyncN(notes);
	}, [notes, debSyncN]);
	(0, import_react.useEffect)(() => {
		if (hydratedRef.current) debSyncM(meetings);
	}, [meetings, debSyncM]);
	(0, import_react.useEffect)(() => {
		if (hydratedRef.current) debSyncD(decisions);
	}, [decisions, debSyncD]);
	(0, import_react.useEffect)(() => {
		if (hydratedRef.current) debSyncR(reports);
	}, [reports, debSyncR]);
	const confirmDelete = (msg, onConfirm) => {
		if (setConfirmDialog) setConfirmDialog({
			title: "تأكيد الحذف",
			message: msg,
			onConfirm
		});
		else if (window.confirm(msg)) onConfirm();
	};
	const notify = (m, t) => showNotif ? showNotif(m, t) : null;
	const [qForm, setQForm] = (0, import_react.useState)({
		chapter: "general",
		type: "سؤال",
		text: "",
		date: todayISO(),
		priority: "عادي"
	});
	const addQuestion = () => {
		if (!qForm.text.trim()) {
			notify("⚠️ نص الاستفسار مطلوب", "error");
			return;
		}
		setQuestions((p) => [...p, {
			id: uid(),
			...qForm,
			reply: "",
			status: "pending",
			createdAt: Date.now()
		}]);
		setQForm({
			chapter: "general",
			type: "سؤال",
			text: "",
			date: todayISO(),
			priority: "عادي"
		});
		notify("✅ تم إضافة استفسار المشرف");
	};
	const sortedQuestions = (0, import_react.useMemo)(() => {
		return [...questions].sort((a, b) => {
			const pa = PRIORITY_RANK[a.priority] ?? 9;
			const pb = PRIORITY_RANK[b.priority] ?? 9;
			if (pa !== pb) return pa - pb;
			return (b.date || "").localeCompare(a.date || "");
		});
	}, [questions]);
	const [fForm, setFForm] = (0, import_react.useState)({
		chapter: "1",
		version: "",
		date: todayISO(),
		note: ""
	});
	const [pendingFile, setPendingFile] = (0, import_react.useState)(null);
	const onFilePick = (e) => {
		const f = e.target.files?.[0];
		if (!f) return;
		const name = f.name.toLowerCase();
		if (!(name.endsWith(".docx") || name.endsWith(".doc") || name.endsWith(".pdf"))) {
			notify("⚠️ يُسمح فقط بملفات Word أو PDF", "error");
			e.target.value = "";
			return;
		}
		const reader = new FileReader();
		reader.onload = (ev) => setPendingFile({
			name: f.name,
			size: f.size,
			type: f.type,
			dataUrl: ev.target.result,
			file: f
		});
		reader.readAsDataURL(f);
	};
	const uploadFile = async () => {
		if (!pendingFile) {
			notify("⚠️ اختر ملفاً أولاً", "error");
			return;
		}
		notify("⏳ جاري رفع الملف...");
		let storagePath = null;
		try {
			if (pendingFile.file) storagePath = await uploadSupervisorFile(pendingFile.file);
		} catch (err) {
			console.warn("[uploadSupervisorFile]", err);
		}
		setFiles((p) => [...p, {
			id: uid(),
			fileName: pendingFile.name,
			fileType: pendingFile.type || "",
			size: pendingFile.size,
			dataUrl: pendingFile.dataUrl,
			storagePath: storagePath || "",
			chapter: fForm.chapter,
			version: fForm.version || "النسخة الأولى",
			date: fForm.date || todayISO(),
			note: fForm.note,
			status: "بانتظار المراجعة",
			uploadedAt: Date.now()
		}]);
		setPendingFile(null);
		setFForm({
			chapter: "1",
			version: "",
			date: todayISO(),
			note: ""
		});
		const input = document.getElementById("supervisor-file-input");
		if (input) input.value = "";
		notify(storagePath ? "✅ تم رفع الفصل للمراجعة ومشاركته مع المشرف" : "✅ تم حفظ الفصل محلياً (تعذّر الرفع للسحابة)");
	};
	const downloadFile = async (f) => {
		let href = f.dataUrl;
		if (!href && f.storagePath) href = await getSupervisorFileUrl(f.storagePath);
		if (!href) {
			notify("⚠️ تعذّر الحصول على الملف", "error");
			return;
		}
		const a = document.createElement("a");
		a.href = href;
		a.download = f.fileName;
		if (!f.dataUrl) a.target = "_blank";
		document.body.appendChild(a);
		a.click();
		a.remove();
	};
	const removeFileEntry = async (f) => {
		if (f.storagePath) try {
			await deleteSupervisorFile(f.storagePath);
		} catch {}
		setFiles((p) => p.filter((x) => x.id !== f.id));
	};
	const filesByChapter = (0, import_react.useMemo)(() => {
		const map = {};
		files.forEach((f) => {
			(map[f.chapter] = map[f.chapter] || []).push(f);
		});
		return map;
	}, [files]);
	const [nForm, setNForm] = (0, import_react.useState)({
		chapterId: "",
		sectionId: "",
		type: "مصادر ناقصة",
		text: "",
		date: todayISO()
	});
	const selectedChapter = chapters.find((c) => String(c.id) === String(nForm.chapterId));
	const addNote = () => {
		if (!nForm.chapterId) {
			notify("⚠️ اختر الفصل", "error");
			return;
		}
		if (!nForm.text.trim()) {
			notify("⚠️ نص الملاحظة مطلوب", "error");
			return;
		}
		setNotes((p) => [...p, {
			id: uid(),
			...nForm,
			done: false,
			createdAt: Date.now()
		}]);
		setNForm({
			chapterId: "",
			sectionId: "",
			type: "مصادر ناقصة",
			text: "",
			date: todayISO()
		});
		notify("✅ تم حفظ الملاحظة");
	};
	const notesByChapter = (0, import_react.useMemo)(() => {
		const map = {};
		[...notes].sort((a, b) => (b.date || "").localeCompare(a.date || "")).forEach((n) => {
			(map[n.chapterId] = map[n.chapterId] || []).push(n);
		});
		return map;
	}, [notes]);
	const [mForm, setMForm] = (0, import_react.useState)({
		date: todayISO(),
		place: "",
		summary: "",
		decisions: "",
		todo: "",
		nextDate: ""
	});
	const addMeeting = () => {
		if (!mForm.summary.trim()) {
			notify("⚠️ ملخص اللقاء مطلوب", "error");
			return;
		}
		setMeetings((p) => [...p, {
			id: uid(),
			...mForm,
			createdAt: Date.now()
		}]);
		setMForm({
			date: todayISO(),
			place: "",
			summary: "",
			decisions: "",
			todo: "",
			nextDate: ""
		});
		notify("✅ تم تسجيل اللقاء");
	};
	const sortedMeetings = (0, import_react.useMemo)(() => [...meetings].sort((a, b) => (b.date || "").localeCompare(a.date || "")), [meetings]);
	const [dForm, setDForm] = (0, import_react.useState)({
		subject: DECISION_SUBJECTS[0],
		type: "تمت الموافقة",
		text: "",
		date: todayISO()
	});
	const addDecision = () => {
		if (!dForm.text.trim()) {
			notify("⚠️ نص القرار مطلوب", "error");
			return;
		}
		setDecisions((p) => [...p, {
			id: uid(),
			...dForm,
			createdAt: Date.now()
		}]);
		setDForm({
			subject: DECISION_SUBJECTS[0],
			type: "تمت الموافقة",
			text: "",
			date: todayISO()
		});
		notify("✅ تم تسجيل القرار");
	};
	const [reportText, setReportText] = (0, import_react.useState)("");
	const generateReport = () => {
		const weekAgo = (/* @__PURE__ */ new Date()).getTime() - 10080 * 60 * 1e3;
		const total = combinedDocs.length;
		const thisWeek = combinedDocs.filter((d) => {
			const ts = d.createdAt || d.addedAt || d.uploadedAt || 0;
			return ts && ts >= weekAgo;
		}).length;
		const perChapter = (chapters || []).map((ch) => {
			const docsIn = combinedDocs.filter((d) => String(d.chapterId) === String(ch.id));
			const target = Math.max((ch.sections || []).length * 5, 10);
			const pct = Math.min(100, Math.round(docsIn.length / target * 100));
			return `  • ${ch.titleAr || ch.title || `الفصل ${ch.id}`}: ${docsIn.length} مصدر — ${pct}% إنجاز`;
		}).join("\n");
		const uploadedList = files.length ? files.map((f) => `  - ${chapterLabel(f.chapter)} | ${f.version} | ${f.fileName} [${f.status}]`).join("\n") : "  (لا يوجد)";
		const pendingQ = questions.filter((q) => q.status !== "answered").length;
		setReportText(`📊 تقرير الإنجاز الأسبوعي
════════════════════════════
📅 التاريخ: ${todayISO()}

📚 إجمالي المصادر: ${total}
🆕 المصادر المضافة هذا الأسبوع: ${thisWeek}
📋 الهوامش المستخرجة (مراجع نهائية): ${bibliography.length}

📖 حالة كل فصل:
${perChapter || "  (لا توجد فصول)"}

📄 الفصول المرفوعة للمراجعة:
${uploadedList}

❓ الاستفسارات المعلقة: ${pendingQ}
✅ القرارات الرسمية المسجلة: ${decisions.length}
🤝 اللقاءات المسجلة: ${meetings.length}
`);
		notify("✅ تم توليد التقرير");
	};
	const copyReport = async (txt) => {
		try {
			await navigator.clipboard.writeText(txt);
			notify("📋 تم نسخ التقرير");
		} catch {
			notify("⚠️ تعذر النسخ", "error");
		}
	};
	const saveReport = () => {
		if (!reportText.trim()) {
			notify("⚠️ ولّد التقرير أولاً", "error");
			return;
		}
		setReports((p) => [{
			id: uid(),
			date: todayISO(),
			text: reportText,
			createdAt: Date.now()
		}, ...p]);
		notify("💾 تم حفظ التقرير في السجل");
	};
	const TABS = [
		{
			id: "questions",
			label: "📝 الاستفسارات",
			count: questions.length
		},
		{
			id: "files",
			label: "📄 رفع الفصول",
			count: files.length
		},
		{
			id: "notes",
			label: "💬 ملاحظات المباحث",
			count: notes.length
		},
		{
			id: "meetings",
			label: "📅 اللقاءات",
			count: meetings.length
		},
		{
			id: "decisions",
			label: "✅ القرارات",
			count: decisions.length
		},
		{
			id: "report",
			label: "📊 التقرير الأسبوعي",
			count: reports.length
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		style: {
			fontFamily: FONT,
			direction: "rtl"
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				style: {
					background: PRIMARY,
					color: "white",
					borderRadius: 14,
					padding: "20px 22px",
					marginBottom: 16
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						alignItems: "center",
						gap: 12
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						style: { fontSize: 36 },
						children: "👨‍🏫"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						style: {
							fontSize: 22,
							fontWeight: 800,
							margin: 0
						},
						children: "غرفة المشرف الأكاديمي"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						style: {
							fontSize: 13,
							opacity: .85,
							marginTop: 4
						},
						children: "أ.م.د فواز موفق ذنون — جامعة الموصل"
					})] })]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				style: {
					display: "flex",
					gap: 6,
					flexWrap: "wrap",
					marginBottom: 16
				},
				children: TABS.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => setTab(t.id),
					style: {
						padding: "9px 14px",
						borderRadius: 10,
						border: "1px solid " + (tab === t.id ? PRIMARY : "#e2e8f0"),
						background: tab === t.id ? PRIMARY : "white",
						color: tab === t.id ? "white" : "#334155",
						cursor: "pointer",
						fontFamily: "inherit",
						fontSize: 13,
						fontWeight: 600
					},
					children: [
						t.label,
						" ",
						t.count > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							style: { opacity: .75 },
							children: [
								"(",
								t.count,
								")"
							]
						})
					]
				}, t.id))
			}),
			tab === "questions" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: cardSx,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						style: {
							marginTop: 0,
							color: PRIMARY
						},
						children: "📝 أسئلة واستفسارات المشرف"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						style: {
							display: "grid",
							gridTemplateColumns: "1fr 1fr",
							gap: 12,
							marginBottom: 12
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								style: labelSx,
								children: "الفصل المعني"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: qForm.chapter,
								onChange: (e) => setQForm({
									...qForm,
									chapter: e.target.value
								}),
								style: inputSx,
								children: CHAPTER_OPTIONS.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: c.v,
									children: c.l
								}, c.v))
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								style: labelSx,
								children: "نوع الملاحظة"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: qForm.type,
								onChange: (e) => setQForm({
									...qForm,
									type: e.target.value
								}),
								style: inputSx,
								children: Q_TYPES.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: t.v,
									children: t.v
								}, t.v))
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								style: labelSx,
								children: "تاريخ الاستفسار"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "date",
								value: qForm.date,
								onChange: (e) => setQForm({
									...qForm,
									date: e.target.value
								}),
								style: inputSx
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								style: labelSx,
								children: "الأولوية"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: qForm.priority,
								onChange: (e) => setQForm({
									...qForm,
									priority: e.target.value
								}),
								style: inputSx,
								children: PRIORITIES.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
									value: p.v,
									children: [
										p.icon,
										" ",
										p.v
									]
								}, p.v))
							})] })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						style: labelSx,
						children: "نص السؤال أو الاستفسار *"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						value: qForm.text,
						onChange: (e) => setQForm({
							...qForm,
							text: e.target.value
						}),
						rows: 3,
						style: {
							...inputSx,
							marginBottom: 12,
							resize: "vertical"
						},
						placeholder: "اكتب استفسار المشرف..."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: addQuestion,
						style: btnPrimary,
						children: "إضافة استفسار المشرف"
					})
				]
			}), sortedQuestions.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				style: {
					...cardSx,
					textAlign: "center",
					color: "#94a3b8"
				},
				children: "لا توجد استفسارات بعد"
			}) : sortedQuestions.map((q) => {
				const tInfo = Q_TYPES.find((t) => t.v === q.type) || Q_TYPES[0];
				const pInfo = PRIORITIES.find((p) => p.v === q.priority) || PRIORITIES[2];
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					style: {
						...cardSx,
						borderRight: `4px solid ${pInfo.color}`
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: 8,
								alignItems: "center",
								flexWrap: "wrap",
								marginBottom: 8
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									style: {
										background: tInfo.color,
										color: "white",
										padding: "3px 10px",
										borderRadius: 12,
										fontSize: 11,
										fontWeight: 600
									},
									children: q.type
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									style: {
										background: "#f1f5f9",
										color: "#475569",
										padding: "3px 10px",
										borderRadius: 12,
										fontSize: 11
									},
									children: chapterLabel(q.chapter)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									style: {
										fontSize: 12,
										color: pInfo.color,
										fontWeight: 600
									},
									children: [
										pInfo.icon,
										" ",
										q.priority
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									style: {
										fontSize: 11,
										color: "#94a3b8",
										marginInlineStart: "auto"
									},
									children: q.date
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							style: {
								fontSize: 13,
								color: "#1e293b",
								lineHeight: 1.7,
								marginBottom: 10,
								whiteSpace: "pre-wrap"
							},
							children: q.text
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								background: "#f8fafc",
								padding: 10,
								borderRadius: 8,
								marginBottom: 8
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								style: labelSx,
								children: "رد الطالب"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									gap: 6
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: q.reply || "",
									onChange: (e) => setQuestions((p) => p.map((x) => x.id === q.id ? {
										...x,
										reply: e.target.value
									} : x)),
									placeholder: "اكتب الرد هنا...",
									style: {
										...inputSx,
										flex: 1
									}
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => notify("💾 تم حفظ الرد"),
									style: btnGhost,
									children: "حفظ"
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: 8,
								alignItems: "center"
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setQuestions((p) => p.map((x) => x.id === q.id ? {
									...x,
									status: x.status === "answered" ? "pending" : "answered"
								} : x)),
								style: {
									...btnGhost,
									background: q.status === "answered" ? "#dcfce7" : "#fef9c3",
									color: q.status === "answered" ? "#16a34a" : "#92400e"
								},
								children: q.status === "answered" ? "تم الرد ✅" : "قيد المعالجة 🟡"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => confirmDelete("هل تريد حذف هذا الاستفسار؟", () => setQuestions((p) => p.filter((x) => x.id !== q.id))),
								style: {
									...btnDanger,
									marginInlineStart: "auto"
								},
								children: "🗑️ حذف"
							})]
						})
					]
				}, q.id);
			})] }),
			tab === "files" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: cardSx,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						style: {
							marginTop: 0,
							color: PRIMARY
						},
						children: "📄 رفع الفصول للمراجعة"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						style: {
							background: "#eff6ff",
							padding: 10,
							borderRadius: 8,
							fontSize: 12,
							color: "#1e40af",
							marginBottom: 12
						},
						children: "🔒 الملفات تُرفع لتخزين سحابي خاص يشاركه الطالب والمشرف فقط — لن تُرسل لأي ذكاء اصطناعي ولن يُحلَّل محتواها."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						style: {
							display: "grid",
							gridTemplateColumns: "1fr 1fr",
							gap: 12,
							marginBottom: 12
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								style: labelSx,
								children: "الفصل"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: fForm.chapter,
								onChange: (e) => setFForm({
									...fForm,
									chapter: e.target.value
								}),
								style: inputSx,
								children: CHAPTER_OPTIONS.filter((c) => c.v !== "general").map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: c.v,
									children: c.l
								}, c.v))
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								style: labelSx,
								children: "رقم النسخة"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: fForm.version,
								onChange: (e) => setFForm({
									...fForm,
									version: e.target.value
								}),
								placeholder: "مثال: النسخة الأولى",
								style: inputSx
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								style: labelSx,
								children: "تاريخ الرفع"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "date",
								value: fForm.date,
								onChange: (e) => setFForm({
									...fForm,
									date: e.target.value
								}),
								style: inputSx
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								style: labelSx,
								children: "ملف Word / PDF"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								id: "supervisor-file-input",
								type: "file",
								accept: ".docx,.doc,.pdf",
								onChange: onFilePick,
								style: {
									...inputSx,
									padding: 6
								}
							})] })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						style: labelSx,
						children: "ملاحظة مرفقة"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						value: fForm.note,
						onChange: (e) => setFForm({
							...fForm,
							note: e.target.value
						}),
						rows: 2,
						style: {
							...inputSx,
							marginBottom: 12,
							resize: "vertical"
						}
					}),
					pendingFile && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						style: {
							fontSize: 12,
							color: "#475569",
							marginBottom: 10
						},
						children: [
							"📎 جاهز للرفع: ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: pendingFile.name }),
							" (",
							Math.round(pendingFile.size / 1024),
							" KB)"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: uploadFile,
						style: btnPrimary,
						children: "رفع الفصل للمراجعة"
					})
				]
			}), Object.keys(filesByChapter).length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				style: {
					...cardSx,
					textAlign: "center",
					color: "#94a3b8"
				},
				children: "لا توجد ملفات مرفوعة بعد"
			}) : CHAPTER_OPTIONS.filter((c) => filesByChapter[c.v]).map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: cardSx,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h4", {
					style: {
						marginTop: 0,
						color: PRIMARY,
						fontSize: 14
					},
					children: [
						c.l,
						" (",
						filesByChapter[c.v].length,
						")"
					]
				}), filesByChapter[c.v].map((f) => {
					const st = FILE_STATUSES.find((s) => s.v === f.status) || FILE_STATUSES[0];
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						style: {
							borderTop: "1px solid #f1f5f9",
							padding: "10px 0"
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									gap: 8,
									alignItems: "center",
									flexWrap: "wrap",
									marginBottom: 6
								},
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", {
										style: { fontSize: 13 },
										children: ["📄 ", f.fileName]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										style: {
											fontSize: 11,
											color: "#64748b"
										},
										children: ["· ", f.version]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										style: {
											fontSize: 11,
											color: "#64748b"
										},
										children: ["· ", f.date]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										style: {
											fontSize: 11,
											color: "#64748b"
										},
										children: [
											"· ",
											Math.round(f.size / 1024),
											" KB"
										]
									})
								]
							}),
							f.note && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									fontSize: 12,
									color: "#475569",
									marginBottom: 6,
									background: "#f8fafc",
									padding: 6,
									borderRadius: 6
								},
								children: ["📝 ", f.note]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									gap: 8,
									alignItems: "center",
									flexWrap: "wrap"
								},
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
										value: f.status,
										onChange: (e) => setFiles((p) => p.map((x) => x.id === f.id ? {
											...x,
											status: e.target.value
										} : x)),
										style: {
											...inputSx,
											width: "auto",
											padding: "6px 10px",
											fontSize: 12,
											color: st.color,
											fontWeight: 600
										},
										children: FILE_STATUSES.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
											value: s.v,
											children: [
												s.icon,
												" ",
												s.v
											]
										}, s.v))
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => downloadFile(f),
										style: {
											...btnGhost,
											background: "#dbeafe",
											color: "#1e40af"
										},
										children: "📥 تحميل"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => confirmDelete(`حذف الملف "${f.fileName}"؟`, () => removeFileEntry(f)),
										style: {
											...btnDanger,
											marginInlineStart: "auto"
										},
										children: "🗑️ حذف"
									})
								]
							})
						]
					}, f.id);
				})]
			}, c.v))] }),
			tab === "notes" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: cardSx,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						style: {
							marginTop: 0,
							color: PRIMARY
						},
						children: "💬 ملاحظات المشرف على المباحث"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						style: {
							display: "grid",
							gridTemplateColumns: "1fr 1fr",
							gap: 12,
							marginBottom: 12
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								style: labelSx,
								children: "الفصل"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								value: nForm.chapterId,
								onChange: (e) => setNForm({
									...nForm,
									chapterId: e.target.value,
									sectionId: ""
								}),
								style: inputSx,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "",
									children: "— اختر —"
								}), chapters.map((ch) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: ch.id,
									children: ch.titleAr || ch.title || `الفصل ${ch.id}`
								}, ch.id))]
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								style: labelSx,
								children: "المبحث"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								value: nForm.sectionId,
								onChange: (e) => setNForm({
									...nForm,
									sectionId: e.target.value
								}),
								style: inputSx,
								disabled: !selectedChapter,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "",
									children: "— اختر —"
								}), selectedChapter?.sections?.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: s.id,
									children: s.title || s.id
								}, s.id))]
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								style: labelSx,
								children: "نوع الملاحظة"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: nForm.type,
								onChange: (e) => setNForm({
									...nForm,
									type: e.target.value
								}),
								style: inputSx,
								children: NOTE_TYPES.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: t.v,
									children: t.v
								}, t.v))
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								style: labelSx,
								children: "تاريخ الملاحظة"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "date",
								value: nForm.date,
								onChange: (e) => setNForm({
									...nForm,
									date: e.target.value
								}),
								style: inputSx
							})] })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						style: labelSx,
						children: "نص الملاحظة *"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						value: nForm.text,
						onChange: (e) => setNForm({
							...nForm,
							text: e.target.value
						}),
						rows: 3,
						style: {
							...inputSx,
							marginBottom: 12,
							resize: "vertical"
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: addNote,
						style: btnPrimary,
						children: "حفظ الملاحظة"
					})
				]
			}), Object.keys(notesByChapter).length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				style: {
					...cardSx,
					textAlign: "center",
					color: "#94a3b8"
				},
				children: "لا توجد ملاحظات بعد"
			}) : chapters.filter((ch) => notesByChapter[ch.id]).map((ch) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: cardSx,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
					style: {
						marginTop: 0,
						color: PRIMARY,
						fontSize: 14
					},
					children: ch.titleAr || ch.title || `الفصل ${ch.id}`
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					style: {
						borderInlineStart: `2px solid ${PRIMARY}`,
						paddingInlineStart: 14
					},
					children: notesByChapter[ch.id].map((n) => {
						const tInfo = NOTE_TYPES.find((t) => t.v === n.type) || NOTE_TYPES[0];
						const sec = ch.sections?.find((s) => s.id === n.sectionId);
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								padding: "10px 0",
								borderBottom: "1px dashed #e2e8f0"
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										gap: 8,
										alignItems: "center",
										flexWrap: "wrap",
										marginBottom: 6
									},
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											style: {
												background: tInfo.color,
												color: "white",
												padding: "2px 8px",
												borderRadius: 10,
												fontSize: 11,
												fontWeight: 600
											},
											children: n.type
										}),
										sec && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											style: {
												fontSize: 11,
												color: "#64748b"
											},
											children: sec.title
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											style: {
												fontSize: 11,
												color: "#94a3b8",
												marginInlineStart: "auto"
											},
											children: n.date
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										fontSize: 13,
										color: n.done ? "#94a3b8" : "#1e293b",
										textDecoration: n.done ? "line-through" : "none",
										lineHeight: 1.7,
										marginBottom: 6,
										whiteSpace: "pre-wrap"
									},
									children: n.text
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										gap: 8,
										alignItems: "center"
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										style: {
											fontSize: 12,
											display: "flex",
											gap: 6,
											alignItems: "center",
											cursor: "pointer"
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: !!n.done,
											onChange: (e) => setNotes((p) => p.map((x) => x.id === n.id ? {
												...x,
												done: e.target.checked
											} : x))
										}), "تم التنفيذ ✅"]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => confirmDelete("حذف هذه الملاحظة؟", () => setNotes((p) => p.filter((x) => x.id !== n.id))),
										style: {
											...btnDanger,
											marginInlineStart: "auto"
										},
										children: "🗑️"
									})]
								})
							]
						}, n.id);
					})
				})]
			}, ch.id))] }),
			tab === "meetings" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: cardSx,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						style: {
							marginTop: 0,
							color: PRIMARY
						},
						children: "📅 سجل لقاءات المشرف"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						style: {
							display: "grid",
							gridTemplateColumns: "1fr 1fr",
							gap: 12,
							marginBottom: 12
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							style: labelSx,
							children: "تاريخ اللقاء"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "date",
							value: mForm.date,
							onChange: (e) => setMForm({
								...mForm,
								date: e.target.value
							}),
							style: inputSx
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							style: labelSx,
							children: "مكان اللقاء"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: mForm.place,
							onChange: (e) => setMForm({
								...mForm,
								place: e.target.value
							}),
							placeholder: "مكتب المشرف، أونلاين...",
							style: inputSx
						})] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						style: labelSx,
						children: "ملخص اللقاء *"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						value: mForm.summary,
						onChange: (e) => setMForm({
							...mForm,
							summary: e.target.value
						}),
						rows: 2,
						style: {
							...inputSx,
							marginBottom: 10,
							resize: "vertical"
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						style: labelSx,
						children: "القرارات المتخذة"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						value: mForm.decisions,
						onChange: (e) => setMForm({
							...mForm,
							decisions: e.target.value
						}),
						rows: 2,
						style: {
							...inputSx,
							marginBottom: 10,
							resize: "vertical"
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						style: labelSx,
						children: "المطلوب للقاء القادم"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						value: mForm.todo,
						onChange: (e) => setMForm({
							...mForm,
							todo: e.target.value
						}),
						rows: 2,
						style: {
							...inputSx,
							marginBottom: 10,
							resize: "vertical"
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						style: labelSx,
						children: "تاريخ اللقاء القادم"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "date",
						value: mForm.nextDate,
						onChange: (e) => setMForm({
							...mForm,
							nextDate: e.target.value
						}),
						style: {
							...inputSx,
							marginBottom: 12
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: addMeeting,
						style: btnPrimary,
						children: "تسجيل اللقاء"
					})
				]
			}), sortedMeetings.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				style: {
					...cardSx,
					textAlign: "center",
					color: "#94a3b8"
				},
				children: "لا يوجد لقاءات مسجلة"
			}) : sortedMeetings.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: {
					...cardSx,
					borderInlineStart: `4px solid ${PRIMARY}`
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							gap: 10,
							alignItems: "center",
							flexWrap: "wrap",
							marginBottom: 8
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", {
							style: {
								fontSize: 14,
								color: PRIMARY
							},
							children: ["📅 ", m.date]
						}), m.place && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							style: {
								fontSize: 12,
								color: "#64748b"
							},
							children: ["📍 ", m.place]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						style: {
							fontSize: 13,
							marginBottom: 8,
							lineHeight: 1.7,
							whiteSpace: "pre-wrap"
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "الملخص:" }),
							" ",
							m.summary
						]
					}),
					m.decisions && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						style: {
							fontSize: 13,
							marginBottom: 8,
							lineHeight: 1.7,
							whiteSpace: "pre-wrap"
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "القرارات:" }),
							" ",
							m.decisions
						]
					}),
					m.todo && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						style: {
							fontSize: 13,
							marginBottom: 8,
							lineHeight: 1.7,
							whiteSpace: "pre-wrap"
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "المطلوب:" }),
							" ",
							m.todo
						]
					}),
					m.nextDate && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						style: {
							background: "#dbeafe",
							color: "#1e40af",
							padding: "6px 12px",
							borderRadius: 8,
							fontSize: 12,
							fontWeight: 600,
							display: "inline-block",
							marginTop: 4
						},
						children: ["📅 اللقاء القادم: ", m.nextDate]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						style: {
							marginTop: 10,
							textAlign: "end"
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => confirmDelete("حذف هذا اللقاء؟", () => setMeetings((p) => p.filter((x) => x.id !== m.id))),
							style: btnDanger,
							children: "🗑️ حذف"
						})
					})
				]
			}, m.id))] }),
			tab === "decisions" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: cardSx,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						style: {
							marginTop: 0,
							color: PRIMARY
						},
						children: "✅ قرارات المشرف النهائية"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						style: {
							display: "grid",
							gridTemplateColumns: "1fr 1fr",
							gap: 12,
							marginBottom: 12
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							style: labelSx,
							children: "يتعلق بـ"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							value: dForm.subject,
							onChange: (e) => setDForm({
								...dForm,
								subject: e.target.value
							}),
							style: inputSx,
							children: DECISION_SUBJECTS.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: s,
								children: s
							}, s))
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							style: labelSx,
							children: "نوع القرار"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							value: dForm.type,
							onChange: (e) => setDForm({
								...dForm,
								type: e.target.value
							}),
							style: inputSx,
							children: DECISION_TYPES.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
								value: t.v,
								children: [
									t.icon,
									" ",
									t.v
								]
							}, t.v))
						})] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						style: labelSx,
						children: "تاريخ القرار"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "date",
						value: dForm.date,
						onChange: (e) => setDForm({
							...dForm,
							date: e.target.value
						}),
						style: {
							...inputSx,
							marginBottom: 10
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						style: labelSx,
						children: "نص القرار الرسمي *"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						value: dForm.text,
						onChange: (e) => setDForm({
							...dForm,
							text: e.target.value
						}),
						rows: 3,
						style: {
							...inputSx,
							marginBottom: 12,
							resize: "vertical"
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: addDecision,
						style: btnPrimary,
						children: "تسجيل القرار"
					})
				]
			}), decisions.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				style: {
					...cardSx,
					textAlign: "center",
					color: "#94a3b8"
				},
				children: "لا توجد قرارات مسجلة"
			}) : [...decisions].sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((d) => {
				const tInfo = DECISION_TYPES.find((t) => t.v === d.type) || DECISION_TYPES[0];
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					style: {
						background: tInfo.bg,
						border: `2px solid ${tInfo.border}`,
						borderRadius: 12,
						padding: 16,
						marginBottom: 12
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: 10,
								alignItems: "center",
								flexWrap: "wrap",
								marginBottom: 8
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									style: {
										background: tInfo.border,
										color: "white",
										padding: "4px 12px",
										borderRadius: 12,
										fontSize: 12,
										fontWeight: 700
									},
									children: [
										tInfo.icon,
										" ",
										d.type
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
									style: { fontSize: 14 },
									children: d.subject
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									style: {
										fontSize: 11,
										color: "#64748b",
										marginInlineStart: "auto"
									},
									children: d.date
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							style: {
								fontSize: 13,
								lineHeight: 1.8,
								whiteSpace: "pre-wrap",
								color: "#1e293b"
							},
							children: d.text
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							style: {
								marginTop: 10,
								textAlign: "end"
							},
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => confirmDelete("حذف هذا القرار؟", () => setDecisions((p) => p.filter((x) => x.id !== d.id))),
								style: btnDanger,
								children: "🗑️ حذف"
							})
						})
					]
				}, d.id);
			})] }),
			tab === "report" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: cardSx,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						style: {
							marginTop: 0,
							color: PRIMARY
						},
						children: "📊 تقرير الإنجاز الأسبوعي"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: generateReport,
						style: btnPrimary,
						children: "توليد تقرير هذا الأسبوع"
					}),
					reportText && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
						style: {
							marginTop: 14,
							background: "#f8fafc",
							border: "1px solid #e2e8f0",
							borderRadius: 10,
							padding: 14,
							fontSize: 13,
							lineHeight: 1.9,
							whiteSpace: "pre-wrap",
							fontFamily: "inherit",
							color: "#1e293b"
						},
						children: reportText
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							gap: 10,
							marginTop: 10
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => copyReport(reportText),
							style: {
								...btnPrimary,
								background: "#10B981"
							},
							children: "📋 نسخ التقرير"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: saveReport,
							style: {
								...btnPrimary,
								background: "#8B5CF6"
							},
							children: "💾 حفظ في السجل"
						})]
					})] })
				]
			}), reports.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: cardSx,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h4", {
					style: {
						marginTop: 0,
						color: PRIMARY,
						fontSize: 14
					},
					children: [
						"📚 سجل التقارير (",
						reports.length,
						")"
					]
				}), reports.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					style: {
						borderTop: "1px solid #f1f5f9",
						padding: "10px 0"
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							gap: 8,
							alignItems: "center",
							marginBottom: 6
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", {
								style: {
									fontSize: 13,
									color: PRIMARY
								},
								children: ["📅 ", r.date]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => copyReport(r.text),
								style: {
									...btnGhost,
									marginInlineStart: "auto"
								},
								children: "📋 نسخ"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => confirmDelete("حذف هذا التقرير من السجل؟", () => setReports((p) => p.filter((x) => x.id !== r.id))),
								style: btnDanger,
								children: "🗑️"
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
						style: {
							background: "#f8fafc",
							borderRadius: 8,
							padding: 10,
							fontSize: 12,
							lineHeight: 1.7,
							whiteSpace: "pre-wrap",
							fontFamily: "inherit",
							color: "#475569",
							margin: 0
						},
						children: r.text
					})]
				}, r.id))]
			})] })
		]
	});
}
function NotificationBell({ onOpenSupervisor }) {
	const [count, setCount] = (0, import_react.useState)(0);
	const [items, setItems] = (0, import_react.useState)([]);
	const [open, setOpen] = (0, import_react.useState)(false);
	const [loading, setLoading] = (0, import_react.useState)(false);
	const rootRef = (0, import_react.useRef)(null);
	const refresh = (0, import_react.useCallback)(async () => {
		setLoading(true);
		try {
			const { count: c, items: i } = await loadNotifications({ limit: 15 });
			setCount(c);
			setItems(i);
		} catch (e) {
			console.warn("[NotificationBell.refresh]", e);
		} finally {
			setLoading(false);
		}
	}, []);
	(0, import_react.useEffect)(() => {
		refresh();
		const t = setInterval(refresh, 6e4);
		return () => clearInterval(t);
	}, [refresh]);
	(0, import_react.useEffect)(() => {
		if (!open) return;
		const handler = (e) => {
			if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [open]);
	const openItem = async (it) => {
		setOpen(false);
		await markAllNotificationsRead();
		setCount(0);
		setItems([]);
		if (onOpenSupervisor) onOpenSupervisor(it.tab);
	};
	const markRead = async () => {
		await markAllNotificationsRead();
		setCount(0);
		setItems([]);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		ref: rootRef,
		style: {
			position: "relative",
			display: "inline-block"
		},
		"data-testid": "notification-bell-root",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			onClick: () => setOpen((o) => !o),
			title: count > 0 ? `${count} إشعار جديد من المشرف` : "لا توجد إشعارات جديدة",
			"data-testid": "notification-bell-btn",
			style: {
				background: count > 0 ? "rgba(251,191,36,0.95)" : "rgba(255,255,255,0.15)",
				border: "1px solid rgba(255,255,255,0.3)",
				color: count > 0 ? "#1e293b" : "white",
				padding: "5px 9px",
				borderRadius: 6,
				cursor: "pointer",
				fontSize: 13,
				fontFamily: "inherit",
				fontWeight: 700,
				display: "flex",
				alignItems: "center",
				gap: 4,
				position: "relative",
				transition: "background 0.2s ease"
			},
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				style: { fontSize: 14 },
				children: "🔔"
			}), count > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				"data-testid": "notification-bell-count",
				style: {
					background: "#dc2626",
					color: "white",
					borderRadius: 999,
					padding: "1px 6px",
					fontSize: 10,
					minWidth: 18,
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
					lineHeight: 1.3
				},
				children: count > 99 ? "99+" : count
			})]
		}), open && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			"data-testid": "notification-bell-dropdown",
			dir: "rtl",
			style: {
				position: "absolute",
				top: "calc(100% + 6px)",
				left: 0,
				width: 340,
				maxHeight: 420,
				overflowY: "auto",
				background: "white",
				color: "#1e293b",
				borderRadius: 10,
				boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
				border: "1px solid #e2e8f0",
				zIndex: 1e3,
				fontFamily: "inherit"
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					style: {
						padding: "10px 14px",
						borderBottom: "1px solid #f1f5f9",
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center"
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						style: {
							fontWeight: 700,
							fontSize: 13
						},
						children: ["📬 صندوق الإشعارات", count > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							style: {
								marginRight: 6,
								color: "#dc2626",
								fontSize: 12
							},
							children: [
								"(",
								count,
								")"
							]
						})]
					}), count > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: markRead,
						"data-testid": "notification-mark-all-read",
						style: {
							background: "transparent",
							border: "1px solid #e2e8f0",
							color: "#64748b",
							padding: "3px 8px",
							borderRadius: 5,
							cursor: "pointer",
							fontSize: 10,
							fontFamily: "inherit"
						},
						children: "تعليم الكل مقروء"
					})]
				}),
				loading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					style: {
						padding: 16,
						textAlign: "center",
						color: "#94a3b8",
						fontSize: 12
					},
					children: "جاري التحميل…"
				}),
				!loading && items.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					style: {
						padding: 24,
						textAlign: "center",
						color: "#94a3b8",
						fontSize: 12
					},
					"data-testid": "notification-empty",
					children: ["✅ لا توجد إشعارات جديدة", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						style: {
							fontSize: 10,
							marginTop: 4,
							opacity: .8
						},
						children: "ستظهر هنا كل ملاحظة أو سؤال يرسله المشرف"
					})]
				}),
				!loading && items.map((it, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => openItem(it),
					"data-testid": "notification-item",
					style: {
						display: "block",
						width: "100%",
						textAlign: "right",
						background: "transparent",
						border: "none",
						borderBottom: "1px solid #f8fafc",
						padding: "10px 14px",
						cursor: "pointer",
						fontFamily: "inherit",
						fontSize: 12
					},
					onMouseEnter: (e) => e.currentTarget.style.background = "#f8fafc",
					onMouseLeave: (e) => e.currentTarget.style.background = "transparent",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								alignItems: "center",
								gap: 6,
								marginBottom: 3
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									style: { fontSize: 14 },
									children: it.icon
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									style: {
										fontWeight: 700,
										color: "#1e3a5f"
									},
									children: it.label
								}),
								it.chapter && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									style: {
										background: "#eff6ff",
										color: "#3B82F6",
										padding: "1px 6px",
										borderRadius: 4,
										fontSize: 10
									},
									children: it.chapter
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							style: {
								color: "#334155",
								lineHeight: 1.6,
								overflow: "hidden",
								display: "-webkit-box",
								WebkitBoxOrient: "vertical",
								WebkitLineClamp: 2,
								textOverflow: "ellipsis"
							},
							children: it.title
						}),
						it.date && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								color: "#94a3b8",
								fontSize: 10,
								marginTop: 3
							},
							children: ["📅 ", it.date]
						})
					]
				}, `${it.table}-${it.id}-${idx}`))
			]
		})]
	});
}
var HEADER_ALIASES = {
	serial: [
		"م",
		"#",
		"الرقم"
	],
	title: [
		"عنوان الملف",
		"العنوان",
		"اسم الملف",
		"عنوان المصدر",
		"عنوان الوثيقة"
	],
	archiveRef: [
		"المرجع الأرشيفي",
		"المرجع",
		"الرقم الأرشيفي",
		"رقم الوثيقة",
		"رقم الوثيقة الأرشيفية"
	],
	sectionText: [
		"المبحث في خطتك",
		"المبحث",
		"الفرع",
		"المبحث في الخطة"
	],
	subElement: [
		"العنصر الفرعي",
		"الفقرة",
		"المطلب",
		"العنصر"
	],
	priority: ["الأولوية", "الأهمية"],
	sourceType: [
		"نوع الوثيقة",
		"نوع المصدر",
		"النوع",
		"التصنيف"
	],
	isNew: ["جديد؟", "جديد"],
	status: ["الحالة"],
	importantPages: [
		"الأوراق المفيدة",
		"الصفحات المفيدة",
		"الأوراق",
		"الصفحات"
	],
	notes: ["ملاحظات", "الملاحظات"]
};
var AR_ORDINALS = {
	"الأول": 1,
	"الاول": 1,
	"الأولى": 1,
	"الاولى": 1,
	"الثاني": 2,
	"الثانية": 2,
	"الثالث": 3,
	"الثالثة": 3,
	"الرابع": 4,
	"الرابعة": 4,
	"الخامس": 5,
	"الخامسة": 5,
	"السادس": 6,
	"السادسة": 6,
	"السابع": 7,
	"السابعة": 7,
	"الثامن": 8,
	"الثامنة": 8,
	"التاسع": 9,
	"التاسعة": 9,
	"العاشر": 10,
	"العاشرة": 10
};
var HEADER_SCAN_LIMIT = 15;
var clean = (v) => v == null ? "" : String(v).replace(/\s+/g, " ").trim();
function normalizeAr(s) {
	return clean(s).replace(/[\u064B-\u0652\u0670]/g, "").replace(/[إأآا]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/[«»"'،.؛:؟]/g, "").toLowerCase();
}
function fieldOfCell(cellNorm) {
	if (!cellNorm) return null;
	for (const [field, aliases] of Object.entries(HEADER_ALIASES)) for (const a of aliases) {
		const an = normalizeAr(a);
		if (!an) continue;
		if (cellNorm === an || cellNorm.includes(an) || an.includes(cellNorm)) return field;
	}
	return null;
}
function detectHeaderRow(rows) {
	const scanLimit = Math.min(rows.length, HEADER_SCAN_LIMIT);
	for (let r = 0; r < scanLimit; r++) {
		const cells = (rows[r] || []).map(clean);
		if (!cells.length) continue;
		const cellsNorm = cells.map(normalizeAr);
		const columnMap = {};
		for (let c = 0; c < cellsNorm.length; c++) {
			const f = fieldOfCell(cellsNorm[c]);
			if (f && columnMap[f] == null) columnMap[f] = c;
		}
		const hasTitleOrRef = columnMap.title != null || columnMap.archiveRef != null;
		const otherCount = Object.keys(columnMap).filter((k) => k !== "title" && k !== "archiveRef").length;
		if (hasTitleOrRef && otherCount >= 1) return {
			rowIndex: r,
			columnMap
		};
	}
	return null;
}
function matchChapter(sheetName, chapters = []) {
	const name = clean(sheetName);
	const nameNorm = normalizeAr(name);
	const ordMatch = Object.keys(AR_ORDINALS).find((ord) => nameNorm.includes(normalizeAr(ord)));
	if (ordMatch) {
		const n = AR_ORDINALS[ordMatch];
		const hit = chapters.find((c) => Number(c.id) === n);
		if (hit) return {
			chapterId: hit.id,
			chapterTitle: hit.titleAr
		};
	}
	const digitMatch = name.match(/\d+/);
	if (digitMatch) {
		const n = Number(digitMatch[0]);
		const hit = chapters.find((c) => Number(c.id) === n);
		if (hit) return {
			chapterId: hit.id,
			chapterTitle: hit.titleAr
		};
	}
	const sub = chapters.find((c) => {
		const t = normalizeAr(c.titleAr || "");
		return t && (t.includes(nameNorm) || nameNorm.includes(t));
	});
	if (sub) return {
		chapterId: sub.id,
		chapterTitle: sub.titleAr
	};
	return {
		chapterId: null,
		chapterTitle: null
	};
}
function matchSection(sectionText, chapter) {
	if (!chapter || !sectionText) return {
		sectionId: null,
		sectionTitle: null
	};
	const secs = chapter.sections || [];
	if (!secs.length) return {
		sectionId: null,
		sectionTitle: null
	};
	const raw = clean(sectionText);
	if (!raw) return {
		sectionId: null,
		sectionTitle: null
	};
	const numMatch = raw.match(/م\s*(\d+)/);
	if (numMatch) {
		const wantId = `${chapter.id}-${numMatch[1]}`;
		const hit = secs.find((s) => String(s.id) === wantId);
		if (hit) return {
			sectionId: hit.id,
			sectionTitle: hit.title
		};
	}
	const stripSectionPrefix = (t) => String(t || "").replace(/^\s*↳\s*/, "").replace(/^\s*م\s*\d+\s*[:：\-]?\s*/, "").trim();
	const qStripped = normalizeAr(stripSectionPrefix(raw));
	if (qStripped) {
		const hit = secs.find((s) => {
			const t = normalizeAr(stripSectionPrefix(s.title || ""));
			if (!t) return false;
			return t === qStripped || t.includes(qStripped) || qStripped.includes(t);
		});
		if (hit) return {
			sectionId: hit.id,
			sectionTitle: hit.title
		};
	}
	const AR_STOP = new Set([
		"في",
		"من",
		"على",
		"الى",
		"إلى",
		"عن",
		"مع",
		"بين",
		"او",
		"أو",
		"و",
		"أن",
		"ان",
		"ما",
		"هذا",
		"هذه",
		"ذلك",
		"تلك",
		"هو",
		"هي",
		"التي",
		"الذي",
		"الذين",
		"اللواتي",
		"بعد",
		"قبل",
		"خلال",
		"ضمن",
		"حول",
		"نحو",
		"دون",
		"تحت",
		"فوق",
		"الى",
		"الى",
		"ما",
		"لم",
		"لا",
		"لن",
		"قد",
		"الخليج",
		"العربي",
		"الحرب",
		"العالمية",
		"الثانية",
		"الفصل",
		"المبحث"
	]);
	const toTokens = (t) => normalizeAr(stripSectionPrefix(t)).split(/\s+/).filter((w) => w.length >= 3 && !AR_STOP.has(w));
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
		if (best) return {
			sectionId: best.id,
			sectionTitle: best.title
		};
	}
	return {
		sectionId: null,
		sectionTitle: null
	};
}
function normalizePriority(raw) {
	const s = clean(raw);
	if (!s) return {
		stars: "★★",
		numeric: 2
	};
	const starCount = (s.match(/★/g) || []).length;
	if (starCount >= 3) return {
		stars: "★★★",
		numeric: 3
	};
	if (starCount === 2) return {
		stars: "★★",
		numeric: 2
	};
	if (starCount === 1) return {
		stars: "★",
		numeric: 1
	};
	const n = parseInt(s, 10);
	if (n === 3) return {
		stars: "★★★",
		numeric: 3
	};
	if (n === 2) return {
		stars: "★★",
		numeric: 2
	};
	if (n === 1) return {
		stars: "★",
		numeric: 1
	};
	return {
		stars: "★★",
		numeric: 2
	};
}
function qdlUrlForRef(archiveRef) {
	const r = clean(archiveRef);
	if (!r || !/^IOR\//i.test(r)) return null;
	return `https://www.qdl.qa/en/search#q=${encodeURIComponent(r)}&start=0`;
}
async function parseLibraryExcel(file, { chapters = [] } = {}) {
	const wb = readSync(await file.arrayBuffer(), { type: "array" });
	const dataSheets = [];
	const skippedSheets = [];
	const sheetErrors = [];
	const rowErrors = [];
	let scannedRowCount = 0;
	for (const sheetName of wb.SheetNames) try {
		const ws = wb.Sheets[sheetName];
		const aoa = utils.sheet_to_json(ws, {
			header: 1,
			defval: null,
			blankrows: true
		});
		if (!aoa || !aoa.length) {
			skippedSheets.push({
				sheetName,
				reason: "فارغة"
			});
			continue;
		}
		const header = detectHeaderRow(aoa);
		if (!header) {
			skippedSheets.push({
				sheetName,
				reason: "لا يحتوي على أعمدة عنوان الملف/المرجع الأرشيفي في أول 15 صفاً"
			});
			continue;
		}
		const { chapterId, chapterTitle } = matchChapter(sheetName, chapters);
		const chapter = chapters.find((c) => c.id === chapterId) || null;
		const colMap = header.columnMap;
		const rows = [];
		for (let r = header.rowIndex + 1; r < aoa.length; r++) {
			const row = aoa[r];
			if (!row || row.every((v) => v == null || String(v).trim() === "")) continue;
			scannedRowCount += 1;
			try {
				const cell = (field) => colMap[field] != null ? clean(row[colMap[field]]) : "";
				const title = cell("title");
				const archiveRef = cell("archiveRef");
				if (!title && !archiveRef) continue;
				const priority = normalizePriority(cell("priority"));
				const sectionText = cell("sectionText");
				const { sectionId, sectionTitle } = matchSection(sectionText, chapter);
				const url = qdlUrlForRef(archiveRef);
				rows.push({
					rowIndex: r + 1,
					title,
					archiveRef,
					sectionText,
					subElement: cell("subElement"),
					priorityStars: priority.stars,
					priorityNumeric: priority.numeric,
					sourceType: cell("sourceType"),
					isNew: cell("isNew"),
					status: cell("status"),
					importantPages: cell("importantPages"),
					notes: cell("notes"),
					url,
					sectionIdMatched: sectionId,
					sectionTitleMatched: sectionTitle
				});
			} catch (rowErr) {
				rowErrors.push({
					sheetName,
					rowIndex: r + 1,
					reason: rowErr?.message || String(rowErr)
				});
			}
		}
		dataSheets.push({
			sheetName,
			chapterId,
			chapterTitle,
			rows
		});
	} catch (sheetErr) {
		sheetErrors.push({
			sheetName,
			reason: sheetErr?.message || String(sheetErr)
		});
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
			sheetCount: wb.SheetNames.length
		}
	};
}
var REF_TAG = "المرجع الأرشيفي:";
function buildNotesWithRef(archiveRef, originalNotes) {
	const ref = clean(archiveRef);
	const notes = clean(originalNotes);
	const parts = [];
	if (ref) parts.push(`${REF_TAG} ${ref}`);
	if (notes) parts.push(`ملاحظات: ${notes}`);
	return parts.join("\n\n");
}
function extractRefFromNotes(notes) {
	const m = String(notes || "").match(new RegExp(`${REF_TAG}\\s*([^\\n]+)`));
	return m ? clean(m[1]) : "";
}
var CHAPTERS_DATA = [
	{
		id: 1,
		titleAr: "الفصل الأول: أوضاع منطقة الخليج العربي عشية الحرب العالمية الثانية (1918-1939)",
		color: "#3B82F6",
		sections: [
			{
				id: "1-1",
				title: "م1: الموقع الجغرافي وممرات التجارة العالمية في منطقة الخليج العربي"
			},
			{
				id: "1-2",
				title: "م2: بنية الإمارات ومشيخات الخليج العربي السياسية حتى عام 1939"
			},
			{
				id: "1-3",
				title: "م3: مظاهر التنافس الدولي في الخليج العربي قبيل اندلاع الحرب العالمية الثانية"
			},
			{
				id: "1-4",
				title: "م4: الأوضاع الاقتصادية وبداية التغير الاقتصادي قبل اكتشاف النفط واستغلاله"
			}
		]
	},
	{
		id: 2,
		titleAr: "الفصل الثاني: أهمية منطقة الخليج العربي الاستراتيجية والعسكرية إبان الحرب العالمية الثانية",
		color: "#8B5CF6",
		sections: [
			{
				id: "2-1",
				title: "م1: موقع الخليج العربي الاستراتيجي في خطط الحلفاء العسكرية"
			},
			{
				id: "2-1a",
				title: "   ↳ إنشاء وتطوير القواعد البريطانية والأمريكية الجوية والبحرية"
			},
			{
				id: "2-1b",
				title: "   ↳ الأدوار العسكرية للقواعد في حماية طرق النفط والإمدادات"
			},
			{
				id: "2-1c",
				title: "   ↳ التنسيق العسكري بين بريطانيا والولايات المتحدة في الخليج"
			},
			{
				id: "2-2",
				title: "م2: القواعد العسكرية وموانئ الخليج ودورها في العمليات الحربية"
			},
			{
				id: "2-2a",
				title: "   ↳ دور موانئ البحرين والكويت ومسقط في دعم الحلفاء"
			},
			{
				id: "2-2b",
				title: "   ↳ استخدام الطرق البحرية لنقل النفط والعتاد العسكري"
			},
			{
				id: "2-2c",
				title: "   ↳ الأمن البحري ومواجهة التهديدات الألمانية واليابانية في المحيط الهندي"
			},
			{
				id: "2-3",
				title: "م3: السيادة والسيطرة البحرية والأمن العسكري في الخليج إبان الحرب"
			},
			{
				id: "2-3a",
				title: "   ↳ تعزيز السيطرة البحرية البريطانية في الخليج العربي"
			},
			{
				id: "2-3b",
				title: "   ↳ أهمية الخليج في تأمين طرق الملاحة وخطوط الإمداد العسكرية"
			},
			{
				id: "2-3c",
				title: "   ↳ الإجراءات الأمنية والعسكرية لحماية المصالح الاستراتيجية"
			}
		]
	},
	{
		id: 3,
		titleAr: "الفصل الثالث: أثر الحرب العالمية الثانية على الأوضاع السياسية في منطقة الخليج",
		color: "#10B981",
		sections: [
			{
				id: "3-1",
				title: "م1: التغيرات السياسية والإدارية في إمارات الخليج إبان الحرب"
			},
			{
				id: "3-1a",
				title: "   ↳ سياسة الحياد وميل بعض الأطراف الخليجية نحو الحلفاء"
			},
			{
				id: "3-1b",
				title: "   ↳ العلاقات الدبلوماسية مع بريطانيا والولايات المتحدة"
			},
			{
				id: "3-1c",
				title: "   ↳ الدور السياسي للملك عبد العزيز آل سعود في التوازن الإقليمي"
			},
			{
				id: "3-2",
				title: "م2: تأثير الحرب على الوعي السياسي وبداية التحولات الحديثة في الخليج"
			},
			{
				id: "3-2a",
				title: "   ↳ تنامي الوعي السياسي في مجتمعات الخليج خلال سنوات الحرب"
			},
			{
				id: "3-2b",
				title: "   ↳ تأثير المتغيرات الاقتصادية في بروز بوادر التحول الحديث"
			},
			{
				id: "3-2c",
				title: "   ↳ بداية تشكّل علاقات سياسية وإدارية جديدة مهّدت لمرحلة التحديث"
			},
			{
				id: "3-3",
				title: "م3: أثر الحرب على العلاقات الخليجية مع دول الحرب (الحلفاء والمحور)"
			},
			{
				id: "3-3a",
				title: "   ↳ طبيعة العلاقة مع القوى الكبرى أثناء الحرب"
			},
			{
				id: "3-3b",
				title: "   ↳ محاولات دول المحور اختراق النفوذ البريطاني في المنطقة"
			},
			{
				id: "3-3c",
				title: "   ↳ تعزيز النفوذ البريطاني والأمريكي بعد عام 1943م"
			}
		]
	},
	{
		id: 4,
		titleAr: "الفصل الرابع: التحولات الاقتصادية في الخليج إبان الحرب العالمية الثانية",
		color: "#F59E0B",
		sections: [
			{
				id: "4-1",
				title: "م1: أثر الحرب العالمية الثانية في التجارة والملاحة في الخليج"
			},
			{
				id: "4-1a",
				title: "   ↳ تأثير الحرب في حركة التجارة البحرية في الخليج العربي"
			},
			{
				id: "4-1b",
				title: "   ↳ التغيرات التي طرأت على الملاحة وطرق النقل البحري"
			},
			{
				id: "4-1c",
				title: "   ↳ انعكاسات ظروف الحرب في الموانئ والأسواق التجارية"
			},
			{
				id: "4-2",
				title: "م2: النفط في الخليج ودوره في الاستراتيجية الاقتصادية للحلفاء"
			},
			{
				id: "4-2a",
				title: "   ↳ بدايات التنقيب عن النفط في السعودية والبحرين والكويت"
			},
			{
				id: "4-2b",
				title: "   ↳ الشركات الأجنبية والامتيازات النفطية في ظل الحرب"
			},
			{
				id: "4-2c",
				title: "   ↳ النفط كمورد استراتيجي رئيسي للحلفاء أثناء الحرب"
			},
			{
				id: "4-3",
				title: "م3: انعكاسات الحرب على البنية الاقتصادية المحلية في مجتمعات الخليج"
			},
			{
				id: "4-3a",
				title: "   ↳ التغير في حركة التجارة الإقليمية بسبب الحرب"
			},
			{
				id: "4-3b",
				title: "   ↳ تأثير الحصار البحري وارتفاع الطلب العالمي على النفط"
			},
			{
				id: "4-3c",
				title: "   ↳ نشوء البنية التحتية الاقتصادية الحديثة بعد انتهاء الحرب"
			}
		]
	}
];
var SECTION_MAP = {};
CHAPTERS_DATA.forEach((ch) => ch.sections.forEach((s) => {
	SECTION_MAP[s.id] = {
		chapterId: ch.id,
		sectionTitle: s.title
	};
}));
CHAPTERS_DATA.flatMap((ch) => ch.sections.filter((s) => !s.id.includes("a") && !s.id.includes("b") && !s.id.includes("c")));
var DOCS_FROM_INDEX = [
	{
		id: 1,
		title: "دليل الخليج، مجلد II، الخصائص الجغرافية والإحصائية (لوريمر 1908)",
		archiveRef: "IOR/L/PS/20/C91/4",
		chapterId: 1,
		sectionId: "1-1",
		section: "م1: الموقع الجغرافي وممرات التجارة العالمية",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: false,
		status: "لم يُراجع",
		notes: "المرجع الجغرافي الأهم للخليج قبل الحرب — لا غنى عنه لوصف الموقع"
	},
	{
		id: 2,
		title: "مجموعة المعاهدات والالتزامات، المجلد 11 (الخليج ومسقط)",
		archiveRef: "IOR/L/PS/20/G3/12",
		chapterId: 1,
		sectionId: "1-2",
		section: "م2: بنية الإمارات ومشيخات الخليج السياسية حتى 1939",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: false,
		status: "لم يُراجع",
		notes: "نصوص المعاهدات المؤسِّسة: السلم البحري 1853، الأنجلو-قطرية 1916"
	},
	{
		id: 3,
		title: "مذكرة ملخص معاهدات الخليج (جيبسون ومونتيث، بطلب ابن سعود)",
		archiveRef: "IOR/L/PS/18/B387",
		chapterId: 1,
		sectionId: "1-2",
		section: "م2: بنية الإمارات ومشيخات الخليج السياسية حتى 1939",
		priority: "★★",
		category: "مصدر أولي",
		isNew: false,
		status: "لم يُراجع",
		notes: "ملخص نظام المعاهدات 1926-1927 — خلفية للبنية السياسية عشية الحرب"
	},
	{
		id: 4,
		title: "مسؤول الدفاع، الخليج الفارسي. قائد المحطة بالبحرين",
		archiveRef: "IOR/R/15/2/656",
		chapterId: 2,
		sectionId: "2-1",
		section: "م1: الموقع الاستراتيجي في خطط الحلفاء العسكرية — إنشاء وتطوير القواعد",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: false,
		status: "لم يُراجع",
		notes: "إنشاء وتطوير القواعد البريطانية"
	},
	{
		id: 5,
		title: "الدفاع ضد قوات المظلات وإعاقة المطارات",
		archiveRef: "IOR/R/15/2/659",
		chapterId: 2,
		sectionId: "2-1",
		section: "م1: الموقع الاستراتيجي — الأدوار العسكرية للقواعد",
		priority: "★★",
		category: "مصدر أولي",
		isNew: false,
		status: "لم يُراجع",
		notes: ""
	},
	{
		id: 6,
		title: "زيارة طائرات معادية للبحرين 28/1 P",
		archiveRef: "IOR/R/15/2/669",
		chapterId: 2,
		sectionId: "2-1",
		section: "م1: الموقع الاستراتيجي — الأدوار العسكرية للقواعد",
		priority: "★★",
		category: "مصدر أولي",
		isNew: false,
		status: "لم يُراجع",
		notes: ""
	},
	{
		id: 7,
		title: "سياسة دفاع للخليج 28/75 (مذكرة فاول 1938: حقول النفط من الكويت إلى مسقط)",
		archiveRef: "IOR/R/15/2/762",
		chapterId: 2,
		sectionId: "2-1",
		section: "م1: الموقع الاستراتيجي — التنسيق العسكري بريطانيا-أمريكا",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: false,
		status: "لم يُراجع",
		notes: "التنسيق العسكري — يشمل كل الخليج من الكويت لمسقط"
	},
	{
		id: 8,
		title: "العلاقات الأنجلو-أمريكية (سياسة) 28/51",
		archiveRef: "IOR/R/15/2/743",
		chapterId: 2,
		sectionId: "2-1",
		section: "م1: الموقع الاستراتيجي — التنسيق العسكري بريطانيا-أمريكا",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: false,
		status: "لم يُراجع",
		notes: "التنسيق السياسي والعسكري الأنجلو-أمريكي في الخليج"
	},
	{
		id: 9,
		title: "الملف 7 (سلاح الجو الملكي RAF) - مجموعة كاملة IOR/R/15/2/259-293",
		archiveRef: "IOR/R/15/2/259-293",
		chapterId: 2,
		sectionId: "2-1",
		section: "م1: الموقع الاستراتيجي — إنشاء وتطوير القواعد الجوية والبحرية",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: true,
		status: "لم يُراجع",
		notes: "كنز للفصل الثاني — مجموعة RAF الكاملة في البحرين"
	},
	{
		id: 10,
		title: "الملف 7/5 اقتراح إنشاء قاعدة RAF في البحرين",
		archiveRef: "IOR/R/15/2/271",
		chapterId: 2,
		sectionId: "2-1",
		section: "م1: الموقع الاستراتيجي — إنشاء وتطوير القواعد الجوية والبحرية",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: true,
		status: "لم يُراجع",
		notes: ""
	},
	{
		id: 11,
		title: "استبدال وحدة طائرات مائية بوحدة برية في البحرين (إعفاء RAF الجمركي)",
		archiveRef: "IOR/L/PS/12/1998",
		chapterId: 2,
		sectionId: "2-1",
		section: "م1: الموقع الاستراتيجي — إنشاء وتطوير القواعد الجوية والبحرية",
		priority: "★★",
		category: "مصدر أولي",
		isNew: true,
		status: "لم يُراجع",
		notes: ""
	},
	{
		id: 12,
		title: "خريطة أراضي RAF في المحرّق بالبحرين",
		archiveRef: "IOR/R/15/2/262",
		chapterId: 2,
		sectionId: "2-1",
		section: "م1: الموقع الاستراتيجي — إنشاء وتطوير القواعد الجوية والبحرية",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: true,
		status: "لم يُراجع",
		notes: "تطوير قاعدة المحرّق الجوية — وثيقة خرائطية نادرة"
	},
	{
		id: 13,
		title: "ملف 7/10 حوادث طائرات سلاح الجو الملكي",
		archiveRef: "IOR/R/15/2/275",
		chapterId: 2,
		sectionId: "2-2",
		section: "م2: القواعد العسكرية وموانئ الخليج — الأمن الجوي والعمليات",
		priority: "★★",
		category: "مصدر أولي",
		isNew: true,
		status: "لم يُراجع",
		notes: ""
	},
	{
		id: 14,
		title: "ملف 7/11 رحلات طائرات مجهولة الهوية",
		archiveRef: "IOR/R/15/2/276",
		chapterId: 2,
		sectionId: "2-2",
		section: "م2: القواعد العسكرية وموانئ الخليج — الأمن البحري ومواجهة التهديدات",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: true,
		status: "لم يُراجع",
		notes: "مواجهة التهديدات الألمانية واليابانية"
	},
	{
		id: 15,
		title: "ملف 8/16 ملخصات استخباراتية بشأن البحرين 1943-44",
		archiveRef: "IOR/R/15/2 (8/16)",
		chapterId: 2,
		sectionId: "2-2",
		section: "م2: القواعد العسكرية وموانئ الخليج — الأمن البحري ومواجهة التهديدات",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: true,
		status: "لم يُراجع",
		notes: ""
	},
	{
		id: 16,
		title: "ملف 28/17-B الإجراءات عند دخول اليابان الحرب",
		archiveRef: "IOR/R/15/2/706",
		chapterId: 2,
		sectionId: "2-2",
		section: "م2: القواعد العسكرية وموانئ الخليج — الأمن البحري / التهديد الياباني",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: true,
		status: "لم يُراجع",
		notes: "مواجهة التهديد الياباني في المحيط الهندي"
	},
	{
		id: 17,
		title: "مرافق تخزين نفط للجيش الأمريكي في المحرّق 28/74",
		archiveRef: "IOR/R/15/2/761",
		chapterId: 2,
		sectionId: "2-2",
		section: "م2: القواعد العسكرية وموانئ الخليج — دور موانئ البحرين في دعم الحلفاء",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: false,
		status: "لم يُراجع",
		notes: "دور موانئ البحرين في دعم الحلفاء"
	},
	{
		id: 18,
		title: "مراقب بحري أمريكي في البحرين 28/23",
		archiveRef: "IOR/R/15/2/715",
		chapterId: 2,
		sectionId: "2-2",
		section: "م2: القواعد العسكرية وموانئ الخليج — الأمن البحري ومواجهة التهديدات",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: false,
		status: "لم يُراجع",
		notes: ""
	},
	{
		id: 19,
		title: "تشريعات طوارئ الحرب 28/34-(i)",
		archiveRef: "IOR/R/15/2/726",
		chapterId: 2,
		sectionId: "2-3",
		section: "م3: السيادة والسيطرة البحرية — تعزيز السيطرة البريطانية",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: false,
		status: "لم يُراجع",
		notes: "تعزيز السيطرة البحرية البريطانية في الخليج"
	},
	{
		id: 20,
		title: "تشريعات طوارئ الحرب 28/34-II",
		archiveRef: "IOR/R/15/2/727",
		chapterId: 2,
		sectionId: "2-3",
		section: "م3: السيادة والسيطرة البحرية — تعزيز السيطرة البريطانية",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: false,
		status: "لم يُراجع",
		notes: ""
	},
	{
		id: 21,
		title: "إجراءات الدفاع في الخليج - البحرين 28/16 I",
		archiveRef: "IOR/R/15/2/703",
		chapterId: 2,
		sectionId: "2-3",
		section: "م3: السيادة والسيطرة البحرية — تأمين طرق الملاحة وخطوط الإمداد",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: false,
		status: "لم يُراجع",
		notes: "تأمين طرق الملاحة وخطوط الإمداد العسكرية"
	},
	{
		id: 22,
		title: "الحرب: البروباغندا: الرأي المحلي I",
		archiveRef: "IOR/R/15/2/687",
		chapterId: 3,
		sectionId: "3-2",
		section: "م2: تأثير الحرب على الوعي السياسي — تنامي الوعي السياسي",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: false,
		status: "لم يُراجع",
		notes: "تنامي الوعي السياسي في مجتمعات الخليج"
	},
	{
		id: 23,
		title: "الحرب: البروباغندا - الرأي المحلي II",
		archiveRef: "IOR/R/15/2/688",
		chapterId: 3,
		sectionId: "3-2",
		section: "م2: تأثير الحرب على الوعي السياسي — تنامي الوعي السياسي",
		priority: "★★",
		category: "مصدر أولي",
		isNew: false,
		status: "لم يُراجع",
		notes: ""
	},
	{
		id: 24,
		title: "ملف 1/A/50 الدعاية والنشر (البروباغندا البريطانية)",
		archiveRef: "IOR/R/15/2 (1/A/50)",
		chapterId: 3,
		sectionId: "3-2",
		section: "م2: تأثير الحرب على الوعي السياسي — البروباغندا وصحيفة البحرين",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: true,
		status: "لم يُراجع",
		notes: "البروباغندا البريطانية وأثرها في الوعي السياسي المحلي"
	},
	{
		id: 25,
		title: "ملف 46/11 الدعاية في الخليج الفارسي",
		archiveRef: "IOR/R/15/6/397",
		chapterId: 3,
		sectionId: "3-2",
		section: "م2: تأثير الحرب على الوعي السياسي — البروباغندا (مجلات العرب والنفير)",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: true,
		status: "لم يُراجع",
		notes: "مجلات البروباغندا البريطانية (العرب، النفير) في الخليج"
	},
	{
		id: 26,
		title: "أنشطة عبد الله بن فارس (سكرتير شيخ الشارقة)",
		archiveRef: "IOR/R/15/2/694",
		chapterId: 3,
		sectionId: "3-3",
		section: "م3: العلاقات الخليجية مع دول الحرب — محاولات المحور اختراق النفوذ البريطاني",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: false,
		status: "لم يُراجع",
		notes: "البروباغندا النازية في الشارقة — اختراق المحور للنفوذ البريطاني"
	},
	{
		id: 27,
		title: "الحرب: سانت جون فيلبي",
		archiveRef: "IOR/R/15/2/696",
		chapterId: 3,
		sectionId: "3-3",
		section: "م3: العلاقات الخليجية مع دول الحرب — محاولات المحور اختراق النفوذ البريطاني",
		priority: "★★",
		category: "مصدر أولي",
		isNew: false,
		status: "لم يُراجع",
		notes: "اختراق المحور للنفوذ البريطاني عبر الوسطاء"
	},
	{
		id: 28,
		title: "اضطرابات في العراق 28/27",
		archiveRef: "IOR/R/15/2/717",
		chapterId: 3,
		sectionId: "3-3",
		section: "م3: العلاقات الخليجية مع دول الحرب — طبيعة العلاقة مع القوى الكبرى",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: false,
		status: "لم يُراجع",
		notes: "الانعكاسات الإقليمية على دول الخليج"
	},
	{
		id: 29,
		title: "الحرب: الأعمال العدائية في إيران 28/30",
		archiveRef: "IOR/R/15/2/722",
		chapterId: 3,
		sectionId: "3-3",
		section: "م3: العلاقات الخليجية مع دول الحرب — طبيعة العلاقة مع القوى الكبرى",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: false,
		status: "لم يُراجع",
		notes: ""
	},
	{
		id: 30,
		title: "مسودة رد تشامبرلين على ابن سعود 1939",
		archiveRef: "IOR/L/PS/12/2088",
		chapterId: 3,
		sectionId: "3-1",
		section: "م1: التغيرات السياسية والإدارية — العلاقات الدبلوماسية مع بريطانيا",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: true,
		status: "لم يُراجع",
		notes: "العلاقات الدبلوماسية مع بريطانيا"
	},
	{
		id: 31,
		title: "رسالة بولارد: قلق بريطانيا من وفاة ابن سعود 1938",
		archiveRef: "IOR/L/PS/12/2082",
		chapterId: 3,
		sectionId: "3-1",
		section: "م1: التغيرات السياسية والإدارية — الدور السياسي للملك عبد العزيز في التوازن الإقليمي",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: true,
		status: "لم يُراجع",
		notes: "الدور السياسي للملك عبد العزيز في التوازن الإقليمي"
	},
	{
		id: 32,
		title: "مذكرة إشعيا برلين عن خطط أمريكا في السعودية 1944",
		archiveRef: "IOR/L/PS/12/2124",
		chapterId: 3,
		sectionId: "3-3",
		section: "م3: العلاقات الخليجية مع دول الحرب — تعزيز النفوذ الأمريكي بعد 1943",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: true,
		status: "لم يُراجع",
		notes: "تعزيز النفوذ الأمريكي بعد 1943م"
	},
	{
		id: 33,
		title: "موارد البحرين المالية (ملصقات دعاية بالعربية على ظهرها)",
		archiveRef: "IOR/R/15/2 (مالي)",
		chapterId: 3,
		sectionId: "3-2",
		section: "م2: تأثير الحرب على الوعي السياسي — ملصقات الدعاية البريطانية بالعربية",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: true,
		status: "لم يُراجع",
		notes: "ملصقات الدعاية البريطانية بالعربية — أثرها في الوعي السياسي"
	},
	{
		id: 34,
		title: "تمديد نظام ترخيص التصدير I 28/5(أ)",
		archiveRef: "IOR/R/15/2/684",
		chapterId: 4,
		sectionId: "4-1",
		section: "م1: أثر الحرب في التجارة والملاحة — انعكاسات الحرب في الموانئ والأسواق",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: false,
		status: "لم يُراجع",
		notes: "انعكاسات الحرب في الموانئ والأسواق التجارية"
	},
	{
		id: 35,
		title: "نظام تراخيص التصدير II (بيانات شهرية)",
		archiveRef: "IOR/R/15/2/685",
		chapterId: 4,
		sectionId: "4-1",
		section: "م1: أثر الحرب في التجارة والملاحة — انعكاسات الحرب في الموانئ والأسواق",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: false,
		status: "لم يُراجع",
		notes: "بيانات شهرية عن حركة التجارة البحرية"
	},
	{
		id: 36,
		title: "وضع المخزون في البحرين والساحل المتصالح 29/20",
		archiveRef: "IOR/R/15/2/773",
		chapterId: 4,
		sectionId: "4-3",
		section: "م3: انعكاسات الحرب على البنية الاقتصادية — الحصار البحري وارتفاع الطلب",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: false,
		status: "لم يُراجع",
		notes: "الحصار البحري وارتفاع الطلب العالمي على النفط"
	},
	{
		id: 37,
		title: "تخريب آبار النفط 28/1 J",
		archiveRef: "IOR/R/15/2/660",
		chapterId: 4,
		sectionId: "4-2",
		section: "م2: النفط في الخليج — النفط كمورد استراتيجي رئيسي للحلفاء",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: false,
		status: "لم يُراجع",
		notes: "النفط كمورد استراتيجي — خطط التخريب لمنع وقوعه بيد العدو"
	},
	{
		id: 38,
		title: "دفاع حقل النفط ومصفاة التكرير 28/1 K I",
		archiveRef: "IOR/R/15/2/661",
		chapterId: 4,
		sectionId: "4-2",
		section: "م2: النفط في الخليج — النفط كمورد استراتيجي رئيسي للحلفاء",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: false,
		status: "لم يُراجع",
		notes: ""
	},
	{
		id: 39,
		title: "برنامج الإنكار في قطر 28/35",
		archiveRef: "IOR/R/15/2/729",
		chapterId: 4,
		sectionId: "4-2",
		section: "م2: النفط في الخليج — النفط كمورد استراتيجي (قطر)",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: false,
		status: "لم يُراجع",
		notes: "النفط كمورد استراتيجي في قطر"
	},
	{
		id: 40,
		title: "نفط البحرين 28/1 N I",
		archiveRef: "IOR/R/15/2/666",
		chapterId: 4,
		sectionId: "4-2",
		section: "م2: النفط في الخليج — بدايات التنقيب في السعودية والبحرين والكويت",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: false,
		status: "لم يُراجع",
		notes: "بدايات التنقيب عن النفط في البحرين"
	},
	{
		id: 41,
		title: "نفط البحرين - أرقام الإنتاج 28/1 N II",
		archiveRef: "IOR/R/15/2/667",
		chapterId: 4,
		sectionId: "4-2",
		section: "م2: النفط في الخليج — النفط كمورد استراتيجي رئيسي للحلفاء",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: false,
		status: "لم يُراجع",
		notes: "أرقام إنتاج النفط خلال الحرب"
	},
	{
		id: 42,
		title: "الملف 38/3 امتياز نفط قطر",
		archiveRef: "IOR/R/15/2/864",
		chapterId: 4,
		sectionId: "4-2",
		section: "م2: النفط في الخليج — الشركات الأجنبية والامتيازات النفطية في ظل الحرب",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: true,
		status: "لم يُراجع",
		notes: "الامتيازات النفطية في قطر"
	},
	{
		id: 43,
		title: "النفط وعلاقته بالشرق الأوسط (مج64) - الكويت",
		archiveRef: "IOR/R/15/2 (31/86)",
		chapterId: 4,
		sectionId: "4-2",
		section: "م2: النفط في الخليج — بدايات التنقيب في السعودية والبحرين والكويت",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: true,
		status: "لم يُراجع",
		notes: "النفط في الكويت وأرامكو وخط التابلاين"
	},
	{
		id: 44,
		title: "الدفاع عن الخليج الفارسي - قطر (نفط قطر إمدادات وقود الإمبراطورية + خريطة آبار 1939)",
		archiveRef: "IOR/L/PS/12/3936",
		chapterId: 4,
		sectionId: "4-2",
		section: "م2: النفط في الخليج — النفط كمورد استراتيجي رئيسي للحلفاء",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: true,
		status: "لم يُراجع",
		notes: "نفط قطر كمورد استراتيجي + خريطة نادرة لآبار 1939"
	},
	{
		id: 45,
		title: "تنقيح إتاوات النفط للشيخ من بابكو 10/6 A",
		archiveRef: "IOR/R/15/2 (10/6 A)",
		chapterId: 4,
		sectionId: "4-2",
		section: "م2: النفط في الخليج — الشركات الأجنبية والامتيازات النفطية في ظل الحرب",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: true,
		status: "لم يُراجع",
		notes: "الامتيازات النفطية في ظل الحرب — بابكو والبحرين"
	},
	{
		id: 46,
		title: "ملف 28/33 التعويضات والتأمين ضد مخاطر الحرب",
		archiveRef: "IOR/R/15/2 (28/33)",
		chapterId: 4,
		sectionId: "4-2",
		section: "م2: النفط في الخليج — الشركات الأجنبية والامتيازات النفطية في ظل الحرب",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: true,
		status: "لم يُراجع",
		notes: "مخاطر الحرب على منشآت بابكو النفطية"
	},
	{
		id: 47,
		title: "ملف 86/7 امتيازات النفط في الساحل المتصالح",
		archiveRef: "IOR/R/15/2 (86/7)",
		chapterId: 4,
		sectionId: "4-2",
		section: "م2: النفط في الخليج — الشركات الأجنبية والامتيازات النفطية في ظل الحرب",
		priority: "★★★",
		category: "مصدر أولي",
		isNew: true,
		status: "لم يُراجع",
		notes: "الامتيازات النفطية في الساحل المتصالح (الإمارات)"
	},
	{
		id: 48,
		title: "المتطلبات المدنية للخليج الفارسي (كهرباء الكويت بعد الحرب)",
		archiveRef: "IOR/L/PS/12/1010",
		chapterId: 4,
		sectionId: "4-3",
		section: "م3: انعكاسات الحرب على البنية الاقتصادية — نشوء البنية التحتية الحديثة بعد الحرب",
		priority: "★★",
		category: "مصدر أولي",
		isNew: true,
		status: "لم يُراجع",
		notes: "نقص البنية التحتية في الكويت — جذور التحديث الاقتصادي"
	}
];
var COUNTRIES = [
	"السعودية",
	"الكويت",
	"البحرين",
	"قطر",
	"الإمارات/الساحل المتصالح",
	"عُمان",
	"بريطانيا",
	"الولايات المتحدة",
	"ألمانيا"
];
var BIB_SECTIONS_ORDER = [
	"الوثائق الأرشيفية والمصادر الأولية",
	"الكتب العربية والأجنبية",
	"الرسائل والأطاريح",
	"البحوث والمجلات العلمية",
	"المؤتمرات العلمية",
	"الصحف",
	"المواقع الإلكترونية والموسوعات"
];
function getBibSectionForType(cat) {
	const c = (cat || "").trim();
	if ([
		"مصدر أولي",
		"وثيقة أرشيفية",
		"وثائق أرشيفية",
		"تقرير رسمي",
		"تقرير",
		"archival",
		"archive"
	].includes(c)) return "الوثائق الأرشيفية والمصادر الأولية";
	if ([
		"كتاب",
		"كتاب عربي",
		"كتاب أجنبي",
		"book",
		"books"
	].includes(c)) return "الكتب العربية والأجنبية";
	if ([
		"رسالة ماجستير",
		"أطروحة دكتوراه",
		"رسالة علمية",
		"thesis",
		"dissertation"
	].includes(c)) return "الرسائل والأطاريح";
	if ([
		"بحث",
		"بحث علمي",
		"مجلة علمية",
		"مقالة",
		"article",
		"journal"
	].includes(c)) return "البحوث والمجلات العلمية";
	if ([
		"مؤتمر علمي",
		"مؤتمر",
		"conference",
		"proceedings"
	].includes(c)) return "المؤتمرات العلمية";
	if ([
		"صحيفة",
		"صحف",
		"جريدة",
		"newspaper",
		"newspapers"
	].includes(c)) return "الصحف";
	if ([
		"موقع إلكتروني",
		"رابط",
		"website",
		"موسوعة",
		"encyclopedia",
		"url"
	].includes(c)) return "المواقع الإلكترونية والموسوعات";
	return "الوثائق الأرشيفية والمصادر الأولية";
}
function formatAuthorLastFirstUtil(fullName) {
	if (!fullName || !fullName.trim()) return "[مؤلف غير معروف]";
	const parts = fullName.trim().split(/\s+/);
	if (parts.length === 1) return fullName.trim();
	return `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(" ")}`;
}
function buildArabicCitation(doc, pageNum = "", withPage = true) {
	const cat = doc.category || doc.sourceType || doc.type || "وثيقة أرشيفية";
	const rawAuthor = doc.author || "";
	const author = withPage ? rawAuthor || "[اسم المؤلف]" : formatAuthorLastFirstUtil(rawAuthor);
	const title = doc.title || "[العنوان]";
	const year = doc.year || doc.date || "د.ت";
	const pageSuffix = withPage ? `، ص${pageNum || "[رقم الصفحة]"}` : "";
	if (cat === "كتاب" || cat === "كتاب عربي" || cat === "كتاب أجنبي") return `${author}، ${title}، ط${doc.edition || "1"}، (${doc.place || "[مكان النشر]"}: ${doc.publisher || "[دار النشر]"}، ${year})${pageSuffix}.`;
	if (cat === "رسالة ماجستير" || cat === "أطروحة دكتوراه" || cat === "رسالة علمية") return `${author}، "${title}"، (${cat === "أطروحة دكتوراه" ? "أطروحة دكتوراه غير منشورة" : "رسالة ماجستير غير منشورة"})، ${doc.college || "[الكلية]"}، ${doc.university || "[الجامعة]"}، ${year}${pageSuffix}.`;
	if (cat === "بحث" || cat === "بحث علمي" || cat === "مجلة علمية" || cat === "مقالة") return `${author}، "${title}"، ${doc.journal || doc.journalName || "[اسم المجلة]"}، م${doc.volume || "[م]"}، ع${doc.issue || "[ع]"}، (${year})${pageSuffix}.`;
	if (cat === "مؤتمر علمي" || cat === "مؤتمر") return `${author}، "${title}"، وقائع ${doc.conference || doc.conferenceName || "[اسم المؤتمر]"}، ${doc.place || "[المكان]"}، ${year}${pageSuffix}.`;
	if (cat === "صحيفة") return `صحيفة ${doc.newspaper || doc.title || "[اسم الصحيفة]"}، العدد (${doc.issue || "[رقم العدد]"})، ${doc.date || year}${pageSuffix}.`;
	if (cat === "موقع إلكتروني" || cat === "رابط") return `${author}، ${title}، متاح على: ${doc.url || doc.link || "[الرابط]"}، تاريخ الزيارة: ${doc.visitDate || doc.accessDate || "[تاريخ الزيارة]"}${pageSuffix}.`;
	if (cat === "موسوعة") return `${title}، م${doc.volume || "[م]"}، ط${doc.edition || "[الطبعة]"}، (${doc.publisher || "[الناشر]"}، ${year})${pageSuffix}.`;
	if (cat === "وثيقة أرشيفية" || cat === "مصدر أولي" || cat === "تقرير رسمي" || cat === "تقرير") return `${title}، ${doc.archiveRef || doc.archiveNumber || "[الرقم الأرشيفي]"}، ${year}${pageSuffix}.`;
	return `${author}، ${title}، (${year})${pageSuffix}.`;
}
function detectSourceTypeFromUrl(url = "") {
	const u = url.toLowerCase();
	if (/qdl\.qa|nationalarchives|ior\//.test(u)) return "وثيقة أرشيفية";
	if (/jstor|sciencedirect|springer|tandfonline|doi\.org|researchgate/.test(u)) return "بحث علمي";
	if (/wikipedia|britannica|encyclopedia|maarefa|marefa/.test(u)) return "موسوعة";
	if (/aljazeera|bbc|reuters|nytimes|theguardian|alarabiya|alhayat|asharqalawsat|newspaper|news\./.test(u)) return "صحيفة";
	if (/google\.com\/books|books\.google|archive\.org\/details/.test(u)) return "كتاب";
	if (/thesis|dissertation|shamaa|dar\.bibalex/.test(u)) return "رسالة ماجستير";
	return "موقع إلكتروني";
}
function App() {
	const [page, setPage] = (0, import_react.useState)("home");
	const [aiModel, setAiModel] = (0, import_react.useState)(getSelectedModel());
	const BASE_DOC_IDS = import_react.useMemo(() => new Set(DOCS_FROM_INDEX.map((d) => d.id)), []);
	const [deletedBaseDocs, setDeletedBaseDocs] = (0, import_react.useState)(() => {
		try {
			const v = localStorage.getItem("acadarchiv_deleted_base_docs");
			return new Set(v && v !== "undefined" ? JSON.parse(v) : []);
		} catch {
			return /* @__PURE__ */ new Set();
		}
	});
	const [docs, setDocs] = (0, import_react.useState)(() => {
		let deleted = /* @__PURE__ */ new Set();
		try {
			const dv = localStorage.getItem("acadarchiv_deleted_base_docs");
			deleted = new Set(dv && dv !== "undefined" ? JSON.parse(dv) : []);
		} catch {}
		let userDocs = [];
		try {
			const v = localStorage.getItem("acadarchiv_user_docs");
			userDocs = v && v !== "undefined" ? JSON.parse(v) : [];
		} catch {}
		return [...userDocs, ...DOCS_FROM_INDEX.filter((d) => !deleted.has(d.id))];
	});
	import_react.useEffect(() => {
		try {
			const userDocs = docs.filter((d) => !BASE_DOC_IDS.has(d.id));
			localStorage.setItem("acadarchiv_user_docs", JSON.stringify(userDocs));
		} catch {}
	}, [docs, BASE_DOC_IDS]);
	import_react.useEffect(() => {
		try {
			localStorage.setItem("acadarchiv_deleted_base_docs", JSON.stringify([...deletedBaseDocs]));
		} catch {}
	}, [deletedBaseDocs]);
	const handleDeleteSource = (id) => {
		if (id == null) return;
		if (typeof id === "string" && id.startsWith("lib-")) {
			const realId = id.slice(4);
			const libIdNum = Number(realId);
			const target = library.find((s) => String(s.id) === realId || s.id === libIdNum);
			setLibrary((prev) => prev.filter((s) => String(s.id) !== realId && s.id !== libIdNum));
			if (target) {
				if (target.storagePath) deleteLibraryFile(target.storagePath).catch(() => {});
				deleteLibraryRow(target.id).catch(() => {});
			}
			if (libSelected && (String(libSelected.id) === realId || libSelected.id === libIdNum)) setLibSelected(null);
		} else if (BASE_DOC_IDS.has(id)) {
			setDeletedBaseDocs((prev) => {
				const n = new Set(prev);
				n.add(id);
				return n;
			});
			setDocs((prev) => prev.filter((d) => d.id !== id));
		} else {
			setDocs((prev) => prev.filter((d) => d.id !== id));
			const libMatch = library.find((s) => s.id === id || String(s.id) === String(id));
			if (libMatch) {
				setLibrary((prev) => prev.filter((s) => s.id !== libMatch.id));
				if (libMatch.storagePath) deleteLibraryFile(libMatch.storagePath).catch(() => {});
				deleteLibraryRow(libMatch.id).catch(() => {});
				if (libSelected?.id === libMatch.id) setLibSelected(null);
			}
		}
		if (selectedDoc?.id === id) setSelectedDoc(null);
		saveBibliography((prev) => prev.filter((b) => b.docId !== id && b.id !== id));
		showNotif("🗑️ تم حذف المصدر");
	};
	const deleteUserDoc = handleDeleteSource;
	const askDeleteSource = (id) => setConfirmDialog({
		title: "تأكيد الحذف",
		message: "هل أنت متأكد من حذف هذا المصدر؟\nلا يمكن التراجع عن هذا الإجراء.",
		onConfirm: () => handleDeleteSource(id)
	});
	const [searchFilters, setSearchFilters] = (0, import_react.useState)({
		query: "",
		chapterId: "",
		priority: "",
		isNew: "",
		status: ""
	});
	const [selectedDoc, setSelectedDoc] = (0, import_react.useState)(null);
	const [aiResult, setAiResult] = (0, import_react.useState)("");
	const [aiLoading, setAiLoading] = (0, import_react.useState)(false);
	const [notif, setNotif] = (0, import_react.useState)(null);
	const [userEmail, setUserEmail] = (0, import_react.useState)("");
	const [userRole, setUserRole] = (0, import_react.useState)(null);
	const [accessDenied, setAccessDenied] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		supabase.auth.getUser().then(({ data }) => setUserEmail(data?.user?.email || ""));
		getMyRole().then(({ role, enforced }) => {
			setUserRole(role);
			if (enforced && !role) setAccessDenied(true);
		});
	}, []);
	const [supervisorTab, setSupervisorTab] = (0, import_react.useState)(null);
	const openSupervisorTab = (0, import_react.useCallback)((tab) => {
		setSupervisorTab(tab);
		setPage("supervisor");
	}, []);
	const handleLogout = (0, import_react.useCallback)(async () => {
		try {
			await supabase.auth.signOut();
		} catch (e) {}
		window.location.href = "/auth";
	}, []);
	const [exportFormat, setExportFormat] = (0, import_react.useState)("Chicago");
	const [exportSelected, setExportSelected] = (0, import_react.useState)([]);
	const [exportText, setExportText] = (0, import_react.useState)("");
	const [customFormats, setCustomFormats] = (0, import_react.useState)(() => {
		try {
			const v = localStorage.getItem("acadarchiv_custom_formats");
			return v && v !== "undefined" ? JSON.parse(v) : [];
		} catch {
			return [];
		}
	});
	const [showCustomBuilder, setShowCustomBuilder] = (0, import_react.useState)(false);
	const [editingCustomFmt, setEditingCustomFmt] = (0, import_react.useState)(null);
	const [customFmtForm, setCustomFmtForm] = (0, import_react.useState)({
		name: "",
		templates: {
			"كتاب": "{المؤلف}. {العنوان}. {مكان_النشر}: {الناشر}، {السنة}م.",
			"وثيقة أرشيفية": "{المؤلف}. {العنوان}. {الرقم_الأرشيفي}، {السنة}م.",
			"رسالة علمية": "{المؤلف}. {العنوان}. رسالة {الدرجة}، {الجامعة}، {السنة}م.",
			"مقالة": "{المؤلف}. \"{العنوان}\". {اسم_المجلة}، م{المجلد}، ع{العدد} ({السنة})، ص{الصفحات}.",
			"صحيفة": "{المؤلف}. \"{العنوان}\". {اسم_الصحيفة}، {التاريخ}.",
			"موقع إلكتروني": "{المؤلف}. {العنوان}. متاح على: {الرابط}، تاريخ الزيارة: {تاريخ_الزيارة}.",
			"تقرير": "{المؤلف}. {العنوان}. {الجهة}، {السنة}م.",
			"أطروحة دكتوراه": "{المؤلف}. {العنوان}. أطروحة دكتوراه، {الجامعة}، {السنة}م."
		}
	});
	const EMPTY_ADD_FORM = {
		title: "",
		author: "",
		year: "",
		archiveRef: "",
		chapterId: "",
		section: "",
		priority: "★★",
		category: "وثيقة أرشيفية",
		country: "",
		keywords: "",
		notes: "",
		isNew: false,
		status: "لم يُراجع",
		edition: "",
		place: "",
		publisher: "",
		college: "",
		university: "",
		journal: "",
		volume: "",
		issue: "",
		pages: "",
		conference: "",
		newspaper: "",
		url: "",
		visitDate: "",
		agency: ""
	};
	const [addForm, setAddForm] = (0, import_react.useState)(EMPTY_ADD_FORM);
	const [exportTypeFilter, setExportTypeFilter] = (0, import_react.useState)("");
	const [exportSearch, setExportSearch] = (0, import_react.useState)("");
	const [bulkFootnoteModal, setBulkFootnoteModal] = (0, import_react.useState)(null);
	const [urlImport, setUrlImport] = (0, import_react.useState)("");
	const [urlLoading, setUrlLoading] = (0, import_react.useState)(false);
	const [urlResult, setUrlResult] = (0, import_react.useState)(null);
	const [urlPreview, setUrlPreview] = (0, import_react.useState)(null);
	const [multiUrlPreview, setMultiUrlPreview] = (0, import_react.useState)(null);
	const [bookExtractLoading, setBookExtractLoading] = (0, import_react.useState)(false);
	const [structureSearch, setStructureSearch] = (0, import_react.useState)("");
	const [entityQuery, setEntityQuery] = (0, import_react.useState)("");
	const [entityLoading, setEntityLoading] = (0, import_react.useState)(false);
	const [entityResult, setEntityResult] = (0, import_react.useState)(null);
	const [tgMode, setTgMode] = (0, import_react.useState)(false);
	const [tgQuery, setTgQuery] = (0, import_react.useState)("");
	const [tgResults, setTgResults] = (0, import_react.useState)([]);
	const [tgLoading, setTgLoading] = (0, import_react.useState)(false);
	const aiInputRef = (0, import_react.useRef)(null);
	const [chapters, setChapters] = (0, import_react.useState)(() => {
		try {
			const saved = localStorage.getItem("acadarchiv_chapters");
			return saved ? JSON.parse(saved) : CHAPTERS_DATA.map((ch) => ({
				...ch,
				sections: ch.sections.map((s) => ({ ...s }))
			}));
		} catch {
			return CHAPTERS_DATA.map((ch) => ({
				...ch,
				sections: ch.sections.map((s) => ({ ...s }))
			}));
		}
	});
	const [editingChapter, setEditingChapter] = (0, import_react.useState)(null);
	const [editingSection, setEditingSection] = (0, import_react.useState)(null);
	const saveChapters = (updated) => {
		setChapters(updated);
		try {
			localStorage.setItem("acadarchiv_chapters", JSON.stringify(updated));
		} catch {}
	};
	const cloudHydratedRef = (0, import_react.useRef)(false);
	const syncUserDocsDebounced = (0, import_react.useRef)(debounce(syncUserDocs, 600)).current;
	const syncChaptersDebounced = (0, import_react.useRef)(debounce(syncChapters, 600)).current;
	const syncDeletedDebounced = (0, import_react.useRef)(debounce(syncDeletedBaseDocs, 600)).current;
	(0, import_react.useRef)(debounce(syncLibrary, 800)).current;
	const libHydratedRef = (0, import_react.useRef)(false);
	import_react.useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const data = await loadPhase3a(CHAPTERS_DATA);
				if (cancelled || !data) {
					cloudHydratedRef.current = true;
					return;
				}
				setChapters(data.chapters);
				setDeletedBaseDocs(data.deletedBaseDocs);
				setDocs([...data.userDocs, ...DOCS_FROM_INDEX.filter((d) => !data.deletedBaseDocs.has(d.id))]);
			} catch (e) {
				console.warn("[cloudSync] load failed, using localStorage fallback", e);
			} finally {
				cloudHydratedRef.current = true;
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);
	import_react.useEffect(() => {
		if (!cloudHydratedRef.current) return;
		syncUserDocsDebounced(docs.filter((d) => !BASE_DOC_IDS.has(d.id)));
	}, [
		docs,
		BASE_DOC_IDS,
		syncUserDocsDebounced
	]);
	import_react.useEffect(() => {
		if (!cloudHydratedRef.current) return;
		syncChaptersDebounced(chapters);
	}, [chapters, syncChaptersDebounced]);
	import_react.useEffect(() => {
		if (!cloudHydratedRef.current) return;
		syncDeletedDebounced(deletedBaseDocs);
	}, [deletedBaseDocs, syncDeletedDebounced]);
	const bibHydratedRef = (0, import_react.useRef)(false);
	const cardsHydratedRef = (0, import_react.useRef)(false);
	const trHydratedRef = (0, import_react.useRef)(false);
	const fmtHydratedRef = (0, import_react.useRef)(false);
	const syncBibDebounced = (0, import_react.useRef)(debounce(syncBibliography, 800)).current;
	const syncCardsDebounced = (0, import_react.useRef)(debounce(syncCards, 800)).current;
	const syncTrDebounced = (0, import_react.useRef)(debounce(syncTranslations, 1e3)).current;
	const syncFmtDebounced = (0, import_react.useRef)(debounce(syncCustomFormats, 800)).current;
	import_react.useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const [bib, crd, trs, fmts] = await Promise.all([
					loadBibliography(),
					loadCards(),
					loadTranslations(),
					loadCustomFormats()
				]);
				if (cancelled) return;
				if (bib?.length) setBibliography(bib);
				if (crd?.length) setCards(crd);
				if (trs?.length) setSavedTranslations(trs);
				if (fmts?.length) setCustomFormats(fmts);
			} catch (e) {
				console.warn("[phase3c.load]", e);
			} finally {
				bibHydratedRef.current = true;
				cardsHydratedRef.current = true;
				trHydratedRef.current = true;
				fmtHydratedRef.current = true;
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);
	const commitChapterEdit = () => {
		if (!editingChapter) return;
		const updated = chapters.map((ch) => ch.id === editingChapter.id ? {
			...ch,
			titleAr: editingChapter.value
		} : ch);
		setDocs((prev) => prev.map((d) => d.chapterId === editingChapter.id ? {
			...d,
			chapterTitle: editingChapter.value
		} : d));
		saveChapters(updated);
		setEditingChapter(null);
		showNotif("✅ تم تحديث عنوان الفصل");
	};
	const commitSectionEdit = () => {
		if (!editingSection) return;
		const updated = chapters.map((ch) => ch.id === editingSection.chId ? {
			...ch,
			sections: ch.sections.map((s) => s.id === editingSection.secId ? {
				...s,
				title: editingSection.value
			} : s)
		} : ch);
		setDocs((prev) => prev.map((d) => d.sectionId === editingSection.secId ? {
			...d,
			section: editingSection.value
		} : d));
		saveChapters(updated);
		setEditingSection(null);
		showNotif("✅ تم تحديث عنوان المبحث وإعادة فرز الوثائق تلقائياً");
	};
	const [addingSecChId, setAddingSecChId] = (0, import_react.useState)(null);
	const [newSecForm, setNewSecForm] = (0, import_react.useState)({
		title: "",
		num: ""
	});
	const [addingSubSecId, setAddingSubSecId] = (0, import_react.useState)(null);
	const [newSubForm, setNewSubForm] = (0, import_react.useState)({ title: "" });
	const openAddSection = (chId) => {
		const ch = chapters.find((c) => c.id === chId);
		const mainSecs = ch ? ch.sections.filter((s) => !/[a-z]/i.test(s.id)) : [];
		setAddingSecChId(chId);
		setNewSecForm({
			title: "",
			num: String(mainSecs.length + 1)
		});
		setAddingSubSecId(null);
	};
	const submitAddSection = (chId) => {
		const title = (newSecForm.title || "").trim();
		if (!title) {
			showNotif("⚠️ عنوان المبحث مطلوب", "error");
			return;
		}
		const ch = chapters.find((c) => c.id === chId);
		if (!ch) return;
		const num = (newSecForm.num || "").trim() || String(ch.sections.filter((s) => !/[a-z]/i.test(s.id)).length + 1);
		const newId = `${chId}-${num}`;
		if (ch.sections.some((s) => s.id === newId)) {
			showNotif("⚠️ رقم المبحث مستخدم بالفعل", "error");
			return;
		}
		const fullTitle = title.startsWith("م") ? title : `م${num}: ${title}`;
		saveChapters(chapters.map((c) => c.id === chId ? {
			...c,
			sections: [...c.sections, {
				id: newId,
				title: fullTitle,
				userAdded: true
			}]
		} : c));
		setAddingSecChId(null);
		setNewSecForm({
			title: "",
			num: ""
		});
		showNotif("✅ تم إضافة المبحث");
	};
	const openAddSubSection = (secId) => {
		setAddingSubSecId(secId);
		setNewSubForm({ title: "" });
		setAddingSecChId(null);
	};
	const submitAddSubSection = (chId, secId) => {
		const title = (newSubForm.title || "").trim();
		if (!title) {
			showNotif("⚠️ عنوان الفقرة الفرعية مطلوب", "error");
			return;
		}
		const ch = chapters.find((c) => c.id === chId);
		if (!ch) return;
		const subs = ch.sections.filter((s) => s.id !== secId && s.id.startsWith(secId) && /^[a-z]+$/i.test(s.id.slice(secId.length)));
		const newId = `${secId}${String.fromCharCode(97 + subs.length)}`;
		saveChapters(chapters.map((c) => c.id === chId ? {
			...c,
			sections: [...c.sections, {
				id: newId,
				title,
				userAdded: true
			}]
		} : c));
		setAddingSubSecId(null);
		setNewSubForm({ title: "" });
		showNotif("✅ تم إضافة الفقرة الفرعية");
	};
	const askDeleteSection = (chId, secId) => {
		setConfirmDialog({
			title: "تأكيد الحذف",
			message: "هل تريد حذف هذا المبحث وكل فقراته الفرعية؟ لا يمكن التراجع.",
			onConfirm: () => {
				saveChapters(chapters.map((c) => c.id === chId ? {
					...c,
					sections: c.sections.filter((s) => {
						if (s.id === secId) return false;
						if (s.id.startsWith(secId) && /^[a-z]+$/i.test(s.id.slice(secId.length))) return false;
						return true;
					})
				} : c));
				showNotif("🗑️ تم حذف المبحث");
			}
		});
	};
	const [footnoteModal, setFootnoteModal] = (0, import_react.useState)(null);
	const [confirmDialog, setConfirmDialog] = (0, import_react.useState)(null);
	const [footnotePageNum, setFootnotePageNum] = (0, import_react.useState)("");
	const [footnoteResult, setFootnoteResult] = (0, import_react.useState)("");
	const footnotePageRef = (0, import_react.useRef)(null);
	const generateFootnote = (doc, pageNum) => {
		return buildArabicCitation(doc, pageNum, true);
	};
	const openFootnoteModal = (doc) => {
		setFootnoteModal(doc);
		setFootnotePageNum("");
		setFootnoteResult("");
		setTimeout(() => footnotePageRef.current?.focus(), 100);
	};
	const validatePageNumber = () => {
		if (!(footnotePageNum || "").trim()) {
			showNotif("⚠️ رقم الصفحة مطلوب قبل توليد الهامش أو إضافة المرجع", "error");
			setTimeout(() => footnotePageRef.current?.focus(), 50);
			return false;
		}
		return true;
	};
	const handleGenerateFootnote = () => {
		if (!footnoteModal) return;
		if (!validatePageNumber()) return;
		setFootnoteResult(generateFootnote(footnoteModal, footnotePageNum.trim()));
	};
	const copyFootnoteAndRegister = async () => {
		if (!footnoteModal) return;
		if (!validatePageNumber()) return;
		const result = footnoteResult && footnoteResult.trim() ? footnoteResult : generateFootnote(footnoteModal, footnotePageNum.trim());
		addToBibliography(footnoteModal, result);
		try {
			await navigator.clipboard.writeText(result);
			showNotif("✅ تم نسخ الهامش وإضافة المصدر للمراجع النهائية");
		} catch {
			showNotif("✅ تمت إضافة المصدر للمراجع النهائية — انسخ الهامش يدوياً إذا لم تسمح الحافظة", "warn");
		}
		setTimeout(() => setFootnoteModal(null), 2e3);
	};
	const [bibliography, setBibliography] = (0, import_react.useState)(() => {
		try {
			const v = localStorage.getItem("acadarchiv_bibliography");
			return v && v !== "undefined" ? JSON.parse(v) : [];
		} catch {
			return [];
		}
	});
	const saveBibliography = (updater) => {
		setBibliography((prev) => {
			const next = typeof updater === "function" ? updater(prev) : updater;
			try {
				localStorage.setItem("acadarchiv_bibliography", JSON.stringify(next));
			} catch {}
			return next;
		});
	};
	const getBibSection = getBibSectionForType;
	const addToBibliography = (doc, footnoteText) => {
		if (!doc) return;
		const cat = doc.category || doc.sourceType || "وثيقة أرشيفية";
		const section = getBibSectionForType(cat);
		const author = doc.author || "";
		const authorFormatted = formatAuthorLastFirstUtil(author);
		const year = doc.year || "د.ت";
		const title = doc.title || "";
		const bibEntry = buildArabicCitation(doc, "", false);
		const newEntry = {
			id: Date.now() + Math.random(),
			docId: doc.id,
			section,
			author: authorFormatted,
			title,
			year,
			category: cat,
			bibEntry,
			sortKey: author ? authorFormatted : title,
			addedAt: (/* @__PURE__ */ new Date()).toLocaleDateString("ar-IQ")
		};
		saveBibliography((prev) => {
			if (prev.some((b) => b.docId === doc.id || b.bibEntry === bibEntry)) {
				showNotif("ℹ️ المصدر موجود مسبقاً في قائمة المراجع");
				return prev;
			}
			return [...prev, newEntry];
		});
	};
	const BIBO_SECTIONS_ORDER = BIB_SECTIONS_ORDER;
	const getBibGrouped = () => {
		const grouped = {};
		BIBO_SECTIONS_ORDER.forEach((s) => {
			grouped[s] = [];
		});
		bibliography.forEach((b) => {
			grouped[grouped[b.section] ? b.section : getBibSection(b.category)].push(b);
		});
		BIBO_SECTIONS_ORDER.forEach((s) => {
			grouped[s].sort((a, b) => (a.sortKey || "").localeCompare(b.sortKey || "", "ar"));
		});
		return grouped;
	};
	const copyFullBibliography = () => {
		const grouped = getBibGrouped();
		let text = "قائمة المصادر والمراجع\n";
		text += "═".repeat(40) + "\n\n";
		BIBO_SECTIONS_ORDER.forEach((sec) => {
			if (!grouped[sec]?.length) return;
			text += `◆ ${sec}\n${"─".repeat(30)}\n`;
			grouped[sec].forEach((b, i) => {
				text += `${i + 1}. ${b.bibEntry}\n`;
			});
			text += "\n";
		});
		navigator.clipboard.writeText(text).then(() => showNotif("✅ تم نسخ قائمة المراجع كاملة"));
	};
	const removeFromBibliography = (id) => {
		saveBibliography((prev) => prev.filter((b) => b.id !== id));
		showNotif("🗑️ تم حذف المرجع من القائمة");
	};
	const LIB_LS_KEY = "acadarchiv_library";
	const readLibLS = () => {
		if (typeof window === "undefined") return [];
		try {
			const v = window.localStorage.getItem(LIB_LS_KEY);
			return v && v !== "undefined" ? JSON.parse(v) : [];
		} catch {
			return [];
		}
	};
	const [library, setLibrary] = (0, import_react.useState)(() => readLibLS());
	const [pendingLibIds, setPendingLibIds] = (0, import_react.useState)(() => /* @__PURE__ */ new Set());
	const libDiagShownRef = (0, import_react.useRef)(false);
	import_react.useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const items = await loadLibrary();
				if (cancelled) return;
				if (items && items.length) {
					const cloudIds = new Set(items.map((x) => String(x.id)));
					const lsOnly = readLibLS().filter((x) => !cloudIds.has(String(x.id)));
					if (lsOnly.length) {
						console.info(`[library.reconcile] ${lsOnly.length} local source(s) missing from cloud — will retry.`);
						setPendingLibIds((prev) => {
							const next = new Set(prev);
							lsOnly.forEach((x) => next.add(String(x.id)));
							return next;
						});
					}
					setLibrary([...lsOnly, ...items]);
				} else {
					const lsItems = readLibLS();
					if (lsItems.length) {
						console.info(`[library.reconcile] cloud empty, ${lsItems.length} local source(s) will be retried.`);
						setPendingLibIds((prev) => {
							const next = new Set(prev);
							lsItems.forEach((x) => next.add(String(x.id)));
							return next;
						});
					}
				}
			} catch (e) {
				console.warn("[loadLibrary]", e);
			} finally {
				libHydratedRef.current = true;
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);
	import_react.useEffect(() => {
		if (typeof window === "undefined") return;
		try {
			const stripped = library.map((s) => {
				const { fileData, ...rest } = s;
				return typeof fileData === "string" && fileData.length < 2e5 ? {
					...rest,
					fileData
				} : rest;
			});
			window.localStorage.setItem(LIB_LS_KEY, JSON.stringify(stripped));
		} catch (e) {
			console.warn("[library.LS.write]", e);
		}
	}, [library]);
	const showLibDiagIfNeeded = import_react.useCallback((errorType) => {
		if (libDiagShownRef.current || !errorType) return;
		libDiagShownRef.current = true;
		const labels = {
			rls: "🔒 RLS 403 — سياسة الأمان رفضت الكتابة. تحقق أن حسابك في قائمة allowed_users.",
			jwt: "🔑 JWT 401 — جلستك انتهت. سجّل خروج ودخول مرة أخرى.",
			network: "🌐 خطأ شبكة — الاتصال بـ Supabase فشل. سيُعاد المحاولة تلقائياً.",
			"no-user": "⚠️ لا توجد جلسة نشطة — سجّل الدخول أولاً.",
			unknown: "⚠️ خطأ غير معروف — الملف محفوظ محلياً وستتم إعادة المزامنة."
		};
		showNotif(`[تشخيص أولي] ${labels[errorType] || labels.unknown}`, "warn");
		console.error(`[library.diag] first save failure of the session — type=${errorType}`);
	}, []);
	const retryPendingLibrary = import_react.useCallback(async () => {
		if (pendingLibIds.size === 0) return;
		const ids = Array.from(pendingLibIds);
		let succeeded = [];
		for (const id of ids) {
			const src = library.find((s) => String(s.id) === String(id));
			if (!src) {
				succeeded.push(id);
				continue;
			}
			const { error, errorType } = await insertLibraryRow(src);
			if (!error) succeeded.push(id);
			else {
				console.warn(`[retryPendingLibrary] still failing id=${id} type=${errorType}`);
				showLibDiagIfNeeded(errorType);
			}
		}
		if (succeeded.length) {
			setPendingLibIds((prev) => {
				const next = new Set(prev);
				succeeded.forEach((id) => next.delete(String(id)));
				return next;
			});
			showNotif(`✅ تمت مزامنة ${succeeded.length} مصدر مُعلَّق`);
		}
	}, [
		pendingLibIds,
		library,
		showLibDiagIfNeeded
	]);
	import_react.useEffect(() => {
		if (pendingLibIds.size === 0) return;
		const onlineH = () => retryPendingLibrary();
		const focusH = () => retryPendingLibrary();
		window.addEventListener("online", onlineH);
		window.addEventListener("focus", focusH);
		const t = setInterval(retryPendingLibrary, 3e4);
		return () => {
			window.removeEventListener("online", onlineH);
			window.removeEventListener("focus", focusH);
			clearInterval(t);
		};
	}, [pendingLibIds, retryPendingLibrary]);
	const [libUploading, setLibUploading] = (0, import_react.useState)(false);
	const [libAnalyzing, setLibAnalyzing] = (0, import_react.useState)(null);
	const [libFilter, setLibFilter] = (0, import_react.useState)({
		query: "",
		chapterId: "",
		category: "",
		priority: ""
	});
	const [libSelectedIds, setLibSelectedIds] = (0, import_react.useState)(() => /* @__PURE__ */ new Set());
	const [libBulkDeleting, setLibBulkDeleting] = (0, import_react.useState)(false);
	const [libSelected, setLibSelected] = (0, import_react.useState)(null);
	const [libUrlInput, setLibUrlInput] = (0, import_react.useState)("");
	const [libUrlLoading, setLibUrlLoading] = (0, import_react.useState)(false);
	const [libExcelLoading, setLibExcelLoading] = (0, import_react.useState)(false);
	const libFileRef = (0, import_react.useRef)(null);
	const libExcelRef = (0, import_react.useRef)(null);
	const buildThesisStructure = () => {
		return chapters.map((ch) => {
			const tops = ch.sections.filter((s) => !/[a-z]$/i.test(String(s.id)));
			return {
				chapterId: ch.id,
				chapterTitle: ch.titleAr,
				sections: tops.map((s) => ({
					sectionId: s.id,
					sectionTitle: s.title,
					subSections: ch.sections.filter((sub) => sub.id !== s.id && String(sub.id).startsWith(String(s.id)) && /[a-z]$/i.test(String(sub.id))).map((sub) => ({
						subId: sub.id,
						subTitle: sub.title
					}))
				}))
			};
		});
	};
	const reconcileClassification = (parsed) => {
		if (!parsed || typeof parsed !== "object") return parsed;
		let chId = typeof parsed.chapterId === "string" ? parseInt(parsed.chapterId) : parsed.chapterId;
		const ch = chapters.find((c) => c.id === chId) || chapters[0];
		if (!ch) return parsed;
		chId = ch.id;
		let secId = parsed.sectionId || "";
		let subId = parsed.subSectionId || parsed.subId || "";
		const allSecIds = ch.sections.map((s) => String(s.id));
		if (subId && !allSecIds.includes(String(subId))) subId = "";
		if (secId && !allSecIds.includes(String(secId))) secId = "";
		if (!secId && subId) secId = String(subId).replace(/[a-z]$/i, "");
		if (!secId) secId = (ch.sections.find((s) => !/[a-z]$/i.test(String(s.id))) || ch.sections[0])?.id || "";
		const secObj = ch.sections.find((s) => String(s.id) === String(secId));
		const subObj = ch.sections.find((s) => String(s.id) === String(subId));
		const priorityStars = parsed.priority || "";
		const priorityReason = (parsed.priorityReason || "").toString().trim();
		let mergedWhyImportant = parsed.whyImportant || "";
		if (priorityReason) {
			const header = priorityStars ? `⭐ تقييم الأولوية ${priorityStars}: ${priorityReason}` : `⭐ تقييم الأولوية: ${priorityReason}`;
			mergedWhyImportant = mergedWhyImportant ? `${header}\n\n${mergedWhyImportant}` : header;
		}
		return {
			...parsed,
			chapterId: chId,
			chapterName: parsed.chapterName || ch.titleAr,
			sectionId: secId,
			sectionName: parsed.sectionName || secObj?.title || "",
			subSectionId: subId || null,
			subSectionName: parsed.subSectionName || subObj?.title || "",
			whyImportant: mergedWhyImportant,
			classificationReason: parsed.reason || parsed.classificationReason || "",
			classificationConfidence: parsed.confidence || parsed.classificationConfidence || ""
		};
	};
	const analyzeSource = async (src, payload) => {
		setLibAnalyzing(src.id);
		const thesisStructure = buildThesisStructure();
		const prompt = `أنت مساعد بحثي متخصص في تاريخ "الخليج العربي خلال الحرب العالمية الثانية 1939-1945".

حلّل هذا المصدر (الملف مرفق${payload?.base64 ? " كـ PDF — استخرج النص منه ولو كان ممسوحاً ضوئياً (OCR)" : ""}) تحليلاً عميقاً ومفصّلاً — لا اختصارات ولا عبارات إنشائية.

هذا هو الهيكل الكامل للأطروحة بفصولها ومباحثها وفقراتها (اختر **فقط** من المعرفات الموجودة أدناه ولا تخترع جديدة):
${JSON.stringify(thesisStructure, null, 2)}

اسم الملف: ${src.fileName}
نوع الملف: ${src.fileType}

بناءً على محتوى المصدر، حدد:
1. رقم الفصل الأنسب (chapterId)
2. معرف المبحث الأنسب (sectionId) من القائمة أعلاه
3. معرف الفقرة الفرعية (subSectionId) إن وُجدت فقرة مناسبة، وإلا اتركها null

**متطلبات إلزامية للحقول العميقة (اكتبها بالعربية الفصحى وبتفصيل حقيقي، لا نصوص عامة):**
• "priority": حدّد الأولوية بدقة (★★★ = مصدر محوري لا غنى عنه / ★★ = مفيد ويعزّز فصلاً معيناً / ★ = مرجع ثانوي أو داعم).
• "priorityReason": سطر واحد يشرح **لماذا** أعطيت هذا التقييم بالتحديد (مثال: "وثيقة أرشيفية أصلية غير منشورة تتناول موضوع الفصل مباشرة").
• "importantPages": الصفحات أو الأقسام المهمة داخل المصدر — أرقام دقيقة إن أمكن (مثل: "ص45-67، ص102، الفصل الثاني بالكامل") — إن لم تكن الأرقام واضحة، اذكر أسماء الأقسام/العناوين الفرعية المفيدة.
• "whyImportant": فقرة من 2-4 أسطر تشرح لماذا هذا المصدر مهم لموضوع الأطروحة تحديداً، مع الربط بفصل/مبحث محدد وذكر الجانب البحثي الذي يُغطّيه.
• "howToUse": فقرة من 2-4 أسطر تشرح كيف ومتى يُستخدم هذا المصدر في الكتابة (مثال: "يُستشهد به في المبحث الأول من الفصل الثاني عند مناقشة الوجود العسكري البريطاني في البحرين، ويصلح للاقتباس المباشر من صفحاته 45-52 لتوثيق أسماء الضباط والقواعد").
• "keyPoints": 3-6 نقاط ملموسة مستخرجة من المحتوى، كل نقطة مع رقم الصفحة إن أمكن.

أجب بـ JSON فقط بدون أي نص آخر وبدون code fences:
{
  "title": "عنوان المصدر المستخلص من المحتوى",
  "author": "المؤلف",
  "year": "السنة (رقم أو null)",
  "language": "عربي أو إنجليزي أو أخرى",
  "sourceType": "كتاب أو رسالة علمية أو بحث أو مقالة أو صحيفة أو وثيقة أرشيفية أو تقرير أو أطروحة دكتوراه",
  "chapterId": 1,
  "chapterName": "اسم الفصل المناسب",
  "sectionId": "1-1",
  "sectionName": "نص المبحث",
  "subSectionId": null,
  "subSectionName": "",
  "confidence": "high أو medium أو low",
  "reason": "سبب اختيار هذا المبحث تحديداً بناءً على محتوى المصدر",
  "sections": ["م1: ...", "م2: ..."],
  "priority": "★★★ أو ★★ أو ★",
  "priorityReason": "سطر واحد يبرّر تقييم الأولوية أعلاه",
  "importantPages": "الصفحات أو الأقسام المهمة داخل المصدر — بدقة",
  "summary": "ملخص أكاديمي موجز (4-5 أسطر) مستخلص من المحتوى الفعلي",
  "keywords": ["كلمة1","كلمة2","كلمة3","كلمة4","كلمة5"],
  "whyImportant": "فقرة 2-4 أسطر: لماذا هذا المصدر مهم للأطروحة تحديداً",
  "howToUse": "فقرة 2-4 أسطر: كيف ومتى يُستخدم في الكتابة",
  "keyPoints": [{"page":"12","point":"نقطة مهمة"},{"page":"45-47","point":"..."}]
}`;
		try {
			const clean = ((await analyzeDocumentLLM({
				prompt,
				fileName: src.fileName,
				mimeType: payload?.mimeType,
				base64: payload?.base64,
				text: payload?.text,
				max_tokens: 2200
			})).content?.map((c) => c.text || "").join("") || "{}").replace(/```json|```/g, "").trim();
			const match = clean.match(/\{[\s\S]*\}/);
			return reconcileClassification(JSON.parse(match ? match[0] : clean));
		} catch (err) {
			console.error("[analyzeSource]", err);
			return null;
		} finally {
			setLibAnalyzing(null);
		}
	};
	const classifyToStructure = async ({ title, author = "", summary = "", sourceType = "", extraContext = "" }) => {
		const thesisStructure = buildThesisStructure();
		try {
			const clean = ((await callLLM({
				max_tokens: 600,
				messages: [{
					role: "user",
					content: `صنّف هذا المصدر داخل هيكل الأطروحة التالية. اختر **فقط** من المعرفات الموجودة ولا تخترع جديدة.

الهيكل:
${JSON.stringify(thesisStructure, null, 2)}

بيانات المصدر:
- العنوان: ${title || "—"}
- المؤلف: ${author || "—"}
- النوع: ${sourceType || "—"}
- ملخص/سياق: ${summary || extraContext || "—"}

أجب بـ JSON فقط بدون code fences:
{"chapterId":1,"chapterName":"","sectionId":"","sectionName":"","subSectionId":null,"subSectionName":"","confidence":"high|medium|low","reason":""}`
				}]
			})).content?.map((c) => c.text || "").join("") || "{}").replace(/```json|```/g, "").trim();
			const match = clean.match(/\{[\s\S]*\}/);
			return reconcileClassification(JSON.parse(match ? match[0] : clean));
		} catch (err) {
			console.error("[classifyToStructure]", err);
			return null;
		}
	};
	const readFileAsBase64 = (file) => new Promise((resolve, reject) => {
		const r = new FileReader();
		r.onload = (e) => {
			const result = e.target.result || "";
			const comma = result.indexOf(",");
			resolve(comma >= 0 ? result.slice(comma + 1) : result);
		};
		r.onerror = reject;
		r.readAsDataURL(file);
	});
	const readFileAsText = (file) => new Promise((resolve, reject) => {
		const r = new FileReader();
		r.onload = (e) => resolve(e.target.result || "");
		r.onerror = reject;
		r.readAsText(file, "utf-8");
	});
	const MAX_LIB_FILE_SIZE = 500 * 1024 * 1024;
	const MAX_LIB_FILES_BATCH = 20;
	const MAX_LIB_TOTAL_SIZE = 1024 * 1024 * 1024;
	const updateLibrary = (updater) => {
		setLibrary((prev) => typeof updater === "function" ? updater(prev) : updater);
	};
	const handleLibFileUpload = async (files) => {
		if (!files?.length) return;
		const fileArr = Array.from(files);
		if (fileArr.length > MAX_LIB_FILES_BATCH) {
			showNotif(`⚠️ يمكن رفع حتى ${MAX_LIB_FILES_BATCH} ملف دفعة واحدة فقط`, "error");
			return;
		}
		if (fileArr.reduce((s, f) => s + f.size, 0) > MAX_LIB_TOTAL_SIZE) {
			showNotif(`⚠️ الحجم الإجمالي يتجاوز 1 غيغابايت — قلل عدد الملفات`, "error");
			return;
		}
		setLibUploading(true);
		const IMG_EXT = [
			"jpg",
			"jpeg",
			"png",
			"webp",
			"gif",
			"tif",
			"tiff",
			"bmp",
			"heic"
		];
		for (const file of fileArr) {
			const ext = (file.name.split(".").pop() || "").toLowerCase();
			const isImage = IMG_EXT.includes(ext);
			if (![
				"pdf",
				"md",
				"txt",
				"docx",
				...IMG_EXT
			].includes(ext)) {
				showNotif(`⚠️ ${file.name} — يُقبل: PDF, DOCX, MD, TXT, صور (JPG/PNG/TIFF…)`, "error");
				continue;
			}
			if (file.size > MAX_LIB_FILE_SIZE) {
				showNotif(`حجم الملف كبير جداً — الحد الأقصى 500 ميغابايت`, "error");
				continue;
			}
			let payload = null;
			let storedText = null;
			try {
				if (ext === "pdf") try {
					const { text: pdfText } = await extractPdfPages(file);
					storedText = pdfText || "";
					if (storedText.length < 100) payload = { text: `(ملف PDF ممسوح ضوئياً — لا يوجد نص قابل للاستخراج)\nاسم الملف: ${file.name}` };
					else payload = { text: storedText };
				} catch (pdfErr) {
					console.error("[lib-upload-pdf-extract]", pdfErr);
					payload = { text: `(تعذّر استخراج نص PDF)\nاسم الملف: ${file.name}` };
				}
				else if (isImage) payload = {
					base64: await readFileAsBase64(file),
					mimeType: file.type || `image/${ext === "jpg" ? "jpeg" : ext}`
				};
				else if (ext === "docx") {
					const arrayBuffer = await file.arrayBuffer();
					const { value } = await import_lib.extractRawText({ arrayBuffer });
					storedText = value || "";
					payload = { text: storedText };
				} else {
					storedText = await readFileAsText(file);
					payload = { text: storedText };
				}
			} catch (err) {
				console.error("[lib-upload-extract]", err);
				showNotif(`⚠️ تعذّر قراءة ${file.name}`, "error");
				continue;
			}
			const srcId = Date.now() + Math.random();
			let storagePath = null;
			try {
				storagePath = await uploadLibraryFile(file);
			} catch (e) {
				console.warn("[storage-upload]", e);
			}
			const newSrc = {
				id: srcId,
				fileName: file.name,
				fileType: ext,
				fileSize: file.size,
				uploadDate: (/* @__PURE__ */ new Date()).toLocaleDateString("ar-IQ"),
				status: "جاري التحليل...",
				analyzed: false,
				title: "",
				author: "",
				year: "",
				language: "",
				sourceType: "",
				chapterId: null,
				sections: [],
				priority: "★★",
				importantPages: "",
				summary: "",
				keywords: [],
				whyImportant: "",
				howToUse: "",
				keyPoints: [],
				storagePath,
				fileData: storedText
			};
			updateLibrary((prev) => [newSrc, ...prev]);
			const { error: insErr, errorType: insErrType } = await insertLibraryRow(newSrc);
			if (insErr) {
				setPendingLibIds((prev) => new Set([...prev, String(newSrc.id)]));
				showLibDiagIfNeeded(insErrType);
				showNotif("⚠️ فشل حفظ المصدر في السحابة — تم الحفظ محلياً وسيُعاد المحاولة", "warn");
			}
			const analysis = await analyzeSource(newSrc, payload);
			const analyzed = analysis && (analysis.title || analysis.summary || analysis.chapterId) ? {
				...newSrc,
				...analysis,
				analyzed: true,
				status: "تم التحليل ✅"
			} : {
				...newSrc,
				analyzed: false,
				status: "فشل التحليل ⚠️ — عدّل يدوياً"
			};
			updateLibrary((prev) => prev.map((s) => s.id === srcId ? analyzed : s));
			const { error: insErr2, errorType: insErrType2 } = await insertLibraryRow(analyzed);
			if (insErr2) {
				setPendingLibIds((prev) => new Set([...prev, String(analyzed.id)]));
				showLibDiagIfNeeded(insErrType2);
			} else setPendingLibIds((prev) => {
				const n = new Set(prev);
				n.delete(String(analyzed.id));
				return n;
			});
		}
		setLibUploading(false);
		showNotif("✅ اكتمل رفع وتحليل الملفات");
	};
	const handleLibUrlImport = async () => {
		if (!libUrlInput.trim()) return;
		setLibUrlLoading(true);
		try {
			const thesisStructure = buildThesisStructure();
			const clean = ((await callLLM({
				max_tokens: 1800,
				tools: [{
					type: "web_search_20250305",
					name: "web_search"
				}],
				messages: [{
					role: "user",
					content: `اذهب لهذا الرابط واستخرج بيانات المصدر لأطروحة "الخليج العربي في الحرب العالمية الثانية 1939-1945":\n${libUrlInput}\n\nهذا هو هيكل الأطروحة (اختر فقط من المعرفات أدناه ولا تخترع جديدة):\n${JSON.stringify(thesisStructure, null, 2)}\n\nأجب بـ JSON فقط بدون code fences:\n{"title":"","author":"","year":null,"language":"","sourceType":"","chapterId":1,"chapterName":"","sectionId":"","sectionName":"","subSectionId":null,"subSectionName":"","confidence":"high|medium|low","reason":"","sections":[],"priority":"★★","importantPages":"","summary":"","keywords":[],"whyImportant":"","howToUse":"","fileName":"${libUrlInput}"}`
				}]
			})).content?.map((c) => c.text || "").join("") || "{}").replace(/```json|```/g, "").trim();
			const match = clean.match(/\{[\s\S]*\}/);
			const parsed = reconcileClassification(JSON.parse(match ? match[0] : clean));
			const newSrc = {
				id: Date.now(),
				fileName: libUrlInput,
				fileType: "url",
				uploadDate: (/* @__PURE__ */ new Date()).toLocaleDateString("ar-IQ"),
				status: "تم التحليل ✅",
				analyzed: true,
				...parsed
			};
			setLibrary((prev) => [newSrc, ...prev]);
			const { error: insErr, errorType: insErrType } = await insertLibraryRow(newSrc);
			if (insErr) {
				setPendingLibIds((prev) => new Set([...prev, String(newSrc.id)]));
				showLibDiagIfNeeded(insErrType);
				showNotif("⚠️ فشل حفظ الرابط في السحابة — محفوظ محلياً وسيُعاد المحاولة", "warn");
			}
			setLibUrlInput("");
			showNotif("✅ تمت إضافة المصدر من الرابط");
		} catch {
			showNotif("⚠️ تعذّر استخراج البيانات — حاول مرة أخرى", "error");
		}
		setLibUrlLoading(false);
	};
	const handleLibExcelImport = async (fileList) => {
		const file = fileList?.[0] || fileList;
		if (!file) return;
		const ext = (file.name || "").split(".").pop().toLowerCase();
		if (!["xlsx", "xls"].includes(ext)) {
			showNotif("⚠️ يجب أن يكون الملف بصيغة Excel (.xlsx أو .xls)", "warn");
			return;
		}
		setLibExcelLoading(true);
		try {
			const parsed = await parseLibraryExcel(file, { chapters });
			const existingRefs = /* @__PURE__ */ new Set();
			for (const src of library) {
				const ref = extractRefFromNotes(src.notes);
				if (ref) existingRefs.add(ref);
			}
			let importedCount = 0;
			let skippedDup = 0;
			let errorCount = 0;
			const perChapter = {};
			const toInsert = [];
			for (const sheet of parsed.dataSheets) {
				const chKey = sheet.chapterTitle || sheet.sheetName;
				if (!perChapter[chKey]) perChapter[chKey] = {
					imported: 0,
					skipped: 0,
					errors: 0
				};
				for (const row of sheet.rows) {
					if (row.archiveRef && existingRefs.has(row.archiveRef)) {
						skippedDup += 1;
						perChapter[chKey].skipped += 1;
						continue;
					}
					try {
						const displayName = row.url || row.archiveRef || row.title || "excel-row";
						const src = {
							id: Date.now() + Math.random(),
							fileName: displayName,
							fileType: row.url ? "url" : "excel",
							uploadDate: (/* @__PURE__ */ new Date()).toLocaleDateString("ar-IQ"),
							status: "تم الاستيراد ✅",
							analyzed: true,
							title: row.title || row.archiveRef || "(بدون عنوان)",
							author: "",
							year: "",
							language: "",
							archiveRef: row.archiveRef || "",
							sourceType: row.sourceType || "",
							chapterId: sheet.chapterId,
							sectionId: row.sectionIdMatched || "",
							subSectionId: "",
							sections: row.sectionTitleMatched ? [row.sectionTitleMatched] : [],
							priority: row.priorityStars,
							importantPages: row.importantPages || "",
							summary: "",
							keywords: [],
							whyImportant: "",
							howToUse: "",
							keyPoints: [],
							notes: buildNotesWithRef(row.archiveRef, row.notes)
						};
						toInsert.push(src);
						if (row.archiveRef) existingRefs.add(row.archiveRef);
						importedCount += 1;
						perChapter[chKey].imported += 1;
					} catch (rowErr) {
						console.error("[excel-import-row]", sheet.sheetName, row.rowIndex, rowErr);
						errorCount += 1;
						perChapter[chKey].errors += 1;
					}
				}
			}
			if (toInsert.length) {
				updateLibrary((prev) => [...toInsert, ...prev]);
				for (const src of toInsert) try {
					const { error: insErr, errorType } = await insertLibraryRow(src);
					if (insErr) {
						setPendingLibIds((prev) => new Set([...prev, String(src.id)]));
						showLibDiagIfNeeded(errorType);
						errorCount += 1;
					}
				} catch (e) {
					console.error("[excel-import-persist]", e);
					errorCount += 1;
				}
			}
			const chapterLines = Object.entries(perChapter).map(([name, c]) => `   • ${name}: مستورد ${c.imported}${c.skipped ? ` — متجاهل (مكرر) ${c.skipped}` : ""}${c.errors ? ` — أخطاء ${c.errors}` : ""}`).join("\n");
			const skippedSheetsLine = parsed.skippedSheets.length ? `\nأوراق تم تخطيها (ليست بيانات):\n` + parsed.skippedSheets.map((s) => `   • ${s.sheetName} — ${s.reason}`).join("\n") : "";
			const sheetErrorsLine = (parsed.sheetErrors || []).length ? `\nأوراق فشلت أثناء المعالجة:\n` + parsed.sheetErrors.map((s) => `   • ${s.sheetName} — ${s.reason}`).join("\n") : "";
			const rowErrorsLine = (parsed.rowErrors || []).length ? `\nصفوف فشلت (${parsed.rowErrors.length}):\n` + parsed.rowErrors.slice(0, 8).map((e) => `   • ${e.sheetName} صف ${e.rowIndex} — ${e.reason}`).join("\n") + (parsed.rowErrors.length > 8 ? `\n   • …و ${parsed.rowErrors.length - 8} أخرى (راجع Console)` : "") : "";
			errorCount += (parsed.rowErrors || []).length;
			const t = parsed.totals || {};
			showNotif(`✅ اكتمل الاستيراد من ${file.name}\nتم فحص ${t.scannedRowCount ?? "?"} صف عبر ${t.dataSheetCount ?? "?"} ورقة بيانات (من أصل ${t.sheetCount ?? "?"} ورقة في الملف).\nاستيراد ناجح: ${importedCount}\nتجاهل (مكرر): ${skippedDup}\nفشل: ${errorCount}` + (chapterLines ? `\n\nتوزيع حسب الفصل:\n${chapterLines}` : "") + skippedSheetsLine + sheetErrorsLine + rowErrorsLine, importedCount ? "success" : "warn");
			console.log("[excel-import-summary]", {
				importedCount,
				skippedDup,
				errorCount,
				perChapter,
				totals: parsed.totals,
				skippedSheets: parsed.skippedSheets,
				sheetErrors: parsed.sheetErrors,
				rowErrors: parsed.rowErrors
			});
		} catch (err) {
			console.error("[handleLibExcelImport]", err);
			showNotif("⚠️ تعذّر قراءة ملف الإكسل — تأكد من صيغة .xlsx", "error");
		} finally {
			setLibExcelLoading(false);
			if (libExcelRef.current) libExcelRef.current.value = "";
		}
	};
	const updateLibSrc = (id, changes) => {
		setLibrary((prev) => prev.map((s) => s.id === id ? {
			...s,
			...changes
		} : s));
		if (libSelected?.id === id) setLibSelected({
			...libSelected,
			...changes
		});
		updateLibraryRow(id, changes).then(({ error }) => {
			if (error) showNotif("⚠️ فشل تحديث المصدر في السحابة", "error");
		});
	};
	const deleteLibSrc = (id) => {
		const target = library.find((s) => s.id === id);
		if (target?.storagePath) deleteLibraryFile(target.storagePath).catch(() => {});
		setLibrary((prev) => prev.filter((s) => s.id !== id));
		if (libSelected?.id === id) setLibSelected(null);
		deleteLibraryRow(id).then(({ error }) => {
			if (error) showNotif("⚠️ فشل حذف المصدر من السحابة", "error");
		});
		showNotif("🗑️ تم حذف المصدر");
	};
	const toggleLibSelect = (id) => {
		setLibSelectedIds((prev) => {
			const next = new Set(prev);
			const key = String(id);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	};
	const clearLibSelection = () => setLibSelectedIds(/* @__PURE__ */ new Set());
	const selectAllFilteredLib = (ids) => {
		setLibSelectedIds(new Set(ids.map(String)));
	};
	const bulkDeleteSelectedLib = async () => {
		if (libSelectedIds.size === 0) return;
		const ids = Array.from(libSelectedIds);
		const idSetStr = new Set(ids);
		const targets = library.filter((s) => idSetStr.has(String(s.id)));
		setLibBulkDeleting(true);
		setLibrary((prev) => prev.filter((s) => !idSetStr.has(String(s.id))));
		if (libSelected && idSetStr.has(String(libSelected.id))) setLibSelected(null);
		for (const t of targets) if (t?.storagePath) deleteLibraryFile(t.storagePath).catch(() => {});
		try {
			const { error, count } = await deleteLibraryRows(ids);
			if (error) showNotif(`⚠️ فشل حذف ${ids.length} مصدر من السحابة — أُزيلت محلياً فقط`, "error");
			else showNotif(`🗑️ تم حذف ${count} مصدر`);
		} finally {
			clearLibSelection();
			setLibBulkDeleting(false);
		}
	};
	const filteredLib = library.filter((s) => {
		const q = libFilter.query.toLowerCase();
		if (q && !s.title?.toLowerCase().includes(q) && !s.author?.toLowerCase().includes(q) && !s.fileName?.toLowerCase().includes(q) && !(s.keywords || []).join(" ").toLowerCase().includes(q)) return false;
		if (libFilter.chapterId && s.chapterId !== parseInt(libFilter.chapterId)) return false;
		if (libFilter.category && (s.sourceType || s.category) !== libFilter.category) return false;
		if (libFilter.priority && s.priority !== libFilter.priority) return false;
		return true;
	});
	const showNotif = (msg, type = "success") => {
		setNotif({
			msg,
			type
		});
		setTimeout(() => setNotif(null), 3500);
	};
	const combinedDocs = (() => {
		const libAsDocs = (library || []).map((s) => {
			const secId = s.subSectionId || s.sectionId || Array.isArray(s.sections) && s.sections[0] || "";
			return {
				id: typeof s.id === "string" && s.id.startsWith("lib-") ? s.id : `lib-${s.id}`,
				title: s.title || s.fileName || "مصدر من المكتبة",
				archiveRef: s.archiveRef || s.fileName || "",
				chapterId: typeof s.chapterId === "string" ? parseInt(s.chapterId) : s.chapterId,
				sectionId: secId,
				section: s.section || (Array.isArray(s.sections) ? s.sections.join("، ") : ""),
				priority: s.priority || "★★",
				category: s.sourceType || s.category || "كتاب",
				isNew: true,
				status: s.status || (s.analyzed ? "تم التحليل ✅" : "لم يُراجع"),
				notes: s.summary || s.whyImportant || "",
				author: s.author || "",
				year: s.year || "",
				fromLibrary: true
			};
		});
		return [...docs, ...libAsDocs];
	})();
	const filtered = docs.filter((d) => {
		const q = searchFilters.query.toLowerCase();
		if (q && !d.title.toLowerCase().includes(q) && !(d.archiveRef || "").toLowerCase().includes(q) && !(d.notes || "").toLowerCase().includes(q) && !(d.section || "").toLowerCase().includes(q)) return false;
		if (searchFilters.chapterId && d.chapterId !== parseInt(searchFilters.chapterId)) return false;
		if (searchFilters.priority && d.priority !== searchFilters.priority) return false;
		if (searchFilters.isNew === "new" && !d.isNew) return false;
		if (searchFilters.status && d.status !== searchFilters.status) return false;
		return true;
	}).sort((a, b) => {
		const p = {
			"★★★": 3,
			"★★": 2,
			"★": 1
		};
		return (p[b.priority] || 0) - (p[a.priority] || 0);
	});
	const stats = {
		total: combinedDocs.length,
		highP: combinedDocs.filter((d) => d.priority === "★★★").length,
		newDocs: combinedDocs.filter((d) => d.isNew).length,
		unreviewed: combinedDocs.filter((d) => d.status === "لم يُراجع").length,
		byChapter: CHAPTERS_DATA.map((ch) => ({
			...ch,
			count: combinedDocs.filter((d) => d.chapterId === ch.id).length
		}))
	};
	const handleUrlImport = async () => {
		if (!urlImport.trim()) return;
		setUrlLoading(true);
		setUrlResult(null);
		try {
			const clean = ((await callLLM({
				max_tokens: 3500,
				messages: [{
					role: "user",
					content: `اقرأ محتوى الصفحة على الرابط التالي واستخرج **جميع** المصادر/المراجع المذكورة فيها (قائمة كتب، ببليوغرافيا، نتائج بحث، فهرس وثائق… استهدف 10-20 عنصراً إن وُجدت). لا تختر مصدراً واحداً فقط.
الرابط: ${urlImport}

هيكل الأطروحة (للترشيح):
${chapters.map((ch) => `- [${ch.id}] ${ch.titleAr}`).join("\n")}

أعد JSON خالصاً فقط بدون أي شرح وبدون \`\`\`:
{
  "sources": [
    {
      "title": "العنوان",
      "author": "المؤلف (اسم العائلة، الاسم الأول)",
      "year": "السنة أو null",
      "publisher": "الناشر",
      "place": "مكان النشر",
      "edition": "الطبعة",
      "journal": "المجلة إن كان مقالاً",
      "volume": "المجلد",
      "issue": "العدد",
      "pages": "الصفحات",
      "university": "الجامعة إن كان رسالة",
      "archiveRef": "رقم الأرشيف إن وُجد",
      "url": "رابط الوصول إن وُجد",
      "sourceType": "أحد: كتاب عربي|كتاب أجنبي|رسالة ماجستير|أطروحة دكتوراه|بحث علمي|مجلة علمية|مؤتمر علمي|صحيفة|موقع إلكتروني|موسوعة|وثيقة أرشيفية|تقرير رسمي|مصدر أولي",
      "suggestedChapterId": رقم_الفصل_المقترح_أو_null,
      "relevance": "سطر واحد عن صلته بأطروحة الخليج العربي 1939-1945",
      "footnoteSummary": "ملخص مقترح للحاشية (سطران)"
    }
  ]
}

إن وجدت مصدراً واحداً فقط فأعده داخل المصفوفة. اعتمد على بيانات الصفحة فعلياً ولا تختلق مصادر.`
				}]
			})).content?.map((c) => c.text || "").join("") || "").replace(/```json|```/g, "").trim();
			const m = clean.match(/\{[\s\S]*\}/);
			const parsed = JSON.parse(m ? m[0] : clean);
			const rawItems = Array.isArray(parsed.sources) ? parsed.sources : parsed.title ? [parsed] : [];
			if (rawItems.length === 0) {
				showNotif("⚠️ لم يتم العثور على مصادر قابلة للاستخراج", "warn");
				setUrlLoading(false);
				return;
			}
			const items = rawItems.map((s, i) => ({
				...s,
				_idx: i,
				sourceType: s.sourceType || detectSourceTypeFromUrl(s.url || urlImport),
				url: s.url || urlImport,
				chapterId: s.suggestedChapterId || "",
				keep: true
			}));
			if (items.length === 1) {
				const parsedOne = items[0];
				setUrlResult(parsedOne);
				setUrlPreview({
					title: parsedOne.title || "",
					sourceType: parsedOne.sourceType,
					relevance: parsedOne.relevance || "—",
					footnoteSummary: parsedOne.footnoteSummary || "—",
					raw: parsedOne
				});
			} else setMultiUrlPreview({ items });
			showNotif(`✅ تم استخراج ${items.length} مصدر — راجع المعاينة قبل الحفظ`);
		} catch (e) {
			console.error("[url-import]", e);
			showNotif("⚠️ تعذّر استخراج البيانات تلقائياً — يمكنك الإدخال يدوياً", "warn");
		}
		setUrlLoading(false);
	};
	const saveAllMultiUrl = () => {
		if (!multiUrlPreview) return;
		const toSave = multiUrlPreview.items.filter((it) => it.keep && it.title);
		if (toSave.length === 0) {
			showNotif("لا توجد مصادر محددة للحفظ", "warn");
			return;
		}
		const baseId = Date.now();
		const newDocs = toSave.map((it, i) => ({
			id: baseId + i,
			title: it.title,
			author: it.author || "",
			year: it.year || null,
			publisher: it.publisher || "",
			place: it.place || "",
			edition: it.edition || "",
			journal: it.journal || "",
			volume: it.volume || "",
			issue: it.issue || "",
			pages: it.pages || "",
			university: it.university || "",
			archiveRef: it.archiveRef || "",
			url: it.url || "",
			sourceType: it.sourceType || "وثيقة أرشيفية",
			category: it.sourceType || "وثيقة أرشيفية",
			chapterId: it.chapterId ? parseInt(it.chapterId) : null,
			section: "",
			sectionId: "",
			priority: "★★",
			notes: it.footnoteSummary || it.relevance || "",
			keywords: "",
			isNew: true,
			status: "لم يُراجع"
		}));
		setDocs((prev) => [...newDocs, ...prev]);
		setMultiUrlPreview(null);
		showNotif(`✅ تم حفظ ${newDocs.length} مصدر في قاعدة الوثائق`);
		setPage("search");
	};
	const confirmUrlPreview = () => {
		if (!urlPreview) return;
		const parsed = urlPreview.raw || {};
		const detectedType = urlPreview.sourceType || parsed.sourceType || "وثيقة أرشيفية";
		setAddForm((prev) => ({
			...prev,
			...parsed,
			title: parsed.title || urlPreview.title || "",
			author: parsed.author || "",
			year: parsed.year || "",
			archiveRef: parsed.archiveRef || "",
			category: detectedType,
			sourceType: detectedType,
			notes: urlPreview.footnoteSummary || parsed.notes || "",
			keywords: parsed.keywords || ""
		}));
		setUrlPreview(null);
		setPage("add");
		showNotif("✅ تم نقل البيانات إلى نموذج الإضافة");
	};
	const extractBookMetadata = async () => {
		const title = (addForm.title || "").trim();
		if (!title) {
			showNotif("أدخل عنوان الكتاب أولاً", "warn");
			return;
		}
		setBookExtractLoading(true);
		try {
			const clean = ((await callLLM({
				max_tokens: 600,
				messages: [{
					role: "user",
					content: `استخرج بيانات الكتاب التالية بناءً على معرفتك الببليوغرافية الموثوقة فقط، ولا تختلق:
العنوان: "${title}"
${addForm.author ? `المؤلف المعروف: ${addForm.author}` : ""}

أعد JSON خالصاً فقط (بدون \`\`\`):
{
  "author": "اسم العائلة، الاسم الأول",
  "publisher": "دار النشر",
  "place": "مكان النشر",
  "year": "السنة",
  "edition": "الطبعة (الأولى/الثانية/…)",
  "verified": true_or_false
}
إن لم تتوفر معلومة موثوقة لحقل، اتركه فارغاً ("").`
				}]
			})).content?.map((c) => c.text || "").join("") || "{}").replace(/```json|```/g, "").trim();
			const m = clean.match(/\{[\s\S]*\}/);
			const parsed = JSON.parse(m ? m[0] : clean);
			setAddForm((prev) => ({
				...prev,
				author: parsed.author || prev.author,
				publisher: parsed.publisher || prev.publisher,
				place: parsed.place || prev.place,
				year: parsed.year || prev.year,
				edition: parsed.edition || prev.edition
			}));
			showNotif(parsed.verified === false ? "⚠️ بيانات تقريبية — راجعها قبل الحفظ" : "✅ تم استخراج بيانات الكتاب");
		} catch (e) {
			console.error("[book-extract]", e);
			showNotif("تعذّر الاستخراج التلقائي", "error");
		}
		setBookExtractLoading(false);
	};
	const handleEntityLookup = async () => {
		const q = entityQuery.trim();
		if (!q) return;
		setEntityLoading(true);
		setEntityResult(null);
		try {
			const clean = ((await callLLM({
				max_tokens: 1400,
				messages: [{
					role: "user",
					content: `أنت مساعد بحثي صارم لأطروحة دكتوراه: "الخليج العربي خلال الحرب العالمية الثانية 1939-1945".
الباحث يطلب تعريفاً أكاديمياً موثوقاً للكيان: "${q}".

متطلبات التعريف:
- اكتب تعريفاً مكثفاً في **ثمانية أسطر بالعربية الفصحى** بدقة أكاديمية عالية.
- اربط الكيان بسياقه التاريخي وبمنطقة الخليج العربي خلال 1939-1945 إن أمكن.
- لا تستخدم حشواً أو عبارات إنشائية؛ كل سطر يحمل معلومة جوهرية موثّقة.

سياسة الاستشهاد (صارمة جداً — لمنع الهلوسة):
- يُمنع منعاً باتاً اختراع أي مصدر أو مؤلف أو رابط.
- يُمنع الاستشهاد بمقالات ويب عامة، مدوّنات، ويكيبيديا، مواقع إخبارية، أو روابط مولّدة.
- المصادر المقبولة **فقط**: كتب أكاديمية محكّمة، مجلات علمية محكّمة (Journals)، أو رسائل/أطاريح جامعية (Theses/Dissertations) — معروفة بمؤلفها ودار نشرها/جامعتها وسنتها.
- إن لم تكن متيقّناً 100% من وجود مصدر أكاديمي محكّم قابل للتحقق، اضبط "verifiable": false واترك حقول المصدر فارغة تماماً ("") ولا تضع أي رابط.
- لا تضع حقل url إلا إذا كان رابطاً أكاديمياً حقيقياً معروفاً (JSTOR، Oxford Academic، Cambridge Core، Brill، dar.aucegypt، QDL، The National Archives UK). خلاف ذلك اتركه "".

أعد JSON خالصاً فقط بدون code fences:
{
  "name": "${q}",
  "definition": "تعريف من ثمانية أسطر بالعربية الفصحى، دقيق أكاديمياً، يربط الكيان بسياق الخليج العربي 1939-1945 إن أمكن",
  "verifiable": true_or_false,
  "sourceType": "book" | "journal" | "thesis" | "",
  "source": {
    "title": "",
    "author": "",
    "publisher": "",
    "year": "",
    "url": ""
  }
}`
				}]
			})).content?.map((c) => c.text || "").join("") || "{}").replace(/```json|```/g, "").trim();
			const m = clean.match(/\{[\s\S]*\}/);
			const parsed = JSON.parse(m ? m[0] : clean);
			const st = (parsed?.sourceType || "").toLowerCase();
			const hasCore = parsed?.source?.title && parsed?.source?.author;
			const academicType = [
				"book",
				"journal",
				"thesis"
			].includes(st);
			if (parsed.verifiable === false || !academicType || !hasCore) {
				parsed.verifiable = false;
				parsed.source = null;
				parsed.sourceType = "";
			}
			setEntityResult(parsed);
		} catch (e) {
			showNotif("⚠️ تعذّر استخراج التعريف — حاول مرة أخرى", "error");
		}
		setEntityLoading(false);
	};
	const handleAddDoc = async () => {
		if (!addForm.title) {
			showNotif("يجب إدخال عنوان الوثيقة", "error");
			return;
		}
		let cls = null;
		try {
			showNotif("🤖 جاري تصنيف المصدر داخل هيكل الأطروحة...");
			cls = await classifyToStructure({
				title: addForm.title,
				author: addForm.author,
				sourceType: addForm.sourceType || addForm.category,
				summary: addForm.notes,
				extraContext: [addForm.keywords, addForm.archiveRef].filter(Boolean).join(" | ")
			});
		} catch (e) {
			console.error("[add-classify]", e);
		}
		const finalChapterId = cls?.chapterId || (addForm.chapterId ? parseInt(addForm.chapterId) : null);
		const newDoc = {
			...addForm,
			id: docs.length + 100 + Math.floor(Math.random() * 100),
			chapterId: finalChapterId,
			sectionId: cls?.subSectionId || cls?.sectionId || addForm.sectionId || "",
			subSectionId: cls?.subSectionId || null,
			section: addForm.section || cls?.subSectionName || cls?.sectionName || "",
			classificationReason: cls?.classificationReason || "",
			classificationConfidence: cls?.classificationConfidence || "",
			year: addForm.year || null,
			sourceType: addForm.sourceType || addForm.category || "وثيقة أرشيفية",
			category: addForm.category || addForm.sourceType || "وثيقة أرشيفية"
		};
		setDocs((prev) => [newDoc, ...prev]);
		setAddForm({
			title: "",
			author: "",
			year: "",
			archiveRef: "",
			chapterId: "",
			section: "",
			priority: "★★",
			category: "مصدر أولي",
			country: "",
			keywords: "",
			notes: "",
			isNew: false,
			status: "لم يُراجع"
		});
		showNotif(`✅ تمت الإضافة — ${cls?.sectionName ? "صُنِّف في: " + (cls.subSectionName || cls.sectionName) : "الإجمالي: " + (docs.length + 1)}`);
		setPage("search");
	};
	const handleAI = async (doc) => {
		setAiLoading(true);
		setAiResult("");
		try {
			setAiResult((await callLLM({
				max_tokens: 1e3,
				messages: [{
					role: "user",
					content: `أنت مساعد بحثي متخصص في "الخليج العربي خلال الحرب العالمية الثانية 1939-1945".

حلّل هذه الوثيقة الأرشيفية:
العنوان: ${doc.title}
الرقم الأرشيفي: ${doc.archiveRef || "—"}
الفصل: ${CHAPTERS_DATA.find((c) => c.id === doc.chapterId)?.titleAr || "—"}
المبحث: ${doc.section || "—"}
الأولوية: ${doc.priority}
ملاحظات: ${doc.notes || "—"}

أعطني:
1. ملخص أكاديمي موجز عن محتوى هذه الوثيقة المتوقع (3-4 أسطر)
2. أهميتها للأطروحة وللمبحث المحدد
3. الأسئلة البحثية التي قد تجيب عنها
4. وثائق أخرى مكملة لها من نفس السلسلة (IOR)
5. كيف تدمجها مع باقي مصادر فصلها

أجب بالعربية بأسلوب أكاديمي مختصر.`
				}]
			})).content?.map((c) => c.text || "").join("") || "لم يُحصل على رد");
		} catch {
			setAiResult("خطأ في الاتصال");
		}
		setAiLoading(false);
	};
	const handleAISearch = async (q) => {
		if (!q) return;
		setAiLoading(true);
		setAiResult("");
		const docsCtx = combinedDocs.slice(0, 30).map((d) => `[${d.id}] ${d.title} | ${d.archiveRef || ""} | ف${d.chapterId}`).join("\n");
		try {
			setAiResult((await callLLM({
				max_tokens: 1800,
				messages: [{
					role: "user",
					content: `أنت مساعد بحثي أكاديمي متعمّق لأطروحة "الخليج العربي خلال الحرب العالمية الثانية 1939-1945".

سؤال الباحث: "${q}"

الوثائق المتاحة في مكتبته (${combinedDocs.length} وثيقة، أول 30 معروضة):
${docsCtx}

**متطلبات إلزامية لإجابتك — لا تختصر، لا عبارات إنشائية:**
اكتب إجابتك بالعربية الفصحى في أقسام مرقّمة بوضوح، وضمّنها الأقسام الأربعة التالية بأسمائها الحرفية كعناوين فرعية:

١) 📋 التحليل الأكاديمي
   - ناقش السؤال تحليلياً بربطه بالمصادر أعلاه (اذكر أرقام الوثائق [id] المرجعية).
   - إن لم تكفِ المصادر المتاحة، اقترح فجوات بحثية وخطوات لسدّها.

٢) ⭐ الأولوية والترتيب
   - قيّم أولوية المصادر المرتبطة بالسؤال (★★★ محوري / ★★ داعم / ★ ثانوي).
   - لكل مصدر أو مجموعة: **مبرّر الأولوية في سطر واحد** (لماذا هذا التقييم بالذات).

٣) 📄 الصفحات أو الأقسام المهمة داخل كل مصدر
   - إن أمكن استنتاجها من العناوين/الملخّصات، اذكر أرقام صفحات أو أسماء أقسام دقيقة.
   - إن تعذّر ذلك، اذكر بديلاً معقولاً (مثال: "راجع الفصل الأول من الوثيقة [12] المتعلق بـ…").

٤) 🎯 لماذا هذه المصادر مهمة لموضوع الأطروحة
   - اربط كل مصدر أو مجموعة بفصل/مبحث محدد من خطة الأطروحة.
   - وضّح الجانب البحثي الذي يغطّيه (سياسي/عسكري/اقتصادي/اجتماعي…).

٥) ✍️ كيف ومتى تُستخدم في الكتابة
   - اقترح استخدامات ملموسة (اقتباس مباشر / سياق تاريخي / إثبات فرضية / نقد قول سابق).
   - اذكر متى يُدرج المصدر في متن الأطروحة (أي فصل، أي مبحث، أي فقرة).

اجعل الإجابة كثيفة معلوماتياً — كل سطر يحمل معلومة نافعة.`
				}]
			})).content?.map((c) => c.text || "").join("") || "");
		} catch {
			setAiResult("خطأ في الاتصال");
		}
		setAiLoading(false);
	};
	const saveCustomFormat = () => {
		if (!customFmtForm.name.trim()) {
			showNotif("أدخل اسم الصيغة", "error");
			return;
		}
		let updated;
		if (editingCustomFmt !== null) {
			updated = customFormats.map((f, i) => i === editingCustomFmt ? { ...customFmtForm } : f);
			showNotif(`✅ تم تحديث الصيغة: ${customFmtForm.name}`);
		} else {
			if (customFormats.find((f) => f.name === customFmtForm.name)) {
				showNotif("يوجد صيغة بنفس الاسم", "error");
				return;
			}
			updated = [...customFormats, { ...customFmtForm }];
			showNotif(`✅ تم حفظ الصيغة: ${customFmtForm.name}`);
		}
		setCustomFormats(updated);
		try {
			localStorage.setItem("acadarchiv_custom_formats", JSON.stringify(updated));
		} catch {}
		setEditingCustomFmt(null);
		setShowCustomBuilder(false);
		setCustomFmtForm({
			name: "",
			templates: {
				"كتاب": "{المؤلف}. {العنوان}. {مكان_النشر}: {الناشر}، {السنة}م.",
				"وثيقة أرشيفية": "{المؤلف}. {العنوان}. {الرقم_الأرشيفي}، {السنة}م.",
				"رسالة علمية": "{المؤلف}. {العنوان}. رسالة {الدرجة}، {الجامعة}، {السنة}م.",
				"مقالة": "{المؤلف}. \"{العنوان}\". {اسم_المجلة}، م{المجلد}، ع{العدد} ({السنة})، ص{الصفحات}.",
				"صحيفة": "{المؤلف}. \"{العنوان}\". {اسم_الصحيفة}، {التاريخ}.",
				"موقع إلكتروني": "{المؤلف}. {العنوان}. متاح على: {الرابط}، تاريخ الزيارة: {تاريخ_الزيارة}.",
				"تقرير": "{المؤلف}. {العنوان}. {الجهة}، {السنة}م.",
				"أطروحة دكتوراه": "{المؤلف}. {العنوان}. أطروحة دكتوراه، {الجامعة}، {السنة}م."
			}
		});
	};
	const deleteCustomFormat = (i) => {
		const updated = customFormats.filter((_, idx) => idx !== i);
		setCustomFormats(updated);
		try {
			localStorage.setItem("acadarchiv_custom_formats", JSON.stringify(updated));
		} catch {}
		if (exportFormat === `custom_${i}`) setExportFormat("Chicago");
		showNotif("🗑️ تم حذف الصيغة");
	};
	const applyCustomTemplate = (tmpl, doc) => tmpl.replace(/{المؤلف}/g, doc.author || "أرشيف مكتب الهند").replace(/{العنوان}/g, doc.title || "").replace(/{السنة}/g, doc.year || "د.ت").replace(/{الرقم_الأرشيفي}/g, doc.archiveRef || "").replace(/{النوع}/g, doc.category || "").replace(/{الفصل}/g, CHAPTERS_DATA.find((c) => c.id === doc.chapterId)?.titleAr || "").replace(/{الملاحظات}/g, doc.notes || "").replace(/{الناشر}/g, doc.publisher || "[الناشر]").replace(/{مكان_النشر}/g, doc.place || "[مكان النشر]").replace(/{الجامعة}/g, doc.university || "[الجامعة]").replace(/{الدرجة}/g, doc.degree || "[الدرجة]").replace(/{اسم_المجلة}/g, doc.journal || "[اسم المجلة]").replace(/{المجلد}/g, doc.volume || "[م]").replace(/{العدد}/g, doc.issue || "[ع]").replace(/{الصفحات}/g, doc.pages || "[ص]").replace(/{اسم_الصحيفة}/g, doc.newspaper || "[الصحيفة]").replace(/{التاريخ}/g, doc.date || doc.year || "[التاريخ]").replace(/{الرابط}/g, doc.url || "[الرابط]").replace(/{تاريخ_الزيارة}/g, doc.accessDate || "[تاريخ الزيارة]").replace(/{الجهة}/g, doc.institution || "[الجهة]");
	const [cards, setCards] = (0, import_react.useState)(() => {
		try {
			const v = localStorage.getItem("acadarchiv_cards");
			return v && v !== "undefined" ? JSON.parse(v) : [];
		} catch {
			return [];
		}
	});
	const [cardView, setCardView] = (0, import_react.useState)("grid");
	const [selectedCard, setSelectedCard] = (0, import_react.useState)(null);
	const [cardForm, setCardForm] = (0, import_react.useState)({
		title: "",
		topic: "",
		date: "",
		chapterId: "",
		sectionId: "",
		tags: "",
		notes: ""
	});
	const [showCardForm, setShowCardForm] = (0, import_react.useState)(false);
	const [cardAiLoading, setCardAiLoading] = (0, import_react.useState)(false);
	const [cardAiResult, setCardAiResult] = (0, import_react.useState)("");
	const [cardFilterCh, setCardFilterCh] = (0, import_react.useState)("");
	const [cardSearchQ, setCardSearchQ] = (0, import_react.useState)("");
	const saveCards = (updated) => {
		setCards(updated);
		try {
			localStorage.setItem("acadarchiv_cards", JSON.stringify(updated));
		} catch {}
	};
	const generateSmartCard = async () => {
		if (!cardForm.title.trim()) {
			showNotif("أدخل عنوان البطاقة أولاً", "error");
			return;
		}
		setCardAiLoading(true);
		setCardAiResult("");
		const relatedDocs = docs.filter((d) => {
			if (cardForm.chapterId && d.chapterId !== parseInt(cardForm.chapterId)) return false;
			const q = cardForm.topic.toLowerCase();
			return !q || d.title.toLowerCase().includes(q) || (d.notes || "").toLowerCase().includes(q) || (d.section || "").toLowerCase().includes(q);
		}).slice(0, 12);
		const docsContext = relatedDocs.map((d) => `[${d.id}] "${d.title}" — ${d.archiveRef || ""} — ${d.section || ""} — ${d.notes || ""}`).join("\n");
		const chapName = chapters.find((c) => c.id === parseInt(cardForm.chapterId))?.titleAr || "كل الفصول";
		const prompt = `أنت مؤرخ أكاديمي متخصص في تاريخ "الخليج العربي خلال الحرب العالمية الثانية 1939-1945".

عنوان الجذاذة/البطاقة: "${cardForm.title}"
الموضوع: ${cardForm.topic || "—"}
التاريخ/الحقبة: ${cardForm.date || "—"}
الفصل المرتبط: ${chapName}
وسوم التصنيف: ${cardForm.tags || "—"}

المصادر المرتبطة من الأرشيف (${relatedDocs.length} مصدر):
${docsContext || "لم يُعثر على مصادر مطابقة"}

المطلوب: اصنع لي "بطاقة بحثية أكاديمية" متكاملة تتضمن:

1. **السياق التاريخي**: فقرة تحليلية (4-6 أسطر) توضح السياق التاريخي لهذا الحدث/الموضوع في إطار أطروحة الخليج والحرب العالمية الثانية.

2. **الاقتباسات والشواهد المرجعية**: استخرج أو اقترح الأفكار المحورية الموثقة في المصادر المذكورة أعلاه التي تصب في هذا الموضوع (3-5 نقاط).

3. **الصلة بالفصول**: حدد أي الفصول والمباحث يخدمها هذا الموضوع وكيف.

4. **أسئلة بحثية**: 3 أسئلة تحليلية يمكن للباحث طرحها عند صياغة هذا المحور.

5. **مصادر مقترحة إضافية**: اقترح مصادر إضافية (IOR أو غيرها) يمكن البحث عنها في QDL.

أجب بالعربية الأكاديمية الرصينة.`;
		try {
			setCardAiResult((await callLLM({
				max_tokens: 1500,
				messages: [{
					role: "user",
					content: prompt
				}]
			})).content?.map((c) => c.text || "").join("") || "لم يُحصل على رد");
		} catch {
			setCardAiResult("خطأ في الاتصال — تأكد من الإنترنت وحاول مجدداً");
		}
		setCardAiLoading(false);
	};
	const saveCard = () => {
		if (!cardForm.title.trim()) {
			showNotif("أدخل عنوان البطاقة", "error");
			return;
		}
		const relatedDocs = docs.filter((d) => {
			if (cardForm.chapterId && d.chapterId !== parseInt(cardForm.chapterId)) return false;
			const q = cardForm.topic.toLowerCase();
			return !q || d.title.toLowerCase().includes(q) || (d.notes || "").toLowerCase().includes(q);
		}).slice(0, 8).map((d) => d.id);
		saveCards([{
			id: Date.now() + Math.random(),
			title: cardForm.title,
			topic: cardForm.topic,
			date: cardForm.date,
			chapterId: cardForm.chapterId ? parseInt(cardForm.chapterId) : null,
			sectionId: cardForm.sectionId || null,
			tags: cardForm.tags.split("،").map((t) => t.trim()).filter(Boolean),
			notes: cardForm.notes,
			aiContent: cardAiResult,
			relatedDocIds: relatedDocs,
			createdAt: (/* @__PURE__ */ new Date()).toLocaleDateString("ar-IQ")
		}, ...cards]);
		setCardForm({
			title: "",
			topic: "",
			date: "",
			chapterId: "",
			sectionId: "",
			tags: "",
			notes: ""
		});
		setCardAiResult("");
		setShowCardForm(false);
		showNotif("✅ تم حفظ البطاقة البحثية");
	};
	const deleteCard = (id) => {
		saveCards(cards.filter((c) => c.id !== id));
		if (selectedCard?.id === id) {
			setSelectedCard(null);
			setCardView("grid");
		}
		showNotif("🗑️ تم حذف البطاقة");
	};
	const filteredCards = cards.filter((c) => {
		if (cardFilterCh && c.chapterId !== parseInt(cardFilterCh)) return false;
		if (cardSearchQ) {
			const q = cardSearchQ.toLowerCase();
			return c.title.toLowerCase().includes(q) || (c.topic || "").toLowerCase().includes(q) || (c.tags || []).join(" ").toLowerCase().includes(q);
		}
		return true;
	});
	const [translatorText, setTranslatorText] = (0, import_react.useState)("");
	const [translatorFile, setTranslatorFile] = (0, import_react.useState)(null);
	const [translatorFileName, setTranslatorFileName] = (0, import_react.useState)("");
	const [translatedResult, setTranslatedResult] = (0, import_react.useState)("");
	const [keyPoints, setKeyPoints] = (0, import_react.useState)([]);
	const [translatorLoading, setTranslatorLoading] = (0, import_react.useState)(false);
	const [translatorLang, setTranslatorLang] = (0, import_react.useState)("إنجليزية");
	const [translatorDocMeta, setTranslatorDocMeta] = (0, import_react.useState)(null);
	const [savedTranslations, setSavedTranslations] = (0, import_react.useState)(() => {
		try {
			const v = localStorage.getItem("acadarchiv_translations");
			return v && v !== "undefined" ? JSON.parse(v) : [];
		} catch {
			return [];
		}
	});
	const [selectedTranslation, setSelectedTranslation] = (0, import_react.useState)(null);
	const translatorFileRef = (0, import_react.useRef)(null);
	const saveTranslations = (updated) => {
		setSavedTranslations(updated);
		try {
			localStorage.setItem("acadarchiv_translations", JSON.stringify(updated));
		} catch {}
	};
	import_react.useEffect(() => {
		if (bibHydratedRef.current) syncBibDebounced(bibliography);
	}, [bibliography, syncBibDebounced]);
	import_react.useEffect(() => {
		if (cardsHydratedRef.current) syncCardsDebounced(cards);
	}, [cards, syncCardsDebounced]);
	import_react.useEffect(() => {
		if (trHydratedRef.current) syncTrDebounced(savedTranslations);
	}, [savedTranslations, syncTrDebounced]);
	import_react.useEffect(() => {
		if (fmtHydratedRef.current) syncFmtDebounced(customFormats);
	}, [customFormats, syncFmtDebounced]);
	const runImageOcrTranslation = async (imageDataUrls) => {
		setTranslatorLoading(true);
		setTranslatedResult("");
		setKeyPoints([]);
		setTranslatorDocMeta(null);
		const prompt = `أنت أرشيفي متخصص في وثائق مكتب الهند البريطاني (IOR) المتعلقة بالخليج العربي خلال الحرب العالمية الثانية 1939-1945.
هذه صور لوثيقة أرشيفية ممسوحة ضوئياً.
المطلوب:
1. قراءة كل النص الظاهر في الصور (OCR كامل بلغة الأصل)
2. ترجمة النص الكامل إلى عربية أكاديمية رصينة
3. استخراج 5 نقاط جوهرية مهمة لأطروحة دكتوراه عن الخليج العربي في الحرب العالمية الثانية
4. اقتراح الفصل الأنسب:
   - الفصل 1: أوضاع الخليج قبل الحرب
   - الفصل 2: الأهمية الاستراتيجية والعسكرية
   - الفصل 3: التحولات السياسية
   - الفصل 4: التحولات الاقتصادية

أجب بـ JSON فقط:
{
  "ocrText": "النص الكامل المستخرج بلغته الأصلية",
  "docMeta": {"estimatedTitle":"","author":"","date":"","docType":"","language":"إنجليزية","suggestedChapter":""},
  "translation": "الترجمة العربية الكاملة",
  "keyPoints": [
    {"rank":1,"point":"","chapter":"","importance":"★★★"},
    {"rank":2,"point":"","chapter":"","importance":"★★★"},
    {"rank":3,"point":"","chapter":"","importance":"★★"},
    {"rank":4,"point":"","chapter":"","importance":"★★"},
    {"rank":5,"point":"","chapter":"","importance":"★"}
  ]
}`;
		try {
			const content = [{
				type: "text",
				text: prompt
			}];
			for (const url of imageDataUrls) content.push({
				type: "image_url",
				image_url: { url }
			});
			const clean = ((await callLLM({
				forceProvider: "lovable",
				max_tokens: 3e3,
				messages: [{
					role: "user",
					content
				}]
			})).content?.map((c) => c.text || "").join("") || "{}").replace(/```json|```/g, "").trim();
			const jsonMatch = clean.match(/\{[\s\S]*\}/);
			const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : clean);
			if (parsed.ocrText) setTranslatorText(parsed.ocrText);
			setTranslatedResult(parsed.translation || "لم يتم الحصول على الترجمة");
			setKeyPoints(parsed.keyPoints || []);
			setTranslatorDocMeta(parsed.docMeta || null);
			showNotif("✅ تم استخراج النص والترجمة");
		} catch {
			showNotif("فشل تحليل الصورة — حاول مرة أخرى", "error");
		}
		setTranslatorLoading(false);
	};
	const fileToDataUrl = (file) => new Promise((resolve, reject) => {
		const r = new FileReader();
		r.onload = (e) => resolve(e.target.result);
		r.onerror = reject;
		r.readAsDataURL(file);
	});
	const extractPdfPages = async (file) => {
		const pdfjsLib = await import("./_libs/pdfjs-dist.mjs").then((n) => n.t);
		const workerUrl = (await import("./_ssr/pdf.worker-czr5L6JA.mjs")).default;
		pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
		const buf = await file.arrayBuffer();
		const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
		let text = "";
		for (let i = 1; i <= pdf.numPages; i++) {
			const content = await (await pdf.getPage(i)).getTextContent();
			text += content.items.map((it) => it.str).join(" ") + "\n";
		}
		const images = [];
		const maxPages = Math.min(pdf.numPages, 5);
		for (let i = 1; i <= maxPages; i++) {
			const page = await pdf.getPage(i);
			const viewport = page.getViewport({ scale: 1.5 });
			const canvas = document.createElement("canvas");
			canvas.width = viewport.width;
			canvas.height = viewport.height;
			const ctx = canvas.getContext("2d");
			await page.render({
				canvasContext: ctx,
				viewport,
				canvas
			}).promise;
			images.push(canvas.toDataURL("image/jpeg", .85));
		}
		return {
			text: text.trim(),
			images
		};
	};
	const handleTranslatorFileUpload = async (file) => {
		if (!file) return;
		const ext = file.name.split(".").pop().toLowerCase();
		if (![
			"txt",
			"md",
			"pdf",
			"jpg",
			"jpeg",
			"png",
			"webp"
		].includes(ext)) {
			showNotif("ارفع TXT أو MD أو PDF أو صورة (JPG/PNG/WEBP)", "warn");
			return;
		}
		setTranslatorFileName(file.name);
		setTranslatorFile(file);
		if (["txt", "md"].includes(ext)) {
			const reader = new FileReader();
			reader.onload = (e) => {
				setTranslatorText(e.target.result);
				showNotif(`✅ تم تحميل: ${file.name}`);
			};
			reader.readAsText(file, "utf-8");
			return;
		}
		if ([
			"jpg",
			"jpeg",
			"png",
			"webp"
		].includes(ext)) {
			showNotif("⏳ جاري قراءة الصورة وترجمتها...");
			try {
				await runImageOcrTranslation([await fileToDataUrl(file)]);
			} catch {
				showNotif("فشل قراءة الصورة", "error");
			}
			return;
		}
		if (ext === "pdf") {
			showNotif("⏳ جاري معالجة PDF...");
			try {
				const { text, images } = await extractPdfPages(file);
				if (text && text.length >= 100) {
					setTranslatorText(text);
					showNotif("✅ تم استخراج نص PDF — اضغط زر الترجمة");
				} else {
					showNotif("PDF ممسوح ضوئياً — جاري OCR عبر الذكاء الاصطناعي...");
					await runImageOcrTranslation(images);
				}
			} catch {
				showNotif("فشل قراءة ملف PDF", "error");
			}
			return;
		}
	};
	const runTranslation = async () => {
		const textToTranslate = translatorText.trim();
		if (!textToTranslate) {
			showNotif("أدخل أو ألصق النص الأجنبي أولاً", "error");
			return;
		}
		setTranslatorLoading(true);
		setTranslatedResult("");
		setKeyPoints([]);
		setTranslatorDocMeta(null);
		const prompt = `أنت مترجم ومؤرخ أكاديمي متخصص في وثائق الأرشيف البريطاني (مكتب الهند) والأمريكي المتعلقة بالخليج العربي في الحرب العالمية الثانية 1939-1945.

المهمة: ترجمة وتحليل الوثيقة/النص التالي (${translatorLang}) إلى العربية.

النص الأصلي:
"""
${textToTranslate.substring(0, 4e3)}
"""

أجب بـ JSON فقط بدون أي نص خارجه:
{
  "docMeta": {
    "estimatedTitle": "العنوان المستنتج من المحتوى",
    "author": "المؤلف أو الجهة إن وُجد",
    "date": "التاريخ إن وُجد",
    "docType": "نوع الوثيقة (تقرير/مراسلة/تعليمات/...)",
    "language": "${translatorLang}",
    "suggestedChapter": "اسم الفصل الأنسب"
  },
  "translation": "الترجمة العربية الكاملة بلغة تاريخية رصينة، محافظاً على أسماء الأعلام والأماكن والمصطلحات التاريخية الدقيقة",
  "keyPoints": [
    {"rank": 1, "point": "النقطة الجوهرية الأولى", "chapter": "الفصل المرتبط", "importance": "★★★"},
    {"rank": 2, "point": "النقطة الجوهرية الثانية", "chapter": "الفصل المرتبط", "importance": "★★★"},
    {"rank": 3, "point": "النقطة الجوهرية الثالثة", "chapter": "الفصل المرتبط", "importance": "★★"},
    {"rank": 4, "point": "النقطة الرابعة", "chapter": "الفصل المرتبط", "importance": "★★"},
    {"rank": 5, "point": "النقطة الخامسة", "chapter": "الفصل المرتبط", "importance": "★"}
  ]
}`;
		try {
			const clean = ((await callLLM({
				max_tokens: 2e3,
				messages: [{
					role: "user",
					content: prompt
				}]
			})).content?.map((c) => c.text || "").join("") || "{}").replace(/```json|```/g, "").trim();
			const parsed = JSON.parse(clean);
			setTranslatedResult(parsed.translation || "لم يتم الحصول على الترجمة");
			setKeyPoints(parsed.keyPoints || []);
			setTranslatorDocMeta(parsed.docMeta || null);
		} catch {
			setTranslatedResult("حدث خطأ في الترجمة — تأكد من الاتصال بالإنترنت");
			setKeyPoints([]);
		}
		setTranslatorLoading(false);
	};
	const saveTranslation = () => {
		if (!translatedResult) {
			showNotif("لا يوجد محتوى للحفظ", "error");
			return;
		}
		saveTranslations([{
			id: Date.now() + Math.random(),
			fileName: translatorFileName || "نص ملصوق",
			originalText: translatorText.substring(0, 500),
			translation: translatedResult,
			keyPoints,
			docMeta: translatorDocMeta,
			savedAt: (/* @__PURE__ */ new Date()).toLocaleDateString("ar-IQ")
		}, ...savedTranslations]);
		showNotif("✅ تم حفظ الترجمة في السجل");
	};
	const deleteTranslation = (id) => {
		saveTranslations(savedTranslations.filter((t) => t.id !== id));
		if (selectedTranslation?.id === id) setSelectedTranslation(null);
		showNotif("🗑️ تم حذف الترجمة");
	};
	const pColor = (p) => p === "★★★" ? "#16a34a" : p === "★★" ? "#ca8a04" : "#94a3b8";
	const pBg = (p) => p === "★★★" ? "#dcfce7" : p === "★★" ? "#fef9c3" : "#f1f5f9";
	const calcChapterProgress = (chapterId) => {
		const chDocs = combinedDocs.filter((d) => d.chapterId === chapterId);
		const chBibs = bibliography.filter((b) => {
			return combinedDocs.find((d) => d.id === b.docId)?.chapterId === chapterId;
		});
		const docScore = Math.min(chDocs.length / 10, 1) * 60;
		const bibScore = Math.min(chBibs.length / 5, 1) * 40;
		return Math.round(docScore + bibScore);
	};
	const calcOverallProgress = () => {
		const scores = [
			1,
			2,
			3,
			4
		].map((id) => calcChapterProgress(id));
		return Math.round(scores.reduce((a, b) => a + b, 0) / 4);
	};
	const DIVERSITY_CATEGORIES = [
		{
			key: "archival",
			label: "الوثائق والمصادر الأولية",
			color: "#8B5CF6",
			cats: [
				"مصدر أولي",
				"وثيقة أرشيفية",
				"تقرير رسمي",
				"تقرير"
			]
		},
		{
			key: "books",
			label: "الكتب",
			color: "#3B82F6",
			cats: [
				"كتاب",
				"كتاب عربي",
				"كتاب أجنبي"
			]
		},
		{
			key: "theses",
			label: "الرسائل والأطاريح",
			color: "#10B981",
			cats: [
				"رسالة علمية",
				"رسالة ماجستير",
				"أطروحة دكتوراه"
			]
		},
		{
			key: "journals",
			label: "البحوث والمجلات",
			color: "#F59E0B",
			cats: [
				"مقالة",
				"بحث",
				"بحث علمي",
				"مجلة علمية"
			]
		},
		{
			key: "confs",
			label: "المؤتمرات",
			color: "#06B6D4",
			cats: ["مؤتمر علمي", "مؤتمر"]
		},
		{
			key: "news",
			label: "الصحف",
			color: "#EF4444",
			cats: ["صحيفة"]
		},
		{
			key: "web",
			label: "المواقع والموسوعات",
			color: "#0EA5E9",
			cats: ["موقع إلكتروني", "موسوعة"]
		}
	];
	const calcDiversityForChapter = (chapterId) => {
		const chDocs = combinedDocs.filter((d) => d.chapterId === chapterId);
		const total = chDocs.length || 1;
		return DIVERSITY_CATEGORIES.map((dc) => {
			const count = chDocs.filter((d) => dc.cats.includes(d.category || "مصدر أولي")).length;
			return {
				...dc,
				count,
				pct: Math.round(count / total * 100)
			};
		}).filter((dc) => dc.count > 0);
	};
	const calcDiversityForSection = (sectionId) => {
		const secDocs = combinedDocs.filter((d) => d.sectionId === sectionId || d.sectionId?.startsWith(sectionId));
		const total = secDocs.length || 1;
		return DIVERSITY_CATEGORIES.map((dc) => {
			const count = secDocs.filter((d) => dc.cats.includes(d.category || "مصدر أولي")).length;
			return {
				...dc,
				count,
				pct: Math.round(count / total * 100)
			};
		}).filter((dc) => dc.count > 0);
	};
	const MOTIVATIONAL_QUOTES = [
		"يا دكتور أسعد، كلُّ وثيقةٍ تضيفها اليوم هي لَبِنةٌ راسخةٌ في صرحٍ علميٍّ سيُخلِّد اسمك بين مؤرخي الخليج العربي.",
		"يا دكتور أسعد، مجهودك اليوم يُقرِّبك خطوةً كبرى نحو اللقب الأكاديمي — استمر فأنت على الطريق الصحيح!",
		"يا دكتور أسعد، المؤرخُ الحقيقيُّ لا يخشى عمق الأرشيف، فأنت تُنقِّب في ذاكرة الخليج ما أهمله الآخرون.",
		"يا دكتور أسعد، أطروحتك تُعيدُ اكتشافَ فصلٍ مجهولٍ من تاريخ الخليج — لا يُنجز هذا إلا بالصبر والمثابرة التي أراها فيك.",
		"يا دكتور أسعد، إن وثيقةَ IOR التي تقرأها الآن ظلَّت حبيسةَ الأرشيف أكثر من ثمانين عاماً — أنت مَن يُعطيها صوتاً.",
		"يا دكتور أسعد، كلُّ هامشٍ تكتبه يُرسِّخ أمانةَ التوثيق العلمي — فابقَ شامخاً كالمحرّق التي حرستها قواعد الحلفاء.",
		"يا دكتور أسعد، الأرشيفُ البريطانيُّ فتحَ أبوابه لك — فاستخلص منه ما لم يستخلصه غيرك بعد."
	];
	const HISTORICAL_EVENTS = [
		{
			month: 1,
			day: 15,
			text: "في مثل هذا اليوم عام 1942م، صدرت تعليمات بريطانية سرية بتعزيز الحراسة على حقول نفط البحرين إثر تقارير عن تحركات غواصات ألمانية في المحيط الهندي."
		},
		{
			month: 2,
			day: 10,
			text: "في مثل هذا اليوم عام 1941م، وصل أول دفعة من الطائرات الأمريكية إلى قاعدة المحرّق الجوية في البحرين ضمن برنامج التعاون الأنجلو-أمريكي."
		},
		{
			month: 3,
			day: 20,
			text: "في مثل هذا اليوم عام 1943م، أجرت القوات البريطانية تدريبات دفاعية في مضيق هرمز استعداداً لأي هجوم بحري محتمل من دول المحور."
		},
		{
			month: 4,
			day: 5,
			text: "في مثل هذا اليوم عام 1940م، رصد المراقبون البريطانيون في الكويت تحركات مريبة لسفن تجارية لم تُفصح عن هويتها في شمال الخليج."
		},
		{
			month: 5,
			day: 12,
			text: "في مثل هذا اليوم عام 1942م، بدأت شركة بابكو (نفط البحرين) تطبيق خطة الإنكار الطارئة التي تقضي بتدمير المنشآت النفطية عند اقتراب العدو."
		},
		{
			month: 6,
			day: 8,
			text: "في مثل هذا اليوم عام 1941م، تسلّم الملك عبد العزيز آل سعود تقريراً بريطانياً سرياً حول تطورات الحرب في شمال أفريقيا وانعكاساتها على الخليج."
		},
		{
			month: 7,
			day: 22,
			text: "في مثل هذا اليوم عام 1943م، أفادت التقارير البريطانية بأن إنتاج نفط الكويت والبحرين بلغ ذروته لتلبية الطلب المتصاعد من الحلفاء في الجبهة الأوروبية."
		},
		{
			month: 8,
			day: 3,
			text: "في مثل هذا اليوم عام 1940م، أصدرت المقيمية البريطانية في بوشهر تعليمات لشيوخ الخليج بتشديد الرقابة على الموانئ لمنع التهريب إلى دول المحور."
		},
		{
			month: 9,
			day: 17,
			text: "في مثل هذا اليوم عام 1941م، أجرت بريطانيا والاتحاد السوفيتي عملية الغزو المشترك لإيران مما ألقى بظلاله الثقيلة على الأوضاع السياسية في الخليج العربي المجاور."
		},
		{
			month: 10,
			day: 28,
			text: "في مثل هذا اليوم عام 1942م، وصل إلى البحرين مراقبٌ بحريٌّ أمريكي رفيع المستوى لتقييم الأوضاع الأمنية في الخليج بعد تقارير عن اختراقات استخباراتية."
		},
		{
			month: 11,
			day: 14,
			text: "في مثل هذا اليوم عام 1944م، عُقد اجتماع سري في البحرين بين ضباط البحرية البريطانية والأمريكية لمناقشة مستقبل القواعد العسكرية في الخليج بعد الحرب."
		},
		{
			month: 12,
			day: 7,
			text: "في مثل هذا اليوم عام 1941م، هاجمت اليابان ميناء بيرل هاربر؛ الأمر الذي دفع القيادة البريطانية في الخليج إلى رفع درجة الاستعداد القصوى فوراً."
		}
	];
	const getTodayHistoricalEvent = () => {
		const now = /* @__PURE__ */ new Date();
		const month = now.getMonth() + 1;
		const day = now.getDate();
		const found = HISTORICAL_EVENTS.find((e) => e.month === month && e.day === day);
		if (found) return found.text;
		const byMonth = HISTORICAL_EVENTS.filter((e) => e.month === month);
		return byMonth.length > 0 ? byMonth[Math.floor(Math.random() * byMonth.length)].text : HISTORICAL_EVENTS[Math.floor(Math.random() * HISTORICAL_EVENTS.length)].text;
	};
	const [dailyQuoteIdx, setDailyQuoteIdx] = (0, import_react.useState)(() => (/* @__PURE__ */ new Date()).getDate() % MOTIVATIONAL_QUOTES.length);
	const [historicalEvent] = (0, import_react.useState)(getTodayHistoricalEvent);
	const [fuelCardExpanded, setFuelCardExpanded] = (0, import_react.useState)(true);
	const [defenseMessages, setDefenseMessages] = (0, import_react.useState)([]);
	const [defenseInput, setDefenseInput] = (0, import_react.useState)("");
	const [defenseLoading, setDefenseLoading] = (0, import_react.useState)(false);
	const [defenseActive, setDefenseActive] = (0, import_react.useState)(false);
	const [defenseChapter, setDefenseChapter] = (0, import_react.useState)(null);
	const defenseChatEndRef = (0, import_react.useRef)(null);
	const startDefenseSession = async (ch) => {
		setDefenseChapter(ch);
		setDefenseActive(true);
		setDefenseMessages([]);
		setDefenseLoading(true);
		const chDocs = combinedDocs.filter((d) => d.chapterId === ch.id);
		const diversityText = calcDiversityForChapter(ch.id).map((d) => `${d.label}: ${d.count} مصدر (${d.pct}%)`).join("، ");
		const docsContext = chDocs.slice(0, 15).map((d) => `• "${d.title}" [${d.archiveRef || "—"}]`).join("\n");
		const systemPrompt = `أنت أستاذ دكتور متخصص في التاريخ الحديث، وتؤدي دور رئيس لجنة مناقشة أطروحة دكتوراه بجامعة الموصل. أسلوبك علمي صارم ورصين، تطرح أسئلة نقدية ذكية ومباشرة. لا تُجامل ولا تُهادن، لكنك منصف وبنّاء.

الأطروحة: "الخليج العربي في سنوات الحرب العالمية الثانية 1939-1945"
الطالب: اسعد حامد اسعد النعيمي — جامعة الموصل
الفصل المُناقَش: ${ch.titleAr}

المصادر المُعتمدة في هذا الفصل (${chDocs.length} مصدر):
${docsContext}

توزيع أنواع المصادر: ${diversityText || "لم تُحدد بعد"}

ابدأ المناقشة بسؤال افتتاحي واحد محدد ومركَّز يتعلق بالفصل المذكور ومصادره. اجعل سؤالك يعكس ملاحظة دقيقة من قراءة المصادر الواردة. أجب دائماً بالعربية الفصحى الأكاديمية.`;
		try {
			setDefenseMessages([{
				role: "committee",
				text: (await callLLM({
					max_tokens: 600,
					system: systemPrompt,
					messages: [{
						role: "user",
						content: "ابدأ المناقشة"
					}]
				})).content?.map((c) => c.text || "").join("") || "حدث خطأ في بدء الجلسة.",
				ts: (/* @__PURE__ */ new Date()).toLocaleTimeString("ar")
			}]);
		} catch {
			setDefenseMessages([{
				role: "committee",
				text: "تعذّر الاتصال بنظام المحاكاة — تأكد من الاتصال بالإنترنت.",
				ts: (/* @__PURE__ */ new Date()).toLocaleTimeString("ar")
			}]);
		}
		setDefenseLoading(false);
	};
	const sendDefenseReply = async () => {
		if (!defenseInput.trim() || defenseLoading) return;
		const userMsg = {
			role: "student",
			text: defenseInput.trim(),
			ts: (/* @__PURE__ */ new Date()).toLocaleTimeString("ar")
		};
		const newMsgs = [...defenseMessages, userMsg];
		setDefenseMessages(newMsgs);
		setDefenseInput("");
		setDefenseLoading(true);
		const chDocs = combinedDocs.filter((d) => d.chapterId === defenseChapter?.id);
		const diversityText = calcDiversityForChapter(defenseChapter?.id).map((d) => `${d.label}: ${d.count} مصدر (${d.pct}%)`).join("، ");
		const systemPrompt = `أنت رئيس لجنة مناقشة أطروحة دكتوراه صارم وعالم. الأطروحة: "الخليج العربي في سنوات الحرب العالمية الثانية 1939-1945". الفصل: ${defenseChapter?.titleAr}. المصادر: ${chDocs.length} مصدر. توزيعها: ${diversityText}. بعد كل إجابة من الطالب، علِّق عليها بجملتين علميتين ثم اطرح سؤالاً نقدياً جديداً ذكياً يتعمق في الموضوع أو يكشف ثغرة محتملة. أسلوبك رصين وصارم وبنّاء. أجب بالعربية الفصحى الأكاديمية دائماً. لا تطل الردود: رد + سؤال واحد فقط.`;
		const apiMessages = newMsgs.map((m) => ({
			role: m.role === "student" ? "user" : "assistant",
			content: m.text
		}));
		try {
			const text = (await callLLM({
				max_tokens: 500,
				system: systemPrompt,
				messages: apiMessages
			})).content?.map((c) => c.text || "").join("") || "حدث خطأ.";
			setDefenseMessages((prev) => [...prev, {
				role: "committee",
				text,
				ts: (/* @__PURE__ */ new Date()).toLocaleTimeString("ar")
			}]);
		} catch {
			setDefenseMessages((prev) => [...prev, {
				role: "committee",
				text: "تعذّر الاتصال — حاول مرة أخرى.",
				ts: (/* @__PURE__ */ new Date()).toLocaleTimeString("ar")
			}]);
		}
		setDefenseLoading(false);
		setTimeout(() => defenseChatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
	};
	const endDefenseSession = () => {
		setDefenseActive(false);
		setDefenseChapter(null);
		setDefenseMessages([]);
		setDefenseInput("");
	};
	const [thesWordInput, setThesWordInput] = (0, import_react.useState)("");
	const [thesWordResult, setThesWordResult] = (0, import_react.useState)(null);
	const [thesWordLoading, setThesWordLoading] = (0, import_react.useState)(false);
	const [thesWordHistory, setThesWordHistory] = (0, import_react.useState)([]);
	const [thesPhrase, setThesPhrase] = (0, import_react.useState)("");
	const [thesPhraseResult, setThesPhraseResult] = (0, import_react.useState)(null);
	const [thesPhraseLoading, setThesPhraseLoading] = (0, import_react.useState)(false);
	const [thesPhraseHistory, setThesPhraseHistory] = (0, import_react.useState)([]);
	const [thesActiveTab, setThesActiveTab] = (0, import_react.useState)("synonyms");
	const runThesaurusSearch = async () => {
		const word = thesWordInput.trim();
		if (!word) {
			showNotif("أدخل كلمة للبحث عن مرادفاتها", "error");
			return;
		}
		setThesWordLoading(true);
		setThesWordResult(null);
		const prompt = `أنت معجم لغوي أكاديمي متخصص في اللغة العربية الفصحى والكتابة التاريخية الأكاديمية.

الكلمة المطلوب إيجاد مرادفاتها: "${word}"

السياق: هذه الكلمة تُستخدم في كتابة أطروحة دكتوراه بعنوان "الخليج العربي في سنوات الحرب العالمية الثانية 1939-1945".

المطلوب: قدّم 8 مرادفات أكاديمية فصيحة متنوعة، مراعياً تنوع السياقات الأكاديمية (سياسي، اقتصادي، عسكري، تاريخي).

أجب بـ JSON فقط بدون أي نص خارجه:
{
  "word": "${word}",
  "category": "الفئة الصرفية (فعل/اسم/صفة)",
  "semanticField": "الحقل الدلالي الرئيسي للكلمة",
  "synonyms": [
    {
      "word": "المرادف الأول",
      "formType": "ماضٍ/مضارع/مصدر/صفة",
      "register": "رسمي/تاريخي/أكاديمي/دبلوماسي",
      "context": "السياق الأنسب لاستخدامه (جملة أو وصف قصير)",
      "example": "مثال جملة كاملة بأسلوب أكاديمي تاريخي"
    }
  ],
  "avoidNote": "ملاحظة عن سبب تكرار الكلمة الأصلية وكيفية تفاديه"
}`;
		try {
			const clean = ((await callLLM({
				max_tokens: 1500,
				messages: [{
					role: "user",
					content: prompt
				}]
			})).content?.map((c) => c.text || "").join("") || "{}").replace(/```json|```/g, "").trim();
			const parsed = JSON.parse(clean);
			setThesWordResult(parsed);
			setThesWordHistory((prev) => [{
				word,
				result: parsed
			}, ...prev.filter((h) => h.word !== word)].slice(0, 8));
		} catch {
			showNotif("حدث خطأ في الاتصال — حاول مجدداً", "error");
		}
		setThesWordLoading(false);
	};
	const runPhraseUpgrade = async () => {
		const phrase = thesPhrase.trim();
		if (!phrase) {
			showNotif("أدخل العبارة أو التركيب المراد ترقيته", "error");
			return;
		}
		if (phrase.split(/\s+/).length > 12) {
			showNotif("الرجاء إدخال عبارة قصيرة (حتى 12 كلمة)", "warn");
			return;
		}
		setThesPhraseLoading(true);
		setThesPhraseResult(null);
		const prompt = `أنت أستاذ في اللغة العربية وأسلوب الكتابة التاريخية الأكاديمية، متخصص في أطاريح الدكتوراه.

العبارة أو التركيب المُدخَل: "${phrase}"
السياق: أطروحة دكتوراه بعنوان "الخليج العربي في سنوات الحرب العالمية الثانية 1939-1945"

المطلوب: أعد صياغة هذه العبارة بأساليب تاريخية أكاديمية رصينة تليق بمستوى الدكتوراه. قدّم 5 صياغات مختلفة تتباين في الأسلوب والتركيب.

أجب بـ JSON فقط بدون أي نص خارجه:
{
  "original": "${phrase}",
  "diagnosis": "تشخيص مختصر لمشكلة الصياغة الأصلية (ركاكة/تبسيط/غموض/...)",
  "upgrades": [
    {
      "text": "الصياغة المُرقَّاة",
      "style": "الأسلوب المُعتمد (وصفي/تحليلي/استنتاجي/علّي/بلاغي)",
      "note": "ملاحظة توضح ما أضافه هذا الأسلوب"
    }
  ],
  "generalTip": "نصيحة عامة للباحث حول كيفية الارتقاء بأسلوبه في هذا السياق التاريخي"
}`;
		try {
			const clean = ((await callLLM({
				max_tokens: 1500,
				messages: [{
					role: "user",
					content: prompt
				}]
			})).content?.map((c) => c.text || "").join("") || "{}").replace(/```json|```/g, "").trim();
			const parsed = JSON.parse(clean);
			setThesPhraseResult(parsed);
			setThesPhraseHistory((prev) => [{
				phrase,
				result: parsed
			}, ...prev.filter((h) => h.phrase !== phrase)].slice(0, 6));
		} catch {
			showNotif("حدث خطأ في الاتصال — حاول مجدداً", "error");
		}
		setThesPhraseLoading(false);
	};
	const REGISTER_COLOR = {
		"رسمي": "#3B82F6",
		"تاريخي": "#8B5CF6",
		"أكاديمي": "#10B981",
		"دبلوماسي": "#F59E0B",
		"وصفي": "#3B82F6",
		"تحليلي": "#8B5CF6",
		"استنتاجي": "#10B981",
		"علّي": "#F59E0B",
		"بلاغي": "#EF4444"
	};
	const navItems = [
		{
			id: "home",
			label: "الرئيسية",
			icon: "🏠"
		},
		{
			id: "structure",
			label: "هيكل الأطروحة",
			icon: "📖"
		},
		{
			id: "search",
			label: "الوثائق",
			icon: "🗂️"
		},
		{
			id: "cards",
			label: `بطاقات وجذاذات (${cards.length})`,
			icon: "🗃️"
		},
		{
			id: "translator",
			label: "ترجمة الوثائق الأجنبية",
			icon: "🌐"
		},
		{
			id: "thesaurus",
			label: "قاموس المؤرخ",
			icon: "📜"
		},
		{
			id: "library",
			label: `مكتبتي (${library.length})`,
			icon: "📚"
		},
		{
			id: "url_import",
			label: "استيراد رابط",
			icon: "🔗"
		},
		{
			id: "add",
			label: "إضافة",
			icon: "➕"
		},
		{
			id: "export",
			label: "تصدير",
			icon: "📤"
		},
		{
			id: "bibliography",
			label: `المراجع النهائية (${bibliography.length})`,
			icon: "📋"
		},
		{
			id: "defense",
			label: "محاكي المناقشة",
			icon: "🎓"
		},
		{
			id: "ai",
			label: "مساعد ذكي",
			icon: "🤖"
		},
		{
			id: "supervisor",
			label: "غرفة المشرف",
			icon: "👨‍🏫"
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		style: {
			fontFamily: "'Segoe UI',Tahoma,Geneva,Verdana,sans-serif",
			direction: "rtl",
			minHeight: "100vh",
			background: "#f1f5f9",
			color: "#1e293b"
		},
		children: [
			accessDenied && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				"data-testid": "access-denied-banner",
				style: {
					position: "fixed",
					inset: 0,
					zIndex: 10001,
					background: "rgba(15,23,42,0.95)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					padding: 20,
					direction: "rtl",
					fontFamily: "'Cairo',sans-serif"
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					style: {
						background: "white",
						borderRadius: 14,
						padding: 28,
						maxWidth: 480,
						width: "100%",
						textAlign: "center",
						boxShadow: "0 30px 60px rgba(0,0,0,.4)"
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							style: {
								fontSize: 40,
								marginBottom: 10
							},
							children: "🔒"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							style: {
								fontSize: 18,
								fontWeight: 800,
								color: "#dc2626",
								marginBottom: 8
							},
							children: "حساب غير مخوَّل"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								fontSize: 13,
								color: "#475569",
								lineHeight: 1.8,
								marginBottom: 18
							},
							children: [
								"هذا الأرشيف مقفل على حسابين مُصرَّح بهما فقط (الباحث + المشرف). حسابك الحالي ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: userEmail }),
								" غير مُدرج في قائمة الأشخاص المسموح لهم بالوصول."
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: handleLogout,
							"data-testid": "access-denied-logout",
							style: {
								padding: "10px 24px",
								borderRadius: 8,
								background: "#1e3a5f",
								color: "white",
								border: "none",
								cursor: "pointer",
								fontFamily: "inherit",
								fontSize: 14,
								fontWeight: 700
							},
							children: "🚪 تسجيل الخروج"
						})
					]
				})
			}),
			notif && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				style: {
					position: "fixed",
					top: 14,
					left: "50%",
					transform: "translateX(-50%)",
					zIndex: 9999,
					background: notif.type === "error" ? "#fee2e2" : notif.type === "warn" ? "#fef9c3" : "#dcfce7",
					color: notif.type === "error" ? "#dc2626" : notif.type === "warn" ? "#92400e" : "#16a34a",
					padding: "10px 24px",
					borderRadius: 12,
					fontWeight: 500,
					fontSize: 13,
					border: `1px solid ${notif.type === "error" ? "#fca5a5" : notif.type === "warn" ? "#fde68a" : "#86efac"}`,
					boxShadow: "0 4px 20px rgba(0,0,0,0.12)"
				},
				children: notif.msg
			}),
			confirmDialog && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				onClick: () => setConfirmDialog(null),
				style: {
					position: "fixed",
					inset: 0,
					zIndex: 1e4,
					background: "rgba(15,23,42,0.55)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					padding: 16
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					onClick: (e) => e.stopPropagation(),
					style: {
						background: "white",
						borderRadius: 14,
						padding: 24,
						maxWidth: 420,
						width: "100%",
						direction: "rtl",
						fontFamily: "inherit",
						boxShadow: "0 20px 60px rgba(0,0,0,0.25)"
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							style: {
								fontWeight: 700,
								fontSize: 17,
								color: "#1e293b",
								marginBottom: 10
							},
							children: confirmDialog.title
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							style: {
								fontSize: 13,
								color: "#475569",
								lineHeight: 1.8,
								marginBottom: 20,
								whiteSpace: "pre-line"
							},
							children: confirmDialog.message
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: 10,
								justifyContent: "flex-end"
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setConfirmDialog(null),
								style: {
									padding: "9px 18px",
									borderRadius: 8,
									background: "#e2e8f0",
									color: "#334155",
									border: "none",
									cursor: "pointer",
									fontFamily: "inherit",
									fontSize: 13,
									fontWeight: 600
								},
								children: "إلغاء"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => {
									const fn = confirmDialog.onConfirm;
									setConfirmDialog(null);
									if (fn) fn();
								},
								style: {
									padding: "9px 18px",
									borderRadius: 8,
									background: "#dc2626",
									color: "white",
									border: "none",
									cursor: "pointer",
									fontFamily: "inherit",
									fontSize: 13,
									fontWeight: 600
								},
								children: "نعم، احذف"
							})]
						})
					]
				})
			}),
			footnoteModal && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				style: {
					position: "fixed",
					inset: 0,
					background: "rgba(0,0,0,0.5)",
					zIndex: 1e4,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					padding: 16
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					style: {
						background: "white",
						borderRadius: 16,
						padding: 24,
						maxWidth: 620,
						width: "100%",
						boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
						direction: "rtl",
						maxHeight: "90vh",
						overflowY: "auto"
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								marginBottom: 14
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								style: {
									fontWeight: 700,
									fontSize: 15,
									color: "#1e293b"
								},
								children: "📝 توليد هامش المتن"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setFootnoteModal(null),
								style: {
									background: "#f1f5f9",
									border: "none",
									borderRadius: 8,
									width: 30,
									height: 30,
									cursor: "pointer",
									fontSize: 16,
									color: "#64748b"
								},
								children: "✕"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								background: "#f8fafc",
								borderRadius: 10,
								padding: 12,
								marginBottom: 14,
								border: "0.5px solid #e2e8f0",
								fontSize: 12,
								lineHeight: 1.9
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "العنوان:" }),
									" ",
									footnoteModal.title || "—"
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "المؤلف:" }),
									" ",
									footnoteModal.author || "—"
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "النوع:" }),
									" ",
									footnoteModal.category || footnoteModal.sourceType || "وثيقة أرشيفية"
								] })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: { marginBottom: 12 },
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									style: {
										fontSize: 12,
										color: "#475569",
										display: "block",
										marginBottom: 6,
										fontWeight: 500
									},
									children: "رقم الصفحة *"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									ref: footnotePageRef,
									type: "text",
									required: true,
									value: footnotePageNum,
									onChange: (e) => {
										setFootnotePageNum(e.target.value);
										setFootnoteResult("");
									},
									onKeyDown: (e) => {
										if (e.key === "Enter") handleGenerateFootnote();
									},
									"aria-label": "Page Number",
									placeholder: "مثال: 45 أو 45-47",
									style: {
										width: "100%",
										padding: "10px 14px",
										borderRadius: 8,
										border: `1.5px solid ${footnotePageNum.trim() ? "#86efac" : "#fca5a5"}`,
										fontSize: 14,
										fontFamily: "inherit",
										boxSizing: "border-box",
										outline: "none"
									}
								}),
								!footnotePageNum.trim() && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										fontSize: 11,
										color: "#dc2626",
										marginTop: 4
									},
									children: "⚠️ يجب إدخال رقم الصفحة قبل توليد الهامش"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: handleGenerateFootnote,
							disabled: !footnotePageNum.trim(),
							style: {
								width: "100%",
								padding: "10px",
								borderRadius: 8,
								background: footnotePageNum.trim() ? "#3B82F6" : "#cbd5e1",
								color: "white",
								border: "none",
								cursor: footnotePageNum.trim() ? "pointer" : "not-allowed",
								fontWeight: 700,
								fontFamily: "inherit",
								fontSize: 13,
								marginBottom: 14
							},
							children: "توليد الهامش"
						}),
						footnoteResult && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: { marginBottom: 12 },
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								style: {
									fontSize: 12,
									color: "#475569",
									display: "block",
									marginBottom: 6,
									fontWeight: 500
								},
								children: "الهامش المُولَّد (يمكن التعديل)"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								value: footnoteResult,
								onChange: (e) => setFootnoteResult(e.target.value),
								rows: 5,
								style: {
									width: "100%",
									padding: 10,
									borderRadius: 8,
									border: "1px solid #cbd5e1",
									fontSize: 13,
									fontFamily: "inherit",
									boxSizing: "border-box",
									direction: "rtl",
									lineHeight: 1.8,
									resize: "vertical"
								}
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: 8
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: copyFootnoteAndRegister,
								disabled: !footnoteResult.trim(),
								style: {
									flex: 1,
									padding: "10px",
									borderRadius: 8,
									background: footnoteResult.trim() ? "#10B981" : "#cbd5e1",
									color: "white",
									border: "none",
									cursor: footnoteResult.trim() ? "pointer" : "not-allowed",
									fontWeight: 700,
									fontFamily: "inherit",
									fontSize: 13
								},
								children: "📋 نسخ الهامش"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setFootnoteModal(null),
								style: {
									padding: "9px 16px",
									borderRadius: 8,
									background: "#f1f5f9",
									border: "0.5px solid #cbd5e1",
									cursor: "pointer",
									fontFamily: "inherit",
									fontSize: 13,
									color: "#475569"
								},
								children: "إغلاق"
							})]
						})
					]
				})
			}),
			urlPreview && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				style: {
					position: "fixed",
					inset: 0,
					background: "rgba(0,0,0,0.5)",
					zIndex: 1e4,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					padding: 16
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					style: {
						background: "white",
						borderRadius: 16,
						padding: 24,
						maxWidth: 620,
						width: "100%",
						boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
						direction: "rtl"
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								marginBottom: 14
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								style: {
									fontWeight: 700,
									fontSize: 15,
									color: "#1e293b"
								},
								children: "🔗 معاينة المصدر المستخرَج"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setUrlPreview(null),
								style: {
									background: "#f1f5f9",
									border: "none",
									borderRadius: 8,
									width: 30,
									height: 30,
									cursor: "pointer",
									fontSize: 16,
									color: "#64748b"
								},
								children: "✕"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								display: "grid",
								gap: 10,
								fontSize: 13,
								marginBottom: 14
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "العنوان:" }),
									" ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: urlPreview.title,
										onChange: (e) => setUrlPreview((p) => ({
											...p,
											title: e.target.value
										})),
										style: {
											width: "100%",
											padding: "7px 10px",
											borderRadius: 7,
											border: "0.5px solid #cbd5e1",
											fontSize: 13,
											fontFamily: "inherit",
											marginTop: 4
										}
									})
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "نوع المصدر:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
									value: urlPreview.sourceType,
									onChange: (e) => setUrlPreview((p) => ({
										...p,
										sourceType: e.target.value
									})),
									style: {
										width: "100%",
										padding: "7px 10px",
										borderRadius: 7,
										border: "0.5px solid #cbd5e1",
										fontSize: 13,
										fontFamily: "inherit",
										marginTop: 4
									},
									children: [
										"كتاب عربي",
										"كتاب أجنبي",
										"رسالة ماجستير",
										"أطروحة دكتوراه",
										"بحث علمي",
										"مجلة علمية",
										"مؤتمر علمي",
										"صحيفة",
										"موقع إلكتروني",
										"موسوعة",
										"وثيقة أرشيفية",
										"تقرير رسمي",
										"مصدر أولي"
									].map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: t,
										children: t
									}, t))
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "الصلة بالأطروحة:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
									value: urlPreview.relevance,
									onChange: (e) => setUrlPreview((p) => ({
										...p,
										relevance: e.target.value
									})),
									rows: 2,
									style: {
										width: "100%",
										padding: "7px 10px",
										borderRadius: 7,
										border: "0.5px solid #cbd5e1",
										fontSize: 13,
										fontFamily: "inherit",
										marginTop: 4,
										resize: "vertical"
									}
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "ملخص الحاشية المقترح:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
									value: urlPreview.footnoteSummary,
									onChange: (e) => setUrlPreview((p) => ({
										...p,
										footnoteSummary: e.target.value
									})),
									rows: 3,
									style: {
										width: "100%",
										padding: "7px 10px",
										borderRadius: 7,
										border: "0.5px solid #cbd5e1",
										fontSize: 13,
										fontFamily: "inherit",
										marginTop: 4,
										resize: "vertical"
									}
								})] })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: 8,
								justifyContent: "flex-end"
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setUrlPreview(null),
								style: {
									padding: "8px 16px",
									borderRadius: 8,
									background: "white",
									border: "0.5px solid #cbd5e1",
									color: "#64748b",
									cursor: "pointer",
									fontFamily: "inherit",
									fontSize: 13
								},
								children: "إلغاء"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: confirmUrlPreview,
								style: {
									padding: "8px 16px",
									borderRadius: 8,
									background: "#10b981",
									color: "white",
									border: "none",
									cursor: "pointer",
									fontFamily: "inherit",
									fontWeight: 600,
									fontSize: 13
								},
								children: "✅ تأكيد ومتابعة الإضافة"
							})]
						})
					]
				})
			}),
			multiUrlPreview && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				style: {
					position: "fixed",
					inset: 0,
					background: "rgba(0,0,0,0.5)",
					zIndex: 1e4,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					padding: 16
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					style: {
						background: "white",
						borderRadius: 16,
						padding: 20,
						maxWidth: 1e3,
						width: "100%",
						boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
						direction: "rtl",
						maxHeight: "92vh",
						display: "flex",
						flexDirection: "column"
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								marginBottom: 12
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									fontWeight: 700,
									fontSize: 15,
									color: "#1e293b"
								},
								children: [
									"📦 تم استخراج ",
									multiUrlPreview.items.length,
									" مصدر — راجع وحرّر قبل الحفظ"
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setMultiUrlPreview(null),
								style: {
									background: "#f1f5f9",
									border: "none",
									borderRadius: 8,
									width: 30,
									height: 30,
									cursor: "pointer",
									fontSize: 16,
									color: "#64748b"
								},
								children: "✕"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							style: {
								fontSize: 11,
								color: "#64748b",
								marginBottom: 10
							},
							children: "أزل علامة \"الإبقاء\" لتجاهل أي مصدر — يمكنك تعديل كل الحقول."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							style: {
								overflowY: "auto",
								flex: 1,
								display: "flex",
								flexDirection: "column",
								gap: 10,
								paddingLeft: 4
							},
							children: multiUrlPreview.items.map((it, i) => {
								const upd = (k, v) => setMultiUrlPreview((p) => ({
									...p,
									items: p.items.map((x, j) => j === i ? {
										...x,
										[k]: v
									} : x)
								}));
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										border: "0.5px solid #e2e8f0",
										borderRadius: 10,
										padding: 12,
										background: it.keep ? "#fff" : "#f8fafc",
										opacity: it.keep ? 1 : .55
									},
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											style: {
												display: "flex",
												gap: 8,
												alignItems: "center",
												marginBottom: 8
											},
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
													style: {
														display: "flex",
														alignItems: "center",
														gap: 6,
														fontSize: 11,
														color: "#475569",
														cursor: "pointer"
													},
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
														type: "checkbox",
														checked: it.keep,
														onChange: (e) => upd("keep", e.target.checked)
													}), "الإبقاء"]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													style: {
														fontSize: 11,
														background: "#e0e7ff",
														color: "#3730a3",
														padding: "2px 8px",
														borderRadius: 5,
														fontWeight: 600
													},
													children: ["#", i + 1]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
													value: it.sourceType || "",
													onChange: (e) => upd("sourceType", e.target.value),
													style: {
														padding: "5px 8px",
														borderRadius: 6,
														border: "0.5px solid #cbd5e1",
														fontSize: 11,
														fontFamily: "inherit"
													},
													children: [
														"كتاب عربي",
														"كتاب أجنبي",
														"رسالة ماجستير",
														"أطروحة دكتوراه",
														"بحث علمي",
														"مجلة علمية",
														"مؤتمر علمي",
														"صحيفة",
														"موقع إلكتروني",
														"موسوعة",
														"وثيقة أرشيفية",
														"تقرير رسمي",
														"مصدر أولي"
													].map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
														value: t,
														children: t
													}, t))
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
													value: it.chapterId || "",
													onChange: (e) => upd("chapterId", e.target.value),
													style: {
														padding: "5px 8px",
														borderRadius: 6,
														border: "0.5px solid #cbd5e1",
														fontSize: 11,
														fontFamily: "inherit",
														flex: 1
													},
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
														value: "",
														children: "— اختر الفصل المقترح —"
													}), chapters.map((ch) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
														value: ch.id,
														children: ch.titleAr.split(":")[0]
													}, ch.id))]
												})
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											style: {
												display: "grid",
												gridTemplateColumns: "repeat(2,1fr)",
												gap: 8
											},
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													value: it.title || "",
													onChange: (e) => upd("title", e.target.value),
													placeholder: "العنوان",
													style: {
														gridColumn: "1/-1",
														padding: "6px 10px",
														borderRadius: 6,
														border: "0.5px solid #cbd5e1",
														fontSize: 12,
														fontFamily: "inherit"
													}
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													value: it.author || "",
													onChange: (e) => upd("author", e.target.value),
													placeholder: "المؤلف (اسم العائلة، الاسم الأول)",
													style: {
														padding: "6px 10px",
														borderRadius: 6,
														border: "0.5px solid #cbd5e1",
														fontSize: 12,
														fontFamily: "inherit"
													}
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													value: it.publisher || "",
													onChange: (e) => upd("publisher", e.target.value),
													placeholder: "الناشر",
													style: {
														padding: "6px 10px",
														borderRadius: 6,
														border: "0.5px solid #cbd5e1",
														fontSize: 12,
														fontFamily: "inherit"
													}
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													value: it.place || "",
													onChange: (e) => upd("place", e.target.value),
													placeholder: "مكان النشر",
													style: {
														padding: "6px 10px",
														borderRadius: 6,
														border: "0.5px solid #cbd5e1",
														fontSize: 12,
														fontFamily: "inherit"
													}
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													value: it.year || "",
													onChange: (e) => upd("year", e.target.value),
													placeholder: "السنة",
													style: {
														padding: "6px 10px",
														borderRadius: 6,
														border: "0.5px solid #cbd5e1",
														fontSize: 12,
														fontFamily: "inherit"
													}
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													value: it.edition || "",
													onChange: (e) => upd("edition", e.target.value),
													placeholder: "الطبعة",
													style: {
														padding: "6px 10px",
														borderRadius: 6,
														border: "0.5px solid #cbd5e1",
														fontSize: 12,
														fontFamily: "inherit"
													}
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													value: it.url || "",
													onChange: (e) => upd("url", e.target.value),
													placeholder: "الرابط",
													style: {
														padding: "6px 10px",
														borderRadius: 6,
														border: "0.5px solid #cbd5e1",
														fontSize: 12,
														fontFamily: "inherit",
														direction: "ltr"
													}
												})
											]
										}),
										it.relevance && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											style: {
												fontSize: 11,
												color: "#64748b",
												marginTop: 6
											},
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "الصلة:" }),
												" ",
												it.relevance
											]
										})
									]
								}, i);
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: 8,
								justifyContent: "flex-end",
								marginTop: 12,
								paddingTop: 12,
								borderTop: "0.5px solid #e2e8f0"
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setMultiUrlPreview(null),
								style: {
									padding: "8px 16px",
									borderRadius: 8,
									background: "white",
									border: "0.5px solid #cbd5e1",
									color: "#64748b",
									cursor: "pointer",
									fontFamily: "inherit",
									fontSize: 13
								},
								children: "إلغاء"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: saveAllMultiUrl,
								style: {
									padding: "8px 18px",
									borderRadius: 8,
									background: "#10b981",
									color: "white",
									border: "none",
									cursor: "pointer",
									fontFamily: "inherit",
									fontWeight: 600,
									fontSize: 13
								},
								children: [
									"✅ حفظ ",
									multiUrlPreview.items.filter((x) => x.keep).length,
									" مصدر"
								]
							})]
						})
					]
				})
			}),
			bulkFootnoteModal && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				style: {
					position: "fixed",
					inset: 0,
					background: "rgba(0,0,0,0.5)",
					zIndex: 1e4,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					padding: 16
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					style: {
						background: "white",
						borderRadius: 16,
						padding: 24,
						maxWidth: 760,
						width: "100%",
						boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
						direction: "rtl",
						maxHeight: "90vh",
						overflowY: "auto"
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							marginBottom: 14
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								fontWeight: 700,
								fontSize: 15,
								color: "#1e293b"
							},
							children: [
								"📝 توليد هوامش متعددة (",
								bulkFootnoteModal.items.length,
								")"
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setBulkFootnoteModal(null),
							style: {
								background: "#f1f5f9",
								border: "none",
								borderRadius: 8,
								width: 30,
								height: 30,
								cursor: "pointer",
								fontSize: 16,
								color: "#64748b"
							},
							children: "✕"
						})]
					}), !bulkFootnoteModal.generated ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							style: {
								fontSize: 12,
								color: "#475569",
								marginBottom: 10
							},
							children: "أدخل رقم الصفحة لكل مصدر، ثم اضغط \"توليد الهوامش\"."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							style: {
								maxHeight: "50vh",
								overflowY: "auto",
								border: "0.5px solid #e2e8f0",
								borderRadius: 8,
								marginBottom: 14
							},
							children: bulkFootnoteModal.items.map((it, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: 10,
									padding: "8px 10px",
									borderBottom: "0.5px solid #f1f5f9",
									fontSize: 12
								},
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										style: {
											fontWeight: 700,
											color: "#64748b",
											minWidth: 22
										},
										children: [idx + 1, "."]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										style: {
											flex: 1,
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap"
										},
										title: it.doc.title,
										children: it.doc.title
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										style: {
											fontSize: 11,
											color: "#475569"
										},
										children: "ص"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "text",
										value: it.page,
										onChange: (e) => {
											const v = e.target.value;
											setBulkFootnoteModal((m) => ({
												...m,
												items: m.items.map((x, i) => i === idx ? {
													...x,
													page: v
												} : x)
											}));
										},
										placeholder: "رقم الصفحة",
										style: {
											width: 120,
											padding: "6px 8px",
											borderRadius: 6,
											border: "0.5px solid #cbd5e1",
											fontSize: 12,
											fontFamily: "inherit"
										}
									})
								]
							}, it.doc.id))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: 8,
								justifyContent: "flex-end"
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => {
									if (bulkFootnoteModal.items.some((it) => !it.page.trim())) {
										showNotif("⚠️ أدخل رقم الصفحة لكل مصدر", "error");
										return;
									}
									const generated = bulkFootnoteModal.items.map((it) => ({
										doc: it.doc,
										page: it.page.trim(),
										text: buildArabicCitation(it.doc, it.page.trim(), true)
									}));
									setBulkFootnoteModal((m) => ({
										...m,
										generated
									}));
								},
								style: {
									padding: "9px 18px",
									borderRadius: 8,
									background: "#3B82F6",
									color: "white",
									border: "none",
									cursor: "pointer",
									fontWeight: 700,
									fontFamily: "inherit",
									fontSize: 13
								},
								children: "توليد الهوامش"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setBulkFootnoteModal(null),
								style: {
									padding: "9px 16px",
									borderRadius: 8,
									background: "#f1f5f9",
									border: "0.5px solid #cbd5e1",
									cursor: "pointer",
									fontFamily: "inherit",
									fontSize: 13,
									color: "#475569"
								},
								children: "إغلاق"
							})]
						})
					] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							style: {
								fontSize: 12,
								color: "#475569",
								marginBottom: 10
							},
							children: "يمكنك تعديل أي هامش قبل النسخ والإضافة للمراجع النهائية."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							style: {
								maxHeight: "55vh",
								overflowY: "auto",
								marginBottom: 14
							},
							children: bulkFootnoteModal.generated.map((g, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: { marginBottom: 12 },
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									style: {
										fontSize: 12,
										fontWeight: 600,
										color: "#1e293b",
										display: "block",
										marginBottom: 4
									},
									children: [
										"الهامش ",
										idx + 1,
										":"
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
									value: g.text,
									onChange: (e) => {
										const v = e.target.value;
										setBulkFootnoteModal((m) => ({
											...m,
											generated: m.generated.map((x, i) => i === idx ? {
												...x,
												text: v
											} : x)
										}));
									},
									rows: 3,
									style: {
										width: "100%",
										padding: 10,
										borderRadius: 8,
										border: "1px solid #cbd5e1",
										fontSize: 13,
										fontFamily: "inherit",
										boxSizing: "border-box",
										direction: "rtl",
										lineHeight: 1.8,
										resize: "vertical"
									}
								})]
							}, g.doc.id))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: 8,
								justifyContent: "flex-end"
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: async () => {
									const all = bulkFootnoteModal.generated.map((g, i) => `${i + 1}. ${g.text}`).join("\n\n");
									try {
										await navigator.clipboard.writeText(all);
									} catch {}
									bulkFootnoteModal.generated.forEach((g) => addToBibliography(g.doc, g.text));
									showNotif(`✅ تم نسخ ${bulkFootnoteModal.generated.length} هوامش وإضافتها للمراجع النهائية`);
									setTimeout(() => setBulkFootnoteModal(null), 2e3);
								},
								style: {
									padding: "10px 18px",
									borderRadius: 8,
									background: "#10B981",
									color: "white",
									border: "none",
									cursor: "pointer",
									fontWeight: 700,
									fontFamily: "inherit",
									fontSize: 13
								},
								children: "📋 نسخ جميع الهوامش"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setBulkFootnoteModal(null),
								style: {
									padding: "9px 16px",
									borderRadius: 8,
									background: "#f1f5f9",
									border: "0.5px solid #cbd5e1",
									cursor: "pointer",
									fontFamily: "inherit",
									fontSize: 13,
									color: "#475569"
								},
								children: "إغلاق"
							})]
						})
					] })]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: {
					background: "linear-gradient(135deg,#1e3a5f 0%,#2d5a8e 100%)",
					color: "white",
					padding: "0 16px"
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					style: {
						maxWidth: 1200,
						margin: "0 auto",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: 12,
						minHeight: 60,
						paddingTop: 6,
						paddingBottom: 6
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								flexDirection: "column",
								alignItems: "flex-start",
								gap: 5,
								order: 2
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: 6
								},
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NotificationBell, { onOpenSupervisor: openSupervisorTab }),
									userEmail && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										style: {
											fontSize: 10,
											color: "#e2e8f0",
											opacity: .9,
											maxWidth: 160,
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap"
										},
										title: userEmail,
										children: [
											"👤 ",
											userEmail,
											userRole ? ` (${userRole === "supervisor" ? "مشرف" : "باحث"})` : ""
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: handleLogout,
										title: "تسجيل الخروج",
										style: {
											background: "rgba(239,68,68,0.85)",
											border: "1px solid rgba(255,255,255,0.25)",
											color: "white",
											padding: "5px 10px",
											borderRadius: 6,
											cursor: "pointer",
											fontSize: 12,
											fontFamily: "inherit",
											fontWeight: 600
										},
										children: "🚪 خروج"
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: aiModel,
								onChange: (e) => {
									setAiModel(e.target.value);
									setSelectedModel(e.target.value);
								},
								title: "اختر نموذج الذكاء الاصطناعي / الأدوات",
								style: {
									border: "1px solid rgba(255,255,255,0.3)",
									borderRadius: 6,
									padding: "4px 8px",
									fontSize: 11,
									background: "rgba(255,255,255,0.15)",
									color: "white",
									cursor: "pointer",
									fontFamily: "inherit",
									maxWidth: 220
								},
								children: AI_MODELS.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
									value: m.id,
									style: { color: "#1e293b" },
									children: ["🤖 ", m.label]
								}, m.id))
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							style: {
								display: "flex",
								gap: 2,
								flexWrap: "wrap",
								alignItems: "center",
								order: 1,
								flex: 1,
								justifyContent: "center"
							},
							children: navItems.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => setPage(n.id),
								style: {
									background: page === n.id ? "rgba(255,255,255,0.2)" : "transparent",
									border: "none",
									color: "white",
									padding: "5px 9px",
									borderRadius: 6,
									cursor: "pointer",
									fontSize: 12,
									fontFamily: "inherit",
									display: "flex",
									alignItems: "center",
									gap: 3
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: n.icon }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									style: { display: "none" },
									className: "nav-label",
									children: n.label
								})]
							}, n.id))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								alignItems: "center",
								gap: 10,
								order: 0
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								style: { fontSize: 24 },
								children: "🗂️"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								style: {
									fontWeight: 700,
									fontSize: 15
								},
								children: "أرشيف الأطروحة"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								style: {
									fontSize: 10,
									opacity: .75
								},
								children: "الخليج العربي • الحرب العالمية الثانية 1939-1945 • د. اسعد النعيمي"
							})] })]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					style: {
						maxWidth: 1200,
						margin: "0 auto",
						display: "flex",
						gap: 2,
						paddingBottom: 6
					},
					children: navItems.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => setPage(n.id),
						style: {
							background: page === n.id ? "rgba(255,255,255,0.15)" : "transparent",
							border: "none",
							color: "white",
							padding: "3px 8px",
							borderRadius: 5,
							cursor: "pointer",
							fontSize: 11,
							fontFamily: "inherit",
							opacity: page === n.id ? 1 : .75
						},
						children: n.label
					}, n.id))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: {
					maxWidth: 1200,
					margin: "0 auto",
					padding: "20px 14px"
				},
				children: [
					page === "structure" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								justifyContent: "space-between",
								alignItems: "flex-start",
								marginBottom: 20,
								flexWrap: "wrap",
								gap: 10
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								style: {
									fontSize: 20,
									fontWeight: 700,
									marginBottom: 4
								},
								children: "📖 هيكل الأطروحة — الفصول والمباحث والوثائق"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								style: {
									color: "#64748b",
									fontSize: 12
								},
								children: "الخليج العربي في سنوات الحرب العالمية الثانية 1939-1945 — اسعد حامد اسعد النعيمي — جامعة الموصل"
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								style: {
									fontSize: 11,
									color: "#94a3b8",
									background: "#f8fafc",
									borderRadius: 8,
									padding: "6px 12px",
									border: "0.5px solid #e2e8f0"
								},
								children: "💡 اضغط \"تعديل\" بجانب أي فصل أو مبحث لتغيير عنوانه — ستُحدَّث الوثائق المرتبطة تلقائياً"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								background: "white",
								borderRadius: 10,
								padding: 10,
								border: "0.5px solid #e2e8f0",
								marginBottom: 14,
								display: "flex",
								gap: 8,
								alignItems: "center",
								position: "sticky",
								top: 0,
								zIndex: 5
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									style: { fontSize: 16 },
									children: "🔍"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: structureSearch,
									onChange: (e) => setStructureSearch(e.target.value),
									placeholder: "ابحث في الفصول والمباحث والفقرات...",
									style: {
										flex: 1,
										padding: "7px 10px",
										borderRadius: 7,
										border: "0.5px solid #cbd5e1",
										fontSize: 13,
										fontFamily: "inherit",
										outline: "none"
									}
								}),
								structureSearch && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setStructureSearch(""),
									style: {
										padding: "6px 10px",
										borderRadius: 7,
										background: "#f1f5f9",
										border: "0.5px solid #cbd5e1",
										cursor: "pointer",
										fontSize: 12,
										fontFamily: "inherit"
									},
									children: "مسح"
								})
							]
						}),
						(() => {
							const q = structureSearch.trim().toLowerCase();
							const visibleChapters = !q ? chapters : chapters.filter((ch) => {
								if ((ch.titleAr || "").toLowerCase().includes(q)) return true;
								return (ch.sections || []).some((s) => (s.title || "").toLowerCase().includes(q) || (s.num || "").toLowerCase().includes(q));
							});
							if (visibleChapters.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									background: "white",
									borderRadius: 10,
									padding: 20,
									border: "0.5px solid #e2e8f0",
									textAlign: "center",
									color: "#94a3b8",
									fontSize: 13
								},
								children: [
									"لا توجد نتائج مطابقة لـ \"",
									structureSearch,
									"\""
								]
							});
							return visibleChapters.map((ch) => {
								const chDocs = combinedDocs.filter((d) => d.chapterId === ch.id);
								const mainSections = ch.sections.filter((s) => !s.id.includes("a") && !s.id.includes("b") && !s.id.includes("c"));
								const isEditingThisChapter = editingChapter?.id === ch.id;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										background: "white",
										borderRadius: 14,
										border: `2px solid ${ch.color}30`,
										borderTop: `4px solid ${ch.color}`,
										marginBottom: 20,
										overflow: "hidden"
									},
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												padding: "14px 18px",
												background: `${ch.color}08`,
												borderBottom: `0.5px solid ${ch.color}20`
											},
											children: isEditingThisChapter ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												style: {
													display: "flex",
													gap: 8,
													alignItems: "center"
												},
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
														autoFocus: true,
														value: editingChapter.value,
														onChange: (e) => setEditingChapter((p) => ({
															...p,
															value: e.target.value
														})),
														onKeyDown: (e) => {
															if (e.key === "Enter") commitChapterEdit();
															if (e.key === "Escape") setEditingChapter(null);
														},
														style: {
															flex: 1,
															padding: "7px 12px",
															borderRadius: 7,
															border: `2px solid ${ch.color}`,
															fontSize: 13,
															fontFamily: "inherit",
															fontWeight: 600,
															outline: "none"
														}
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														onClick: commitChapterEdit,
														style: {
															padding: "6px 14px",
															borderRadius: 7,
															background: ch.color,
															color: "white",
															border: "none",
															cursor: "pointer",
															fontFamily: "inherit",
															fontSize: 12,
															fontWeight: 600
														},
														children: "حفظ"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														onClick: () => setEditingChapter(null),
														style: {
															padding: "6px 10px",
															borderRadius: 7,
															background: "transparent",
															border: "0.5px solid #cbd5e1",
															cursor: "pointer",
															fontFamily: "inherit",
															fontSize: 12
														},
														children: "إلغاء"
													})
												]
											}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												style: {
													display: "flex",
													justifyContent: "space-between",
													alignItems: "flex-start",
													flexWrap: "wrap",
													gap: 8
												},
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													style: { flex: 1 },
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														style: {
															fontWeight: 700,
															fontSize: 14,
															color: ch.color,
															marginBottom: 4
														},
														children: ch.titleAr
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														style: {
															display: "flex",
															gap: 8,
															fontSize: 11,
															color: "#64748b"
														},
														children: [
															/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
																"📄 ",
																chDocs.length,
																" وثيقة"
															] }),
															/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
																"⭐ ",
																chDocs.filter((d) => d.priority === "★★★").length,
																" عالية الأولوية"
															] }),
															/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
																"🆕 ",
																chDocs.filter((d) => d.isNew).length,
																" جديدة"
															] })
														]
													})]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													style: {
														display: "flex",
														gap: 6,
														flexWrap: "wrap"
													},
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
															onClick: () => setEditingChapter({
																id: ch.id,
																value: ch.titleAr
															}),
															style: {
																padding: "4px 10px",
																borderRadius: 6,
																background: "white",
																border: `1px solid ${ch.color}`,
																color: ch.color,
																cursor: "pointer",
																fontSize: 11,
																fontFamily: "inherit"
															},
															children: "✏️ تعديل"
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
															onClick: () => openAddSection(ch.id),
															style: {
																padding: "4px 10px",
																borderRadius: 6,
																background: "white",
																border: `1px solid ${ch.color}`,
																color: ch.color,
																cursor: "pointer",
																fontSize: 11,
																fontFamily: "inherit"
															},
															children: "＋ مبحث"
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
															onClick: () => {
																setSearchFilters((p) => ({
																	...p,
																	chapterId: ch.id.toString(),
																	query: ""
																}));
																setPage("search");
															},
															style: {
																padding: "4px 10px",
																borderRadius: 6,
																background: ch.color,
																color: "white",
																border: "none",
																cursor: "pointer",
																fontSize: 11,
																fontFamily: "inherit"
															},
															children: "عرض الوثائق"
														})
													]
												})]
											})
										}),
										addingSecChId === ch.id && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											style: {
												padding: "12px 18px",
												background: `${ch.color}05`,
												borderBottom: `0.5px solid ${ch.color}20`,
												display: "grid",
												gap: 8
											},
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													style: {
														fontSize: 12,
														fontWeight: 600,
														color: ch.color
													},
													children: ["إضافة مبحث جديد إلى: ", ch.titleAr]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													autoFocus: true,
													value: newSecForm.title,
													onChange: (e) => setNewSecForm((p) => ({
														...p,
														title: e.target.value
													})),
													placeholder: "عنوان المبحث *",
													style: {
														padding: "7px 12px",
														borderRadius: 7,
														border: `1px solid ${ch.color}50`,
														fontSize: 12,
														fontFamily: "inherit",
														outline: "none"
													}
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													value: newSecForm.num,
													onChange: (e) => setNewSecForm((p) => ({
														...p,
														num: e.target.value
													})),
													placeholder: "رقم المبحث (تلقائي)",
													style: {
														padding: "7px 12px",
														borderRadius: 7,
														border: `1px solid ${ch.color}50`,
														fontSize: 12,
														fontFamily: "inherit",
														outline: "none",
														maxWidth: 200
													}
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													style: {
														display: "flex",
														gap: 8
													},
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														onClick: () => submitAddSection(ch.id),
														style: {
															padding: "6px 16px",
															borderRadius: 7,
															background: "#3B82F6",
															color: "white",
															border: "none",
															cursor: "pointer",
															fontSize: 12,
															fontFamily: "inherit",
															fontWeight: 600
														},
														children: "إضافة"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														onClick: () => {
															setAddingSecChId(null);
															setNewSecForm({
																title: "",
																num: ""
															});
														},
														style: {
															padding: "6px 14px",
															borderRadius: 7,
															background: "transparent",
															border: "0.5px solid #cbd5e1",
															cursor: "pointer",
															fontSize: 12,
															fontFamily: "inherit"
														},
														children: "إلغاء"
													})]
												})
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											style: { padding: "12px 18px" },
											children: [mainSections.map((sec) => {
												const secDocs = combinedDocs.filter((d) => d.sectionId === sec.id || d.sectionId?.startsWith(sec.id));
												const subSections = ch.sections.filter((s) => s.id.startsWith(sec.id) && s.id !== sec.id && /^[a-z]+$/i.test(s.id.slice(sec.id.length)));
												return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													style: {
														marginBottom: 16,
														paddingBottom: 16,
														borderBottom: "0.5px solid #f1f5f9"
													},
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															style: {
																display: "flex",
																justifyContent: "space-between",
																alignItems: "center",
																marginBottom: 8,
																gap: 8
															},
															children: [editingSection?.chId === ch.id && editingSection?.secId === sec.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
																style: {
																	display: "flex",
																	gap: 6,
																	alignItems: "center",
																	flex: 1
																},
																children: [
																	/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
																		autoFocus: true,
																		value: editingSection.value,
																		onChange: (e) => setEditingSection((p) => ({
																			...p,
																			value: e.target.value
																		})),
																		onKeyDown: (e) => {
																			if (e.key === "Enter") commitSectionEdit();
																			if (e.key === "Escape") setEditingSection(null);
																		},
																		style: {
																			flex: 1,
																			padding: "5px 10px",
																			borderRadius: 6,
																			border: `2px solid ${ch.color}`,
																			fontSize: 12,
																			fontFamily: "inherit",
																			fontWeight: 600,
																			outline: "none"
																		}
																	}),
																	/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																		onClick: commitSectionEdit,
																		style: {
																			padding: "4px 10px",
																			borderRadius: 6,
																			background: ch.color,
																			color: "white",
																			border: "none",
																			cursor: "pointer",
																			fontSize: 11,
																			fontFamily: "inherit",
																			fontWeight: 600
																		},
																		children: "حفظ"
																	}),
																	/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																		onClick: () => setEditingSection(null),
																		style: {
																			padding: "4px 8px",
																			borderRadius: 6,
																			background: "transparent",
																			border: "0.5px solid #cbd5e1",
																			cursor: "pointer",
																			fontSize: 11,
																			fontFamily: "inherit"
																		},
																		children: "إلغاء"
																	})
																]
															}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
																style: {
																	display: "flex",
																	alignItems: "center",
																	gap: 6,
																	flex: 1,
																	flexWrap: "wrap"
																},
																children: [
																	/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
																		style: {
																			fontWeight: 600,
																			fontSize: 13,
																			color: "#1e293b",
																			flex: 1,
																			minWidth: 140
																		},
																		children: sec.title
																	}),
																	/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																		onClick: (e) => {
																			e.stopPropagation();
																			setEditingSection({
																				chId: ch.id,
																				secId: sec.id,
																				value: sec.title
																			});
																		},
																		style: {
																			padding: "2px 8px",
																			borderRadius: 5,
																			background: "transparent",
																			border: `0.5px solid ${ch.color}`,
																			color: ch.color,
																			cursor: "pointer",
																			fontSize: 10,
																			fontFamily: "inherit",
																			flexShrink: 0
																		},
																		children: "✏️"
																	}),
																	/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																		onClick: (e) => {
																			e.stopPropagation();
																			openAddSubSection(sec.id);
																		},
																		title: "إضافة فقرة فرعية",
																		style: {
																			padding: "2px 8px",
																			borderRadius: 5,
																			background: "transparent",
																			border: `0.5px solid ${ch.color}`,
																			color: ch.color,
																			cursor: "pointer",
																			fontSize: 10,
																			fontFamily: "inherit",
																			flexShrink: 0
																		},
																		children: "＋ فقرة"
																	}),
																	sec.userAdded && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																		onClick: (e) => {
																			e.stopPropagation();
																			askDeleteSection(ch.id, sec.id);
																		},
																		title: "حذف المبحث",
																		style: {
																			padding: "2px 8px",
																			borderRadius: 5,
																			background: "#fee2e2",
																			border: "0.5px solid #fecaca",
																			color: "#dc2626",
																			cursor: "pointer",
																			fontSize: 10,
																			fontFamily: "inherit",
																			flexShrink: 0
																		},
																		children: "🗑️"
																	})
																]
															}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
																style: {
																	background: `${ch.color}15`,
																	color: ch.color,
																	borderRadius: 5,
																	padding: "1px 8px",
																	fontSize: 10,
																	fontWeight: 600,
																	flexShrink: 0
																},
																children: [secDocs.length, " وثيقة"]
															})]
														}),
														subSections.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
															style: {
																marginBottom: 8,
																paddingRight: 8,
																borderRight: `2px solid ${ch.color}30`
															},
															children: subSections.map((sub) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
																style: {
																	fontSize: 11,
																	color: "#64748b",
																	padding: "2px 0",
																	display: "flex",
																	alignItems: "center",
																	gap: 6
																},
																children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																	style: { flex: 1 },
																	children: sub.title
																}), sub.userAdded && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																	onClick: () => askDeleteSection(ch.id, sub.id),
																	title: "حذف الفقرة",
																	style: {
																		padding: "1px 6px",
																		borderRadius: 4,
																		background: "#fee2e2",
																		border: "0.5px solid #fecaca",
																		color: "#dc2626",
																		cursor: "pointer",
																		fontSize: 9,
																		fontFamily: "inherit"
																	},
																	children: "🗑️"
																})]
															}, sub.id))
														}),
														addingSubSecId === sec.id && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															style: {
																margin: "6px 0 10px",
																padding: "10px 12px",
																background: `${ch.color}06`,
																borderRadius: 7,
																border: `0.5px solid ${ch.color}30`,
																display: "grid",
																gap: 6
															},
															children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
																autoFocus: true,
																value: newSubForm.title,
																onChange: (e) => setNewSubForm({ title: e.target.value }),
																placeholder: "عنوان الفقرة الفرعية *",
																style: {
																	padding: "6px 10px",
																	borderRadius: 6,
																	border: `1px solid ${ch.color}40`,
																	fontSize: 11,
																	fontFamily: "inherit",
																	outline: "none"
																}
															}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
																style: {
																	display: "flex",
																	gap: 6
																},
																children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																	onClick: () => submitAddSubSection(ch.id, sec.id),
																	style: {
																		padding: "5px 14px",
																		borderRadius: 6,
																		background: "#3B82F6",
																		color: "white",
																		border: "none",
																		cursor: "pointer",
																		fontSize: 11,
																		fontFamily: "inherit",
																		fontWeight: 600
																	},
																	children: "إضافة"
																}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																	onClick: () => {
																		setAddingSubSecId(null);
																		setNewSubForm({ title: "" });
																	},
																	style: {
																		padding: "5px 12px",
																		borderRadius: 6,
																		background: "transparent",
																		border: "0.5px solid #cbd5e1",
																		cursor: "pointer",
																		fontSize: 11,
																		fontFamily: "inherit"
																	},
																	children: "إلغاء"
																})]
															})]
														}),
														secDocs.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
															style: {
																display: "grid",
																gap: 5
															},
															children: secDocs.sort((a, b) => ({
																"★★★": 3,
																"★★": 2,
																"★": 1
															}[b.priority] || 0) - ({
																"★★★": 3,
																"★★": 2,
																"★": 1
															}[a.priority] || 0)).map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
																style: {
																	display: "flex",
																	gap: 8,
																	alignItems: "flex-start",
																	padding: "7px 10px",
																	background: "#f8fafc",
																	borderRadius: 7,
																	border: "0.5px solid #f1f5f9",
																	transition: "all 0.15s"
																},
																onMouseEnter: (e) => {
																	e.currentTarget.style.background = "#eff6ff";
																	e.currentTarget.style.borderColor = ch.color + "40";
																},
																onMouseLeave: (e) => {
																	e.currentTarget.style.background = "#f8fafc";
																	e.currentTarget.style.borderColor = "#f1f5f9";
																},
																children: [
																	/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																		style: {
																			background: pBg(d.priority),
																			color: pColor(d.priority),
																			borderRadius: 4,
																			padding: "1px 5px",
																			fontSize: 9,
																			fontWeight: 700,
																			flexShrink: 0,
																			marginTop: 2
																		},
																		children: d.priority
																	}),
																	/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
																		style: {
																			flex: 1,
																			minWidth: 0,
																			cursor: "pointer"
																		},
																		onClick: () => {
																			setSelectedDoc(d);
																			setPage("detail");
																		},
																		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
																			style: {
																				fontSize: 12,
																				fontWeight: 500,
																				marginBottom: 1,
																				overflow: "hidden",
																				textOverflow: "ellipsis",
																				whiteSpace: "nowrap"
																			},
																			children: d.title
																		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
																			style: {
																				display: "flex",
																				gap: 6,
																				fontSize: 10,
																				color: "#94a3b8",
																				flexWrap: "wrap"
																			},
																			children: [
																				d.archiveRef && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																					style: {
																						color: "#8B5CF6",
																						fontFamily: "monospace"
																					},
																					children: d.archiveRef
																				}),
																				d.isNew && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																					style: { color: "#16a34a" },
																					children: "🆕 جديد"
																				}),
																				d.notes && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [d.notes.substring(0, 50), d.notes.length > 50 ? "..." : ""] })
																			]
																		})]
																	}),
																	/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																		onClick: (e) => {
																			e.stopPropagation();
																			openFootnoteModal(d);
																		},
																		title: "توليد هامش",
																		style: {
																			padding: "3px 8px",
																			borderRadius: 5,
																			background: "#faf5ff",
																			border: "0.5px solid #d8b4fe",
																			color: "#7C3AED",
																			cursor: "pointer",
																			fontSize: 10,
																			fontFamily: "inherit",
																			flexShrink: 0
																		},
																		children: "📝"
																	}),
																	/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																		onClick: (e) => {
																			e.stopPropagation();
																			askDeleteSource(d.id);
																		},
																		title: "حذف",
																		style: {
																			padding: "3px 8px",
																			borderRadius: 5,
																			background: "#fee2e2",
																			border: "0.5px solid #fecaca",
																			color: "#dc2626",
																			cursor: "pointer",
																			fontSize: 10,
																			fontFamily: "inherit",
																			flexShrink: 0
																		},
																		children: "🗑️"
																	})
																]
															}, d.id))
														}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
															style: {
																padding: "8px 10px",
																background: "#fff7ed",
																borderRadius: 7,
																border: "0.5px solid #fed7aa",
																fontSize: 11,
																color: "#c2410c"
															},
															children: "⚠️ لا توجد وثائق مرتبطة بهذا المبحث بعد — أضف مصادر من مكتبتك أو ابحث في QDL"
														})
													]
												}, sec.id);
											}), (() => {
												const sectionIds = new Set(ch.sections.map((s) => s.id));
												const unclassified = chDocs.filter((d) => !d.sectionId || !sectionIds.has(d.sectionId) && ![...sectionIds].some((sid) => d.sectionId?.startsWith(sid)));
												if (unclassified.length === 0) return null;
												return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													style: {
														marginTop: 8,
														padding: "10px 12px",
														background: "#f0f9ff",
														borderRadius: 8,
														border: "0.5px dashed #93c5fd"
													},
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														style: {
															fontSize: 12,
															fontWeight: 600,
															color: "#1e40af",
															marginBottom: 6
														},
														children: ["📥 وثائق مضافة لهذا الفصل (بدون مبحث محدد) — ", unclassified.length]
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														style: {
															display: "grid",
															gap: 5
														},
														children: unclassified.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															style: {
																display: "flex",
																gap: 8,
																alignItems: "center",
																padding: "6px 10px",
																background: "white",
																borderRadius: 6,
																border: "0.5px solid #dbeafe"
															},
															children: [
																/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
																	style: {
																		flex: 1,
																		minWidth: 0,
																		cursor: "pointer"
																	},
																	onClick: () => {
																		setSelectedDoc(d);
																		setPage("detail");
																	},
																	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
																		style: {
																			fontSize: 12,
																			fontWeight: 500,
																			overflow: "hidden",
																			textOverflow: "ellipsis",
																			whiteSpace: "nowrap"
																		},
																		children: d.title
																	}), d.archiveRef && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
																		style: {
																			fontSize: 10,
																			color: "#8B5CF6",
																			fontFamily: "monospace"
																		},
																		children: d.archiveRef
																	})]
																}),
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																	onClick: (e) => {
																		e.stopPropagation();
																		openFootnoteModal(d);
																	},
																	title: "توليد هامش",
																	style: {
																		padding: "3px 8px",
																		borderRadius: 5,
																		background: "#faf5ff",
																		border: "0.5px solid #d8b4fe",
																		color: "#7C3AED",
																		cursor: "pointer",
																		fontSize: 10,
																		fontFamily: "inherit"
																	},
																	children: "📝"
																}),
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																	onClick: (e) => {
																		e.stopPropagation();
																		askDeleteSource(d.id);
																	},
																	title: "حذف",
																	style: {
																		padding: "3px 8px",
																		borderRadius: 5,
																		background: "#fee2e2",
																		border: "0.5px solid #fecaca",
																		color: "#dc2626",
																		cursor: "pointer",
																		fontSize: 10,
																		fontFamily: "inherit"
																	},
																	children: "🗑️"
																})
															]
														}, d.id))
													})]
												});
											})()]
										})
									]
								}, ch.id);
							});
						})()
					] }),
					page === "home" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								textAlign: "center",
								marginBottom: 20
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								style: {
									fontSize: 22,
									fontWeight: 700,
									marginBottom: 4
								},
								children: "الفهرس الشامل للأطروحة"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								style: {
									color: "#64748b",
									fontSize: 12
								},
								children: "الطالب: اسعد حامد اسعد النعيمي — جامعة الموصل — إشراف: أ.م.د فواز موفق ذنون"
							})]
						}),
						(() => {
							const overallPct = calcOverallProgress();
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									background: "white",
									borderRadius: 14,
									padding: "18px 20px",
									border: "0.5px solid #e2e8f0",
									marginBottom: 16,
									boxShadow: "0 1px 4px rgba(0,0,0,0.04)"
								},
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: {
											display: "flex",
											justifyContent: "space-between",
											alignItems: "center",
											marginBottom: 10
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												fontWeight: 700,
												fontSize: 14,
												color: "#1e3a5f"
											},
											children: "📈 مسار إنجاز الأطروحة"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											style: {
												display: "flex",
												alignItems: "center",
												gap: 8
											},
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												style: {
													fontSize: 11,
													color: "#64748b"
												},
												children: "الإنجاز العام"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												style: {
													fontSize: 22,
													fontWeight: 800,
													color: overallPct >= 70 ? "#10B981" : overallPct >= 40 ? "#F59E0B" : "#3B82F6"
												},
												children: [overallPct, "%"]
											})]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: {
											height: 14,
											background: "#e2e8f0",
											borderRadius: 7,
											overflow: "hidden",
											marginBottom: 16,
											position: "relative"
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: {
											height: "100%",
											width: `${overallPct}%`,
											background: `linear-gradient(90deg, #1e3a5f, ${overallPct >= 70 ? "#10B981" : overallPct >= 40 ? "#F59E0B" : "#3B82F6"})`,
											borderRadius: 7,
											transition: "width 0.8s ease"
										} }), overallPct > 10 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											style: {
												position: "absolute",
												right: 8,
												top: "50%",
												transform: "translateY(-50%)",
												fontSize: 10,
												color: "white",
												fontWeight: 600
											},
											children: [overallPct, "%"]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											display: "grid",
											gridTemplateColumns: "repeat(2,1fr)",
											gap: 12
										},
										children: chapters.map((ch) => {
											const pct = calcChapterProgress(ch.id);
											const cnt = combinedDocs.filter((d) => d.chapterId === ch.id).length;
											const bibs = bibliography.filter((b) => combinedDocs.find((d) => d.id === b.docId && d.chapterId === ch.id)).length;
											return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												style: {
													background: "#f8fafc",
													borderRadius: 9,
													padding: "10px 12px",
													border: `0.5px solid ${ch.color}20`
												},
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														style: {
															display: "flex",
															justifyContent: "space-between",
															alignItems: "center",
															marginBottom: 5
														},
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															style: {
																fontSize: 11,
																fontWeight: 600,
																color: ch.color
															},
															children: ch.titleAr.split(":")[0]
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
															style: {
																fontSize: 13,
																fontWeight: 700,
																color: pct >= 70 ? "#10B981" : pct >= 40 ? "#F59E0B" : ch.color
															},
															children: [pct, "%"]
														})]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														style: {
															height: 8,
															background: "#e2e8f0",
															borderRadius: 4,
															overflow: "hidden",
															marginBottom: 5
														},
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: {
															height: "100%",
															width: `${pct}%`,
															background: ch.color,
															borderRadius: 4,
															transition: "width 0.7s ease"
														} })
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														style: {
															display: "flex",
															gap: 10,
															fontSize: 10,
															color: "#94a3b8"
														},
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
															"📄 ",
															cnt,
															" وثيقة"
														] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
															"📝 ",
															bibs,
															" هامش"
														] })]
													})
												]
											}, ch.id);
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											marginTop: 10,
											fontSize: 10,
											color: "#94a3b8",
											textAlign: "center"
										},
										children: "* تُحسب النسبة بناءً على عدد الوثائق المؤرشفة (60٪) والهوامش المُستخرجة (40٪) لكل فصل"
									})
								]
							});
						})(),
						(() => {
							const CATEGORIES = [
								{
									keys: [
										"كتاب",
										"كتاب عربي",
										"كتاب أجنبي"
									],
									label: "📚 الكتب",
									color: "#3B82F6",
									target: 40
								},
								{
									keys: ["رسالة ماجستير", "رسالة علمية"],
									label: "🎓 رسائل الماجستير",
									color: "#8B5CF6",
									target: 15
								},
								{
									keys: ["أطروحة دكتوراه"],
									label: "🎓 أطاريح الدكتوراه",
									color: "#7C3AED",
									target: 10
								},
								{
									keys: ["بحث", "بحث علمي"],
									label: "🔬 البحوث",
									color: "#0EA5E9",
									target: 20
								},
								{
									keys: ["مقالة", "مجلة علمية"],
									label: "📰 المجلات العلمية",
									color: "#F59E0B",
									target: 20
								},
								{
									keys: ["مؤتمر علمي", "مؤتمر"],
									label: "🏛️ المؤتمرات",
									color: "#06B6D4",
									target: 10
								},
								{
									keys: ["صحيفة"],
									label: "🗞️ الصحف",
									color: "#EF4444",
									target: 10
								},
								{
									keys: ["وثيقة أرشيفية", "مصدر أولي"],
									label: "🗂️ الوثائق والمصادر الأولية",
									color: "#10B981",
									target: 25
								},
								{
									keys: ["تقرير", "تقرير رسمي"],
									label: "📑 التقارير الرسمية",
									color: "#64748b",
									target: 10
								},
								{
									keys: ["موقع إلكتروني"],
									label: "🌐 المواقع الإلكترونية",
									color: "#0EA5E9",
									target: 10
								},
								{
									keys: ["موسوعة"],
									label: "📖 الموسوعات",
									color: "#14B8A6",
									target: 5
								}
							].map((c) => ({
								...c,
								key: c.keys[0]
							}));
							const allSources = [...docs, ...library];
							allSources.length;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									background: "white",
									borderRadius: 14,
									padding: "18px 20px",
									border: "0.5px solid #e2e8f0",
									marginBottom: 16,
									boxShadow: "0 1px 4px rgba(0,0,0,0.04)"
								},
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: {
											display: "flex",
											justifyContent: "space-between",
											alignItems: "center",
											marginBottom: 12
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												fontWeight: 700,
												fontSize: 14,
												color: "#1e3a5f"
											},
											children: "🏷️ تصنيف المصادر الأكاديمية حسب النوع"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											style: {
												fontSize: 11,
												color: "#64748b"
											},
											children: [
												"المجموع: ",
												allSources.length,
												" مصدر"
											]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											display: "grid",
											gridTemplateColumns: "repeat(2,1fr)",
											gap: 10
										},
										children: CATEGORIES.map((c) => {
											const count = allSources.filter((s) => c.keys.includes(s.sourceType || s.category)).length;
											const pct = Math.min(100, Math.round(count / c.target * 100));
											const bibs = bibliography.filter((b) => c.keys.includes(b.category)).length;
											return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												style: {
													background: "#f8fafc",
													borderRadius: 9,
													padding: "10px 12px",
													border: `0.5px solid ${c.color}22`
												},
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														style: {
															display: "flex",
															justifyContent: "space-between",
															alignItems: "center",
															marginBottom: 5
														},
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															style: {
																fontSize: 11,
																fontWeight: 600,
																color: c.color
															},
															children: c.label
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
															style: {
																fontSize: 12,
																fontWeight: 700,
																color: pct >= 100 ? "#10B981" : c.color
															},
															children: [pct, "%"]
														})]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														style: {
															height: 6,
															background: "#e2e8f0",
															borderRadius: 3,
															overflow: "hidden",
															marginBottom: 5
														},
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: {
															height: "100%",
															width: `${pct}%`,
															background: c.color,
															borderRadius: 3,
															transition: "width 0.6s ease"
														} })
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														style: {
															display: "flex",
															gap: 10,
															fontSize: 10,
															color: "#94a3b8"
														},
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
															"📄 ",
															count,
															" / ",
															c.target
														] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
															"📝 ",
															bibs,
															" هامش"
														] })]
													})
												]
											}, c.key);
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											marginTop: 10,
											fontSize: 10,
											color: "#94a3b8",
											textAlign: "center"
										},
										children: "* النسبة محسوبة على هدف تقديري لكل فئة — يكتشف الذكاء الاصطناعي النوع تلقائياً عند رفع كل ملف"
									})
								]
							});
						})(),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							style: {
								display: "grid",
								gridTemplateColumns: "repeat(4,1fr)",
								gap: 12,
								marginBottom: 16
							},
							children: [
								{
									label: "إجمالي الوثائق",
									v: stats.total,
									c: "#3B82F6",
									i: "📄"
								},
								{
									label: "عالية الأولوية ★★★",
									v: stats.highP,
									c: "#10B981",
									i: "⭐"
								},
								{
									label: "هوامش مُستخرجة",
									v: bibliography.length,
									c: "#8B5CF6",
									i: "📝"
								},
								{
									label: "بطاقات بحثية",
									v: cards.length,
									c: "#F59E0B",
									i: "🗃️"
								}
							].map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									background: "white",
									borderRadius: 12,
									padding: "14px 12px",
									border: "0.5px solid #e2e8f0",
									textAlign: "center",
									boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
								},
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											fontSize: 24,
											marginBottom: 6
										},
										children: s.i
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											fontSize: 26,
											fontWeight: 700,
											color: s.c,
											lineHeight: 1
										},
										children: s.v
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											fontSize: 11,
											color: "#64748b",
											marginTop: 4
										},
										children: s.label
									})
								]
							}, i))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: 16,
								marginBottom: 16
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									background: "white",
									borderRadius: 12,
									padding: 16,
									border: "0.5px solid #e2e8f0"
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										fontWeight: 600,
										fontSize: 13,
										marginBottom: 14,
										color: "#1e293b"
									},
									children: "📊 تنوع الأوزان العلمية لكل فصل"
								}), chapters.map((ch) => {
									const diversity = calcDiversityForChapter(ch.id);
									const total = combinedDocs.filter((d) => d.chapterId === ch.id).length;
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: { marginBottom: 14 },
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											style: {
												display: "flex",
												justifyContent: "space-between",
												marginBottom: 5,
												alignItems: "center"
											},
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												style: {
													fontSize: 12,
													fontWeight: 600,
													color: ch.color
												},
												children: ch.titleAr.split(":")[0]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												style: {
													fontSize: 10,
													color: "#94a3b8"
												},
												children: [total, " مصدر"]
											})]
										}), total === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												fontSize: 11,
												color: "#94a3b8",
												fontStyle: "italic"
											},
											children: "لا توجد مصادر مُضافة بعد"
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												height: 10,
												background: "#f1f5f9",
												borderRadius: 5,
												overflow: "hidden",
												display: "flex",
												marginBottom: 5
											},
											children: diversity.map((dc, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												title: `${dc.label}: ${dc.pct}%`,
												style: {
													height: "100%",
													width: `${dc.pct}%`,
													background: dc.color,
													transition: "width 0.5s"
												}
											}, i))
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												display: "flex",
												flexWrap: "wrap",
												gap: 4
											},
											children: diversity.map((dc, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												style: {
													fontSize: 10,
													background: `${dc.color}15`,
													color: dc.color,
													borderRadius: 4,
													padding: "1px 6px"
												},
												children: [
													dc.label,
													": ",
													dc.pct,
													"%"
												]
											}, i))
										})] })]
									}, ch.id);
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								style: {
									display: "grid",
									gap: 14
								},
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										background: "white",
										borderRadius: 12,
										padding: 14,
										border: "0.5px solid #e2e8f0"
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											fontWeight: 600,
											fontSize: 13,
											marginBottom: 10
										},
										children: "🕐 آخر الوثائق المضافة"
									}), docs.slice(0, 5).map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										onClick: () => {
											setSelectedDoc(d);
											setPage("detail");
										},
										style: {
											padding: "6px 0",
											borderBottom: "0.5px solid #f1f5f9",
											cursor: "pointer",
											display: "flex",
											gap: 8,
											alignItems: "center"
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											style: {
												fontSize: 10,
												background: pBg(d.priority),
												color: pColor(d.priority),
												borderRadius: 4,
												padding: "1px 5px",
												flexShrink: 0
											},
											children: d.priority
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												fontSize: 12,
												fontWeight: 500,
												flex: 1,
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap"
											},
											children: d.title
										})]
									}, d.id))]
								})
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								background: "linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 50%, #1e3a5f 100%)",
								borderRadius: 14,
								padding: "18px 20px",
								marginBottom: 16,
								color: "white",
								border: "none",
								position: "relative",
								overflow: "hidden"
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: {
									position: "absolute",
									top: -20,
									left: -20,
									width: 120,
									height: 120,
									borderRadius: "50%",
									background: "rgba(255,255,255,0.04)",
									pointerEvents: "none"
								} }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: {
									position: "absolute",
									bottom: -30,
									right: -10,
									width: 160,
									height: 160,
									borderRadius: "50%",
									background: "rgba(255,255,255,0.03)",
									pointerEvents: "none"
								} }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
										marginBottom: 14
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: {
											fontWeight: 700,
											fontSize: 14,
											display: "flex",
											alignItems: "center",
											gap: 8
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											style: { fontSize: 20 },
											children: "⚡"
										}), " حافز المؤرخ اليومي"]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: {
											display: "flex",
											gap: 6
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => setDailyQuoteIdx((i) => (i + 1) % MOTIVATIONAL_QUOTES.length),
											style: {
												padding: "4px 10px",
												borderRadius: 6,
												background: "rgba(255,255,255,0.15)",
												border: "none",
												color: "white",
												cursor: "pointer",
												fontSize: 11,
												fontFamily: "inherit"
											},
											children: "تجديد ←"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => setFuelCardExpanded((p) => !p),
											style: {
												padding: "4px 10px",
												borderRadius: 6,
												background: "rgba(255,255,255,0.15)",
												border: "none",
												color: "white",
												cursor: "pointer",
												fontSize: 11,
												fontFamily: "inherit"
											},
											children: fuelCardExpanded ? "طيّ ▲" : "توسيع ▼"
										})]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										background: "rgba(255,255,255,0.1)",
										borderRadius: 10,
										padding: "12px 16px",
										marginBottom: fuelCardExpanded ? 14 : 0,
										lineHeight: 1.8,
										fontSize: 13,
										fontStyle: "italic",
										backdropFilter: "blur(4px)"
									},
									children: [
										"\"",
										MOTIVATIONAL_QUOTES[dailyQuoteIdx],
										"\""
									]
								}),
								fuelCardExpanded && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										borderTop: "0.5px solid rgba(255,255,255,0.2)",
										paddingTop: 12
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: {
											fontSize: 11,
											opacity: .7,
											marginBottom: 6,
											display: "flex",
											alignItems: "center",
											gap: 5
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "📅" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "حدث في مثل هذا اليوم من سنوات الحرب في الخليج (1939-1945)" })]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											background: "rgba(255,255,255,0.08)",
											borderRadius: 9,
											padding: "10px 14px",
											fontSize: 12,
											lineHeight: 1.8,
											borderRight: "3px solid rgba(255,255,255,0.3)"
										},
										children: historicalEvent
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								background: "white",
								borderRadius: 12,
								padding: 16,
								border: "0.5px solid #e2e8f0"
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									fontWeight: 600,
									fontSize: 13,
									marginBottom: 14,
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center"
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "🔬 مؤشر تنوع المصادر — تفصيل المباحث" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									style: {
										fontSize: 11,
										color: "#94a3b8",
										fontWeight: 400
									},
									children: "يساعدك على ضمان عدم الاعتماد على نوع واحد من المراجع"
								})]
							}), chapters.map((ch) => {
								const mainSections = ch.sections.filter((s) => !s.id.includes("a") && !s.id.includes("b") && !s.id.includes("c"));
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										marginBottom: 16,
										borderBottom: "0.5px solid #f1f5f9",
										paddingBottom: 16
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											fontSize: 12,
											fontWeight: 700,
											color: ch.color,
											marginBottom: 8
										},
										children: ch.titleAr.split(":")[0]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											display: "grid",
											gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))",
											gap: 8
										},
										children: mainSections.map((sec) => {
											const secDiversity = calcDiversityForSection(sec.id);
											if (combinedDocs.filter((d) => d.sectionId === sec.id || d.sectionId?.startsWith(sec.id)).length === 0) return null;
											return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												style: {
													background: "#f8fafc",
													borderRadius: 8,
													padding: "9px 11px",
													border: `0.5px solid ${ch.color}15`
												},
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														style: {
															fontSize: 11,
															fontWeight: 600,
															color: "#475569",
															marginBottom: 6,
															overflow: "hidden",
															textOverflow: "ellipsis",
															whiteSpace: "nowrap"
														},
														title: sec.title,
														children: sec.title
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														style: {
															height: 7,
															background: "#e2e8f0",
															borderRadius: 4,
															overflow: "hidden",
															display: "flex",
															marginBottom: 5
														},
														children: secDiversity.map((dc, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
															title: `${dc.label}: ${dc.pct}%`,
															style: {
																height: "100%",
																width: `${dc.pct}%`,
																background: dc.color
															}
														}, i))
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														style: {
															display: "flex",
															flexWrap: "wrap",
															gap: 3
														},
														children: secDiversity.map((dc, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
															style: {
																fontSize: 9,
																background: `${dc.color}12`,
																color: dc.color,
																borderRadius: 3,
																padding: "0 4px"
															},
															children: [
																dc.label.split(" ")[0],
																": ",
																dc.pct,
																"%"
															]
														}, i))
													})
												]
											}, sec.id);
										})
									})]
								}, ch.id);
							})]
						})
					] }),
					page === "search" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								marginBottom: 16
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								style: {
									fontSize: 20,
									fontWeight: 700
								},
								children: "🗂️ قاعدة الوثائق الأرشيفية"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								style: {
									fontSize: 12,
									color: "#64748b",
									background: "#eff6ff",
									padding: "3px 10px",
									borderRadius: 20
								},
								children: [filtered.length, " وثيقة"]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							style: {
								background: "white",
								borderRadius: 12,
								padding: 14,
								border: "0.5px solid #e2e8f0",
								marginBottom: 14
							},
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									display: "grid",
									gridTemplateColumns: "2fr 1fr 1fr 1fr",
									gap: 10
								},
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										placeholder: "ابحث في العناوين، أرقام IOR، المباحث...",
										value: searchFilters.query,
										onChange: (e) => setSearchFilters((p) => ({
											...p,
											query: e.target.value
										})),
										style: {
											padding: "8px 12px",
											borderRadius: 8,
											border: "0.5px solid #cbd5e1",
											fontSize: 13,
											fontFamily: "inherit"
										}
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
										value: searchFilters.chapterId,
										onChange: (e) => setSearchFilters((p) => ({
											...p,
											chapterId: e.target.value
										})),
										style: {
											padding: "8px 10px",
											borderRadius: 8,
											border: "0.5px solid #cbd5e1",
											fontSize: 12,
											fontFamily: "inherit"
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "",
											children: "كل الفصول"
										}), CHAPTERS_DATA.map((ch) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: ch.id,
											children: ch.titleAr.split(":")[0]
										}, ch.id))]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
										value: searchFilters.priority,
										onChange: (e) => setSearchFilters((p) => ({
											...p,
											priority: e.target.value
										})),
										style: {
											padding: "8px 10px",
											borderRadius: 8,
											border: "0.5px solid #cbd5e1",
											fontSize: 12,
											fontFamily: "inherit"
										},
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "",
												children: "كل الأولويات"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "★★★",
												children: "★★★ اقرأه كاملاً"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "★★",
												children: "★★ أوراق محددة"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "★",
												children: "★ احفظ المرجع"
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
										value: searchFilters.isNew,
										onChange: (e) => setSearchFilters((p) => ({
											...p,
											isNew: e.target.value
										})),
										style: {
											padding: "8px 10px",
											borderRadius: 8,
											border: "0.5px solid #cbd5e1",
											fontSize: 12,
											fontFamily: "inherit"
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "",
											children: "الكل"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "new",
											children: "🆕 الجديدة فقط"
										})]
									})
								]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								background: "white",
								borderRadius: 12,
								border: "0.5px solid #e2e8f0",
								overflow: "hidden"
							},
							children: [filtered.map((d) => {
								const ch = CHAPTERS_DATA.find((c) => c.id === d.chapterId);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										padding: "11px 16px",
										borderBottom: "0.5px solid #f1f5f9",
										display: "flex",
										gap: 10,
										alignItems: "flex-start",
										transition: "background 0.15s"
									},
									onMouseEnter: (e) => e.currentTarget.style.background = "#f8fafc",
									onMouseLeave: (e) => e.currentTarget.style.background = "white",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											style: {
												display: "flex",
												flexDirection: "column",
												gap: 3,
												flexShrink: 0,
												width: 36,
												alignItems: "center"
											},
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												style: {
													background: pBg(d.priority),
													color: pColor(d.priority),
													borderRadius: 5,
													padding: "1px 5px",
													fontSize: 10,
													fontWeight: 700
												},
												children: d.priority
											}), d.isNew && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												style: {
													background: "#f0fdf4",
													color: "#16a34a",
													borderRadius: 5,
													padding: "1px 5px",
													fontSize: 9
												},
												children: "جديد"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											style: {
												flex: 1,
												minWidth: 0,
												cursor: "pointer"
											},
											onClick: () => {
												setSelectedDoc(d);
												setPage("detail");
											},
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													style: {
														fontWeight: 500,
														fontSize: 13,
														marginBottom: 2
													},
													children: d.title
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													style: {
														display: "flex",
														gap: 8,
														flexWrap: "wrap",
														fontSize: 11,
														color: "#64748b"
													},
													children: [
														d.archiveRef && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															style: {
																color: "#8B5CF6",
																fontFamily: "monospace"
															},
															children: d.archiveRef
														}),
														ch && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
															style: { color: ch.color },
															children: ["● ", ch.titleAr.split(":")[0]]
														}),
														d.section && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: d.section })
													]
												}),
												d.notes && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													style: {
														fontSize: 11,
														color: "#94a3b8",
														marginTop: 2
													},
													children: d.notes
												})
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: (e) => {
												e.stopPropagation();
												askDeleteSource(d.id);
											},
											title: "حذف",
											style: {
												padding: "4px 8px",
												borderRadius: 6,
												background: "#fee2e2",
												color: "#dc2626",
												border: "none",
												cursor: "pointer",
												fontSize: 12,
												fontFamily: "inherit",
												flexShrink: 0,
												alignSelf: "flex-start"
											},
											children: "🗑️"
										})
									]
								}, d.id);
							}), filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								style: {
									padding: 40,
									textAlign: "center",
									color: "#94a3b8"
								},
								children: "لا توجد نتائج"
							})]
						})
					] }),
					page === "detail" && selectedDoc && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setPage("search"),
							style: {
								marginBottom: 14,
								padding: "7px 14px",
								borderRadius: 8,
								border: "0.5px solid #cbd5e1",
								background: "transparent",
								cursor: "pointer",
								fontFamily: "inherit",
								fontSize: 12
							},
							children: "← العودة"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								background: "white",
								borderRadius: 12,
								padding: 20,
								border: "0.5px solid #e2e8f0",
								marginBottom: 14
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										justifyContent: "space-between",
										alignItems: "flex-start",
										marginBottom: 14
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: { flex: 1 },
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
											style: {
												fontSize: 17,
												fontWeight: 700,
												marginBottom: 8,
												lineHeight: 1.5
											},
											children: selectedDoc.title
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											style: {
												display: "flex",
												gap: 6,
												flexWrap: "wrap"
											},
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													style: {
														background: pBg(selectedDoc.priority),
														color: pColor(selectedDoc.priority),
														borderRadius: 6,
														padding: "2px 10px",
														fontSize: 12,
														fontWeight: 600
													},
													children: selectedDoc.priority
												}),
												selectedDoc.isNew && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													style: {
														background: "#f0fdf4",
														color: "#16a34a",
														borderRadius: 6,
														padding: "2px 8px",
														fontSize: 11
													},
													children: "🆕 وثيقة جديدة"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													style: {
														background: "#f5f3ff",
														color: "#8B5CF6",
														borderRadius: 6,
														padding: "2px 8px",
														fontSize: 11,
														fontFamily: "monospace"
													},
													children: selectedDoc.archiveRef
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													style: {
														background: "#f1f5f9",
														color: "#64748b",
														borderRadius: 6,
														padding: "2px 8px",
														fontSize: 11
													},
													children: selectedDoc.status
												})
											]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
										href: `https://www.qdl.qa/en/archive/81055/vdc_${selectedDoc.archiveRef?.replace(/\//g, "_")}`,
										target: "_blank",
										rel: "noopener noreferrer",
										style: {
											padding: "7px 14px",
											borderRadius: 8,
											background: "#eff6ff",
											color: "#3B82F6",
											border: "0.5px solid #bfdbfe",
											textDecoration: "none",
											fontSize: 12,
											flexShrink: 0
										},
										children: "🔗 QDL"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										display: "grid",
										gridTemplateColumns: "repeat(2,1fr)",
										gap: 12,
										marginBottom: 14
									},
									children: [
										{
											label: "الفصل",
											value: CHAPTERS_DATA.find((c) => c.id === selectedDoc.chapterId)?.titleAr
										},
										{
											label: "المبحث",
											value: selectedDoc.section
										},
										{
											label: "النوع",
											value: selectedDoc.category
										},
										{
											label: "الحالة",
											value: selectedDoc.status
										}
									].map((f) => f.value && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											fontSize: 11,
											color: "#94a3b8",
											marginBottom: 2
										},
										children: f.label
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											fontSize: 13,
											fontWeight: 500
										},
										children: f.value
									})] }, f.label))
								}),
								selectedDoc.notes && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										background: "#f8fafc",
										borderRadius: 8,
										padding: 12,
										marginBottom: 14,
										fontSize: 13,
										color: "#475569"
									},
									children: selectedDoc.notes
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										gap: 8,
										flexWrap: "wrap"
									},
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => handleAI(selectedDoc),
											disabled: aiLoading,
											style: {
												padding: "8px 16px",
												borderRadius: 8,
												background: "#7C3AED",
												color: "white",
												border: "none",
												cursor: "pointer",
												fontFamily: "inherit",
												fontSize: 13
											},
											children: aiLoading ? "⏳ جاري..." : "🤖 تحليل بالذكاء الاصطناعي"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => openFootnoteModal(selectedDoc),
											style: {
												padding: "8px 14px",
												borderRadius: 8,
												background: "#10B981",
												color: "white",
												border: "none",
												cursor: "pointer",
												fontFamily: "inherit",
												fontSize: 13
											},
											children: "📝 تصدير الهامش"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => {
												setExportSelected([selectedDoc.id]);
												setPage("export");
											},
											style: {
												padding: "8px 14px",
												borderRadius: 8,
												background: "transparent",
												border: "0.5px solid #cbd5e1",
												cursor: "pointer",
												fontFamily: "inherit",
												fontSize: 13
											},
											children: "📤 تصدير المرجع"
										})
									]
								})
							]
						}),
						aiLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								background: "#faf5ff",
								borderRadius: 12,
								padding: 24,
								textAlign: "center",
								border: "0.5px solid #d8b4fe"
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								style: { fontSize: 32 },
								children: "🤖"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								style: {
									color: "#64748b",
									marginTop: 8
								},
								children: "جاري التحليل..."
							})]
						}),
						aiResult && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								background: "#faf5ff",
								borderRadius: 12,
								padding: 20,
								border: "0.5px solid #d8b4fe"
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								style: {
									fontWeight: 600,
									color: "#7C3AED",
									marginBottom: 12,
									fontSize: 13
								},
								children: "🤖 تحليل الذكاء الاصطناعي"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
								style: {
									whiteSpace: "pre-wrap",
									fontFamily: "inherit",
									fontSize: 13,
									lineHeight: 1.8,
									margin: 0
								},
								children: aiResult
							})]
						})
					] }),
					page === "url_import" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							style: {
								fontSize: 20,
								fontWeight: 700,
								marginBottom: 6
							},
							children: "🔗 استيراد وثيقة من رابط"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							style: {
								color: "#64748b",
								fontSize: 13,
								marginBottom: 20
							},
							children: "الصق رابط أي وثيقة من QDL أو الأرشيف البريطاني أو أي موقع أرشيفي وسيستخرج الذكاء الاصطناعي بياناتها تلقائياً"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								background: "white",
								borderRadius: 12,
								padding: 20,
								border: "0.5px solid #e2e8f0",
								marginBottom: 16
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: { marginBottom: 14 },
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									style: {
										fontSize: 13,
										fontWeight: 500,
										display: "block",
										marginBottom: 6
									},
									children: "رابط الوثيقة"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										gap: 10
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: urlImport,
										onChange: (e) => setUrlImport(e.target.value),
										placeholder: "https://www.qdl.qa/en/archive/...",
										style: {
											flex: 1,
											padding: "10px 14px",
											borderRadius: 8,
											border: "0.5px solid #cbd5e1",
											fontSize: 13,
											fontFamily: "inherit"
										},
										onKeyDown: (e) => {
											if (e.key === "Enter") handleUrlImport();
										}
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: handleUrlImport,
										disabled: urlLoading,
										style: {
											padding: "10px 20px",
											borderRadius: 8,
											background: "#3B82F6",
											color: "white",
											border: "none",
											cursor: "pointer",
											fontFamily: "inherit",
											fontWeight: 500,
											fontSize: 13,
											whiteSpace: "nowrap"
										},
										children: urlLoading ? "⏳ جاري..." : "استخراج البيانات"
									})]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									background: "#f8fafc",
									borderRadius: 8,
									padding: 14,
									fontSize: 12,
									color: "#64748b"
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										fontWeight: 600,
										color: "#475569",
										marginBottom: 6
									},
									children: "المواقع المدعومة:"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										display: "flex",
										flexWrap: "wrap",
										gap: 8
									},
									children: [
										{
											name: "Qatar Digital Library",
											"url": "https://www.qdl.qa"
										},
										{
											name: "British National Archives",
											"url": "https://discovery.nationalarchives.gov.uk"
										},
										{
											name: "Internet Archive",
											"url": "https://archive.org"
										},
										{
											name: "Jstor",
											"url": "https://www.jstor.org"
										},
										{
											name: "Google Scholar",
											"url": "https://scholar.google.com"
										}
									].map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
										href: s.url,
										target: "_blank",
										rel: "noopener noreferrer",
										style: {
											background: "#eff6ff",
											color: "#3B82F6",
											borderRadius: 6,
											padding: "3px 10px",
											textDecoration: "none",
											fontSize: 11
										},
										children: ["🔗 ", s.name]
									}, s.name))
								})]
							})]
						}),
						urlLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								background: "white",
								borderRadius: 12,
								padding: 30,
								textAlign: "center",
								border: "0.5px solid #e2e8f0"
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								style: { fontSize: 36 },
								children: "🔍"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								style: {
									color: "#64748b",
									marginTop: 8,
									fontSize: 13
								},
								children: "جاري تحليل الرابط واستخراج البيانات..."
							})]
						}),
						urlResult && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								background: "#f0fdf4",
								borderRadius: 12,
								padding: 16,
								border: "0.5px solid #86efac"
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										fontWeight: 600,
										color: "#16a34a",
										marginBottom: 10,
										fontSize: 13
									},
									children: "✅ تم استخراج البيانات — ستُضاف للنموذج تلقائياً"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
									style: {
										whiteSpace: "pre-wrap",
										fontFamily: "inherit",
										fontSize: 12,
										background: "white",
										borderRadius: 8,
										padding: 12,
										border: "0.5px solid #e2e8f0"
									},
									children: JSON.stringify(urlResult, null, 2)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setPage("add"),
									style: {
										marginTop: 10,
										padding: "8px 18px",
										borderRadius: 8,
										background: "#16a34a",
										color: "white",
										border: "none",
										cursor: "pointer",
										fontFamily: "inherit",
										fontSize: 13
									},
									children: "إكمال البيانات وإضافة الوثيقة ←"
								})
							]
						})
					] }),
					page === "add" && (() => {
						const SOURCE_TYPES_ADD = [
							"وثيقة أرشيفية",
							"كتاب عربي",
							"كتاب أجنبي",
							"رسالة ماجستير",
							"أطروحة دكتوراه",
							"بحث علمي",
							"مجلة علمية",
							"مؤتمر علمي",
							"صحيفة",
							"موقع إلكتروني",
							"موسوعة",
							"تقرير رسمي"
						];
						const FIELDS_BY_TYPE = {
							"وثيقة أرشيفية": [
								{
									k: "archiveRef",
									l: "الرقم الأرشيفي (IOR)",
									ph: "IOR/R/15/2/..."
								},
								{
									k: "author",
									l: "المؤلف / الجهة",
									ph: "اسم المؤلف"
								},
								{
									k: "year",
									l: "السنة",
									ph: "1942",
									t: "number"
								}
							],
							"كتاب عربي": [
								{
									k: "author",
									l: "المؤلف",
									ph: "اسم المؤلف"
								},
								{
									k: "edition",
									l: "الطبعة",
									ph: "الأولى"
								},
								{
									k: "place",
									l: "مكان النشر",
									ph: "بيروت"
								},
								{
									k: "publisher",
									l: "الناشر",
									ph: "دار النشر"
								},
								{
									k: "year",
									l: "السنة",
									ph: "1990",
									t: "number"
								}
							],
							"كتاب أجنبي": [
								{
									k: "author",
									l: "المؤلف",
									ph: "Author Name"
								},
								{
									k: "edition",
									l: "الطبعة",
									ph: "1st"
								},
								{
									k: "place",
									l: "مكان النشر",
									ph: "London"
								},
								{
									k: "publisher",
									l: "الناشر",
									ph: "Routledge"
								},
								{
									k: "year",
									l: "السنة",
									ph: "1990",
									t: "number"
								}
							],
							"رسالة ماجستير": [
								{
									k: "author",
									l: "اسم الباحث",
									ph: ""
								},
								{
									k: "college",
									l: "الكلية",
									ph: ""
								},
								{
									k: "university",
									l: "الجامعة",
									ph: ""
								},
								{
									k: "year",
									l: "السنة",
									ph: "",
									t: "number"
								}
							],
							"أطروحة دكتوراه": [
								{
									k: "author",
									l: "اسم الباحث",
									ph: ""
								},
								{
									k: "college",
									l: "الكلية",
									ph: ""
								},
								{
									k: "university",
									l: "الجامعة",
									ph: ""
								},
								{
									k: "year",
									l: "السنة",
									ph: "",
									t: "number"
								}
							],
							"بحث علمي": [
								{
									k: "author",
									l: "المؤلف",
									ph: ""
								},
								{
									k: "journal",
									l: "اسم المجلة",
									ph: ""
								},
								{
									k: "volume",
									l: "المجلد",
									ph: ""
								},
								{
									k: "issue",
									l: "العدد",
									ph: ""
								},
								{
									k: "year",
									l: "السنة",
									ph: "",
									t: "number"
								},
								{
									k: "pages",
									l: "الصفحات",
									ph: "45-67"
								}
							],
							"مجلة علمية": [
								{
									k: "author",
									l: "المؤلف",
									ph: ""
								},
								{
									k: "journal",
									l: "اسم المجلة",
									ph: ""
								},
								{
									k: "volume",
									l: "المجلد",
									ph: ""
								},
								{
									k: "issue",
									l: "العدد",
									ph: ""
								},
								{
									k: "year",
									l: "السنة",
									ph: "",
									t: "number"
								},
								{
									k: "pages",
									l: "الصفحات",
									ph: "45-67"
								}
							],
							"مؤتمر علمي": [
								{
									k: "author",
									l: "المؤلف",
									ph: ""
								},
								{
									k: "conference",
									l: "اسم المؤتمر",
									ph: ""
								},
								{
									k: "place",
									l: "المكان",
									ph: ""
								},
								{
									k: "year",
									l: "السنة",
									ph: "",
									t: "number"
								}
							],
							"صحيفة": [
								{
									k: "newspaper",
									l: "اسم الصحيفة",
									ph: ""
								},
								{
									k: "issue",
									l: "رقم العدد",
									ph: ""
								},
								{
									k: "visitDate",
									l: "التاريخ",
									ph: "1942-05-10"
								}
							],
							"موقع إلكتروني": [
								{
									k: "author",
									l: "المؤلف",
									ph: ""
								},
								{
									k: "url",
									l: "الرابط",
									ph: "https://..."
								},
								{
									k: "visitDate",
									l: "تاريخ الزيارة",
									ph: "2025-01-15"
								}
							],
							"موسوعة": [
								{
									k: "volume",
									l: "المجلد",
									ph: ""
								},
								{
									k: "edition",
									l: "الطبعة",
									ph: ""
								},
								{
									k: "publisher",
									l: "الناشر",
									ph: ""
								},
								{
									k: "year",
									l: "السنة",
									ph: "",
									t: "number"
								}
							],
							"تقرير رسمي": [
								{
									k: "author",
									l: "المؤلف",
									ph: ""
								},
								{
									k: "agency",
									l: "الجهة المصدرة",
									ph: ""
								},
								{
									k: "year",
									l: "السنة",
									ph: "",
									t: "number"
								}
							]
						};
						const dynFields = FIELDS_BY_TYPE[addForm.category] || FIELDS_BY_TYPE["وثيقة أرشيفية"];
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								style: {
									fontSize: 20,
									fontWeight: 700,
									marginBottom: 6
								},
								children: "➕ إضافة مصدر"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								style: {
									color: "#64748b",
									fontSize: 12,
									marginBottom: 16
								},
								children: "اختر نوع المصدر أولاً — ستظهر الحقول المناسبة تلقائياً"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									background: "white",
									borderRadius: 12,
									padding: 20,
									border: "0.5px solid #e2e8f0"
								},
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: {
											background: "#eff6ff",
											borderRadius: 10,
											padding: 12,
											marginBottom: 16,
											border: "0.5px solid #bfdbfe"
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
											style: {
												fontSize: 12,
												color: "#1e40af",
												fontWeight: 700,
												display: "block",
												marginBottom: 6
											},
											children: "🏷️ نوع المصدر *"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
											value: addForm.category,
											onChange: (e) => setAddForm((p) => ({
												...p,
												category: e.target.value
											})),
											style: {
												width: "100%",
												padding: "10px 12px",
												borderRadius: 8,
												border: "0.5px solid #93c5fd",
												fontSize: 14,
												fontFamily: "inherit",
												fontWeight: 600,
												background: "white"
											},
											children: SOURCE_TYPES_ADD.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: t,
												children: t
											}, t))
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: {
											display: "grid",
											gridTemplateColumns: "repeat(2,1fr)",
											gap: 14
										},
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												style: { gridColumn: "1/-1" },
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
													style: {
														fontSize: 12,
														color: "#64748b",
														display: "block",
														marginBottom: 4
													},
													children: "العنوان *"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													value: addForm.title,
													onChange: (e) => setAddForm((p) => ({
														...p,
														title: e.target.value
													})),
													placeholder: "عنوان المصدر",
													style: {
														width: "100%",
														padding: "9px 12px",
														borderRadius: 8,
														border: "0.5px solid #cbd5e1",
														fontSize: 13,
														fontFamily: "inherit",
														boxSizing: "border-box"
													}
												})]
											}),
											dynFields.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
												style: {
													fontSize: 12,
													color: "#64748b",
													display: "block",
													marginBottom: 4
												},
												children: f.l
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: f.t || "text",
												value: addForm[f.k] || "",
												onChange: (e) => setAddForm((p) => ({
													...p,
													[f.k]: e.target.value
												})),
												placeholder: f.ph,
												style: {
													width: "100%",
													padding: "8px 12px",
													borderRadius: 8,
													border: "0.5px solid #cbd5e1",
													fontSize: 13,
													fontFamily: "inherit",
													boxSizing: "border-box"
												}
											})] }, f.k)),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
												style: {
													fontSize: 12,
													color: "#64748b",
													display: "block",
													marginBottom: 4
												},
												children: "الكلمات المفتاحية"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												value: addForm.keywords,
												onChange: (e) => setAddForm((p) => ({
													...p,
													keywords: e.target.value
												})),
												placeholder: "بريطانيا، نفط، استراتيجية",
												style: {
													width: "100%",
													padding: "8px 12px",
													borderRadius: 8,
													border: "0.5px solid #cbd5e1",
													fontSize: 13,
													fontFamily: "inherit",
													boxSizing: "border-box"
												}
											})] }),
											[
												{
													key: "chapterId",
													label: "الفصل",
													opts: [{
														v: "",
														l: "اختر فصلاً"
													}, ...CHAPTERS_DATA.map((c) => ({
														v: c.id,
														l: c.titleAr.split(":")[0]
													}))]
												},
												{
													key: "priority",
													label: "الأولوية",
													opts: [
														{
															v: "★★★",
															l: "★★★ اقرأه كاملاً"
														},
														{
															v: "★★",
															l: "★★ أوراق محددة"
														},
														{
															v: "★",
															l: "★ احفظ المرجع"
														}
													]
												},
												{
													key: "country",
													label: "الدولة",
													opts: [{
														v: "",
														l: "اختر"
													}, ...COUNTRIES.map((c) => ({
														v: c,
														l: c
													}))]
												}
											].map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
												style: {
													fontSize: 12,
													color: "#64748b",
													display: "block",
													marginBottom: 4
												},
												children: f.label
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
												value: addForm[f.key],
												onChange: (e) => setAddForm((p) => ({
													...p,
													[f.key]: e.target.value
												})),
												style: {
													width: "100%",
													padding: "8px 10px",
													borderRadius: 8,
													border: "0.5px solid #cbd5e1",
													fontSize: 12,
													fontFamily: "inherit"
												},
												children: f.opts.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: o.v,
													children: o.l
												}, o.v))
											})] }, f.key)),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												style: { gridColumn: "1/-1" },
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
													style: {
														fontSize: 12,
														color: "#64748b",
														display: "block",
														marginBottom: 4
													},
													children: "المبحث"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													value: addForm.section,
													onChange: (e) => setAddForm((p) => ({
														...p,
														section: e.target.value
													})),
													placeholder: "مثال: م1: الموقع الاستراتيجي في خطط الحلفاء",
													style: {
														width: "100%",
														padding: "8px 12px",
														borderRadius: 8,
														border: "0.5px solid #cbd5e1",
														fontSize: 13,
														fontFamily: "inherit",
														boxSizing: "border-box"
													}
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												style: { gridColumn: "1/-1" },
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
													style: {
														fontSize: 12,
														color: "#64748b",
														display: "block",
														marginBottom: 4
													},
													children: "ملاحظات"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
													value: addForm.notes,
													onChange: (e) => setAddForm((p) => ({
														...p,
														notes: e.target.value
													})),
													rows: 3,
													placeholder: "أهمية المصدر، المحتوى المتوقع...",
													style: {
														width: "100%",
														padding: "8px 12px",
														borderRadius: 8,
														border: "0.5px solid #cbd5e1",
														fontSize: 13,
														fontFamily: "inherit",
														resize: "vertical",
														boxSizing: "border-box"
													}
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
												style: {
													display: "flex",
													alignItems: "center",
													gap: 8,
													cursor: "pointer",
													fontSize: 13
												},
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													type: "checkbox",
													checked: addForm.isNew,
													onChange: (e) => setAddForm((p) => ({
														...p,
														isNew: e.target.checked
													}))
												}), "مصدر جديد (مُكتشف مؤخراً)"]
											}) })
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: {
											display: "flex",
											gap: 10,
											marginTop: 16,
											flexWrap: "wrap"
										},
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: handleAddDoc,
												style: {
													padding: "9px 22px",
													borderRadius: 8,
													background: "#3B82F6",
													color: "white",
													border: "none",
													cursor: "pointer",
													fontWeight: 600,
													fontFamily: "inherit",
													fontSize: 13
												},
												children: "إضافة المصدر"
											}),
											(addForm.category === "كتاب عربي" || addForm.category === "كتاب أجنبي") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: extractBookMetadata,
												disabled: bookExtractLoading,
												style: {
													padding: "9px 16px",
													borderRadius: 8,
													background: "#fef3c7",
													color: "#92400e",
													border: "0.5px solid #fde68a",
													cursor: "pointer",
													fontFamily: "inherit",
													fontSize: 13,
													fontWeight: 600
												},
												children: bookExtractLoading ? "⏳ جاري الاستخراج..." : "🪄 استخراج تلقائي لبيانات الكتاب"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => setAddForm(EMPTY_ADD_FORM),
												style: {
													padding: "9px 16px",
													borderRadius: 8,
													background: "transparent",
													border: "0.5px solid #cbd5e1",
													cursor: "pointer",
													fontFamily: "inherit",
													fontSize: 13
												},
												children: "مسح"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => {
													setUrlImport("");
													setPage("url_import");
												},
												style: {
													padding: "9px 16px",
													borderRadius: 8,
													background: "#eff6ff",
													color: "#3B82F6",
													border: "0.5px solid #bfdbfe",
													cursor: "pointer",
													fontFamily: "inherit",
													fontSize: 13
												},
												children: "🔗 استيراد من رابط"
											})
										]
									})
								]
							}),
							(() => {
								const userAdded = docs.filter((d) => !BASE_DOC_IDS.has(d.id));
								if (userAdded.length === 0) return null;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										background: "white",
										borderRadius: 12,
										padding: 20,
										border: "0.5px solid #e2e8f0",
										marginTop: 16
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: {
											fontWeight: 700,
											fontSize: 15,
											color: "#1e293b",
											marginBottom: 12
										},
										children: [
											"📋 المصادر المُضافة (",
											userAdded.length,
											")"
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											display: "flex",
											flexDirection: "column",
											gap: 8
										},
										children: userAdded.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											style: {
												display: "flex",
												justifyContent: "space-between",
												alignItems: "center",
												gap: 10,
												padding: "10px 12px",
												borderRadius: 8,
												border: "0.5px solid #e2e8f0",
												background: "#f8fafc"
											},
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												style: {
													flex: 1,
													minWidth: 0
												},
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													style: {
														fontWeight: 600,
														fontSize: 13,
														color: "#1e293b",
														marginBottom: 2,
														overflow: "hidden",
														textOverflow: "ellipsis",
														whiteSpace: "nowrap"
													},
													children: d.title
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													style: {
														fontSize: 11,
														color: "#64748b"
													},
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															style: {
																background: "#e0f2fe",
																color: "#0369a1",
																padding: "1px 6px",
																borderRadius: 4,
																marginInlineEnd: 6
															},
															children: d.category || d.sourceType || "مصدر"
														}),
														d.author && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: d.author }),
														d.year && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [" • ", d.year] })
													]
												})]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => setConfirmDialog({
													title: "تأكيد الحذف",
													message: "هل أنت متأكد من حذف هذا المصدر؟\nلا يمكن التراجع عن هذا الإجراء.",
													onConfirm: () => deleteUserDoc(d.id)
												}),
												title: "حذف",
												style: {
													padding: "6px 10px",
													borderRadius: 6,
													background: "#fee2e2",
													color: "#dc2626",
													border: "none",
													cursor: "pointer",
													fontSize: 13,
													fontFamily: "inherit"
												},
												children: "🗑️"
											})]
										}, d.id))
									})]
								});
							})()
						] });
					})(),
					page === "export" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							style: {
								fontSize: 20,
								fontWeight: 700,
								marginBottom: 16
							},
							children: "📤 تصدير المراجع الأكاديمية"
						}),
						showCustomBuilder && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								background: "white",
								borderRadius: 12,
								padding: 20,
								border: "2px solid #7C3AED",
								marginBottom: 16
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
										marginBottom: 16
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: {
											fontWeight: 700,
											fontSize: 14,
											color: "#7C3AED"
										},
										children: ["⭐ ", editingCustomFmt !== null ? `تعديل: ${customFormats[editingCustomFmt]?.name}` : "إنشاء صيغة توثيق جديدة"]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => {
											setShowCustomBuilder(false);
											setEditingCustomFmt(null);
										},
										style: {
											background: "transparent",
											border: "none",
											fontSize: 18,
											cursor: "pointer",
											color: "#94a3b8"
										},
										children: "✕"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: { marginBottom: 14 },
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										style: {
											fontSize: 12,
											color: "#64748b",
											display: "block",
											marginBottom: 4
										},
										children: ["اسم الصيغة * ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											style: { color: "#94a3b8" },
											children: "(مثال: صيغة جامعة الموصل)"
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: customFmtForm.name,
										onChange: (e) => setCustomFmtForm((p) => ({
											...p,
											name: e.target.value
										})),
										placeholder: "اسم الصيغة...",
										style: {
											width: "100%",
											padding: "8px 12px",
											borderRadius: 8,
											border: "0.5px solid #cbd5e1",
											fontSize: 13,
											fontFamily: "inherit",
											boxSizing: "border-box"
										}
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										background: "#faf5ff",
										borderRadius: 8,
										padding: 12,
										marginBottom: 14,
										border: "0.5px solid #e9d5ff"
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											fontSize: 11,
											color: "#7C3AED",
											fontWeight: 600,
											marginBottom: 6
										},
										children: "المتغيرات المتاحة — اضغط لنسخها:"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											display: "flex",
											flexWrap: "wrap",
											gap: 4
										},
										children: [
											"{المؤلف}",
											"{العنوان}",
											"{السنة}",
											"{الرقم_الأرشيفي}",
											"{النوع}",
											"{الفصل}",
											"{الملاحظات}",
											"{الناشر}",
											"{مكان_النشر}",
											"{الجامعة}",
											"{الدرجة}",
											"{اسم_المجلة}",
											"{المجلد}",
											"{العدد}",
											"{الصفحات}",
											"{اسم_الصحيفة}",
											"{التاريخ}",
											"{الرابط}",
											"{تاريخ_الزيارة}",
											"{الجهة}"
										].map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => {
												navigator.clipboard.writeText(v);
												showNotif(`📋 تم نسخ ${v}`);
											},
											style: {
												background: "white",
												color: "#7C3AED",
												border: "0.5px solid #d8b4fe",
												borderRadius: 5,
												padding: "2px 7px",
												fontSize: 10,
												fontFamily: "monospace",
												cursor: "pointer"
											},
											children: v
										}, v))
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										fontSize: 12,
										color: "#64748b",
										fontWeight: 600,
										marginBottom: 8
									},
									children: "قالب لكل نوع مصدر:"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										display: "grid",
										gap: 10
									},
									children: Object.keys(customFmtForm.templates).map((type) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: {
											background: "#f8fafc",
											borderRadius: 8,
											padding: 10,
											border: "0.5px solid #e2e8f0"
										},
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												style: {
													fontSize: 11,
													fontWeight: 600,
													color: "#475569",
													marginBottom: 5,
													display: "flex",
													alignItems: "center",
													gap: 6
												},
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													style: {
														background: "#eff6ff",
														color: "#3B82F6",
														borderRadius: 4,
														padding: "1px 6px",
														fontSize: 10
													},
													children: type
												})
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
												value: customFmtForm.templates[type],
												onChange: (e) => setCustomFmtForm((p) => ({
													...p,
													templates: {
														...p.templates,
														[type]: e.target.value
													}
												})),
												rows: 2,
												style: {
													width: "100%",
													padding: "6px 10px",
													borderRadius: 6,
													border: "0.5px solid #cbd5e1",
													fontSize: 11,
													fontFamily: "'Courier New',monospace",
													resize: "vertical",
													boxSizing: "border-box",
													direction: "ltr"
												}
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												style: {
													fontSize: 10,
													color: "#94a3b8",
													marginTop: 4,
													direction: "rtl"
												},
												children: ["معاينة: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													style: {
														color: "#475569",
														fontFamily: "inherit"
													},
													children: applyCustomTemplate(customFmtForm.templates[type], {
														title: "عنوان الوثيقة التجريبية",
														author: "اسم المؤلف",
														year: "1942",
														archiveRef: "IOR/R/15/2/656",
														category: type
													})
												})]
											})
										]
									}, type))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										gap: 10,
										marginTop: 16
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: saveCustomFormat,
										style: {
											padding: "9px 22px",
											borderRadius: 8,
											background: "#7C3AED",
											color: "white",
											border: "none",
											cursor: "pointer",
											fontWeight: 600,
											fontFamily: "inherit",
											fontSize: 13
										},
										children: ["💾 ", editingCustomFmt !== null ? "تحديث الصيغة" : "حفظ الصيغة"]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => {
											setShowCustomBuilder(false);
											setEditingCustomFmt(null);
										},
										style: {
											padding: "9px 16px",
											borderRadius: 8,
											background: "transparent",
											border: "0.5px solid #cbd5e1",
											cursor: "pointer",
											fontFamily: "inherit",
											fontSize: 13
										},
										children: "إلغاء"
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: 16
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									background: "white",
									borderRadius: 12,
									padding: 16,
									border: "0.5px solid #e2e8f0"
								},
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											fontWeight: 600,
											fontSize: 13,
											marginBottom: 10
										},
										children: "صيغة التوثيق"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: {
											display: "flex",
											flexWrap: "wrap",
											gap: 6,
											marginBottom: 10
										},
										children: [
											[
												"Chicago",
												"APA",
												"MLA"
											].map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => setExportFormat(f),
												style: {
													padding: "6px 12px",
													borderRadius: 8,
													border: `2px solid ${exportFormat === f ? "#3B82F6" : "#e2e8f0"}`,
													background: exportFormat === f ? "#eff6ff" : "transparent",
													color: exportFormat === f ? "#3B82F6" : "inherit",
													cursor: "pointer",
													fontWeight: exportFormat === f ? 600 : 400,
													fontFamily: "inherit",
													fontSize: 12
												},
												children: f
											}, f)),
											customFormats.map((cf, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												style: {
													display: "flex",
													alignItems: "center",
													gap: 2
												},
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
														onClick: () => setExportFormat(`custom_${i}`),
														style: {
															padding: "6px 12px",
															borderRadius: "8px 0 0 8px",
															border: `2px solid ${exportFormat === `custom_${i}` ? "#7C3AED" : "#e9d5ff"}`,
															background: exportFormat === `custom_${i}` ? "#faf5ff" : "transparent",
															color: exportFormat === `custom_${i}` ? "#7C3AED" : "#7C3AED",
															cursor: "pointer",
															fontWeight: exportFormat === `custom_${i}` ? 700 : 400,
															fontFamily: "inherit",
															fontSize: 12
														},
														children: ["⭐ ", cf.name]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														onClick: () => {
															setEditingCustomFmt(i);
															setCustomFmtForm({
																...customFormats[i],
																templates: { ...customFormats[i].templates }
															});
															setShowCustomBuilder(true);
														},
														title: "تعديل",
														style: {
															padding: "6px 6px",
															border: `2px solid ${exportFormat === `custom_${i}` ? "#7C3AED" : "#e9d5ff"}`,
															borderLeft: "none",
															background: "transparent",
															cursor: "pointer",
															fontSize: 11,
															color: "#7C3AED"
														},
														children: "✏️"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														onClick: () => deleteCustomFormat(i),
														title: "حذف",
														style: {
															padding: "6px 6px",
															borderRadius: "0 8px 8px 0",
															border: `2px solid ${exportFormat === `custom_${i}` ? "#7C3AED" : "#e9d5ff"}`,
															borderLeft: "none",
															background: "transparent",
															cursor: "pointer",
															fontSize: 11,
															color: "#dc2626"
														},
														children: "🗑️"
													})
												]
											}, i)),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => {
													setEditingCustomFmt(null);
													setShowCustomBuilder(true);
												},
												style: {
													padding: "6px 12px",
													borderRadius: 8,
													border: "2px dashed #d8b4fe",
													background: "transparent",
													color: "#7C3AED",
													cursor: "pointer",
													fontFamily: "inherit",
													fontSize: 12
												},
												children: "+ صيغة خاصة"
											})
										]
									}),
									exportFormat.startsWith("custom_") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											background: "#faf5ff",
											borderRadius: 8,
											padding: 8,
											marginBottom: 10,
											fontSize: 11,
											color: "#7C3AED",
											border: "0.5px solid #e9d5ff"
										},
										children: "⭐ صيغة مخصصة — سيُطبَّق القالب المناسب تلقائياً حسب نوع كل مصدر"
									}),
									(() => {
										const _q = exportSearch.trim().toLowerCase();
										const _filteredExportDocs = combinedDocs.filter((d) => {
											if (exportTypeFilter && (d.category || "وثيقة أرشيفية") !== exportTypeFilter) return false;
											if (!_q) return true;
											return [
												d.title,
												d.author,
												d.archiveRef
											].some((v) => (v || "").toString().toLowerCase().includes(_q));
										});
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												style: { marginBottom: 10 },
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
													style: {
														display: "block",
														fontSize: 12,
														fontWeight: 600,
														marginBottom: 4,
														color: "#475569"
													},
													children: "ابحث في المصادر..."
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													type: "text",
													value: exportSearch,
													onChange: (e) => setExportSearch(e.target.value),
													placeholder: "ابحث بالعنوان أو المؤلف أو الرقم الأرشيفي",
													style: {
														width: "100%",
														padding: "8px 10px",
														borderRadius: 8,
														border: "0.5px solid #cbd5e1",
														fontSize: 12,
														fontFamily: "inherit",
														boxSizing: "border-box",
														direction: "rtl"
													}
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												style: {
													display: "flex",
													gap: 8,
													marginBottom: 10,
													alignItems: "center",
													flexWrap: "wrap"
												},
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														onClick: () => setExportSelected(_filteredExportDocs.map((d) => d.id)),
														style: {
															padding: "5px 10px",
															borderRadius: 6,
															border: "0.5px solid #cbd5e1",
															cursor: "pointer",
															fontSize: 11,
															fontFamily: "inherit"
														},
														children: "تحديد الكل"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														onClick: () => setExportSelected(_filteredExportDocs.filter((d) => d.priority === "★★★").map((d) => d.id)),
														style: {
															padding: "5px 10px",
															borderRadius: 6,
															border: "0.5px solid #cbd5e1",
															cursor: "pointer",
															fontSize: 11,
															fontFamily: "inherit"
														},
														children: "★★★ فقط"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														onClick: () => setExportSelected([]),
														style: {
															padding: "5px 10px",
															borderRadius: 6,
															border: "0.5px solid #cbd5e1",
															cursor: "pointer",
															fontSize: 11,
															fontFamily: "inherit"
														},
														children: "مسح"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
														value: exportTypeFilter,
														onChange: (e) => setExportTypeFilter(e.target.value),
														style: {
															marginInlineStart: "auto",
															padding: "5px 8px",
															borderRadius: 6,
															border: "0.5px solid #cbd5e1",
															fontSize: 11,
															fontFamily: "inherit"
														},
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
															value: "",
															children: "🏷️ كل الأنواع"
														}), [
															"وثيقة أرشيفية",
															"كتاب عربي",
															"كتاب أجنبي",
															"رسالة ماجستير",
															"أطروحة دكتوراه",
															"بحث علمي",
															"مجلة علمية",
															"مؤتمر علمي",
															"صحيفة",
															"موقع إلكتروني",
															"موسوعة",
															"تقرير رسمي",
															"مصدر أولي"
														].map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
															value: t,
															children: t
														}, t))]
													})
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												style: {
													maxHeight: 300,
													overflowY: "auto",
													borderRadius: 8,
													border: "0.5px solid #f1f5f9"
												},
												children: _filteredExportDocs.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													style: {
														padding: 20,
														textAlign: "center",
														color: "#94a3b8",
														fontSize: 12
													},
													children: "لا توجد نتائج مطابقة"
												}) : _filteredExportDocs.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													style: {
														display: "flex",
														alignItems: "center",
														gap: 8,
														padding: "6px 10px",
														borderBottom: "0.5px solid #f8fafc",
														fontSize: 11
													},
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
														style: {
															display: "flex",
															alignItems: "center",
															gap: 8,
															flex: 1,
															cursor: "pointer",
															minWidth: 0
														},
														children: [
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
																type: "checkbox",
																checked: exportSelected.includes(d.id),
																onChange: () => setExportSelected((p) => p.includes(d.id) ? p.filter((x) => x !== d.id) : [...p, d.id])
															}),
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																style: {
																	background: pBg(d.priority),
																	color: pColor(d.priority),
																	borderRadius: 4,
																	padding: "1px 4px",
																	fontSize: 9,
																	flexShrink: 0
																},
																children: d.priority
															}),
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																style: {
																	flex: 1,
																	overflow: "hidden",
																	textOverflow: "ellipsis",
																	whiteSpace: "nowrap"
																},
																children: d.title
															}),
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																style: {
																	fontSize: 9,
																	color: "white",
																	background: "#3B82F6",
																	borderRadius: 4,
																	padding: "2px 6px",
																	flexShrink: 0,
																	fontWeight: 600
																},
																children: d.category || "وثيقة أرشيفية"
															})
														]
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														onClick: (e) => {
															e.stopPropagation();
															openFootnoteModal(d);
														},
														title: "توليد مرجع وإضافته للمراجع النهائية",
														style: {
															padding: "4px 10px",
															borderRadius: 6,
															background: "#eff6ff",
															color: "#3B82F6",
															border: "0.5px solid #bfdbfe",
															cursor: "pointer",
															fontFamily: "inherit",
															fontSize: 10,
															fontWeight: 600,
															flexShrink: 0,
															whiteSpace: "nowrap"
														},
														children: "📝 توليد مرجع"
													})]
												}, d.id))
											})
										] });
									})(),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: () => {
											if (!exportSelected.length) {
												showNotif("اختر وثيقة واحدة على الأقل", "error");
												return;
											}
											setBulkFootnoteModal({
												items: combinedDocs.filter((d) => exportSelected.includes(d.id)).map((d) => ({
													doc: d,
													page: ""
												})),
												generated: null
											});
										},
										style: {
											marginTop: 12,
											width: "100%",
											padding: "9px",
											borderRadius: 8,
											background: "#3B82F6",
											color: "white",
											border: "none",
											cursor: "pointer",
											fontWeight: 600,
											fontFamily: "inherit",
											fontSize: 13
										},
										children: [
											"توليد ",
											exportSelected.length,
											" مرجع"
										]
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									background: "white",
									borderRadius: 12,
									padding: 16,
									border: "0.5px solid #e2e8f0"
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										fontWeight: 600,
										fontSize: 13,
										marginBottom: 10
									},
									children: "المراجع المُولَّدة"
								}), exportText ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
									value: exportText,
									readOnly: true,
									rows: 16,
									style: {
										width: "100%",
										padding: 10,
										borderRadius: 8,
										border: "0.5px solid #cbd5e1",
										fontSize: 11,
										fontFamily: "'Courier New',monospace",
										resize: "vertical",
										background: "#f8fafc",
										boxSizing: "border-box",
										direction: "rtl",
										lineHeight: 1.8
									}
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										display: "flex",
										gap: 8,
										marginTop: 8
									},
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => {
											navigator.clipboard.writeText(exportText);
											showNotif("✅ تم النسخ!");
										},
										style: {
											padding: "7px 14px",
											borderRadius: 8,
											background: "#10B981",
											color: "white",
											border: "none",
											cursor: "pointer",
											fontFamily: "inherit",
											fontSize: 12
										},
										children: "📋 نسخ"
									})
								})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										color: "#94a3b8",
										fontSize: 13,
										padding: 20,
										textAlign: "center"
									},
									children: "اختر الوثائق ثم اضغط \"توليد\""
								})]
							})]
						})
					] }),
					page === "ai" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							style: {
								fontSize: 20,
								fontWeight: 700,
								marginBottom: 6
							},
							children: "🤖 المساعد البحثي الذكي"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							style: {
								color: "#64748b",
								fontSize: 13,
								marginBottom: 16
							},
							children: [
								"اسأل أي سؤال بحثي حول أطروحتك ومصادرها — يعمل بـ ",
								AI_MODELS.find((m) => m.id === aiModel)?.label || aiModel,
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									style: {
										display: "inline-block",
										width: 8,
										height: 8,
										borderRadius: "50%",
										background: "#10b981",
										marginInlineStart: 6,
										verticalAlign: "middle"
									},
									title: "متصل"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								background: "white",
								borderRadius: 12,
								padding: 16,
								border: "0.5px solid #e2e8f0",
								marginBottom: 14
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									gap: 10,
									marginBottom: 10
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									ref: aiInputRef,
									placeholder: "مثال: ما هي أبرز وثائق RAF في البحرين؟ أو: حلّل وثائق الفصل الرابع المتعلقة بالنفط",
									style: {
										flex: 1,
										padding: "9px 14px",
										borderRadius: 8,
										border: "0.5px solid #cbd5e1",
										fontSize: 13,
										fontFamily: "inherit"
									},
									onKeyDown: (e) => {
										if (e.key === "Enter" && aiInputRef.current) handleAISearch(aiInputRef.current.value);
									}
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => aiInputRef.current && handleAISearch(aiInputRef.current.value),
									disabled: aiLoading,
									style: {
										padding: "9px 18px",
										borderRadius: 8,
										background: "#7C3AED",
										color: "white",
										border: "none",
										cursor: "pointer",
										fontFamily: "inherit",
										fontSize: 13
									},
									children: aiLoading ? "⏳" : "تحليل →"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								style: {
									display: "flex",
									gap: 6,
									flexWrap: "wrap"
								},
								children: [
									"وثائق RAF وسلاح الجو في البحرين",
									"النفط ودوره الاستراتيجي في الحرب",
									"البروباغندا البريطانية في الخليج",
									"فجوات بحثية في مصادر الأطروحة",
									"أفضل وثائق الفصل الثالث"
								].map((q) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => {
										if (aiInputRef.current) aiInputRef.current.value = q;
										handleAISearch(q);
									},
									style: {
										padding: "4px 10px",
										borderRadius: 20,
										border: "0.5px solid #d8b4fe",
										background: "#faf5ff",
										color: "#7C3AED",
										cursor: "pointer",
										fontSize: 11,
										fontFamily: "inherit"
									},
									children: q
								}, q))
							})]
						}),
						aiLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								background: "#faf5ff",
								borderRadius: 12,
								padding: 30,
								textAlign: "center",
								border: "0.5px solid #d8b4fe"
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								style: { fontSize: 36 },
								children: "🤖"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								style: {
									color: "#64748b",
									marginTop: 8
								},
								children: "جاري التحليل..."
							})]
						}),
						aiResult && !aiLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								background: "#faf5ff",
								borderRadius: 12,
								padding: 20,
								border: "0.5px solid #d8b4fe"
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										fontWeight: 600,
										color: "#7C3AED",
										marginBottom: 12,
										fontSize: 13
									},
									children: "🤖 تحليل المساعد الذكي"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
									style: {
										whiteSpace: "pre-wrap",
										fontFamily: "inherit",
										fontSize: 13,
										lineHeight: 1.9,
										margin: 0
									},
									children: aiResult
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => {
										navigator.clipboard.writeText(aiResult);
										showNotif("✅ تم النسخ!");
									},
									style: {
										marginTop: 12,
										padding: "7px 14px",
										borderRadius: 8,
										background: "white",
										border: "0.5px solid #d8b4fe",
										color: "#7C3AED",
										cursor: "pointer",
										fontFamily: "inherit",
										fontSize: 12
									},
									children: "📋 نسخ التحليل"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								background: "white",
								borderRadius: 12,
								padding: 16,
								border: "0.5px solid #e2e8f0",
								marginTop: 18
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										fontWeight: 700,
										color: "#0f172a",
										marginBottom: 6,
										fontSize: 14
									},
									children: "🔎 المعرّف الأكاديمي (شخص / مكان / جهة)"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									style: {
										color: "#64748b",
										fontSize: 12,
										marginBottom: 10
									},
									children: "أدخل اسم شخصية أو مكان أو جهة — سيعطيك المساعد تعريفاً مكثّفاً في ثلاثة أسطر مع مصدر موثوق قابل للتحقق."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										gap: 10,
										marginBottom: 10
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: entityQuery,
										onChange: (e) => setEntityQuery(e.target.value),
										placeholder: "مثال: السير تشارلز بلجريف، ميناء البحرين، شركة نفط العراق (IPC)…",
										style: {
											flex: 1,
											padding: "9px 14px",
											borderRadius: 8,
											border: "0.5px solid #cbd5e1",
											fontSize: 13,
											fontFamily: "inherit"
										},
										onKeyDown: (e) => {
											if (e.key === "Enter") handleEntityLookup();
										}
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: handleEntityLookup,
										disabled: entityLoading,
										style: {
											padding: "9px 18px",
											borderRadius: 8,
											background: "#0f172a",
											color: "white",
											border: "none",
											cursor: "pointer",
											fontFamily: "inherit",
											fontSize: 13
										},
										children: entityLoading ? "⏳" : "تعريف →"
									})]
								}),
								entityLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										color: "#64748b",
										fontSize: 12
									},
									children: "جاري البحث عن تعريف موثوق…"
								}),
								entityResult && !entityLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										background: "#f8fafc",
										borderRadius: 8,
										padding: 14,
										border: "0.5px solid #e2e8f0"
									},
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												fontWeight: 700,
												fontSize: 14,
												marginBottom: 6
											},
											children: entityResult.name || entityQuery
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												whiteSpace: "pre-wrap",
												fontSize: 13,
												lineHeight: 1.9,
												color: "#1e293b",
												marginBottom: 10
											},
											children: entityResult.definition || "—"
										}),
										entityResult.source && entityResult.source.title && entityResult.source.author ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											style: {
												fontSize: 12,
												color: "#475569",
												borderTop: "0.5px solid #e2e8f0",
												paddingTop: 8
											},
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [
													"المصدر الأكاديمي",
													entityResult.sourceType ? ` (${entityResult.sourceType === "book" ? "كتاب" : entityResult.sourceType === "journal" ? "مجلة محكّمة" : "رسالة جامعية"})` : "",
													":"
												] }),
												" ",
												entityResult.source.author,
												" — ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("em", { children: entityResult.source.title }),
												entityResult.source.publisher ? `, ${entityResult.source.publisher}` : "",
												entityResult.source.year ? ` (${entityResult.source.year})` : "",
												entityResult.source.url ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [" — ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
													href: entityResult.source.url,
													target: "_blank",
													rel: "noopener noreferrer",
													style: { color: "#2563eb" },
													children: entityResult.source.url
												})] }) : null
											]
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												fontSize: 12,
												color: "#b45309",
												background: "#fef3c7",
												borderRadius: 6,
												padding: "8px 10px",
												borderTop: "0.5px solid #fde68a"
											},
											children: "⚠️ No credible academic source available for this entity — لا يوجد مصدر أكاديمي موثّق (كتاب/مجلة محكّمة/رسالة جامعية) قابل للتحقق لهذا الكيان."
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => {
												const txt = `${entityResult.name || entityQuery}\n${entityResult.definition || ""}\nالمصدر: ${entityResult.source?.title || ""} ${entityResult.source?.url || ""}`.trim();
												navigator.clipboard.writeText(txt);
												showNotif("✅ تم النسخ!");
											},
											style: {
												marginTop: 10,
												padding: "6px 12px",
												borderRadius: 8,
												background: "white",
												border: "0.5px solid #cbd5e1",
												color: "#0f172a",
												cursor: "pointer",
												fontFamily: "inherit",
												fontSize: 12
											},
											children: "📋 نسخ"
										})
									]
								})
							]
						})
					] }),
					page === "library" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								justifyContent: "space-between",
								alignItems: "flex-start",
								marginBottom: 16,
								flexWrap: "wrap",
								gap: 10
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								style: {
									fontSize: 20,
									fontWeight: 700,
									marginBottom: 4
								},
								children: "📚 مكتبتي البحثية"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								style: {
									color: "#64748b",
									fontSize: 12
								},
								children: "ارفع مصادرك (PDF، MD، TXT) أو أضف رابطاً — سيحللها الذكاء الاصطناعي ويصنفها لفصول أطروحتك تلقائياً"
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									gap: 8
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									ref: libFileRef,
									type: "file",
									accept: ".pdf,.docx,.md,.txt,.jpg,.jpeg,.png,.webp,.tif,.tiff,.bmp,.gif,image/*",
									multiple: true,
									style: { display: "none" },
									onChange: (e) => handleLibFileUpload(e.target.files)
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => libFileRef.current?.click(),
									disabled: libUploading,
									style: {
										padding: "9px 18px",
										borderRadius: 8,
										background: "#3B82F6",
										color: "white",
										border: "none",
										cursor: "pointer",
										fontWeight: 600,
										fontFamily: "inherit",
										fontSize: 13
									},
									children: libUploading ? "⏳ جاري الرفع..." : "📁 رفع ملفات"
								})]
							})]
						}),
						pendingLibIds.size > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							"data-testid": "library-pending-banner",
							style: {
								background: "#fef3c7",
								borderRadius: 10,
								padding: "10px 14px",
								marginBottom: 12,
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								border: "1px solid #fde68a"
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									fontSize: 13,
									color: "#92400e"
								},
								children: [
									"⏳ لديك ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: pendingLibIds.size }),
									" مصدر محفوظ محلياً فقط لم يصل السحابة بعد.",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										style: {
											fontSize: 11,
											marginRight: 6,
											opacity: .75
										},
										children: "ستُعاد المحاولة تلقائياً كل 30 ثانية وعند عودة الشبكة."
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: retryPendingLibrary,
								"data-testid": "library-retry-btn",
								style: {
									padding: "6px 14px",
									borderRadius: 6,
									background: "#f59e0b",
									color: "white",
									border: "none",
									cursor: "pointer",
									fontSize: 12,
									fontWeight: 700,
									fontFamily: "inherit"
								},
								children: "🔄 إعادة المزامنة الآن"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								background: "white",
								borderRadius: 12,
								padding: 16,
								border: "2px dashed #bfdbfe",
								marginBottom: 14,
								textAlign: "center",
								cursor: "pointer"
							},
							onClick: () => libFileRef.current?.click(),
							onDragOver: (e) => {
								e.preventDefault();
								e.currentTarget.style.borderColor = "#3B82F6";
							},
							onDragLeave: (e) => e.currentTarget.style.borderColor = "#bfdbfe",
							onDrop: (e) => {
								e.preventDefault();
								e.currentTarget.style.borderColor = "#bfdbfe";
								handleLibFileUpload(e.dataTransfer.files);
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										fontSize: 36,
										marginBottom: 6
									},
									children: "📂"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										fontWeight: 600,
										color: "#3B82F6",
										marginBottom: 4
									},
									children: "اسحب وأسقط ملفاتك هنا أو اضغط للاختيار"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										fontSize: 11,
										color: "#94a3b8"
									},
									children: "يدعم: PDF (مع OCR) • DOCX • MD • TXT • صور ممسوحة (JPG/PNG/TIFF/WebP…) — يمر الكل بنفس الخط: رفع ← OCR ← تحليل ← تصنيف ← ربط بالأطروحة — حجم أقصى 500MB للملف الواحد • حتى 20 ملف دفعة واحدة"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										fontSize: 11,
										color: "#94a3b8",
										marginTop: 4
									},
									children: "يمكن رفع عدة ملفات دفعة واحدة — كتب، رسائل، بحوث، مقالات، صحف، وثائق..."
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								background: "white",
								borderRadius: 12,
								padding: 14,
								border: "0.5px solid #e2e8f0",
								marginBottom: 14
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										fontWeight: 600,
										fontSize: 12,
										marginBottom: 8,
										color: "#475569"
									},
									children: "🔗 إضافة مصدر من رابط إنترنت"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										gap: 8
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: libUrlInput,
										onChange: (e) => setLibUrlInput(e.target.value),
										placeholder: "https://www.qdl.qa/... أو jstor.org أو archive.org أو أي رابط",
										style: {
											flex: 1,
											padding: "8px 12px",
											borderRadius: 8,
											border: "0.5px solid #cbd5e1",
											fontSize: 12,
											fontFamily: "inherit"
										},
										onKeyDown: (e) => {
											if (e.key === "Enter") handleLibUrlImport();
										}
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: handleLibUrlImport,
										disabled: libUrlLoading,
										style: {
											padding: "8px 16px",
											borderRadius: 8,
											background: "#10B981",
											color: "white",
											border: "none",
											cursor: "pointer",
											fontFamily: "inherit",
											fontSize: 12,
											whiteSpace: "nowrap"
										},
										children: libUrlLoading ? "⏳ جاري..." : "إضافة + تحليل"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										marginTop: 12,
										paddingTop: 12,
										borderTop: "1px dashed #e2e8f0"
									},
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												fontWeight: 600,
												fontSize: 12,
												marginBottom: 6,
												color: "#475569"
											},
											children: "📊 استيراد جماعي من ملف إكسل"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												fontSize: 11,
												color: "#94a3b8",
												marginBottom: 8
											},
											children: "ورقة لكل فصل، أعمدة: عنوان الملف · المرجع الأرشيفي · المبحث · الأولوية · نوع الوثيقة · ملاحظات — أوراق التعليمات تُتجاهل تلقائياً، والمصادر المكررة (بنفس المرجع الأرشيفي) تُتخطى."
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											ref: libExcelRef,
											type: "file",
											accept: ".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel",
											"data-testid": "lib-excel-input",
											style: { display: "none" },
											onChange: (e) => {
												if (e.target.files?.[0]) handleLibExcelImport(e.target.files);
											}
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => libExcelRef.current?.click(),
											disabled: libExcelLoading,
											"data-testid": "lib-excel-import-btn",
											style: {
												padding: "8px 16px",
												borderRadius: 8,
												background: libExcelLoading ? "#94a3b8" : "#7c3aed",
												color: "white",
												border: "none",
												cursor: libExcelLoading ? "not-allowed" : "pointer",
												fontFamily: "inherit",
												fontSize: 12,
												whiteSpace: "nowrap"
											},
											children: libExcelLoading ? "⏳ جاري الاستيراد..." : "📊 استيراد من إكسل (.xlsx)"
										})
									]
								})
							]
						}),
						library.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							style: {
								display: "grid",
								gridTemplateColumns: "repeat(4,1fr)",
								gap: 10,
								marginBottom: 14
							},
							children: [
								{
									label: "إجمالي المصادر",
									v: library.length,
									c: "#3B82F6",
									i: "📄"
								},
								{
									label: "تم تحليلها",
									v: library.filter((s) => s.analyzed).length,
									c: "#10B981",
									i: "✅"
								},
								{
									label: "عالية الأولوية ★★★",
									v: library.filter((s) => s.priority === "★★★").length,
									c: "#F59E0B",
									i: "⭐"
								},
								{
									label: "بانتظار المراجعة",
									v: library.filter((s) => !s.analyzed).length,
									c: "#EF4444",
									i: "⏳"
								}
							].map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									background: "white",
									borderRadius: 10,
									padding: "10px 12px",
									border: "0.5px solid #e2e8f0",
									textAlign: "center"
								},
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											fontSize: 20,
											marginBottom: 3
										},
										children: s.i
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											fontSize: 22,
											fontWeight: 700,
											color: s.c
										},
										children: s.v
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											fontSize: 10,
											color: "#64748b",
											marginTop: 2
										},
										children: s.label
									})
								]
							}, i))
						}),
						library.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								background: "white",
								borderRadius: 10,
								padding: 12,
								border: "0.5px solid #e2e8f0",
								marginBottom: 12,
								display: "grid",
								gridTemplateColumns: "2fr 1fr 1fr 1fr",
								gap: 8
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									placeholder: "ابحث في العنوان، المؤلف، الكلمات المفتاحية...",
									value: libFilter.query,
									onChange: (e) => setLibFilter((p) => ({
										...p,
										query: e.target.value
									})),
									style: {
										padding: "7px 10px",
										borderRadius: 7,
										border: "0.5px solid #cbd5e1",
										fontSize: 12,
										fontFamily: "inherit"
									}
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									value: libFilter.chapterId,
									onChange: (e) => setLibFilter((p) => ({
										...p,
										chapterId: e.target.value
									})),
									style: {
										padding: "7px 8px",
										borderRadius: 7,
										border: "0.5px solid #cbd5e1",
										fontSize: 11,
										fontFamily: "inherit"
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "",
										children: "كل الفصول"
									}), CHAPTERS_DATA.map((ch) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: ch.id,
										children: ch.titleAr.split(":")[0]
									}, ch.id))]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									value: libFilter.category,
									onChange: (e) => setLibFilter((p) => ({
										...p,
										category: e.target.value
									})),
									style: {
										padding: "7px 8px",
										borderRadius: 7,
										border: "0.5px solid #cbd5e1",
										fontSize: 11,
										fontFamily: "inherit"
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "",
										children: "كل الأنواع"
									}), [
										"كتاب عربي",
										"كتاب أجنبي",
										"رسالة ماجستير",
										"أطروحة دكتوراه",
										"بحث علمي",
										"مجلة علمية",
										"مؤتمر علمي",
										"صحيفة",
										"موقع إلكتروني",
										"موسوعة",
										"وثيقة أرشيفية",
										"تقرير رسمي",
										"مصدر أولي"
									].map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: t,
										children: t
									}, t))]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									value: libFilter.priority,
									onChange: (e) => setLibFilter((p) => ({
										...p,
										priority: e.target.value
									})),
									style: {
										padding: "7px 8px",
										borderRadius: 7,
										border: "0.5px solid #cbd5e1",
										fontSize: 11,
										fontFamily: "inherit"
									},
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "",
											children: "كل الأولويات"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "★★★",
											children: "★★★ عالية"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "★★",
											children: "★★ متوسطة"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "★",
											children: "★ منخفضة"
										})
									]
								})
							]
						}),
						library.length > 0 && libSelectedIds.size > 0 && (() => {
							const filteredIds = filteredLib.map((s) => String(s.id));
							const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => libSelectedIds.has(id));
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								"data-testid": "lib-bulk-toolbar",
								style: {
									background: "#eef2ff",
									borderRadius: 10,
									padding: "10px 14px",
									border: "0.5px solid #c7d2fe",
									marginBottom: 12,
									display: "flex",
									gap: 10,
									alignItems: "center",
									flexWrap: "wrap"
								},
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										"data-testid": "lib-bulk-count",
										style: {
											fontWeight: 700,
											color: "#4338ca",
											fontSize: 13
										},
										children: [
											"محدد: ",
											libSelectedIds.size,
											" مصدر"
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { flex: 1 } }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										"data-testid": "lib-bulk-toggle-all",
										onClick: () => allFilteredSelected ? clearLibSelection() : selectAllFilteredLib(filteredIds),
										style: {
											padding: "6px 12px",
											borderRadius: 7,
											background: "white",
											color: "#4338ca",
											border: "0.5px solid #c7d2fe",
											cursor: "pointer",
											fontFamily: "inherit",
											fontSize: 12,
											fontWeight: 600
										},
										children: allFilteredSelected ? "إلغاء تحديد الكل" : `تحديد الكل (${filteredIds.length})`
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										"data-testid": "lib-bulk-clear",
										onClick: clearLibSelection,
										style: {
											padding: "6px 12px",
											borderRadius: 7,
											background: "white",
											color: "#475569",
											border: "0.5px solid #cbd5e1",
											cursor: "pointer",
											fontFamily: "inherit",
											fontSize: 12,
											fontWeight: 600
										},
										children: "مسح التحديد"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										"data-testid": "lib-bulk-delete",
										disabled: libBulkDeleting,
										onClick: () => setConfirmDialog({
											title: "تأكيد الحذف الجماعي",
											message: `هل تريد حذف ${libSelectedIds.size} مصدر؟\nلا يمكن التراجع عن هذا الإجراء.`,
											onConfirm: () => bulkDeleteSelectedLib()
										}),
										style: {
											padding: "7px 14px",
											borderRadius: 7,
											background: libBulkDeleting ? "#94a3b8" : "#dc2626",
											color: "white",
											border: "none",
											cursor: libBulkDeleting ? "not-allowed" : "pointer",
											fontFamily: "inherit",
											fontSize: 12,
											fontWeight: 700
										},
										children: libBulkDeleting ? "⏳ جاري الحذف..." : `🗑️ حذف المحدد (${libSelectedIds.size})`
									})
								]
							});
						})(),
						library.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								background: "white",
								borderRadius: 12,
								padding: 50,
								textAlign: "center",
								border: "0.5px solid #e2e8f0"
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										fontSize: 48,
										marginBottom: 12
									},
									children: "📚"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										fontWeight: 600,
										fontSize: 15,
										marginBottom: 6
									},
									children: "مكتبتك البحثية فارغة"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										color: "#64748b",
										fontSize: 13
									},
									children: "ارفع أول مصدر بحثي لتبدأ التحليل التلقائي"
								})
							]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							style: {
								display: "grid",
								gap: 10
							},
							children: filteredLib.map((src) => {
								const ch = CHAPTERS_DATA.find((c) => c.id === src.chapterId);
								const isAnalyzing = libAnalyzing === src.id;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										background: "white",
										borderRadius: 12,
										border: `0.5px solid ${libSelected?.id === src.id ? "#3B82F6" : "#e2e8f0"}`,
										overflow: "hidden"
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										onClick: () => setLibSelected(libSelected?.id === src.id ? null : src),
										style: {
											padding: "12px 16px",
											cursor: "pointer",
											display: "flex",
											gap: 10,
											alignItems: "flex-start"
										},
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "checkbox",
												"data-testid": `lib-card-checkbox-${src.id}`,
												checked: libSelectedIds.has(String(src.id)),
												onClick: (e) => e.stopPropagation(),
												onChange: () => toggleLibSelect(src.id),
												style: {
													marginTop: 8,
													cursor: "pointer",
													width: 16,
													height: 16,
													flexShrink: 0,
													accentColor: "#3B82F6"
												},
												"aria-label": "تحديد هذا المصدر"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												style: {
													fontSize: 28,
													flexShrink: 0
												},
												children: src.fileType === "pdf" ? "📕" : src.fileType === "url" ? "🌐" : src.fileType === "md" ? "📝" : "📄"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												style: {
													flex: 1,
													minWidth: 0
												},
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														style: {
															fontWeight: 600,
															fontSize: 13,
															marginBottom: 4
														},
														children: src.title || src.fileName
													}),
													(src.archiveRef || extractRefFromNotes(src.notes)) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														"data-testid": "lib-card-archive-ref",
														style: {
															fontSize: 11,
															fontFamily: "ui-monospace, Menlo, Consolas, monospace",
															color: "#334155",
															background: "#eef2ff",
															display: "inline-block",
															padding: "2px 8px",
															borderRadius: 5,
															marginBottom: 5,
															direction: "ltr"
														},
														children: ["📎 ", src.archiveRef || extractRefFromNotes(src.notes)]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														style: {
															display: "flex",
															gap: 6,
															flexWrap: "wrap",
															fontSize: 11,
															color: "#64748b"
														},
														children: [
															src.author && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["👤 ", src.author] }),
															src.year && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["📅 ", src.year] }),
															src.language && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["🌐 ", src.language] }),
															src.sourceType && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																"data-testid": "lib-card-source-type",
																style: {
																	background: "#f1f5f9",
																	borderRadius: 4,
																	padding: "1px 6px"
																},
																children: src.sourceType
															})
														]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														style: {
															display: "flex",
															gap: 6,
															marginTop: 4,
															flexWrap: "wrap"
														},
														children: [
															src.priority && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																style: {
																	background: src.priority === "★★★" ? "#dcfce7" : src.priority === "★★" ? "#fef9c3" : "#f1f5f9",
																	color: src.priority === "★★★" ? "#16a34a" : src.priority === "★★" ? "#ca8a04" : "#94a3b8",
																	borderRadius: 4,
																	padding: "1px 6px",
																	fontSize: 10,
																	fontWeight: 700
																},
																children: src.priority
															}),
															ch && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
																style: {
																	background: `${ch.color}15`,
																	color: ch.color,
																	borderRadius: 4,
																	padding: "1px 6px",
																	fontSize: 10
																},
																children: [
																	"ف",
																	src.chapterId,
																	": ",
																	ch.titleAr.split(":")[0]
																]
															}),
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																style: {
																	background: src.analyzed ? "#f0fdf4" : "#fff7ed",
																	color: src.analyzed ? "#16a34a" : "#f59e0b",
																	borderRadius: 4,
																	padding: "1px 6px",
																	fontSize: 10
																},
																children: isAnalyzing ? "⏳ جاري التحليل..." : src.status
															}),
															pendingLibIds.has(String(src.id)) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																"data-testid": "library-pending-badge",
																title: "لم يُحفظ في السحابة بعد — ستُعاد المحاولة تلقائياً",
																style: {
																	background: "#fef3c7",
																	color: "#b45309",
																	borderRadius: 4,
																	padding: "1px 6px",
																	fontSize: 10,
																	fontWeight: 700,
																	border: "1px solid #fde68a"
																},
																children: "⏳ لم يُحفظ سحابياً"
															})
														]
													})
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												style: {
													display: "flex",
													gap: 4,
													flexShrink: 0
												},
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													onClick: (e) => {
														e.stopPropagation();
														setConfirmDialog({
															title: "تأكيد الحذف",
															message: "هل أنت متأكد من حذف هذا المصدر؟\nلا يمكن التراجع عن هذا الإجراء.",
															onConfirm: () => deleteLibSrc(src.id)
														});
													},
													title: "حذف",
													style: {
														padding: "4px 8px",
														borderRadius: 6,
														background: "#fee2e2",
														color: "#dc2626",
														border: "none",
														cursor: "pointer",
														fontSize: 11
													},
													children: "🗑️"
												})
											})
										]
									}), libSelected?.id === src.id && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: {
											borderTop: "0.5px solid #f1f5f9",
											padding: "14px 16px",
											background: "#fafafa"
										},
										children: [isAnalyzing && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											style: {
												textAlign: "center",
												padding: 20,
												color: "#7C3AED"
											},
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												style: {
													fontSize: 28,
													marginBottom: 6
												},
												children: "🤖"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												style: { fontWeight: 500 },
												children: "جاري تحليل المصدر بالذكاء الاصطناعي..."
											})]
										}), !isAnalyzing && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											style: {
												display: "grid",
												gridTemplateColumns: "1fr 1fr",
												gap: 12
											},
											children: [
												(src.sectionName || src.subSectionName || src.classificationReason) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													style: {
														gridColumn: "1/-1",
														background: "#ecfeff",
														borderRadius: 8,
														padding: 12,
														border: "0.5px solid #a5f3fc"
													},
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
															style: {
																fontSize: 11,
																fontWeight: 600,
																color: "#0e7490",
																marginBottom: 6
															},
															children: "🎯 تصنيف الذكاء الاصطناعي"
														}),
														src.chapterName && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															style: {
																fontSize: 12,
																marginBottom: 3
															},
															children: [
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "الفصل:" }),
																" ",
																src.chapterName
															]
														}),
														src.sectionName && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															style: {
																fontSize: 12,
																marginBottom: 3
															},
															children: [
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "المبحث:" }),
																" ",
																src.sectionName
															]
														}),
														src.subSectionName && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															style: {
																fontSize: 12,
																marginBottom: 3
															},
															children: [
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "الفقرة:" }),
																" ",
																src.subSectionName
															]
														}),
														src.classificationReason && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															style: {
																fontSize: 11,
																color: "#475569",
																marginTop: 5
															},
															children: [
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "السبب:" }),
																" ",
																src.classificationReason
															]
														}),
														src.classificationConfidence && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															style: {
																fontSize: 10,
																color: "#0e7490",
																marginTop: 3
															},
															children: ["مستوى الثقة: ", src.classificationConfidence]
														})
													]
												}),
												src.summary && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													style: {
														gridColumn: "1/-1",
														background: "#eff6ff",
														borderRadius: 8,
														padding: 12,
														border: "0.5px solid #bfdbfe"
													},
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														style: {
															fontSize: 11,
															fontWeight: 600,
															color: "#3B82F6",
															marginBottom: 5
														},
														children: "📋 ملخص المصدر"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														style: {
															fontSize: 12,
															lineHeight: 1.8
														},
														children: src.summary
													})]
												}),
												src.whyImportant && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													style: {
														background: "#f0fdf4",
														borderRadius: 8,
														padding: 12,
														border: "0.5px solid #86efac"
													},
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														style: {
															fontSize: 11,
															fontWeight: 600,
															color: "#16a34a",
															marginBottom: 5
														},
														children: "⭐ لماذا مهم"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														style: {
															fontSize: 12,
															lineHeight: 1.7
														},
														children: src.whyImportant
													})]
												}),
												src.howToUse && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													style: {
														background: "#faf5ff",
														borderRadius: 8,
														padding: 12,
														border: "0.5px solid #e9d5ff"
													},
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														style: {
															fontSize: 11,
															fontWeight: 600,
															color: "#7C3AED",
															marginBottom: 5
														},
														children: "✍️ كيف تستخدمه"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														style: {
															fontSize: 12,
															lineHeight: 1.7
														},
														children: src.howToUse
													})]
												}),
												src.importantPages && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													style: {
														background: "#fffbeb",
														borderRadius: 8,
														padding: 12,
														border: "0.5px solid #fde68a"
													},
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														style: {
															fontSize: 11,
															fontWeight: 600,
															color: "#f59e0b",
															marginBottom: 5
														},
														children: "📄 الصفحات المهمة"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														style: {
															fontSize: 13,
															fontWeight: 600
														},
														children: src.importantPages
													})]
												}),
												src.sections?.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													style: {
														background: "#f8fafc",
														borderRadius: 8,
														padding: 12,
														border: "0.5px solid #e2e8f0"
													},
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														style: {
															fontSize: 11,
															fontWeight: 600,
															color: "#475569",
															marginBottom: 5
														},
														children: "📌 المباحث ذات الصلة"
													}), src.sections.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														style: {
															fontSize: 11,
															padding: "2px 0",
															color: "#64748b"
														},
														children: ["• ", s]
													}, i))]
												}),
												src.keywords?.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													style: { gridColumn: "1/-1" },
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														style: {
															fontSize: 11,
															fontWeight: 600,
															color: "#475569",
															marginBottom: 5
														},
														children: "🔑 الكلمات المفتاحية"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														style: {
															display: "flex",
															flexWrap: "wrap",
															gap: 4
														},
														children: src.keywords.map((k, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															style: {
																background: "#f1f5f9",
																borderRadius: 5,
																padding: "2px 8px",
																fontSize: 11
															},
															children: k
														}, i))
													})]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													style: {
														gridColumn: "1/-1",
														background: "white",
														borderRadius: 8,
														padding: 12,
														border: "0.5px solid #e2e8f0"
													},
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
															style: {
																fontSize: 11,
																fontWeight: 600,
																color: "#475569",
																marginBottom: 8
															},
															children: "✏️ تعديل يدوي"
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															style: {
																display: "grid",
																gridTemplateColumns: "1fr 1fr",
																gap: 8
															},
															children: [
																/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
																	style: {
																		fontSize: 10,
																		color: "#94a3b8",
																		display: "block",
																		marginBottom: 3
																	},
																	children: "الفصل"
																}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
																	value: src.chapterId || "",
																	onChange: (e) => updateLibSrc(src.id, { chapterId: e.target.value ? parseInt(e.target.value) : null }),
																	style: {
																		width: "100%",
																		padding: "5px 8px",
																		borderRadius: 6,
																		border: "0.5px solid #cbd5e1",
																		fontSize: 11,
																		fontFamily: "inherit"
																	},
																	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
																		value: "",
																		children: "اختر فصلاً"
																	}), CHAPTERS_DATA.map((ch) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
																		value: ch.id,
																		children: ch.titleAr.split(":")[0]
																	}, ch.id))]
																})] }),
																/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
																	style: {
																		fontSize: 10,
																		color: "#94a3b8",
																		display: "block",
																		marginBottom: 3
																	},
																	children: "الأولوية"
																}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
																	value: src.priority || "★★",
																	onChange: (e) => updateLibSrc(src.id, { priority: e.target.value }),
																	style: {
																		width: "100%",
																		padding: "5px 8px",
																		borderRadius: 6,
																		border: "0.5px solid #cbd5e1",
																		fontSize: 11,
																		fontFamily: "inherit"
																	},
																	children: [
																		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
																			value: "★★★",
																			children: "★★★ عالية — اقرأه كاملاً"
																		}),
																		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
																			value: "★★",
																			children: "★★ متوسطة — صفحات محددة"
																		}),
																		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
																			value: "★",
																			children: "★ منخفضة — احفظ المرجع"
																		})
																	]
																})] }),
																/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
																	style: {
																		fontSize: 10,
																		color: "#94a3b8",
																		display: "block",
																		marginBottom: 3
																	},
																	children: "الصفحات المهمة"
																}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
																	value: src.importantPages || "",
																	onChange: (e) => updateLibSrc(src.id, { importantPages: e.target.value }),
																	placeholder: "مثال: 45-67، 102، 230",
																	style: {
																		width: "100%",
																		padding: "5px 8px",
																		borderRadius: 6,
																		border: "0.5px solid #cbd5e1",
																		fontSize: 11,
																		fontFamily: "inherit",
																		boxSizing: "border-box"
																	}
																})] }),
																/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
																	style: {
																		fontSize: 10,
																		color: "#94a3b8",
																		display: "block",
																		marginBottom: 3
																	},
																	children: "نوع المصدر"
																}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
																	value: src.sourceType || "",
																	onChange: (e) => updateLibSrc(src.id, { sourceType: e.target.value }),
																	style: {
																		width: "100%",
																		padding: "5px 8px",
																		borderRadius: 6,
																		border: "0.5px solid #cbd5e1",
																		fontSize: 11,
																		fontFamily: "inherit"
																	},
																	children: [
																		"كتاب عربي",
																		"كتاب أجنبي",
																		"رسالة ماجستير",
																		"أطروحة دكتوراه",
																		"بحث علمي",
																		"مجلة علمية",
																		"مؤتمر علمي",
																		"صحيفة",
																		"موقع إلكتروني",
																		"موسوعة",
																		"وثيقة أرشيفية",
																		"تقرير رسمي",
																		"مصدر أولي"
																	].map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
																		value: t,
																		children: t
																	}, t))
																})] }),
																/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
																	style: { gridColumn: "1/-1" },
																	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
																		style: {
																			fontSize: 10,
																			color: "#94a3b8",
																			display: "block",
																			marginBottom: 3
																		},
																		children: "ملاحظات إضافية"
																	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
																		value: src.howToUse || "",
																		onChange: (e) => updateLibSrc(src.id, { howToUse: e.target.value }),
																		rows: 2,
																		style: {
																			width: "100%",
																			padding: "5px 8px",
																			borderRadius: 6,
																			border: "0.5px solid #cbd5e1",
																			fontSize: 11,
																			fontFamily: "inherit",
																			resize: "vertical",
																			boxSizing: "border-box"
																		}
																	})]
																})
															]
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
															onClick: () => showNotif("✅ تم حفظ التعديلات"),
															style: {
																marginTop: 8,
																padding: "6px 14px",
																borderRadius: 7,
																background: "#3B82F6",
																color: "white",
																border: "none",
																cursor: "pointer",
																fontFamily: "inherit",
																fontSize: 11
															},
															children: "حفظ التعديلات"
														})
													]
												})
											]
										})]
									})]
								}, src.id);
							})
						})
					] }),
					page === "cards" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								justifyContent: "space-between",
								alignItems: "flex-start",
								marginBottom: 20,
								flexWrap: "wrap",
								gap: 12
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								style: {
									fontSize: 20,
									fontWeight: 700,
									marginBottom: 4
								},
								children: "🗃️ بطاقات وجذاذات المباحث"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								style: {
									color: "#64748b",
									fontSize: 12
								},
								children: "بطاقات بحثية ذكية تجمع الاقتباسات والشواهد المصدرية حول حدث أو موضوع تاريخي محدد"
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => {
									setShowCardForm(true);
									setCardAiResult("");
									setCardForm({
										title: "",
										topic: "",
										date: "",
										chapterId: "",
										sectionId: "",
										tags: "",
										notes: ""
									});
								},
								style: {
									padding: "9px 18px",
									borderRadius: 8,
									background: "#1e3a5f",
									color: "white",
									border: "none",
									cursor: "pointer",
									fontFamily: "inherit",
									fontSize: 13,
									fontWeight: 600
								},
								children: "＋ بطاقة جديدة"
							})]
						}),
						showCardForm && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								background: "white",
								borderRadius: 14,
								border: "2px solid #1e3a5f",
								padding: 22,
								marginBottom: 20
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
										marginBottom: 16
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											fontWeight: 700,
											fontSize: 15,
											color: "#1e3a5f"
										},
										children: "🗃️ إنشاء بطاقة بحثية جديدة"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => setShowCardForm(false),
										style: {
											background: "#f1f5f9",
											border: "none",
											borderRadius: 7,
											padding: "4px 10px",
											cursor: "pointer",
											fontSize: 12,
											color: "#64748b",
											fontFamily: "inherit"
										},
										children: "إغلاق"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										display: "grid",
										gridTemplateColumns: "1fr 1fr",
										gap: 12,
										marginBottom: 14
									},
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											style: { gridColumn: "1/-1" },
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
												style: {
													fontSize: 11,
													color: "#64748b",
													display: "block",
													marginBottom: 4,
													fontWeight: 500
												},
												children: "عنوان البطاقة / الجذاذة *"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												value: cardForm.title,
												onChange: (e) => setCardForm((p) => ({
													...p,
													title: e.target.value
												})),
												placeholder: "مثال: أزمة التموين والإعاشة عام 1942 في البحرين",
												style: {
													width: "100%",
													padding: "9px 12px",
													borderRadius: 8,
													border: "1.5px solid #cbd5e1",
													fontSize: 13,
													fontFamily: "inherit",
													boxSizing: "border-box"
												}
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
											style: {
												fontSize: 11,
												color: "#64748b",
												display: "block",
												marginBottom: 4,
												fontWeight: 500
											},
											children: "الموضوع / الكلمة المفتاحية"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											value: cardForm.topic,
											onChange: (e) => setCardForm((p) => ({
												...p,
												topic: e.target.value
											})),
											placeholder: "مثال: تموين، إعاشة، حصار، نفط...",
											style: {
												width: "100%",
												padding: "8px 12px",
												borderRadius: 8,
												border: "0.5px solid #cbd5e1",
												fontSize: 12,
												fontFamily: "inherit",
												boxSizing: "border-box"
											}
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
											style: {
												fontSize: 11,
												color: "#64748b",
												display: "block",
												marginBottom: 4,
												fontWeight: 500
											},
											children: "التاريخ / الحقبة"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											value: cardForm.date,
											onChange: (e) => setCardForm((p) => ({
												...p,
												date: e.target.value
											})),
											placeholder: "مثال: 1942 أو 1939-1945",
											style: {
												width: "100%",
												padding: "8px 12px",
												borderRadius: 8,
												border: "0.5px solid #cbd5e1",
												fontSize: 12,
												fontFamily: "inherit",
												boxSizing: "border-box"
											}
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
											style: {
												fontSize: 11,
												color: "#64748b",
												display: "block",
												marginBottom: 4,
												fontWeight: 500
											},
											children: "الفصل المرتبط"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
											value: cardForm.chapterId,
											onChange: (e) => setCardForm((p) => ({
												...p,
												chapterId: e.target.value,
												sectionId: ""
											})),
											style: {
												width: "100%",
												padding: "8px 10px",
												borderRadius: 8,
												border: "0.5px solid #cbd5e1",
												fontSize: 12,
												fontFamily: "inherit"
											},
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "",
												children: "كل الفصول"
											}), chapters.map((ch) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: ch.id,
												children: ch.titleAr.split(":")[0]
											}, ch.id))]
										})] }),
										cardForm.chapterId && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
											style: {
												fontSize: 11,
												color: "#64748b",
												display: "block",
												marginBottom: 4,
												fontWeight: 500
											},
											children: "المبحث"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
											value: cardForm.sectionId,
											onChange: (e) => setCardForm((p) => ({
												...p,
												sectionId: e.target.value
											})),
											style: {
												width: "100%",
												padding: "8px 10px",
												borderRadius: 8,
												border: "0.5px solid #cbd5e1",
												fontSize: 12,
												fontFamily: "inherit"
											},
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "",
												children: "اختر مبحثاً"
											}), (chapters.find((c) => c.id === parseInt(cardForm.chapterId))?.sections || []).filter((s) => !s.id.includes("a") && !s.id.includes("b") && !s.id.includes("c")).map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: s.id,
												children: s.title
											}, s.id))]
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											style: { gridColumn: "1/-1" },
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
												style: {
													fontSize: 11,
													color: "#64748b",
													display: "block",
													marginBottom: 4,
													fontWeight: 500
												},
												children: "وسوم التصنيف (افصل بـ ،)"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												value: cardForm.tags,
												onChange: (e) => setCardForm((p) => ({
													...p,
													tags: e.target.value
												})),
												placeholder: "مثال: نفط، بريطانيا، استراتيجية، البحرين",
												style: {
													width: "100%",
													padding: "8px 12px",
													borderRadius: 8,
													border: "0.5px solid #cbd5e1",
													fontSize: 12,
													fontFamily: "inherit",
													boxSizing: "border-box"
												}
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											style: { gridColumn: "1/-1" },
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
												style: {
													fontSize: 11,
													color: "#64748b",
													display: "block",
													marginBottom: 4,
													fontWeight: 500
												},
												children: "ملاحظات أو اقتباسات أولية"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
												value: cardForm.notes,
												onChange: (e) => setCardForm((p) => ({
													...p,
													notes: e.target.value
												})),
												placeholder: "أي ملاحظات أو اقتباسات أولية تريد إضافتها للبطاقة...",
												rows: 3,
												style: {
													width: "100%",
													padding: "8px 12px",
													borderRadius: 8,
													border: "0.5px solid #cbd5e1",
													fontSize: 12,
													fontFamily: "inherit",
													resize: "vertical",
													boxSizing: "border-box"
												}
											})]
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										gap: 10,
										flexWrap: "wrap"
									},
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: generateSmartCard,
											disabled: cardAiLoading || !cardForm.title.trim(),
											style: {
												padding: "9px 20px",
												borderRadius: 8,
												background: "#7C3AED",
												color: "white",
												border: "none",
												cursor: "pointer",
												fontFamily: "inherit",
												fontSize: 13,
												fontWeight: 600
											},
											children: cardAiLoading ? "⏳ جاري التوليد الذكي..." : "🤖 توليد البطاقة بالذكاء الاصطناعي"
										}),
										cardAiResult && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: saveCard,
											style: {
												padding: "9px 18px",
												borderRadius: 8,
												background: "#10B981",
												color: "white",
												border: "none",
												cursor: "pointer",
												fontFamily: "inherit",
												fontSize: 13,
												fontWeight: 600
											},
											children: "💾 حفظ البطاقة"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: saveCard,
											style: {
												padding: "9px 16px",
												borderRadius: 8,
												background: "transparent",
												border: "0.5px solid #cbd5e1",
												cursor: "pointer",
												fontFamily: "inherit",
												fontSize: 13
											},
											children: "حفظ بدون ذكاء اصطناعي"
										})
									]
								}),
								cardAiLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										marginTop: 16,
										background: "#faf5ff",
										borderRadius: 10,
										padding: 24,
										textAlign: "center",
										border: "0.5px solid #d8b4fe"
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											fontSize: 36,
											marginBottom: 8
										},
										children: "🤖"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											color: "#7C3AED",
											fontWeight: 500
										},
										children: "جاري تجميع المصادر وصياغة البطاقة التاريخية..."
									})]
								}),
								cardAiResult && !cardAiLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										marginTop: 16,
										background: "#faf5ff",
										borderRadius: 10,
										padding: 18,
										border: "0.5px solid #d8b4fe"
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											fontWeight: 600,
											color: "#7C3AED",
											marginBottom: 10,
											fontSize: 13
										},
										children: "🤖 محتوى البطاقة المُولَّد — راجعه ثم احفظ"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
										style: {
											whiteSpace: "pre-wrap",
											fontFamily: "inherit",
											fontSize: 12,
											lineHeight: 1.9,
											margin: 0,
											color: "#1e293b"
										},
										children: cardAiResult
									})]
								})
							]
						}),
						cards.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								background: "white",
								borderRadius: 10,
								padding: 12,
								border: "0.5px solid #e2e8f0",
								marginBottom: 14,
								display: "flex",
								gap: 10,
								flexWrap: "wrap",
								alignItems: "center"
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									placeholder: "ابحث في البطاقات...",
									value: cardSearchQ,
									onChange: (e) => setCardSearchQ(e.target.value),
									style: {
										flex: 1,
										minWidth: 180,
										padding: "7px 12px",
										borderRadius: 7,
										border: "0.5px solid #cbd5e1",
										fontSize: 12,
										fontFamily: "inherit"
									}
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									value: cardFilterCh,
									onChange: (e) => setCardFilterCh(e.target.value),
									style: {
										padding: "7px 10px",
										borderRadius: 7,
										border: "0.5px solid #cbd5e1",
										fontSize: 11,
										fontFamily: "inherit"
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "",
										children: "كل الفصول"
									}), chapters.map((ch) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: ch.id,
										children: ch.titleAr.split(":")[0]
									}, ch.id))]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									style: {
										fontSize: 12,
										color: "#64748b"
									},
									children: [filteredCards.length, " بطاقة"]
								})
							]
						}),
						cards.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								background: "white",
								borderRadius: 12,
								padding: 50,
								textAlign: "center",
								border: "0.5px solid #e2e8f0"
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										fontSize: 48,
										marginBottom: 12
									},
									children: "🗃️"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										fontWeight: 600,
										fontSize: 15,
										marginBottom: 6
									},
									children: "لا توجد بطاقات بعد"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										color: "#64748b",
										fontSize: 13,
										marginBottom: 16
									},
									children: "أنشئ بطاقتك الأولى لتجميع الشواهد التاريخية حول موضوع محدد"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => {
										setShowCardForm(true);
										setCardAiResult("");
									},
									style: {
										padding: "9px 20px",
										borderRadius: 8,
										background: "#1e3a5f",
										color: "white",
										border: "none",
										cursor: "pointer",
										fontFamily: "inherit",
										fontSize: 13
									},
									children: "＋ إنشاء أول بطاقة"
								})
							]
						}) : cardView === "detail" && selectedCard ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => {
								setCardView("grid");
								setSelectedCard(null);
							},
							style: {
								marginBottom: 14,
								padding: "7px 14px",
								borderRadius: 8,
								border: "0.5px solid #cbd5e1",
								background: "transparent",
								cursor: "pointer",
								fontFamily: "inherit",
								fontSize: 12
							},
							children: "← العودة لشبكة البطاقات"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								background: "white",
								borderRadius: 14,
								border: "0.5px solid #e2e8f0",
								overflow: "hidden"
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									background: "linear-gradient(135deg,#1e3a5f,#2d5a8e)",
									color: "white",
									padding: "18px 22px"
								},
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											fontWeight: 700,
											fontSize: 17,
											marginBottom: 6
										},
										children: selectedCard.title
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: {
											display: "flex",
											gap: 10,
											flexWrap: "wrap",
											fontSize: 11,
											opacity: .85
										},
										children: [
											selectedCard.date && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["📅 ", selectedCard.date] }),
											selectedCard.topic && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["🔍 ", selectedCard.topic] }),
											selectedCard.chapterId && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["📖 ", chapters.find((c) => c.id === selectedCard.chapterId)?.titleAr?.split(":")[0]] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["📆 أُنشئت: ", selectedCard.createdAt] })
										]
									}),
									selectedCard.tags?.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											marginTop: 8,
											display: "flex",
											gap: 4,
											flexWrap: "wrap"
										},
										children: selectedCard.tags.map((t, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											style: {
												background: "rgba(255,255,255,0.2)",
												borderRadius: 4,
												padding: "1px 8px",
												fontSize: 11
											},
											children: ["#", t]
										}, i))
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: { padding: "18px 22px" },
								children: [
									selectedCard.notes && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: {
											background: "#fffbeb",
											borderRadius: 9,
											padding: 14,
											marginBottom: 16,
											border: "0.5px solid #fde68a"
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												fontSize: 11,
												fontWeight: 600,
												color: "#92400e",
												marginBottom: 6
											},
											children: "📝 ملاحظات وجذاذات أولية"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												fontSize: 13,
												lineHeight: 1.8,
												color: "#1e293b"
											},
											children: selectedCard.notes
										})]
									}),
									selectedCard.aiContent && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: {
											background: "#faf5ff",
											borderRadius: 9,
											padding: 16,
											marginBottom: 16,
											border: "0.5px solid #d8b4fe"
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												fontWeight: 600,
												color: "#7C3AED",
												marginBottom: 10,
												fontSize: 13
											},
											children: "🤖 التحليل والسياق التاريخي المُولَّد"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
											style: {
												whiteSpace: "pre-wrap",
												fontFamily: "inherit",
												fontSize: 13,
												lineHeight: 1.9,
												margin: 0
											},
											children: selectedCard.aiContent
										})]
									}),
									selectedCard.relatedDocIds?.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: {
											fontWeight: 600,
											fontSize: 13,
											marginBottom: 10,
											color: "#475569"
										},
										children: [
											"📄 الوثائق الأرشيفية المرتبطة (",
											selectedCard.relatedDocIds.length,
											")"
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											display: "grid",
											gap: 6
										},
										children: selectedCard.relatedDocIds.map((dId) => {
											const d = docs.find((doc) => doc.id === dId);
											if (!d) return null;
											return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												style: {
													display: "flex",
													gap: 8,
													padding: "8px 12px",
													background: "#f8fafc",
													borderRadius: 7,
													border: "0.5px solid #e2e8f0",
													alignItems: "flex-start"
												},
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														style: {
															background: pBg(d.priority),
															color: pColor(d.priority),
															borderRadius: 4,
															padding: "1px 5px",
															fontSize: 9,
															fontWeight: 700,
															flexShrink: 0,
															marginTop: 2
														},
														children: d.priority
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														style: {
															flex: 1,
															minWidth: 0
														},
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
															style: {
																fontSize: 12,
																fontWeight: 500,
																overflow: "hidden",
																textOverflow: "ellipsis",
																whiteSpace: "nowrap"
															},
															children: d.title
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
															style: {
																fontSize: 10,
																color: "#8B5CF6",
																fontFamily: "monospace"
															},
															children: d.archiveRef
														})]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														onClick: () => openFootnoteModal(d),
														style: {
															padding: "3px 8px",
															borderRadius: 5,
															background: "#faf5ff",
															border: "0.5px solid #d8b4fe",
															color: "#7C3AED",
															cursor: "pointer",
															fontSize: 10,
															fontFamily: "inherit",
															flexShrink: 0
														},
														children: "📝 هامش"
													})
												]
											}, dId);
										})
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: {
											display: "flex",
											gap: 8,
											marginTop: 16,
											flexWrap: "wrap"
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => {
												navigator.clipboard.writeText(`${selectedCard.title}\n\n${selectedCard.aiContent || ""}\n\n${selectedCard.notes || ""}`).then(() => showNotif("✅ تم نسخ محتوى البطاقة"));
											},
											style: {
												padding: "7px 16px",
												borderRadius: 8,
												background: "#eff6ff",
												color: "#3B82F6",
												border: "0.5px solid #bfdbfe",
												cursor: "pointer",
												fontFamily: "inherit",
												fontSize: 12
											},
											children: "📋 نسخ المحتوى"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => deleteCard(selectedCard.id),
											style: {
												padding: "7px 14px",
												borderRadius: 8,
												background: "#fee2e2",
												color: "#dc2626",
												border: "none",
												cursor: "pointer",
												fontFamily: "inherit",
												fontSize: 12
											},
											children: "🗑️ حذف البطاقة"
										})]
									})
								]
							})]
						})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							style: {
								display: "grid",
								gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))",
								gap: 16
							},
							children: filteredCards.map((card) => {
								const ch = chapters.find((c) => c.id === card.chapterId);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										background: "white",
										borderRadius: 12,
										border: "0.5px solid #e2e8f0",
										overflow: "hidden",
										cursor: "pointer",
										transition: "all 0.2s",
										boxShadow: "0 1px 4px rgba(0,0,0,0.04)"
									},
									onMouseEnter: (e) => {
										e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)";
										e.currentTarget.style.transform = "translateY(-2px)";
									},
									onMouseLeave: (e) => {
										e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)";
										e.currentTarget.style.transform = "translateY(0)";
									},
									onClick: () => {
										setSelectedCard(card);
										setCardView("detail");
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: {
										height: 4,
										background: ch?.color || "#94a3b8"
									} }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: { padding: "14px 16px" },
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												style: {
													fontWeight: 700,
													fontSize: 14,
													marginBottom: 6,
													color: "#1e293b",
													lineHeight: 1.4
												},
												children: card.title
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												style: {
													display: "flex",
													gap: 6,
													flexWrap: "wrap",
													marginBottom: 8,
													fontSize: 11,
													color: "#64748b"
												},
												children: [
													card.date && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														style: {
															background: "#f1f5f9",
															borderRadius: 4,
															padding: "1px 6px"
														},
														children: ["📅 ", card.date]
													}),
													card.topic && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														style: {
															background: "#f1f5f9",
															borderRadius: 4,
															padding: "1px 6px"
														},
														children: ["🔍 ", card.topic]
													}),
													ch && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														style: {
															background: `${ch.color}15`,
															color: ch.color,
															borderRadius: 4,
															padding: "1px 6px"
														},
														children: ch.titleAr.split(":")[0]
													})
												]
											}),
											card.tags?.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												style: {
													display: "flex",
													gap: 3,
													flexWrap: "wrap",
													marginBottom: 8
												},
												children: [card.tags.slice(0, 4).map((t, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													style: {
														background: "#eff6ff",
														color: "#3B82F6",
														borderRadius: 4,
														padding: "1px 7px",
														fontSize: 10
													},
													children: ["#", t]
												}, i)), card.tags.length > 4 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													style: {
														fontSize: 10,
														color: "#94a3b8"
													},
													children: ["+", card.tags.length - 4]
												})]
											}),
											(card.aiContent || card.notes) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												style: {
													fontSize: 11,
													color: "#64748b",
													lineHeight: 1.6,
													overflow: "hidden",
													display: "-webkit-box",
													WebkitLineClamp: 3,
													WebkitBoxOrient: "vertical"
												},
												children: [(card.aiContent || card.notes).substring(0, 150), "..."]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												style: {
													display: "flex",
													justifyContent: "space-between",
													alignItems: "center",
													marginTop: 10,
													paddingTop: 10,
													borderTop: "0.5px solid #f1f5f9"
												},
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													style: {
														fontSize: 10,
														color: "#94a3b8"
													},
													children: [
														"📄 ",
														card.relatedDocIds?.length || 0,
														" وثيقة مرتبطة"
													]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													style: {
														display: "flex",
														gap: 4
													},
													children: [card.aiContent && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														style: {
															fontSize: 10,
															background: "#faf5ff",
															color: "#7C3AED",
															borderRadius: 4,
															padding: "1px 6px"
														},
														children: "🤖 AI"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														style: {
															fontSize: 10,
															color: "#94a3b8"
														},
														children: card.createdAt
													})]
												})]
											})
										]
									})]
								}, card.id);
							})
						})
					] }),
					page === "translator" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: { marginBottom: 20 },
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								style: {
									fontSize: 20,
									fontWeight: 700,
									marginBottom: 4
								},
								children: "🌐 مستعرض وترجمة الوثائق الأجنبية"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								style: {
									color: "#64748b",
									fontSize: 12
								},
								children: "ترجمة فورية للوثائق الأجنبية (إنجليزية/فرنسية/ألمانية) إلى العربية التاريخية الرصينة مع استخراج النقاط الجوهرية"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: 16,
								marginBottom: 16
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									background: "white",
									borderRadius: 12,
									padding: 18,
									border: "0.5px solid #e2e8f0",
									marginBottom: 12
								},
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											fontWeight: 600,
											fontSize: 13,
											marginBottom: 12,
											color: "#1e293b"
										},
										children: "📂 رفع الوثيقة الأجنبية"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: {
											border: "2px dashed #bfdbfe",
											borderRadius: 10,
											padding: "20px 14px",
											textAlign: "center",
											cursor: "pointer",
											marginBottom: 12,
											background: "#f8fafc"
										},
										onClick: () => translatorFileRef.current?.click(),
										onDragOver: (e) => {
											e.preventDefault();
											e.currentTarget.style.borderColor = "#3B82F6";
										},
										onDragLeave: (e) => {
											e.currentTarget.style.borderColor = "#bfdbfe";
										},
										onDrop: (e) => {
											e.preventDefault();
											e.currentTarget.style.borderColor = "#bfdbfe";
											handleTranslatorFileUpload(e.dataTransfer.files[0]);
										},
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												ref: translatorFileRef,
												type: "file",
												accept: ".txt,.md,.pdf,.jpg,.jpeg,.png,.webp",
												style: { display: "none" },
												onChange: (e) => handleTranslatorFileUpload(e.target.files[0])
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												style: {
													fontSize: 28,
													marginBottom: 6
												},
												children: "📄"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												style: {
													fontSize: 12,
													fontWeight: 500,
													color: "#3B82F6",
													marginBottom: 3
												},
												children: translatorFileName ? `✅ ${translatorFileName}` : "اسحب ملف TXT / MD / PDF / صورة هنا أو اضغط للاختيار"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												style: {
													fontSize: 10,
													color: "#94a3b8"
												},
												children: "PDF نصي يُستخرج تلقائياً • PDF ممسوح + صور (JPG/PNG/WEBP) عبر OCR بالذكاء الاصطناعي"
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: { marginBottom: 10 },
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
											style: {
												fontSize: 11,
												color: "#64748b",
												display: "block",
												marginBottom: 4,
												fontWeight: 500
											},
											children: "لغة الوثيقة الأصلية"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
											value: translatorLang,
											onChange: (e) => setTranslatorLang(e.target.value),
											style: {
												width: "100%",
												padding: "7px 10px",
												borderRadius: 7,
												border: "0.5px solid #cbd5e1",
												fontSize: 12,
												fontFamily: "inherit"
											},
											children: [
												"إنجليزية",
												"فرنسية",
												"ألمانية",
												"إيطالية",
												"روسية",
												"فارسية",
												"عثمانية"
											].map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: l,
												children: l
											}, l))
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: { marginBottom: 12 },
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
												style: {
													fontSize: 11,
													color: "#64748b",
													display: "block",
													marginBottom: 4,
													fontWeight: 500
												},
												children: "النص الأجنبي (الصق هنا أو ارفع ملفاً)"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
												value: translatorText,
												onChange: (e) => setTranslatorText(e.target.value),
												placeholder: "الصق هنا نص الوثيقة الأجنبية (من PDF أو أي مصدر)...",
												rows: 10,
												style: {
													width: "100%",
													padding: "9px 12px",
													borderRadius: 8,
													border: "0.5px solid #cbd5e1",
													fontSize: 12,
													fontFamily: "'Courier New',monospace",
													resize: "vertical",
													boxSizing: "border-box",
													direction: "ltr",
													lineHeight: 1.7
												}
											}),
											translatorText && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												style: {
													fontSize: 10,
													color: "#94a3b8",
													marginTop: 3
												},
												children: [
													translatorText.length,
													" حرف (",
													Math.ceil(translatorText.split(/\s+/).length),
													" كلمة)",
													translatorText.length > 4e3 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														style: { color: "#f59e0b" },
														children: " — سيُترجم أول 4000 حرف فقط"
													})
												]
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: runTranslation,
										disabled: translatorLoading || !translatorText.trim(),
										style: {
											width: "100%",
											padding: "10px",
											borderRadius: 8,
											background: translatorLoading || !translatorText.trim() ? "#94a3b8" : "#1e3a5f",
											color: "white",
											border: "none",
											cursor: translatorLoading || !translatorText.trim() ? "not-allowed" : "pointer",
											fontFamily: "inherit",
											fontSize: 13,
											fontWeight: 600
										},
										children: translatorLoading ? "⏳ جاري الترجمة والتحليل..." : "🌐 ترجمة وتكشيف الوثيقة"
									})
								]
							}), translatorDocMeta && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									background: "white",
									borderRadius: 12,
									padding: 16,
									border: "0.5px solid #e2e8f0"
								},
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											fontWeight: 600,
											fontSize: 12,
											marginBottom: 10,
											color: "#475569"
										},
										children: "📋 بيانات الوثيقة المستنتجة تلقائياً"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											display: "grid",
											gap: 6
										},
										children: [
											{
												label: "العنوان المستنتج",
												value: translatorDocMeta.estimatedTitle
											},
											{
												label: "المؤلف / الجهة",
												value: translatorDocMeta.author
											},
											{
												label: "التاريخ",
												value: translatorDocMeta.date
											},
											{
												label: "نوع الوثيقة",
												value: translatorDocMeta.docType
											},
											{
												label: "الفصل المقترح",
												value: translatorDocMeta.suggestedChapter
											}
										].map((f) => f.value && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											style: {
												display: "flex",
												gap: 6
											},
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												style: {
													fontSize: 10,
													color: "#94a3b8",
													minWidth: 100,
													flexShrink: 0
												},
												children: f.label
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												style: {
													fontSize: 12,
													fontWeight: 500,
													flex: 1
												},
												children: f.value
											})]
										}, f.label))
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: {
											display: "flex",
											gap: 8,
											marginTop: 12
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: saveTranslation,
											style: {
												padding: "6px 14px",
												borderRadius: 7,
												background: "#10B981",
												color: "white",
												border: "none",
												cursor: "pointer",
												fontFamily: "inherit",
												fontSize: 12
											},
											children: "💾 حفظ في سجل الترجمات"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => {
												setAddForm((p) => ({
													...p,
													title: translatorDocMeta.estimatedTitle || "",
													author: translatorDocMeta.author || "",
													year: translatorDocMeta.date || "",
													notes: translatorText.substring(0, 200)
												}));
												setPage("add");
												showNotif("تم نقل البيانات لنموذج الإضافة — أكمل البيانات");
											},
											style: {
												padding: "6px 14px",
												borderRadius: 7,
												background: "#eff6ff",
												color: "#3B82F6",
												border: "0.5px solid #bfdbfe",
												cursor: "pointer",
												fontFamily: "inherit",
												fontSize: 12
											},
											children: "➕ إضافة للأرشيف"
										})]
									})
								]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								translatorLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										background: "white",
										borderRadius: 12,
										padding: 40,
										border: "0.5px solid #e2e8f0",
										textAlign: "center"
									},
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												fontSize: 40,
												marginBottom: 12
											},
											children: "🌐"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												fontWeight: 600,
												color: "#1e3a5f",
												marginBottom: 6
											},
											children: "جاري الترجمة..."
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												fontSize: 12,
												color: "#64748b"
											},
											children: "يترجم النص ويستخرج النقاط الجوهرية بلغة تاريخية رصينة"
										})
									]
								}),
								translatedResult && !translatorLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										background: "white",
										borderRadius: 12,
										border: "0.5px solid #e2e8f0",
										marginBottom: 14,
										overflow: "hidden"
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: {
											background: "#1e3a5f",
											color: "white",
											padding: "10px 16px",
											display: "flex",
											justifyContent: "space-between",
											alignItems: "center"
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												fontWeight: 600,
												fontSize: 13
											},
											children: "🌐 الترجمة العربية الرصينة"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => {
												navigator.clipboard.writeText(translatedResult).then(() => showNotif("✅ تم نسخ الترجمة"));
											},
											style: {
												padding: "3px 10px",
												borderRadius: 5,
												background: "rgba(255,255,255,0.2)",
												border: "none",
												color: "white",
												cursor: "pointer",
												fontSize: 11,
												fontFamily: "inherit"
											},
											children: "📋 نسخ"
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											padding: 16,
											maxHeight: 320,
											overflowY: "auto"
										},
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											style: {
												fontSize: 13,
												lineHeight: 2,
												color: "#1e293b",
												margin: 0,
												direction: "rtl"
											},
											children: translatedResult
										})
									})]
								}),
								keyPoints.length > 0 && !translatorLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										background: "white",
										borderRadius: 12,
										border: "0.5px solid #e2e8f0",
										overflow: "hidden"
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: {
											background: "#7C3AED",
											color: "white",
											padding: "10px 16px",
											display: "flex",
											justifyContent: "space-between",
											alignItems: "center"
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												fontWeight: 600,
												fontSize: 13
											},
											children: "⭐ النقاط الجوهرية والأفكار المفتاحية"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => {
												const text = keyPoints.map((p, i) => `${i + 1}. [${p.importance}] ${p.point}\n   الفصل: ${p.chapter}`).join("\n\n");
												navigator.clipboard.writeText(text).then(() => showNotif("✅ تم نسخ النقاط"));
											},
											style: {
												padding: "3px 10px",
												borderRadius: 5,
												background: "rgba(255,255,255,0.2)",
												border: "none",
												color: "white",
												cursor: "pointer",
												fontSize: 11,
												fontFamily: "inherit"
											},
											children: "📋 نسخ"
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: { padding: 14 },
										children: keyPoints.map((kp, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											style: {
												display: "flex",
												gap: 10,
												padding: "10px 0",
												borderBottom: i < keyPoints.length - 1 ? "0.5px solid #f1f5f9" : "none",
												alignItems: "flex-start"
											},
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												style: {
													background: pBg(kp.importance),
													color: pColor(kp.importance),
													borderRadius: 5,
													padding: "2px 7px",
													fontSize: 10,
													fontWeight: 700,
													flexShrink: 0,
													minWidth: 28,
													textAlign: "center"
												},
												children: kp.rank
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												style: { flex: 1 },
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													style: {
														fontSize: 13,
														fontWeight: 500,
														lineHeight: 1.6,
														marginBottom: 3
													},
													children: kp.point
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													style: {
														display: "flex",
														gap: 6,
														alignItems: "center"
													},
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														style: {
															fontSize: 10,
															background: "#eff6ff",
															color: "#3B82F6",
															borderRadius: 4,
															padding: "1px 6px"
														},
														children: ["📖 ", kp.chapter]
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														style: {
															background: pBg(kp.importance),
															color: pColor(kp.importance),
															borderRadius: 4,
															padding: "1px 6px",
															fontSize: 10,
															fontWeight: 600
														},
														children: kp.importance
													})]
												})]
											})]
										}, i))
									})]
								}),
								!translatorLoading && !translatedResult && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										background: "white",
										borderRadius: 12,
										padding: 36,
										border: "0.5px solid #e2e8f0",
										textAlign: "center"
									},
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												fontSize: 40,
												marginBottom: 10
											},
											children: "🌐"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												fontWeight: 600,
												fontSize: 14,
												marginBottom: 6,
												color: "#1e3a5f"
											},
											children: "بوابة الترجمة الأرشيفية"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											style: {
												fontSize: 12,
												color: "#64748b",
												lineHeight: 1.8
											},
											children: [
												"ارفع ملف TXT/MD أو الصق نص الوثيقة الأجنبية",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
												"ستحصل على ترجمة بالعربية التاريخية الرصينة",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
												"مع استخراج النقاط الجوهرية ومقترح الفصل المرتبط"
											]
										})
									]
								})
							] })]
						}),
						savedTranslations.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								background: "white",
								borderRadius: 12,
								border: "0.5px solid #e2e8f0",
								overflow: "hidden"
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								style: {
									padding: "12px 18px",
									background: "#f8fafc",
									borderBottom: "0.5px solid #e2e8f0",
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center"
								},
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										fontWeight: 600,
										fontSize: 13
									},
									children: [
										"📁 سجل الترجمات المحفوظة (",
										savedTranslations.length,
										")"
									]
								})
							}), savedTranslations.map((tr) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									padding: "12px 18px",
									borderBottom: "0.5px solid #f1f5f9",
									display: "flex",
									gap: 12,
									alignItems: "flex-start"
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										flex: 1,
										minWidth: 0
									},
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												fontWeight: 500,
												fontSize: 13,
												marginBottom: 3
											},
											children: tr.docMeta?.estimatedTitle || tr.fileName
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											style: {
												fontSize: 11,
												color: "#64748b",
												display: "flex",
												gap: 8,
												flexWrap: "wrap"
											},
											children: [
												tr.docMeta?.date && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["📅 ", tr.docMeta.date] }),
												tr.docMeta?.docType && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["📄 ", tr.docMeta.docType] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["💾 ", tr.savedAt] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
													"⭐ ",
													tr.keyPoints?.length || 0,
													" نقطة جوهرية"
												] })
											]
										}),
										tr.originalText && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											style: {
												fontSize: 10,
												color: "#94a3b8",
												marginTop: 3,
												fontFamily: "monospace",
												direction: "ltr",
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap"
											},
											children: [tr.originalText, "..."]
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										gap: 4,
										flexShrink: 0
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => {
											setSelectedTranslation(tr);
											setTranslatedResult(tr.translation);
											setKeyPoints(tr.keyPoints || []);
											setTranslatorDocMeta(tr.docMeta);
											setTranslatorText("");
											setTranslatorFileName(tr.fileName || "");
										},
										style: {
											padding: "4px 10px",
											borderRadius: 6,
											background: "#eff6ff",
											color: "#3B82F6",
											border: "none",
											cursor: "pointer",
											fontSize: 11,
											fontFamily: "inherit"
										},
										children: "عرض"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => deleteTranslation(tr.id),
										style: {
											padding: "4px 8px",
											borderRadius: 6,
											background: "#fee2e2",
											color: "#dc2626",
											border: "none",
											cursor: "pointer",
											fontSize: 11
										},
										children: "🗑️"
									})]
								})]
							}, tr.id))]
						})
					] }),
					page === "defense" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						style: { marginBottom: 20 },
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							style: {
								fontSize: 20,
								fontWeight: 700,
								marginBottom: 4
							},
							children: "🎓 محاكي مناقشة الأطروحة"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							style: {
								color: "#64748b",
								fontSize: 12
							},
							children: [
								"يتقمّص الذكاء الاصطناعي دور رئيس لجنة مناقشة صارم — اختر الفصل لتبدأ جلسة تدريبية أكاديمية حقيقية · يعمل بـ ",
								AI_MODELS.find((m) => m.id === aiModel)?.label || aiModel,
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: {
									display: "inline-block",
									width: 7,
									height: 7,
									borderRadius: "50%",
									background: "#10b981",
									marginInlineStart: 4,
									verticalAlign: "middle"
								} })
							]
						})]
					}), !defenseActive ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						style: {
							background: "#fffbeb",
							borderRadius: 10,
							padding: 14,
							border: "0.5px solid #fde68a",
							marginBottom: 18,
							fontSize: 12,
							color: "#78350f"
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "💡 كيف تعمل المحاكاة؟" }), " يقرأ النظام مصادر الفصل الذي تختاره ويحلل تنوع مصادرك، ثم يُشغّل أستاذاً دكتوراً صارماً يوجّه لك أسئلة ونقوداً علمية حقيقية كما يحدث في قاعة المناقشة بجامعة الموصل. أجب بالعربية الفصحى الأكاديمية."]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						style: {
							display: "grid",
							gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
							gap: 16
						},
						children: chapters.map((ch) => {
							const chDocs = combinedDocs.filter((d) => d.chapterId === ch.id);
							const diversity = calcDiversityForChapter(ch.id);
							const progress = calcChapterProgress(ch.id);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									background: "white",
									borderRadius: 14,
									border: `2px solid ${ch.color}30`,
									borderTop: `4px solid ${ch.color}`,
									padding: 18,
									boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
								},
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											fontWeight: 700,
											fontSize: 13,
											color: ch.color,
											marginBottom: 10,
											lineHeight: 1.4
										},
										children: ch.titleAr
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: {
											display: "flex",
											gap: 8,
											marginBottom: 10,
											flexWrap: "wrap"
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											style: {
												fontSize: 11,
												background: `${ch.color}10`,
												color: ch.color,
												borderRadius: 5,
												padding: "2px 8px"
											},
											children: [
												"📄 ",
												chDocs.length,
												" مصدر"
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											style: {
												fontSize: 11,
												background: "#f1f5f9",
												color: "#475569",
												borderRadius: 5,
												padding: "2px 8px"
											},
											children: [
												"📈 ",
												progress,
												"% إنجاز"
											]
										})]
									}),
									diversity.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: { marginBottom: 12 },
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												style: {
													fontSize: 10,
													color: "#94a3b8",
													marginBottom: 5
												},
												children: "توزيع المصادر:"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												style: {
													height: 6,
													background: "#f1f5f9",
													borderRadius: 3,
													overflow: "hidden",
													display: "flex",
													marginBottom: 5
												},
												children: diversity.map((dc, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													style: {
														height: "100%",
														width: `${dc.pct}%`,
														background: dc.color
													},
													title: `${dc.label}: ${dc.pct}%`
												}, i))
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												style: {
													display: "flex",
													flexWrap: "wrap",
													gap: 3
												},
												children: diversity.map((dc, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													style: {
														fontSize: 9,
														background: `${dc.color}12`,
														color: dc.color,
														borderRadius: 3,
														padding: "0 5px"
													},
													children: [
														dc.label.split(" ")[0],
														": ",
														dc.pct,
														"%"
													]
												}, i))
											})
										]
									}),
									chDocs.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											fontSize: 11,
											color: "#94a3b8",
											fontStyle: "italic",
											marginBottom: 10
										},
										children: "لا توجد مصادر مضافة لهذا الفصل بعد"
									}) : null,
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => startDefenseSession(ch),
										disabled: chDocs.length === 0,
										style: {
											width: "100%",
											padding: "9px",
											borderRadius: 8,
											background: chDocs.length > 0 ? ch.color : "#94a3b8",
											color: "white",
											border: "none",
											cursor: chDocs.length > 0 ? "pointer" : "not-allowed",
											fontFamily: "inherit",
											fontSize: 12,
											fontWeight: 600
										},
										children: "🎓 بدء محاكاة مناقشة هذا الفصل"
									})
								]
							}, ch.id);
						})
					})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								background: defenseChapter?.color || "#1e3a5f",
								color: "white",
								borderRadius: 12,
								padding: "12px 18px",
								marginBottom: 14,
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center"
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								style: {
									fontWeight: 700,
									fontSize: 13,
									marginBottom: 2
								},
								children: "🎓 جلسة مناقشة نشطة"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								style: {
									fontSize: 11,
									opacity: .85
								},
								children: defenseChapter?.titleAr
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: endDefenseSession,
								style: {
									padding: "6px 14px",
									borderRadius: 7,
									background: "rgba(255,255,255,0.2)",
									border: "none",
									color: "white",
									cursor: "pointer",
									fontFamily: "inherit",
									fontSize: 12
								},
								children: "إنهاء الجلسة ✕"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							style: {
								background: "#fffbeb",
								borderRadius: 8,
								padding: "8px 14px",
								marginBottom: 12,
								fontSize: 11,
								color: "#78350f",
								border: "0.5px solid #fde68a"
							},
							children: "أنت الآن أمام لجنة المناقشة — أجب بالعربية الفصحى الأكاديمية. اللجنة ستنتقد مصادرك وتختبر منهجيتك. استعد!"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								background: "white",
								borderRadius: 12,
								border: "0.5px solid #e2e8f0",
								overflow: "hidden",
								marginBottom: 12
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									maxHeight: 460,
									overflowY: "auto",
									padding: 16,
									display: "flex",
									flexDirection: "column",
									gap: 12
								},
								children: [
									defenseMessages.map((msg, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: {
											display: "flex",
											gap: 10,
											alignItems: "flex-start",
											flexDirection: msg.role === "committee" ? "row" : "row-reverse"
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												width: 36,
												height: 36,
												borderRadius: "50%",
												flexShrink: 0,
												background: msg.role === "committee" ? "#1e3a5f" : "#10B981",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												fontSize: 16
											},
											children: msg.role === "committee" ? "👨‍🏫" : "🎓"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											style: {
												maxWidth: "75%",
												background: msg.role === "committee" ? "#f8fafc" : "#f0fdf4",
												borderRadius: msg.role === "committee" ? "4px 12px 12px 12px" : "12px 4px 12px 12px",
												padding: "10px 14px",
												border: `0.5px solid ${msg.role === "committee" ? "#e2e8f0" : "#86efac"}`
											},
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													style: {
														fontSize: 11,
														fontWeight: 600,
														color: msg.role === "committee" ? "#1e3a5f" : "#16a34a",
														marginBottom: 5
													},
													children: msg.role === "committee" ? "🎓 رئيس لجنة المناقشة" : "👨‍💼 الباحث: اسعد النعيمي"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													style: {
														fontSize: 13,
														lineHeight: 1.85,
														color: "#1e293b",
														direction: "rtl"
													},
													children: msg.text
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													style: {
														fontSize: 10,
														color: "#94a3b8",
														marginTop: 5,
														textAlign: "left"
													},
													children: msg.ts
												})
											]
										})]
									}, i)),
									defenseLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: {
											display: "flex",
											gap: 10,
											alignItems: "flex-start"
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												width: 36,
												height: 36,
												borderRadius: "50%",
												background: "#1e3a5f",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												fontSize: 16,
												flexShrink: 0
											},
											children: "👨‍🏫"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												background: "#f8fafc",
												borderRadius: "4px 12px 12px 12px",
												padding: "10px 16px",
												border: "0.5px solid #e2e8f0"
											},
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												style: {
													display: "flex",
													gap: 4,
													alignItems: "center"
												},
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: {
														width: 7,
														height: 7,
														borderRadius: "50%",
														background: "#94a3b8",
														animation: "pulse 1.4s infinite"
													} }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: {
														width: 7,
														height: 7,
														borderRadius: "50%",
														background: "#94a3b8",
														animation: "pulse 1.4s 0.2s infinite"
													} }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: {
														width: 7,
														height: 7,
														borderRadius: "50%",
														background: "#94a3b8",
														animation: "pulse 1.4s 0.4s infinite"
													} }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														style: {
															fontSize: 11,
															color: "#64748b",
															marginRight: 6
														},
														children: "اللجنة تصوغ سؤالها..."
													})
												]
											})
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { ref: defenseChatEndRef })
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									borderTop: "0.5px solid #e2e8f0",
									padding: 14,
									background: "#fafafa"
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										gap: 8
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
										value: defenseInput,
										onChange: (e) => setDefenseInput(e.target.value),
										onKeyDown: (e) => {
											if (e.key === "Enter" && !e.shiftKey) {
												e.preventDefault();
												sendDefenseReply();
											}
										},
										placeholder: "اكتب إجابتك أمام اللجنة بالعربية الفصحى... (Enter للإرسال، Shift+Enter لسطر جديد)",
										rows: 3,
										style: {
											flex: 1,
											padding: "9px 12px",
											borderRadius: 8,
											border: "0.5px solid #cbd5e1",
											fontSize: 13,
											fontFamily: "inherit",
											resize: "vertical",
											direction: "rtl",
											lineHeight: 1.7
										},
										disabled: defenseLoading
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: sendDefenseReply,
										disabled: defenseLoading || !defenseInput.trim(),
										style: {
											padding: "9px 16px",
											borderRadius: 8,
											background: defenseLoading || !defenseInput.trim() ? "#94a3b8" : "#1e3a5f",
											color: "white",
											border: "none",
											cursor: defenseLoading || !defenseInput.trim() ? "not-allowed" : "pointer",
											fontFamily: "inherit",
											fontSize: 13,
											fontWeight: 600,
											alignSelf: "flex-end"
										},
										children: "إرسال →"
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										fontSize: 10,
										color: "#94a3b8",
										marginTop: 5
									},
									children: "💡 نصيحة: استند في إجابتك إلى مصادرك المحددة — اللجنة ستتحقق من ذلك"
								})]
							})]
						}),
						defenseMessages.length > 2 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => {
								const log = defenseMessages.map((m) => `[${m.role === "committee" ? "اللجنة" : "الباحث"}] ${m.text}`).join("\n\n---\n\n");
								navigator.clipboard.writeText(log).then(() => showNotif("✅ تم نسخ سجل المناقشة"));
							},
							style: {
								padding: "8px 16px",
								borderRadius: 8,
								background: "white",
								border: "0.5px solid #e2e8f0",
								cursor: "pointer",
								fontFamily: "inherit",
								fontSize: 12,
								color: "#475569"
							},
							children: "📋 نسخ سجل المناقشة كاملاً"
						})
					] })] }),
					page === "bibliography" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								justifyContent: "space-between",
								alignItems: "flex-start",
								marginBottom: 20,
								flexWrap: "wrap",
								gap: 12
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								style: {
									fontSize: 20,
									fontWeight: 700,
									marginBottom: 4
								},
								children: "📋 قائمة المصادر والمراجع النهائية للرسالة"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								style: {
									color: "#64748b",
									fontSize: 12
								},
								children: "تُضاف المراجع تلقائياً عند نسخ أي هامش — الاسم مُحوَّل (اللقب، الاسم الأول) — مرتّبة أبجدياً داخل كل قسم"
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									gap: 8,
									flexWrap: "wrap"
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: copyFullBibliography,
									disabled: bibliography.length === 0,
									style: {
										padding: "9px 20px",
										borderRadius: 8,
										background: bibliography.length > 0 ? "#3B82F6" : "#94a3b8",
										color: "white",
										border: "none",
										cursor: bibliography.length > 0 ? "pointer" : "not-allowed",
										fontFamily: "inherit",
										fontSize: 13,
										fontWeight: 600
									},
									children: "📋 نسخ القائمة كاملة"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => {
										if (window.confirm("هل تريد مسح جميع المراجع من القائمة؟")) saveBibliography([]);
									},
									disabled: bibliography.length === 0,
									style: {
										padding: "9px 14px",
										borderRadius: 8,
										background: "transparent",
										border: "0.5px solid #fca5a5",
										color: "#dc2626",
										cursor: bibliography.length > 0 ? "pointer" : "not-allowed",
										fontFamily: "inherit",
										fontSize: 13
									},
									children: "🗑️ مسح الكل"
								})]
							})]
						}),
						bibliography.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							style: {
								display: "grid",
								gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
								gap: 10,
								marginBottom: 16
							},
							children: BIBO_SECTIONS_ORDER.map((sec) => {
								const cnt = bibliography.filter((b) => b.section === sec).length;
								if (!cnt) return null;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										background: "white",
										borderRadius: 10,
										padding: "10px 12px",
										border: "0.5px solid #e2e8f0",
										textAlign: "center"
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											fontSize: 20,
											fontWeight: 700,
											color: "#3B82F6"
										},
										children: cnt
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											fontSize: 10,
											color: "#64748b",
											marginTop: 2
										},
										children: sec
									})]
								}, sec);
							})
						}),
						bibliography.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								background: "white",
								borderRadius: 12,
								padding: 50,
								textAlign: "center",
								border: "0.5px solid #e2e8f0"
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										fontSize: 48,
										marginBottom: 12
									},
									children: "📋"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										fontWeight: 600,
										fontSize: 15,
										marginBottom: 6
									},
									children: "القائمة فارغة"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										color: "#64748b",
										fontSize: 13
									},
									children: "عند نسخ أي هامش من أي مصدر، يُضاف تلقائياً هنا"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										color: "#94a3b8",
										fontSize: 12,
										marginTop: 6
									},
									children: "يمكنك أيضاً الضغط على زر \"📝 تصدير الهامش\" من داخل أي مصدر"
								})
							]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							style: {
								display: "grid",
								gap: 16
							},
							children: BIBO_SECTIONS_ORDER.map((sec) => {
								const entries = getBibGrouped()[sec] || [];
								if (!entries.length) return null;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										background: "white",
										borderRadius: 12,
										border: "0.5px solid #e2e8f0",
										overflow: "hidden"
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: {
											padding: "12px 18px",
											background: "#1e3a5f",
											color: "white",
											display: "flex",
											justifyContent: "space-between",
											alignItems: "center"
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											style: {
												fontWeight: 700,
												fontSize: 14
											},
											children: ["◆ ", sec]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											style: {
												background: "rgba(255,255,255,0.2)",
												borderRadius: 20,
												padding: "2px 10px",
												fontSize: 11
											},
											children: [entries.length, " مرجع"]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: { padding: "4px 0" },
										children: entries.map((b, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											style: {
												padding: "12px 18px",
												borderBottom: i < entries.length - 1 ? "0.5px solid #f1f5f9" : "none",
												display: "flex",
												gap: 12,
												alignItems: "flex-start"
											},
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													style: {
														color: "#94a3b8",
														fontSize: 12,
														fontWeight: 600,
														minWidth: 24,
														textAlign: "center",
														marginTop: 2
													},
													children: i + 1
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													style: { flex: 1 },
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														style: {
															fontSize: 13,
															lineHeight: 1.9,
															color: "#1e293b",
															direction: "rtl"
														},
														children: b.bibEntry
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														style: {
															display: "flex",
															gap: 6,
															marginTop: 4,
															flexWrap: "wrap",
															fontSize: 10,
															color: "#94a3b8"
														},
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["🏷️ ", b.category] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["📅 أُضيف: ", b.addedAt] })]
													})]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													style: {
														display: "flex",
														gap: 4,
														flexShrink: 0
													},
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														onClick: () => {
															navigator.clipboard.writeText(b.bibEntry).then(() => showNotif("✅ تم نسخ المرجع"));
														},
														title: "نسخ",
														style: {
															padding: "4px 8px",
															borderRadius: 5,
															background: "#eff6ff",
															color: "#3B82F6",
															border: "none",
															cursor: "pointer",
															fontSize: 11
														},
														children: "📋"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														onClick: () => setConfirmDialog({
															title: "تأكيد الحذف",
															message: "هل أنت متأكد من حذف هذا المرجع من القائمة النهائية؟",
															onConfirm: () => removeFromBibliography(b.id)
														}),
														title: "حذف",
														style: {
															padding: "4px 8px",
															borderRadius: 5,
															background: "#fee2e2",
															color: "#dc2626",
															border: "none",
															cursor: "pointer",
															fontSize: 11
														},
														children: "🗑️"
													})]
												})
											]
										}, b.id))
									})]
								}, sec);
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								marginTop: 16,
								background: "#fffbeb",
								borderRadius: 10,
								padding: 14,
								border: "0.5px solid #fde68a",
								fontSize: 12,
								color: "#78350f"
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "💡 كيف تعمل القائمة:" }), " عند الضغط على \"📝 تصدير الهامش\" من أي مصدر وإدخال رقم الصفحة ثم \"نسخ الهامش\"، يُنسخ الهامش للحافظة ويُضاف المصدر هنا تلقائياً بصيغة قائمة المراجع (بدون رقم الصفحة، مع تقديم اللقب، مرتّب أبجدياً)."]
						})
					] }),
					page === "thesaurus" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: { marginBottom: 20 },
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								style: {
									fontSize: 20,
									fontWeight: 700,
									marginBottom: 4
								},
								children: "📜 قاموس المؤرخ للمرادفات والسبك"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								style: {
									color: "#64748b",
									fontSize: 12
								},
								children: "أداة لغوية أكاديمية لمعالجة تكرار الكلمات وترقية التراكيب إلى مستوى الكتابة التاريخية الرصينة"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: 0,
								marginBottom: 20,
								background: "white",
								borderRadius: 12,
								padding: 4,
								border: "0.5px solid #e2e8f0",
								width: "fit-content"
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setThesActiveTab("synonyms"),
								style: {
									padding: "8px 20px",
									borderRadius: 9,
									border: "none",
									cursor: "pointer",
									fontFamily: "inherit",
									fontSize: 13,
									fontWeight: thesActiveTab === "synonyms" ? 700 : 400,
									background: thesActiveTab === "synonyms" ? "#1e3a5f" : "transparent",
									color: thesActiveTab === "synonyms" ? "white" : "#64748b",
									transition: "all 0.2s"
								},
								children: "🔤 مستكشف المرادفات الأكاديمية"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setThesActiveTab("upgrade"),
								style: {
									padding: "8px 20px",
									borderRadius: 9,
									border: "none",
									cursor: "pointer",
									fontFamily: "inherit",
									fontSize: 13,
									fontWeight: thesActiveTab === "upgrade" ? 700 : 400,
									background: thesActiveTab === "upgrade" ? "#1e3a5f" : "transparent",
									color: thesActiveTab === "upgrade" ? "white" : "#64748b",
									transition: "all 0.2s"
								},
								children: "✍️ ترقية التراكيب القصيرة"
							})]
						}),
						thesActiveTab === "synonyms" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								display: "grid",
								gridTemplateColumns: "340px 1fr",
								gap: 16,
								alignItems: "start"
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									background: "white",
									borderRadius: 12,
									padding: 18,
									border: "0.5px solid #e2e8f0",
									marginBottom: 12
								},
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											fontWeight: 600,
											fontSize: 13,
											marginBottom: 14,
											color: "#1e293b"
										},
										children: "🔤 اكتب الكلمة المكررة"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: thesWordInput,
										onChange: (e) => {
											setThesWordInput(e.target.value);
											setThesWordResult(null);
										},
										onKeyDown: (e) => {
											if (e.key === "Enter") runThesaurusSearch();
										},
										placeholder: "مثال: أدى، قال، حدث، أهمية، كبير...",
										style: {
											width: "100%",
											padding: "10px 14px",
											borderRadius: 8,
											border: "1.5px solid #cbd5e1",
											fontSize: 14,
											fontFamily: "inherit",
											boxSizing: "border-box",
											outline: "none",
											marginBottom: 12,
											direction: "rtl"
										}
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: runThesaurusSearch,
										disabled: thesWordLoading || !thesWordInput.trim(),
										style: {
											width: "100%",
											padding: "10px",
											borderRadius: 8,
											background: thesWordLoading || !thesWordInput.trim() ? "#94a3b8" : "#1e3a5f",
											color: "white",
											border: "none",
											cursor: thesWordLoading || !thesWordInput.trim() ? "not-allowed" : "pointer",
											fontFamily: "inherit",
											fontSize: 13,
											fontWeight: 600,
											marginBottom: 10
										},
										children: thesWordLoading ? "⏳ جارٍ البحث..." : "🔍 استكشاف المرادفات"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: { marginTop: 8 },
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												fontSize: 11,
												color: "#94a3b8",
												marginBottom: 6
											},
											children: "كلمات شائعة التكرار في الكتابة التاريخية:"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												display: "flex",
												flexWrap: "wrap",
												gap: 5
											},
											children: [
												"أدى",
												"قال",
												"حدث",
												"أهمية",
												"كبير",
												"مهم",
												"تأثير",
												"دور",
												"يشير",
												"أسفر"
											].map((w) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => {
													setThesWordInput(w);
													setThesWordResult(null);
												},
												style: {
													padding: "3px 9px",
													borderRadius: 5,
													background: "#f1f5f9",
													border: "0.5px solid #e2e8f0",
													color: "#475569",
													cursor: "pointer",
													fontSize: 11,
													fontFamily: "inherit"
												},
												children: w
											}, w))
										})]
									})
								]
							}), thesWordHistory.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									background: "white",
									borderRadius: 12,
									padding: 14,
									border: "0.5px solid #e2e8f0"
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										fontSize: 12,
										fontWeight: 600,
										color: "#475569",
										marginBottom: 8
									},
									children: "🕐 آخر الكلمات المبحوثة"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										display: "flex",
										flexWrap: "wrap",
										gap: 5
									},
									children: thesWordHistory.map((h, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => {
											setThesWordInput(h.word);
											setThesWordResult(h.result);
										},
										style: {
											padding: "3px 10px",
											borderRadius: 5,
											background: "#eff6ff",
											border: "0.5px solid #bfdbfe",
											color: "#3B82F6",
											cursor: "pointer",
											fontSize: 11,
											fontFamily: "inherit"
										},
										children: h.word
									}, i))
								})]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								thesWordLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										background: "white",
										borderRadius: 12,
										padding: 40,
										border: "0.5px solid #e2e8f0",
										textAlign: "center"
									},
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												fontSize: 40,
												marginBottom: 10
											},
											children: "📚"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												fontWeight: 600,
												color: "#1e3a5f",
												marginBottom: 4
											},
											children: "يستشير المعاجم الأكاديمية..."
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												fontSize: 12,
												color: "#64748b"
											},
											children: "يبحث عن مرادفات أكاديمية رصينة تليق بمستوى الدكتوراه"
										})
									]
								}),
								thesWordResult && !thesWordLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: {
											background: "#1e3a5f",
											borderRadius: "12px 12px 0 0",
											padding: "14px 18px",
											color: "white"
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											style: {
												display: "flex",
												gap: 12,
												alignItems: "center",
												flexWrap: "wrap"
											},
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													style: {
														fontSize: 20,
														fontWeight: 800
													},
													children: thesWordResult.word
												}),
												thesWordResult.category && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													style: {
														background: "rgba(255,255,255,0.2)",
														borderRadius: 5,
														padding: "2px 10px",
														fontSize: 11
													},
													children: thesWordResult.category
												}),
												thesWordResult.semanticField && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													style: {
														background: "rgba(255,255,255,0.15)",
														borderRadius: 5,
														padding: "2px 10px",
														fontSize: 11
													},
													children: ["الحقل: ", thesWordResult.semanticField]
												})
											]
										}), thesWordResult.avoidNote && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											style: {
												marginTop: 8,
												fontSize: 11,
												opacity: .8,
												lineHeight: 1.6,
												background: "rgba(255,255,255,0.07)",
												borderRadius: 7,
												padding: "6px 10px"
											},
											children: ["💡 ", thesWordResult.avoidNote]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											background: "white",
											borderRadius: "0 0 12px 12px",
											border: "0.5px solid #e2e8f0",
											padding: "4px 0",
											overflow: "hidden"
										},
										children: (thesWordResult.synonyms || []).map((syn, i) => {
											const regColor = REGISTER_COLOR[syn.register] || "#64748b";
											return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												style: {
													padding: "13px 18px",
													borderBottom: i < (thesWordResult.synonyms || []).length - 1 ? "0.5px solid #f1f5f9" : "none",
													display: "flex",
													gap: 12,
													alignItems: "flex-start"
												},
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													style: {
														flexShrink: 0,
														width: 30,
														height: 30,
														borderRadius: "50%",
														background: "#f1f5f9",
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
														fontSize: 12,
														fontWeight: 700,
														color: "#475569"
													},
													children: i + 1
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													style: { flex: 1 },
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															style: {
																display: "flex",
																gap: 8,
																alignItems: "center",
																marginBottom: 5,
																flexWrap: "wrap"
															},
															children: [
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																	style: {
																		fontSize: 16,
																		fontWeight: 700,
																		color: "#1e293b"
																	},
																	children: syn.word
																}),
																syn.formType && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																	style: {
																		fontSize: 10,
																		background: "#f1f5f9",
																		color: "#64748b",
																		borderRadius: 4,
																		padding: "1px 7px"
																	},
																	children: syn.formType
																}),
																syn.register && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																	style: {
																		fontSize: 10,
																		background: `${regColor}15`,
																		color: regColor,
																		borderRadius: 4,
																		padding: "1px 7px",
																		fontWeight: 600
																	},
																	children: syn.register
																}),
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																	onClick: () => {
																		navigator.clipboard.writeText(syn.word).then(() => showNotif(`✅ تم نسخ: ${syn.word}`));
																	},
																	style: {
																		padding: "2px 8px",
																		borderRadius: 4,
																		background: "#eff6ff",
																		color: "#3B82F6",
																		border: "none",
																		cursor: "pointer",
																		fontSize: 10,
																		fontFamily: "inherit",
																		marginRight: "auto"
																	},
																	children: "نسخ"
																})
															]
														}),
														syn.context && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															style: {
																fontSize: 12,
																color: "#64748b",
																marginBottom: 5,
																display: "flex",
																gap: 5,
																alignItems: "flex-start"
															},
															children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																style: {
																	flexShrink: 0,
																	color: "#94a3b8"
																},
																children: "السياق:"
															}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: syn.context })]
														}),
														syn.example && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															style: {
																background: "#f8fafc",
																borderRadius: 7,
																padding: "7px 10px",
																fontSize: 12,
																lineHeight: 1.7,
																color: "#334155",
																borderRight: "3px solid #e2e8f0"
															},
															children: [
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																	style: {
																		fontSize: 10,
																		color: "#94a3b8",
																		display: "block",
																		marginBottom: 2
																	},
																	children: "مثال:"
																}),
																syn.example,
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																	onClick: () => {
																		navigator.clipboard.writeText(syn.example).then(() => showNotif("✅ تم نسخ المثال"));
																	},
																	style: {
																		display: "block",
																		marginTop: 5,
																		padding: "2px 8px",
																		borderRadius: 4,
																		background: "white",
																		color: "#64748b",
																		border: "0.5px solid #e2e8f0",
																		cursor: "pointer",
																		fontSize: 10,
																		fontFamily: "inherit"
																	},
																	children: "نسخ المثال"
																})
															]
														})
													]
												})]
											}, i);
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											marginTop: 10,
											display: "flex",
											gap: 8
										},
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => {
												const text = (thesWordResult.synonyms || []).map((s, i) => `${i + 1}. ${s.word} (${s.register || ""}) — ${s.context || ""}\n   مثال: ${s.example || ""}`).join("\n\n");
												navigator.clipboard.writeText(`مرادفات "${thesWordResult.word}":\n\n${text}`).then(() => showNotif("✅ تم نسخ قائمة المرادفات كاملة"));
											},
											style: {
												padding: "7px 16px",
												borderRadius: 8,
												background: "white",
												border: "0.5px solid #e2e8f0",
												cursor: "pointer",
												fontFamily: "inherit",
												fontSize: 12,
												color: "#475569"
											},
											children: "📋 نسخ القائمة كاملة"
										})
									})
								] }),
								!thesWordLoading && !thesWordResult && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										background: "white",
										borderRadius: 12,
										padding: 40,
										border: "0.5px solid #e2e8f0",
										textAlign: "center"
									},
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												fontSize: 44,
												marginBottom: 10
											},
											children: "🔤"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												fontWeight: 600,
												fontSize: 14,
												marginBottom: 6,
												color: "#1e3a5f"
											},
											children: "مستكشف المرادفات الأكاديمية"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											style: {
												fontSize: 12,
												color: "#64748b",
												lineHeight: 1.8
											},
											children: [
												"أدخل أي كلمة تتكرر في كتابتك",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
												"ستحصل على 8 مرادفات أكاديمية فصيحة",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
												"مع السياق الأنسب ومثال جملة كاملة لكل منها"
											]
										})
									]
								})
							] })]
						}),
						thesActiveTab === "upgrade" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								display: "grid",
								gridTemplateColumns: "340px 1fr",
								gap: 16,
								alignItems: "start"
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									background: "white",
									borderRadius: 12,
									padding: 18,
									border: "0.5px solid #e2e8f0",
									marginBottom: 12
								},
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											fontWeight: 600,
											fontSize: 13,
											marginBottom: 4,
											color: "#1e293b"
										},
										children: "✍️ أدخل التركيب أو الجملة القصيرة"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											fontSize: 11,
											color: "#94a3b8",
											marginBottom: 12
										},
										children: "حتى 12 كلمة — سيُرقَّى أسلوبها إلى مستوى الدكتوراه"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
										value: thesPhrase,
										onChange: (e) => {
											setThesPhrase(e.target.value);
											setThesPhraseResult(null);
										},
										placeholder: "مثال:\n\"دخلت بريطانيا الحرب\"\n\"النفط مهم جداً\"\n\"تغيرت أوضاع الخليج\"",
										rows: 4,
										style: {
											width: "100%",
											padding: "10px 12px",
											borderRadius: 8,
											border: "1.5px solid #cbd5e1",
											fontSize: 13,
											fontFamily: "inherit",
											boxSizing: "border-box",
											resize: "vertical",
											direction: "rtl",
											lineHeight: 1.7,
											marginBottom: 12
										}
									}),
									thesPhrase && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: {
											fontSize: 10,
											color: "#94a3b8",
											marginBottom: 8
										},
										children: [thesPhrase.split(/\s+/).filter(Boolean).length, " كلمة"]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: runPhraseUpgrade,
										disabled: thesPhraseLoading || !thesPhrase.trim(),
										style: {
											width: "100%",
											padding: "10px",
											borderRadius: 8,
											background: thesPhraseLoading || !thesPhrase.trim() ? "#94a3b8" : "#7C3AED",
											color: "white",
											border: "none",
											cursor: thesPhraseLoading || !thesPhrase.trim() ? "not-allowed" : "pointer",
											fontFamily: "inherit",
											fontSize: 13,
											fontWeight: 600,
											marginBottom: 10
										},
										children: thesPhraseLoading ? "⏳ جارٍ الترقية..." : "✨ ترقية الأسلوب إلى مستوى الدكتوراه"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: { marginTop: 6 },
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												fontSize: 11,
												color: "#94a3b8",
												marginBottom: 6
											},
											children: "أمثلة جاهزة — اضغط للتطبيق:"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												display: "grid",
												gap: 4
											},
											children: [
												"دخلت بريطانيا الحرب",
												"النفط مهم جداً للحلفاء",
												"تغيرت أوضاع الخليج خلال الحرب",
												"كانت البحرين مهمة",
												"قاومت دول الخليج التدخل"
											].map((ex, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => {
													setThesPhrase(ex);
													setThesPhraseResult(null);
												},
												style: {
													padding: "5px 10px",
													borderRadius: 6,
													background: "#faf5ff",
													border: "0.5px solid #e9d5ff",
													color: "#7C3AED",
													cursor: "pointer",
													fontSize: 11,
													fontFamily: "inherit",
													textAlign: "right"
												},
												children: ex
											}, i))
										})]
									})
								]
							}), thesPhraseHistory.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									background: "white",
									borderRadius: 12,
									padding: 14,
									border: "0.5px solid #e2e8f0"
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										fontSize: 12,
										fontWeight: 600,
										color: "#475569",
										marginBottom: 8
									},
									children: "🕐 آخر العبارات المُرقَّاة"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										display: "grid",
										gap: 4
									},
									children: thesPhraseHistory.map((h, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => {
											setThesPhrase(h.phrase);
											setThesPhraseResult(h.result);
										},
										style: {
											padding: "4px 10px",
											borderRadius: 5,
											background: "#faf5ff",
											border: "0.5px solid #e9d5ff",
											color: "#7C3AED",
											cursor: "pointer",
											fontSize: 11,
											fontFamily: "inherit",
											textAlign: "right",
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap"
										},
										children: h.phrase
									}, i))
								})]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								thesPhraseLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										background: "white",
										borderRadius: 12,
										padding: 40,
										border: "0.5px solid #e2e8f0",
										textAlign: "center"
									},
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												fontSize: 40,
												marginBottom: 10
											},
											children: "✍️"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												fontWeight: 600,
												color: "#7C3AED",
												marginBottom: 4
											},
											children: "يُرقِّي الأسلوب..."
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												fontSize: 12,
												color: "#64748b"
											},
											children: "يصوغ تراكيب تاريخية رصينة تليق بمستوى الدكتوراه"
										})
									]
								}),
								thesPhraseResult && !thesPhraseLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: {
											background: "#fff7ed",
											borderRadius: 12,
											padding: "12px 16px",
											border: "0.5px solid #fed7aa",
											marginBottom: 14,
											display: "flex",
											gap: 10,
											alignItems: "flex-start"
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											style: {
												fontSize: 18,
												flexShrink: 0
											},
											children: "🩺"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											style: {
												fontWeight: 600,
												fontSize: 12,
												color: "#92400e",
												marginBottom: 3
											},
											children: [
												"تشخيص الصياغة الأصلية: «",
												thesPhraseResult.original,
												"»"
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												fontSize: 12,
												color: "#78350f",
												lineHeight: 1.6
											},
											children: thesPhraseResult.diagnosis
										})] })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: {
											display: "grid",
											gap: 10,
											marginBottom: 14
										},
										children: (thesPhraseResult.upgrades || []).map((upg, i) => {
											const styleColor = REGISTER_COLOR[upg.style] || "#64748b";
											return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												style: {
													background: "white",
													borderRadius: 10,
													border: `1.5px solid ${styleColor}25`,
													overflow: "hidden"
												},
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													style: {
														background: `${styleColor}10`,
														padding: "8px 14px",
														borderBottom: `0.5px solid ${styleColor}20`,
														display: "flex",
														justifyContent: "space-between",
														alignItems: "center"
													},
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														style: {
															display: "flex",
															gap: 6,
															alignItems: "center"
														},
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
															style: {
																fontSize: 13,
																fontWeight: 700,
																color: "#64748b"
															},
															children: ["#", i + 1]
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															style: {
																fontSize: 11,
																background: `${styleColor}20`,
																color: styleColor,
																borderRadius: 5,
																padding: "2px 8px",
																fontWeight: 600
															},
															children: upg.style
														})]
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														onClick: () => {
															navigator.clipboard.writeText(upg.text).then(() => showNotif(`✅ تم نسخ الصياغة #${i + 1}`));
														},
														style: {
															padding: "3px 10px",
															borderRadius: 5,
															background: "white",
															border: `0.5px solid ${styleColor}40`,
															color: styleColor,
															cursor: "pointer",
															fontSize: 11,
															fontFamily: "inherit"
														},
														children: "📋 نسخ"
													})]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													style: { padding: "12px 14px" },
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														style: {
															fontSize: 14,
															fontWeight: 600,
															lineHeight: 1.8,
															color: "#1e293b",
															marginBottom: 6,
															direction: "rtl"
														},
														children: upg.text
													}), upg.note && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														style: {
															fontSize: 11,
															color: "#94a3b8",
															lineHeight: 1.6,
															borderTop: "0.5px solid #f1f5f9",
															paddingTop: 6
														},
														children: ["💡 ", upg.note]
													})]
												})]
											}, i);
										})
									}),
									thesPhraseResult.generalTip && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										style: {
											background: "#f0fdf4",
											borderRadius: 10,
											padding: "12px 16px",
											border: "0.5px solid #86efac",
											display: "flex",
											gap: 10,
											alignItems: "flex-start"
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											style: {
												fontSize: 18,
												flexShrink: 0
											},
											children: "🎓"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												fontWeight: 600,
												fontSize: 12,
												color: "#16a34a",
												marginBottom: 3
											},
											children: "نصيحة للباحث"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												fontSize: 12,
												color: "#15803d",
												lineHeight: 1.7
											},
											children: thesPhraseResult.generalTip
										})] })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: { marginTop: 12 },
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => {
												const text = (thesPhraseResult.upgrades || []).map((u, i) => `الصياغة ${i + 1} (${u.style}):\n${u.text}`).join("\n\n");
												navigator.clipboard.writeText(`ترقية: "${thesPhraseResult.original}"\n\n${text}`).then(() => showNotif("✅ تم نسخ جميع الصياغات"));
											},
											style: {
												padding: "7px 16px",
												borderRadius: 8,
												background: "white",
												border: "0.5px solid #e2e8f0",
												cursor: "pointer",
												fontFamily: "inherit",
												fontSize: 12,
												color: "#475569"
											},
											children: "📋 نسخ جميع الصياغات"
										})
									})
								] }),
								!thesPhraseLoading && !thesPhraseResult && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										background: "white",
										borderRadius: 12,
										padding: 40,
										border: "0.5px solid #e2e8f0",
										textAlign: "center"
									},
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												fontSize: 44,
												marginBottom: 10
											},
											children: "✍️"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											style: {
												fontWeight: 600,
												fontSize: 14,
												marginBottom: 6,
												color: "#7C3AED"
											},
											children: "ترقية التراكيب القصيرة"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											style: {
												fontSize: 12,
												color: "#64748b",
												lineHeight: 1.8
											},
											children: [
												"أدخل جملة قصيرة بسيطة أو تركيباً عادياً",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
												"ستحصل على 5 صياغات أكاديمية رصينة",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
												"بأساليب متنوعة: وصفية، تحليلية، استنتاجية، علّية، بلاغية"
											]
										})
									]
								})
							] })]
						})
					] }),
					page === "supervisor" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SupervisorRoom, {
						chapters,
						combinedDocs,
						bibliography,
						showNotif,
						setConfirmDialog,
						initialTab: supervisorTab,
						onOpened: () => setSupervisorTab(null)
					})
				]
			})
		]
	});
}
function ClientApp() {
	const [mounted, setMounted] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		setMounted(true);
	}, []);
	if (!mounted) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: {
		minHeight: "100vh",
		background: "#f8fafc"
	} });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(App, {});
}
//#endregion
export { ClientApp as component };

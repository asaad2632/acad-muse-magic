import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  loadSupervisorQuestions, syncSupervisorQuestions,
  loadSupervisorFiles, syncSupervisorFiles, uploadSupervisorFile, getSupervisorFileUrl, deleteSupervisorFile,
  loadSupervisorNotes, syncSupervisorNotes,
  loadSupervisorMeetings, syncSupervisorMeetings,
  loadSupervisorDecisions, syncSupervisorDecisions,
  loadSupervisorReports, syncSupervisorReports,
  debounce,
} from "@/cloudSync";

const LS = {
  questions: "acadarchiv_supervisor_questions",
  files:     "acadarchiv_supervisor_files",
  notes:     "acadarchiv_supervisor_notes",
  meetings:  "acadarchiv_supervisor_meetings",
  decisions: "acadarchiv_supervisor_decisions",
  reports:   "acadarchiv_supervisor_reports",
};

const loadLS = (k, fb) => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; }
};
const saveLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const todayISO = () => new Date().toISOString().slice(0,10);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);

const PRIMARY = "#1e3a5f";
const FONT = "'Cairo','Segoe UI',Tahoma,sans-serif";

const CHAPTER_OPTIONS = [
  { v: "1", l: "الفصل الأول" },
  { v: "2", l: "الفصل الثاني" },
  { v: "3", l: "الفصل الثالث" },
  { v: "4", l: "الفصل الرابع" },
  { v: "intro", l: "المقدمة" },
  { v: "conclusion", l: "الخاتمة" },
  { v: "general", l: "عام" },
];

const Q_TYPES = [
  { v: "سؤال", color: "#3B82F6" },
  { v: "ملاحظة", color: "#6366F1" },
  { v: "تعديل مطلوب", color: "#F59E0B" },
  { v: "موافقة", color: "#10B981" },
  { v: "تحذير", color: "#EF4444" },
];
const PRIORITIES = [
  { v: "عاجل", icon: "🔴", color: "#EF4444" },
  { v: "مهم",  icon: "🟡", color: "#F59E0B" },
  { v: "عادي", icon: "🟢", color: "#10B981" },
];
const PRIORITY_RANK = { "عاجل": 0, "مهم": 1, "عادي": 2 };

const FILE_STATUSES = [
  { v: "بانتظار المراجعة", icon: "⏳", color: "#64748b" },
  { v: "قيد المراجعة",      icon: "👁️", color: "#3B82F6" },
  { v: "يحتاج تعديل",       icon: "✏️", color: "#F59E0B" },
  { v: "مقبول",             icon: "✅", color: "#10B981" },
];

const NOTE_TYPES = [
  { v: "مصادر ناقصة",   color: "#F59E0B" },
  { v: "صياغة ضعيفة",   color: "#EF4444" },
  { v: "معلومة خاطئة",  color: "#DC2626" },
  { v: "إضافة مطلوبة",  color: "#3B82F6" },
  { v: "ممتاز",          color: "#10B981" },
  { v: "يحتاج توسيع",   color: "#8B5CF6" },
];

const DECISION_SUBJECTS = [
  "الفصل الأول","الفصل الثاني","الفصل الثالث","الفصل الرابع",
  "العنوان","المنهجية","المصادر","الهيكل العام"
];
const DECISION_TYPES = [
  { v: "تمت الموافقة", icon: "✅", border: "#10B981", bg: "#ecfdf5" },
  { v: "يحتاج مراجعة", icon: "🔄", border: "#F59E0B", bg: "#fffbeb" },
  { v: "مرفوض",         icon: "❌", border: "#EF4444", bg: "#fef2f2" },
  { v: "موقوف",         icon: "⏸️", border: "#64748b", bg: "#f8fafc" },
];

const cardSx = { background:"white", borderRadius:12, padding:16, border:"1px solid #e2e8f0", marginBottom:12 };
const labelSx = { fontSize:12, fontWeight:600, color:"#334155", marginBottom:4, display:"block" };
const inputSx = { width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #cbd5e1", fontSize:13, fontFamily:"inherit", boxSizing:"border-box" };
const btnPrimary = { padding:"9px 18px", borderRadius:8, background:PRIMARY, color:"white", border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:600 };
const btnGhost = { padding:"6px 12px", borderRadius:6, background:"#f1f5f9", color:"#334155", border:"1px solid #e2e8f0", cursor:"pointer", fontFamily:"inherit", fontSize:12 };
const btnDanger = { padding:"6px 10px", borderRadius:6, background:"#fee2e2", color:"#dc2626", border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:12 };

const chapterLabel = (v) => (CHAPTER_OPTIONS.find(c => c.v === String(v))?.l) || v;

export default function SupervisorRoom({ chapters = [], combinedDocs = [], bibliography = [], showNotif, setConfirmDialog }) {
  const [tab, setTab] = useState("questions");

  // ---------- state ----------
  const [questions, setQuestions] = useState(() => loadLS(LS.questions, []));
  const [files, setFiles]         = useState(() => loadLS(LS.files, []));
  const [notes, setNotes]         = useState(() => loadLS(LS.notes, []));
  const [meetings, setMeetings]   = useState(() => loadLS(LS.meetings, []));
  const [decisions, setDecisions] = useState(() => loadLS(LS.decisions, []));
  const [reports, setReports]     = useState(() => loadLS(LS.reports, []));

  useEffect(() => saveLS(LS.questions, questions), [questions]);
  useEffect(() => saveLS(LS.files, files), [files]);
  useEffect(() => saveLS(LS.notes, notes), [notes]);
  useEffect(() => saveLS(LS.meetings, meetings), [meetings]);
  useEffect(() => saveLS(LS.decisions, decisions), [decisions]);
  useEffect(() => saveLS(LS.reports, reports), [reports]);



  // ---------- Phase 3d cloud hydration ----------
  const hydratedRef = useRef(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [q, f, n, m, d, r] = await Promise.all([
          loadSupervisorQuestions(),
          loadSupervisorFiles(),
          loadSupervisorNotes(),
          loadSupervisorMeetings(),
          loadSupervisorDecisions(),
          loadSupervisorReports(),
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
    return () => { cancelled = true; };
  }, []);

  const debSyncQ = useMemo(() => debounce(syncSupervisorQuestions, 800), []);
  const debSyncF = useMemo(() => debounce(syncSupervisorFiles, 800), []);
  const debSyncN = useMemo(() => debounce(syncSupervisorNotes, 800), []);
  const debSyncM = useMemo(() => debounce(syncSupervisorMeetings, 800), []);
  const debSyncD = useMemo(() => debounce(syncSupervisorDecisions, 800), []);
  const debSyncR = useMemo(() => debounce(syncSupervisorReports, 800), []);

  useEffect(() => { if (hydratedRef.current) debSyncQ(questions); }, [questions, debSyncQ]);
  useEffect(() => { if (hydratedRef.current) debSyncF(files); }, [files, debSyncF]);
  useEffect(() => { if (hydratedRef.current) debSyncN(notes); }, [notes, debSyncN]);
  useEffect(() => { if (hydratedRef.current) debSyncM(meetings); }, [meetings, debSyncM]);
  useEffect(() => { if (hydratedRef.current) debSyncD(decisions); }, [decisions, debSyncD]);
  useEffect(() => { if (hydratedRef.current) debSyncR(reports); }, [reports, debSyncR]);

  const confirmDelete = (msg, onConfirm) => {
    if (setConfirmDialog) {
      setConfirmDialog({ title: "تأكيد الحذف", message: msg, onConfirm });
    } else if (window.confirm(msg)) {
      onConfirm();
    }
  };
  const notify = (m, t) => showNotif ? showNotif(m, t) : null;

  // ---------- Section 1: questions ----------
  const [qForm, setQForm] = useState({ chapter:"general", type:"سؤال", text:"", date: todayISO(), priority:"عادي" });
  const addQuestion = () => {
    if (!qForm.text.trim()) { notify("⚠️ نص الاستفسار مطلوب", "error"); return; }
    setQuestions(p => [...p, { id: uid(), ...qForm, reply: "", status: "pending", createdAt: Date.now() }]);
    setQForm({ chapter:"general", type:"سؤال", text:"", date: todayISO(), priority:"عادي" });
    notify("✅ تم إضافة استفسار المشرف");
  };
  const sortedQuestions = useMemo(() => {
    return [...questions].sort((a,b) => {
      const pa = PRIORITY_RANK[a.priority] ?? 9;
      const pb = PRIORITY_RANK[b.priority] ?? 9;
      if (pa !== pb) return pa - pb;
      return (b.date || "").localeCompare(a.date || "");
    });
  }, [questions]);

  // ---------- Section 2: files ----------
  const [fForm, setFForm] = useState({ chapter:"1", version:"", date: todayISO(), note:"" });
  const [pendingFile, setPendingFile] = useState(null);
  const onFilePick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const name = f.name.toLowerCase();
    if (!(name.endsWith(".docx") || name.endsWith(".doc") || name.endsWith(".pdf"))) {
      notify("⚠️ يُسمح فقط بملفات Word أو PDF", "error");
      e.target.value = "";
      return;
    }
    // Keep dataURL for instant local preview, plus raw File for cloud upload
    const reader = new FileReader();
    reader.onload = (ev) => setPendingFile({ name: f.name, size: f.size, type: f.type, dataUrl: ev.target.result, file: f });
    reader.readAsDataURL(f);
  };
  const uploadFile = async () => {
    if (!pendingFile) { notify("⚠️ اختر ملفاً أولاً", "error"); return; }
    notify("⏳ جاري رفع الملف...");
    let storagePath = null;
    try {
      if (pendingFile.file) storagePath = await uploadSupervisorFile(pendingFile.file);
    } catch (err) { console.warn("[uploadSupervisorFile]", err); }
    setFiles(p => [...p, {
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
      uploadedAt: Date.now(),
    }]);
    setPendingFile(null);
    setFForm({ chapter:"1", version:"", date: todayISO(), note:"" });
    const input = document.getElementById("supervisor-file-input");
    if (input) input.value = "";
    notify(storagePath
      ? "✅ تم رفع الفصل للمراجعة ومشاركته مع المشرف"
      : "✅ تم حفظ الفصل محلياً (تعذّر الرفع للسحابة)");
  };
  const downloadFile = async (f) => {
    let href = f.dataUrl;
    if (!href && f.storagePath) href = await getSupervisorFileUrl(f.storagePath);
    if (!href) { notify("⚠️ تعذّر الحصول على الملف", "error"); return; }
    const a = document.createElement("a");
    a.href = href;
    a.download = f.fileName;
    if (!f.dataUrl) a.target = "_blank";
    document.body.appendChild(a); a.click(); a.remove();
  };
  const removeFileEntry = async (f) => {
    if (f.storagePath) { try { await deleteSupervisorFile(f.storagePath); } catch {} }
    setFiles(p => p.filter(x => x.id !== f.id));
  };
  const filesByChapter = useMemo(() => {
    const map = {};
    files.forEach(f => { (map[f.chapter] = map[f.chapter] || []).push(f); });
    return map;
  }, [files]);

  // ---------- Section 3: notes ----------
  const [nForm, setNForm] = useState({ chapterId:"", sectionId:"", type:"مصادر ناقصة", text:"", date: todayISO() });
  const selectedChapter = chapters.find(c => String(c.id) === String(nForm.chapterId));
  const addNote = () => {
    if (!nForm.chapterId) { notify("⚠️ اختر الفصل", "error"); return; }
    if (!nForm.text.trim()) { notify("⚠️ نص الملاحظة مطلوب", "error"); return; }
    setNotes(p => [...p, { id: uid(), ...nForm, done: false, createdAt: Date.now() }]);
    setNForm({ chapterId:"", sectionId:"", type:"مصادر ناقصة", text:"", date: todayISO() });
    notify("✅ تم حفظ الملاحظة");
  };
  const notesByChapter = useMemo(() => {
    const map = {};
    [...notes].sort((a,b) => (b.date||"").localeCompare(a.date||"")).forEach(n => {
      (map[n.chapterId] = map[n.chapterId] || []).push(n);
    });
    return map;
  }, [notes]);

  // ---------- Section 4: meetings ----------
  const [mForm, setMForm] = useState({ date: todayISO(), place:"", summary:"", decisions:"", todo:"", nextDate:"" });
  const addMeeting = () => {
    if (!mForm.summary.trim()) { notify("⚠️ ملخص اللقاء مطلوب", "error"); return; }
    setMeetings(p => [...p, { id: uid(), ...mForm, createdAt: Date.now() }]);
    setMForm({ date: todayISO(), place:"", summary:"", decisions:"", todo:"", nextDate:"" });
    notify("✅ تم تسجيل اللقاء");
  };
  const sortedMeetings = useMemo(() => [...meetings].sort((a,b) => (b.date||"").localeCompare(a.date||"")), [meetings]);

  // ---------- Section 5: decisions ----------
  const [dForm, setDForm] = useState({ subject: DECISION_SUBJECTS[0], type:"تمت الموافقة", text:"", date: todayISO() });
  const addDecision = () => {
    if (!dForm.text.trim()) { notify("⚠️ نص القرار مطلوب", "error"); return; }
    setDecisions(p => [...p, { id: uid(), ...dForm, createdAt: Date.now() }]);
    setDForm({ subject: DECISION_SUBJECTS[0], type:"تمت الموافقة", text:"", date: todayISO() });
    notify("✅ تم تسجيل القرار");
  };

  // ---------- Section 6: weekly report ----------
  const [reportText, setReportText] = useState("");
  const generateReport = () => {
    const now = new Date();
    const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const total = combinedDocs.length;
    const thisWeek = combinedDocs.filter(d => {
      const ts = d.createdAt || d.addedAt || d.uploadedAt || 0;
      return ts && ts >= weekAgo;
    }).length;

    const perChapter = (chapters || []).map(ch => {
      const docsIn = combinedDocs.filter(d => String(d.chapterId) === String(ch.id));
      const target = Math.max(((ch.sections || []).length) * 5, 10);
      const pct = Math.min(100, Math.round((docsIn.length / target) * 100));
      const name = ch.titleAr || ch.title || `الفصل ${ch.id}`;
      return `  • ${name}: ${docsIn.length} مصدر — ${pct}% إنجاز`;
    }).join("\n");

    const uploadedList = files.length
      ? files.map(f => `  - ${chapterLabel(f.chapter)} | ${f.version} | ${f.fileName} [${f.status}]`).join("\n")
      : "  (لا يوجد)";
    const pendingQ = questions.filter(q => q.status !== "answered").length;

    const txt =
`📊 تقرير الإنجاز الأسبوعي
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
`;
    setReportText(txt);
    notify("✅ تم توليد التقرير");
  };
  const copyReport = async (txt) => {
    try { await navigator.clipboard.writeText(txt); notify("📋 تم نسخ التقرير"); }
    catch { notify("⚠️ تعذر النسخ", "error"); }
  };
  const saveReport = () => {
    if (!reportText.trim()) { notify("⚠️ ولّد التقرير أولاً", "error"); return; }
    setReports(p => [{ id: uid(), date: todayISO(), text: reportText, createdAt: Date.now() }, ...p]);
    notify("💾 تم حفظ التقرير في السجل");
  };

  // ---------- UI ----------
  const TABS = [
    { id:"questions", label:"📝 الاستفسارات", count: questions.length },
    { id:"files",     label:"📄 رفع الفصول",   count: files.length },
    { id:"notes",     label:"💬 ملاحظات المباحث", count: notes.length },
    { id:"meetings",  label:"📅 اللقاءات",      count: meetings.length },
    { id:"decisions", label:"✅ القرارات",      count: decisions.length },
    { id:"report",    label:"📊 التقرير الأسبوعي", count: reports.length },
  ];

  return (
    <div style={{ fontFamily: FONT, direction:"rtl" }}>
      {/* Header */}
      <div style={{ background: PRIMARY, color:"white", borderRadius:14, padding:"20px 22px", marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:36 }}>👨‍🏫</span>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, margin:0 }}>غرفة المشرف الأكاديمي</h1>
            <div style={{ fontSize:13, opacity:0.85, marginTop:4 }}>أ.م.د فواز موفق ذنون — جامعة الموصل</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:"9px 14px", borderRadius:10, border:"1px solid "+(tab===t.id?PRIMARY:"#e2e8f0"),
            background: tab===t.id ? PRIMARY : "white", color: tab===t.id ? "white" : "#334155",
            cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:600
          }}>
            {t.label} {t.count > 0 && <span style={{ opacity:0.75 }}>({t.count})</span>}
          </button>
        ))}
      </div>

      {/* ===== SECTION 1: QUESTIONS ===== */}
      {tab === "questions" && (
        <>
          <div style={cardSx}>
            <h3 style={{ marginTop:0, color: PRIMARY }}>📝 أسئلة واستفسارات المشرف</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
              <div>
                <label style={labelSx}>الفصل المعني</label>
                <select value={qForm.chapter} onChange={e=>setQForm({...qForm, chapter:e.target.value})} style={inputSx}>
                  {CHAPTER_OPTIONS.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
                </select>
              </div>
              <div>
                <label style={labelSx}>نوع الملاحظة</label>
                <select value={qForm.type} onChange={e=>setQForm({...qForm, type:e.target.value})} style={inputSx}>
                  {Q_TYPES.map(t => <option key={t.v} value={t.v}>{t.v}</option>)}
                </select>
              </div>
              <div>
                <label style={labelSx}>تاريخ الاستفسار</label>
                <input type="date" value={qForm.date} onChange={e=>setQForm({...qForm, date:e.target.value})} style={inputSx}/>
              </div>
              <div>
                <label style={labelSx}>الأولوية</label>
                <select value={qForm.priority} onChange={e=>setQForm({...qForm, priority:e.target.value})} style={inputSx}>
                  {PRIORITIES.map(p => <option key={p.v} value={p.v}>{p.icon} {p.v}</option>)}
                </select>
              </div>
            </div>
            <label style={labelSx}>نص السؤال أو الاستفسار *</label>
            <textarea value={qForm.text} onChange={e=>setQForm({...qForm, text:e.target.value})}
              rows={3} style={{...inputSx, marginBottom:12, resize:"vertical"}}
              placeholder="اكتب استفسار المشرف..."/>
            <button onClick={addQuestion} style={btnPrimary}>إضافة استفسار المشرف</button>
          </div>

          {sortedQuestions.length === 0 ? (
            <div style={{...cardSx, textAlign:"center", color:"#94a3b8"}}>لا توجد استفسارات بعد</div>
          ) : sortedQuestions.map(q => {
            const tInfo = Q_TYPES.find(t => t.v === q.type) || Q_TYPES[0];
            const pInfo = PRIORITIES.find(p => p.v === q.priority) || PRIORITIES[2];
            return (
              <div key={q.id} style={{...cardSx, borderRight:`4px solid ${pInfo.color}`}}>
                <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", marginBottom:8 }}>
                  <span style={{ background:tInfo.color, color:"white", padding:"3px 10px", borderRadius:12, fontSize:11, fontWeight:600 }}>{q.type}</span>
                  <span style={{ background:"#f1f5f9", color:"#475569", padding:"3px 10px", borderRadius:12, fontSize:11 }}>{chapterLabel(q.chapter)}</span>
                  <span style={{ fontSize:12, color:pInfo.color, fontWeight:600 }}>{pInfo.icon} {q.priority}</span>
                  <span style={{ fontSize:11, color:"#94a3b8", marginInlineStart:"auto" }}>{q.date}</span>
                </div>
                <div style={{ fontSize:13, color:"#1e293b", lineHeight:1.7, marginBottom:10, whiteSpace:"pre-wrap" }}>{q.text}</div>
                <div style={{ background:"#f8fafc", padding:10, borderRadius:8, marginBottom:8 }}>
                  <label style={labelSx}>رد الطالب</label>
                  <div style={{ display:"flex", gap:6 }}>
                    <input value={q.reply || ""} onChange={e => setQuestions(p => p.map(x => x.id===q.id ? {...x, reply:e.target.value} : x))}
                      placeholder="اكتب الرد هنا..." style={{...inputSx, flex:1}}/>
                    <button onClick={() => notify("💾 تم حفظ الرد")} style={btnGhost}>حفظ</button>
                  </div>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <button onClick={() => setQuestions(p => p.map(x => x.id===q.id ? {...x, status: x.status==="answered"?"pending":"answered"} : x))}
                    style={{ ...btnGhost, background: q.status==="answered" ? "#dcfce7" : "#fef9c3", color: q.status==="answered" ? "#16a34a" : "#92400e" }}>
                    {q.status === "answered" ? "تم الرد ✅" : "قيد المعالجة 🟡"}
                  </button>
                  <button onClick={() => confirmDelete("هل تريد حذف هذا الاستفسار؟", () => setQuestions(p => p.filter(x => x.id !== q.id)))}
                    style={{...btnDanger, marginInlineStart:"auto"}}>🗑️ حذف</button>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ===== SECTION 2: FILES ===== */}
      {tab === "files" && (
        <>
          <div style={cardSx}>
            <h3 style={{ marginTop:0, color: PRIMARY }}>📄 رفع الفصول للمراجعة</h3>
            <div style={{ background:"#eff6ff", padding:10, borderRadius:8, fontSize:12, color:"#1e40af", marginBottom:12 }}>
              🔒 الملفات تُرفع لتخزين سحابي خاص يشاركه الطالب والمشرف فقط — لن تُرسل لأي ذكاء اصطناعي ولن يُحلَّل محتواها.
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
              <div>
                <label style={labelSx}>الفصل</label>
                <select value={fForm.chapter} onChange={e=>setFForm({...fForm, chapter:e.target.value})} style={inputSx}>
                  {CHAPTER_OPTIONS.filter(c => c.v !== "general").map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
                </select>
              </div>
              <div>
                <label style={labelSx}>رقم النسخة</label>
                <input value={fForm.version} onChange={e=>setFForm({...fForm, version:e.target.value})} placeholder="مثال: النسخة الأولى" style={inputSx}/>
              </div>
              <div>
                <label style={labelSx}>تاريخ الرفع</label>
                <input type="date" value={fForm.date} onChange={e=>setFForm({...fForm, date:e.target.value})} style={inputSx}/>
              </div>
              <div>
                <label style={labelSx}>ملف Word / PDF</label>
                <input id="supervisor-file-input" type="file" accept=".docx,.doc,.pdf" onChange={onFilePick} style={{...inputSx, padding:6}}/>
              </div>
            </div>
            <label style={labelSx}>ملاحظة مرفقة</label>
            <textarea value={fForm.note} onChange={e=>setFForm({...fForm, note:e.target.value})}
              rows={2} style={{...inputSx, marginBottom:12, resize:"vertical"}}/>
            {pendingFile && (
              <div style={{ fontSize:12, color:"#475569", marginBottom:10 }}>
                📎 جاهز للرفع: <strong>{pendingFile.name}</strong> ({Math.round(pendingFile.size/1024)} KB)
              </div>
            )}
            <button onClick={uploadFile} style={btnPrimary}>رفع الفصل للمراجعة</button>
          </div>

          {Object.keys(filesByChapter).length === 0 ? (
            <div style={{...cardSx, textAlign:"center", color:"#94a3b8"}}>لا توجد ملفات مرفوعة بعد</div>
          ) : CHAPTER_OPTIONS.filter(c => filesByChapter[c.v]).map(c => (
            <div key={c.v} style={cardSx}>
              <h4 style={{ marginTop:0, color: PRIMARY, fontSize:14 }}>{c.l} ({filesByChapter[c.v].length})</h4>
              {filesByChapter[c.v].map(f => {
                const st = FILE_STATUSES.find(s => s.v === f.status) || FILE_STATUSES[0];
                return (
                  <div key={f.id} style={{ borderTop:"1px solid #f1f5f9", padding:"10px 0" }}>
                    <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", marginBottom:6 }}>
                      <strong style={{ fontSize:13 }}>📄 {f.fileName}</strong>
                      <span style={{ fontSize:11, color:"#64748b" }}>· {f.version}</span>
                      <span style={{ fontSize:11, color:"#64748b" }}>· {f.date}</span>
                      <span style={{ fontSize:11, color:"#64748b" }}>· {Math.round(f.size/1024)} KB</span>
                    </div>
                    {f.note && <div style={{ fontSize:12, color:"#475569", marginBottom:6, background:"#f8fafc", padding:6, borderRadius:6 }}>📝 {f.note}</div>}
                    <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                      <select value={f.status} onChange={e => setFiles(p => p.map(x => x.id===f.id ? {...x, status:e.target.value} : x))}
                        style={{ ...inputSx, width:"auto", padding:"6px 10px", fontSize:12, color:st.color, fontWeight:600 }}>
                        {FILE_STATUSES.map(s => <option key={s.v} value={s.v}>{s.icon} {s.v}</option>)}
                      </select>
                      <button onClick={() => downloadFile(f)} style={{...btnGhost, background:"#dbeafe", color:"#1e40af"}}>📥 تحميل</button>
                      <button onClick={() => confirmDelete(`حذف الملف "${f.fileName}"؟`, () => removeFileEntry(f))}
                        style={{...btnDanger, marginInlineStart:"auto"}}>🗑️ حذف</button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </>
      )}

      {/* ===== SECTION 3: NOTES ===== */}
      {tab === "notes" && (
        <>
          <div style={cardSx}>
            <h3 style={{ marginTop:0, color: PRIMARY }}>💬 ملاحظات المشرف على المباحث</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
              <div>
                <label style={labelSx}>الفصل</label>
                <select value={nForm.chapterId} onChange={e=>setNForm({...nForm, chapterId:e.target.value, sectionId:""})} style={inputSx}>
                  <option value="">— اختر —</option>
                  {chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.titleAr || ch.title || `الفصل ${ch.id}`}</option>)}
                </select>
              </div>
              <div>
                <label style={labelSx}>المبحث</label>
                <select value={nForm.sectionId} onChange={e=>setNForm({...nForm, sectionId:e.target.value})} style={inputSx} disabled={!selectedChapter}>
                  <option value="">— اختر —</option>
                  {selectedChapter?.sections?.map(s => <option key={s.id} value={s.id}>{s.title || s.id}</option>)}
                </select>
              </div>
              <div>
                <label style={labelSx}>نوع الملاحظة</label>
                <select value={nForm.type} onChange={e=>setNForm({...nForm, type:e.target.value})} style={inputSx}>
                  {NOTE_TYPES.map(t => <option key={t.v} value={t.v}>{t.v}</option>)}
                </select>
              </div>
              <div>
                <label style={labelSx}>تاريخ الملاحظة</label>
                <input type="date" value={nForm.date} onChange={e=>setNForm({...nForm, date:e.target.value})} style={inputSx}/>
              </div>
            </div>
            <label style={labelSx}>نص الملاحظة *</label>
            <textarea value={nForm.text} onChange={e=>setNForm({...nForm, text:e.target.value})}
              rows={3} style={{...inputSx, marginBottom:12, resize:"vertical"}}/>
            <button onClick={addNote} style={btnPrimary}>حفظ الملاحظة</button>
          </div>

          {Object.keys(notesByChapter).length === 0 ? (
            <div style={{...cardSx, textAlign:"center", color:"#94a3b8"}}>لا توجد ملاحظات بعد</div>
          ) : chapters.filter(ch => notesByChapter[ch.id]).map(ch => (
            <div key={ch.id} style={cardSx}>
              <h4 style={{ marginTop:0, color: PRIMARY, fontSize:14 }}>{ch.titleAr || ch.title || `الفصل ${ch.id}`}</h4>
              <div style={{ borderInlineStart:`2px solid ${PRIMARY}`, paddingInlineStart:14 }}>
                {notesByChapter[ch.id].map(n => {
                  const tInfo = NOTE_TYPES.find(t => t.v === n.type) || NOTE_TYPES[0];
                  const sec = ch.sections?.find(s => s.id === n.sectionId);
                  return (
                    <div key={n.id} style={{ padding:"10px 0", borderBottom:"1px dashed #e2e8f0" }}>
                      <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", marginBottom:6 }}>
                        <span style={{ background:tInfo.color, color:"white", padding:"2px 8px", borderRadius:10, fontSize:11, fontWeight:600 }}>{n.type}</span>
                        {sec && <span style={{ fontSize:11, color:"#64748b" }}>{sec.title}</span>}
                        <span style={{ fontSize:11, color:"#94a3b8", marginInlineStart:"auto" }}>{n.date}</span>
                      </div>
                      <div style={{ fontSize:13, color: n.done ? "#94a3b8" : "#1e293b", textDecoration: n.done ? "line-through" : "none", lineHeight:1.7, marginBottom:6, whiteSpace:"pre-wrap" }}>{n.text}</div>
                      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                        <label style={{ fontSize:12, display:"flex", gap:6, alignItems:"center", cursor:"pointer" }}>
                          <input type="checkbox" checked={!!n.done} onChange={e => setNotes(p => p.map(x => x.id===n.id ? {...x, done:e.target.checked} : x))}/>
                          تم التنفيذ ✅
                        </label>
                        <button onClick={() => confirmDelete("حذف هذه الملاحظة؟", () => setNotes(p => p.filter(x => x.id !== n.id)))}
                          style={{...btnDanger, marginInlineStart:"auto"}}>🗑️</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}

      {/* ===== SECTION 4: MEETINGS ===== */}
      {tab === "meetings" && (
        <>
          <div style={cardSx}>
            <h3 style={{ marginTop:0, color: PRIMARY }}>📅 سجل لقاءات المشرف</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
              <div>
                <label style={labelSx}>تاريخ اللقاء</label>
                <input type="date" value={mForm.date} onChange={e=>setMForm({...mForm, date:e.target.value})} style={inputSx}/>
              </div>
              <div>
                <label style={labelSx}>مكان اللقاء</label>
                <input value={mForm.place} onChange={e=>setMForm({...mForm, place:e.target.value})} placeholder="مكتب المشرف، أونلاين..." style={inputSx}/>
              </div>
            </div>
            <label style={labelSx}>ملخص اللقاء *</label>
            <textarea value={mForm.summary} onChange={e=>setMForm({...mForm, summary:e.target.value})} rows={2} style={{...inputSx, marginBottom:10, resize:"vertical"}}/>
            <label style={labelSx}>القرارات المتخذة</label>
            <textarea value={mForm.decisions} onChange={e=>setMForm({...mForm, decisions:e.target.value})} rows={2} style={{...inputSx, marginBottom:10, resize:"vertical"}}/>
            <label style={labelSx}>المطلوب للقاء القادم</label>
            <textarea value={mForm.todo} onChange={e=>setMForm({...mForm, todo:e.target.value})} rows={2} style={{...inputSx, marginBottom:10, resize:"vertical"}}/>
            <label style={labelSx}>تاريخ اللقاء القادم</label>
            <input type="date" value={mForm.nextDate} onChange={e=>setMForm({...mForm, nextDate:e.target.value})} style={{...inputSx, marginBottom:12}}/>
            <button onClick={addMeeting} style={btnPrimary}>تسجيل اللقاء</button>
          </div>

          {sortedMeetings.length === 0 ? (
            <div style={{...cardSx, textAlign:"center", color:"#94a3b8"}}>لا يوجد لقاءات مسجلة</div>
          ) : sortedMeetings.map(m => (
            <div key={m.id} style={{...cardSx, borderInlineStart:`4px solid ${PRIMARY}`}}>
              <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap", marginBottom:8 }}>
                <strong style={{ fontSize:14, color: PRIMARY }}>📅 {m.date}</strong>
                {m.place && <span style={{ fontSize:12, color:"#64748b" }}>📍 {m.place}</span>}
              </div>
              <div style={{ fontSize:13, marginBottom:8, lineHeight:1.7, whiteSpace:"pre-wrap" }}><strong>الملخص:</strong> {m.summary}</div>
              {m.decisions && <div style={{ fontSize:13, marginBottom:8, lineHeight:1.7, whiteSpace:"pre-wrap" }}><strong>القرارات:</strong> {m.decisions}</div>}
              {m.todo && <div style={{ fontSize:13, marginBottom:8, lineHeight:1.7, whiteSpace:"pre-wrap" }}><strong>المطلوب:</strong> {m.todo}</div>}
              {m.nextDate && (
                <div style={{ background:"#dbeafe", color:"#1e40af", padding:"6px 12px", borderRadius:8, fontSize:12, fontWeight:600, display:"inline-block", marginTop:4 }}>
                  📅 اللقاء القادم: {m.nextDate}
                </div>
              )}
              <div style={{ marginTop:10, textAlign:"end" }}>
                <button onClick={() => confirmDelete("حذف هذا اللقاء؟", () => setMeetings(p => p.filter(x => x.id !== m.id)))} style={btnDanger}>🗑️ حذف</button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* ===== SECTION 5: DECISIONS ===== */}
      {tab === "decisions" && (
        <>
          <div style={cardSx}>
            <h3 style={{ marginTop:0, color: PRIMARY }}>✅ قرارات المشرف النهائية</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
              <div>
                <label style={labelSx}>يتعلق بـ</label>
                <select value={dForm.subject} onChange={e=>setDForm({...dForm, subject:e.target.value})} style={inputSx}>
                  {DECISION_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={labelSx}>نوع القرار</label>
                <select value={dForm.type} onChange={e=>setDForm({...dForm, type:e.target.value})} style={inputSx}>
                  {DECISION_TYPES.map(t => <option key={t.v} value={t.v}>{t.icon} {t.v}</option>)}
                </select>
              </div>
            </div>
            <label style={labelSx}>تاريخ القرار</label>
            <input type="date" value={dForm.date} onChange={e=>setDForm({...dForm, date:e.target.value})} style={{...inputSx, marginBottom:10}}/>
            <label style={labelSx}>نص القرار الرسمي *</label>
            <textarea value={dForm.text} onChange={e=>setDForm({...dForm, text:e.target.value})} rows={3} style={{...inputSx, marginBottom:12, resize:"vertical"}}/>
            <button onClick={addDecision} style={btnPrimary}>تسجيل القرار</button>
          </div>

          {decisions.length === 0 ? (
            <div style={{...cardSx, textAlign:"center", color:"#94a3b8"}}>لا توجد قرارات مسجلة</div>
          ) : [...decisions].sort((a,b)=>(b.date||"").localeCompare(a.date||"")).map(d => {
            const tInfo = DECISION_TYPES.find(t => t.v === d.type) || DECISION_TYPES[0];
            return (
              <div key={d.id} style={{ background:tInfo.bg, border:`2px solid ${tInfo.border}`, borderRadius:12, padding:16, marginBottom:12 }}>
                <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap", marginBottom:8 }}>
                  <span style={{ background:tInfo.border, color:"white", padding:"4px 12px", borderRadius:12, fontSize:12, fontWeight:700 }}>{tInfo.icon} {d.type}</span>
                  <strong style={{ fontSize:14 }}>{d.subject}</strong>
                  <span style={{ fontSize:11, color:"#64748b", marginInlineStart:"auto" }}>{d.date}</span>
                </div>
                <div style={{ fontSize:13, lineHeight:1.8, whiteSpace:"pre-wrap", color:"#1e293b" }}>{d.text}</div>
                <div style={{ marginTop:10, textAlign:"end" }}>
                  <button onClick={() => confirmDelete("حذف هذا القرار؟", () => setDecisions(p => p.filter(x => x.id !== d.id)))} style={btnDanger}>🗑️ حذف</button>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ===== SECTION 6: REPORT ===== */}
      {tab === "report" && (
        <>
          <div style={cardSx}>
            <h3 style={{ marginTop:0, color: PRIMARY }}>📊 تقرير الإنجاز الأسبوعي</h3>
            <button onClick={generateReport} style={btnPrimary}>توليد تقرير هذا الأسبوع</button>
            {reportText && (
              <>
                <pre style={{ marginTop:14, background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, padding:14, fontSize:13, lineHeight:1.9, whiteSpace:"pre-wrap", fontFamily:"inherit", color:"#1e293b" }}>{reportText}</pre>
                <div style={{ display:"flex", gap:10, marginTop:10 }}>
                  <button onClick={() => copyReport(reportText)} style={{...btnPrimary, background:"#10B981"}}>📋 نسخ التقرير</button>
                  <button onClick={saveReport} style={{...btnPrimary, background:"#8B5CF6"}}>💾 حفظ في السجل</button>
                </div>
              </>
            )}
          </div>

          {reports.length > 0 && (
            <div style={cardSx}>
              <h4 style={{ marginTop:0, color: PRIMARY, fontSize:14 }}>📚 سجل التقارير ({reports.length})</h4>
              {reports.map(r => (
                <div key={r.id} style={{ borderTop:"1px solid #f1f5f9", padding:"10px 0" }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6 }}>
                    <strong style={{ fontSize:13, color: PRIMARY }}>📅 {r.date}</strong>
                    <button onClick={() => copyReport(r.text)} style={{...btnGhost, marginInlineStart:"auto"}}>📋 نسخ</button>
                    <button onClick={() => confirmDelete("حذف هذا التقرير من السجل؟", () => setReports(p => p.filter(x => x.id !== r.id)))} style={btnDanger}>🗑️</button>
                  </div>
                  <pre style={{ background:"#f8fafc", borderRadius:8, padding:10, fontSize:12, lineHeight:1.7, whiteSpace:"pre-wrap", fontFamily:"inherit", color:"#475569", margin:0 }}>{r.text}</pre>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

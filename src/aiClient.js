import { getSelectedModel } from "./config";

// Unified AI call. Proxied through /api/ai-chat (Lovable AI Gateway server-side).
// Returns Anthropic-shaped: { content: [{ type: "text", text: "..." }] }
export async function callLLM({ system, messages = [], max_tokens = 1024, forceProvider } = {}) {
  const model = getSelectedModel();
  try {
    const resp = await fetch("/api/ai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system, messages, max_tokens, model, forceProvider }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || data?.error) {
      throw new Error(data?.error || `HTTP ${resp.status}`);
    }
    const text = data?.content?.[0]?.text || "";
    return { content: [{ type: "text", text }] };
  } catch (err) {
    console.error("[callLLM]", model, err);
    return { content: [{ type: "text", text: `حدث خطأ في الاتصال بالذكاء الاصطناعي: ${err.message || err}` }] };
  }
}

// Analyze a document. Text-based files (md/txt/docx/pdf) are sent as extracted
// text and routed through the default provider (Groq) — same working path as
// the chat feature. Images fall back to a text-only prompt with the filename.
export async function analyzeDocumentLLM({ prompt, fileName, mimeType, base64, text, max_tokens = 1800 }) {
  const userContent = text
    ? `${prompt}\n\n--- محتوى الملف (${fileName}) ---\n${(text || "").substring(0, 60000)}`
    : base64
      ? `${prompt}\n\n--- ملاحظة ---\nهذا ملف صورة/ثنائي (${mimeType || "unknown"}) باسم "${fileName}". لا يمكن استخراج محتوى نصي منه تلقائياً؛ استنتج ما تستطيع من اسم الملف فقط، ثم اترك حقول summary/keywords/importantPages فارغة إن لزم.`
      : `${prompt}\n\n--- الملف ---\n${fileName || "unknown"}`;

  return callLLM({
    max_tokens,
    messages: [{ role: "user", content: userContent }],
  });
}

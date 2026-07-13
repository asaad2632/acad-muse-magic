import { getSelectedModel } from "./config";

// Rough token estimate — no tokenizer dependency, so this is a conservative
// heuristic (chars/3) meant to warn *before* Cerebras' free-tier ~8K token
// context limit rejects the request, not to be exact.
function estimateTokens(text) {
  return Math.ceil((text || "").length / 3);
}
const CEREBRAS_TOKEN_WARNING_THRESHOLD = 6000;

// Unified AI call. Proxied through /api/ai-chat (Lovable AI Gateway server-side).
// Returns Anthropic-shaped: { content: [{ type: "text", text: "..." }], provider }
//
// `model` defaults to the general AI_MODELS dropdown selection (config.js) —
// that dropdown is the single source of truth for every feature that calls
// callLLM. Pass an explicit `model` only for the translator's dedicated Groq
// button (runTranslation), which is intentionally exempt from the dropdown.
export async function callLLM({ system, messages = [], max_tokens = 1024, forceProvider, model } = {}) {
  const resolvedModel = model || getSelectedModel();

  // Cerebras' free tier has a small (~8K token) total context — check before
  // sending so the user gets a clear message instead of an opaque API error.
  if (resolvedModel.startsWith("cerebras/")) {
    const combined = [
      system,
      ...messages.map((m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content))),
    ]
      .filter(Boolean)
      .join("\n");
    if (estimateTokens(combined) > CEREBRAS_TOKEN_WARNING_THRESHOLD) {
      const limitErr = new Error("النص طويل جداً لهذا النموذج، جرّب موديل آخر من القائمة أو قسّم النص");
      limitErr.isNetworkError = false;
      limitErr.isTokenLimitError = true;
      throw limitErr;
    }
  }

  let resp;
  try {
    resp = await fetch("/api/ai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system, messages, max_tokens, model: resolvedModel, forceProvider }),
    });
  } catch (err) {
    // fetch() itself only throws for genuine network failures (offline, DNS,
    // connection refused, CORS) — never for HTTP error statuses.
    console.error("[callLLM] network error", resolvedModel, err);
    const netErr = new Error(err?.message || "network error");
    netErr.isNetworkError = true;
    throw netErr;
  }
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data?.error) {
    console.error("[callLLM] API error", resolvedModel, resp.status, data?.error);
    const apiErr = new Error(data?.error || `HTTP ${resp.status}`);
    apiErr.isNetworkError = false;
    throw apiErr;
  }
  const text = data?.content?.[0]?.text || "";
  return { content: [{ type: "text", text }], provider: data?.provider };
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

// Historical-analysis feature — the translator's "ترجم بـ Gemini" button.
// Proxied through /api/gemini-analyze, a standalone server route with its own
// key (GEMINI_API_KEY), fixed to Gemini and independent of the general
// AI_MODELS dropdown / callLLM's Groq-Lovable-OpenRouter routing.
export async function analyzeHistoricalContext({ prompt, max_tokens = 2000, model }) {
  let resp;
  try {
    resp = await fetch("/api/gemini-analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, max_tokens, model }),
    });
  } catch (err) {
    console.error("[analyzeHistoricalContext] network error", err);
    const netErr = new Error(err?.message || "network error");
    netErr.isNetworkError = true;
    throw netErr;
  }
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data?.error) {
    console.error("[analyzeHistoricalContext] API error", resp.status, data?.error);
    const apiErr = new Error(data?.error || `HTTP ${resp.status}`);
    apiErr.isNetworkError = false;
    throw apiErr;
  }
  const text = data?.content?.[0]?.text || "";
  return { content: [{ type: "text", text }] };
}

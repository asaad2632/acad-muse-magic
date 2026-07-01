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

// Analyze a document. For PDFs we send the file as a multimodal block to Gemini
// (handles OCR for scanned PDFs natively). For text-based files (md/txt/docx text)
// we just send the extracted text. Always routed through Lovable Cloud (Gemini).
export async function analyzeDocumentLLM({ prompt, fileName, mimeType, base64, text, max_tokens = 1800 }) {
  const userContent = base64
    ? [
        { type: "text", text: prompt },
        {
          type: "file",
          file: {
            filename: fileName || "document.pdf",
            file_data: `data:${mimeType || "application/pdf"};base64,${base64}`,
          },
        },
      ]
    : `${prompt}\n\n--- محتوى الملف (${fileName}) ---\n${(text || "").substring(0, 60000)}`;

  return callLLM({
    forceProvider: "lovable",
    max_tokens,
    messages: [{ role: "user", content: userContent }],
  });
}

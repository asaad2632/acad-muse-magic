// AI model configuration. The app proxies all calls through /api/ai-chat.
// Providers: Groq (user's own key), Cerebras (user's own key, ~8K token
// free-tier context — see callLLM's pre-flight length check in aiClient.js),
// Lovable Cloud (Gemini gateway), Gemini (direct), Azure OpenAI (direct), and OpenRouter (free-tier
// community-hosted models).

export const AI_MODELS = [
  { id: "groq/llama-3.3-70b-versatile", label: "Groq — Llama 3.3 70B (مفتاحك الخاص)" },
  { id: "cerebras/gemma-4-31b", label: "Cerebras — سرعة فائقة (مجاني)" },
  { id: "openrouter/meta-llama/llama-3.3-70b-instruct:free", label: "OpenRouter — Llama 3.3 70B (مجاني)" },
  { id: "google/gemini-3-flash-preview", label: "Lovable Cloud — Gemini 3 Flash" },
  { id: "gemini/gemini-2.5-flash", label: "Gemini — دقة عالية (2.5 Flash، حصة يومية محدودة)" },
  { id: "gemini/gemini-2.5-flash-lite", label: "Gemini — سرعة عالية (2.5 Flash Lite، حصة أعلى بكثير)" },
  { id: "azure-openai/gpt-4o-mini", label: "Azure OpenAI — GPT-4o Mini" },
];

export const MODEL_STORAGE_KEY = "acadarchiv_ai_model";
export const DEFAULT_MODEL = "groq/llama-3.3-70b-versatile";

export function getSelectedModel() {
  try {
    const v = localStorage.getItem(MODEL_STORAGE_KEY);
    if (v && AI_MODELS.some(m => m.id === v)) return v;
  } catch {}
  return DEFAULT_MODEL;
}

export function setSelectedModel(id) {
  try { localStorage.setItem(MODEL_STORAGE_KEY, id); } catch {}
}

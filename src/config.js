// AI model configuration. The app proxies all calls through /api/ai-chat.
// Three providers: Groq (user's own key), Lovable Cloud (Gemini gateway),
// and OpenRouter (free-tier community-hosted models).

export const AI_MODELS = [
  { id: "groq/llama-3.3-70b-versatile", label: "Groq — Llama 3.3 70B (مفتاحك الخاص)" },
  { id: "openrouter/meta-llama/llama-3.3-70b-instruct:free", label: "OpenRouter — Llama 3.3 70B (مجاني)" },
  { id: "google/gemini-3-flash-preview", label: "Lovable Cloud — Gemini 3 Flash" },
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

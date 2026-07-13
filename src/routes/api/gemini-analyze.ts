import { createFileRoute } from "@tanstack/react-router";

// Standalone route backing the "ترجم بـ Gemini" translator button. Deliberately
// fixed to Gemini and fully independent of the general AI_MODELS dropdown
// (config.js) — the dropdown is the source of truth for every other AI
// feature (see /api/ai-chat), but this one and its Groq-button sibling
// (runTranslation, which calls /api/ai-chat with an explicit forced model)
// are intentionally exempt.
// On 429/5xx this retries against the other Gemini flash variant, but never
// falls back to Groq — if both Gemini variants fail, the error is surfaced.

export const Route = createFileRoute("/api/gemini-analyze")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            prompt?: string;
            max_tokens?: number;
            model?: string;
          };
          const prompt = (body.prompt || "").trim();
          if (!prompt) {
            return new Response(JSON.stringify({ error: "Missing prompt" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const key = (process.env.GEMINI_API_KEY || "").trim();
          if (!key) {
            return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }

          // The caller (runHistoricalAnalysis in App.jsx) always passes
          // gemini-2.5-flash-lite explicitly — higher free-tier quota, tried
          // first — falling back to gemini-2.5-flash below on 429/5xx.
          // "thinking" mode is disabled to leave the whole token budget for
          // the actual JSON response.
          const model = (body.model || "gemini-2.5-flash-lite").trim();
          const OTHER_MODEL = model === "gemini-2.5-flash-lite" ? "gemini-2.5-flash" : "gemini-2.5-flash-lite";

          function callGemini(m: string) {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`;
            const payload = JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: {
                maxOutputTokens: body.max_tokens ?? 2000,
                thinkingConfig: { thinkingBudget: 0 },
              },
            });
            return fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: payload,
            });
          }

          // Retry the requested model a few times on 429/5xx (transient
          // "high demand" 503s are common on free-tier Gemini), then fall
          // back to the other flash variant as a last resort.
          let resp: Response | null = null;
          let lastErrText = "";
          for (let attempt = 0; attempt < 3; attempt++) {
            resp = await callGemini(model);
            if (resp.ok) break;
            if (resp.status !== 429 && resp.status < 500) break;
            lastErrText = await resp.text().catch(() => "");
            await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
          }

          // Last resort: retry once against the other Gemini flash variant.
          // Deliberately does NOT fall back to Groq — this button is meant to
          // stay Gemini-only even if both variants are unavailable.
          if (resp && !resp.ok && (resp.status === 429 || resp.status >= 500)) {
            const fbResp = await callGemini(OTHER_MODEL);
            if (fbResp.ok) resp = fbResp;
          }

          if (!resp || !resp.ok) {
            const txt = resp ? await resp.text().catch(() => lastErrText) : lastErrText;
            const status = resp?.status ?? 502;
            return new Response(JSON.stringify({ error: `Gemini API ${status}: ${txt}` }), {
              status,
              headers: { "Content-Type": "application/json" },
            });
          }

          const data = await resp.json();
          const text =
            data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
          return new Response(JSON.stringify({ content: [{ type: "text", text }] }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";

// Standalone route for the "historical analysis" feature. Deliberately separate
// from /api/ai-chat (Groq/OpenRouter/Lovable translation path) — calls Gemini
// directly with its own server-only key, so a Gemini outage/quota issue can
// never affect the existing translation flow.

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

          // gemini-2.0-flash returns 429/quota-exhausted on some free-tier keys;
          // gemini-2.5-flash is the model actually available by default. Its
          // "thinking" mode consumes output tokens before the real answer, so
          // it's disabled here to leave the whole budget for the JSON response.
          // Caller may override with gemini-2.5-flash-lite for a much higher
          // free-tier quota at lower accuracy (see AI_MODELS in config.js).
          const model = (body.model || "gemini-2.5-flash").trim();
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
          const payload = JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: body.max_tokens ?? 2000,
              thinkingConfig: { thinkingBudget: 0 },
            },
          });

          const resp = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
          });

          if (!resp.ok) {
            const txt = await resp.text().catch(() => "");
            return new Response(JSON.stringify({ error: `Gemini API ${resp.status}: ${txt}` }), {
              status: resp.status,
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

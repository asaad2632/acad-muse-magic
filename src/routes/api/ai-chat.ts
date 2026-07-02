import { createFileRoute } from "@tanstack/react-router";

type ChatMsg = { role: "user" | "assistant" | "system"; content: unknown };

type Provider = "groq" | "lovable" | "openrouter";

function toOpenAIMessages(messages: ChatMsg[], system?: string, allowMultimodal = false) {
  const msgs: { role: string; content: unknown }[] = [];
  if (system) msgs.push({ role: "system", content: system });
  for (const m of messages || []) {
    const role = m.role === "assistant" ? "assistant" : m.role === "system" ? "system" : "user";
    let content: unknown;
    if (typeof m.content === "string") content = m.content;
    else if (allowMultimodal && Array.isArray(m.content)) content = m.content;
    else content = JSON.stringify(m.content);
    msgs.push({ role, content });
  }
  return msgs;
}

function detectProvider(model: string, forceProvider?: string): Provider {
  if (forceProvider === "lovable") return "lovable";
  if (forceProvider === "groq") return "groq";
  if (forceProvider === "openrouter") return "openrouter";
  if (model.startsWith("groq/")) return "groq";
  if (model.startsWith("openrouter/")) return "openrouter";
  return "lovable";
}

export const Route = createFileRoute("/api/ai-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            system?: string;
            messages?: ChatMsg[];
            max_tokens?: number;
            model?: string;
            forceProvider?: Provider;
          };
          const requestedModel = body.model || "groq/llama-3.3-70b-versatile";
          const provider = detectProvider(requestedModel, body.forceProvider);
          // If caller forced lovable but sent a groq/openrouter model id, swap to a lovable model.
          const model =
            body.forceProvider === "lovable" && !requestedModel.startsWith("google/")
              ? "google/gemini-2.5-flash"
              : requestedModel;

          let endpoint: string;
          let headers: Record<string, string>;
          let sendModel: string;
          const allowMultimodal = provider === "lovable";

          if (provider === "groq") {
            const gKey = (process.env.GROQ_API_KEY || "").trim().replace(/^["']|["']$/g, "");
            if (!gKey) {
              return new Response(JSON.stringify({ error: "Missing GROQ_API_KEY" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
              });
            }
            endpoint = "https://api.groq.com/openai/v1/chat/completions";
            headers = {
              "Content-Type": "application/json",
              Authorization: `Bearer ${gKey}`,
              Accept: "application/json",
            };
            sendModel = model.replace(/^groq\//, "");
          } else if (provider === "openrouter") {
            const orKey = (process.env.OPENROUTER_API_KEY || "").trim().replace(/^["']|["']$/g, "");
            if (!orKey) {
              return new Response(JSON.stringify({ error: "Missing OPENROUTER_API_KEY" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
              });
            }
            endpoint = "https://openrouter.ai/api/v1/chat/completions";
            headers = {
              "Content-Type": "application/json",
              Authorization: `Bearer ${orKey}`,
              Accept: "application/json",
              // OpenRouter recommends these two headers for attribution but they are optional.
              "HTTP-Referer": "https://acadarchiv.app",
              "X-Title": "AcadArchiv",
            };
            sendModel = model.replace(/^openrouter\//, "");
          } else {
            const key = process.env.LOVABLE_API_KEY;
            if (!key) {
              return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
              });
            }
            endpoint = "https://ai.gateway.lovable.dev/v1/chat/completions";
            headers = {
              "Content-Type": "application/json",
              "Lovable-API-Key": key,
            };
            sendModel = model;
          }

          const payload = JSON.stringify({
            model: sendModel,
            messages: toOpenAIMessages(body.messages || [], body.system, allowMultimodal),
            max_tokens: body.max_tokens ?? 1024,
          });

          let resp: Response | null = null;
          let lastErrText = "";
          for (let attempt = 0; attempt < 3; attempt++) {
            resp = await fetch(endpoint, { method: "POST", headers, body: payload });
            if (resp.ok) break;
            if (resp.status !== 429 && resp.status < 500) break;
            lastErrText = await resp.text().catch(() => "");
            await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
          }

          // Fallback: if the primary provider is still failing with 5xx/429, try Lovable
          // Cloud (Gemini) as a last resort — only for Groq/OpenRouter primaries, since
          // Lovable itself is the fallback target.
          if (
            resp &&
            !resp.ok &&
            provider !== "lovable" &&
            (resp.status === 429 || resp.status >= 500)
          ) {
            const key = process.env.LOVABLE_API_KEY;
            if (key) {
              const fbPayload = JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: toOpenAIMessages(body.messages || [], body.system, true),
                max_tokens: body.max_tokens ?? 1024,
              });
              resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
                body: fbPayload,
              });
            }
          }

          if (!resp || !resp.ok) {
            const txt = resp ? await resp.text().catch(() => lastErrText) : lastErrText;
            const status = resp?.status ?? 502;
            return new Response(JSON.stringify({ error: `AI Gateway ${status}: ${txt}` }), {
              status,
              headers: { "Content-Type": "application/json" },
            });
          }
          const data = await resp.json();
          const text = data?.choices?.[0]?.message?.content || "";
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

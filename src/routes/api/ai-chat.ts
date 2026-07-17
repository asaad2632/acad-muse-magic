import { createFileRoute } from "@tanstack/react-router";

type ChatMsg = { role: "user" | "assistant" | "system"; content: unknown };

type Provider = "groq" | "lovable" | "openrouter" | "gemini" | "cerebras" | "azure-openai";

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

// Gemini's generateContent API has its own shape: no "system" role inside the
// turn list (it's a separate top-level systemInstruction), and the assistant
// role is called "model" rather than "assistant".
function toGeminiPart(item: unknown): { text?: string; inlineData?: { mimeType: string; data: string } } {
  if (item && typeof item === "object" && (item as { type?: string }).type === "image_url") {
    const url: string = (item as { image_url?: { url?: string } }).image_url?.url || "";
    const match = /^data:([^;]+);base64,(.+)$/.exec(url);
    if (match) return { inlineData: { mimeType: match[1], data: match[2] } };
    return { text: "" };
  }
  if (item && typeof item === "object" && (item as { type?: string }).type === "text") {
    return { text: (item as { text?: string }).text || "" };
  }
  return { text: JSON.stringify(item) };
}

function toGeminiContents(messages: ChatMsg[]) {
  return (messages || [])
    .filter((m) => m.role !== "system")
    .map((m) => {
      const role = m.role === "assistant" ? "model" : "user";
      const parts = Array.isArray(m.content)
        ? m.content.map(toGeminiPart)
        : [{ text: typeof m.content === "string" ? m.content : JSON.stringify(m.content) }];
      return { role, parts };
    });
}

function detectProvider(model: string, forceProvider?: string): Provider {
  if (forceProvider === "lovable") return "lovable";
  if (forceProvider === "groq") return "groq";
  if (forceProvider === "openrouter") return "openrouter";
  if (forceProvider === "gemini") return "gemini";
  if (forceProvider === "cerebras") return "cerebras";
  if (forceProvider === "azure-openai") return "azure-openai";
  if (model === "azure-openai" || model.startsWith("azure-openai/")) return "azure-openai";
  if (model.startsWith("groq/")) return "groq";
  if (model.startsWith("openrouter/")) return "openrouter";
  if (model.startsWith("gemini/")) return "gemini";
  if (model.startsWith("cerebras/")) return "cerebras";
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
              : body.forceProvider === "gemini" && !requestedModel.startsWith("gemini/")
                ? "gemini/gemini-2.5-flash"
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
          } else if (provider === "gemini") {
            const gemKey = (process.env.GEMINI_API_KEY || "").trim();
            if (!gemKey) {
              return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
              });
            }
            sendModel = model.replace(/^gemini\//, "");
            endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${sendModel}:generateContent?key=${gemKey}`;
            headers = { "Content-Type": "application/json" };
          } else if (provider === "cerebras") {
            const cKey = (process.env.CEREBRAS_API_KEY || "").trim().replace(/^["']|["']$/g, "");
            if (!cKey) {
              return new Response(JSON.stringify({ error: "Missing CEREBRAS_API_KEY" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
              });
            }
            // OpenAI-compatible chat completions API.
            endpoint = "https://api.cerebras.ai/v1/chat/completions";
            headers = {
              "Content-Type": "application/json",
              Authorization: `Bearer ${cKey}`,
              Accept: "application/json",
            };
            sendModel = model.replace(/^cerebras\//, "");
          } else if (provider === "azure-openai") {
            const azKey = (process.env.AZURE_OPENAI_API_KEY || "").trim().replace(/^["']|["']$/g, "");
            const azEndpointRaw = (process.env.AZURE_OPENAI_ENDPOINT || "").trim().replace(/^["']|["']$/g, "");
            const azDeploymentFromModel = model.split("/")[1]?.trim() || "";
            const azDeploymentFromEnv = (process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "")
              .trim()
              .replace(/^["']|["']$/g, "");
            const azDeployment = azDeploymentFromModel || azDeploymentFromEnv;

            if (!azKey) {
              return new Response(JSON.stringify({ error: "Missing AZURE_OPENAI_API_KEY" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
              });
            }
            if (!azEndpointRaw) {
              return new Response(JSON.stringify({ error: "Missing AZURE_OPENAI_ENDPOINT" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
              });
            }
            if (!azDeployment) {
              return new Response(JSON.stringify({ error: "Missing Azure deployment in model id or AZURE_OPENAI_DEPLOYMENT_NAME" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
              });
            }

            const azEndpoint = azEndpointRaw.replace(/\/$/, "");
            endpoint = `${azEndpoint}/openai/deployments/${encodeURIComponent(azDeployment)}/chat/completions?api-version=2024-10-21`;
            headers = {
              "Content-Type": "application/json",
              "api-key": azKey,
              Accept: "application/json",
            };
            // Azure deployment is selected via URL path.
            sendModel = azDeployment;
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

          const payload =
            provider === "gemini"
              ? JSON.stringify({
                  ...(body.system ? { systemInstruction: { parts: [{ text: body.system }] } } : {}),
                  contents: toGeminiContents(body.messages || []),
                  generationConfig: {
                    maxOutputTokens: body.max_tokens ?? 1024,
                    thinkingConfig: { thinkingBudget: 0 },
                  },
                })
              : JSON.stringify({
                  model: sendModel,
                  messages: toOpenAIMessages(body.messages || [], body.system, allowMultimodal),
                  max_tokens: body.max_tokens ?? 1024,
                });

          // Tracks the shape of whatever response ends up in `resp` — starts matching
          // the primary provider, but flips to "openai" if the Lovable fallback below
          // ends up serving the response instead (Lovable's gateway is OpenAI-shaped
          // even when the primary provider was Gemini).
          let respShape: "openai" | "gemini" = provider === "gemini" ? "gemini" : "openai";
          // Tracks which provider actually ends up serving the response, so the
          // client can tell when a fallback kicked in (see the `provider` field
          // on the returned JSON below).
          let respProvider: string = provider;

          let resp: Response | null = null;
          let lastErrText = "";
          for (let attempt = 0; attempt < 3; attempt++) {
            resp = await fetch(endpoint, { method: "POST", headers, body: payload });
            if (resp.ok) break;
            if (resp.status !== 429 && resp.status < 500) break;
            lastErrText = await resp.text().catch(() => "");
            await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
          }

          // Fallback on 429/5xx from the primary provider.
          // - Gemini and Cerebras fall back to Groq: both have tight free-tier
          //   limits (Gemini's daily quota, Cerebras' ~8K token context), and
          //   Groq is a genuinely different backend/quota rather than another
          //   Gemini-backed path.
          // - Groq/OpenRouter primaries keep the existing Lovable Cloud
          //   (Gemini gateway) fallback — unrelated to the above.
          if (resp && !resp.ok && provider !== "lovable" && (resp.status === 429 || resp.status >= 500)) {
            if (provider === "gemini" || provider === "cerebras") {
              const gKey = (process.env.GROQ_API_KEY || "").trim().replace(/^["']|["']$/g, "");
              if (gKey) {
                const fbPayload = JSON.stringify({
                  model: "llama-3.3-70b-versatile",
                  messages: toOpenAIMessages(body.messages || [], body.system, false),
                  max_tokens: body.max_tokens ?? 1024,
                });
                resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${gKey}`,
                    Accept: "application/json",
                  },
                  body: fbPayload,
                });
                respShape = "openai";
                if (resp.ok) respProvider = "groq";
              }
            } else {
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
                respShape = "openai";
                if (resp.ok) respProvider = "lovable";
              }
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
          const text =
            respShape === "gemini"
              ? data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || ""
              : data?.choices?.[0]?.message?.content || "";
          return new Response(JSON.stringify({ content: [{ type: "text", text }], provider: respProvider }), {
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

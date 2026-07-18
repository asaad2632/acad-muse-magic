import { createFileRoute } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";

// TEMPORARY diagnostic route — reveals ONLY which DB host this specific
// deployment is actually configured against, plus whether each expected
// secret is present (booleans only, never values). No auth required
// (mirrors /api/session, which is also unauthenticated by design) since
// nothing here is sensitive on its own. Remove once the Preview/Production
// env var mismatch is confirmed and fixed.
export const Route = createFileRoute("/api/debug-env")({
  server: {
    handlers: {
      GET: async () => {
        let dbHost = "ERROR_PARSING";
        const raw = process.env.DATABASE_URL || "";
        try {
          const url = new URL(raw);
          dbHost = url.hostname + url.pathname;
        } catch {
          dbHost = raw ? "SET_BUT_UNPARSEABLE" : "NOT_SET";
        }
        const dbUrlShape = raw
          ? {
              length: raw.length,
              hasLeadingOrTrailingWhitespace: raw !== raw.trim(),
              hasWrappingQuotes: /^['"].*['"]$/.test(raw.trim()),
              hasNewline: /[\r\n]/.test(raw),
              startsWithPostgres: /^postgres(ql)?:\/\//.test(raw.trim()),
              first4Chars: raw.slice(0, 4),
              last4Chars: raw.slice(-4),
            }
          : null;
        // Cross-check against Cloudflare's native binding path (Nitro's
        // cloudflare-pages preset attaches the raw `env` from
        // fetch(request, env, context) onto the request as
        // req.runtime.cloudflare.env — see node_modules/nitro/dist/presets/
        // cloudflare/runtime/cloudflare-pages.mjs). process.env only works
        // here at all because of the nodejs_compat compatibility flag; this
        // checks whether the dashboard-configured vars are reaching the
        // Worker via the *Cloudflare-native* path even if process.env
        // doesn't see them, to isolate a process.env bridging gap from a
        // "vars never reached this Worker" dashboard/project problem.
        let cfEnvKeys = null;
        let cfEnvError = null;
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- runtime-augmented
          // property (see comment above), not part of the DOM Request type.
          const cfEnv = (getRequest() as any)?.runtime?.cloudflare?.env;
          cfEnvKeys = cfEnv
            ? {
                hasDatabaseUrl: !!cfEnv.DATABASE_URL,
                hasSessionSecret: !!cfEnv.SESSION_SECRET,
                hasR2AccountId: !!cfEnv.R2_ACCOUNT_ID,
              }
            : "NO_CLOUDFLARE_ENV_ON_REQUEST";
        } catch (err) {
          cfEnvError = err instanceof Error ? err.message : String(err);
        }
        return new Response(
          JSON.stringify({
            dbHost,
            dbUrlShape,
            cfEnvKeys,
            cfEnvError,
            hasSessionSecret: !!process.env.SESSION_SECRET,
            hasGroqKey: !!process.env.GROQ_API_KEY,
            hasGeminiKey: !!process.env.GEMINI_API_KEY,
            hasOpenrouterKey: !!process.env.OPENROUTER_API_KEY,
            hasCerebrasKey: !!process.env.CEREBRAS_API_KEY,
            hasR2AccountId: !!process.env.R2_ACCOUNT_ID,
            hasR2AccessKeyId: !!process.env.R2_ACCESS_KEY_ID,
            hasR2SecretAccessKey: !!process.env.R2_SECRET_ACCESS_KEY,
            hasR2BucketName: !!process.env.R2_BUCKET_NAME,
            cfPagesBranch: process.env.CF_PAGES_BRANCH || null,
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});

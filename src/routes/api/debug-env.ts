import { createFileRoute } from "@tanstack/react-router";

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
        try {
          const url = new URL(process.env.DATABASE_URL || "");
          dbHost = url.hostname + url.pathname;
        } catch {
          dbHost = process.env.DATABASE_URL ? "SET_BUT_UNPARSEABLE" : "NOT_SET";
        }
        return new Response(
          JSON.stringify({
            dbHost,
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

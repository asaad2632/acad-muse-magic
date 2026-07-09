import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "../../integrations/supabase/client";

// Server-side proxy in front of src/spacesStorage.js (DigitalOcean Spaces).
// The Spaces secret key must never reach the browser, so all reads/writes of
// thesis-files-style uploads go through this route instead of calling
// spacesStorage.js directly from client code. Mirrors the auth check used by
// src/integrations/supabase/auth-middleware.ts, but as a plain function here
// since this is a file-route handler, not a server function.

const MAX_FILE_SIZE = 500 * 1024 * 1024; // matches MAX_LIB_FILE_SIZE in App.jsx

function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function authenticate(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id;
}

// Object keys are always `${userId}/...` (see buildStorageKey in
// spacesStorage.js) so ownership is just a prefix check.
function assertOwnedPath(path: string, userId: string): boolean {
  return path.startsWith(`${userId}/`);
}

export const Route = createFileRoute("/api/spaces-storage")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await authenticate(request);
          if (!userId) return jsonError("Unauthorized", 401);

          const form = await request.formData();
          const file = form.get("file");
          if (!(file instanceof File)) return jsonError("Missing file");
          if (file.size > MAX_FILE_SIZE) return jsonError("File too large", 413);

          const { uploadFile, buildStorageKey } = await import("../../spacesStorage.js");
          const key = buildStorageKey(userId, file.name);
          const buffer = Buffer.from(await file.arrayBuffer());
          const storagePath = await uploadFile(key, buffer, file.type || undefined);
          if (!storagePath) return jsonError("Upload failed", 502);

          return new Response(JSON.stringify({ storagePath }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          return jsonError(String((e as Error)?.message || e), 500);
        }
      },

      GET: async ({ request }) => {
        try {
          const userId = await authenticate(request);
          if (!userId) return jsonError("Unauthorized", 401);

          const path = new URL(request.url).searchParams.get("path") || "";
          if (!path || !assertOwnedPath(path, userId)) return jsonError("Forbidden", 403);

          const { getSignedUrl } = await import("../../spacesStorage.js");
          const signedUrl = getSignedUrl(path, 3600);
          return new Response(JSON.stringify({ signedUrl }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          return jsonError(String((e as Error)?.message || e), 500);
        }
      },

      DELETE: async ({ request }) => {
        try {
          const userId = await authenticate(request);
          if (!userId) return jsonError("Unauthorized", 401);

          const path = new URL(request.url).searchParams.get("path") || "";
          if (!path || !assertOwnedPath(path, userId)) return jsonError("Forbidden", 403);

          const { deleteFile } = await import("../../spacesStorage.js");
          await deleteFile(path);
          return new Response(JSON.stringify({ ok: true }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          return jsonError(String((e as Error)?.message || e), 500);
        }
      },
    },
  },
});

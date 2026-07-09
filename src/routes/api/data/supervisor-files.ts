import { createFileRoute } from "@tanstack/react-router";

// Row metadata only — the actual file bytes go through /api/spaces-storage
// (see src/spacesStorage.js). ownerCol is uploaded_by here, not created_by.

function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/data/supervisor-files")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { getSessionUser } = await import("../../../session.server");
          const user = await getSessionUser();
          if (!user) return jsonError("Unauthorized", 401);

          const { loadShared } = await import("../../../dataAccess.server");
          const rows = await loadShared("supervisor_files");
          return new Response(JSON.stringify(rows), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          return jsonError(String((e as Error)?.message || e), 500);
        }
      },
      POST: async ({ request }) => {
        try {
          const { getSessionUser } = await import("../../../session.server");
          const user = await getSessionUser();
          if (!user) return jsonError("Unauthorized", 401);

          const rows = (await request.json()) as Record<string, unknown>[];
          const { syncShared } = await import("../../../dataAccess.server");
          await syncShared("supervisor_files", "uploaded_by", user.id, rows);
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

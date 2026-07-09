import { createFileRoute } from "@tanstack/react-router";

// library_sources — bespoke per-row endpoint (not a whole-set sync) so the
// Library UI's immediate writes land without waiting for a debounce.
//   GET            -> load the full shared-workspace set
//   POST   {row}    -> insert-or-update one row (ON CONFLICT upsert)
//   PATCH  {clientId, patch} -> partial update of one row
//   DELETE ?clientId=      -> delete one row
//   DELETE {clientIds:[]}  -> bulk delete (single round trip)

function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/data/library")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { getSessionUser } = await import("../../../session.server");
          const user = await getSessionUser();
          if (!user) return jsonError("Unauthorized", 401);

          const { loadLibraryRows } = await import("../../../dataAccess.server");
          const rows = await loadLibraryRows();
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

          const row = (await request.json()) as Record<string, unknown>;
          const { insertLibraryRow } = await import("../../../dataAccess.server");
          await insertLibraryRow(user.id, row);
          return new Response(JSON.stringify({ ok: true }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          return jsonError(String((e as Error)?.message || e), 500);
        }
      },
      PATCH: async ({ request }) => {
        try {
          const { getSessionUser } = await import("../../../session.server");
          const user = await getSessionUser();
          if (!user) return jsonError("Unauthorized", 401);

          const body = (await request.json()) as {
            clientId?: string;
            patch?: Record<string, unknown>;
          };
          if (!body.clientId || !body.patch) return jsonError("Missing clientId/patch");
          const { updateLibraryRow } = await import("../../../dataAccess.server");
          await updateLibraryRow(user.id, String(body.clientId), body.patch);
          return new Response(JSON.stringify({ ok: true }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          return jsonError(String((e as Error)?.message || e), 500);
        }
      },
      DELETE: async ({ request }) => {
        try {
          const { getSessionUser } = await import("../../../session.server");
          const user = await getSessionUser();
          if (!user) return jsonError("Unauthorized", 401);

          const { deleteLibraryRow, deleteLibraryRows } =
            await import("../../../dataAccess.server");
          const url = new URL(request.url);
          const clientId = url.searchParams.get("clientId");
          if (clientId) {
            await deleteLibraryRow(user.id, clientId);
            return new Response(JSON.stringify({ ok: true }), {
              headers: { "Content-Type": "application/json" },
            });
          }

          const body = (await request.json().catch(() => null)) as { clientIds?: unknown[] } | null;
          const clientIds = (body?.clientIds || []).map((x) => String(x));
          const count = await deleteLibraryRows(user.id, clientIds);
          return new Response(JSON.stringify({ ok: true, count }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          return jsonError(String((e as Error)?.message || e), 500);
        }
      },
    },
  },
});

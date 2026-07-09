import { createFileRoute } from "@tanstack/react-router";

// GET ?limit=  -> unread supervisor-room items (loadNotifications)
// POST         -> mark all read (bumps notification_reads.last_read_at)

function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/data/notifications")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { getSessionUser } = await import("../../../session.server");
          const user = await getSessionUser();
          if (!user) return jsonError("Unauthorized", 401);

          const url = new URL(request.url);
          const limit = Number(url.searchParams.get("limit")) || 20;
          const { loadNotifications } = await import("../../../dataAccess.server");
          const result = await loadNotifications(user.id, limit);
          return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          return jsonError(String((e as Error)?.message || e), 500);
        }
      },
      POST: async () => {
        try {
          const { getSessionUser } = await import("../../../session.server");
          const user = await getSessionUser();
          if (!user) return jsonError("Unauthorized", 401);

          const { markAllNotificationsRead } = await import("../../../dataAccess.server");
          await markAllNotificationsRead(user.id);
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

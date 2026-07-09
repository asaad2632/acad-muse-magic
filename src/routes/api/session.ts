import { createFileRoute } from "@tanstack/react-router";

// A probe, not a gate: always 200, { user } or { user: null }. Used by the
// _authenticated router guard and App.jsx's header.
export const Route = createFileRoute("/api/session")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { getSessionUser } = await import("../../session.server");
          const user = await getSessionUser();
          return new Response(JSON.stringify({ user }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          console.error("[session]", e);
          return new Response(JSON.stringify({ user: null }), {
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});

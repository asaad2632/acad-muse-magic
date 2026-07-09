import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/logout")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { destroySession } = await import("../../session.server");
          await destroySession();
        } catch (e) {
          console.error("[logout]", e);
        }
        return new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});

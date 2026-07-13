import { createFileRoute } from "@tanstack/react-router";

// Login: verifies against the local `users` table in Neon Postgres.
// See src/db.server.ts, src/passwordHash.server.ts, src/session.server.ts.

const GENERIC_ERROR = "بيانات الدخول غير صحيحة";

function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { email?: string; password?: string };
          const email = (body.email || "").trim();
          const password = body.password || "";
          if (!email || !password) return jsonError(GENERIC_ERROR, 401);

          const { db } = await import("../../db.server");
          const { verifyPassword } = await import("../../passwordHash.server");
          const { createSession } = await import("../../session.server");

          const { rows } = await db.query(
            "SELECT id, email, password_hash, role, token_version FROM users WHERE email = $1",
            [email],
          );
          const row = rows[0];
          if (!row || !(await verifyPassword(password, row.password_hash))) {
            return jsonError(GENERIC_ERROR, 401);
          }

          await createSession({ id: row.id, role: row.role, tokenVersion: row.token_version });

          return new Response(
            JSON.stringify({ user: { id: row.id, email: row.email, role: row.role } }),
            { headers: { "Content-Type": "application/json" } },
          );
        } catch (e) {
          console.error("[login]", e);
          return jsonError(GENERIC_ERROR, 500);
        }
      },
    },
  },
});

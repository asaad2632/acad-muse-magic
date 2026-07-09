// Server-only. Signed+encrypted session cookie, built on TanStack Start's
// built-in h3 session primitive (useSession/getSession/updateSession/
// clearSession) rather than hand-rolled crypto — this is a maintained,
// already-a-transitive-dependency primitive, not a new one.
//
// SECURITY: never import from client-bundled code. Session payload only
// carries {sub, role, tokenVersion} — never secrets.
import { getSession, updateSession, clearSession } from "@tanstack/react-start/server";

interface SessionData {
  sub: string;
  role: string;
  tokenVersion: number;
}

const SESSION_NAME = "aa_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function sessionConfig() {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error("[session.server] Missing or too-short SESSION_SECRET (needs >= 32 chars)");
  }
  return { password, name: SESSION_NAME, maxAge: MAX_AGE_SECONDS };
}

export async function createSession(user: {
  id: string;
  role: string;
  tokenVersion: number;
}): Promise<void> {
  await updateSession(sessionConfig(), {
    sub: user.id,
    role: user.role,
    tokenVersion: user.tokenVersion,
  });
}

export async function destroySession(): Promise<void> {
  await clearSession(sessionConfig());
}

export async function getSessionUser(): Promise<{
  id: string;
  email: string;
  role: string;
} | null> {
  const session = await getSession<SessionData>(sessionConfig());
  const { sub, tokenVersion } = session.data;
  if (!sub) return null;

  const { db } = await import("./db.server");
  const { rows } = await db.query(
    "SELECT id, email, role, token_version FROM users WHERE id = $1",
    [sub],
  );
  const row = rows[0];
  if (!row || row.token_version !== tokenVersion) return null; // revoked or stale
  return { id: row.id, email: row.email, role: row.role };
}

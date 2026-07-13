// Server-only. Query client for Neon Postgres.
//
// SECURITY: DATABASE_URL carries DB credentials — never import this module
// from client-bundled code (App.jsx, cloudSync.js, or any route/component
// that ships to the browser). Only import it dynamically inside server
// route handlers or other server-only modules.
//
// Uses @neondatabase/serverless's neon() HTTP query function instead of
// `pg`: Cloudflare Pages Functions run on Workers, which don't support raw
// TCP sockets the way `pg` needs. neon() is the *stable* API for this;
// Pool + neonConfig.poolQueryViaFetch (tried first) is documented as
// experimental and has a real bug — when Pool is constructed with a single
// `connectionString` (as opposed to separate user/password/host/database
// fields), its internal fetch bridge mis-parses it, producing a garbled
// "postgresql://undefined:null@<urlencoded-original>/undefined" connection
// string and failing every query. neon() has no such issue and fits our
// usage exactly, since nothing here uses multi-statement transactions
// (no BEGIN/COMMIT) — every call is a standalone query.
import { neon } from "@neondatabase/serverless";

function createSql() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error("[db.server] Missing environment variable: DATABASE_URL");
  }
  return neon(DATABASE_URL);
}

let _sql: ReturnType<typeof createSql> | undefined;

// pg-shaped wrapper (`{ rows, rowCount }`) so dataAccess.server.ts's
// `const { rows } = await db.query(...)` (and the one `rowCount` use in
// deleteLibraryRows) are unchanged — neon()'s sql.query() itself returns
// just the rows array by default, so fullResults:true is requested to get
// rowCount too, matching pg's Result shape.
export const db = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches
  // pg.QueryResult<any>'s own looseness, which every call site already
  // relies on (destructuring specific fields off `rows[i]` untyped).
  async query(text: string, params?: unknown[]): Promise<{ rows: any[]; rowCount: number | null }> {
    if (!_sql) _sql = createSql();
    const result = await _sql.query(text, params ?? [], { fullResults: true });
    return { rows: result.rows, rowCount: result.rowCount };
  },
  // No-op: neon()'s HTTP client has no persistent connection to close. Kept
  // only so scripts/seed-users.ts and scripts/reset-password.ts (one-shot
  // CLIs that call db.end() to let the process exit) don't need editing.
  async end(): Promise<void> {},
};

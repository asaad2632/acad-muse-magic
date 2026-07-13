// Server-only. Connection pool to Neon Postgres.
//
// SECURITY: DATABASE_URL carries DB credentials — never import this module
// from client-bundled code (App.jsx, cloudSync.js, or any route/component
// that ships to the browser). Only import it dynamically inside server
// route handlers or other server-only modules.
//
// Uses @neondatabase/serverless instead of `pg`: Cloudflare Pages Functions
// run on Workers, which don't support raw TCP sockets the way `pg` needs.
// This driver's Pool has the same query(text, params) shape as pg.Pool, so
// dataAccess.server.ts is unchanged — poolQueryViaFetch routes each query
// over plain HTTPS instead of a persistent connection, which is fine since
// nothing here uses multi-statement transactions (no BEGIN/COMMIT).
import { Pool, neonConfig } from "@neondatabase/serverless";

neonConfig.poolQueryViaFetch = true;

function createPool(): Pool {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error("[db.server] Missing environment variable: DATABASE_URL");
  }
  // TLS is handled at the HTTPS layer by the fetch transport — no separate
  // `ssl`/sslmode handling needed the way raw TCP `pg` required.
  return new Pool({
    connectionString: DATABASE_URL,
    max: 5,
  });
}

let _pool: Pool | undefined;

// Lazily-initialized pool, proxied so a missing DATABASE_URL only throws
// when the pool is actually used, not at import time. Method lookups are
// bound to the real Pool instance (not the Proxy) since pg.Pool is a
// stateful EventEmitter that relies on `this` identity internally.
export const db = new Proxy({} as Pool, {
  get(_, prop, receiver) {
    if (!_pool) _pool = createPool();
    const value = Reflect.get(_pool, prop, _pool);
    return typeof value === "function" ? value.bind(_pool) : value;
  },
});

// Server-only. Connection pool to Neon Postgres.
//
// SECURITY: DATABASE_URL carries DB credentials — never import this module
// from client-bundled code (App.jsx, cloudSync.js, or any route/component
// that ships to the browser). Only import it dynamically inside server
// route handlers or other server-only modules.
import { Pool } from "pg";

function createPool(): Pool {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error("[db.server] Missing environment variable: DATABASE_URL");
  }
  // Neon's cert chain is CA-signed, so standard `sslmode=require` in the
  // connection string (parsed by pg-connection-string) is sufficient —
  // no rejectUnauthorized override needed.
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

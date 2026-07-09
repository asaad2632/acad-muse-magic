// Server-only. Connection pool to DigitalOcean Managed Postgres.
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
  // pg-connection-string parses a `sslmode` query param into its own `ssl`
  // object, which then clobbers the explicit `ssl` option below (pg merges
  // parsed-connectionString fields over the passed-in config). Strip it so
  // rejectUnauthorized:false actually takes effect against DO's self-signed
  // chain, instead of falling back to strict verification.
  const connectionString = DATABASE_URL.replace(/([?&])sslmode=[^&]*&?/, "$1").replace(/[?&]$/, "");
  return new Pool({
    connectionString,
    max: 5,
    ssl: { rejectUnauthorized: false },
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

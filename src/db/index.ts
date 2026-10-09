import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  // Fail fast at import time so Vercel returns a clean JSON error
  // instead of hanging and returning an empty response.
  throw new Error("DATABASE_URL is not set. Set the DATABASE_URL environment variable.");
}

const globalForDb = globalThis as typeof globalThis & {
  __starmajPostgresqlPool?: Pool;
};

// Vercel + Alwaysdata PostgreSQL:
// Alwaysdata REQUIRES an SSL connection, and Vercel's runtime may not fully trust
// Alwaysdata's CA chain (certificate CN/chain mismatch), which causes the
// "Erreur de connexion à la base de données" error.
//
// To guarantee a working connection we:
//   1. Strip any `sslmode` from the connection string so it cannot override our
//      explicit SSL option (e.g. if the URL contains sslmode=disable).
//   2. Force SSL with `rejectUnauthorized: false` so the connection is always
//      encrypted but does not fail on strict certificate verification.
//   3. Add a connection timeout so a failing handshake fails fast instead of
//      hanging until the Vercel function times out (which would otherwise produce
//      an empty response → "Unexpected end of JSON input" on the client).
let connectionString = databaseUrl;
try {
  const parsed = new URL(databaseUrl);
  // Remove any sslmode so our explicit ssl option below takes full effect.
  parsed.searchParams.delete("sslmode");
  connectionString = parsed.toString();
} catch {
  // If the URL cannot be parsed, use it as-is (the ssl option below still applies).
  connectionString = databaseUrl;
}

const pool =
  globalForDb.__starmajPostgresqlPool ??
  new Pool({
    connectionString,
    // Force SSL with relaxed certificate verification (Vercel + Alwaysdata).
    ssl: { rejectUnauthorized: false },
    // Fail fast instead of hanging until the Vercel function times out.
    connectionTimeoutMillis: 15000,
    // Vercel Functions: allow the Node.js event loop to exit when the pool is idle.
    allowExitOnIdle: true,
    // Keep connections warm across Vercel function invocations.
    keepAlive: true,
    // Limit concurrent connections to avoid exhausting Alwaysdata's connection limit.
    max: 10,
    idleTimeoutMillis: 30000,
  });

globalForDb.__starmajPostgresqlPool = pool;

export { pool };
export const db = drizzle(pool);

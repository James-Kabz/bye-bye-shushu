import { Pool } from "pg";

function resolveDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL?.trim();

  if (!raw || raw.includes("YOUR-NEON-HOST") || raw.includes("USER:PASSWORD")) {
    throw new Error(
      "DATABASE_URL is missing or still using the placeholder value. Set your Neon connection string in .env.local (local) and Vercel project Environment Variables."
    );
  }

  return raw;
}

const databaseUrl = resolveDatabaseUrl();
const useSsl = !/localhost|127\.0\.0\.1/.test(databaseUrl);
const globalForPool = globalThis as unknown as { pool?: Pool };

export const pool =
  globalForPool.pool ??
  new Pool({
    connectionString: databaseUrl,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    max: 5,
    connectionTimeoutMillis: 10_000
  });

if (process.env.NODE_ENV !== "production") {
  globalForPool.pool = pool;
}

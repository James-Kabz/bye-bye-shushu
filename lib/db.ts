import { Pool } from "pg";

type DbEnvSource = "DATABASE_URL" | "NEON_DATABASE_URL" | "POSTGRES_URL";

function resolveDatabaseUrl(): { url: string; source: DbEnvSource } {
  const candidates: Array<[DbEnvSource, string | undefined]> = [
    ["DATABASE_URL", process.env.DATABASE_URL],
    ["NEON_DATABASE_URL", process.env.NEON_DATABASE_URL],
    ["POSTGRES_URL", process.env.POSTGRES_URL]
  ];

  const found = candidates.find(([, value]) => Boolean(value?.trim()));

  if (!found) {
    throw new Error(
      "No database connection string found. Set DATABASE_URL (or NEON_DATABASE_URL / POSTGRES_URL)."
    );
  }

  const [source, value] = found;
  const raw = value?.trim() ?? "";

  if (!raw || raw.includes("YOUR-NEON-HOST") || raw.includes("USER:PASSWORD")) {
    throw new Error(
      `${source} is missing or still using the placeholder value. Set your Neon connection string in .env.local (local) and Vercel project Environment Variables.`
    );
  }

  return { url: raw, source };
}

function resolveHostLabel(url: string): string {
  try {
    return new URL(url).hostname || "unknown-host";
  } catch {
    return "invalid-url";
  }
}

const { url: databaseUrl, source: databaseSource } = resolveDatabaseUrl();
const databaseHost = resolveHostLabel(databaseUrl);
const useSsl = !/localhost|127\.0\.0\.1/.test(databaseUrl);
const globalForPool = globalThis as unknown as { pool?: Pool };

export const dbConnectionInfo = {
  source: databaseSource,
  host: databaseHost
} as const;

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

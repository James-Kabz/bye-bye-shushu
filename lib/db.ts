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

type ParsedPgConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

function parsePgUrl(url: string): ParsedPgConfig {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Database URL is invalid.");
  }

  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("Database URL must use postgres:// or postgresql://");
  }

  const host = parsed.hostname;
  const port = parsed.port ? Number(parsed.port) : 5432;
  const user = decodeURIComponent(parsed.username);
  const password = decodeURIComponent(parsed.password);
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));

  if (!host) {
    throw new Error("Database host is missing in URL.");
  }

  if (!database) {
    throw new Error("Database name is missing in URL path.");
  }

  return {
    host,
    port,
    user,
    password,
    database
  };
}

const { url: databaseUrl, source: databaseSource } = resolveDatabaseUrl();
const parsedConfig = parsePgUrl(databaseUrl);
const useSsl = !/localhost|127\.0\.0\.1/.test(databaseUrl);
const globalForPool = globalThis as unknown as { pool?: Pool };

export const dbConnectionInfo = {
  source: databaseSource,
  host: parsedConfig.host
} as const;

export const pool =
  globalForPool.pool ??
  new Pool({
    host: parsedConfig.host,
    port: parsedConfig.port,
    user: parsedConfig.user,
    password: parsedConfig.password,
    database: parsedConfig.database,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    max: 5,
    connectionTimeoutMillis: 10_000
  });

if (process.env.NODE_ENV !== "production") {
  globalForPool.pool = pool;
}

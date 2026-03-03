import { z } from "zod";
import { pool } from "@/lib/db";
import { getErrorMessage } from "@/lib/error-utils";
import type { CreateMemoryInput, Memory } from "@/lib/types";

type MemoryRow = {
  id: string;
  title: string;
  category: string;
  story: string | null;
  image_data: string;
  zoom: number;
  rotation: number;
  created_at: string;
};

const imageDataSchema = z
  .string()
  .min(30)
  .max(7_000_000)
  .regex(/^data:image\/(png|jpeg|jpg|webp);base64,/i, "Use PNG, JPG, or WEBP images.");

const createMemorySchema = z.object({
  title: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(80),
  story: z.string().trim().max(3000).optional(),
  imageData: imageDataSchema,
  zoom: z.number().min(1).max(2.8),
  rotation: z.number().min(-180).max(180)
});

let tableReady = false;

async function ensureMemoriesTable() {
  if (tableReady) {
    return;
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        story TEXT,
        image_data TEXT NOT NULL,
        zoom DOUBLE PRECISION NOT NULL DEFAULT 1,
        rotation DOUBLE PRECISION NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  } catch (error) {
    throw new Error(`Could not connect to Neon database: ${getErrorMessage(error)}`);
  }

  tableReady = true;
}

function mapRow(row: MemoryRow): Memory {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    story: row.story,
    imageData: row.image_data,
    zoom: row.zoom,
    rotation: row.rotation,
    createdAt: row.created_at
  };
}

export async function listMemories(): Promise<Memory[]> {
  await ensureMemoriesTable();
  const result = await pool.query<MemoryRow>(
    `SELECT id, title, category, story, image_data, zoom, rotation, created_at
     FROM memories
     ORDER BY created_at DESC`
  );

  return result.rows.map(mapRow);
}

export async function createMemory(input: CreateMemoryInput): Promise<Memory> {
  await ensureMemoriesTable();
  const parsed = createMemorySchema.parse(input);

  const result = await pool.query<MemoryRow>(
    `INSERT INTO memories (id, title, category, story, image_data, zoom, rotation)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, title, category, story, image_data, zoom, rotation, created_at`,
    [
      crypto.randomUUID(),
      parsed.title,
      parsed.category,
      parsed.story || null,
      parsed.imageData,
      parsed.zoom,
      parsed.rotation
    ]
  );

  return mapRow(result.rows[0]);
}

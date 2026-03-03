import { z } from "zod";
import { dbConnectionInfo, pool } from "@/lib/db";
import { getErrorMessage } from "@/lib/error-utils";
import type { CreateMemoryInput, Memory, MemoryPhoto } from "@/lib/types";

type MemoryRow = {
  id: string;
  memory_group_id: string | null;
  title: string;
  category: string;
  story: string | null;
  image_data: string;
  zoom: number;
  rotation: number;
  sort_order: number;
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
  photos: z
    .array(
      z.object({
        imageData: imageDataSchema,
        zoom: z.number().min(1).max(2.8),
        rotation: z.number().min(-180).max(180)
      })
    )
    .min(1, "Please add at least one photo.")
    .max(24, "Please upload up to 24 photos per memory.")
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
        memory_group_id TEXT,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        story TEXT,
        image_data TEXT NOT NULL,
        zoom DOUBLE PRECISION NOT NULL DEFAULT 1,
        rotation DOUBLE PRECISION NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS memory_group_id TEXT;`);
    await pool.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_memories_group_order ON memories (memory_group_id, sort_order);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_memories_created ON memories (created_at DESC);`);
  } catch (error) {
    throw new Error(
      `Could not connect to Neon database (${dbConnectionInfo.source} -> ${dbConnectionInfo.host}): ${getErrorMessage(error)}`
    );
  }

  tableReady = true;
}

function mapRowsToMemories(rows: MemoryRow[]): Memory[] {
  const grouped = new Map<string, Memory>();

  for (const row of rows) {
    const memoryId = row.memory_group_id ?? row.id;

    if (!grouped.has(memoryId)) {
      grouped.set(memoryId, {
        id: memoryId,
        title: row.title,
        category: row.category,
        story: row.story,
        photos: [],
        createdAt: row.created_at
      });
    }

    const memory = grouped.get(memoryId);
    if (!memory) {
      continue;
    }

    const photo: MemoryPhoto = {
      id: row.id,
      imageData: row.image_data,
      zoom: row.zoom,
      rotation: row.rotation,
      sortOrder: row.sort_order ?? 0
    };

    memory.photos.push(photo);

    if (new Date(row.created_at).getTime() > new Date(memory.createdAt).getTime()) {
      memory.createdAt = row.created_at;
    }
  }

  return Array.from(grouped.values())
    .map((memory) => ({
      ...memory,
      photos: memory.photos.sort((a, b) => a.sortOrder - b.sortOrder)
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function listMemories(): Promise<Memory[]> {
  await ensureMemoriesTable();
  const result = await pool.query<MemoryRow>(
    `SELECT
      id,
      memory_group_id,
      title,
      category,
      story,
      image_data,
      zoom,
      rotation,
      sort_order,
      created_at
     FROM memories
     ORDER BY created_at DESC, COALESCE(memory_group_id, id), sort_order ASC`
  );

  return mapRowsToMemories(result.rows);
}

export async function createMemory(input: CreateMemoryInput): Promise<Memory> {
  await ensureMemoriesTable();
  const parsed = createMemorySchema.parse(input);
  const groupId = crypto.randomUUID();

  const values: Array<string | number | null> = [];
  const valueBlocks = parsed.photos.map((photo, index) => {
    const base = index * 9;
    values.push(
      crypto.randomUUID(),
      groupId,
      parsed.title,
      parsed.category,
      parsed.story || null,
      photo.imageData,
      photo.zoom,
      photo.rotation,
      index
    );

    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9})`;
  });

  await pool.query(
    `INSERT INTO memories (
      id,
      memory_group_id,
      title,
      category,
      story,
      image_data,
      zoom,
      rotation,
      sort_order
    ) VALUES ${valueBlocks.join(",")}`,
    values
  );

  const createdRows = await pool.query<MemoryRow>(
    `SELECT
      id,
      memory_group_id,
      title,
      category,
      story,
      image_data,
      zoom,
      rotation,
      sort_order,
      created_at
     FROM memories
     WHERE memory_group_id = $1
     ORDER BY sort_order ASC, created_at ASC`,
    [groupId]
  );

  return mapRowsToMemories(createdRows.rows)[0];
}

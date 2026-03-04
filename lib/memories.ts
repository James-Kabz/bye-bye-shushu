import { z } from "zod";
import { dbConnectionInfo, pool } from "@/lib/db";
import { getErrorMessage } from "@/lib/error-utils";
import type { AppendMemoryPhotosInput, CreateMemoryInput, Memory, MemoryPhoto } from "@/lib/types";

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
        zoom: z.number().min(0.6).max(2.8),
        rotation: z.number().min(-180).max(180)
      })
    )
    .min(1, "Please add at least one photo.")
    .max(20, "Please upload up to 20 photos per memory.")
});

const appendMemoryPhotosSchema = z.object({
  appendToMemoryId: z.string().uuid("Invalid memory selection."),
  photos: z
    .array(
      z.object({
        imageData: imageDataSchema,
        zoom: z.number().min(0.6).max(2.8),
        rotation: z.number().min(-180).max(180)
      })
    )
    .min(1, "Please add at least one photo.")
    .max(20, "Please upload up to 20 photos at a time.")
});

const deleteMemoryPhotoSchema = z.object({
  photoId: z.string().uuid("Invalid photo selection.")
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

export async function appendPhotosToMemory(input: AppendMemoryPhotosInput): Promise<Memory> {
  await ensureMemoriesTable();
  const parsed = appendMemoryPhotosSchema.parse(input);

  const targetMemoryResult = await pool.query<{
    group_id: string;
    title: string;
    category: string;
    story: string | null;
  }>(
    `SELECT
      COALESCE(memory_group_id, id) AS group_id,
      title,
      category,
      story
     FROM memories
     WHERE COALESCE(memory_group_id, id) = $1
     ORDER BY created_at ASC
     LIMIT 1`,
    [parsed.appendToMemoryId]
  );

  const targetMemory = targetMemoryResult.rows[0];
  if (!targetMemory) {
    throw new Error("Selected memory category no longer exists.");
  }

  const sortInfoResult = await pool.query<{ max_sort_order: number }>(
    `SELECT COALESCE(MAX(sort_order), -1) AS max_sort_order
     FROM memories
     WHERE COALESCE(memory_group_id, id) = $1`,
    [targetMemory.group_id]
  );

  const startSortOrder = Number(sortInfoResult.rows[0]?.max_sort_order ?? -1) + 1;

  const values: Array<string | number | null> = [];
  const valueBlocks = parsed.photos.map((photo, index) => {
    const base = index * 9;
    values.push(
      crypto.randomUUID(),
      targetMemory.group_id,
      targetMemory.title,
      targetMemory.category,
      targetMemory.story,
      photo.imageData,
      photo.zoom,
      photo.rotation,
      startSortOrder + index
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

  const updatedRows = await pool.query<MemoryRow>(
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
     WHERE COALESCE(memory_group_id, id) = $1
     ORDER BY sort_order ASC, created_at ASC`,
    [targetMemory.group_id]
  );

  return mapRowsToMemories(updatedRows.rows)[0];
}

export async function deleteMemoryPhoto(input: { photoId: string }): Promise<{ remainingPhotos: number }> {
  await ensureMemoriesTable();
  const parsed = deleteMemoryPhotoSchema.parse(input);

  const targetResult = await pool.query<{ group_id: string }>(
    `SELECT COALESCE(memory_group_id, id) AS group_id
     FROM memories
     WHERE id = $1
     LIMIT 1`,
    [parsed.photoId]
  );

  const target = targetResult.rows[0];
  if (!target) {
    throw new Error("Selected photo no longer exists.");
  }

  await pool.query(`DELETE FROM memories WHERE id = $1`, [parsed.photoId]);

  const remainingResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM memories
     WHERE COALESCE(memory_group_id, id) = $1`,
    [target.group_id]
  );

  return { remainingPhotos: Number(remainingResult.rows[0]?.count ?? "0") };
}

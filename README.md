# bye-bye-shushu

An interactive memorial wall built with Next.js and Neon PostgreSQL. Family and friends can post photos and memories, apply zoom/rotation to fit images, and browse by titled categories like:

- Grandma and her GrandKids
- Shushu and her Kids

## Features

- Public memory gallery for photos + stories
- Interactive image selector with:
  - zoom control
  - rotation control
  - client-side image optimization before upload
- Category + title support on every memory card
- Neon-ready Postgres persistence
- Warm, "magical" memorial-inspired UI

## 1) Set up Neon

Create a Neon project/database, then copy your connection string into `.env`:

```bash
cp .env.example .env
```

Set:

```env
DATABASE_URL="postgresql://USER:PASSWORD@YOUR-NEON-HOST/bye_bye_shushu?sslmode=require"
```

The app auto-creates the `memories` table on first read/write.

## 2) Install dependencies

```bash
npm install
```

## 3) Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database schema

The app creates this table if missing:

```sql
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
```

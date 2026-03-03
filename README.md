# bye-bye-shushu

An interactive memorial wall built with Next.js and Neon PostgreSQL.
Family and friends can view every memory, while posting is protected with a shared family password.

## Features

- Public home page gallery for all shared memories
- Password-gated posting flow using env-based password
- One memory entry can contain multiple photos under one title + category
- Per-photo editing before upload:
  - zoom
  - rotation
- Click any gallery photo to expand it fullscreen
- Neon-backed Postgres persistence with auto table setup

## Setup

1. Copy env template:

```bash
cp .env.example .env.local
```

2. Fill these values in `.env.local`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@YOUR-NEON-HOST/bye_bye_shushu?sslmode=require"
POST_ACCESS_PASSWORD="choose-a-strong-family-password"
AUTH_SECRET="long-random-secret-for-cookie-signing"
```

3. Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Vercel env vars

Set these in Vercel project Environment Variables for Production/Preview/Development:

- `DATABASE_URL`
- `POST_ACCESS_PASSWORD`
- `AUTH_SECRET`

## Database behavior

The app auto-creates/updates the `memories` table on first read/write.
Each uploaded photo is stored as one row, linked by `memory_group_id` so multiple photos stay under one memory entry.

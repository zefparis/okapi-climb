# Okapi Climb

A crash-style multiplier game for **Congo Gaming**, built with React + Vite + TypeScript on the frontend and Fastify + WebSocket on the backend, backed by Supabase.

## Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, framer-motion, GSAP
- **Backend**: Fastify, @fastify/websocket, @supabase/supabase-js
- **DB**: Supabase (Postgres)

## Project Layout

```
okapi-climb/
├── public/images/        # okapi-climb.png, okapi-slip.png, okapi-crash.png, okapi-win.png
├── src/                  # React app
│   ├── components/       # GameScreen, BetPanel, MultiplierDisplay, CrashHistory, PlayersList
│   └── lib/              # socket.ts, api.ts
├── server/               # Fastify backend (game engine + REST + WebSocket)
│   ├── index.ts
│   ├── game.ts
│   └── lib/supabase.ts
├── supabase/schema.sql   # DB schema for okapi_rounds & okapi_bets
├── .env
├── vercel.json
└── package.json
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure `.env`:
   ```
   SUPABASE_URL=...
   SUPABASE_SERVICE_KEY=...
   VITE_API_URL=http://localhost:3001
   VITE_WS_URL=ws://localhost:3001
   ```

3. Apply schema in Supabase SQL editor (`supabase/schema.sql`). The backend also expects a `public.adjust_balance(p_user_id uuid, p_amount numeric) returns numeric` RPC (reused from Congo Gaming).

## Run

In two terminals:

```bash
npm run server   # backend on :3001
npm run dev      # vite frontend on :5173
```

The frontend works in offline / no-server mode as well (local fallback round loop) so the UI can be developed without Supabase.

## Game Math

- **Multiplier**: `m(t) = 1 + 0.06·t + (0.06·t)²` (t in seconds)
- **Crash point** (provably fair, 95% RTP):
  ```ts
  if (r < 0.05) return 1.00
  return Math.max(1.00, (1 / (1 - r)) * 0.95)
  ```

## Deploy

The included `vercel.json` configures SPA rewrites for the static frontend. The Fastify server is intended to be deployed separately (Railway, Fly.io, etc.).

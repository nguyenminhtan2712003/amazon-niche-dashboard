# Amazon Niche Dashboard — Next.js Frontend

Next.js 14 (App Router) + TypeScript + Tailwind + Recharts. Talks to the FastAPI server in `../server/`. Deploy target: **Vercel** (one-click).

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14, App Router, Server Components + Client Components |
| Language  | TypeScript (strict) |
| Styling   | Tailwind CSS (custom dark theme) |
| Charts    | Recharts |
| Data      | Server-side fetch → FastAPI `/api/snapshot`, ISR-cached |
| Auth      | API key stays server-side (env var, never shipped to browser) |

## Structure

```
nextjs-app/
├── app/
│   ├── layout.tsx              Root layout (dark theme + meta)
│   ├── globals.css             Tailwind + custom CSS vars
│   ├── page.tsx                / — Overview & ASINs (Server Component)
│   ├── growth/page.tsx         /growth — Growth Analysis (Server Component)
│   └── api/snapshot/route.ts   Optional client-side proxy (also cached)
├── components/
│   ├── Shell.tsx               Header, Nav, Container, Card primitives
│   ├── DashboardClient.tsx     Main UI for /
│   └── GrowthClient.tsx        Main UI for /growth
├── lib/
│   ├── types.ts                Niche / Asin / Snapshot types
│   ├── api.ts                  fetchSnapshot() helper
│   └── format.ts               Number/money/pct formatters, growth segments
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.mjs
├── .env.local.example
└── README.md
```

## Local development

### 1. Install

```bash
cd nextjs-app
npm install      # or pnpm install / yarn
```

### 2. Configure env

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
FASTAPI_URL=http://localhost:8000
FASTAPI_KEY=<the same value as server/.env API_KEY>
SNAPSHOT_REVALIDATE=300
```

> **Why no `NEXT_PUBLIC_` prefix?** These vars stay server-side, so the API key never reaches the browser. The browser only ever talks to the Next.js app.

### 3. Run

```bash
npm run dev
# open http://localhost:3000
```

The page will render Server-side, fetch from FastAPI once, cache for 5 minutes (ISR), then hydrate the interactive React components.

## Production build

```bash
npm run build
npm start
```

## Deploy to Vercel

See `../DEPLOY_VERCEL.md` for full step-by-step instructions.

Quick version:

1. Push `nextjs-app/` to GitHub (its own repo or a sub-folder).
2. On vercel.com → New Project → Import the repo.
3. Set the **Root Directory** to `nextjs-app/` if it's a sub-folder.
4. Add environment variables `FASTAPI_URL`, `FASTAPI_KEY`, `SNAPSHOT_REVALIDATE`.
5. Deploy.

## How data flows

```
Browser ──→ Vercel (Next.js) ──→ FastAPI (yours) ──→ PostgreSQL
              ↑
       ISR cache (5 min)
```

- Each page is rendered server-side on first visit, calls `/api/snapshot`, caches the result for `SNAPSHOT_REVALIDATE` seconds.
- After that, subsequent visitors get the cached HTML + data instantly until cache expires.
- All filtering/sorting/segment math happens client-side from the cached snapshot — no extra API calls.
- To force refresh sooner, set `SNAPSHOT_REVALIDATE=0` (every request hits FastAPI).

## Customisation

- **Dark theme tokens**: `tailwind.config.ts` (or override CSS vars in `app/globals.css`)
- **Snapshot size**: change `SNAPSHOT_TOP_NICHES` / `SNAPSHOT_ASINS_PER_NICHE` in the FastAPI server's `.env`
- **Pages**: `app/page.tsx` and `app/growth/page.tsx` are thin Server Components — most logic is in `components/DashboardClient.tsx` and `components/GrowthClient.tsx`

## Notes / caveats

- Next.js `Image` is NOT used for ASIN images (we use plain `<img>`) to avoid hitting Vercel's image optimisation quota on large galleries.
- The FastAPI URL must be reachable from Vercel's region. If your FastAPI is on a private VPN, deploy this Next.js app to your own infra instead (see "Self-host" in `../DEPLOY_VERCEL.md`).

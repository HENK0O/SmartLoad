<!-- BEGIN:nextjs-agent-rules -->
<!-- END:nextjs-agent-rules -->

# SmartLoad

Next.js 16 + React 19 app (strength training tracker). App Router, TypeScript, Supabase backend.

## Dev commands

- `npm run dev` — dev server with **Turbopack** (not webpack)
- `npm run build` — production build (outputs to `.next/`)
- `npm run lint` — ESLint + Next.js linting
- `npm run cap:sync` — sync web assets to native projects (Capacitor)
- `npm run cap:open:ios` / `npm run cap:run:ios` — open/run iOS app

## Architecture

- **Src layout**: `src/app/` (App Router pages), `src/components/`, `src/lib/`, `src/hooks/`
- **Path alias**: `@/*` → `./src/*`
- **No `next.config.js`** — uses `next.config.ts` with PWA plugin
- **Tailwind CSS v4** — no `tailwind.config.js`; styles via `src/app/globals.css` CSS variables + `@tailwindcss/postcss`
- **shadcn/ui** — components in `src/components/ui/`, uses `cn()` from `src/lib/utils.ts`
- **PWA** via `@ducanh2912/next-pwa` — disabled in dev (`disable: process.env.NODE_ENV === 'development'`), outputs to `public/`

## Backend

- **Supabase** — `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` required
- Client: `src/lib/supabase.ts`
- Migrations: `supabase/migrations/*.sql`
- No local Supabase; uses hosted instance

## Capacitor (iOS/Android)

- Config: `capacitor.config.ts`
- `webDir: "out"` — Capacitor uses the **production build output**, not `.next/`
- Build order: `npm run build` → `npm run cap:sync`
- iOS dev: change `server.url` in `capacitor.config.ts` to `http://localhost:3000`

## Env / secrets

- Env files (`.env*`) are gitignored
- Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Optional dev: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` for local Supabase

## What to avoid

- **Do not** run `npm run build` expecting Capacitor to work — it needs `out/` dir from a **production** build
- **Do not** assume Tailwind config exists — Tailwind v4 is configured via CSS
- No `npm run test` or `npm run typecheck` in package.json
- iOS build requires Mac + Xcode — see `IOS-SETUP.md`

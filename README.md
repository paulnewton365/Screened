# Screened

An app that helps parents make informed choices about TV shows and films
their children watch. Aggregates and synthesises parent feedback,
scored against a thoughtful framework, with a per-child fit verdict.

## Stack

- **Next.js 16** with App Router and Turbopack
- **TypeScript** with strict mode
- **Tailwind CSS 4** for styling
- **Supabase** for auth and Postgres
- **Anthropic Claude** for analysis
- **TMDB** for title metadata
- **pnpm** for package management

## Getting started

You need:

- Node.js 20+ and pnpm 10+
- A Supabase project with the migrations from `../supabase` applied
- An Anthropic API key
- A TMDB API key (free, takes 2 minutes)

Steps:

1. Install dependencies: `pnpm install`
2. Copy the env template: `cp .env.local.example .env.local`
3. Fill in `.env.local` with your real credentials (see file for guidance)
4. Run the dev server: `pnpm dev`
5. Open [http://localhost:3000](http://localhost:3000)

The app will fail with a clear error message at boot if any required env
var is missing — that's by design.

## Project structure

```
src/
├── app/                  # Next.js App Router pages and layouts
│   ├── layout.tsx        # Root layout with editorial typography
│   ├── globals.css       # Editorial design system
│   ├── page.tsx          # Landing page
│   ├── login/            # Auth pages (placeholder, full flow next)
│   ├── signup/
│   └── dashboard/        # Authed dashboard (placeholder)
├── components/
│   ├── ui/               # Primitives (Button, Card, Input)
│   └── editorial/        # Branded components (Headline, Pullquote, Scorecard)
├── lib/
│   ├── env/              # Environment validation with Zod
│   ├── supabase/         # Client, server, and service-role Supabase helpers
│   ├── claude/           # Analysis pipeline (next iteration)
│   ├── tmdb/             # Title metadata client (next iteration)
│   └── scoring/          # Deterministic fit rules and overall score
├── types/
│   └── database.ts       # Supabase-generated DB types
└── middleware.ts         # Session refresh + auth-protected routing
```

## Conventions

- Server-side code reads env via `getServerEnv()` from `@/lib/env`
- Browser-side code reads env via `getClientEnv()` from `@/lib/env`
- Database access from server components/routes uses `createClient()` from
  `@/lib/supabase/server` — runs as the logged-in user, RLS enforced
- Database access from client components uses `createClient()` from
  `@/lib/supabase/client` — also runs as the logged-in user
- Service-role access (analysis pipeline, global title cache writes) uses
  `createServiceRoleClient()` from `@/lib/supabase/service` — bypasses RLS,
  use sparingly and never expose to the browser

## Generating Database types

After applying schema migrations to your Supabase project, regenerate
types with:

```bash
pnpm dlx supabase gen types typescript --project-id <your-project-ref> > src/types/database.ts
```

The placeholder type in `src/types/database.ts` works without this but
loses autocomplete on database queries.

## Building for production

```bash
pnpm build
pnpm start
```

The build requires network access to fetch Google Fonts (Source Serif 4
and Inter). If your build environment is offline, swap to system fonts
in `src/app/layout.tsx`.

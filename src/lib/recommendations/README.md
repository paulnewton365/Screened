# Recommendations

The monthly-refreshed curated picks per age band. Powers /recommendations.

Files:

- `schemas.ts` — Zod schemas, age band constants, tool input schema
- `prompts.ts` — system prompt for the curator Claude call
- `curate.ts` — runs the Claude call, resolves to TMDB
- `store.ts` — replaces persisted rows for an age band

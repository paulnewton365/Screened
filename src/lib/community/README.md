# Community observations

Aggregated, anonymised parent observations across all users. The
nightly rollup populates the community_observations table; the title
page reads it to show "what parents of similar children have observed."

Files:

- `bands.ts` — TypeScript copies of the database age/sensitivity band
  helpers, used by the rollup to bucket rows in memory
- `schemas.ts` — Zod schemas for the aggregate JSON shape
- `rollup.ts` — the actual aggregation job

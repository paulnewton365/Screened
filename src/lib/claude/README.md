# Claude integration

Title analysis pipeline.

Files:

- `prompts.ts` — analysis system prompt (versioned)
- `schemas.ts` — Zod schema + JSON Schema for the structured tool output
- `analyze.ts` — streaming analysis runner with web search
- `store.ts` — persistence layer (write new analyses, hydrate from rows)

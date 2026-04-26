import { z } from 'zod';

/**
 * Environment variable schema. Validated once at module load.
 *
 * Why this matters: missing env vars are the #1 cause of mysterious
 * production bugs. By validating up front with Zod, the app refuses to
 * start with a clear error message instead of crashing later with
 * "undefined is not a function".
 *
 * Server-only secrets (no NEXT_PUBLIC_ prefix) are only accessible in
 * server components and API routes. The Next.js bundler strips these
 * from client-side code automatically.
 */

const serverEnvSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Anthropic
  ANTHROPIC_API_KEY: z.string().min(1),

  // TMDB
  TMDB_API_KEY: z.string().min(1),

  // Optional: explicit Node env. Defaults to development if not set.
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

/**
 * Use in server components, API routes, and server actions.
 * Throws if any required env var is missing or malformed.
 */
export function getServerEnv() {
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid server environment variables:\n${issues}`);
  }
  return parsed.data;
}

/**
 * Use in client components. Only contains NEXT_PUBLIC_ vars.
 */
export function getClientEnv() {
  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!parsed.success) {
    throw new Error('Missing public Supabase configuration.');
  }
  return parsed.data;
}

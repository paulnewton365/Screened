import { createBrowserClient } from '@supabase/ssr';
import { getClientEnv } from '@/lib/env';
import type { Database } from '@/types/database';

/**
 * Supabase client for use in Client Components.
 *
 * This client uses the anon key, which is safe to expose to the browser.
 * All database access through this client is filtered by Row Level
 * Security (RLS) policies — a parent can only ever see their own data.
 *
 * Use sparingly. Prefer server components and server actions where
 * possible — they keep more logic on the server and are easier to
 * reason about.
 */
export function createClient() {
  const env = getClientEnv();
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

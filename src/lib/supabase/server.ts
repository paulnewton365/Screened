import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getServerEnv } from '@/lib/env';
import type { Database } from '@/types/database';

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 *
 * Reads the user's session from cookies, so all database access happens
 * as the logged-in user with RLS enforced.
 *
 * Uses the anon key — RLS does the actual access control. For operations
 * that need to bypass RLS (writing to the global title cache, running
 * the analysis pipeline, etc.), use createServiceRoleClient() instead.
 */
export async function createClient() {
  const env = getServerEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components can't set cookies. The middleware
            // handles refreshing sessions, so this is safe to ignore here.
          }
        },
      },
    },
  );
}

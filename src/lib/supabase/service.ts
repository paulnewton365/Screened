import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getServerEnv } from '@/lib/env';
import type { Database } from '@/types/database';

/**
 * Supabase client with the service_role key, which BYPASSES RLS.
 *
 * Use only for:
 *   - Writing to the global titles cache
 *   - Inserting/updating title_analyses (the analysis pipeline)
 *   - Writing to title_refresh_log
 *   - Computing community_observations rollups
 *
 * NEVER use this for reads or writes scoped to a specific user. Those
 * should always go through the regular server client so RLS protects
 * cross-tenant access.
 *
 * NEVER expose this client or its key to the browser. The bundler will
 * not strip this file because it doesn't have NEXT_PUBLIC_ prefixed env
 * vars — it's the developer's responsibility to only import this from
 * server-side code.
 */
export function createServiceRoleClient() {
  const env = getServerEnv();
  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Fetch the set of title IDs the current user has liked.
 *
 * Returns a Set for O(1) membership checks when annotating screening
 * cards. Empty set on any error or no rows — likes are progressive
 * enhancement, not a critical path.
 */
export async function fetchLikedTitleIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<Set<string>> {
  const { data } = await supabase
    .from('title_likes')
    .select('title_id')
    .eq('parent_id', userId);

  if (!data) return new Set();
  return new Set(data.map((r) => r.title_id as string));
}

/**
 * Check whether one specific title is liked. Lighter than fetching
 * the full set when we only need the answer for a single title (e.g.
 * the title detail page).
 */
export async function isTitleLiked(
  supabase: SupabaseClient,
  userId: string,
  titleId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('title_likes')
    .select('parent_id')
    .eq('parent_id', userId)
    .eq('title_id', titleId)
    .maybeSingle();

  return !!data;
}

import { createServiceRoleClient } from '@/lib/supabase/service';
import type { AgeBand } from './schemas';
import type { ResolvedRecommendation } from './curate';

/**
 * Replace the recommendations for one age band with a fresh list.
 *
 * Strategy: delete-then-insert per age band. If the insert fails after
 * the delete, that band is left empty until the next refresh — better
 * than leaving stale data lying around for a month.
 *
 * Only takes the top 5 resolved recommendations.
 */
export async function replaceRecommendationsForBand(
  ageBand: AgeBand,
  resolved: ResolvedRecommendation[],
): Promise<{ inserted: number }> {
  const supabase = createServiceRoleClient();
  const top = resolved.slice(0, 5);

  // Clear existing recommendations for this band
  const { error: deleteError } = await supabase
    .from('recommendations')
    .delete()
    .eq('age_band', ageBand);

  if (deleteError) {
    throw new Error(
      `Failed to clear recommendations for ${ageBand}: ${deleteError.message}`,
    );
  }

  if (top.length === 0) {
    return { inserted: 0 };
  }

  const rows = top.map((r, index) => ({
    age_band: ageBand,
    rank: index + 1,
    tmdb_id: r.tmdb_id,
    title_type: r.type,
    title_name: r.resolved_title,
    title_year: r.resolved_year,
    poster_url: r.poster_url,
    blurb: r.curated.blurb,
    sources: r.curated.sources,
    generated_at: new Date().toISOString(),
  }));

  const { error: insertError } = await supabase
    .from('recommendations')
    .insert(rows);

  if (insertError) {
    throw new Error(
      `Failed to insert recommendations for ${ageBand}: ${insertError.message}`,
    );
  }

  return { inserted: rows.length };
}

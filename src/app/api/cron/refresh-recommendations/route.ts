import { NextResponse, type NextRequest } from 'next/server';
import { curateAgeBand, resolveCuratedTitles } from '@/lib/recommendations/curate';
import { replaceRecommendationsForBand } from '@/lib/recommendations/store';
import { AGE_BANDS } from '@/lib/recommendations/schemas';

/**
 * GET /api/cron/refresh-recommendations
 *
 * Runs monthly via Vercel Cron (schedule in /vercel.json). Iterates the
 * age bands, runs the curator for each, resolves against TMDB, and
 * replaces the persisted rows.
 *
 * Auth: same CRON_SECRET pattern as the rollup cron.
 *
 * Manual run for testing:
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *     https://screened-rose.vercel.app/api/cron/refresh-recommendations
 *
 * Note on duration: 7 age bands × ~30 seconds per Claude curation =
 * up to ~3.5 minutes. We set maxDuration to 300 (5 minutes) so a slow
 * curation doesn't kill the run mid-loop. On Vercel Pro this is fine;
 * on Hobby the cap is lower.
 */

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured on the server.' },
      { status: 500 },
    );
  }

  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  const summary: Array<{
    age_band: string;
    curated: number;
    resolved: number;
    inserted: number;
    error?: string;
  }> = [];

  for (const band of AGE_BANDS) {
    try {
      const curated = await curateAgeBand(band);
      const resolved = await resolveCuratedTitles(curated);
      const { inserted } = await replaceRecommendationsForBand(band, resolved);
      summary.push({
        age_band: band,
        curated: curated.length,
        resolved: resolved.length,
        inserted,
      });
    } catch (err) {
      summary.push({
        age_band: band,
        curated: 0,
        resolved: 0,
        inserted: 0,
        error: err instanceof Error ? err.message : 'unknown error',
      });
    }
  }

  return NextResponse.json({
    ok: true,
    startedAt,
    finishedAt: new Date().toISOString(),
    summary,
  });
}

import { NextResponse, type NextRequest } from 'next/server';
import { rollupCommunityObservations } from '@/lib/community/rollup';

/**
 * GET /api/cron/rollup-observations
 *
 * Recomputes community_observations from screenings. Triggered nightly
 * by a Vercel Cron job — the schedule lives in vercel.json at the root
 * of the project.
 *
 * Auth: Vercel Cron includes an `Authorization: Bearer <CRON_SECRET>`
 * header on its requests. We validate that against the env var so this
 * endpoint can't be hit publicly.
 *
 * For local testing or manual reruns, use:
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *     https://screened-rose.vercel.app/api/cron/rollup-observations
 */

export const maxDuration = 60;

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

  try {
    const result = await rollupCommunityObservations();
    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (err) {
    console.error('Rollup failed:', err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'unknown error',
      },
      { status: 500 },
    );
  }
}

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchTitles } from '@/lib/tmdb/client';

/**
 * GET /api/titles/search?q=...
 *
 * Authenticated only — we don't want this proxy to be hammered by
 * unauthenticated traffic. The middleware redirects browser traffic;
 * for direct API calls we return 401.
 *
 * Returns an array of TMDB search results. The TMDB key never leaves
 * the server.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (!q) {
    return NextResponse.json({ results: [] });
  }
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchTitles(q);
    return NextResponse.json({ results });
  } catch (err) {
    console.error('TMDB search failed:', err);
    return NextResponse.json(
      { error: 'search_failed' },
      { status: 502 },
    );
  }
}

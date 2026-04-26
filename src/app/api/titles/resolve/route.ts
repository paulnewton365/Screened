import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { getTitleDetails } from '@/lib/tmdb/client';

const querySchema = z.object({
  tmdbId: z.coerce.number().int().positive(),
  type: z.enum(['movie', 'tv']),
});

/**
 * GET /api/titles/resolve?tmdbId=...&type=movie|tv
 *
 * Get-or-create a title row in our database. Returns the title id so
 * the client can navigate to /titles/[id].
 *
 * Why this isn't a server action: it's a navigation step in the search
 * → analyse flow. Easier to redirect from a route handler.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const parsed = querySchema.safeParse({
    tmdbId: request.nextUrl.searchParams.get('tmdbId'),
    type: request.nextUrl.searchParams.get('type'),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_params' },
      { status: 400 },
    );
  }
  const { tmdbId, type } = parsed.data;

  // Check if we already have this title cached.
  const { data: existing } = await supabase
    .from('titles')
    .select('id')
    .eq('tmdb_id', tmdbId)
    .eq('type', type)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ id: existing.id });
  }

  // Fetch full details + certifications from TMDB and insert.
  let details;
  try {
    details = await getTitleDetails(tmdbId, type);
  } catch (err) {
    console.error('TMDB detail fetch failed:', err);
    return NextResponse.json({ error: 'tmdb_failed' }, { status: 502 });
  }

  // Use the service role client so we can write to the global titles table.
  const service = createServiceRoleClient();
  const { data: inserted, error: insertError } = await service
    .from('titles')
    .insert({
      tmdb_id: details.tmdb_id,
      type: details.type,
      title: details.title,
      original_title: details.original_title ?? null,
      release_year: details.release_year,
      poster_url: details.poster_url,
      backdrop_url: details.backdrop_url,
      synopsis: details.synopsis,
      certifications: details.certifications,
      metadata: details.metadata,
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    // Race condition possible — another request may have just inserted.
    // Re-check before failing.
    const { data: existingNow } = await supabase
      .from('titles')
      .select('id')
      .eq('tmdb_id', tmdbId)
      .eq('type', type)
      .maybeSingle();

    if (existingNow) {
      return NextResponse.json({ id: existingNow.id });
    }

    console.error('Title insert failed:', insertError);
    return NextResponse.json(
      { error: 'insert_failed' },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: inserted.id });
}

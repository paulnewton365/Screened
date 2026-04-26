import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/lib/auth/actions';
import { TitleSearchBar } from '@/components/search/TitleSearchBar';
import {
  ScreeningCard,
  type ScreeningCardData,
} from '@/components/screenings/ScreeningCard';

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * /children/[id] — the library detail view for a single child.
 *
 * Lists every screening saved for this child, with full observation
 * detail and notes preview. Two groups: watched (has watched_at) and
 * to-watch (no watched_at yet). Each group sorted most recent first.
 */
export default async function ChildLibraryPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: child } = await supabase
    .from('children')
    .select('id, name, birth_date, interests')
    .eq('id', id)
    .maybeSingle();

  if (!child) notFound();

  const age = child.birth_date ? computeAge(child.birth_date) : null;

  // Pull every screening for this child + the joined title info.
  const { data: screeningsRaw } = await supabase
    .from('screenings')
    .select(
      `
      id, child_id, title_id, fit_verdict, fit_headline, overall_score,
      watched_at, created_at, parent_notes, would_rewatch,
      engagement_quality, emotional_resonance, fear_response,
      behavioral_impact, play_inspiration,
      titles(id, title, release_year, type, poster_url)
    `,
    )
    .eq('child_id', id)
    .order('created_at', { ascending: false });

  const screenings: ScreeningCardData[] = (screeningsRaw ?? [])
    .map((row) => {
      const titleObj = Array.isArray(row.titles) ? row.titles[0] : row.titles;
      if (!titleObj) return null;
      return {
        id: row.id as string,
        child_id: row.child_id as string,
        title_id: row.title_id as string,
        title: (titleObj as { title: string }).title,
        release_year: (titleObj as { release_year: number | null })
          .release_year,
        type: (titleObj as { type: 'movie' | 'tv' }).type,
        poster_url: (titleObj as { poster_url: string | null }).poster_url,
        fit_verdict: row.fit_verdict as string | null,
        fit_headline: row.fit_headline as string | null,
        overall_score: row.overall_score as number | null,
        watched_at: row.watched_at as string | null,
        created_at: row.created_at as string,
        parent_notes: row.parent_notes as string | null,
        would_rewatch: row.would_rewatch as boolean | null,
        observations: {
          engagement_quality: row.engagement_quality as number | null,
          emotional_resonance: row.emotional_resonance as number | null,
          fear_response: row.fear_response as number | null,
          behavioral_impact: row.behavioral_impact as number | null,
          play_inspiration: row.play_inspiration as number | null,
        },
      };
    })
    .filter((s): s is ScreeningCardData => s !== null);

  const watched = screenings.filter((s) => s.watched_at);
  const toWatch = screenings.filter((s) => !s.watched_at);

  return (
    <main className="flex-1 flex flex-col">
      <header className="border-b border-rule">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/dashboard" className="font-serif text-xl tracking-tight">
            Screened
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/dashboard"
              className="text-ink-muted hover:text-ink transition-colors"
            >
              Dashboard
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="text-ink-muted hover:text-ink transition-colors"
              >
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12 w-full">
        <div className="mb-12 flex items-end justify-between gap-6 flex-wrap">
          <div>
            <p className="editorial-meta uppercase mb-3">Library</p>
            <h1 className="mb-2">{child.name}&rsquo;s library.</h1>
            <p className="text-sm text-ink-muted">
              {age !== null && (
                <>
                  {age === 0 ? 'Under 1' : `Age ${age}`}
                  {child.interests && child.interests.length > 0 && ' · '}
                </>
              )}
              {child.interests && child.interests.length > 0 && (
                <span>{child.interests.join(' · ')}</span>
              )}
            </p>
          </div>
          <Link
            href={`/children/${child.id}/edit`}
            className="text-sm text-ink-muted hover:text-ink underline transition-colors"
          >
            Edit profile
          </Link>
        </div>

        <div className="mb-12">
          <TitleSearchBar
            placeholder={`Search for ${child.name}…`}
          />
          <p className="mt-2 text-xs text-ink-subtle">
            Find a title and we&apos;ll show how it might land for {child.name}.
          </p>
        </div>

        {screenings.length === 0 ? (
          <div className="border border-rule rounded-sm bg-paper-raised p-12 text-center">
            <p className="editorial-meta uppercase mb-3">Nothing saved yet</p>
            <p className="text-ink-muted leading-relaxed max-w-md mx-auto">
              Search a title above to see how it might fit {child.name}, then
              save it to come back to.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {watched.length > 0 && (
              <section className="space-y-6">
                <header>
                  <p className="editorial-meta uppercase">Watched</p>
                  <h2 className="mt-1">
                    {watched.length}{' '}
                    {watched.length === 1 ? 'title' : 'titles'} screened.
                  </h2>
                </header>
                <div className="space-y-4">
                  {watched.map((s) => (
                    <ScreeningCard key={s.id} screening={s} />
                  ))}
                </div>
              </section>
            )}

            {toWatch.length > 0 && (
              <section className="space-y-6">
                <header>
                  <p className="editorial-meta uppercase">Saved to watch</p>
                  <h2 className="mt-1">
                    {toWatch.length}{' '}
                    {toWatch.length === 1 ? 'title' : 'titles'} on the shelf.
                  </h2>
                </header>
                <div className="space-y-4">
                  {toWatch.map((s) => (
                    <ScreeningCard key={s.id} screening={s} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function computeAge(birthDate: string): number {
  const dob = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getDate() < dob.getDate())
  ) {
    age--;
  }
  return Math.max(0, age);
}

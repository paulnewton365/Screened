import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/lib/auth/actions';
import { TitleSearchBar } from '@/components/search/TitleSearchBar';
import {
  ScreeningCard,
  type ScreeningCardData,
} from '@/components/screenings/ScreeningCard';
import {
  StatusFilter,
  type LibraryStatus,
} from '@/components/screenings/StatusFilter';
import {
  DashboardFilters,
  type SortKey,
  type TypeFilter,
} from '@/components/screenings/DashboardFilters';
import { ChildPicker } from '@/components/titles/ChildPicker';
import { fetchLikedTitleIds } from '@/lib/likes/queries';

type Props = {
  searchParams: Promise<{
    child?: string;
    status?: string;
    type?: string;
    liked?: string;
    sort?: string;
  }>;
};

/**
 * Dashboard — now the consolidated library view.
 *
 * Three states:
 *   - No children: onboarding CTA
 *   - One child:   their library, no picker shown
 *   - 2+ children: child picker at top, then selected child's library
 *
 * URL params:
 *   ?child=ID  — which child's library to show; defaults to first
 *   ?status=X  — 'reviewed' | 'searched'; defaults to all
 */
export default async function DashboardPage({ searchParams }: Props) {
  const sp = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single();

  const { data: childrenData } = await supabase
    .from('children')
    .select('id, name, birth_date, interests')
    .order('created_at', { ascending: true });

  const children = childrenData ?? [];
  const hasChildren = children.length > 0;

  if (!hasChildren) {
    return (
      <main className="flex-1 flex flex-col">
        <DashboardHeader displayName={profile?.display_name ?? user.email!} />
        <div className="max-w-3xl mx-auto px-6 py-16 w-full">
          <FirstChildPrompt />
        </div>
      </main>
    );
  }

  const selectedChild =
    children.find((c) => c.id === sp.child) ?? children[0]!;

  // Validate status param. Anything else falls back to 'all'.
  const status: LibraryStatus =
    sp.status === 'reviewed' || sp.status === 'searched' ? sp.status : 'all';

  // Type filter
  const typeFilter: TypeFilter =
    sp.type === 'movie' || sp.type === 'tv' ? sp.type : 'all';

  // Liked-only toggle
  const likedOnly = sp.liked === 'true';

  // Sort
  const sort: SortKey =
    sp.sort === 'stim_low' ||
    sp.sort === 'fright_low' ||
    sp.sort === 'violence_low' ||
    sp.sort === 'age_low'
      ? sp.sort
      : 'recent';

  // Fetch the user's liked title ids
  const likedTitleIds = await fetchLikedTitleIds(supabase, user.id);

  // Fetch screenings for the selected child + joined title + analysis scores.
  const { data: screeningsRaw } = await supabase
    .from('screenings')
    .select(
      `
      id, child_id, title_id, fit_verdict, fit_headline, overall_score,
      watched_at, created_at, parent_notes, would_rewatch,
      engagement_quality, emotional_resonance, fear_response,
      behavioral_impact, play_inspiration,
      titles(id, title, release_year, type, poster_url),
      title_analyses!analysis_id(
        stimulation_intensity, frightening_content, violence_level,
        age_recommendation_min
      )
    `,
    )
    .eq('child_id', selectedChild.id)
    .order('created_at', { ascending: false });

  const allScreeningsUnfiltered: ScreeningCardData[] = (screeningsRaw ?? [])
    .map((row) => {
      const titleObj = Array.isArray(row.titles) ? row.titles[0] : row.titles;
      if (!titleObj) return null;
      const analysisObj = Array.isArray(row.title_analyses)
        ? row.title_analyses[0]
        : row.title_analyses;
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
        liked: likedTitleIds.has(row.title_id as string),
        observations: {
          engagement_quality: row.engagement_quality as number | null,
          emotional_resonance: row.emotional_resonance as number | null,
          fear_response: row.fear_response as number | null,
          behavioral_impact: row.behavioral_impact as number | null,
          play_inspiration: row.play_inspiration as number | null,
        },
        analysisScores: analysisObj
          ? {
              stimulation_intensity:
                (analysisObj as { stimulation_intensity?: number | null })
                  .stimulation_intensity ?? null,
              frightening_content:
                (analysisObj as { frightening_content?: number | null })
                  .frightening_content ?? null,
              violence_level:
                (analysisObj as { violence_level?: number | null })
                  .violence_level ?? null,
              age_recommendation_min:
                (analysisObj as { age_recommendation_min?: number | null })
                  .age_recommendation_min ?? null,
            }
          : null,
      };
    })
    .filter((s): s is ScreeningCardData => s !== null);

  // Apply type & liked filters
  const allScreenings = allScreeningsUnfiltered
    .filter((s) => typeFilter === 'all' || s.type === typeFilter)
    .filter((s) => !likedOnly || s.liked);

  // Apply sort. For the score-based sorts, items missing that score
  // sink to the bottom so they don't pollute the top of the list.
  if (sort !== 'recent') {
    const scoreKey: keyof NonNullable<ScreeningCardData['analysisScores']> = (
      {
        stim_low: 'stimulation_intensity',
        fright_low: 'frightening_content',
        violence_low: 'violence_level',
        age_low: 'age_recommendation_min',
      } as const
    )[sort];

    allScreenings.sort((a, b) => {
      const va = a.analysisScores?.[scoreKey] ?? null;
      const vb = b.analysisScores?.[scoreKey] ?? null;
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      return va - vb;
    });
  }

  const reviewed = allScreenings.filter((s) => s.watched_at);
  const searched = allScreenings.filter((s) => !s.watched_at);

  const counts = {
    all: allScreenings.length,
    reviewed: reviewed.length,
    searched: searched.length,
  };

  // Apply status filter for what to render
  const showReviewed = status === 'all' || status === 'reviewed';
  const showSearched = status === 'all' || status === 'searched';

  const age = selectedChild.birth_date
    ? computeAge(selectedChild.birth_date)
    : null;

  return (
    <main className="flex-1 flex flex-col">
      <DashboardHeader displayName={profile?.display_name ?? user.email!} />

      <div className="max-w-4xl mx-auto px-6 py-12 w-full">
        {children.length > 1 && (
          <div className="mb-8">
            <ChildPicker
              basePath="/dashboard"
              childOptions={children.map((c) => ({ id: c.id, name: c.name }))}
              selectedChildId={selectedChild.id}
            />
          </div>
        )}

        <div className="mb-10 flex items-end justify-between gap-6 flex-wrap">
          <div>
            <p className="editorial-meta uppercase mb-3">Library</p>
            <h1 className="mb-2">
              {selectedChild.name}&rsquo;s library.
            </h1>
            <p className="text-sm text-ink-muted">
              {age !== null && (
                <>
                  {age === 0 ? 'Under 1' : `Age ${age}`}
                  {selectedChild.interests &&
                    selectedChild.interests.length > 0 &&
                    ' · '}
                </>
              )}
              {selectedChild.interests &&
                selectedChild.interests.length > 0 && (
                  <span>{selectedChild.interests.join(' · ')}</span>
                )}
            </p>
          </div>
          <div className="flex items-baseline gap-4">
            <Link
              href={`/children/${selectedChild.id}/edit`}
              className="text-sm text-ink-muted hover:text-ink underline transition-colors"
            >
              Edit profile
            </Link>
            <Link
              href="/children/new"
              className="text-sm text-ink-muted hover:text-ink underline transition-colors"
            >
              Add child
            </Link>
          </div>
        </div>

        <div className="mb-8">
          <TitleSearchBar placeholder={`Search a title for ${selectedChild.name}…`} />
          <p className="mt-2 text-xs text-ink-subtle">
            Find a film or show to see how it might land for {selectedChild.name}.
          </p>
        </div>

        {allScreenings.length > 0 && (
          <div className="mb-4">
            <StatusFilter
              basePath="/dashboard"
              preserveParams={
                children.length > 1 ? { child: selectedChild.id } : undefined
              }
              current={status}
              counts={counts}
            />
          </div>
        )}

        {(allScreeningsUnfiltered.length > 0) && (
          <div className="mb-8">
            <DashboardFilters
              basePath="/dashboard"
              preserveParams={{
                child: children.length > 1 ? selectedChild.id : undefined,
                status: status === 'all' ? undefined : status,
              }}
              type={typeFilter}
              likedOnly={likedOnly}
              sort={sort}
            />
          </div>
        )}

        {allScreeningsUnfiltered.length === 0 ? (
          <div className="border border-rule rounded-sm bg-paper-raised p-12 text-center">
            <p className="editorial-meta uppercase mb-3">Nothing saved yet</p>
            <p className="text-ink-muted leading-relaxed max-w-md mx-auto">
              Search a title above to see how it might fit{' '}
              {selectedChild.name}, then save it to come back to.
            </p>
          </div>
        ) : allScreenings.length === 0 ? (
          <div className="border border-rule rounded-sm bg-paper-raised p-10 text-center">
            <p className="editorial-meta uppercase mb-3">No matches</p>
            <p className="text-ink-muted leading-relaxed max-w-md mx-auto">
              Nothing in {selectedChild.name}&rsquo;s library matches the
              current filters. Try clearing one above.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {showReviewed && reviewed.length > 0 && (
              <LibrarySection
                label="Reviewed"
                headline={`${reviewed.length} ${
                  reviewed.length === 1 ? 'title' : 'titles'
                } reviewed.`}
                screenings={reviewed}
              />
            )}

            {showSearched && searched.length > 0 && (
              <LibrarySection
                label="Searched"
                headline={`${searched.length} ${
                  searched.length === 1 ? 'title' : 'titles'
                } searched.`}
                screenings={searched}
              />
            )}

            {showReviewed && reviewed.length === 0 && status === 'reviewed' && (
              <FilteredEmpty status="reviewed" childName={selectedChild.name} />
            )}
            {showSearched && searched.length === 0 && status === 'searched' && (
              <FilteredEmpty status="searched" childName={selectedChild.name} />
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function DashboardHeader({ displayName }: { displayName: string }) {
  return (
    <header className="border-b border-rule">
      <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/dashboard" className="font-serif text-xl tracking-tight">
          Screened
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link
            href="/"
            className="text-ink-muted hover:text-ink transition-colors"
          >
            Home
          </Link>
          <span className="editorial-meta hidden sm:inline">{displayName}</span>
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
  );
}

/**
 * Onboarding view shown when a user has no children yet.
 */
function FirstChildPrompt() {
  return (
    <>
      <p className="editorial-meta uppercase mb-4">Welcome</p>
      <h1 className="mb-6">Let&apos;s start with your child.</h1>
      <p className="editorial-lede text-ink-muted mb-12 max-w-prose">
        Screened works by understanding how your child tends to experience
        what they watch. A short profile is the foundation — once it&apos;s
        in, every show you search will tell you whether it&apos;s a good fit.
      </p>

      <Link
        href="/children/new"
        className="inline-block px-7 py-3 bg-ink text-paper rounded-sm hover:bg-accent transition-colors text-sm tracking-wide"
      >
        Set up your first child
      </Link>

      <p className="mt-6 text-sm text-ink-subtle">
        Two minutes. You can change anything later.
      </p>
    </>
  );
}

function LibrarySection({
  label,
  headline,
  screenings,
}: {
  label: string;
  headline: string;
  screenings: ScreeningCardData[];
}) {
  const films = screenings.filter((s) => s.type === 'movie');
  const tvShows = screenings.filter((s) => s.type === 'tv');
  const showSubHeaders = films.length > 0 && tvShows.length > 0;

  return (
    <section className="space-y-6">
      <header>
        <p className="editorial-meta uppercase">{label}</p>
        <h2 className="mt-1">{headline}</h2>
      </header>

      {showSubHeaders ? (
        <div className="space-y-10">
          {films.length > 0 && (
            <div className="space-y-4">
              <p className="editorial-meta uppercase pt-2 border-t border-rule">
                Films · {films.length}
              </p>
              {films.map((s) => (
                <ScreeningCard key={s.id} screening={s} />
              ))}
            </div>
          )}
          {tvShows.length > 0 && (
            <div className="space-y-4">
              <p className="editorial-meta uppercase pt-2 border-t border-rule">
                TV shows · {tvShows.length}
              </p>
              {tvShows.map((s) => (
                <ScreeningCard key={s.id} screening={s} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {screenings.map((s) => (
            <ScreeningCard key={s.id} screening={s} />
          ))}
        </div>
      )}
    </section>
  );
}

function FilteredEmpty({
  status,
  childName,
}: {
  status: 'reviewed' | 'searched';
  childName: string;
}) {
  return (
    <div className="border border-rule rounded-sm bg-paper-raised p-10 text-center">
      <p className="editorial-meta uppercase mb-3">Nothing here</p>
      <p className="text-ink-muted leading-relaxed max-w-md mx-auto">
        {status === 'reviewed'
          ? `${childName} hasn\u2019t reviewed anything yet. Once you record observations on a saved title, it shows up here.`
          : `Nothing on the shelf right now. Search a title above to add one for ${childName}.`}
      </p>
    </div>
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

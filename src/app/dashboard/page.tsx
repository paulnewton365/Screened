import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/lib/auth/actions';
import { TitleSearchBar } from '@/components/search/TitleSearchBar';

/**
 * Dashboard — the parent's home base after sign-in.
 *
 * Two states:
 *   - No children yet → "set up your first child" CTA card
 *   - One or more children → list each as a library card
 *
 * Each child card shows the empty library state for now ("nothing
 * screened yet"). The search bar and analysis pipeline come next.
 */
export default async function DashboardPage() {
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
    .select('id, name, birth_date, interests, fear_sensitivity, stimulation_sensitivity, emotional_sensitivity')
    .order('created_at', { ascending: true });

  const hasChildren = (childrenData?.length ?? 0) > 0;

  // Fetch screenings + the joined title info for the library list under
  // each child card. Order most-recent first so the latest save is at
  // the top.
  const { data: screeningsData } = hasChildren
    ? await supabase
        .from('screenings')
        .select(
          `
          id, child_id, title_id, fit_verdict, fit_headline, overall_score,
          watched_at, created_at,
          titles(id, title, release_year, type, poster_url),
          title_analyses!analysis_id(
            stimulation_intensity,
            frightening_content,
            violence_level,
            age_recommendation_min
          )
        `,
        )
        .order('created_at', { ascending: false })
    : { data: null };

  // Group screenings by child_id for easy lookup in ChildCard
  const screeningsByChild = new Map<string, ChildScreening[]>();
  for (const row of screeningsData ?? []) {
    const titleObj = Array.isArray(row.titles) ? row.titles[0] : row.titles;
    if (!titleObj) continue;
    const analysisObj = Array.isArray(row.title_analyses)
      ? row.title_analyses[0]
      : row.title_analyses;
    const screening: ChildScreening = {
      id: row.id as string,
      title_id: row.title_id as string,
      child_id: row.child_id as string,
      fit_verdict: row.fit_verdict as string | null,
      fit_headline: row.fit_headline as string | null,
      overall_score: (row.overall_score as number | null) ?? null,
      watched_at: row.watched_at as string | null,
      created_at: row.created_at as string,
      title: (titleObj as { title: string }).title,
      release_year: (titleObj as { release_year: number | null }).release_year,
      type: (titleObj as { type: 'movie' | 'tv' }).type,
      poster_url: (titleObj as { poster_url: string | null }).poster_url,
      stimulation_intensity:
        (analysisObj as { stimulation_intensity?: number | null } | null)
          ?.stimulation_intensity ?? null,
      frightening_content:
        (analysisObj as { frightening_content?: number | null } | null)
          ?.frightening_content ?? null,
      violence_level:
        (analysisObj as { violence_level?: number | null } | null)
          ?.violence_level ?? null,
      age_recommendation_min:
        (analysisObj as { age_recommendation_min?: number | null } | null)
          ?.age_recommendation_min ?? null,
    };
    const list = screeningsByChild.get(screening.child_id) ?? [];
    list.push(screening);
    screeningsByChild.set(screening.child_id, list);
  }

  return (
    <main className="flex-1 flex flex-col">
      <header className="border-b border-rule">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
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
            <span className="editorial-meta hidden sm:inline">
              {profile?.display_name ?? user.email}
            </span>
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

      <div className="max-w-3xl mx-auto px-6 py-16 w-full">
        {hasChildren ? (
          <ChildLibraryView
            childrenList={childrenData!}
            screeningsByChild={screeningsByChild}
          />
        ) : (
          <FirstChildPrompt />
        )}
      </div>
    </main>
  );
}

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

type ChildSummary = {
  id: string;
  name: string;
  birth_date: string | null;
  interests: string[] | null;
  fear_sensitivity: number | null;
  stimulation_sensitivity: number | null;
  emotional_sensitivity: number | null;
};

type ChildScreening = {
  id: string;
  title_id: string;
  child_id: string;
  fit_verdict: string | null;
  fit_headline: string | null;
  overall_score: number | null;
  watched_at: string | null;
  created_at: string;
  title: string;
  release_year: number | null;
  type: 'movie' | 'tv';
  poster_url: string | null;
  stimulation_intensity: number | null;
  frightening_content: number | null;
  violence_level: number | null;
  age_recommendation_min: number | null;
};

function ChildLibraryView({
  childrenList,
  screeningsByChild,
}: {
  childrenList: ChildSummary[];
  screeningsByChild: Map<string, ChildScreening[]>;
}) {
  return (
    <>
      <div className="flex items-end justify-between mb-8 gap-6 flex-wrap">
        <div>
          <p className="editorial-meta uppercase mb-2">Your library</p>
          <h1>
            {childrenList.length === 1
              ? `${childrenList[0].name}\u2019s library.`
              : 'Your family library.'}
          </h1>
        </div>
        <Link
          href="/children/new"
          className="text-sm text-ink-muted hover:text-ink underline transition-colors"
        >
          Add another child
        </Link>
      </div>

      <div className="mb-12">
        <TitleSearchBar placeholder="Search a film or show…" />
        <p className="mt-2 text-xs text-ink-subtle">
          Find a title to see how parents read it and whether it fits your child.
        </p>
      </div>

      <div className="space-y-6">
        {childrenList.map((child) => (
          <ChildCard
            key={child.id}
            child={child}
            screenings={screeningsByChild.get(child.id) ?? []}
          />
        ))}
      </div>
    </>
  );
}

const VERDICT_LABEL: Record<string, string> = {
  great_fit: 'Great fit',
  good_fit: 'Good fit',
  worth_a_look: 'Worth a look',
  stretch: 'A stretch',
  not_a_fit_right_now: 'Not a fit right now',
};

function ChildCard({
  child,
  screenings,
}: {
  child: ChildSummary;
  screenings: ChildScreening[];
}) {
  const age = child.birth_date ? computeAge(child.birth_date) : null;

  return (
    <article className="border border-rule rounded-sm bg-paper-raised">
      <header className="px-8 pt-8 pb-6 border-b border-rule">
        <div className="flex items-baseline gap-4 flex-wrap justify-between">
          <div className="flex items-baseline gap-4 flex-wrap">
            <h2 className="m-0">
              <Link
                href={`/children/${child.id}`}
                className="hover:text-accent transition-colors"
              >
                {child.name}
              </Link>
            </h2>
            {age !== null && (
              <span className="editorial-meta">
                {age === 0 ? 'under 1' : `age ${age}`}
              </span>
            )}
          </div>
          <Link
            href={`/children/${child.id}/edit`}
            className="text-sm text-ink-muted hover:text-ink underline transition-colors"
          >
            Edit profile
          </Link>
        </div>
        {child.interests && child.interests.length > 0 && (
          <p className="mt-3 text-sm text-ink-muted leading-relaxed">
            {child.interests.join(' · ')}
          </p>
        )}
      </header>

      {screenings.length === 0 ? (
        <div className="px-8 py-10 text-center">
          <p className="editorial-meta uppercase mb-3">Library</p>
          <p className="text-ink-muted mb-1 leading-relaxed max-w-md mx-auto">
            Nothing screened yet.
          </p>
          <p className="text-sm text-ink-subtle leading-relaxed max-w-md mx-auto">
            Use the search above to find a title and see how it might fit{' '}
            {child.name}.
          </p>
        </div>
      ) : (
        <div className="px-8 py-6">
          <div className="flex items-baseline justify-between mb-4">
            <p className="editorial-meta uppercase">Library</p>
            <Link
              href={`/children/${child.id}`}
              className="editorial-meta hover:text-ink transition-colors"
            >
              View all {screenings.length} →
            </Link>
          </div>
          <ul className="divide-y divide-rule -mx-2">
            {screenings.slice(0, 5).map((s) => (
              <li key={s.id}>
                <Link
                  href={`/titles/${s.title_id}?child=${child.id}`}
                  className="flex items-center gap-4 px-2 py-3 hover:bg-paper-sunken transition-colors"
                >
                  {s.poster_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.poster_url.replace('/w500', '/w92')}
                      alt=""
                      className="w-10 h-14 object-cover bg-paper-sunken flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-14 bg-paper-sunken flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-serif text-base text-ink truncate">
                        {s.title}
                      </span>
                      {s.release_year && (
                        <span className="editorial-meta">{s.release_year}</span>
                      )}
                    </div>
                    {s.fit_verdict && (
                      <p className="text-xs text-ink-muted mt-0.5">
                        {VERDICT_LABEL[s.fit_verdict] ?? s.fit_verdict}
                        {s.watched_at && (
                          <span className="text-ink-subtle">
                            {' '}
                            · watched{' '}
                            {new Date(s.watched_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        )}
                      </p>
                    )}
                    {!s.watched_at && hasAnyScores(s) && (
                      <ScoreSnippet screening={s} />
                    )}
                  </div>
                  {s.overall_score !== null && (
                    <span className="font-mono tabular-nums text-sm text-ink-muted flex-shrink-0">
                      {Math.round(s.overall_score)}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
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

function hasAnyScores(s: ChildScreening): boolean {
  return (
    s.stimulation_intensity !== null ||
    s.frightening_content !== null ||
    s.violence_level !== null ||
    s.age_recommendation_min !== null
  );
}

/**
 * Compact score row shown under unwatched (searched) items in the
 * dashboard library. Surfaces the three most decision-relevant scores
 * for "what should we watch tonight" — stimulation, frightening, and
 * minimum age recommendation. Plus violence as the fourth in cases
 * where it's notable.
 */
function ScoreSnippet({ screening: s }: { screening: ChildScreening }) {
  return (
    <div className="mt-1.5 flex items-center gap-x-4 gap-y-1 flex-wrap text-[11px] uppercase tracking-wider text-ink-subtle">
      {s.stimulation_intensity !== null && (
        <span className="inline-flex items-center gap-1.5">
          <span>Stim</span>
          <Dots value={s.stimulation_intensity} />
        </span>
      )}
      {s.frightening_content !== null && (
        <span className="inline-flex items-center gap-1.5">
          <span>Fright</span>
          <Dots value={s.frightening_content} />
        </span>
      )}
      {s.violence_level !== null && (
        <span className="inline-flex items-center gap-1.5">
          <span>Violence</span>
          <Dots value={s.violence_level} />
        </span>
      )}
      {s.age_recommendation_min !== null && (
        <span>Age {s.age_recommendation_min}+</span>
      )}
    </div>
  );
}

function Dots({ value }: { value: number }) {
  return (
    <span aria-label={`${value} out of 5`} className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          aria-hidden="true"
          className={[
            'inline-block w-1 h-1 rounded-full',
            n <= value ? 'bg-ink' : 'bg-rule',
          ].join(' ')}
        />
      ))}
    </span>
  );
}

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { AgeBandFilter } from '@/components/recommendations/AgeBandFilter';
import {
  RecommendationCard,
  type RecommendationData,
} from '@/components/recommendations/RecommendationCard';
import {
  AGE_BANDS,
  AGE_BAND_LABEL,
  type AgeBand,
} from '@/lib/recommendations/schemas';

type Props = {
  searchParams: Promise<{ band?: string }>;
};

/**
 * /recommendations — public discovery page.
 *
 * Shows the top 5 most-recommended titles per age band, sourced from
 * Common Sense Media, Rotten Tomatoes Family, IMDb Parents Guide, and
 * other parent-focused lists. Refreshed monthly by a cron.
 *
 * Public — accessible to signed-out visitors. Click-through routes
 * through /titles/resolve which is auth-gated, so anonymous users get
 * bounced to /login when they want to dig in.
 */
export default async function RecommendationsPage({ searchParams }: Props) {
  const sp = await searchParams;

  // Validate the band query param
  const requestedBand = sp.band as AgeBand | undefined;
  const selectedBand: AgeBand =
    requestedBand && (AGE_BANDS as readonly string[]).includes(requestedBand)
      ? requestedBand
      : '5-6';

  // Public read — no auth header needed but the supabase client still works
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from('recommendations')
    .select(
      'rank, tmdb_id, title_type, title_name, title_year, poster_url, blurb, sources, generated_at',
    )
    .eq('age_band', selectedBand)
    .order('rank', { ascending: true });

  const recommendations: RecommendationData[] = (rows ?? []).map((r) => ({
    rank: r.rank as number,
    tmdb_id: r.tmdb_id as number,
    title_type: r.title_type as 'movie' | 'tv',
    title_name: r.title_name as string,
    title_year: r.title_year as number | null,
    poster_url: r.poster_url as string | null,
    blurb: r.blurb as string,
    sources: (r.sources as Array<{ name: string; url: string }>) ?? [],
  }));

  const generatedAt = (rows?.[0]?.generated_at as string | null) ?? null;
  const daysAgo = generatedAt ? daysSince(generatedAt) : null;

  // Check if user is signed in — affects nav links
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex-1 flex flex-col">
      <header className="border-b border-rule">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="font-serif text-xl tracking-tight">
            Screened
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            {user ? (
              <Link
                href="/dashboard"
                className="text-ink-muted hover:text-ink transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-ink-muted hover:text-ink transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="text-ink-muted hover:text-ink transition-colors"
                >
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12 w-full">
        <div className="mb-12 max-w-2xl">
          <p className="editorial-meta uppercase mb-3">Recommendations</p>
          <h1 className="mb-6">What parents recommend.</h1>
          <p className="editorial-lede text-ink-muted leading-relaxed">
            Five titles per age, drawn from across the parent-focused lists
            that take this seriously — Common Sense Media, Rotten Tomatoes
            Family, IMDb&rsquo;s Parents Guide, and the deeper community
            threads where parents actually compare notes. Refreshed monthly.
          </p>
        </div>

        <div className="mb-10">
          <AgeBandFilter selected={selectedBand} />
        </div>

        <div className="mb-8 flex items-baseline justify-between gap-4 flex-wrap">
          <h2 className="m-0">
            For {AGE_BAND_LABEL[selectedBand].toLowerCase()}.
          </h2>
          {daysAgo !== null && (
            <p className="editorial-meta">
              {daysAgo === 0
                ? 'Refreshed today'
                : daysAgo === 1
                ? 'Refreshed yesterday'
                : `Refreshed ${daysAgo} days ago`}
            </p>
          )}
        </div>

        {recommendations.length === 0 ? (
          <div className="border border-rule rounded-sm bg-paper-raised p-12 text-center">
            <p className="editorial-meta uppercase mb-3">Coming soon</p>
            <p className="text-ink-muted leading-relaxed max-w-md mx-auto">
              We&rsquo;re still gathering recommendations for this age band.
              Check back after the next monthly refresh.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {recommendations.map((r) => (
              <RecommendationCard key={r.rank} recommendation={r} />
            ))}
          </div>
        )}

        {!user && recommendations.length > 0 && (
          <div className="mt-16 border-t border-rule pt-12">
            <p className="editorial-meta uppercase mb-3">Personalise this</p>
            <h2 className="mb-4 max-w-2xl">
              See how each one fits your child specifically.
            </h2>
            <p className="text-ink-muted leading-relaxed mb-8 max-w-prose">
              Set up a quick profile of your child — their fear, stimulation,
              and emotional sensitivity — and Screened tells you whether each
              recommended title is a great fit, a stretch, or worth holding off
              on right now.
            </p>
            <Link
              href="/signup"
              className="inline-block px-7 py-3 bg-ink text-paper rounded-sm hover:bg-accent transition-colors text-sm tracking-wide"
            >
              Set up your child&rsquo;s profile
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

function daysSince(iso: string): number {
  const generated = new Date(iso);
  const now = new Date();
  return Math.floor(
    (now.getTime() - generated.getTime()) / (1000 * 60 * 60 * 24),
  );
}

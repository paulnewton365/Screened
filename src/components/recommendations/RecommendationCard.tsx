import Link from 'next/link';

export type RecommendationData = {
  rank: number;
  tmdb_id: number;
  title_type: 'movie' | 'tv';
  title_name: string;
  title_year: number | null;
  poster_url: string | null;
  blurb: string;
  sources: Array<{ name: string; url: string }>;
};

type Props = {
  recommendation: RecommendationData;
};

/**
 * Recommendation card for the /recommendations page.
 *
 * Click anywhere on the card → /titles/resolve which either fetches
 * the existing title row or creates one from TMDB. Auth-gated, so
 * anonymous visitors get bounced to /login first; after sign-in they
 * land on the title detail page.
 */
export function RecommendationCard({ recommendation: r }: Props) {
  const resolveHref = `/titles/resolve?tmdbId=${r.tmdb_id}&type=${r.title_type}`;

  return (
    <article className="border border-rule rounded-sm bg-paper-raised">
      <div className="grid sm:grid-cols-[140px_1fr] gap-6 p-6">
        <Link href={resolveHref} className="block">
          {r.poster_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={r.poster_url.replace('/w500', '/w342')}
              alt=""
              className="w-full max-w-[140px] aspect-[2/3] object-cover bg-paper-sunken border border-rule"
            />
          ) : (
            <div className="w-full max-w-[140px] aspect-[2/3] bg-paper-sunken border border-rule" />
          )}
        </Link>

        <div className="min-w-0 space-y-3">
          <header>
            <p className="editorial-meta uppercase mb-1">
              {r.title_type === 'movie' ? 'Film' : 'TV show'}
              {r.title_year && ` · ${r.title_year}`}
              <span className="ml-3 text-ink-subtle">#{r.rank}</span>
            </p>
            <h3 className="font-serif text-2xl mb-0 leading-tight">
              <Link
                href={resolveHref}
                className="hover:text-accent transition-colors"
              >
                {r.title_name}
              </Link>
            </h3>
          </header>

          <p className="text-ink leading-relaxed text-[15px] max-w-prose">
            {r.blurb}
          </p>

          {r.sources.length > 0 && (
            <p className="editorial-meta">
              Drawn from{' '}
              {r.sources.slice(0, 3).map((s, i) => (
                <span key={i}>
                  {i > 0 && ', '}
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink-muted hover:text-ink underline-offset-2 hover:underline"
                  >
                    {s.name}
                  </a>
                </span>
              ))}
              {r.sources.length > 3 && (
                <span className="text-ink-subtle">
                  {' '}
                  and {r.sources.length - 3} more
                </span>
              )}
            </p>
          )}

          <Link
            href={resolveHref}
            className="inline-block text-sm text-ink underline hover:text-accent transition-colors mt-1"
          >
            See how parents read it →
          </Link>
        </div>
      </div>
    </article>
  );
}

import Link from 'next/link';
import { LikeHeart } from '@/components/likes/LikeHeart';

const VERDICT_LABEL: Record<string, string> = {
  great_fit: 'Great fit',
  good_fit: 'Good fit',
  worth_a_look: 'Worth a look',
  stretch: 'A stretch',
  not_a_fit_right_now: 'Not a fit right now',
};

const OBSERVATION_LABELS = [
  { key: 'engagement_quality', label: 'Engagement' },
  { key: 'emotional_resonance', label: 'Resonance' },
  { key: 'fear_response', label: 'Fear' },
  { key: 'behavioral_impact', label: 'Behaviour' },
  { key: 'play_inspiration', label: 'Play / talk' },
] as const;

export type ScreeningCardData = {
  id: string;
  child_id: string;
  title_id: string;
  title: string;
  release_year: number | null;
  type: 'movie' | 'tv';
  poster_url: string | null;
  fit_verdict: string | null;
  fit_headline: string | null;
  overall_score: number | null;
  watched_at: string | null;
  created_at: string;
  parent_notes: string | null;
  would_rewatch: boolean | null;
  /** Whether the current user has liked this title. */
  liked: boolean;
  observations: {
    engagement_quality: number | null;
    emotional_resonance: number | null;
    fear_response: number | null;
    behavioral_impact: number | null;
    play_inspiration: number | null;
  };
  /**
   * Analysis scores pulled from the pinned analysis_id row. Used to
   * show key decision-relevant scores (stim, fright, violence, age)
   * for unwatched titles in the library, where observations don't
   * exist yet.
   */
  analysisScores: {
    stimulation_intensity: number | null;
    frightening_content: number | null;
    violence_level: number | null;
    age_recommendation_min: number | null;
  } | null;
};

type Props = {
  screening: ScreeningCardData;
};

/**
 * Rich screening card for the library detail page.
 *
 * Shows everything: poster, fit verdict at save-time, observations (if
 * recorded), parent notes preview, and links into the title page and
 * observation form.
 *
 * Designed to be readable as a full row of editorial content rather
 * than a dashboard widget — fits the magazine register of the rest of
 * the app.
 */
export function ScreeningCard({ screening: s }: Props) {
  const hasObservations = OBSERVATION_LABELS.some(
    ({ key }) => s.observations[key] !== null,
  );
  const watched = !!s.watched_at;

  return (
    <article className="border border-rule rounded-sm bg-paper-raised">
      <div className="grid sm:grid-cols-[120px_1fr] gap-6 p-6">
        {/* Poster */}
        <Link
          href={`/titles/${s.title_id}?child=${s.child_id}`}
          className="block"
        >
          {s.poster_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={s.poster_url.replace('/w500', '/w342')}
              alt=""
              className="w-full max-w-[120px] aspect-[2/3] object-cover bg-paper-sunken border border-rule"
            />
          ) : (
            <div className="w-full max-w-[120px] aspect-[2/3] bg-paper-sunken border border-rule" />
          )}
        </Link>

        {/* Body */}
        <div className="min-w-0 space-y-4">
          <header className="flex items-start gap-3 justify-between">
            <div className="min-w-0">
              <p className="editorial-meta uppercase mb-1">
                {s.type === 'movie' ? 'Film' : 'TV show'}
                {s.release_year && ` · ${s.release_year}`}
              </p>
              <h3 className="font-serif text-2xl mb-2 leading-tight">
                <Link
                  href={`/titles/${s.title_id}?child=${s.child_id}`}
                  className="hover:text-accent transition-colors"
                >
                  {s.title}
                </Link>
              </h3>
              <p className="text-sm text-ink-muted">
                {s.fit_verdict && (VERDICT_LABEL[s.fit_verdict] ?? s.fit_verdict)}
                {s.overall_score !== null && (
                  <span className="text-ink-subtle">
                    {' '}· {Math.round(s.overall_score)} / 100
                  </span>
                )}
              </p>
            </div>
            <div className="-mt-1 -mr-1 shrink-0">
              <LikeHeart
                titleId={s.title_id}
                initialLiked={s.liked}
                size="sm"
              />
            </div>
          </header>

          {hasObservations ? (
            <ObservationsRow observations={s.observations} />
          ) : s.analysisScores && hasAnyAnalysisScore(s.analysisScores) ? (
            <AnalysisScoresRow scores={s.analysisScores} />
          ) : (
            <p className="text-sm text-ink-subtle italic">
              No observations recorded yet.
            </p>
          )}

          {s.parent_notes && (
            <p className="text-sm text-ink leading-relaxed line-clamp-3 max-w-prose">
              <span className="text-ink-subtle">Notes — </span>
              {s.parent_notes}
            </p>
          )}

          <footer className="flex items-baseline gap-4 flex-wrap pt-2 text-xs">
            {watched ? (
              <span className="editorial-meta">
                Watched{' '}
                {new Date(s.watched_at!).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            ) : (
              <span className="editorial-meta">
                Saved{' '}
                {new Date(s.created_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
            {s.would_rewatch === true && (
              <span className="editorial-meta">Would re-watch</span>
            )}
            {s.would_rewatch === false && (
              <span className="editorial-meta">Wouldn&apos;t re-watch</span>
            )}
            <Link
              href={`/screenings/${s.id}/observe`}
              className="text-ink-muted hover:text-ink underline transition-colors"
            >
              {hasObservations ? 'Edit observations' : 'Add observations'}
            </Link>
          </footer>
        </div>
      </div>
    </article>
  );
}

function ObservationsRow({
  observations,
}: {
  observations: ScreeningCardData['observations'];
}) {
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-5 gap-x-3 gap-y-2">
      {OBSERVATION_LABELS.map(({ key, label }) => {
        const value = observations[key];
        return (
          <div key={key} className="space-y-1">
            <dt className="text-[11px] uppercase tracking-wider text-ink-subtle">
              {label}
            </dt>
            <dd>
              {value === null ? (
                <span className="text-ink-subtle">—</span>
              ) : (
                <Dots value={value} />
              )}
            </dd>
          </div>
        );
      })}
    </dl>
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
            'inline-block w-1.5 h-1.5 rounded-full',
            n <= value ? 'bg-ink' : 'bg-rule',
          ].join(' ')}
        />
      ))}
    </span>
  );
}

function hasAnyAnalysisScore(
  scores: NonNullable<ScreeningCardData['analysisScores']>,
): boolean {
  return (
    scores.stimulation_intensity !== null ||
    scores.frightening_content !== null ||
    scores.violence_level !== null ||
    scores.age_recommendation_min !== null
  );
}

/**
 * For unwatched titles in the library: surface the most decision-
 * relevant scores from the analysis. Same dimensions as the dashboard
 * compact row, but rendered slightly larger to fit the library card.
 */
function AnalysisScoresRow({
  scores,
}: {
  scores: NonNullable<ScreeningCardData['analysisScores']>;
}) {
  return (
    <div className="flex items-center gap-x-5 gap-y-2 flex-wrap text-[11px] uppercase tracking-wider text-ink-subtle">
      {scores.stimulation_intensity !== null && (
        <span className="inline-flex items-center gap-1.5">
          <span>Stim</span>
          <Dots value={scores.stimulation_intensity} />
        </span>
      )}
      {scores.frightening_content !== null && (
        <span className="inline-flex items-center gap-1.5">
          <span>Fright</span>
          <Dots value={scores.frightening_content} />
        </span>
      )}
      {scores.violence_level !== null && (
        <span className="inline-flex items-center gap-1.5">
          <span>Violence</span>
          <Dots value={scores.violence_level} />
        </span>
      )}
      {scores.age_recommendation_min !== null && (
        <span>Age {scores.age_recommendation_min}+</span>
      )}
    </div>
  );
}

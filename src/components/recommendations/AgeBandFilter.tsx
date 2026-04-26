import Link from 'next/link';
import { AGE_BANDS, AGE_BAND_LABEL, type AgeBand } from '@/lib/recommendations/schemas';

type Props = {
  selected: AgeBand;
};

/**
 * Age band filter pills for the recommendations page.
 *
 * Pure server-rendered links. Each pill links to /recommendations?band=X.
 * URL is the source of truth.
 */
export function AgeBandFilter({ selected }: Props) {
  return (
    <nav
      aria-label="Filter by age"
      className="flex flex-wrap items-center gap-2"
    >
      {AGE_BANDS.map((band) => {
        const active = selected === band;
        return (
          <Link
            key={band}
            href={`/recommendations?band=${band}`}
            aria-current={active ? 'page' : undefined}
            className={[
              'px-4 py-2 rounded-sm text-sm transition-colors border font-serif',
              active
                ? 'bg-ink text-paper border-ink'
                : 'bg-paper-raised text-ink-muted border-rule hover:border-ink-muted hover:text-ink',
            ].join(' ')}
          >
            {AGE_BAND_LABEL[band]}
          </Link>
        );
      })}
    </nav>
  );
}

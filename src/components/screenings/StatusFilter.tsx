import Link from 'next/link';

export type LibraryStatus = 'all' | 'reviewed' | 'searched';

type Props = {
  /** Base path for the link, e.g. '/dashboard' */
  basePath: string;
  /** Other URL params to preserve (child id, etc.) */
  preserveParams?: Record<string, string>;
  current: LibraryStatus;
  counts: {
    all: number;
    reviewed: number;
    searched: number;
  };
};

const OPTIONS: Array<{ key: LibraryStatus; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'searched', label: 'Searched' },
];

/**
 * Library status filter. Three pills: All, Reviewed, Searched.
 *
 * Pure server-rendered links — no client state. Each pill links to the
 * same path with status= changed. URL is the source of truth.
 */
export function StatusFilter({
  basePath,
  preserveParams,
  current,
  counts,
}: Props) {
  function buildHref(status: LibraryStatus): string {
    const params = new URLSearchParams(preserveParams);
    if (status !== 'all') {
      params.set('status', status);
    }
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <nav
      aria-label="Filter library"
      className="flex flex-wrap items-center gap-2"
    >
      {OPTIONS.map((opt) => {
        const active = current === opt.key;
        const count = counts[opt.key];
        return (
          <Link
            key={opt.key}
            href={buildHref(opt.key)}
            aria-current={active ? 'page' : undefined}
            className={[
              'px-3 py-1.5 rounded-sm text-sm transition-colors border',
              active
                ? 'bg-ink text-paper border-ink'
                : 'bg-paper-raised text-ink-muted border-rule hover:border-ink-muted hover:text-ink',
            ].join(' ')}
          >
            {opt.label}
            <span
              className={[
                'ml-2 text-xs tabular-nums',
                active ? 'text-paper/70' : 'text-ink-subtle',
              ].join(' ')}
            >
              {count}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

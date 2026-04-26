import Link from 'next/link';

export type TypeFilter = 'all' | 'movie' | 'tv';
export type SortKey =
  | 'recent'
  | 'stim_low'
  | 'fright_low'
  | 'violence_low'
  | 'age_low';

const SORT_LABELS: Record<SortKey, string> = {
  recent: 'Recently saved',
  stim_low: 'Lowest stimulation',
  fright_low: 'Lowest fright',
  violence_low: 'Lowest violence',
  age_low: 'Lowest age recommendation',
};

const TYPE_LABELS: Record<TypeFilter, string> = {
  all: 'All',
  movie: 'Films',
  tv: 'TV shows',
};

type Props = {
  basePath: string;
  /** Existing query params to preserve (status, child, etc.). */
  preserveParams: Record<string, string | undefined>;
  type: TypeFilter;
  likedOnly: boolean;
  sort: SortKey;
};

/**
 * Quick filter row for the dashboard library.
 *
 * Renders three groups, all URL-driven:
 *   1. Type pills: All / Films / TV shows
 *   2. Liked-only pill toggle
 *   3. Sort dropdown
 *
 * Server-rendered as plain anchor links — pressing one updates the URL
 * which triggers a fresh server render. The dropdown is a native
 * <select> wrapped in a server-rendered form that submits via GET, so
 * there's no client JavaScript needed for any of this.
 */
export function DashboardFilters({
  basePath,
  preserveParams,
  type,
  likedOnly,
  sort,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="editorial-meta uppercase text-ink-subtle pr-1">
          Type
        </span>
        {(['all', 'movie', 'tv'] as const).map((opt) => {
          const href = buildHref(basePath, preserveParams, {
            type: opt === 'all' ? undefined : opt,
            // Always reset to page 1-equivalent (no pagination yet, but explicit)
          });
          const active = type === opt;
          return (
            <Link
              key={opt}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={[
                'px-3 py-1.5 rounded-sm text-xs transition-colors border',
                active
                  ? 'bg-ink text-paper border-ink'
                  : 'bg-paper-raised text-ink-muted border-rule hover:border-ink-muted hover:text-ink',
              ].join(' ')}
            >
              {TYPE_LABELS[opt]}
            </Link>
          );
        })}

        <span className="editorial-meta uppercase text-ink-subtle pl-3 border-l border-rule pr-1">
          Filter
        </span>
        <Link
          href={buildHref(basePath, preserveParams, {
            liked: likedOnly ? undefined : 'true',
          })}
          aria-pressed={likedOnly}
          className={[
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs transition-colors border',
            likedOnly
              ? 'bg-ink text-paper border-ink'
              : 'bg-paper-raised text-ink-muted border-rule hover:border-ink-muted hover:text-ink',
          ].join(' ')}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={12}
            height={12}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M12 21s-7.5-4.5-9.5-9.05C1.13 8.36 3 5 6.5 5c2 0 3.5 1.13 4.5 2.5C12 6.13 13.5 5 15.5 5 19 5 20.87 8.36 19.5 11.95 17.5 16.5 12 21 12 21z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinejoin="round"
            />
          </svg>
          Liked only
        </Link>

        <SortControl
          basePath={basePath}
          preserveParams={preserveParams}
          current={sort}
        />
      </div>
    </div>
  );
}

/**
 * Server-rendered sort dropdown. Submits a GET form so the URL ends up
 * with the selected sort param, plus the preserved params from hidden
 * inputs. No JavaScript required.
 */
function SortControl({
  basePath,
  preserveParams,
  current,
}: {
  basePath: string;
  preserveParams: Record<string, string | undefined>;
  current: SortKey;
}) {
  return (
    <form method="GET" action={basePath} className="inline-flex items-center gap-2">
      {Object.entries(preserveParams).map(([k, v]) =>
        v ? <input key={k} type="hidden" name={k} value={v} /> : null,
      )}
      <label
        htmlFor="dashboard-sort"
        className="editorial-meta uppercase text-ink-subtle pl-3 border-l border-rule"
      >
        Sort
      </label>
      <select
        id="dashboard-sort"
        name="sort"
        defaultValue={current}
        className={[
          'text-xs px-2.5 py-1.5 border border-rule rounded-sm',
          'bg-paper-raised text-ink hover:border-ink-muted transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40',
        ].join(' ')}
      >
        {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
          <option key={k} value={k}>
            {SORT_LABELS[k]}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="text-xs text-ink-muted hover:text-ink underline transition-colors"
      >
        Apply
      </button>
    </form>
  );
}

/**
 * Build a URL with preserved params plus overrides. Keys with an
 * `undefined` override are removed from the resulting query string.
 */
function buildHref(
  basePath: string,
  preserveParams: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>,
): string {
  const sp = new URLSearchParams();
  const merged = { ...preserveParams, ...overrides };
  for (const [k, v] of Object.entries(merged)) {
    if (typeof v === 'string' && v !== '') {
      sp.set(k, v);
    }
  }
  const query = sp.toString();
  return query ? `${basePath}?${query}` : basePath;
}

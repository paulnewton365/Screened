'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';

type SearchResult = {
  id: number;
  type: 'movie' | 'tv';
  title: string;
  release_year: number | null;
  poster_url: string | null;
  overview: string;
};

type Props = {
  /** Optional placeholder text. */
  placeholder?: string;
};

/**
 * Title search bar with debounced TMDB autocomplete.
 *
 * On selection: hits /api/titles/resolve to get-or-create our internal
 * title row, then navigates to /titles/[id]. The user goes from typing
 * a title to seeing the analysis (or a streaming run) without ever
 * manually managing IDs.
 */
export function TitleSearchBar({
  placeholder = 'Search a title — film or show…',
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      // No state changes here — derived state handles short queries.
      return;
    }

    const handle = setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/titles/search?q=${encodeURIComponent(query.trim())}`,
        );
        if (!res.ok) {
          setError('Search failed.');
          setResults([]);
        } else {
          const data = (await res.json()) as { results: SearchResult[] };
          setResults(data.results);
          setOpen(true);
        }
      } catch {
        setError('Search failed.');
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(handle);
  }, [query]);

  // Derived: when the query gets too short, treat results as empty.
  const effectiveResults = query.trim().length < 2 ? [] : results;
  const effectiveOpen = query.trim().length < 2 ? false : open;

  // Click outside to dismiss
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function handleSelect(result: SearchResult) {
    setResolvingId(result.id);
    setError(null);
    try {
      const res = await fetch(
        `/api/titles/resolve?tmdbId=${result.id}&type=${result.type}`,
      );
      if (!res.ok) {
        setError("We couldn't open that title. Try again.");
        setResolvingId(null);
        return;
      }
      const data = (await res.json()) as { id: string };
      startTransition(() => {
        router.push(`/titles/${data.id}`);
      });
    } catch {
      setError("We couldn't open that title. Try again.");
      setResolvingId(null);
    }
  }

  const showLoadingOverlay = resolvingId !== null || isPending;

  return (
    <div className="relative" ref={containerRef}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => effectiveResults.length > 0 && setOpen(true)}
        placeholder={placeholder}
        disabled={showLoadingOverlay}
        className="w-full px-4 py-3 bg-paper-raised border border-rule rounded-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
      />

      {searching && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-ink-subtle">
          searching…
        </span>
      )}

      {showLoadingOverlay && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-ink-muted">
          opening…
        </span>
      )}

      {error && (
        <p
          role="alert"
          className="mt-2 text-sm text-notice"
        >
          {error}
        </p>
      )}

      {effectiveOpen && effectiveResults.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-10 left-0 right-0 mt-2 bg-paper-raised border border-rule rounded-sm overflow-hidden shadow-sm"
        >
          {effectiveResults.map((r) => (
            <li key={`${r.type}-${r.id}`} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => handleSelect(r)}
                disabled={resolvingId !== null}
                className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-paper-sunken transition-colors border-b border-rule last:border-b-0 disabled:opacity-60"
              >
                {r.poster_url ? (
                  // Using <img> rather than next/image since these are
                  // arbitrary external URLs and we don't need optimisation.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.poster_url.replace('/w342', '/w92')}
                    alt=""
                    className="w-10 h-14 object-cover bg-paper-sunken flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-14 bg-paper-sunken flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-serif text-base text-ink truncate">
                      {r.title}
                    </span>
                    {r.release_year && (
                      <span className="editorial-meta">{r.release_year}</span>
                    )}
                    <span className="editorial-meta uppercase">
                      {r.type === 'movie' ? 'film' : 'TV'}
                    </span>
                  </div>
                  {r.overview && (
                    <p className="mt-1 text-sm text-ink-muted line-clamp-2 leading-snug">
                      {r.overview}
                    </p>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {effectiveOpen && effectiveResults.length === 0 && !searching && query.trim().length >= 2 && (
        <div className="absolute z-10 left-0 right-0 mt-2 px-4 py-3 bg-paper-raised border border-rule rounded-sm text-sm text-ink-muted">
          Nothing matches that. Try a different spelling or year.
        </div>
      )}
    </div>
  );
}

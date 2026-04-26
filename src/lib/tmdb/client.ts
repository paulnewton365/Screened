import { getServerEnv } from '@/lib/env';

/**
 * TMDB v4 API client.
 *
 * TMDB issues both v3 keys and v4 read access tokens. We use the v4
 * token (a long JWT-style string) which goes in the Authorization
 * header rather than a query parameter. Cleaner, and the v4 endpoints
 * are more consistent.
 *
 * All functions throw on network failures or non-2xx responses. Callers
 * should wrap in try/catch and translate to user-friendly errors.
 */

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

type TmdbInit = RequestInit & { next?: { revalidate?: number } };

async function tmdbFetch<T>(path: string, init?: TmdbInit): Promise<T> {
  const env = getServerEnv();
  const url = path.startsWith('http') ? path : `${TMDB_BASE}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.TMDB_API_KEY}`,
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    throw new Error(`TMDB request failed: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

// ----------------------------------------------------------------------------
// Search
// ----------------------------------------------------------------------------

export type TmdbSearchResult = {
  id: number;
  type: 'movie' | 'tv';
  title: string;
  original_title?: string;
  release_year: number | null;
  poster_url: string | null;
  overview: string;
  popularity: number;
  vote_average: number; // 0-10 scale, TMDB user ratings
  vote_count: number;
};

type TmdbMultiResponse = {
  results: Array<{
    id: number;
    media_type: 'movie' | 'tv' | 'person';
    title?: string;
    name?: string;
    original_title?: string;
    original_name?: string;
    release_date?: string;
    first_air_date?: string;
    poster_path?: string | null;
    overview?: string;
    popularity?: number;
    vote_average?: number;
    vote_count?: number;
  }>;
};

/**
 * Search TMDB across both movies and TV shows. Filters out 'person'
 * results and adult titles. Caches for 1 hour at the edge — title
 * search results don't change minute-to-minute.
 */
export async function searchTitles(query: string): Promise<TmdbSearchResult[]> {
  if (!query.trim()) return [];

  const params = new URLSearchParams({
    query,
    include_adult: 'false',
    language: 'en-US',
    page: '1',
  });

  const data = await tmdbFetch<TmdbMultiResponse>(
    `/search/multi?${params.toString()}`,
    { next: { revalidate: 3600 } },
  );

  return data.results
    .filter((r): r is typeof r & { media_type: 'movie' | 'tv' } =>
      r.media_type === 'movie' || r.media_type === 'tv',
    )
    .map((r) => {
      const date = r.release_date ?? r.first_air_date ?? null;
      const year = date ? Number.parseInt(date.slice(0, 4), 10) : null;
      return {
        id: r.id,
        type: r.media_type,
        title: r.title ?? r.name ?? 'Untitled',
        original_title: r.original_title ?? r.original_name,
        release_year: Number.isFinite(year) ? year : null,
        poster_url: r.poster_path
          ? `${TMDB_IMAGE_BASE}/w342${r.poster_path}`
          : null,
        overview: r.overview ?? '',
        popularity: r.popularity ?? 0,
        vote_average: r.vote_average ?? 0,
        vote_count: r.vote_count ?? 0,
      };
    })
    .slice(0, 8); // Cap to 8 most relevant results
}

// ----------------------------------------------------------------------------
// Title details and certifications
// ----------------------------------------------------------------------------

export type TmdbCertification = {
  rating: string;
  source: 'MPAA' | 'BBFC';
  descriptors?: string[];
};

export type TmdbTitleDetails = {
  tmdb_id: number;
  type: 'movie' | 'tv';
  title: string;
  original_title?: string;
  release_year: number | null;
  poster_url: string | null;
  backdrop_url: string | null;
  synopsis: string;
  certifications: {
    us?: TmdbCertification;
    uk?: TmdbCertification;
    fetched_at: string;
  };
  metadata: {
    genres?: string[];
    runtime?: number;
    networks?: string[];
    original_language?: string;
  };
};

type TmdbMovieDetailsResponse = {
  id: number;
  title: string;
  original_title?: string;
  release_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  runtime?: number;
  genres?: Array<{ id: number; name: string }>;
  original_language?: string;
};

type TmdbTvDetailsResponse = {
  id: number;
  name: string;
  original_name?: string;
  first_air_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  episode_run_time?: number[];
  genres?: Array<{ id: number; name: string }>;
  networks?: Array<{ name: string }>;
  original_language?: string;
};

type TmdbReleaseDatesResponse = {
  results: Array<{
    iso_3166_1: string;
    release_dates: Array<{
      certification: string;
      type: number;
    }>;
  }>;
};

type TmdbContentRatingsResponse = {
  results: Array<{
    iso_3166_1: string;
    rating: string;
  }>;
};

/**
 * Fetch a movie's certification from US and GB regions. Releases come
 * in multiple types (theatrical, physical, digital, etc.); we prefer
 * theatrical (type 3) and fall back to whatever's available.
 */
async function fetchMovieCertifications(
  tmdbId: number,
): Promise<{ us?: TmdbCertification; uk?: TmdbCertification }> {
  const data = await tmdbFetch<TmdbReleaseDatesResponse>(
    `/movie/${tmdbId}/release_dates`,
    { next: { revalidate: 86400 } },
  );

  const out: { us?: TmdbCertification; uk?: TmdbCertification } = {};

  for (const region of data.results ?? []) {
    if (region.iso_3166_1 !== 'US' && region.iso_3166_1 !== 'GB') continue;

    const sortedReleases = [...region.release_dates].sort((a, b) => {
      // Prefer theatrical (type 3), then any
      if (a.type === 3 && b.type !== 3) return -1;
      if (b.type === 3 && a.type !== 3) return 1;
      return 0;
    });
    const cert = sortedReleases.find((r) => r.certification?.trim())?.certification;
    if (!cert) continue;

    if (region.iso_3166_1 === 'US') {
      out.us = { rating: cert, source: 'MPAA' };
    } else {
      out.uk = { rating: cert, source: 'BBFC' };
    }
  }

  return out;
}

/**
 * TV content ratings are simpler — single rating per region.
 */
async function fetchTvCertifications(
  tmdbId: number,
): Promise<{ us?: TmdbCertification; uk?: TmdbCertification }> {
  const data = await tmdbFetch<TmdbContentRatingsResponse>(
    `/tv/${tmdbId}/content_ratings`,
    { next: { revalidate: 86400 } },
  );

  const out: { us?: TmdbCertification; uk?: TmdbCertification } = {};

  for (const region of data.results ?? []) {
    if (region.iso_3166_1 === 'US' && region.rating) {
      out.us = { rating: region.rating, source: 'MPAA' };
    } else if (region.iso_3166_1 === 'GB' && region.rating) {
      out.uk = { rating: region.rating, source: 'BBFC' };
    }
  }

  return out;
}

/**
 * Get full details for a title including certifications.
 * Used by the resolve route to populate our titles table.
 */
export async function getTitleDetails(
  tmdbId: number,
  type: 'movie' | 'tv',
): Promise<TmdbTitleDetails> {
  if (type === 'movie') {
    const [details, certs] = await Promise.all([
      tmdbFetch<TmdbMovieDetailsResponse>(`/movie/${tmdbId}`, {
        next: { revalidate: 86400 },
      }),
      fetchMovieCertifications(tmdbId),
    ]);

    const year = details.release_date
      ? Number.parseInt(details.release_date.slice(0, 4), 10)
      : null;

    return {
      tmdb_id: details.id,
      type: 'movie',
      title: details.title,
      original_title: details.original_title,
      release_year: Number.isFinite(year) ? year : null,
      poster_url: details.poster_path
        ? `${TMDB_IMAGE_BASE}/w500${details.poster_path}`
        : null,
      backdrop_url: details.backdrop_path
        ? `${TMDB_IMAGE_BASE}/w1280${details.backdrop_path}`
        : null,
      synopsis: details.overview ?? '',
      certifications: {
        ...certs,
        fetched_at: new Date().toISOString(),
      },
      metadata: {
        genres: details.genres?.map((g) => g.name),
        runtime: details.runtime,
        original_language: details.original_language,
      },
    };
  }

  const [details, certs] = await Promise.all([
    tmdbFetch<TmdbTvDetailsResponse>(`/tv/${tmdbId}`, {
      next: { revalidate: 86400 },
    }),
    fetchTvCertifications(tmdbId),
  ]);

  const year = details.first_air_date
    ? Number.parseInt(details.first_air_date.slice(0, 4), 10)
    : null;

  return {
    tmdb_id: details.id,
    type: 'tv',
    title: details.name,
    original_title: details.original_name,
    release_year: Number.isFinite(year) ? year : null,
    poster_url: details.poster_path
      ? `${TMDB_IMAGE_BASE}/w500${details.poster_path}`
      : null,
    backdrop_url: details.backdrop_path
      ? `${TMDB_IMAGE_BASE}/w1280${details.backdrop_path}`
      : null,
    synopsis: details.overview ?? '',
    certifications: {
      ...certs,
      fetched_at: new Date().toISOString(),
    },
    metadata: {
      genres: details.genres?.map((g) => g.name),
      runtime: details.episode_run_time?.[0],
      networks: details.networks?.map((n) => n.name),
      original_language: details.original_language,
    },
  };
}

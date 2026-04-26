import Anthropic from '@anthropic-ai/sdk';
import { getServerEnv } from '@/lib/env';
import { searchTitles, type TmdbSearchResult } from '@/lib/tmdb/client';
import { CURATION_SYSTEM_PROMPT } from './prompts';
import {
  curatedListSchema,
  RECOMMENDATIONS_TOOL_INPUT_SCHEMA,
  type AgeBand,
  type CuratedTitle,
} from './schemas';

/**
 * Run a single age-band curation pass.
 *
 * Same Anthropic SDK streaming + tool use pattern as the analysis call,
 * just a different prompt and tool. We don't need to surface progress
 * here (this runs from a cron, no UI), so we just await the final
 * structured output.
 */
export async function curateAgeBand(ageBand: AgeBand): Promise<CuratedTitle[]> {
  const env = getServerEnv();
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const userPrompt = `Curate the 5 most consistently parent-recommended films and TV shows for children aged ${ageBand}.

Search the web for parent-focused recommendation lists across the priority sources. Identify titles that appear across multiple credible sources. Submit your final 5-8 picks via the submit_recommendations tool.`;

  const message = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 4000,
    system: [
      {
        type: 'text',
        text: CURATION_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools: [
      {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 8,
      },
      {
        name: 'submit_recommendations',
        description:
          'Submit the final list of recommended titles for this age band. Call this exactly once after gathering recommendations from web searches.',
        input_schema: RECOMMENDATIONS_TOOL_INPUT_SCHEMA,
      },
    ],
    messages: [{ role: 'user', content: userPrompt }],
  });

  // Find the submit_recommendations tool use in the response
  let submittedInput: unknown = null;
  for (const block of message.content) {
    if (block.type === 'tool_use' && block.name === 'submit_recommendations') {
      submittedInput = block.input;
      break;
    }
  }

  if (!submittedInput) {
    throw new Error(
      `Curator returned no submit_recommendations tool call for age band ${ageBand}.`,
    );
  }

  const parsed = curatedListSchema.safeParse(submittedInput);
  if (!parsed.success) {
    throw new Error(
      `Curator returned invalid output for ${ageBand}: ${parsed.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')}`,
    );
  }

  return parsed.data.titles;
}

export type ResolvedRecommendation = {
  curated: CuratedTitle;
  tmdb_id: number;
  type: 'movie' | 'tv';
  resolved_title: string;
  resolved_year: number | null;
  poster_url: string | null;
};

/**
 * Resolve curated titles against TMDB to get canonical IDs and posters.
 *
 * For each curated title, we run a TMDB search and pick the best match
 * by year + type. Titles that can't be confidently matched get dropped
 * — that's why we ask the curator for 5-8 titles, so we can lose a few
 * to resolution failures and still have 5.
 */
export async function resolveCuratedTitles(
  curated: CuratedTitle[],
): Promise<ResolvedRecommendation[]> {
  const out: ResolvedRecommendation[] = [];

  for (const c of curated) {
    const tmdbResult = await findBestTmdbMatch(c).catch(() => null);
    if (!tmdbResult) continue;

    out.push({
      curated: c,
      tmdb_id: tmdbResult.id,
      type: tmdbResult.type,
      resolved_title: tmdbResult.title,
      resolved_year: tmdbResult.release_year,
      poster_url: tmdbResult.poster_url,
    });
  }

  return out;
}

async function findBestTmdbMatch(
  curated: CuratedTitle,
): Promise<TmdbSearchResult | null> {
  // Build query: "title year" works well for TMDB's multi-search.
  const query = curated.year
    ? `${curated.title} ${curated.year}`
    : curated.title;

  const results = await searchTitles(query);
  if (results.length === 0) return null;

  // Filter by type first
  const typeMatches = results.filter((r) => r.type === curated.type);
  const candidates = typeMatches.length > 0 ? typeMatches : results;

  // Prefer matches with the right year. If the curator gave us a year
  // and a candidate matches it, that's a strong signal.
  if (curated.year !== null) {
    const yearMatch = candidates.find((r) => r.release_year === curated.year);
    if (yearMatch) return yearMatch;

    // Allow off-by-one (release year vs first air date can disagree)
    const offByOne = candidates.find(
      (r) =>
        r.release_year !== null &&
        Math.abs(r.release_year - curated.year!) <= 1,
    );
    if (offByOne) return offByOne;
  }

  // Fall back to the most popular match — TMDB orders by popularity
  return candidates[0];
}

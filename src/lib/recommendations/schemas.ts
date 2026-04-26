import { z } from 'zod';

/**
 * Schemas for the recommendations curation pipeline.
 *
 * The Claude curator returns a list of 5 titles per age band via a
 * forced tool call. After Claude returns we resolve each title to a
 * TMDB ID and only persist titles that resolve successfully.
 */

export const sourceSchema = z.object({
  name: z.string(),
  url: z.string(),
});

export const curatedTitleSchema = z.object({
  title: z.string(),
  year: z.number().int().min(1900).max(2100).nullable(),
  type: z.enum(['movie', 'tv']),
  blurb: z.string(),
  sources: z.array(sourceSchema),
});

export type CuratedTitle = z.infer<typeof curatedTitleSchema>;

export const curatedListSchema = z.object({
  titles: z.array(curatedTitleSchema).min(3).max(8),
});

export type CuratedList = z.infer<typeof curatedListSchema>;

/**
 * JSON Schema for the submit_recommendations tool that Claude must call.
 * Hand-crafted to match the Zod schema above.
 */
type RecommendationsToolSchema = {
  type: 'object';
  required: string[];
  properties: Record<string, unknown>;
};

export const RECOMMENDATIONS_TOOL_INPUT_SCHEMA: RecommendationsToolSchema = {
  type: 'object',
  required: ['titles'],
  properties: {
    titles: {
      type: 'array',
      minItems: 5,
      maxItems: 8,
      description:
        'Five most consistently parent-recommended titles for this age band, ordered most-to-least recommended. Up to 8 allowed in case some can\u2019t be resolved against TMDB; we keep the top 5 that resolve.',
      items: {
        type: 'object',
        required: ['title', 'type', 'blurb', 'sources'],
        properties: {
          title: { type: 'string' },
          year: {
            type: ['integer', 'null'],
            minimum: 1900,
            maximum: 2100,
            description: 'Release year if known, else null.',
          },
          type: {
            type: 'string',
            enum: ['movie', 'tv'],
          },
          blurb: {
            type: 'string',
            description:
              '2-3 sentences in the Screened editorial voice paraphrasing why parents recommend this. Neutral, advisory, never promotional.',
          },
          sources: {
            type: 'array',
            minItems: 1,
            description:
              'Where you saw this recommended. Aim for 3+ distinct sources.',
            items: {
              type: 'object',
              required: ['name', 'url'],
              properties: {
                name: { type: 'string' },
                url: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
};

/**
 * The age bands we curate for. Mirrors the database enum on
 * recommendations.age_band and the helper function child_age_band().
 */
export const AGE_BANDS = [
  '0-2',
  '3-4',
  '5-6',
  '7-9',
  '10-12',
  '13-15',
  '16+',
] as const;

export type AgeBand = (typeof AGE_BANDS)[number];

export const AGE_BAND_LABEL: Record<AgeBand, string> = {
  '0-2': 'Under 3',
  '3-4': '3 to 4',
  '5-6': '5 to 6',
  '7-9': '7 to 9',
  '10-12': '10 to 12',
  '13-15': '13 to 15',
  '16+': '16 and up',
};

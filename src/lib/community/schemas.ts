import { z } from 'zod';

/**
 * Schema for the observations JSONB blob stored in
 * community_observations.observations.
 *
 * The shape is normalised across all bands and titles so the display
 * layer can read it uniformly. Each numeric dimension carries a median
 * and a distribution (counts at values 1..5). The would_rewatch field
 * is bucketed into yes/no/unsure counts.
 */

export const dimensionAggregateSchema = z.object({
  median: z.number().nullable(),
  distribution: z.array(z.number().int()).length(5),
  n: z.number().int(), // count with non-null value
});

export type DimensionAggregate = z.infer<typeof dimensionAggregateSchema>;

export const communityObservationSchema = z.object({
  /** Total screenings in this band (≥ MIN_N when published). */
  n: z.number().int(),
  engagement_quality: dimensionAggregateSchema,
  emotional_resonance: dimensionAggregateSchema,
  fear_response: dimensionAggregateSchema,
  behavioral_impact: dimensionAggregateSchema,
  play_inspiration: dimensionAggregateSchema,
  would_rewatch_yes: z.number().int(),
  would_rewatch_no: z.number().int(),
  would_rewatch_unsure: z.number().int(),
});

export type CommunityObservation = z.infer<typeof communityObservationSchema>;

/**
 * Minimum screenings in a (title, age band, sensitivity band) group
 * before we publish a community observation row. Privacy floor —
 * raise this once the user base is bigger.
 */
export const MIN_OBSERVATIONS_FOR_PUBLISH = 3;

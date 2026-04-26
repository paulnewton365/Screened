import { z } from 'zod';

/**
 * Schemas for the screenings feature.
 *
 * A screening is a parent's record of considering or watching a title
 * with a specific child. It's created when the parent saves a title to
 * the child's library, and observation fields are filled in afterwards.
 *
 * The fit verdict and reasoning are pinned at save time so the saved
 * record stays meaningful even if the title's analysis is refreshed
 * later.
 */

export const SaveScreeningSchema = z.object({
  child_id: z.string().uuid(),
  title_id: z.string().uuid(),
});

export type SaveScreeningInput = z.infer<typeof SaveScreeningSchema>;

/**
 * Observations recorded after viewing.
 *
 * Every field is optional — a parent might record only a fear_response,
 * or only parent_notes, or all of them. Allow null to clear a previously
 * set value.
 */
export const ObservationSchema = z.object({
  watched_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a yyyy-mm-dd date')
    .optional()
    .nullable(),
  behavioral_impact: z.number().int().min(1).max(5).nullable().optional(),
  fear_response: z.number().int().min(1).max(5).nullable().optional(),
  play_inspiration: z.number().int().min(1).max(5).nullable().optional(),
  engagement_quality: z.number().int().min(1).max(5).nullable().optional(),
  emotional_resonance: z.number().int().min(1).max(5).nullable().optional(),
  parent_notes: z
    .string()
    .max(5000, 'Notes are limited to 5,000 characters')
    .nullable()
    .optional(),
  would_rewatch: z.boolean().nullable().optional(),
});

export type ObservationInput = z.infer<typeof ObservationSchema>;

/**
 * Static text describing each observation dimension. Used in the
 * observation form to anchor what each scale actually means in the
 * Screened voice.
 */
export const OBSERVATION_DIMENSIONS = [
  {
    key: 'engagement_quality' as const,
    label: 'How engaged were they?',
    helper:
      'Captivated and present (5) vs. half-attention while doing something else (1).',
  },
  {
    key: 'emotional_resonance' as const,
    label: 'How much did it move them?',
    helper:
      'Made them think and feel (5) vs. forgettable, no real reaction (1).',
  },
  {
    key: 'fear_response' as const,
    label: 'Any fear or distress?',
    helper:
      'None at all (1) vs. asked to stop watching, lingering worry, or sleep disrupted (5).',
  },
  {
    key: 'behavioral_impact' as const,
    label: 'Any behaviour shift after?',
    helper:
      'No noticeable change (1) vs. a marked shift you can trace to the show (5) — could be positive or negative.',
  },
  {
    key: 'play_inspiration' as const,
    label: 'Did it spark anything?',
    helper:
      'Not at all (1) vs. inspired play, conversation, drawings, questions (5).',
  },
];

export const DeleteScreeningSchema = z.object({
  id: z.string().uuid(),
});

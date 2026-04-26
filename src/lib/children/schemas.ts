import { z } from 'zod';

/**
 * Validation schema for creating/updating a child profile.
 *
 * Reflects the database schema:
 *   - name is required (everything else is optional)
 *   - sensitivity scores default to 3 (the "average" mid-point)
 *   - personality fields are entirely optional
 *
 * The "never gate" principle: a parent can complete onboarding with just
 * a name. Defaults take care of the rest.
 */

export const SCALE_VALUES = [1, 2, 3, 4, 5] as const;
export type ScaleValue = (typeof SCALE_VALUES)[number];

const scaleSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(5)
  .default(3);

const optionalScaleSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(5)
  .optional()
  .or(z.literal('').transform(() => undefined));

export const childSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'A name or nickname helps. It can be anything.')
    .max(50, 'Names should be under 50 characters.'),

  birth_date: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .pipe(
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please use the date picker.')
        .optional(),
    ),

  fear_sensitivity: scaleSchema,
  stimulation_sensitivity: scaleSchema,
  emotional_sensitivity: scaleSchema,

  energy_level: optionalScaleSchema,
  attention_span: optionalScaleSchema,

  // Interests come as a comma-separated list from a hidden form field
  // populated by the chip selector. Empty string means none picked.
  interests: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    ),

  current_themes: z
    .string()
    .trim()
    .max(500, 'Keep this under 500 characters.')
    .optional()
    .transform((v) => (v ? v : undefined)),

  notes: z
    .string()
    .trim()
    .max(1000, 'Keep notes under 1000 characters.')
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type ChildInput = z.input<typeof childSchema>;
export type ChildOutput = z.output<typeof childSchema>;

/**
 * Predefined interests shown as chips. Parents can pick any/all/none.
 * Worth keeping this list short and broad — narrow taxonomies feel
 * judgemental and most kids fit several.
 */
export const INTEREST_OPTIONS = [
  'Animals',
  'Vehicles',
  'Dinosaurs',
  'Music',
  'Magic & fantasy',
  'Science & nature',
  'Sports',
  'Friendship stories',
  'Art & making',
  'Adventure',
] as const;

/**
 * Anchored descriptions for each sensitivity dimension.
 * These show under the slider so "3" isn't a number with no meaning.
 */
export const SENSITIVITY_ANCHORS = {
  fear: {
    label: 'Fear sensitivity',
    question: 'How easily are they frightened or unsettled?',
    low: 'Loves anything, never bothered',
    mid: 'Handles mild scares fine',
    high: 'Avoids spooky things, unsettled by mild jeopardy',
  },
  stimulation: {
    label: 'Stimulation sensitivity',
    question: 'How do they handle fast-paced, loud, or busy content?',
    low: 'Thrives on high energy',
    mid: 'Fine in moderation',
    high: 'Becomes dysregulated after intense content',
  },
  emotional: {
    label: 'Emotional sensitivity',
    question: 'How deeply do they feel emotional content?',
    low: 'Rolls off them',
    mid: 'Engages in the moment, recovers easily',
    high: 'Carries it home, asks questions for days',
  },
} as const;

export const PERSONALITY_ANCHORS = {
  energy: {
    label: 'Energy level',
    question: 'How active are they generally?',
    low: 'Calm and steady',
    mid: 'Balanced',
    high: 'Always on the move',
  },
  attention: {
    label: 'Attention span',
    question: 'How long can they focus on one thing?',
    low: 'Short bursts',
    mid: 'Average',
    high: 'Will lose hours to a good story',
  },
} as const;

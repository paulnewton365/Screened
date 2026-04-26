import { z } from 'zod';

/**
 * Structured output schema for the Claude analysis call.
 *
 * Mirrors the schema we defined in the analysis system prompt. We force
 * Claude to call a "submit_analysis" tool with this exact shape, which
 * guarantees the response is structured — no JSON parsing of free-form
 * text, no fallback handling for malformed output.
 */

const scaleScore = z.object({
  value: z.number().int().min(1).max(5).nullable(),
  evidence: z.string(),
});

const violenceDetailsSchema = z.object({
  type: z.string(),
  consequences: z.string(),
  targets: z.string(),
  frequency: z.string(),
});

const themeSchema = z.object({
  title: z.string(),
  sentiment: z.enum(['positive', 'negative', 'mixed']),
  prevalence: z.enum(['common', 'sometimes', 'minority']),
  summary: z.string(),
});

const ageRecommendationSchema = z.object({
  min: z.number().int().min(0).max(18),
  max: z.number().int().min(0).max(18),
  reasoning: z.string(),
});

const sourceSchema = z.object({
  name: z.string(),
  url: z.string(),
});

export const analysisSchema = z.object({
  high_level_summary: z.string(),
  scores: z.object({
    stimulation_intensity: scaleScore,
    violence_level: scaleScore,
    violence_details: violenceDetailsSchema,
    frightening_content: scaleScore,
    sexual_content: scaleScore,
    romance_content: scaleScore,
    adult_themes: scaleScore,
    adult_themes_handling: scaleScore,
    language_level: scaleScore,
    narrative_quality: scaleScore,
    production_quality: scaleScore,
    prosocial_content: scaleScore,
    prosocial_authenticity: scaleScore,
    representation: scaleScore,
    agency_role_models: scaleScore,
    commercialism: scaleScore,
    educational_value: scaleScore,
  }),
  themes: z.array(themeSchema).min(3).max(8),
  age_recommendation: ageRecommendationSchema,
  content_warnings: z.array(z.string()),
  confidence: z.enum(['high', 'medium', 'low']),
  source_count: z.number().int().min(0),
  sources: z.array(sourceSchema),
});

export type Analysis = z.infer<typeof analysisSchema>;
export type AnalysisScores = Analysis['scores'];
export type ScoreDimension = keyof AnalysisScores;

/**
 * The current rubric version. Bump this when the analysis prompt or
 * schema changes. Stored alongside each analysis row so we can audit
 * drift and roll back if needed.
 */
export const ANALYSIS_VERSION = 'v1';

/**
 * JSON Schema for Anthropic's tool input. Hand-crafted to match the
 * Zod schema above — we keep them in sync by hand because Zod v4's
 * built-in JSON Schema export produces shapes Anthropic doesn't always
 * accept (e.g. nullable handling).
 *
 * Used as the `input_schema` of our submit_analysis tool.
 */
type AnalysisToolInputSchema = {
  type: 'object';
  required: string[];
  properties: Record<string, unknown>;
};

export const ANALYSIS_TOOL_INPUT_SCHEMA: AnalysisToolInputSchema = {
  type: 'object',
  required: [
    'high_level_summary',
    'scores',
    'themes',
    'age_recommendation',
    'content_warnings',
    'confidence',
    'source_count',
    'sources',
  ],
  properties: {
    high_level_summary: {
      type: 'string',
      description:
        '3-5 sentences in the Screened editorial voice. Neutral, advisory, paraphrased from parent feedback.',
    },
    scores: {
      type: 'object',
      required: [
        'stimulation_intensity',
        'violence_level',
        'violence_details',
        'frightening_content',
        'sexual_content',
        'romance_content',
        'adult_themes',
        'adult_themes_handling',
        'language_level',
        'narrative_quality',
        'production_quality',
        'prosocial_content',
        'prosocial_authenticity',
        'representation',
        'agency_role_models',
        'commercialism',
        'educational_value',
      ],
      properties: Object.fromEntries(
        [
          'stimulation_intensity',
          'violence_level',
          'frightening_content',
          'sexual_content',
          'romance_content',
          'adult_themes',
          'adult_themes_handling',
          'language_level',
          'narrative_quality',
          'production_quality',
          'prosocial_content',
          'prosocial_authenticity',
          'representation',
          'agency_role_models',
          'commercialism',
          'educational_value',
        ].map((dim) => [
          dim,
          {
            type: 'object',
            required: ['value', 'evidence'],
            properties: {
              value: {
                type: ['integer', 'null'],
                minimum: 1,
                maximum: 5,
                description:
                  '1-5 score, or null if feedback is too sparse to score confidently.',
              },
              evidence: {
                type: 'string',
                description:
                  'One-sentence paraphrase of what parents said that informed this score. Keep brief.',
              },
            },
          },
        ]),
      ),
      // violence_details is structurally different from the scaled scores
    } as const,
    themes: {
      type: 'array',
      minItems: 3,
      maxItems: 8,
      items: {
        type: 'object',
        required: ['title', 'sentiment', 'prevalence', 'summary'],
        properties: {
          title: { type: 'string' },
          sentiment: {
            type: 'string',
            enum: ['positive', 'negative', 'mixed'],
          },
          prevalence: {
            type: 'string',
            enum: ['common', 'sometimes', 'minority'],
          },
          summary: { type: 'string' },
        },
      },
    },
    age_recommendation: {
      type: 'object',
      required: ['min', 'max', 'reasoning'],
      properties: {
        min: { type: 'integer', minimum: 0, maximum: 18 },
        max: { type: 'integer', minimum: 0, maximum: 18 },
        reasoning: { type: 'string' },
      },
    },
    content_warnings: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Flat list of specific things parents have flagged. Notices, not judgements.',
    },
    confidence: {
      type: 'string',
      enum: ['high', 'medium', 'low'],
    },
    source_count: { type: 'integer', minimum: 0 },
    sources: {
      type: 'array',
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
};

// Inject violence_details (it's the one structurally different score in scores)
const scoresProps = (
  ANALYSIS_TOOL_INPUT_SCHEMA.properties.scores as {
    properties: Record<string, unknown>;
  }
).properties;
scoresProps.violence_details = {
  type: 'object',
  required: ['type', 'consequences', 'targets', 'frequency'],
  properties: {
    type: { type: 'string', description: 'cartoon | slapstick | stylised | realistic' },
    consequences: { type: 'string', description: 'none | mild | serious' },
    targets: { type: 'string', description: 'objects | villains | sympathetic' },
    frequency: { type: 'string', description: 'rare | occasional | frequent' },
  },
};

import { createServiceRoleClient } from '@/lib/supabase/service';
import { ANALYSIS_VERSION, type Analysis } from '@/lib/claude/schemas';

/**
 * Storage layer for analyses.
 *
 * Important: writes use the service role client to bypass RLS, because
 * analyses are global (not per-user). Reads from titles_analyses go
 * through the regular user-scoped client where the RLS policy grants
 * SELECT to all authenticated users.
 */

/**
 * Persist a fresh analysis. Returns the new row id.
 * If a previous analysis existed, links the chain via supersedes/superseded_by.
 */
export async function storeAnalysis(input: {
  titleId: string;
  analysis: Analysis;
  triggeredBy: string | null;
}): Promise<string> {
  const supabase = createServiceRoleClient();

  // Find the current (non-superseded) analysis for this title, if any.
  const { data: previousArr } = await supabase
    .from('title_analyses')
    .select('id')
    .eq('title_id', input.titleId)
    .is('superseded_by', null)
    .order('generated_at', { ascending: false })
    .limit(1);

  const previous = previousArr?.[0] ?? null;

  // Insert the new analysis row.
  const a = input.analysis;
  const s = a.scores;

  const { data: inserted, error: insertError } = await supabase
    .from('title_analyses')
    .insert({
      title_id: input.titleId,
      high_level_summary: a.high_level_summary,

      stimulation_intensity: s.stimulation_intensity.value,
      stimulation_intensity_evidence: s.stimulation_intensity.evidence,
      violence_level: s.violence_level.value,
      violence_level_evidence: s.violence_level.evidence,
      violence_details: s.violence_details,
      frightening_content: s.frightening_content.value,
      frightening_content_evidence: s.frightening_content.evidence,
      sexual_content: s.sexual_content.value,
      sexual_content_evidence: s.sexual_content.evidence,
      romance_content: s.romance_content.value,
      romance_content_evidence: s.romance_content.evidence,
      adult_themes: s.adult_themes.value,
      adult_themes_evidence: s.adult_themes.evidence,
      adult_themes_handling: s.adult_themes_handling.value,
      adult_themes_handling_evidence: s.adult_themes_handling.evidence,
      language_level: s.language_level.value,
      language_level_evidence: s.language_level.evidence,
      narrative_quality: s.narrative_quality.value,
      narrative_quality_evidence: s.narrative_quality.evidence,
      production_quality: s.production_quality.value,
      production_quality_evidence: s.production_quality.evidence,
      prosocial_content: s.prosocial_content.value,
      prosocial_content_evidence: s.prosocial_content.evidence,
      prosocial_authenticity: s.prosocial_authenticity.value,
      prosocial_authenticity_evidence: s.prosocial_authenticity.evidence,
      representation: s.representation.value,
      representation_evidence: s.representation.evidence,
      agency_role_models: s.agency_role_models.value,
      agency_role_models_evidence: s.agency_role_models.evidence,
      commercialism: s.commercialism.value,
      commercialism_evidence: s.commercialism.evidence,
      educational_value: s.educational_value.value,
      educational_value_evidence: s.educational_value.evidence,

      themes: a.themes,
      age_recommendation_min: a.age_recommendation.min,
      age_recommendation_max: a.age_recommendation.max,
      age_recommendation_reasoning: a.age_recommendation.reasoning,
      content_warnings: a.content_warnings,
      confidence: a.confidence,
      source_count: a.source_count,
      sources: a.sources,
      analysis_version: ANALYSIS_VERSION,

      supersedes: previous?.id ?? null,
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    throw new Error(
      `Failed to store analysis: ${insertError?.message ?? 'unknown error'}`,
    );
  }

  // If there was a previous analysis, mark it superseded by the new one.
  if (previous) {
    await supabase
      .from('title_analyses')
      .update({ superseded_by: inserted.id })
      .eq('id', previous.id);

    // Log the refresh event so the cooldown function can find it.
    await supabase.from('title_refresh_log').insert({
      title_id: input.titleId,
      triggered_by: input.triggeredBy,
      previous_analysis_id: previous.id,
      new_analysis_id: inserted.id,
    });
  }

  return inserted.id;
}

/**
 * Reconstruct an Analysis object from a database row.
 * Used when serving cached analyses to the UI.
 */
export type TitleAnalysisRow = {
  id: string;
  high_level_summary: string;
  stimulation_intensity: number | null;
  stimulation_intensity_evidence: string | null;
  violence_level: number | null;
  violence_level_evidence: string | null;
  violence_details: unknown;
  frightening_content: number | null;
  frightening_content_evidence: string | null;
  sexual_content: number | null;
  sexual_content_evidence: string | null;
  romance_content: number | null;
  romance_content_evidence: string | null;
  adult_themes: number | null;
  adult_themes_evidence: string | null;
  adult_themes_handling: number | null;
  adult_themes_handling_evidence: string | null;
  language_level: number | null;
  language_level_evidence: string | null;
  narrative_quality: number | null;
  narrative_quality_evidence: string | null;
  production_quality: number | null;
  production_quality_evidence: string | null;
  prosocial_content: number | null;
  prosocial_content_evidence: string | null;
  prosocial_authenticity: number | null;
  prosocial_authenticity_evidence: string | null;
  representation: number | null;
  representation_evidence: string | null;
  agency_role_models: number | null;
  agency_role_models_evidence: string | null;
  commercialism: number | null;
  commercialism_evidence: string | null;
  educational_value: number | null;
  educational_value_evidence: string | null;
  themes: unknown;
  age_recommendation_min: number | null;
  age_recommendation_max: number | null;
  age_recommendation_reasoning: string | null;
  content_warnings: string[] | null;
  confidence: 'high' | 'medium' | 'low';
  source_count: number;
  sources: unknown;
  generated_at: string;
};

export function rowToAnalysis(row: TitleAnalysisRow): Analysis {
  function score(value: number | null, evidence: string | null) {
    return { value, evidence: evidence ?? '' };
  }

  return {
    high_level_summary: row.high_level_summary,
    scores: {
      stimulation_intensity: score(
        row.stimulation_intensity,
        row.stimulation_intensity_evidence,
      ),
      violence_level: score(row.violence_level, row.violence_level_evidence),
      violence_details: (row.violence_details as Analysis['scores']['violence_details']) ?? {
        type: '',
        consequences: '',
        targets: '',
        frequency: '',
      },
      frightening_content: score(
        row.frightening_content,
        row.frightening_content_evidence,
      ),
      sexual_content: score(row.sexual_content, row.sexual_content_evidence),
      romance_content: score(row.romance_content, row.romance_content_evidence),
      adult_themes: score(row.adult_themes, row.adult_themes_evidence),
      adult_themes_handling: score(
        row.adult_themes_handling,
        row.adult_themes_handling_evidence,
      ),
      language_level: score(row.language_level, row.language_level_evidence),
      narrative_quality: score(
        row.narrative_quality,
        row.narrative_quality_evidence,
      ),
      production_quality: score(
        row.production_quality,
        row.production_quality_evidence,
      ),
      prosocial_content: score(
        row.prosocial_content,
        row.prosocial_content_evidence,
      ),
      prosocial_authenticity: score(
        row.prosocial_authenticity,
        row.prosocial_authenticity_evidence,
      ),
      representation: score(row.representation, row.representation_evidence),
      agency_role_models: score(
        row.agency_role_models,
        row.agency_role_models_evidence,
      ),
      commercialism: score(row.commercialism, row.commercialism_evidence),
      educational_value: score(
        row.educational_value,
        row.educational_value_evidence,
      ),
    },
    themes: (row.themes as Analysis['themes']) ?? [],
    age_recommendation: {
      min: row.age_recommendation_min ?? 0,
      max: row.age_recommendation_max ?? 18,
      reasoning: row.age_recommendation_reasoning ?? '',
    },
    content_warnings: row.content_warnings ?? [],
    confidence: row.confidence,
    source_count: row.source_count,
    sources: (row.sources as Analysis['sources']) ?? [],
  };
}

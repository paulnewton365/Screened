import type { Analysis } from '@/lib/claude/schemas';
import { computeHardFlags, ageFromBirthDate, type HardFlag } from './hard-rails';

/**
 * Deterministic fit computation.
 *
 * We could call Claude a second time for richer natural-language
 * reasoning, but for the MVP a rules-based approach is faster, cheaper,
 * and more predictable. The trade-off: reasoning is templated rather
 * than nuanced.
 *
 * We can layer in a Claude-powered "richer fit" pass later as an
 * explicit user request ("get a deeper read") — the analysis row
 * stays the same.
 *
 * Verdict bands (matching the database enum):
 *   great_fit          — strong match, no concerns
 *   good_fit           — broadly suitable with minor watch-points
 *   worth_a_look       — mixed signals, parent judgment matters
 *   stretch            — meaningful tension with the profile
 *   not_a_fit_right_now — hard flags or sharp divergence
 */

export type FitVerdict =
  | 'great_fit'
  | 'good_fit'
  | 'worth_a_look'
  | 'stretch'
  | 'not_a_fit_right_now';

export type ChildProfile = {
  id: string;
  name: string;
  birth_date: string | null;
  fear_sensitivity: number;
  stimulation_sensitivity: number;
  emotional_sensitivity: number;
};

export type FitResult = {
  verdict: FitVerdict;
  headline: string;
  reasoning: string;
  overall_score: number; // 0-100
  hard_flags: HardFlag[];
  hard_blocked: boolean;
  block_reason: string | null;
  watch_with_parent: boolean;
  things_they_may_love: string[];
  things_to_watch_for: string[];
};

const VERDICT_LABEL: Record<FitVerdict, string> = {
  great_fit: 'Great fit',
  good_fit: 'Good fit',
  worth_a_look: 'Worth a look',
  stretch: 'A stretch',
  not_a_fit_right_now: 'Not a fit right now',
};

/**
 * Compute the overall score (0-100). This is a weighted aggregate of
 * the analysis scores, biased by the child's sensitivity profile.
 *
 * The structure: positive dimensions (production, narrative, prosocial,
 * etc.) push the score up. Negative-for-this-child dimensions (violence,
 * frightening content, stimulation) push it down, weighted by the
 * child's sensitivity to each.
 */
export function computeOverallScore(
  analysis: Analysis,
  child: ChildProfile,
): number {
  const s = analysis.scores;

  // Positive contributors (1-5, higher is better)
  const positives = [
    s.narrative_quality.value,
    s.production_quality.value,
    s.prosocial_content.value,
    s.prosocial_authenticity.value,
    s.representation.value,
    s.agency_role_models.value,
    s.educational_value.value,
    s.adult_themes_handling.value,
  ].filter((v): v is number => v !== null);

  const positiveAvg = positives.length
    ? positives.reduce((a, b) => a + b, 0) / positives.length
    : 3;

  // Negative-when-child-is-sensitive contributors. We weight by the
  // child's sensitivity to each, so a 5/5 frightening rating hurts a
  // fear-sensitive child much more than a fear-resilient one.
  function sensitivityHit(score: number | null, sensitivity: number) {
    if (score === null) return 0;
    // sensitivity 1 → multiplier 0.2, sensitivity 5 → multiplier 1
    const multiplier = sensitivity / 5;
    // Score 1-5 → hit 0..1
    return ((score - 1) / 4) * multiplier;
  }

  const fearHit = sensitivityHit(s.frightening_content.value, child.fear_sensitivity);
  const stimHit = sensitivityHit(
    s.stimulation_intensity.value,
    child.stimulation_sensitivity,
  );
  const emoHit = sensitivityHit(s.adult_themes.value, child.emotional_sensitivity);

  // Always-bad dimensions (no per-child weighting)
  const violenceHit = ((s.violence_level.value ?? 1) - 1) / 4;
  const commercialHit = ((s.commercialism.value ?? 1) - 1) / 4;
  const langHit = ((s.language_level.value ?? 1) - 1) / 4;

  const negativeAvg =
    (fearHit + stimHit + emoHit + violenceHit + commercialHit + langHit) / 6;

  // Positive contribution: 0..100
  const positiveContribution = ((positiveAvg - 1) / 4) * 100;
  // Negative penalty: 0..40 (capped so a "perfect" prosocial show isn't
  // entirely tanked by one high score)
  const negativePenalty = negativeAvg * 40;

  const raw = positiveContribution - negativePenalty;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/**
 * Pick a verdict band based on hard flags + overall score + alignment.
 */
function pickVerdict(input: {
  overallScore: number;
  hardFlags: HardFlag[];
  ageBelowMin: boolean;
  ageWithinRecommendation: boolean;
}): FitVerdict {
  const severeBlocks = input.hardFlags.filter((f) => f.severity === 'severe');
  if (severeBlocks.length > 0) return 'not_a_fit_right_now';

  // Any moderate certification flag caps verdict at worth_a_look
  const hasModerateFlag = input.hardFlags.length > 0;

  if (input.ageBelowMin && !hasModerateFlag) {
    // Below the analysis-derived parent-consensus age but no formal cert block.
    // Still cap at "stretch".
    return 'stretch';
  }

  if (hasModerateFlag) {
    return input.overallScore >= 60 ? 'worth_a_look' : 'stretch';
  }

  if (input.overallScore >= 75 && input.ageWithinRecommendation) return 'great_fit';
  if (input.overallScore >= 60) return 'good_fit';
  if (input.overallScore >= 40) return 'worth_a_look';
  return 'stretch';
}

/**
 * Build the headline — one sentence in the Screened voice.
 */
function buildHeadline(input: {
  verdict: FitVerdict;
  childName: string;
  hardFlags: HardFlag[];
}): string {
  const severeBlocks = input.hardFlags.filter((f) => f.severity === 'severe');
  if (severeBlocks.length > 0) {
    const flag = severeBlocks[0];
    return `Rated ${flag.rating} (${flag.region}) — well outside the age band for ${input.childName}.`;
  }
  if (input.hardFlags.length > 0) {
    const flag = input.hardFlags[0];
    return `Rated ${flag.rating} (${flag.region}) — typically considered for ages ${flag.min_age}+.`;
  }

  switch (input.verdict) {
    case 'great_fit':
      return `Looks like a strong match for ${input.childName}.`;
    case 'good_fit':
      return `Broadly a fit for ${input.childName}, with a few things to know.`;
    case 'worth_a_look':
      return `Mixed signals for ${input.childName} — your call.`;
    case 'stretch':
      return `A stretch for ${input.childName} — possible but worth thinking through.`;
    case 'not_a_fit_right_now':
      return `Probably not the right time for ${input.childName}.`;
  }
}

/**
 * Build the reasoning paragraph — concrete references to the scores
 * and profile that drove the verdict.
 */
function buildReasoning(input: {
  verdict: FitVerdict;
  child: ChildProfile;
  analysis: Analysis;
  hardFlags: HardFlag[];
}): string {
  const { child, analysis, hardFlags } = input;
  const s = analysis.scores;
  const parts: string[] = [];

  if (hardFlags.length > 0) {
    const flag = hardFlags[0];
    parts.push(
      `The certification (${flag.rating} in the ${flag.region}) implies a minimum age of ${flag.min_age}. ${child.name} is ${flag.child_age}.`,
    );
  }

  const concerns: string[] = [];
  if (
    (s.frightening_content.value ?? 0) >= 4 &&
    child.fear_sensitivity >= 4
  ) {
    concerns.push(
      `frightening content rates ${s.frightening_content.value}/5, and ${child.name} reads as fear-sensitive`,
    );
  }
  if (
    (s.stimulation_intensity.value ?? 0) >= 4 &&
    child.stimulation_sensitivity >= 4
  ) {
    concerns.push(
      `stimulation intensity rates ${s.stimulation_intensity.value}/5, which can dysregulate ${child.name}`,
    );
  }
  if (
    (s.adult_themes.value ?? 0) >= 4 &&
    child.emotional_sensitivity >= 4 &&
    (s.adult_themes_handling.value ?? 5) < 4
  ) {
    concerns.push(
      `weighty themes (${s.adult_themes.value}/5) without especially careful handling`,
    );
  }
  if (concerns.length > 0) {
    parts.push(`Things to weigh: ${concerns.join('; ')}.`);
  }

  const strengths: string[] = [];
  if ((s.prosocial_content.value ?? 0) >= 4) {
    strengths.push(
      `strong prosocial themes (${s.prosocial_content.value}/5)`,
    );
  }
  if ((s.narrative_quality.value ?? 0) >= 4) {
    strengths.push(
      `well-crafted storytelling (${s.narrative_quality.value}/5)`,
    );
  }
  if ((s.educational_value.value ?? 0) >= 4) {
    strengths.push(`solid educational value (${s.educational_value.value}/5)`);
  }
  if (strengths.length > 0 && hardFlags.length === 0) {
    parts.push(`On the positive side: ${strengths.join(', ')}.`);
  }

  if (parts.length === 0) {
    parts.push(
      `Based on parent feedback the fit is moderate. Worth reading the themes and scorecard below for the specifics.`,
    );
  }

  return parts.join(' ');
}

/**
 * Build "things they may love" hints from the child's interests +
 * positive dimensions in the analysis.
 */
function buildLovePoints(analysis: Analysis): string[] {
  const out: string[] = [];
  const s = analysis.scores;
  if ((s.prosocial_content.value ?? 0) >= 4) {
    out.push('Kindness and empathy modelled by the characters');
  }
  if ((s.educational_value.value ?? 0) >= 4) {
    out.push('Real things to learn or talk about');
  }
  if ((s.narrative_quality.value ?? 0) >= 4) {
    out.push('A story that respects the audience');
  }
  if ((s.production_quality.value ?? 0) >= 5) {
    out.push('Beautiful craft — animation, music, voice work');
  }
  return out.slice(0, 3);
}

/**
 * Build "things to watch for" — surfaced from content_warnings and
 * the child's specific sensitivities.
 */
function buildWatchPoints(
  analysis: Analysis,
  child: ChildProfile,
): string[] {
  const out: string[] = [];
  const s = analysis.scores;

  if (
    (s.frightening_content.value ?? 0) >= 4 &&
    child.fear_sensitivity >= 3
  ) {
    out.push('Some frightening moments, particularly intense for sensitive viewers');
  }
  if (
    (s.stimulation_intensity.value ?? 0) >= 4 &&
    child.stimulation_sensitivity >= 3
  ) {
    out.push('High pacing and sensory load — may be a lot at bedtime');
  }
  if ((s.commercialism.value ?? 0) >= 4) {
    out.push('Notable commercial / merchandising element');
  }

  // Pull a few specific content warnings if the analysis surfaced them
  for (const warning of analysis.content_warnings.slice(0, 2)) {
    if (out.length >= 5) break;
    out.push(warning);
  }

  return out.slice(0, 5);
}

/**
 * The main entry point. Pulls everything together.
 */
export function computeFit(input: {
  analysis: Analysis;
  child: ChildProfile;
  certifications: { us?: { rating: string }; uk?: { rating: string } } | null;
}): FitResult {
  const { analysis, child, certifications } = input;
  const childAge = ageFromBirthDate(child.birth_date);

  const hardFlags = computeHardFlags({
    childAge,
    certifications,
  });

  const overallScore = computeOverallScore(analysis, child);

  const ageBelowMin =
    childAge !== null && childAge < analysis.age_recommendation.min;
  const ageWithinRecommendation =
    childAge === null ||
    (childAge >= analysis.age_recommendation.min &&
      childAge <= analysis.age_recommendation.max);

  const verdict = pickVerdict({
    overallScore,
    hardFlags,
    ageBelowMin,
    ageWithinRecommendation,
  });

  const severeBlocks = hardFlags.filter((f) => f.severity === 'severe');
  const hardBlocked = severeBlocks.length > 0;

  return {
    verdict,
    headline: buildHeadline({ verdict, childName: child.name, hardFlags }),
    reasoning: buildReasoning({ verdict, child, analysis, hardFlags }),
    overall_score: overallScore,
    hard_flags: hardFlags,
    hard_blocked: hardBlocked,
    block_reason: hardBlocked ? 'certification' : null,
    watch_with_parent:
      verdict === 'stretch' ||
      verdict === 'worth_a_look' ||
      (analysis.scores.adult_themes.value ?? 0) >= 3,
    things_they_may_love: buildLovePoints(analysis),
    things_to_watch_for: buildWatchPoints(analysis, child),
  };
}

export { VERDICT_LABEL };

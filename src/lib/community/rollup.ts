import { createServiceRoleClient } from '@/lib/supabase/service';
import {
  ageBandFromBirthDate,
  sensitivityBand,
  type AgeBand,
  type SensitivityBand,
} from './bands';
import {
  type CommunityObservation,
  type DimensionAggregate,
  MIN_OBSERVATIONS_FOR_PUBLISH,
} from './schemas';

/**
 * The community observations rollup job.
 *
 * Reads every screening that has at least one observation field set,
 * groups by (title_id, age_band, sensitivity_band), and computes an
 * anonymised aggregate per group. Groups with fewer than
 * MIN_OBSERVATIONS_FOR_PUBLISH entries are dropped (privacy floor).
 *
 * Strategy is full recompute every run — simpler, correct, and fast
 * enough for the size of dataset we'll have for a long time. Once we
 * grow past that, switch to incremental (track which bands have
 * changed since last run via screenings.updated_at).
 *
 * Writes go through service-role to bypass RLS — community_observations
 * is read-only for authenticated users.
 */

type ScreeningRow = {
  title_id: string;
  watched_at: string | null;
  would_rewatch: boolean | null;
  engagement_quality: number | null;
  emotional_resonance: number | null;
  fear_response: number | null;
  behavioral_impact: number | null;
  play_inspiration: number | null;
  children: {
    birth_date: string | null;
    fear_sensitivity: number;
    stimulation_sensitivity: number;
    emotional_sensitivity: number;
  } | null;
};

type Group = {
  titleId: string;
  ageBand: AgeBand;
  sensitivityBand: SensitivityBand;
  rows: ScreeningRow[];
};

export type RollupResult = {
  scannedScreenings: number;
  groupsConsidered: number;
  groupsBelowThreshold: number;
  rowsWritten: number;
  titlesAffected: number;
  errors: string[];
};

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function aggregateDimension(values: (number | null)[]): DimensionAggregate {
  const present = values.filter((v): v is number => v !== null);
  const distribution: number[] = [0, 0, 0, 0, 0];
  for (const v of present) {
    if (v >= 1 && v <= 5) {
      distribution[v - 1]++;
    }
  }
  return {
    median: median(present),
    distribution,
    n: present.length,
  };
}

function aggregateGroup(rows: ScreeningRow[]): CommunityObservation {
  const wouldRewatch = rows.map((r) => r.would_rewatch);

  return {
    n: rows.length,
    engagement_quality: aggregateDimension(rows.map((r) => r.engagement_quality)),
    emotional_resonance: aggregateDimension(rows.map((r) => r.emotional_resonance)),
    fear_response: aggregateDimension(rows.map((r) => r.fear_response)),
    behavioral_impact: aggregateDimension(rows.map((r) => r.behavioral_impact)),
    play_inspiration: aggregateDimension(rows.map((r) => r.play_inspiration)),
    would_rewatch_yes: wouldRewatch.filter((v) => v === true).length,
    would_rewatch_no: wouldRewatch.filter((v) => v === false).length,
    would_rewatch_unsure: wouldRewatch.filter((v) => v === null).length,
  };
}

function rowHasAnyObservation(r: ScreeningRow): boolean {
  return (
    r.engagement_quality !== null ||
    r.emotional_resonance !== null ||
    r.fear_response !== null ||
    r.behavioral_impact !== null ||
    r.play_inspiration !== null ||
    r.would_rewatch !== null
  );
}

export async function rollupCommunityObservations(): Promise<RollupResult> {
  const supabase = createServiceRoleClient();
  const errors: string[] = [];

  // Fetch every screening with observation data + the joined child profile.
  // We'll filter rowHasAnyObservation in memory; the SQL .or() filter
  // for nullability across many columns is awkward, and the row count
  // is bounded by total app screenings which is small.
  const { data, error: fetchError } = await supabase
    .from('screenings')
    .select(
      `
      title_id, watched_at, would_rewatch,
      engagement_quality, emotional_resonance, fear_response,
      behavioral_impact, play_inspiration,
      children(birth_date, fear_sensitivity, stimulation_sensitivity, emotional_sensitivity)
    `,
    );

  if (fetchError) {
    return {
      scannedScreenings: 0,
      groupsConsidered: 0,
      groupsBelowThreshold: 0,
      rowsWritten: 0,
      titlesAffected: 0,
      errors: [`Failed to fetch screenings: ${fetchError.message}`],
    };
  }

  const screenings: ScreeningRow[] = (data ?? []).map((r) => {
    const child = Array.isArray(r.children) ? r.children[0] : r.children;
    return {
      title_id: r.title_id as string,
      watched_at: r.watched_at as string | null,
      would_rewatch: r.would_rewatch as boolean | null,
      engagement_quality: r.engagement_quality as number | null,
      emotional_resonance: r.emotional_resonance as number | null,
      fear_response: r.fear_response as number | null,
      behavioral_impact: r.behavioral_impact as number | null,
      play_inspiration: r.play_inspiration as number | null,
      children: child
        ? {
            birth_date: (child as { birth_date: string | null }).birth_date,
            fear_sensitivity: (child as { fear_sensitivity: number })
              .fear_sensitivity,
            stimulation_sensitivity: (
              child as { stimulation_sensitivity: number }
            ).stimulation_sensitivity,
            emotional_sensitivity: (child as { emotional_sensitivity: number })
              .emotional_sensitivity,
          }
        : null,
    };
  });

  // Group by (title_id, age_band, sensitivity_band)
  const groups = new Map<string, Group>();
  let scannedWithObservations = 0;

  for (const row of screenings) {
    if (!rowHasAnyObservation(row)) continue;
    if (!row.children) continue;

    const ageBand = ageBandFromBirthDate(row.children.birth_date);
    if (!ageBand) continue;

    const sensBand = sensitivityBand(row.children);

    const key = `${row.title_id}|${ageBand}|${sensBand}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        titleId: row.title_id,
        ageBand,
        sensitivityBand: sensBand,
        rows: [],
      };
      groups.set(key, group);
    }
    group.rows.push(row);
    scannedWithObservations++;
  }

  // Aggregate each group above the privacy floor and upsert.
  let rowsWritten = 0;
  let groupsBelowThreshold = 0;
  const titlesAffected = new Set<string>();

  for (const group of groups.values()) {
    if (group.rows.length < MIN_OBSERVATIONS_FOR_PUBLISH) {
      groupsBelowThreshold++;
      continue;
    }

    const observations = aggregateGroup(group.rows);

    const { error: upsertError } = await supabase
      .from('community_observations')
      .upsert(
        {
          title_id: group.titleId,
          child_age_band: group.ageBand,
          sensitivity_band: group.sensitivityBand,
          observations,
          computed_at: new Date().toISOString(),
        },
        { onConflict: 'title_id,child_age_band,sensitivity_band' },
      );

    if (upsertError) {
      errors.push(
        `Upsert failed for ${group.titleId} ${group.ageBand} ${group.sensitivityBand}: ${upsertError.message}`,
      );
      continue;
    }

    rowsWritten++;
    titlesAffected.add(group.titleId);
  }

  return {
    scannedScreenings: scannedWithObservations,
    groupsConsidered: groups.size,
    groupsBelowThreshold,
    rowsWritten,
    titlesAffected: titlesAffected.size,
    errors,
  };
}

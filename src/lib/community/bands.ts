/**
 * Child age and sensitivity band helpers.
 *
 * These mirror the database functions `child_age_band()` and
 * `sensitivity_band()` defined in helper_functions.sql. Keeping a
 * TS copy lets the rollup job bucket rows in memory without an RPC
 * per row.
 *
 * If the database definitions change, change these too — the bands
 * are part of the contract for community_observations rows.
 */

export type AgeBand = '0-2' | '3-4' | '5-6' | '7-9' | '10-12' | '13-15' | '16+';
export type SensitivityBand = 'low' | 'medium' | 'high';

export function ageBandFromBirthDate(birthDate: string | null): AgeBand | null {
  if (!birthDate) return null;
  const dob = new Date(birthDate);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  age = Math.max(0, age);
  if (age <= 2) return '0-2';
  if (age <= 4) return '3-4';
  if (age <= 6) return '5-6';
  if (age <= 9) return '7-9';
  if (age <= 12) return '10-12';
  if (age <= 15) return '13-15';
  return '16+';
}

export function sensitivityBand(input: {
  fear_sensitivity: number;
  stimulation_sensitivity: number;
  emotional_sensitivity: number;
}): SensitivityBand {
  const avg =
    (input.fear_sensitivity +
      input.stimulation_sensitivity +
      input.emotional_sensitivity) /
    3;
  if (avg <= 2.0) return 'low';
  if (avg <= 3.5) return 'medium';
  return 'high';
}

export const SENSITIVITY_BAND_LABEL: Record<SensitivityBand, string> = {
  low: 'less sensitive',
  medium: 'middle of the range',
  high: 'more sensitive',
};

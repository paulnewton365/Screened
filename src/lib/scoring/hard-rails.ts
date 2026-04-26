/**
 * Hard rails for the fit verdict.
 *
 * These are deterministic rules that override or cap Claude's judgement.
 * The most important one is the certification block — if a child is
 * below the implied age of a BBFC/MPAA rating, the fit verdict can
 * never be "great_fit" regardless of what the analysis says.
 *
 * The canonical rating-to-min-age mapping lives in the database
 * (rating_min_age()) so we have one source of truth. We mirror it here
 * in TypeScript for synchronous client-side use; if you change one,
 * change both.
 */

export type Certifications = {
  us?: { rating: string };
  uk?: { rating: string };
};

export type HardFlag = {
  type: 'certification_block';
  severity: 'moderate' | 'severe';
  region: 'US' | 'UK';
  rating: string;
  child_age: number;
  min_age: number;
  message: string;
};

const RATING_MIN_AGE: Record<string, number> = {
  // US (MPAA + TV)
  G: 0,
  'TV-Y': 0,
  'TV-G': 0,
  PG: 7,
  'TV-Y7': 7,
  'TV-PG': 8,
  'PG-13': 13,
  'TV-14': 14,
  R: 17,
  'TV-MA': 17,
  'NC-17': 18,
  // UK (BBFC)
  U: 0,
  '12': 12,
  '12A': 12,
  '15': 15,
  '18': 18,
  R18: 18,
};

export function ratingMinAge(rating: string | undefined): number | null {
  if (!rating) return null;
  return RATING_MIN_AGE[rating] ?? null;
}

/**
 * Compute hard flags for a (child, title) pair. Returns an array of
 * flags — empty means no rails triggered.
 */
export function computeHardFlags(input: {
  childAge: number | null;
  certifications: Certifications | null;
}): HardFlag[] {
  const flags: HardFlag[] = [];
  if (input.childAge === null || !input.certifications) return flags;

  for (const region of ['us', 'uk'] as const) {
    const rating = input.certifications[region]?.rating;
    if (!rating) continue;
    const minAge = ratingMinAge(rating);
    if (minAge === null) continue;
    if (input.childAge >= minAge) continue;

    const gap = minAge - input.childAge;
    flags.push({
      type: 'certification_block',
      severity: gap >= 5 ? 'severe' : 'moderate',
      region: region.toUpperCase() as 'US' | 'UK',
      rating,
      child_age: input.childAge,
      min_age: minAge,
      message: `Rated ${rating} (${region.toUpperCase()}) — typically considered for ages ${minAge}+`,
    });
  }

  return flags;
}

/**
 * Convert a birth date string to age in years. Returns null if no
 * birth date set.
 */
export function ageFromBirthDate(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const dob = new Date(birthDate);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { rowToAnalysis, type TitleAnalysisRow } from '@/lib/claude/store';
import { computeFit } from '@/lib/scoring/fit';
import {
  ObservationSchema,
  SaveScreeningSchema,
  type ObservationInput,
} from './schemas';

type SaveResult =
  | { ok: true; screeningId: string }
  | { ok: false; error: string };

/**
 * Save a title to a child's library.
 *
 * Pulls the current analysis + child profile, computes the fit verdict
 * once, and stores both the verdict and its reasoning into the screening
 * row. The saved screening is then a stable record — even if the title
 * is refreshed and gets a different analysis later, the parent still
 * sees the verdict that was shown when they saved.
 */
export async function saveScreening(input: {
  child_id: string;
  title_id: string;
}): Promise<SaveResult> {
  const parsed = SaveScreeningSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid input.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'Not signed in.' };
  }

  // Fetch the child profile (RLS will reject if not owned by this user).
  const { data: child } = await supabase
    .from('children')
    .select(
      'id, name, birth_date, fear_sensitivity, stimulation_sensitivity, emotional_sensitivity',
    )
    .eq('id', parsed.data.child_id)
    .maybeSingle();

  if (!child) {
    return { ok: false, error: "We couldn't find that child profile." };
  }

  // Fetch the title.
  const { data: title } = await supabase
    .from('titles')
    .select('id, certifications')
    .eq('id', parsed.data.title_id)
    .maybeSingle();

  if (!title) {
    return { ok: false, error: "We couldn't find that title." };
  }

  // Fetch the current analysis.
  const { data: analysisRow } = await supabase
    .from('title_analyses')
    .select('*')
    .eq('title_id', parsed.data.title_id)
    .is('superseded_by', null)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!analysisRow) {
    return {
      ok: false,
      error: 'This title has no analysis yet — analyse it before saving.',
    };
  }

  const analysis = rowToAnalysis(analysisRow as TitleAnalysisRow);
  const fit = computeFit({
    analysis,
    child,
    certifications: (title.certifications as {
      us?: { rating: string };
      uk?: { rating: string };
    } | null) ?? null,
  });

  // Check if this child already has this title in their library — if so,
  // return the existing screening (idempotent save).
  const { data: existing } = await supabase
    .from('screenings')
    .select('id')
    .eq('child_id', parsed.data.child_id)
    .eq('title_id', parsed.data.title_id)
    .maybeSingle();

  if (existing) {
    return { ok: true, screeningId: existing.id };
  }

  const { data: inserted, error: insertError } = await supabase
    .from('screenings')
    .insert({
      child_id: parsed.data.child_id,
      title_id: parsed.data.title_id,
      analysis_id: analysisRow.id,

      overall_score: fit.overall_score,
      fit_verdict: fit.verdict,
      fit_headline: fit.headline,
      fit_reasoning: fit.reasoning,
      fit_watch_with_parent: fit.watch_with_parent,
      fit_things_they_may_love: fit.things_they_may_love,
      fit_things_to_watch_for: fit.things_to_watch_for,

      hard_flags: fit.hard_flags,
      hard_blocked: fit.hard_blocked,
      block_reason: fit.block_reason,
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    return {
      ok: false,
      error: `Couldn't save: ${insertError?.message ?? 'unknown error'}`,
    };
  }

  revalidatePath('/dashboard');
  revalidatePath(`/titles/${parsed.data.title_id}`);

  return { ok: true, screeningId: inserted.id };
}

/**
 * Update observation fields on an existing screening.
 *
 * All observation fields are optional — only the ones present in the
 * input are written. This means partial updates work: a parent can
 * update just engagement_quality, then come back later and add notes.
 */
type UpdateResult = { ok: true } | { ok: false; error: string };

export async function updateObservations(input: {
  screening_id: string;
  observations: ObservationInput;
}): Promise<UpdateResult> {
  const parsed = ObservationSchema.safeParse(input.observations);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => i.message)
      .join('; ');
    return { ok: false, error: `Invalid input: ${issues}` };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'Not signed in.' };
  }

  // RLS verifies ownership through child_id → parent_id chain.
  const { error } = await supabase
    .from('screenings')
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.screening_id);

  if (error) {
    return {
      ok: false,
      error: `Couldn't save observations: ${error.message}`,
    };
  }

  revalidatePath('/dashboard');

  return { ok: true };
}

/**
 * Remove a screening from a child's library. Form-action signature so
 * it can be triggered directly from a <form> on the delete confirmation
 * page.
 */
export async function deleteScreening(formData: FormData): Promise<void> {
  const id = formData.get('id');
  const childId = formData.get('child_id');
  if (typeof id !== 'string' || !id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase
    .from('screenings')
    .delete()
    .eq('id', id);

  if (error) {
    redirect(
      `/screenings/${id}/delete?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath('/dashboard');
  if (typeof childId === 'string' && childId) {
    redirect('/dashboard');
  }
  redirect('/dashboard');
}

'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { childSchema, type ChildInput } from './schemas';

export type ChildFormState = {
  errors?: Partial<Record<keyof ChildInput, string>>;
  formError?: string;
};

/**
 * Shared parser used by both create and update. Coerces FormData into
 * a plain object and runs it through the Zod schema.
 */
function parseChildForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  return childSchema.safeParse(raw);
}

type ZodIssueLike = { path: PropertyKey[]; message: string };

function collectErrors(issues: ZodIssueLike[]): ChildFormState['errors'] {
  const errors: ChildFormState['errors'] = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key !== 'string') continue;
    const fieldKey = key as keyof ChildInput;
    if (!errors[fieldKey]) errors[fieldKey] = issue.message;
  }
  return errors;
}

/**
 * Create a new child profile.
 * RLS protects the insert — children.parent_id must match auth.uid().
 */
export async function createChild(
  _prevState: ChildFormState,
  formData: FormData,
): Promise<ChildFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const parsed = parseChildForm(formData);
  if (!parsed.success) return { errors: collectErrors(parsed.error.issues) };
  const data = parsed.data;

  const { error: insertError } = await supabase.from('children').insert({
    parent_id: user.id,
    name: data.name,
    birth_date: data.birth_date ?? null,
    fear_sensitivity: data.fear_sensitivity,
    stimulation_sensitivity: data.stimulation_sensitivity,
    emotional_sensitivity: data.emotional_sensitivity,
    energy_level: data.energy_level ?? null,
    attention_span: data.attention_span ?? null,
    interests: data.interests,
    current_themes: data.current_themes ? [data.current_themes] : [],
    notes: data.notes ?? null,
  });

  if (insertError) {
    return {
      formError:
        "Something went wrong saving the profile. Please try again — your changes weren't lost.",
    };
  }

  // Mark onboarding complete on first child creation.
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed_at')
    .eq('id', user.id)
    .single();

  if (profile && !profile.onboarding_completed_at) {
    await supabase
      .from('profiles')
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq('id', user.id);
  }

  revalidatePath('/dashboard');
  redirect('/dashboard');
}

/**
 * Update an existing child profile.
 *
 * The childId is passed as a hidden form field (named "id"). RLS still
 * enforces that the parent owns this child — the .eq('id', ...) clause
 * combined with the policy means a malicious child id from someone
 * else's account simply matches no rows.
 */
export async function updateChild(
  _prevState: ChildFormState,
  formData: FormData,
): Promise<ChildFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const childId = formData.get('id');
  if (typeof childId !== 'string' || !childId) {
    return { formError: 'Missing child id.' };
  }

  const parsed = parseChildForm(formData);
  if (!parsed.success) return { errors: collectErrors(parsed.error.issues) };
  const data = parsed.data;

  const { error: updateError } = await supabase
    .from('children')
    .update({
      name: data.name,
      birth_date: data.birth_date ?? null,
      fear_sensitivity: data.fear_sensitivity,
      stimulation_sensitivity: data.stimulation_sensitivity,
      emotional_sensitivity: data.emotional_sensitivity,
      energy_level: data.energy_level ?? null,
      attention_span: data.attention_span ?? null,
      interests: data.interests,
      current_themes: data.current_themes ? [data.current_themes] : [],
      notes: data.notes ?? null,
    })
    .eq('id', childId);

  if (updateError) {
    return {
      formError:
        "Something went wrong saving the changes. Please try again — your changes weren't lost.",
    };
  }

  revalidatePath('/dashboard');
  revalidatePath(`/children/${childId}/edit`);
  redirect('/dashboard');
}

export type DeleteChildState = {
  formError?: string;
};

/**
 * Delete a child profile.
 *
 * Two-key deletion: requires both the child id AND a confirmation name
 * field that exactly matches the child's current name. This prevents
 * accidental deletion via a stray click — a parent has to actually type
 * the child's name to confirm.
 *
 * Database CASCADE handles cleanup of related rows (screenings).
 */
export async function deleteChild(
  _prevState: DeleteChildState,
  formData: FormData,
): Promise<DeleteChildState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const childId = formData.get('id');
  const confirmName = formData.get('confirm_name');

  if (typeof childId !== 'string' || !childId) {
    return { formError: 'Missing child id.' };
  }
  if (typeof confirmName !== 'string') {
    return { formError: 'Confirmation required.' };
  }

  // Fetch the actual name to compare. RLS ensures we can only fetch our own.
  const { data: child, error: fetchError } = await supabase
    .from('children')
    .select('name')
    .eq('id', childId)
    .single();

  if (fetchError || !child) {
    return { formError: "We couldn't find that profile." };
  }

  if (confirmName.trim() !== child.name) {
    return {
      formError: `The name didn't match. Type "${child.name}" exactly to confirm.`,
    };
  }

  const { error: deleteError } = await supabase
    .from('children')
    .delete()
    .eq('id', childId);

  if (deleteError) {
    return {
      formError: 'Something went wrong. Please try again.',
    };
  }

  revalidatePath('/dashboard');
  redirect('/dashboard');
}

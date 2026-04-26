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
 * Creates a child profile owned by the currently signed-in parent.
 *
 * RLS does the access control — the Supabase client runs as the user,
 * and the children table policy enforces that parent_id must equal
 * auth.uid(). We pass user.id explicitly anyway for clarity.
 */
export async function createChild(
  _prevState: ChildFormState,
  formData: FormData,
): Promise<ChildFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Coerce FormData entries into a plain object for the schema
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;

  const parsed = childSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: ChildFormState['errors'] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof ChildInput;
      if (!errors[key]) errors[key] = issue.message;
    }
    return { errors };
  }

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
        'Something went wrong saving the profile. Please try again — your changes weren\'t lost.',
    };
  }

  // Mark onboarding complete on first child creation. Idempotent: subsequent
  // calls are no-ops because the column is only set if currently null.
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

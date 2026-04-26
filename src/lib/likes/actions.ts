'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type ToggleResult =
  | { ok: true; liked: boolean }
  | { ok: false; error: string };

/**
 * Toggle a parent's like on a title.
 *
 * Returns the new state so the caller can reconcile with their
 * optimistic UI. Idempotent on each direction — calling toggle when
 * already liked deletes; calling when already unliked inserts.
 *
 * Revalidates dashboard and the title page so server-rendered like
 * counts and filter results stay in sync.
 */
export async function toggleTitleLike(input: {
  title_id: string;
}): Promise<ToggleResult> {
  if (!input.title_id || typeof input.title_id !== 'string') {
    return { ok: false, error: 'Invalid title id.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'Not signed in.' };
  }

  // Read current state
  const { data: existing } = await supabase
    .from('title_likes')
    .select('parent_id')
    .eq('parent_id', user.id)
    .eq('title_id', input.title_id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('title_likes')
      .delete()
      .eq('parent_id', user.id)
      .eq('title_id', input.title_id);

    if (error) {
      return { ok: false, error: error.message };
    }

    revalidatePath('/dashboard');
    revalidatePath(`/titles/${input.title_id}`);
    return { ok: true, liked: false };
  }

  const { error } = await supabase.from('title_likes').insert({
    parent_id: user.id,
    title_id: input.title_id,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath('/dashboard');
  revalidatePath(`/titles/${input.title_id}`);
  return { ok: true, liked: true };
}

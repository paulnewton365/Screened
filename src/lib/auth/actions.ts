'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

/**
 * Auth uses Supabase magic links — no passwords. Parents enter their
 * email, get a one-time link, click it, they're in.
 *
 * The same flow works for both sign-in and sign-up. Supabase handles
 * the new-vs-returning distinction automatically. The handle_new_user
 * trigger in the database creates the profile row on first sign-up.
 */

const emailSchema = z.string().email('Please enter a valid email address.');

export type AuthFormState = {
  error?: string;
};

export async function sendMagicLink(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const rawEmail = formData.get('email');

  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const email = parsed.data;

  const supabase = await createClient();

  // Build the redirect URL from the request origin so this works
  // identically on localhost, preview deploys, and production.
  const headersList = await headers();
  const origin =
    headersList.get('origin') ??
    headersList.get('x-forwarded-host')
      ? `https://${headersList.get('x-forwarded-host')}`
      : 'http://localhost:3000';

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect(`/auth/verify?email=${encodeURIComponent(email)}`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}

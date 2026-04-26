import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * The magic-link email contains a URL like:
 *   https://your-app.vercel.app/auth/callback?code=abc123
 *
 * When the user clicks it, this route handler:
 *   1. Reads the code from the URL
 *   2. Asks Supabase to exchange it for a session
 *   3. Sets the session cookie
 *   4. Redirects to the dashboard (or wherever `next` says)
 *
 * If the code is missing, expired, or already used, we send the user
 * back to the login page with a friendly error.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}

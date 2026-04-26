import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/lib/auth/actions';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware should have caught this already, but defence-in-depth
  // is cheap and prevents accidental data exposure if middleware breaks.
  if (!user) {
    redirect('/login');
  }

  // Fetch the profile row that the handle_new_user trigger created
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, onboarding_completed_at')
    .eq('id', user.id)
    .single();

  return (
    <main className="flex-1 flex flex-col">
      <header className="border-b border-rule">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/dashboard" className="font-serif text-xl tracking-tight">
            Screened
          </Link>
          <div className="flex items-center gap-6">
            <span className="editorial-meta hidden sm:inline">
              {profile?.display_name ?? user.email}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm text-ink-muted hover:text-ink transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-16 w-full">
        <p className="editorial-meta uppercase mb-4">Your library</p>
        <h1 className="mb-4">Welcome.</h1>
        <p className="editorial-lede text-ink-muted mb-12">
          You&apos;re signed in as{' '}
          <span className="text-ink">{user.email}</span>. The library, search,
          and child profiles come next.
        </p>

        <div className="border border-rule rounded-sm p-12 bg-paper-raised">
          <p className="editorial-meta uppercase mb-3">What works now</p>
          <ul className="space-y-2 text-ink leading-relaxed">
            <li>— You can sign up and sign in via email magic link</li>
            <li>— Your profile row was created automatically</li>
            <li>— RLS is protecting your data at the database level</li>
            <li>— The sign-out button above ends your session</li>
          </ul>

          <p className="editorial-meta uppercase mt-8 mb-3">Coming next</p>
          <ul className="space-y-2 text-ink-muted leading-relaxed">
            <li>— Add your first child (onboarding flow)</li>
            <li>— Search a title and see a Claude analysis</li>
            <li>— Save a screening with your post-viewing observations</li>
          </ul>
        </div>
      </div>
    </main>
  );
}

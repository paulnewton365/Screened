import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/lib/auth/actions';
import { ChildForm } from '@/components/children/ChildForm';

/**
 * /children/new — the onboarding/add-a-child page.
 *
 * The same page handles two cases:
 *   - First child (the welcome-into-the-app moment)
 *   - Adding another child (a parent with two kids, etc.)
 *
 * The intro copy adapts based on whether the parent already has children.
 */
export default async function NewChildPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: existingChildren } = await supabase
    .from('children')
    .select('id')
    .limit(1);

  const isFirstChild = !existingChildren || existingChildren.length === 0;

  return (
    <main className="flex-1 flex flex-col">
      <header className="border-b border-rule">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/dashboard" className="font-serif text-xl tracking-tight">
            Screened
          </Link>
          <div className="flex items-center gap-6">
            {!isFirstChild && (
              <Link
                href="/dashboard"
                className="text-sm text-ink-muted hover:text-ink transition-colors"
              >
                Cancel
              </Link>
            )}
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

      <div className="max-w-2xl mx-auto px-6 py-16 w-full">
        <p className="editorial-meta uppercase mb-4">
          {isFirstChild ? 'Welcome' : 'Add another child'}
        </p>

        <h1 className="mb-6">
          {isFirstChild
            ? 'Tell us about your child.'
            : 'Tell us about them.'}
        </h1>

        <p className="editorial-lede text-ink-muted mb-12">
          {isFirstChild
            ? 'A few minutes of setup so we can give you fit recommendations that actually mean something. You can change anything later.'
            : 'Same questions as before. The more you share, the sharper the fit recommendations.'}
        </p>

        <ChildForm />
      </div>
    </main>
  );
}

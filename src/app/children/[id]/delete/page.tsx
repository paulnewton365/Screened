import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/lib/auth/actions';
import { DeleteConfirmForm } from '@/components/children/DeleteConfirmForm';

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * /children/[id]/delete — delete confirmation page.
 *
 * Separated from the edit page so the URL itself is a deliberate
 * choice — you don't end up here unless you meant to. Confirmation
 * uses a "type the name" pattern: see DeleteConfirmForm.
 */
export default async function DeleteChildPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // We need the name for both the heading and the confirmation match.
  // RLS scopes this to the parent's own children.
  const { data: child } = await supabase
    .from('children')
    .select('id, name')
    .eq('id', id)
    .single();

  if (!child) notFound();

  // Count any screenings that would be cascade-deleted, so we can warn
  // the parent honestly about what they're losing.
  const { count: screeningsCount } = await supabase
    .from('screenings')
    .select('*', { count: 'exact', head: true })
    .eq('child_id', id);

  return (
    <main className="flex-1 flex flex-col">
      <header className="border-b border-rule">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/dashboard" className="font-serif text-xl tracking-tight">
            Screened
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href={`/children/${child.id}/edit`}
              className="text-sm text-ink-muted hover:text-ink transition-colors"
            >
              Cancel
            </Link>
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
        <p className="editorial-meta uppercase mb-4">Confirm deletion</p>

        <h1 className="mb-6">Delete {child.name}&apos;s profile.</h1>

        <p className="editorial-lede text-ink-muted mb-8">
          This is permanent. We can&apos;t recover the profile or anything
          tied to it.
        </p>

        {screeningsCount !== null && screeningsCount > 0 && (
          <div className="mb-10 p-5 bg-notice-soft border-l-2 border-notice">
            <p className="text-sm text-ink leading-relaxed">
              <span className="font-medium">
                {screeningsCount} screening{screeningsCount === 1 ? '' : 's'}
                {' '}
                will also be removed.
              </span>{' '}
              This includes any observations you&apos;ve recorded for{' '}
              {child.name}. The titles themselves stay in the global library
              — only your records of {child.name}&apos;s viewings are removed.
            </p>
          </div>
        )}

        <DeleteConfirmForm childId={child.id} childName={child.name} />

        <p className="mt-10 text-sm text-ink-subtle">
          Changed your mind?{' '}
          <Link
            href={`/children/${child.id}/edit`}
            className="underline hover:text-ink transition-colors"
          >
            Go back to {child.name}&apos;s profile
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

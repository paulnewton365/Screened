import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/lib/auth/actions';
import { ChildForm } from '@/components/children/ChildForm';

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * /children/[id]/edit — edit an existing child profile.
 *
 * RLS does the heavy lifting on access control. If the parent doesn't
 * own this child, the SELECT returns no rows and we 404. They never
 * see another parent's data, even by guessing IDs.
 */
export default async function EditChildPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: child } = await supabase
    .from('children')
    .select(
      'id, name, birth_date, fear_sensitivity, stimulation_sensitivity, emotional_sensitivity, energy_level, attention_span, interests, current_themes, notes',
    )
    .eq('id', id)
    .single();

  if (!child) notFound();

  return (
    <main className="flex-1 flex flex-col">
      <header className="border-b border-rule">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/dashboard" className="font-serif text-xl tracking-tight">
            Screened
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
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
        <p className="editorial-meta uppercase mb-4">Edit profile</p>

        <h1 className="mb-6">{child.name}.</h1>

        <p className="editorial-lede text-ink-muted mb-12">
          Update anything that&apos;s changed. Sensitivities and interests
          shift over time — no need to keep these frozen.
        </p>

        <ChildForm defaults={child} />

        <div className="mt-16 pt-8 border-t border-rule">
          <p className="editorial-meta uppercase mb-3">Danger zone</p>
          <p className="text-ink-muted text-sm leading-relaxed mb-4 max-w-prose">
            Deleting this profile removes it and any screenings tied to it.
            You can&apos;t undo this.
          </p>
          <Link
            href={`/children/${child.id}/delete`}
            className="inline-block text-sm text-notice underline hover:text-ink transition-colors"
          >
            Delete {child.name}&apos;s profile
          </Link>
        </div>
      </div>
    </main>
  );
}

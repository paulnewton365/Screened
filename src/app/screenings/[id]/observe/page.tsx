import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/lib/auth/actions';
import { ObservationForm } from '@/components/screenings/ObservationForm';

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * /screenings/[id]/observe
 *
 * Form to record observations on a screening. Pulls the existing values
 * from the screening row so re-opening the form preserves whatever's
 * already there.
 */
export default async function ObservePage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch the screening (RLS rejects if not owned).
  const { data: screening } = await supabase
    .from('screenings')
    .select(
      `
      id, child_id, title_id,
      watched_at, behavioral_impact, fear_response, play_inspiration,
      engagement_quality, emotional_resonance, parent_notes, would_rewatch,
      children(name),
      titles(title)
    `,
    )
    .eq('id', id)
    .maybeSingle();

  if (!screening) notFound();

  // Supabase joins return either a single object or an array depending
  // on the relationship cardinality. In our schema, screening->child
  // and screening->title are both single-valued.
  const child = Array.isArray(screening.children)
    ? screening.children[0]
    : screening.children;
  const title = Array.isArray(screening.titles)
    ? screening.titles[0]
    : screening.titles;
  const childName = (child as { name?: string })?.name ?? 'Your child';
  const titleName = (title as { title?: string })?.title ?? 'this title';

  return (
    <main className="flex-1 flex flex-col">
      <header className="border-b border-rule">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/dashboard" className="font-serif text-xl tracking-tight">
            Screened
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/dashboard"
              className="text-ink-muted hover:text-ink transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href={`/titles/${screening.title_id}?child=${screening.child_id}`}
              className="text-ink-muted hover:text-ink transition-colors"
            >
              Back to title
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="text-ink-muted hover:text-ink transition-colors"
              >
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-12 w-full">
        <ObservationForm
          screeningId={screening.id}
          childName={childName}
          titleName={titleName}
          initial={{
            watched_at: screening.watched_at as string | null,
            behavioral_impact: screening.behavioral_impact as number | null,
            fear_response: screening.fear_response as number | null,
            play_inspiration: screening.play_inspiration as number | null,
            engagement_quality: screening.engagement_quality as number | null,
            emotional_resonance: screening.emotional_resonance as number | null,
            parent_notes: screening.parent_notes as string | null,
            would_rewatch: screening.would_rewatch as boolean | null,
          }}
        />
      </div>
    </main>
  );
}

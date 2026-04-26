import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/lib/auth/actions';

/**
 * Dashboard — the parent's home base after sign-in.
 *
 * Two states:
 *   - No children yet → "set up your first child" CTA card
 *   - One or more children → list each as a library card
 *
 * Each child card shows the empty library state for now ("nothing
 * screened yet"). The search bar and analysis pipeline come next.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single();

  const { data: childrenData } = await supabase
    .from('children')
    .select('id, name, birth_date, interests, fear_sensitivity, stimulation_sensitivity, emotional_sensitivity')
    .order('created_at', { ascending: true });

  const hasChildren = (childrenData?.length ?? 0) > 0;

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
        {hasChildren ? (
          <ChildLibraryView childrenList={childrenData!} />
        ) : (
          <FirstChildPrompt />
        )}
      </div>
    </main>
  );
}

function FirstChildPrompt() {
  return (
    <>
      <p className="editorial-meta uppercase mb-4">Welcome</p>
      <h1 className="mb-6">Let&apos;s start with your child.</h1>
      <p className="editorial-lede text-ink-muted mb-12 max-w-prose">
        Screened works by understanding how your child tends to experience
        what they watch. A short profile is the foundation — once it&apos;s
        in, every show you search will tell you whether it&apos;s a good fit.
      </p>

      <Link
        href="/children/new"
        className="inline-block px-7 py-3 bg-ink text-paper rounded-sm hover:bg-accent transition-colors text-sm tracking-wide"
      >
        Set up your first child
      </Link>

      <p className="mt-6 text-sm text-ink-subtle">
        Two minutes. You can change anything later.
      </p>
    </>
  );
}

type ChildSummary = {
  id: string;
  name: string;
  birth_date: string | null;
  interests: string[] | null;
  fear_sensitivity: number | null;
  stimulation_sensitivity: number | null;
  emotional_sensitivity: number | null;
};

function ChildLibraryView({ childrenList }: { childrenList: ChildSummary[] }) {
  return (
    <>
      <div className="flex items-end justify-between mb-12 gap-6 flex-wrap">
        <div>
          <p className="editorial-meta uppercase mb-2">Your library</p>
          <h1>
            {childrenList.length === 1
              ? `${childrenList[0].name}\u2019s library.`
              : 'Your family library.'}
          </h1>
        </div>
        <Link
          href="/children/new"
          className="text-sm text-ink-muted hover:text-ink underline transition-colors"
        >
          Add another child
        </Link>
      </div>

      <div className="space-y-6">
        {childrenList.map((child) => (
          <ChildCard key={child.id} child={child} />
        ))}
      </div>
    </>
  );
}

function ChildCard({ child }: { child: ChildSummary }) {
  const age = child.birth_date ? computeAge(child.birth_date) : null;

  return (
    <article className="border border-rule rounded-sm bg-paper-raised">
      <header className="px-8 pt-8 pb-6 border-b border-rule">
        <div className="flex items-baseline gap-4 flex-wrap justify-between">
          <div className="flex items-baseline gap-4 flex-wrap">
            <h2 className="m-0">{child.name}</h2>
            {age !== null && (
              <span className="editorial-meta">
                {age === 0 ? 'under 1' : `age ${age}`}
              </span>
            )}
          </div>
          <Link
            href={`/children/${child.id}/edit`}
            className="text-sm text-ink-muted hover:text-ink underline transition-colors"
          >
            Edit profile
          </Link>
        </div>
        {child.interests && child.interests.length > 0 && (
          <p className="mt-3 text-sm text-ink-muted leading-relaxed">
            {child.interests.join(' · ')}
          </p>
        )}
      </header>

      <div className="px-8 py-10 text-center">
        <p className="editorial-meta uppercase mb-3">Library</p>
        <p className="text-ink-muted mb-1 leading-relaxed max-w-md mx-auto">
          Nothing screened yet.
        </p>
        <p className="text-sm text-ink-subtle leading-relaxed max-w-md mx-auto">
          Search a title to see how it scores against parent feedback and
          how it might fit {child.name}.
        </p>

        <div className="mt-6 inline-block px-5 py-2 bg-paper-sunken text-ink-subtle rounded-sm text-sm">
          Title search coming next
        </div>
      </div>
    </article>
  );
}

function computeAge(birthDate: string): number {
  const dob = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getDate() < dob.getDate())
  ) {
    age--;
  }
  return Math.max(0, age);
}

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/lib/auth/actions';

/**
 * Landing page. Visible to both signed-out and signed-in users.
 *
 * For signed-out users it functions as the marketing page — sign-up CTAs.
 * For signed-in users it remains a content page they can return to from
 * the dashboard, but the nav and CTA shift to point them back into the
 * app rather than asking them to sign up again.
 */
export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isSignedIn = Boolean(user);

  return (
    <main className="flex-1 flex flex-col">
      {/* Wordmark / nav — adapts based on auth state */}
      <header className="border-b border-rule">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link
            href="/"
            className="font-serif text-xl tracking-tight text-ink"
          >
            Screened
          </Link>

          {isSignedIn ? (
            <nav className="flex items-center gap-6 text-sm">
              <Link
                href="/recommendations"
                className="text-ink-muted hover:text-ink transition-colors"
              >
                Recommendations
              </Link>
              <Link
                href="/dashboard"
                className="text-ink hover:text-accent transition-colors"
              >
                Dashboard
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
          ) : (
            <nav className="flex items-center gap-6 text-sm">
              <Link
                href="/recommendations"
                className="text-ink-muted hover:text-ink transition-colors"
              >
                Recommendations
              </Link>
              <Link
                href="/login"
                className="text-ink-muted hover:text-ink transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="text-ink hover:text-accent transition-colors"
              >
                Get started
              </Link>
            </nav>
          )}
        </div>
      </header>

      {/* Hero — sets the editorial register */}
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-24">
        <p className="editorial-meta uppercase mb-8">For parents</p>

        <h1 className="text-5xl leading-[1.1] tracking-tight mb-8">
          A clearer picture of what your kids are watching.
        </h1>

        <p className="editorial-lede text-ink-muted mb-10 max-w-2xl">
          Screened collects and organises what other parents have noticed
          about TV shows and films, scored against a thoughtful framework —
          so you can decide what fits your child today.
        </p>

        <div className="flex items-center gap-4 flex-wrap">
          {isSignedIn ? (
            <>
              <Link
                href="/dashboard"
                className="inline-block px-6 py-3 bg-ink text-paper rounded-sm hover:bg-accent transition-colors text-sm tracking-wide"
              >
                Go to your dashboard
              </Link>
              <span className="text-ink-muted text-sm">
                Welcome back.
              </span>
            </>
          ) : (
            <>
              <Link
                href="/signup"
                className="inline-block px-6 py-3 bg-ink text-paper rounded-sm hover:bg-accent transition-colors text-sm tracking-wide"
              >
                Set up your first child
              </Link>
              <Link
                href="/login"
                className="text-ink-muted hover:text-ink transition-colors text-sm"
              >
                I have an account
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Three-column "what this is" — keeps the editorial voice */}
      <section className="border-t border-rule">
        <div className="max-w-5xl mx-auto px-6 py-20 grid gap-12 md:grid-cols-3">
          <div>
            <p className="editorial-meta uppercase mb-3">No verdicts</p>
            <h3 className="mb-3">We don&apos;t tell you what&apos;s right.</h3>
            <p className="text-ink-muted leading-relaxed text-[15px]">
              Screened isn&apos;t a regulator. We summarise what parents
              actually report — the good, the surprising, the worth-flagging
              — and trust you with the call.
            </p>
          </div>

          <div>
            <p className="editorial-meta uppercase mb-3">Your child</p>
            <h3 className="mb-3">Fit, not blanket ratings.</h3>
            <p className="text-ink-muted leading-relaxed text-[15px]">
              The same film can be magic for one child and too much for
              another. Tell us about yours, and we&apos;ll show you how a
              show might land.
            </p>
          </div>

          <div>
            <p className="editorial-meta uppercase mb-3">The community</p>
            <h3 className="mb-3">Sharper over time.</h3>
            <p className="text-ink-muted leading-relaxed text-[15px]">
              Add what you noticed after viewing. The picture gets richer for
              you and for every parent who searches the same title later.
            </p>
          </div>
        </div>
      </section>

      {/* Recommendations CTA — pulls from the public discovery page */}
      <section className="border-t border-rule bg-paper-sunken/40">
        <div className="max-w-3xl mx-auto px-6 py-20">
          <p className="editorial-meta uppercase mb-4">Where to start</p>
          <h2 className="mb-6 text-4xl leading-[1.15] tracking-tight">
            What parents recommend, by age.
          </h2>
          <p className="text-ink-muted leading-relaxed mb-8 max-w-2xl">
            Five titles per age band, drawn from the parent-focused lists that
            take this seriously — Common Sense Media, Rotten Tomatoes Family,
            IMDb&rsquo;s Parents Guide, and the threads where parents actually
            compare notes. Refreshed every month. No sign-in required.
          </p>
          <Link
            href="/recommendations"
            className="inline-block text-sm text-ink underline hover:text-accent transition-colors"
          >
            Browse recommendations →
          </Link>
        </div>
      </section>

      <footer className="mt-auto border-t border-rule">
        <div className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between text-sm text-ink-subtle">
          <span>Screened</span>
          <span>An editorial reference, not medical or developmental advice.</span>
        </div>
      </footer>
    </main>
  );
}

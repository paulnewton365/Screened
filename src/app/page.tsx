import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="flex-1 flex flex-col">
      {/* Wordmark / nav */}
      <header className="border-b border-rule">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link
            href="/"
            className="font-serif text-xl tracking-tight text-ink"
          >
            Screened
          </Link>
          <nav className="flex items-center gap-6 text-sm">
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

        <div className="flex items-center gap-4">
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

      <footer className="mt-auto border-t border-rule">
        <div className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between text-sm text-ink-subtle">
          <span>Screened</span>
          <span>An editorial reference, not medical or developmental advice.</span>
        </div>
      </footer>
    </main>
  );
}

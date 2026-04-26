import Link from 'next/link';

export default function SignupPage() {
  return (
    <main className="flex-1 flex flex-col">
      <header className="border-b border-rule">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <Link href="/" className="font-serif text-xl tracking-tight">
            Screened
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-md w-full">
          <h1 className="mb-4">Set up your first child.</h1>
          <p className="text-ink-muted leading-relaxed mb-8">
            Two minutes of setup. You can change anything later.
          </p>

          <div className="border border-rule rounded-sm p-8 bg-paper-raised">
            <p className="text-ink-muted text-sm leading-relaxed">
              Auth + onboarding flow coming in the next iteration. For now,
              this page exists so the routing works.
            </p>
            <p className="text-ink-subtle text-sm mt-4">
              <Link href="/" className="underline hover:text-ink">
                Back home
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

import Link from 'next/link';

type Props = {
  searchParams: Promise<{ email?: string }>;
};

export default async function VerifyPage({ searchParams }: Props) {
  const { email } = await searchParams;

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
        <div className="max-w-md w-full text-center">
          <p className="editorial-meta uppercase mb-6">One more step</p>

          <h1 className="mb-6">Check your inbox.</h1>

          <p className="editorial-lede text-ink-muted mb-8">
            {email ? (
              <>
                We sent a sign-in link to{' '}
                <span className="text-ink">{email}</span>. Click it to come
                back here, signed in.
              </>
            ) : (
              <>We sent you a sign-in link. Click it to come back here, signed in.</>
            )}
          </p>

          <div className="border-t border-rule pt-8 mt-12 text-sm text-ink-muted leading-relaxed">
            <p className="mb-2">
              The link works once and expires after an hour.
            </p>
            <p>
              Didn&apos;t arrive?{' '}
              <Link
                href="/login"
                className="text-ink underline hover:text-accent transition-colors"
              >
                Try again
              </Link>
              . Check spam if it&apos;s slow.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

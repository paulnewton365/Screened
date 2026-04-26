import Link from 'next/link';
import { AuthForm } from '@/components/auth/AuthForm';

type Props = {
  searchParams: Promise<{ error?: string }>;
};

const ERROR_MESSAGES: Record<string, string> = {
  auth_failed:
    'That sign-in link didn\'t work. It may have expired or already been used. Send yourself a fresh one below.',
  missing_code:
    'That link looks incomplete. Send yourself a fresh one below.',
};

export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] : null;

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
          <p className="editorial-meta uppercase mb-4">Sign in</p>
          <h1 className="mb-4">Welcome back.</h1>
          <p className="editorial-lede text-ink-muted mb-10">
            Enter your email and we&apos;ll send you a one-time sign-in link.
          </p>

          {errorMessage && (
            <div
              role="alert"
              className="mb-8 p-4 bg-notice-soft border-l-2 border-notice text-sm text-ink leading-relaxed"
            >
              {errorMessage}
            </div>
          )}

          <AuthForm submitLabel="Send sign-in link" />

          <p className="mt-12 pt-8 border-t border-rule text-sm text-ink-muted">
            New to Screened?{' '}
            <Link
              href="/signup"
              className="text-ink underline hover:text-accent transition-colors"
            >
              Create an account
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}

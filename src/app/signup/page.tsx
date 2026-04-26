import Link from 'next/link';
import { AuthForm } from '@/components/auth/AuthForm';

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
          <p className="editorial-meta uppercase mb-4">Get started</p>
          <h1 className="mb-4">Welcome.</h1>
          <p className="editorial-lede text-ink-muted mb-10">
            Enter your email and we&apos;ll send you a sign-in link. No
            password to remember.
          </p>

          <AuthForm submitLabel="Send sign-in link" />

          <p className="mt-12 pt-8 border-t border-rule text-sm text-ink-muted">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-ink underline hover:text-accent transition-colors"
            >
              Sign in
            </Link>
            .
          </p>

          <p className="mt-6 editorial-meta">
            We&apos;ll never share your email. We&apos;ll never sell your
            data. We&apos;ll never email you anything you didn&apos;t ask
            for.
          </p>
        </div>
      </div>
    </main>
  );
}

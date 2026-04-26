'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { sendMagicLink, type AuthFormState } from '@/lib/auth/actions';

const initialState: AuthFormState = {};

type Props = {
  /** The label on the submit button — varies between sign-in and sign-up. */
  submitLabel: string;
  /** Optional placeholder for the email input. */
  emailPlaceholder?: string;
};

/**
 * Shared form for both /login and /signup.
 *
 * Uses Next.js's useActionState to hold error state without a full page
 * reload, and useFormStatus inside the submit button so the button can
 * show a pending state while the server action is running.
 */
export function AuthForm({
  submitLabel,
  emailPlaceholder = 'you@example.com',
}: Props) {
  const [state, formAction] = useActionState(sendMagicLink, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block editorial-meta uppercase mb-2"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          placeholder={emailPlaceholder}
          className="w-full px-4 py-3 bg-paper-raised border border-rule rounded-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
        />
      </div>

      {state.error && (
        <p
          role="alert"
          className="text-sm text-notice border-l-2 border-notice pl-3 py-1"
        >
          {state.error}
        </p>
      )}

      <SubmitButton label={submitLabel} />
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full px-6 py-3 bg-ink text-paper rounded-sm hover:bg-accent transition-colors text-sm tracking-wide disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? 'Sending…' : label}
    </button>
  );
}

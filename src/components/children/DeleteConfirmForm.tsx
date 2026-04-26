'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  deleteChild,
  type DeleteChildState,
} from '@/lib/children/actions';

const initialState: DeleteChildState = {};

type Props = {
  childId: string;
  childName: string;
};

/**
 * Two-key delete confirmation. The parent has to type the child's name
 * exactly to confirm — prevents accidental deletion from a stray click,
 * without making it feel paranoid.
 */
export function DeleteConfirmForm({ childId, childName }: Props) {
  const [state, formAction] = useActionState(deleteChild, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="id" value={childId} />

      {state.formError && (
        <div
          role="alert"
          className="p-4 bg-notice-soft border-l-2 border-notice text-sm text-ink leading-relaxed"
        >
          {state.formError}
        </div>
      )}

      <div className="max-w-md">
        <label
          htmlFor="confirm_name"
          className="block editorial-meta uppercase mb-2"
        >
          Type <span className="text-ink normal-case">{childName}</span> to confirm
        </label>
        <input
          id="confirm_name"
          name="confirm_name"
          type="text"
          required
          autoComplete="off"
          autoFocus
          placeholder={childName}
          className="w-full px-4 py-3 bg-paper-raised border border-rule rounded-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:border-notice focus:ring-1 focus:ring-notice transition-colors"
        />
      </div>

      <DeleteButton childName={childName} />
    </form>
  );
}

function DeleteButton({ childName }: { childName: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="px-7 py-3 bg-notice text-paper rounded-sm hover:bg-ink transition-colors text-sm tracking-wide disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? 'Deleting…' : `Delete ${childName}\u2019s profile`}
    </button>
  );
}

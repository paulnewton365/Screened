'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveScreening } from '@/lib/screenings/actions';

type Props = {
  childId: string;
  childName: string;
  titleId: string;
  /** If a screening already exists for this child+title, the screening id. */
  existingScreeningId: string | null;
};

/**
 * "Save to library" button. On click, creates a screening record (or
 * returns the existing one if already saved). After save, the button
 * morphs into a link to the observation form.
 */
export function SaveToLibraryButton({
  childId,
  childName,
  titleId,
  existingScreeningId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(existingScreeningId);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const result = await saveScreening({
        child_id: childId,
        title_id: titleId,
      });
      if (!result.ok) {
        setError(result.error);
        setSaving(false);
        return;
      }
      setSavedId(result.screeningId);
      setSaving(false);
      // Refresh so the dashboard library reflects the new entry next time.
      startTransition(() => router.refresh());
    } catch {
      setError("Something went wrong. Try again.");
      setSaving(false);
    }
  }

  if (savedId) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-ink-muted">
          Saved to {childName}&rsquo;s library.
        </p>
        <button
          type="button"
          onClick={() => router.push(`/screenings/${savedId}/observe`)}
          className="text-sm text-ink underline hover:text-accent transition-colors"
        >
          Add observations →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleSave}
        disabled={saving || isPending}
        className="w-full px-5 py-2.5 bg-ink text-paper rounded-sm hover:bg-accent transition-colors text-sm tracking-wide disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving…' : `Save to ${childName}\u2019s library`}
      </button>
      {error && (
        <p role="alert" className="text-sm text-notice">
          {error}
        </p>
      )}
    </div>
  );
}

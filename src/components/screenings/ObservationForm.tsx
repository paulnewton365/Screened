'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateObservations } from '@/lib/screenings/actions';
import {
  OBSERVATION_DIMENSIONS,
  type ObservationInput,
} from '@/lib/screenings/schemas';

type Props = {
  screeningId: string;
  childName: string;
  titleName: string;
  initial: ObservationInput;
};

type DimensionKey =
  | 'engagement_quality'
  | 'emotional_resonance'
  | 'fear_response'
  | 'behavioral_impact'
  | 'play_inspiration';

const ANCHOR_LABELS: Record<DimensionKey, [string, string]> = {
  engagement_quality: ['Half-attention', 'Captivated'],
  emotional_resonance: ['Forgettable', 'Deeply moved'],
  fear_response: ['None', 'Lasting effect'],
  behavioral_impact: ['No change', 'Marked shift'],
  play_inspiration: ['Not at all', 'Sustained play / talk'],
};

/**
 * Observation form for a screening.
 *
 * Five scale dimensions plus when-watched, free-text notes, and a
 * would-rewatch toggle. All fields optional — a parent can save with
 * just one or two filled in and come back later.
 */
export function ObservationForm({
  screeningId,
  childName,
  titleName,
  initial,
}: Props) {
  const router = useRouter();
  const [scores, setScores] = useState<Record<DimensionKey, number | null>>({
    engagement_quality: initial.engagement_quality ?? null,
    emotional_resonance: initial.emotional_resonance ?? null,
    fear_response: initial.fear_response ?? null,
    behavioral_impact: initial.behavioral_impact ?? null,
    play_inspiration: initial.play_inspiration ?? null,
  });
  const [watchedAt, setWatchedAt] = useState(initial.watched_at ?? '');
  const [parentNotes, setParentNotes] = useState(initial.parent_notes ?? '');
  const [wouldRewatch, setWouldRewatch] = useState<boolean | null>(
    initial.would_rewatch ?? null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  async function handleSave(action: 'stay' | 'done') {
    setSaving(true);
    setError(null);
    try {
      const observations: ObservationInput = {
        watched_at: watchedAt || null,
        engagement_quality: scores.engagement_quality,
        emotional_resonance: scores.emotional_resonance,
        fear_response: scores.fear_response,
        behavioral_impact: scores.behavioral_impact,
        play_inspiration: scores.play_inspiration,
        parent_notes: parentNotes.trim() || null,
        would_rewatch: wouldRewatch,
      };
      const result = await updateObservations({
        screening_id: screeningId,
        observations,
      });
      if (!result.ok) {
        setError(result.error);
        setSaving(false);
        return;
      }
      setSaving(false);
      setSavedAt(new Date());
      if (action === 'done') {
        router.push('/dashboard');
      }
    } catch {
      setError('Something went wrong. Try again.');
      setSaving(false);
    }
  }

  return (
    <div className="space-y-12">
      <header>
        <p className="editorial-meta uppercase mb-3">Observations</p>
        <h1 className="mb-4">How did {titleName} land?</h1>
        <p className="editorial-lede text-ink-muted max-w-prose">
          Record what you saw — for {childName}, and for the wider community
          of parents trying to make the same call. Every field is optional;
          fill in only what feels relevant.
        </p>
      </header>

      <section className="space-y-3 max-w-sm">
        <label htmlFor="watched_at" className="block font-serif text-lg leading-snug">
          When did you watch?
        </label>
        <input
          id="watched_at"
          type="date"
          value={watchedAt ?? ''}
          onChange={(e) => setWatchedAt(e.target.value)}
          max={new Date().toISOString().slice(0, 10)}
          className="w-full px-3 py-2 bg-paper-raised border border-rule rounded-sm text-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
        />
        <p className="text-xs text-ink-subtle">Leave blank if you&apos;re not sure.</p>
      </section>

      <hr className="editorial-rule" />

      <section className="space-y-12">
        {OBSERVATION_DIMENSIONS.map((dim) => {
          const value = scores[dim.key];
          const [low, high] = ANCHOR_LABELS[dim.key];
          return (
            <fieldset key={dim.key} className="border-0 p-0">
              <legend className="block mb-1">
                <span className="font-serif text-lg text-ink">{dim.label}</span>
              </legend>
              <p className="text-ink-muted text-sm leading-relaxed mb-5 max-w-prose">
                {dim.helper}
              </p>

              <div
                role="radiogroup"
                aria-label={dim.label}
                className="flex items-center justify-between gap-2 max-w-md"
              >
                {[1, 2, 3, 4, 5].map((n) => {
                  const selected = value === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() =>
                        setScores((prev) => ({
                          ...prev,
                          [dim.key]: prev[dim.key] === n ? null : n,
                        }))
                      }
                      className={[
                        'flex items-center justify-center w-9 h-9 rounded-full border transition-all',
                        selected
                          ? 'bg-ink border-ink text-paper'
                          : 'bg-paper-raised border-rule-strong text-ink-muted hover:border-ink hover:text-ink',
                      ].join(' ')}
                    >
                      <span className="text-sm font-medium">{n}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-start justify-between max-w-md text-xs text-ink-muted leading-snug gap-2">
                <span>{low}</span>
                <span className="text-right">{high}</span>
              </div>

              {value !== null && (
                <button
                  type="button"
                  onClick={() =>
                    setScores((prev) => ({ ...prev, [dim.key]: null }))
                  }
                  className="mt-3 text-xs text-ink-subtle underline hover:text-ink-muted"
                >
                  Clear
                </button>
              )}
            </fieldset>
          );
        })}
      </section>

      <hr className="editorial-rule" />

      <section className="space-y-3">
        <label htmlFor="parent_notes" className="block font-serif text-lg leading-snug">
          Anything else worth recording?
        </label>
        <p className="text-sm text-ink-muted leading-relaxed max-w-prose">
          A specific scene that stayed with them, a question they asked, a
          dream they had after — anything you&apos;d want to remember.
        </p>
        <textarea
          id="parent_notes"
          value={parentNotes}
          onChange={(e) => setParentNotes(e.target.value)}
          rows={6}
          maxLength={5000}
          className="w-full px-3 py-2 bg-paper-raised border border-rule rounded-sm text-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors leading-relaxed"
        />
        <p className="text-xs text-ink-subtle text-right">
          {parentNotes.length} / 5000
        </p>
      </section>

      <hr className="editorial-rule" />

      <section className="space-y-3">
        <p className="font-serif text-lg leading-snug">
          Would you watch it with them again?
        </p>
        <div className="flex gap-3 flex-wrap">
          {[
            { v: true, label: 'Yes' },
            { v: false, label: 'No' },
            { v: null, label: 'Not sure' },
          ].map((opt) => (
            <button
              key={String(opt.v)}
              type="button"
              onClick={() => setWouldRewatch(opt.v)}
              className={[
                'px-5 py-2 rounded-sm text-sm tracking-wide transition-colors border',
                wouldRewatch === opt.v
                  ? 'bg-ink text-paper border-ink'
                  : 'bg-paper-raised text-ink-muted border-rule hover:border-ink-muted',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4 pt-4 border-t border-rule">
        {error && (
          <p
            role="alert"
            className="p-3 bg-notice-soft border-l-2 border-notice text-sm text-ink"
          >
            {error}
          </p>
        )}
        {savedAt && !error && (
          <p className="text-sm text-ink-muted italic">
            Saved at {savedAt.toLocaleTimeString()}.
          </p>
        )}
        <div className="flex gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => handleSave('done')}
            disabled={saving}
            className="px-7 py-3 bg-ink text-paper rounded-sm hover:bg-accent transition-colors text-sm tracking-wide disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save and finish'}
          </button>
          <button
            type="button"
            onClick={() => handleSave('stay')}
            disabled={saving}
            className="px-7 py-3 bg-paper-raised text-ink-muted hover:text-ink rounded-sm border border-rule transition-colors text-sm tracking-wide disabled:opacity-60"
          >
            Save and keep editing
          </button>
        </div>
      </section>
    </div>
  );
}

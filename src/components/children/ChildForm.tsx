'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  createChild,
  updateChild,
  type ChildFormState,
} from '@/lib/children/actions';
import {
  INTEREST_OPTIONS,
  SENSITIVITY_ANCHORS,
  PERSONALITY_ANCHORS,
} from '@/lib/children/schemas';
import { ScalePicker } from './ScalePicker';
import { ChipSelector } from './ChipSelector';

const initialState: ChildFormState = {};

/**
 * The values used to pre-populate the form when editing.
 * Closely mirrors the database row shape but flattened.
 */
export type ChildFormDefaults = {
  id: string;
  name: string;
  birth_date: string | null;
  fear_sensitivity: number | null;
  stimulation_sensitivity: number | null;
  emotional_sensitivity: number | null;
  energy_level: number | null;
  attention_span: number | null;
  interests: string[] | null;
  current_themes: string[] | null;
  notes: string | null;
};

type Props = {
  /** Pass the existing child to switch the form into edit mode. */
  defaults?: ChildFormDefaults;
  /** Custom label for the submit button. Defaults vary by mode. */
  submitLabel?: string;
};

export function ChildForm({ defaults, submitLabel }: Props) {
  const isEdit = Boolean(defaults);
  const action = isEdit ? updateChild : createChild;
  const [state, formAction] = useActionState(action, initialState);

  const buttonLabel = submitLabel ?? (isEdit ? 'Save changes' : 'Save profile');

  // current_themes is stored as text[] in the database (a single-element
  // array, since the form field is one textarea). Flatten it for display.
  const currentThemesValue = defaults?.current_themes?.[0] ?? '';

  return (
    <form action={formAction} className="space-y-16">
      {isEdit && defaults && (
        <input type="hidden" name="id" value={defaults.id} />
      )}

      {state.formError && (
        <div
          role="alert"
          className="p-4 bg-notice-soft border-l-2 border-notice text-sm text-ink leading-relaxed"
        >
          {state.formError}
        </div>
      )}

      {/* SECTION 1 — BASICS */}
      <section className="space-y-6">
        <div>
          <p className="editorial-meta uppercase mb-2">Section one</p>
          <h2 className="mb-2">The basics.</h2>
          <p className="text-ink-muted leading-relaxed text-[15px] max-w-prose">
            Just a name (or nickname) and an age. This is what we&apos;ll show on
            the dashboard.
          </p>
        </div>

        <div className="space-y-5 max-w-md">
          <div>
            <label
              htmlFor="name"
              className="block editorial-meta uppercase mb-2"
            >
              Name or nickname
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              autoComplete="off"
              autoFocus={!isEdit}
              maxLength={50}
              defaultValue={defaults?.name ?? ''}
              placeholder="e.g. Maya, or Bug"
              className="w-full px-4 py-3 bg-paper-raised border border-rule rounded-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
            />
            {state.errors?.name && (
              <p role="alert" className="mt-2 text-sm text-notice">
                {state.errors.name}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="birth_date"
              className="block editorial-meta uppercase mb-2"
            >
              Birth date
              <span className="ml-2 normal-case">optional</span>
            </label>
            <input
              id="birth_date"
              name="birth_date"
              type="date"
              defaultValue={defaults?.birth_date ?? ''}
              className="w-full px-4 py-3 bg-paper-raised border border-rule rounded-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
            />
            <p className="mt-2 text-xs text-ink-subtle leading-relaxed">
              We use this to estimate developmental stage when assessing fit.
              Skip if you&apos;d rather not share.
            </p>
            {state.errors?.birth_date && (
              <p role="alert" className="mt-2 text-sm text-notice">
                {state.errors.birth_date}
              </p>
            )}
          </div>
        </div>
      </section>

      <hr className="editorial-rule" />

      {/* SECTION 2 — SENSITIVITY */}
      <section className="space-y-8">
        <div>
          <p className="editorial-meta uppercase mb-2">Section two</p>
          <h2 className="mb-2">How they experience things.</h2>
          <p className="text-ink-muted leading-relaxed text-[15px] max-w-prose">
            Three quick read-outs on how your child tends to react to what
            they watch. There are no right answers, and these can change —
            you can update them anytime.
          </p>
        </div>

        <ScalePicker
          name="fear_sensitivity"
          label={SENSITIVITY_ANCHORS.fear.label}
          question={SENSITIVITY_ANCHORS.fear.question}
          low={SENSITIVITY_ANCHORS.fear.low}
          mid={SENSITIVITY_ANCHORS.fear.mid}
          high={SENSITIVITY_ANCHORS.fear.high}
          defaultValue={defaults?.fear_sensitivity}
        />

        <ScalePicker
          name="stimulation_sensitivity"
          label={SENSITIVITY_ANCHORS.stimulation.label}
          question={SENSITIVITY_ANCHORS.stimulation.question}
          low={SENSITIVITY_ANCHORS.stimulation.low}
          mid={SENSITIVITY_ANCHORS.stimulation.mid}
          high={SENSITIVITY_ANCHORS.stimulation.high}
          defaultValue={defaults?.stimulation_sensitivity}
        />

        <ScalePicker
          name="emotional_sensitivity"
          label={SENSITIVITY_ANCHORS.emotional.label}
          question={SENSITIVITY_ANCHORS.emotional.question}
          low={SENSITIVITY_ANCHORS.emotional.low}
          mid={SENSITIVITY_ANCHORS.emotional.mid}
          high={SENSITIVITY_ANCHORS.emotional.high}
          defaultValue={defaults?.emotional_sensitivity}
        />
      </section>

      <hr className="editorial-rule" />

      {/* SECTION 3 — PERSONALITY (lighter touch, all optional) */}
      <section className="space-y-8">
        <div>
          <p className="editorial-meta uppercase mb-2">Section three</p>
          <h2 className="mb-2">A little more, if you&apos;d like.</h2>
          <p className="text-ink-muted leading-relaxed text-[15px] max-w-prose">
            All optional. The more you tell us, the sharper the fit
            recommendations. Skip anything that doesn&apos;t feel relevant.
          </p>
        </div>

        <ScalePicker
          name="energy_level"
          label={PERSONALITY_ANCHORS.energy.label}
          question={PERSONALITY_ANCHORS.energy.question}
          low={PERSONALITY_ANCHORS.energy.low}
          mid={PERSONALITY_ANCHORS.energy.mid}
          high={PERSONALITY_ANCHORS.energy.high}
          defaultValue={defaults?.energy_level}
          optional
        />

        <ScalePicker
          name="attention_span"
          label={PERSONALITY_ANCHORS.attention.label}
          question={PERSONALITY_ANCHORS.attention.question}
          low={PERSONALITY_ANCHORS.attention.low}
          mid={PERSONALITY_ANCHORS.attention.mid}
          high={PERSONALITY_ANCHORS.attention.high}
          defaultValue={defaults?.attention_span}
          optional
        />

        <div>
          <p className="font-serif text-lg text-ink mb-1">
            Interests
            <span className="ml-2 editorial-meta normal-case">optional</span>
          </p>
          <p className="text-ink-muted text-sm mt-0 mb-4 leading-relaxed">
            What lights them up? Pick any that apply.
          </p>
          <ChipSelector
            name="interests"
            options={INTEREST_OPTIONS}
            defaultSelected={defaults?.interests ?? []}
          />
        </div>

        <div className="max-w-prose">
          <label
            htmlFor="current_themes"
            className="block font-serif text-lg text-ink mb-1"
          >
            Anything they&apos;re working through right now?
            <span className="ml-2 editorial-meta normal-case">optional</span>
          </label>
          <p className="text-ink-muted text-sm mt-0 mb-3 leading-relaxed">
            Things like a new sibling, starting school, a recent move. Helps
            us pick up on themes a show might touch.
          </p>
          <textarea
            id="current_themes"
            name="current_themes"
            rows={3}
            maxLength={500}
            defaultValue={currentThemesValue}
            className="w-full px-4 py-3 bg-paper-raised border border-rule rounded-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors leading-relaxed"
          />
        </div>

        <div className="max-w-prose">
          <label
            htmlFor="notes"
            className="block font-serif text-lg text-ink mb-1"
          >
            Anything else worth knowing?
            <span className="ml-2 editorial-meta normal-case">optional</span>
          </label>
          <p className="text-ink-muted text-sm mt-0 mb-3 leading-relaxed">
            A few words for your own reference. Only you see this.
          </p>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            maxLength={1000}
            defaultValue={defaults?.notes ?? ''}
            className="w-full px-4 py-3 bg-paper-raised border border-rule rounded-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors leading-relaxed"
          />
        </div>
      </section>

      <hr className="editorial-rule" />

      {/* Submit */}
      <div className="flex items-center gap-4 pt-2 flex-wrap">
        <SubmitButton label={buttonLabel} />
        <p className="text-sm text-ink-subtle">
          {isEdit
            ? 'Changes save immediately.'
            : 'You can edit any of this later.'}
        </p>
      </div>
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="px-7 py-3 bg-ink text-paper rounded-sm hover:bg-accent transition-colors text-sm tracking-wide disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? 'Saving…' : label}
    </button>
  );
}

'use client';

import { useId, useState } from 'react';
import { SCALE_VALUES } from '@/lib/children/schemas';

type Props = {
  /** Form field name. Will be submitted as a number string. */
  name: string;
  /** Heading shown above the picker. */
  label: string;
  /** Subhead in plain language under the heading. */
  question: string;
  /** Anchor descriptions shown below the dots. */
  low: string;
  mid: string;
  high: string;
  /**
   * Initial selected value. For required pickers, defaults to 3 (the
   * mid-point). For optional pickers, pass null/undefined to start
   * with no selection.
   */
  defaultValue?: number | null;
  /** Whether this picker is required (renders a small "(optional)" tag if false). */
  optional?: boolean;
};

/**
 * Five-point picker rendered as a row of circles connected by a hairline.
 *
 * Why this and not a native <input type="range">: native sliders look like
 * a system control, which fights the editorial register. This component
 * renders as a deliberate, considered choice — the kind of thing you'd
 * see in a thoughtful magazine questionnaire.
 *
 * Accessibility: uses radio inputs underneath so screen readers and
 * keyboard navigation work natively. The visual circles are pure styling
 * on top of the radio group.
 */
export function ScalePicker({
  name,
  label,
  question,
  low,
  mid,
  high,
  defaultValue,
  optional = false,
}: Props) {
  const groupId = useId();
  // For required pickers (optional=false), default to 3.
  // For optional pickers, leave unselected unless a value is passed in.
  const initial =
    defaultValue ?? (optional ? null : 3);
  const [value, setValue] = useState<number | null>(initial);

  return (
    <fieldset className="border-0 p-0">
      <legend className="block">
        <span className="block">
          <span className="font-serif text-lg text-ink">{label}</span>
          {optional && (
            <span className="ml-2 editorial-meta normal-case">optional</span>
          )}
        </span>
        <span className="block text-ink-muted text-sm mt-1 leading-relaxed">
          {question}
        </span>
      </legend>

      <div
        role="radiogroup"
        aria-labelledby={groupId}
        className="mt-5 flex items-center justify-between gap-2 max-w-md"
      >
        {SCALE_VALUES.map((n) => {
          const id = `${groupId}-${n}`;
          const selected = value === n;
          return (
            <label
              key={n}
              htmlFor={id}
              className="flex flex-col items-center gap-2 cursor-pointer group"
            >
              <input
                id={id}
                type="radio"
                name={name}
                value={n}
                checked={selected}
                onChange={() => setValue(n)}
                className="sr-only peer"
              />
              <span
                aria-hidden="true"
                className={[
                  'flex items-center justify-center',
                  'w-9 h-9 rounded-full border transition-all',
                  selected
                    ? 'bg-ink border-ink text-paper'
                    : 'bg-paper-raised border-rule-strong text-ink-muted group-hover:border-ink group-hover:text-ink',
                  'peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-paper',
                ].join(' ')}
              >
                <span className="text-sm font-medium">{n}</span>
              </span>
            </label>
          );
        })}
      </div>

      <div className="mt-3 flex items-start justify-between max-w-md text-xs text-ink-muted leading-snug gap-2">
        <span className="text-left max-w-[30%]">{low}</span>
        <span className="text-center max-w-[34%]">{mid}</span>
        <span className="text-right max-w-[30%]">{high}</span>
      </div>
    </fieldset>
  );
}

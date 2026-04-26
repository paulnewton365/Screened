'use client';

import { useState } from 'react';

type Props = {
  /** Form field name written into a hidden input as comma-separated. */
  name: string;
  /** Available chips. */
  options: readonly string[];
  /** Initially selected values. */
  defaultSelected?: string[];
};

/**
 * Multi-select chips. Click to toggle.
 *
 * Visually a row of tag pills, wrapping. Selected ones invert (ink
 * background, paper text). Unselected ones are outlined.
 *
 * The selection is mirrored into a single hidden input as a
 * comma-separated string so it survives FormData submission with
 * minimal handling on the server.
 */
export function ChipSelector({ name, options, defaultSelected = [] }: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(defaultSelected),
  );

  const toggle = (option: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(option)) {
        next.delete(option);
      } else {
        next.add(option);
      }
      return next;
    });
  };

  return (
    <div>
      <input
        type="hidden"
        name={name}
        value={Array.from(selected).join(',')}
      />
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.has(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              aria-pressed={isSelected}
              className={[
                'px-4 py-2 rounded-full text-sm transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
                isSelected
                  ? 'bg-ink text-paper border border-ink'
                  : 'bg-paper-raised text-ink-muted border border-rule hover:border-ink hover:text-ink',
              ].join(' ')}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

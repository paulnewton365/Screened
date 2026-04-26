import Link from 'next/link';

type Props = {
  /**
   * Base URL the picker links into. The picker appends `?child=ID`.
   * Examples: `/dashboard`, `/titles/abc-123`.
   */
  basePath: string;
  childOptions: Array<{ id: string; name: string }>;
  selectedChildId: string | null;
};

/**
 * Per-child picker shown on title and dashboard pages.
 *
 * Renders nothing if there's only one child (or zero) — the picker is
 * only useful when the parent has multiple children to compare against.
 *
 * Pure server-rendered links rather than a JS dropdown: each tab is a
 * direct URL with `?child=ID` appended, so the URL is always the source
 * of truth and the back button works as expected.
 */
export function ChildPicker({ basePath, childOptions, selectedChildId }: Props) {
  if (childOptions.length <= 1) return null;

  return (
    <div className="border border-rule rounded-sm bg-paper-raised">
      <div className="px-5 py-3">
        <p className="editorial-meta uppercase mb-2">Viewing for</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {childOptions.map((c) => {
            const active = c.id === selectedChildId;
            return (
              <Link
                key={c.id}
                href={`${basePath}?child=${c.id}`}
                aria-current={active ? 'page' : undefined}
                className={[
                  'font-serif text-base transition-colors',
                  active
                    ? 'text-ink underline underline-offset-4 decoration-1'
                    : 'text-ink-muted hover:text-ink',
                ].join(' ')}
              >
                {c.name}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

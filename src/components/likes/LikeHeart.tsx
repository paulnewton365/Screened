'use client';

import { useState, useTransition } from 'react';
import { toggleTitleLike } from '@/lib/likes/actions';

type Props = {
  titleId: string;
  initialLiked: boolean;
  /**
   * Visual sizing variant.
   *   - 'sm' — for inline use on screening cards (20px)
   *   - 'md' — for sidebar / detail use (28px)
   */
  size?: 'sm' | 'md';
  /**
   * Optional label override. Default is "Do you like this show?" / "You like
   * this show." Pass `null` to suppress the tooltip entirely (rare).
   */
  unlikedLabel?: string;
  likedLabel?: string;
};

/**
 * A heart toggle that captures whether a parent likes a title.
 *
 * Visually:
 *   - Unliked: outlined heart in ink-muted
 *   - Liked:   filled heart in ink (the editorial black)
 *
 * Behaviour:
 *   - Hover/focus shows a small tooltip "Do you like this show?"
 *   - Click toggles. Optimistic — UI updates immediately, server call
 *     reconciles. If the server returns an error, we revert.
 *   - Disabled while the toggle is in flight to avoid double-clicks.
 *
 * The button itself is keyboard-focusable; aria-pressed reflects state.
 */
export function LikeHeart({
  titleId,
  initialLiked,
  size = 'sm',
  unlikedLabel = 'Do you like this show?',
  likedLabel = 'You like this show.',
}: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [isPending, startTransition] = useTransition();

  const dimension = size === 'sm' ? 20 : 28;

  function handleClick() {
    const optimistic = !liked;
    setLiked(optimistic);

    startTransition(async () => {
      const result = await toggleTitleLike({ title_id: titleId });
      if (!result.ok) {
        // Revert on failure
        setLiked(!optimistic);
      } else if (result.liked !== optimistic) {
        // Server has the truth; reconcile if drift
        setLiked(result.liked);
      }
    });
  }

  const label = liked ? likedLabel : unlikedLabel;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={liked}
      aria-label={label}
      className={[
        'group relative inline-flex items-center justify-center',
        'transition-opacity disabled:opacity-50',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 rounded-full',
        size === 'sm' ? 'p-1' : 'p-1.5',
      ].join(' ')}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={dimension}
        height={dimension}
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={[
          'transition-colors',
          liked ? 'text-ink' : 'text-ink-muted hover:text-ink',
        ].join(' ')}
      >
        <path
          d="M12 21s-7.5-4.5-9.5-9.05C1.13 8.36 3 5 6.5 5c2 0 3.5 1.13 4.5 2.5C12 6.13 13.5 5 15.5 5 19 5 20.87 8.36 19.5 11.95 17.5 16.5 12 21 12 21z"
          fill={liked ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinejoin="round"
        />
      </svg>

      {/* Hover tooltip — sits below the heart so it doesn't get
          clipped by header edges on the title page sidebar. */}
      <span
        role="tooltip"
        className={[
          'pointer-events-none absolute top-full mt-2 left-1/2 -translate-x-1/2',
          'whitespace-nowrap text-xs px-2.5 py-1.5 rounded-sm',
          'bg-ink text-paper',
          'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100',
          'transition-opacity duration-150',
        ].join(' ')}
      >
        {label}
      </span>
    </button>
  );
}

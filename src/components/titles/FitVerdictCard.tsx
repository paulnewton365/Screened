import { VERDICT_LABEL, type FitResult } from '@/lib/scoring/fit';

type Props = {
  fit: FitResult;
  childName: string;
};

/**
 * The per-child fit verdict. Sits as the first editorial element after
 * the high-level summary on the title page.
 *
 * Visual register: a magazine sidebar callout, not a dashboard widget.
 * The verdict is a phrase, not a colour-coded badge.
 */
export function FitVerdictCard({ fit, childName }: Props) {
  return (
    <aside className="border border-rule rounded-sm bg-paper-raised">
      <div className="px-6 py-5 border-b border-rule">
        <p className="editorial-meta uppercase">For {childName}</p>
        <p className="font-serif text-2xl mt-1 leading-tight">
          {VERDICT_LABEL[fit.verdict]}.
        </p>
      </div>

      <div className="px-6 py-5 space-y-4">
        <p className="font-serif text-[17px] leading-relaxed text-ink">
          {fit.headline}
        </p>

        {fit.hard_flags.length > 0 && (
          <div className="p-4 bg-notice-soft border-l-2 border-notice text-sm leading-relaxed">
            {fit.hard_flags.map((flag, i) => (
              <p key={i} className="text-ink">
                {flag.message}
              </p>
            ))}
          </div>
        )}

        <p className="text-ink-muted leading-relaxed text-[15px]">
          {fit.reasoning}
        </p>

        {(fit.things_they_may_love.length > 0 ||
          fit.things_to_watch_for.length > 0) && (
          <div className="grid sm:grid-cols-2 gap-6 pt-4 border-t border-rule">
            {fit.things_they_may_love.length > 0 && (
              <div>
                <p className="editorial-meta uppercase mb-3">
                  May land well
                </p>
                <ul className="space-y-1.5 text-sm text-ink leading-relaxed">
                  {fit.things_they_may_love.map((item, i) => (
                    <li key={i} className="flex gap-2 items-start">
                      <span className="text-ink-subtle">·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {fit.things_to_watch_for.length > 0 && (
              <div>
                <p className="editorial-meta uppercase mb-3">
                  Worth flagging
                </p>
                <ul className="space-y-1.5 text-sm text-ink leading-relaxed">
                  {fit.things_to_watch_for.map((item, i) => (
                    <li key={i} className="flex gap-2 items-start">
                      <span className="text-ink-subtle">·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {fit.watch_with_parent && (
          <p className="text-sm text-ink-muted italic pt-2">
            Worth co-viewing if possible.
          </p>
        )}
      </div>

      <div className="px-6 py-3 border-t border-rule text-center">
        <p className="text-xs text-ink-subtle">
          Overall score{' '}
          <span className="font-mono tabular-nums text-ink-muted">
            {fit.overall_score}/100
          </span>
        </p>
      </div>
    </aside>
  );
}

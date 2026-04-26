import type { Analysis } from '@/lib/claude/schemas';

type Props = {
  themes: Analysis['themes'];
};

const SENTIMENT_LABEL: Record<string, string> = {
  positive: 'Positive',
  negative: 'Negative',
  mixed: 'Mixed',
};

const PREVALENCE_LABEL: Record<string, string> = {
  common: 'Commonly mentioned',
  sometimes: 'Sometimes mentioned',
  minority: 'Mentioned by some',
};

/**
 * Recurring themes from parent feedback, set as a column of editorial
 * callouts. Each theme is a pull-quote with a small meta-line for
 * sentiment and prevalence.
 */
export function ThemesList({ themes }: Props) {
  if (themes.length === 0) {
    return (
      <p className="text-ink-muted leading-relaxed">
        No recurring themes surfaced in available parent feedback.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {themes.map((theme, i) => (
        <article key={i} className="editorial-pullquote">
          <p className="editorial-meta uppercase mb-2 text-ink-subtle">
            {SENTIMENT_LABEL[theme.sentiment]} ·{' '}
            {PREVALENCE_LABEL[theme.prevalence]}
          </p>
          <h3 className="mb-3 font-serif text-xl">{theme.title}</h3>
          <p className="text-ink leading-relaxed text-[16px]">
            {theme.summary}
          </p>
        </article>
      ))}
    </div>
  );
}

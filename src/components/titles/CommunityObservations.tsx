import type { CommunityObservation } from '@/lib/community/schemas';
import {
  type AgeBand,
  type SensitivityBand,
  SENSITIVITY_BAND_LABEL,
} from '@/lib/community/bands';

type Props = {
  data: CommunityObservation;
  ageBand: AgeBand;
  sensitivityBand: SensitivityBand;
  childName: string;
};

const DIMENSION_ROWS: Array<{
  key: keyof Pick<
    CommunityObservation,
    | 'engagement_quality'
    | 'emotional_resonance'
    | 'fear_response'
    | 'behavioral_impact'
    | 'play_inspiration'
  >;
  label: string;
  description: (median: number) => string;
}> = [
  {
    key: 'engagement_quality',
    label: 'Engagement',
    description: (m) =>
      m >= 4
        ? 'Most kids were captivated.'
        : m >= 3
        ? 'Engagement was solid for most.'
        : m >= 2
        ? 'Mixed — some interested, some not.'
        : 'Low attention from most.',
  },
  {
    key: 'emotional_resonance',
    label: 'Resonance',
    description: (m) =>
      m >= 4
        ? 'Moved most viewers.'
        : m >= 3
        ? 'Some emotional pull for most.'
        : m >= 2
        ? 'Mild reaction in most cases.'
        : 'Largely forgettable for this group.',
  },
  {
    key: 'fear_response',
    label: 'Fear',
    description: (m) =>
      m <= 1
        ? 'No fear reactions reported.'
        : m <= 2
        ? 'Mostly mild — no lasting effects.'
        : m <= 3
        ? 'Notable for some, fine for others.'
        : 'Significant fear response common.',
  },
  {
    key: 'behavioral_impact',
    label: 'Behaviour',
    description: (m) =>
      m <= 1
        ? 'No behaviour shifts noted.'
        : m <= 2
        ? 'Subtle to none.'
        : m <= 3
        ? 'Notable shifts in some.'
        : 'Marked behaviour shifts common.',
  },
  {
    key: 'play_inspiration',
    label: 'Play / talk',
    description: (m) =>
      m >= 4
        ? 'Sparked play and conversation for most.'
        : m >= 3
        ? 'Triggered some play or talk.'
        : m >= 2
        ? 'A little spark, mostly forgotten.'
        : 'Did not inspire much.',
  },
];

/**
 * Community observations display.
 *
 * Shown on the title page when there are enough community observations
 * for a child's band (age + sensitivity). Reads from the
 * community_observations table — refreshed by the nightly rollup.
 *
 * Editorial register: this is the most concrete signal in the app. Real
 * parents of similar children, anonymised, aggregated. Treat the data
 * with appropriate respect — describe what the median says rather than
 * making claims about all parents.
 */
export function CommunityObservations({
  data,
  ageBand,
  sensitivityBand,
  childName,
}: Props) {
  return (
    <section className="border border-rule rounded-sm bg-paper-raised p-8">
      <header className="mb-6">
        <p className="editorial-meta uppercase mb-2">
          From parents of similar children
        </p>
        <h2 className="m-0">
          Among {data.n} {data.n === 1 ? 'parent' : 'parents'} of{' '}
          {SENSITIVITY_BAND_LABEL[sensitivityBand]} {ageBand} year olds
          {ageBand === '0-2' || ageBand === '16+' ? '' : ''}.
        </h2>
        <p className="text-sm text-ink-muted leading-relaxed mt-3 max-w-prose">
          What other parents of children most like {childName} have observed
          after watching this. Aggregated and anonymised; medians shown.
        </p>
      </header>

      <dl className="space-y-4">
        {DIMENSION_ROWS.map(({ key, label, description }) => {
          const dim = data[key];
          if (dim.n === 0 || dim.median === null) return null;
          return (
            <div
              key={key}
              className="grid grid-cols-[100px_1fr] gap-x-4 gap-y-1 items-baseline"
            >
              <dt className="font-serif text-base text-ink">{label}</dt>
              <dd>
                <Bars distribution={dim.distribution} />
              </dd>
              <dd className="col-span-2 text-sm text-ink-muted leading-relaxed -mt-0.5">
                {description(dim.median)}{' '}
                <span className="text-ink-subtle">
                  Median {Math.round(dim.median * 10) / 10} of 5
                </span>
              </dd>
            </div>
          );
        })}
      </dl>

      {(data.would_rewatch_yes > 0 ||
        data.would_rewatch_no > 0 ||
        data.would_rewatch_unsure > 0) && (
        <p className="mt-6 pt-6 border-t border-rule text-sm text-ink leading-relaxed">
          {data.would_rewatch_yes} of {data.n}{' '}
          {data.would_rewatch_yes === 1 ? 'parent' : 'parents'} said they would
          watch it again with this child.
        </p>
      )}
    </section>
  );
}

/**
 * Bar visualisation of a 1-5 distribution. Bar width is proportional to
 * count at each value, normalised to the most common value.
 */
function Bars({ distribution }: { distribution: number[] }) {
  const max = Math.max(...distribution, 1);
  return (
    <div className="space-y-1 max-w-xs">
      {distribution.map((count, i) => {
        const value = i + 1;
        const widthPct = (count / max) * 100;
        return (
          <div key={value} className="flex items-center gap-2">
            <span className="text-[11px] text-ink-subtle font-mono tabular-nums w-3">
              {value}
            </span>
            <div className="flex-1 h-1.5 bg-paper-sunken rounded-sm overflow-hidden">
              <div
                className="h-full bg-ink"
                style={{ width: `${widthPct}%` }}
              />
            </div>
            <span className="text-[11px] text-ink-subtle font-mono tabular-nums w-4 text-right">
              {count > 0 ? count : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}

import type { Analysis } from '@/lib/claude/schemas';

type Props = {
  analysis: Analysis;
};

/**
 * The dimensional scorecard, set as a magazine sidebar.
 *
 * Critical design rule: a 5/5 violence score must look exactly as
 * visually loud as a 5/5 educational value score. The app reports;
 * the parent decides. So we use the same dot-row treatment for every
 * dimension regardless of polarity.
 */

type Group = {
  heading: string;
  rows: Array<{
    label: string;
    value: number | null;
    evidence: string;
  }>;
};

export function Scorecard({ analysis }: Props) {
  const s = analysis.scores;

  const groups: Group[] = [
    {
      heading: 'Sensory',
      rows: [
        {
          label: 'Stimulation intensity',
          value: s.stimulation_intensity.value,
          evidence: s.stimulation_intensity.evidence,
        },
        {
          label: 'Frightening content',
          value: s.frightening_content.value,
          evidence: s.frightening_content.evidence,
        },
      ],
    },
    {
      heading: 'Content',
      rows: [
        {
          label: 'Violence',
          value: s.violence_level.value,
          evidence: s.violence_level.evidence,
        },
        {
          label: 'Sexual content',
          value: s.sexual_content.value,
          evidence: s.sexual_content.evidence,
        },
        {
          label: 'Romance',
          value: s.romance_content.value,
          evidence: s.romance_content.evidence,
        },
        {
          label: 'Adult themes',
          value: s.adult_themes.value,
          evidence: s.adult_themes.evidence,
        },
        {
          label: 'Themes — handling',
          value: s.adult_themes_handling.value,
          evidence: s.adult_themes_handling.evidence,
        },
        {
          label: 'Language',
          value: s.language_level.value,
          evidence: s.language_level.evidence,
        },
      ],
    },
    {
      heading: 'Craft',
      rows: [
        {
          label: 'Narrative quality',
          value: s.narrative_quality.value,
          evidence: s.narrative_quality.evidence,
        },
        {
          label: 'Production quality',
          value: s.production_quality.value,
          evidence: s.production_quality.evidence,
        },
      ],
    },
    {
      heading: 'Values',
      rows: [
        {
          label: 'Prosocial content',
          value: s.prosocial_content.value,
          evidence: s.prosocial_content.evidence,
        },
        {
          label: 'Authenticity',
          value: s.prosocial_authenticity.value,
          evidence: s.prosocial_authenticity.evidence,
        },
        {
          label: 'Representation',
          value: s.representation.value,
          evidence: s.representation.evidence,
        },
        {
          label: 'Role models',
          value: s.agency_role_models.value,
          evidence: s.agency_role_models.evidence,
        },
        {
          label: 'Educational value',
          value: s.educational_value.value,
          evidence: s.educational_value.evidence,
        },
        {
          label: 'Commercialism',
          value: s.commercialism.value,
          evidence: s.commercialism.evidence,
        },
      ],
    },
  ];

  return (
    <div className="border border-rule rounded-sm bg-paper-raised">
      <div className="px-6 py-5 border-b border-rule">
        <p className="editorial-meta uppercase">The scorecard</p>
        <h3 className="mt-1 mb-0">How parents read it.</h3>
      </div>

      <div className="px-6 py-2">
        {groups.map((group, idx) => (
          <section
            key={group.heading}
            className={
              idx === 0 ? 'py-5' : 'py-5 border-t border-rule'
            }
          >
            <p className="editorial-meta uppercase mb-3">{group.heading}</p>
            <dl className="space-y-3">
              {group.rows.map((row) => (
                <ScoreRow key={row.label} {...row} />
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}

function ScoreRow({
  label,
  value,
  evidence,
}: {
  label: string;
  value: number | null;
  evidence: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 items-baseline">
      <dt className="font-serif text-ink text-[15px]">{label}</dt>
      <dd className="font-mono text-sm tabular-nums">
        {value === null ? (
          <span className="text-ink-subtle italic font-sans">unrated</span>
        ) : (
          <Dots value={value} />
        )}
      </dd>
      {evidence && (
        <p className="col-span-2 text-xs text-ink-muted leading-relaxed -mt-0.5 max-w-prose">
          {evidence}
        </p>
      )}
    </div>
  );
}

function Dots({ value }: { value: number }) {
  return (
    <span aria-label={`${value} out of 5`} className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          aria-hidden="true"
          className={[
            'inline-block w-2 h-2 rounded-full',
            n <= value ? 'bg-ink' : 'bg-rule',
          ].join(' ')}
        />
      ))}
    </span>
  );
}

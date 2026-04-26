import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/lib/auth/actions';
import { rowToAnalysis, type TitleAnalysisRow } from '@/lib/claude/store';
import { computeFit } from '@/lib/scoring/fit';
import { AnalysisStream } from '@/components/titles/AnalysisStream';
import { Scorecard } from '@/components/titles/Scorecard';
import { ThemesList } from '@/components/titles/ThemesList';
import { CertificationBlock } from '@/components/titles/CertificationBlock';
import { FitVerdictCard } from '@/components/titles/FitVerdictCard';
import { RefreshAnalysisButton } from '@/components/titles/RefreshAnalysisButton';
import { ChildPicker } from '@/components/titles/ChildPicker';
import { CommunityObservations } from '@/components/titles/CommunityObservations';
import { SaveToLibraryButton } from '@/components/screenings/SaveToLibraryButton';
import { ageBandFromBirthDate, sensitivityBand } from '@/lib/community/bands';
import { communityObservationSchema } from '@/lib/community/schemas';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ child?: string }>;
};

/**
 * /titles/[id]
 *
 * Renders the analysis for a title. Two modes:
 *
 *   1. Cached — a current analysis exists, render it inline immediately
 *   2. Stream — no current analysis, mount the streaming UI which kicks
 *      off a Claude run and refreshes the page on completion
 *
 * If the user has children, we also compute and show a per-child fit
 * verdict. With multiple children, defaults to the first; ?child=ID
 * overrides.
 */
export default async function TitlePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { child: childIdParam } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch the title
  const { data: title } = await supabase
    .from('titles')
    .select('*')
    .eq('id', id)
    .single();

  if (!title) notFound();

  // Fetch the current analysis if any
  const { data: analysisRow } = await supabase
    .from('title_analyses')
    .select('*')
    .eq('title_id', id)
    .is('superseded_by', null)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Ask the database if a refresh is allowed right now. This honours
  // the cooldown logic encoded in can_refresh_title, so any future
  // policy changes there flow through automatically.
  let canRefresh = false;
  if (analysisRow) {
    const { data: refreshAllowed } = await supabase.rpc('can_refresh_title', {
      p_title_id: id,
    });
    canRefresh = refreshAllowed === true;
  }

  // Fetch children (if any) for the fit verdict
  const { data: children } = await supabase
    .from('children')
    .select(
      'id, name, birth_date, fear_sensitivity, stimulation_sensitivity, emotional_sensitivity',
    )
    .order('created_at', { ascending: true });

  const selectedChild =
    children?.find((c) => c.id === childIdParam) ?? children?.[0] ?? null;

  // If we have a selected child, look for an existing screening for this
  // child+title pair. Used to flip the "Save to library" button into
  // "Already saved" mode.
  let existingScreeningId: string | null = null;
  if (selectedChild) {
    const { data: existing } = await supabase
      .from('screenings')
      .select('id')
      .eq('child_id', selectedChild.id)
      .eq('title_id', id)
      .maybeSingle();
    existingScreeningId = existing?.id ?? null;
  }

  const analysis = analysisRow ? rowToAnalysis(analysisRow as TitleAnalysisRow) : null;

  const fit =
    analysis && selectedChild
      ? computeFit({
          analysis,
          child: selectedChild,
          certifications: (title.certifications as {
            us?: { rating: string };
            uk?: { rating: string };
          } | null) ?? null,
        })
      : null;

  // Fetch the community observations row, if any, for the selected
  // child's age + sensitivity band. The nightly rollup populates this
  // table; we just read the precomputed aggregate.
  let communityObservation: {
    data: import('@/lib/community/schemas').CommunityObservation;
    ageBand: import('@/lib/community/bands').AgeBand;
    sensitivityBand: import('@/lib/community/bands').SensitivityBand;
  } | null = null;

  if (selectedChild) {
    const ageBand = ageBandFromBirthDate(selectedChild.birth_date);
    const sensBand = sensitivityBand(selectedChild);
    if (ageBand) {
      const { data: communityRow } = await supabase
        .from('community_observations')
        .select('observations')
        .eq('title_id', id)
        .eq('child_age_band', ageBand)
        .eq('sensitivity_band', sensBand)
        .maybeSingle();

      if (communityRow?.observations) {
        const parsed = communityObservationSchema.safeParse(
          communityRow.observations,
        );
        if (parsed.success) {
          communityObservation = {
            data: parsed.data,
            ageBand,
            sensitivityBand: sensBand,
          };
        }
      }
    }
  }

  return (
    <main className="flex-1 flex flex-col">
      <header className="border-b border-rule">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/dashboard" className="font-serif text-xl tracking-tight">
            Screened
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/dashboard"
              className="text-ink-muted hover:text-ink transition-colors"
            >
              Dashboard
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="text-ink-muted hover:text-ink transition-colors"
              >
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12 w-full">
        {/* Title header */}
        <article className="mb-12">
          <div className="grid md:grid-cols-[200px_1fr] gap-8 items-start">
            {title.poster_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={title.poster_url}
                alt={`${title.title} poster`}
                className="w-full max-w-[200px] aspect-[2/3] object-cover bg-paper-sunken border border-rule"
              />
            )}
            <div>
              <p className="editorial-meta uppercase mb-3">
                {title.type === 'movie' ? 'Film' : 'TV show'}
                {title.release_year && ` · ${title.release_year}`}
              </p>
              <h1 className="mb-4 leading-tight">{title.title}</h1>
              <CertificationBlock
                certifications={
                  title.certifications as {
                    us?: { rating: string };
                    uk?: { rating: string };
                  } | null
                }
              />
              {title.synopsis && (
                <p className="mt-6 text-ink-muted leading-relaxed max-w-prose">
                  {title.synopsis}
                </p>
              )}
            </div>
          </div>
        </article>

        <hr className="editorial-rule mb-12" />

        {/* Body */}
        {analysis ? (
          <CachedAnalysisView
            analysis={analysis}
            generatedAt={analysisRow!.generated_at}
            confidence={analysisRow!.confidence}
            sourceCount={analysisRow!.source_count}
            fit={fit}
            titleId={id}
            titleName={title.title}
            selectedChildId={selectedChild?.id ?? null}
            selectedChildName={selectedChild?.name ?? null}
            childCount={children?.length ?? 0}
            childOptions={(children ?? []).map((c) => ({
              id: c.id,
              name: c.name,
            }))}
            existingScreeningId={existingScreeningId}
            canRefresh={canRefresh}
            communityObservation={communityObservation}
          />
        ) : (
          <AnalysisStream titleId={id} titleName={title.title} />
        )}
      </div>
    </main>
  );
}

function CachedAnalysisView({
  analysis,
  generatedAt,
  confidence,
  sourceCount,
  fit,
  titleId,
  titleName,
  selectedChildId,
  selectedChildName,
  childCount,
  childOptions,
  existingScreeningId,
  canRefresh,
  communityObservation,
}: {
  analysis: ReturnType<typeof rowToAnalysis>;
  generatedAt: string;
  confidence: 'high' | 'medium' | 'low';
  sourceCount: number;
  fit: ReturnType<typeof computeFit> | null;
  titleId: string;
  titleName: string;
  selectedChildId: string | null;
  selectedChildName: string | null;
  childCount: number;
  childOptions: Array<{ id: string; name: string }>;
  existingScreeningId: string | null;
  canRefresh: boolean;
  communityObservation: {
    data: import('@/lib/community/schemas').CommunityObservation;
    ageBand: import('@/lib/community/bands').AgeBand;
    sensitivityBand: import('@/lib/community/bands').SensitivityBand;
  } | null;
}) {
  const generated = new Date(generatedAt);
  const now = new Date();
  const daysAgo = Math.floor(
    (now.getTime() - generated.getTime()) / (1000 * 60 * 60 * 24),
  );

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-12">
      <div className="space-y-12 min-w-0">
        {/* Lede */}
        <section>
          <p className="editorial-meta uppercase mb-3">The picture</p>
          <p className="editorial-lede text-ink leading-relaxed">
            {analysis.high_level_summary}
          </p>

          <p className="mt-6 editorial-meta">
            Based on{' '}
            <span className="text-ink-muted">{sourceCount} sources</span> ·{' '}
            <span className="text-ink-muted capitalize">{confidence} confidence</span>
            {' · '}
            <span className="text-ink-muted">
              {daysAgo === 0
                ? 'updated today'
                : daysAgo === 1
                ? 'updated yesterday'
                : `updated ${daysAgo} days ago`}
            </span>
          </p>
        </section>

        {analysis.themes.length > 0 && (
          <section>
            <p className="editorial-meta uppercase mb-3">Recurring themes</p>
            <h2 className="mb-8">What parents talk about.</h2>
            <ThemesList themes={analysis.themes} />
          </section>
        )}

        {analysis.content_warnings.length > 0 && (
          <section>
            <p className="editorial-meta uppercase mb-3">Content notices</p>
            <h2 className="mb-4">Worth knowing.</h2>
            <p className="text-ink-muted text-[15px] leading-relaxed mb-4 max-w-prose">
              Specific things sensitive parents have flagged. These are
              notices, not judgements — context to help you decide.
            </p>
            <ul className="space-y-2">
              {analysis.content_warnings.map((warning, i) => (
                <li
                  key={i}
                  className="text-ink leading-relaxed flex gap-3 items-start"
                >
                  <span className="text-ink-subtle mt-0.5">·</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {communityObservation && selectedChildName && (
          <CommunityObservations
            data={communityObservation.data}
            ageBand={communityObservation.ageBand}
            sensitivityBand={communityObservation.sensitivityBand}
            childName={selectedChildName}
          />
        )}

        <section>
          <p className="editorial-meta uppercase mb-3">Age picture</p>
          <h2 className="mb-4">
            Parents commonly point to{' '}
            <span className="font-serif">
              ages {analysis.age_recommendation.min}–
              {analysis.age_recommendation.max}
            </span>
            .
          </h2>
          <p className="text-ink-muted leading-relaxed max-w-prose">
            {analysis.age_recommendation.reasoning}
          </p>
        </section>

        {analysis.sources.length > 0 && (
          <section className="pt-4 border-t border-rule">
            <p className="editorial-meta uppercase mb-3">Drawn from</p>
            <ul className="text-sm text-ink-muted leading-relaxed space-y-1">
              {analysis.sources.map((source, i) => (
                <li key={i}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-ink underline-offset-2 hover:underline"
                  >
                    {source.name}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Sidebar — sticky on desktop */}
      <aside className="space-y-8 lg:sticky lg:top-8 lg:self-start">
        <ChildPicker
          basePath={`/titles/${titleId}`}
          childOptions={childOptions}
          selectedChildId={selectedChildId}
        />

        {fit && selectedChildName ? (
          <FitVerdictCard fit={fit} childName={selectedChildName} />
        ) : childCount === 0 ? (
          <div className="border border-rule rounded-sm bg-paper-raised p-6">
            <p className="editorial-meta uppercase mb-2">Personalise this</p>
            <p className="text-ink leading-relaxed text-sm mb-4">
              Add a child profile and you&apos;ll see a fit recommendation
              tailored to them.
            </p>
            <Link
              href="/children/new"
              className="inline-block text-sm text-ink underline hover:text-accent transition-colors"
            >
              Set up a child profile
            </Link>
          </div>
        ) : null}

        {selectedChildId && selectedChildName && (
          <div className="border border-rule rounded-sm bg-paper-raised p-6">
            <SaveToLibraryButton
              titleId={titleId}
              childId={selectedChildId}
              childName={selectedChildName}
              existingScreeningId={existingScreeningId}
            />
          </div>
        )}

        <RefreshAnalysisButton
          titleId={titleId}
          titleName={titleName}
          generatedAt={generatedAt}
          canRefresh={canRefresh}
        />

        <Scorecard analysis={analysis} />
      </aside>
    </div>
  );
}

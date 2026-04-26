'use client';

import { useState } from 'react';
import { AnalysisStream } from './AnalysisStream';

type Props = {
  titleId: string;
  titleName: string;
  /** ISO timestamp of when the current analysis was generated. */
  generatedAt: string;
  /**
   * Whether the database considers this title eligible for refresh
   * right now. Computed server-side via the can_refresh_title RPC.
   */
  canRefresh: boolean;
};

const COOLDOWN_DAYS = 7;

/**
 * Refresh button for a title's analysis.
 *
 * Three states:
 *   1. Cooldown active — shows "available again in N days" with no action
 *   2. Cooldown clear — shows "Refresh analysis" button
 *   3. Refreshing — mounts AnalysisStream which re-runs the Claude call
 *
 * The streaming UI replaces this whole component during a refresh,
 * including the analysis above it briefly disappearing on page refresh.
 * That's intentional: the user opted into a re-analysis and expects to
 * see fresh output, not a stale page with a streaming overlay.
 */
export function RefreshAnalysisButton({
  titleId,
  titleName,
  generatedAt,
  canRefresh,
}: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (refreshing) {
    return (
      <div className="border border-rule rounded-sm bg-paper-raised p-6">
        <p className="editorial-meta uppercase mb-3">Refreshing analysis</p>
        <p className="text-sm text-ink-muted leading-relaxed mb-4">
          Generating a new take. The page will update when it&apos;s ready.
        </p>
        <AnalysisStream
          titleId={titleId}
          titleName={titleName}
          isRefresh
        />
      </div>
    );
  }

  const generated = new Date(generatedAt);
  const now = new Date();
  const daysSince = Math.floor(
    (now.getTime() - generated.getTime()) / (1000 * 60 * 60 * 24),
  );
  const daysUntilEligible = Math.max(0, COOLDOWN_DAYS - daysSince);

  return (
    <div className="border border-rule rounded-sm bg-paper-raised p-6">
      <p className="editorial-meta uppercase mb-2">Freshness</p>
      <p className="text-sm text-ink-muted leading-relaxed mb-4">
        {daysSince === 0
          ? 'Analysed today.'
          : daysSince === 1
          ? 'Analysed yesterday.'
          : `Analysed ${daysSince} days ago.`}{' '}
        {canRefresh
          ? 'You can ask for a fresh take.'
          : `Refresh available in ${daysUntilEligible} ${
              daysUntilEligible === 1 ? 'day' : 'days'
            }.`}
      </p>

      {canRefresh && !confirming && (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-sm text-ink underline hover:text-accent transition-colors"
        >
          Refresh analysis
        </button>
      )}

      {canRefresh && confirming && (
        <div className="space-y-3 pt-2">
          <p className="text-sm text-ink leading-relaxed">
            Generate a fresh analysis? The current one will be replaced.
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setRefreshing(true)}
              className="px-4 py-2 bg-ink text-paper rounded-sm hover:bg-accent transition-colors text-sm tracking-wide"
            >
              Yes, refresh
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="px-4 py-2 bg-paper-raised text-ink-muted hover:text-ink rounded-sm border border-rule transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

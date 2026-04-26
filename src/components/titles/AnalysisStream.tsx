'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type StreamEvent =
  | { type: 'started'; title: string }
  | { type: 'searching'; query: string }
  | { type: 'thinking'; message: string }
  | { type: 'analysing'; message: string }
  | { type: 'complete' }
  | { type: 'stored'; analysisId: string }
  | { type: 'error'; message: string };

type Phase =
  | { kind: 'idle' }
  | { kind: 'streaming'; messages: string[]; queries: string[] }
  | { kind: 'done' }
  | { kind: 'error'; message: string };

type Props = {
  titleId: string;
  titleName: string;
};

/**
 * Streaming analysis UI.
 *
 * Kicks off a POST to /api/titles/[id]/analyze on mount, reads the
 * newline-delimited JSON stream, and renders progress in real time.
 *
 * On 'stored' it refreshes the page so the parent server component
 * picks up the cached row and renders the full analysis.
 */
export function AnalysisStream({ titleId, titleName }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const abortController = new AbortController();

    async function run() {
      setPhase({ kind: 'streaming', messages: [], queries: [] });

      let res: Response;
      try {
        res = await fetch(`/api/titles/${titleId}/analyze`, {
          method: 'POST',
          signal: abortController.signal,
        });
      } catch {
        setPhase({
          kind: 'error',
          message: "We couldn't reach the analysis service. Try again.",
        });
        return;
      }

      if (!res.ok || !res.body) {
        setPhase({
          kind: 'error',
          message: 'The analysis service is temporarily unavailable.',
        });
        return;
      }

      const reader = res.body
        .pipeThrough(new TextDecoderStream())
        .getReader();

      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += value;

          let nl;
          while ((nl = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!line) continue;

            let event: StreamEvent;
            try {
              event = JSON.parse(line) as StreamEvent;
            } catch {
              continue;
            }

            setPhase((prev) => {
              if (prev.kind !== 'streaming') return prev;
              const next = {
                kind: 'streaming' as const,
                messages: [...prev.messages],
                queries: [...prev.queries],
              };

              if (event.type === 'searching') {
                if (!next.queries.includes(event.query)) {
                  next.queries.push(event.query);
                }
              } else if (event.type === 'thinking' || event.type === 'analysing') {
                if (next.messages[next.messages.length - 1] !== event.message) {
                  next.messages.push(event.message);
                }
              }

              return next;
            });

            if (event.type === 'error') {
              setPhase({ kind: 'error', message: event.message });
              return;
            }
            if (event.type === 'stored') {
              setPhase({ kind: 'done' });
              router.refresh();
              return;
            }
          }
        }
      } catch (err) {
        if (abortController.signal.aborted) return;
        console.error('Stream read failed:', err);
        setPhase({
          kind: 'error',
          message: 'The connection dropped during analysis. Try again.',
        });
      }
    }

    void run();

    return () => abortController.abort();
  }, [titleId, router]);

  return (
    <div className="border border-rule rounded-sm bg-paper-raised p-10 max-w-2xl">
      <p className="editorial-meta uppercase mb-4">Analysing</p>

      <h2 className="mb-4">Reading what parents have said about {titleName}.</h2>

      <p className="text-ink-muted leading-relaxed mb-8 max-w-prose">
        This usually takes 20–40 seconds. We&apos;re searching parent
        forums, review sites, and discussion threads, then synthesising
        what they say into a single picture.
      </p>

      {phase.kind === 'streaming' && (
        <div className="space-y-4">
          {phase.queries.length > 0 && (
            <div>
              <p className="editorial-meta uppercase mb-2">Sources consulted</p>
              <ul className="space-y-1.5">
                {phase.queries.map((q, i) => (
                  <li
                    key={i}
                    className="text-sm text-ink leading-relaxed flex items-start gap-2"
                  >
                    <span className="text-accent mt-0.5">→</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {phase.messages.length > 0 && (
            <div className="pt-4 border-t border-rule">
              <p className="text-sm text-ink-muted italic">
                {phase.messages[phase.messages.length - 1]}
              </p>
            </div>
          )}
          {phase.queries.length === 0 && phase.messages.length === 0 && (
            <p className="text-sm text-ink-muted italic">Starting…</p>
          )}
          <div className="flex items-center gap-2 pt-4">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse [animation-delay:200ms]" />
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse [animation-delay:400ms]" />
          </div>
        </div>
      )}

      {phase.kind === 'done' && (
        <p className="text-sm text-ink-muted italic">
          Done. Loading the full picture…
        </p>
      )}

      {phase.kind === 'error' && (
        <div className="space-y-4">
          <p
            role="alert"
            className="p-4 bg-notice-soft border-l-2 border-notice text-sm text-ink leading-relaxed"
          >
            {phase.message}
          </p>
          <button
            type="button"
            onClick={() => {
              startedRef.current = false;
              setPhase({ kind: 'idle' });
              // Trigger re-run by remounting (cheap solution)
              router.refresh();
            }}
            className="px-5 py-2 bg-ink text-paper rounded-sm hover:bg-accent transition-colors text-sm tracking-wide"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

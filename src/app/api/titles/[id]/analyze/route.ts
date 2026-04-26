import { type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { streamAnalysis, type AnalysisStreamEvent } from '@/lib/claude/analyze';
import { storeAnalysis } from '@/lib/claude/store';

/**
 * POST /api/titles/[id]/analyze
 *
 * Streams an analysis run as newline-delimited JSON. Each line is one
 * AnalysisStreamEvent. Once the analysis is stored in the database, a
 * final 'complete' event is emitted with the analysis row id.
 *
 * The client reads this with a ReadableStreamDefaultReader and renders
 * progress in real time.
 *
 * On Vercel, the request can run for up to 300 seconds (Pro plan) or
 * the configured maxDuration. We set 60 seconds as a reasonable cap
 * for this iteration — typical analyses complete in 20-40 seconds.
 */

export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: titleId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(
      JSON.stringify({ error: 'unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Fetch the title to get its name + year + type for the prompt.
  const { data: title } = await supabase
    .from('titles')
    .select('id, title, release_year, type')
    .eq('id', titleId)
    .single();

  if (!title) {
    return new Response(
      JSON.stringify({ error: 'title_not_found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Cooldown check: prevent runaway costs from rapid refresh clicks.
  const service = createServiceRoleClient();
  const { data: cooldownCheck } = await service.rpc('can_refresh_title', {
    p_title_id: titleId,
  });
  // Only enforce on refresh — first analysis always allowed.
  // Refresh signal: client passes ?refresh=1 in URL.
  const isRefresh = request.nextUrl.searchParams.get('refresh') === '1';
  if (isRefresh && cooldownCheck === false) {
    return new Response(
      JSON.stringify({
        error: 'cooldown',
        message:
          'This title was refreshed recently. Try again in a few days.',
      }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: AnalysisStreamEvent | { type: 'stored'; analysisId: string }) {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
      }

      try {
        let finalAnalysis: AnalysisStreamEvent | null = null;

        for await (const event of streamAnalysis({
          title: title.title,
          releaseYear: title.release_year,
          type: title.type as 'movie' | 'tv',
        })) {
          send(event);
          if (event.type === 'complete' || event.type === 'error') {
            finalAnalysis = event;
          }
        }

        if (finalAnalysis?.type === 'complete') {
          try {
            const analysisId = await storeAnalysis({
              titleId,
              analysis: finalAnalysis.analysis,
              triggeredBy: user.id,
            });
            send({ type: 'stored', analysisId });
          } catch (err) {
            console.error('Failed to persist analysis:', err);
            send({
              type: 'error',
              message:
                'The analysis ran but we failed to save it. Try again.',
            });
          }
        }
      } catch (err) {
        console.error('Analysis stream failed:', err);
        send({
          type: 'error',
          message:
            err instanceof Error
              ? `Analysis failed: ${err.message}`
              : 'Analysis failed unexpectedly.',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}

import Anthropic from '@anthropic-ai/sdk';
import { getServerEnv } from '@/lib/env';
import { ANALYSIS_SYSTEM_PROMPT } from './prompts';
import {
  analysisSchema,
  ANALYSIS_TOOL_INPUT_SCHEMA,
  type Analysis,
} from './schemas';

/**
 * The progress events we emit to the client during analysis.
 * These get serialised as newline-delimited JSON over a streaming
 * response so the UI can render meaningful progress.
 */
export type AnalysisStreamEvent =
  | { type: 'started'; title: string }
  | { type: 'searching'; query: string }
  | { type: 'thinking'; message: string }
  | { type: 'analysing'; message: string }
  | { type: 'complete'; analysis: Analysis }
  | { type: 'error'; message: string };

/**
 * Run the analysis pipeline for a title and yield progress events
 * in real time as the model works.
 *
 * How the per-block streaming works:
 *
 * Anthropic's streaming API emits raw events including content_block_start,
 * content_block_delta (for input_json_delta), and content_block_stop. The
 * tool input arrives in fragments via input_json_delta. We accumulate the
 * fragments per block index, then parse on stop — at that point we have
 * the fully-assembled tool input WITHOUT having to wait for the whole
 * stream to finish.
 *
 * This means as Claude completes each web_search, the user sees the query
 * appear in the UI immediately, before the next search even starts.
 *
 * Crucially: we do NOT call stream.finalMessage() inside the iteration —
 * that waits for the stream to end and would deadlock the for-await loop.
 */
export async function* streamAnalysis(input: {
  title: string;
  releaseYear: number | null;
  type: 'movie' | 'tv';
}): AsyncGenerator<AnalysisStreamEvent> {
  const env = getServerEnv();
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  yield { type: 'started', title: input.title };

  const userPrompt = buildUserPrompt(input);

  const stream = client.messages.stream({
    model: 'claude-opus-4-7',
    max_tokens: 8000,
    system: [
      {
        type: 'text',
        text: ANALYSIS_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools: [
      {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 8,
      },
      {
        name: 'submit_analysis',
        description:
          'Submit the final structured analysis. You MUST call this tool exactly once after gathering parent feedback from web searches.',
        input_schema: ANALYSIS_TOOL_INPUT_SCHEMA,
      },
    ],
    messages: [{ role: 'user', content: userPrompt }],
  });

  // Per-block-index state. The stream emits events with `index` pointing
  // at the position in the message's content array. We keep a small map
  // so we can pair start/delta/stop events for the same block.
  type BlockMeta = {
    type: string;
    name?: string;
    inputBuffer: string;
  };
  const blocks: Record<number, BlockMeta> = {};

  let pendingAnalysis: unknown = null;
  let analysingEmitted = false;
  let thinkingEmitted = false;

  for await (const event of stream) {
    if (event.type === 'content_block_start') {
      const cb = event.content_block;
      const meta: BlockMeta = {
        type: cb.type,
        name: 'name' in cb ? cb.name : undefined,
        inputBuffer: '',
      };
      blocks[event.index] = meta;

      // Surface a "thinking" status the first time we see a web search
      // start, before any queries have completed. This fills the gap
      // between stream-start and the first query landing.
      if (
        cb.type === 'server_tool_use' &&
        cb.name === 'web_search' &&
        !thinkingEmitted
      ) {
        thinkingEmitted = true;
        yield { type: 'thinking', message: 'Looking for parent feedback…' };
      }

      // Surface "analysing" when the submit_analysis call begins. This
      // signals we're done searching and now Claude is synthesising.
      if (
        cb.type === 'tool_use' &&
        cb.name === 'submit_analysis' &&
        !analysingEmitted
      ) {
        analysingEmitted = true;
        yield {
          type: 'analysing',
          message: 'Pulling everything together…',
        };
      }
    }

    if (event.type === 'content_block_delta') {
      const meta = blocks[event.index];
      if (!meta) continue;
      // Tool input arrives as input_json_delta; we concatenate the
      // partial JSON fragments and parse on content_block_stop.
      if (event.delta.type === 'input_json_delta') {
        meta.inputBuffer += event.delta.partial_json;
      }
    }

    if (event.type === 'content_block_stop') {
      const meta = blocks[event.index];
      if (!meta) continue;

      // Empty buffer means no JSON input on this block — that's normal
      // for text blocks Claude might emit alongside tool calls.
      if (!meta.inputBuffer) continue;

      let parsedInput: unknown;
      try {
        parsedInput = JSON.parse(meta.inputBuffer);
      } catch {
        // Malformed partial — skip silently. Real failures will surface
        // when we validate the final analysis.
        continue;
      }

      if (meta.type === 'server_tool_use' && meta.name === 'web_search') {
        const query = (parsedInput as { query?: unknown })?.query;
        if (typeof query === 'string' && query.trim()) {
          yield { type: 'searching', query };
        }
      }

      if (meta.type === 'tool_use' && meta.name === 'submit_analysis') {
        pendingAnalysis = parsedInput;
      }
    }
  }

  if (!pendingAnalysis) {
    yield {
      type: 'error',
      message:
        'The analysis ran but did not return structured output. This usually means the model did not have enough information. Try again later.',
    };
    return;
  }

  // Validate the structured output against our Zod schema.
  const parsed = analysisSchema.safeParse(pendingAnalysis);
  if (!parsed.success) {
    yield {
      type: 'error',
      message: `Analysis returned invalid data: ${parsed.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')}`,
    };
    return;
  }

  yield { type: 'complete', analysis: parsed.data };
}

function buildUserPrompt(input: {
  title: string;
  releaseYear: number | null;
  type: 'movie' | 'tv';
}): string {
  const yearPart = input.releaseYear ? ` (${input.releaseYear})` : '';
  const typePart = input.type === 'movie' ? 'film' : 'TV show';

  return `Analyse the ${typePart} "${input.title}"${yearPart}.

Search the web for parent feedback, score it against the rubric, identify recurring themes, and submit your final analysis using the submit_analysis tool.

Aim for at least 6 distinct sources from the priority list. If feedback is unusually thin or contested, say so honestly in the summary and reflect that in your confidence rating.`;
}

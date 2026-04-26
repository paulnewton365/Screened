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
 * Run the analysis pipeline for a title and yield progress events.
 *
 * Implementation notes:
 * - We use the Anthropic web_search tool so Claude can pull live
 *   parent-feedback sources rather than relying on its training.
 * - The submit_analysis tool forces structured JSON output. We don't
 *   need any free-form parsing.
 * - tool_choice forces Claude to eventually call submit_analysis.
 * - The stream yields events for each tool use, plus a final complete
 *   event with the validated analysis object.
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
        max_uses: 10,
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

  let pendingAnalysis: unknown = null;

  // Iterate the streaming events. We surface tool use as progress and
  // capture the submit_analysis input as our final result.
  for await (const event of stream) {
    if (event.type === 'content_block_start') {
      const block = event.content_block;

      if (block.type === 'tool_use') {
        if (block.name === 'web_search') {
          // Web search events come with an empty input at start; the
          // actual query arrives in input_json_delta. We'll surface
          // the query when we see it stop.
          yield {
            type: 'thinking',
            message: 'Looking for parent feedback…',
          };
        } else if (block.name === 'submit_analysis') {
          yield {
            type: 'analysing',
            message: 'Pulling everything together…',
          };
        }
      } else if (block.type === 'server_tool_use') {
        // Anthropic's hosted web_search tool uses server_tool_use blocks.
        if (block.name === 'web_search') {
          yield {
            type: 'thinking',
            message: 'Looking for parent feedback…',
          };
        }
      }
    }

    if (event.type === 'content_block_stop') {
      // Note: do NOT call stream.finalMessage() here. That waits for
      // the entire stream to complete, but we're inside the iteration
      // that's producing it — classic deadlock. We pull the final
      // message AFTER the for-await loop ends.
    }
  }

  // After the stream completes, retrieve the final assembled message.
  const final = await stream.finalMessage();

  // Surface web_search queries from the assembled message if not already shown.
  for (const block of final.content) {
    if (
      block.type === 'server_tool_use' &&
      block.name === 'web_search' &&
      typeof block.input === 'object' &&
      block.input !== null &&
      'query' in block.input &&
      typeof (block.input as { query: unknown }).query === 'string'
    ) {
      yield {
        type: 'searching',
        query: (block.input as { query: string }).query,
      };
    }
    if (block.type === 'tool_use' && block.name === 'submit_analysis') {
      pendingAnalysis = block.input;
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

  // Validate the structured output against our Zod schema. If Claude
  // returned something malformed (rare with forced tool use, but
  // possible) we surface a clear error rather than silently storing
  // garbage.
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

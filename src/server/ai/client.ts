import 'server-only';
import OpenAI from 'openai';
import { and, eq, sql } from 'drizzle-orm';
import type { ZodType } from 'zod';
import { db } from '@/db';
import { aiUsage } from '@/db/schema';
import { dayKey } from '@/lib/streak';
import { AppError } from '../errors';

// One OpenAI-compatible client for every AI feature. Point OPENAI_BASE_URL
// at a LiteLLM proxy to route to any provider; AI_MODEL picks the model
// (a LiteLLM alias works too). Without OPENAI_API_KEY every AI feature
// reports "not configured" instead of failing.

export const aiEnabled = () => Boolean(process.env.OPENAI_API_KEY);
export const aiModel = () => process.env.AI_MODEL || 'gpt-4.1-mini';
const dailyLimit = () => Number(process.env.AI_DAILY_LIMIT || 60);

let client: OpenAI | null = null;
function ai(): OpenAI {
  if (!aiEnabled()) throw new AppError('AI features are not switched on yet. An admin needs to add an OpenAI or LiteLLM key.', 503, 'AI_DISABLED');
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL || undefined, timeout: 60_000, maxRetries: 2 });
  return client;
}

/** Counts one AI request against the user's daily allowance (staff are unlimited). */
export async function useQuota(userId: string, role: string, cost = 1) {
  if (role === 'admin' || role === 'author') return;
  const day = dayKey(new Date());
  const [row] = await db.insert(aiUsage).values({ userId, day, requests: cost })
    .onConflictDoUpdate({ target: [aiUsage.userId, aiUsage.day], set: { requests: sql`${aiUsage.requests} + ${cost}` } })
    .returning({ requests: aiUsage.requests });
  if (row.requests > dailyLimit()) {
    await db.update(aiUsage).set({ requests: sql`${aiUsage.requests} - ${cost}` }).where(and(eq(aiUsage.userId, userId), eq(aiUsage.day, day)));
    throw new AppError(`You've used today's ${dailyLimit()} AI requests. They reset at midnight UTC.`, 429, 'AI_QUOTA');
  }
}

type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam;

function toAppError(err: unknown): never {
  if (err instanceof AppError) throw err;
  const status = (err as { status?: number })?.status;
  console.error('[ai]', err);
  if (status === 401 || status === 403) throw new AppError('The AI key was rejected. An admin needs to check the configuration.', 502, 'AI_AUTH');
  if (status === 429) throw new AppError('The AI service is busy. Please try again in a moment.', 503, 'AI_BUSY');
  throw new AppError('The AI service did not respond. Please try again.', 502, 'AI_ERROR');
}

/**
 * Asks for JSON matching `schema` (Structured Outputs). Backends that reject
 * json_schema fall back to plain JSON mode with the schema in the prompt; the
 * result is always checked with zod before it's trusted.
 */
export async function jsonCompletion<T>({ messages, name, schema, parse, maxTokens = 4000 }: {
  messages: Message[];
  name: string;
  schema: Record<string, unknown>;
  parse: ZodType<T>;
  maxTokens?: number;
}): Promise<T> {
  const client = ai();
  const read = (text: string | null | undefined) => {
    const raw = (text ?? '').trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
    const result = parse.safeParse(JSON.parse(raw));
    if (!result.success) throw new AppError('The AI returned something unexpected. Please try again.', 502, 'AI_SHAPE');
    return result.data;
  };
  try {
    const res = await client.chat.completions.create({
      model: aiModel(),
      messages,
      max_completion_tokens: maxTokens,
      response_format: { type: 'json_schema', json_schema: { name, schema, strict: true } },
    });
    return read(res.choices[0]?.message?.content);
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status !== 400 && status !== 422) toAppError(err);
    try {
      const res = await client.chat.completions.create({
        model: aiModel(),
        messages: [...messages, { role: 'system', content: `Reply with only a JSON object matching this JSON Schema:\n${JSON.stringify(schema)}` }],
        max_completion_tokens: maxTokens,
        response_format: { type: 'json_object' },
      });
      return read(res.choices[0]?.message?.content);
    } catch (fallbackErr) {
      if (fallbackErr instanceof SyntaxError) throw new AppError('The AI returned malformed JSON. Please try again.', 502, 'AI_SHAPE');
      toAppError(fallbackErr);
    }
  }
}

/** Streams plain text; the returned stream yields UTF-8 chunks for a Response body. */
export async function streamCompletion({ messages, maxTokens = 1200, onDone }: {
  messages: Message[];
  maxTokens?: number;
  onDone?: (fullText: string) => Promise<void> | void;
}): Promise<ReadableStream<Uint8Array>> {
  const client = ai();
  let stream: Awaited<ReturnType<typeof client.chat.completions.create>> & AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
  try {
    stream = (await client.chat.completions.create({ model: aiModel(), messages, max_completion_tokens: maxTokens, stream: true })) as typeof stream;
  } catch (err) {
    toAppError(err);
  }
  const encoder = new TextEncoder();
  let full = '';
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? '';
          if (text) { full += text; controller.enqueue(encoder.encode(text)); }
        }
        await onDone?.(full);
      } catch (err) {
        console.error('[ai stream]', err);
        controller.enqueue(encoder.encode('\n\n_(The response was cut off. Please try again.)_'));
      } finally {
        controller.close();
      }
    },
  });
}

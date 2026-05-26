import { getSupabaseServer } from './client';

export type SearchEventInput = {
  jewellerId: string;
  queryText?: string;
  queryType: 'text' | 'image' | 'hybrid' | 'occasion';
  resultCount: number;
  latencyMs?: number;
  sessionId?: string;
};

/**
 * Fire-and-forget logger. Errors are swallowed because analytics must never
 * impact the user-visible search path.
 */
export async function logSearchEvent(input: SearchEventInput): Promise<void> {
  try {
    const sb = getSupabaseServer();
    await sb.from('search_events').insert({
      jeweller_id: input.jewellerId,
      query_text: input.queryText ?? null,
      query_type: input.queryType,
      result_count: input.resultCount,
      latency_ms: input.latencyMs ?? null,
      session_id: input.sessionId ?? null,
    });
  } catch (err) {
    console.error('[search_events] log failed', err);
  }
}

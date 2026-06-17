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

// ────────────────────────────────────────────────────────────────────────────
// Analytics events — catch-all stream written by the client trackEvent() lib.
// The allowed event_type list is enforced at the API layer (Zod), so this
// helper just persists whatever it's given. jeweller_id always comes from the
// tenant context, never the client.
// ────────────────────────────────────────────────────────────────────────────

export type AnalyticsEventInput = {
  jewellerId: string;
  eventType: string;
  productId?: string | null;
  sessionId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function logAnalyticsEvent(input: AnalyticsEventInput): Promise<void> {
  try {
    const sb = getSupabaseServer();
    await sb.from('analytics_events').insert({
      jeweller_id: input.jewellerId,
      event_type: input.eventType,
      product_id: input.productId ?? null,
      session_id: input.sessionId ?? null,
      metadata: input.metadata ?? null,
    });
  } catch (err) {
    console.error('[analytics_events] log failed', err);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Product views — feeds metrics (top-viewed) and intelligence (interest vs
// conversion). Written when a customer opens a product detail page.
// ────────────────────────────────────────────────────────────────────────────

export type ProductViewInput = {
  jewellerId: string;
  productId: string;
  sessionId?: string | null;
};

export async function logProductView(input: ProductViewInput): Promise<void> {
  try {
    const sb = getSupabaseServer();
    await sb.from('product_views').insert({
      jeweller_id: input.jewellerId,
      product_id: input.productId,
      session_id: input.sessionId ?? null,
    });
  } catch (err) {
    console.error('[product_views] log failed', err);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Try-on events — feeds analytics (top try-on products) and intelligence
// (tried-but-not-sold). Written when the AR engine starts tracking a product.
// ────────────────────────────────────────────────────────────────────────────

export type TryonEventInput = {
  jewellerId: string;
  productId?: string | null;
  jewelleryType?: string | null;
  confidence?: number | null;
  deviceType?: string | null;
  sessionId?: string | null;
};

export async function logTryonEvent(input: TryonEventInput): Promise<void> {
  try {
    const sb = getSupabaseServer();
    await sb.from('tryon_events').insert({
      jeweller_id: input.jewellerId,
      product_id: input.productId ?? null,
      jewellery_type: input.jewelleryType ?? null,
      confidence: input.confidence ?? null,
      device_type: input.deviceType ?? null,
      session_id: input.sessionId ?? null,
    });
  } catch (err) {
    console.error('[tryon_events] log failed', err);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// PIN audit — every unlock attempt (success + failure) with the originating
// IP. Feeds the future auth-readiness work (lockout forensics, brute-force
// detection). Fire-and-forget so it never blocks the unlock path.
// ────────────────────────────────────────────────────────────────────────────

export type PinAuditInput = {
  jewellerId: string;
  attemptIp?: string | null;
  success: boolean;
};

export async function logPinAudit(input: PinAuditInput): Promise<void> {
  try {
    const sb = getSupabaseServer();
    await sb.from('pin_audit_events').insert({
      jeweller_id: input.jewellerId,
      attempt_ip: input.attemptIp ?? null,
      success: input.success,
    });
  } catch (err) {
    console.error('[pin_audit_events] log failed', err);
  }
}

/**
 * Durable PIN rate limit: count consecutive failed unlock attempts for a
 * (jeweller, IP) bucket inside `windowMs`. Reads from pin_audit_events (already
 * written on every attempt) so the limit survives deploys/restarts and is
 * shared across instances — unlike the in-memory Map in @luxematch/tenant.
 *
 * "Consecutive" matters: we only count failures since the most recent SUCCESS
 * in the window, so a successful unlock clears the bucket without a separate
 * delete. Returns 0 on any error (fail-open) — never block a legitimate unlock
 * because the audit table is unreachable.
 */
export async function countRecentPinFailures(
  jewellerId: string,
  attemptIp: string,
  windowMs: number,
  now = Date.now(),
): Promise<number> {
  try {
    const sb = getSupabaseServer();
    const since = new Date(now - windowMs).toISOString();
    const { data } = await sb
      .from('pin_audit_events')
      .select('success, created_at')
      .eq('jeweller_id', jewellerId)
      .eq('attempt_ip', attemptIp)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(50);

    let failures = 0;
    for (const row of (data ?? []) as Array<{ success: boolean }>) {
      if (row.success) break; // stop at the most recent successful unlock
      failures += 1;
    }
    return failures;
  } catch (err) {
    console.error('[pin_audit_events] count failed', err);
    return 0;
  }
}

import { getServerEnv } from '@luxematch/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | undefined;

/**
 * Server-side Supabase client using the service role key. Bypasses RLS.
 * Never expose this to the browser. Phase 12 will add anon-key clients
 * for any future client-direct reads.
 */
export function getSupabaseServer(): SupabaseClient {
  if (_client) return _client;
  const env = getServerEnv();
  _client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'public' },
  });
  return _client;
}

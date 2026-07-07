import crypto from 'node:crypto';

import { getSupabaseServer } from './client';

export type PasswordResetRole = 'store_owner' | 'store_manager';

export type PasswordResetTokenRow = {
  id: string;
  email: string;
  role: PasswordResetRole;
  store_id: string | null;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createPasswordResetToken(
  email: string,
  role: PasswordResetRole,
  storeId: string,
): Promise<string> {
  const sb = getSupabaseServer();
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  // Invalidate any existing unused tokens for this email+role
  await sb
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('email', email)
    .eq('role', role)
    .is('used_at', null);

  const { error } = await sb.from('password_reset_tokens').insert({
    email,
    role,
    store_id: storeId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });
  if (error) throw error;

  return token;
}

export async function verifyPasswordResetToken(
  token: string,
  role: PasswordResetRole,
): Promise<PasswordResetTokenRow | null> {
  const sb = getSupabaseServer();
  const tokenHash = hashToken(token);

  const { data } = await sb
    .from('password_reset_tokens')
    .select('*')
    .eq('token_hash', tokenHash)
    .eq('role', role)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();

  return data ?? null;
}

export async function consumePasswordResetToken(tokenId: string): Promise<void> {
  const sb = getSupabaseServer();
  await sb
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', tokenId);
}

import { getSupabaseServer } from './client';

export type JewellerRow = {
  id: string;
  slug: string;
  store_name: string;
  city: string | null;
  gstin: string | null;
  owner_name: string | null;
  phone: string | null;
  logo_url: string | null;
  pin_hash: string;
  pin_salt: string;
  idle_reset_enabled: boolean;
  idle_reset_seconds: number;
  created_at: string;
  updated_at: string;
};

export type JewellerPublic = Pick<
  JewellerRow,
  'id' | 'slug' | 'store_name' | 'city' | 'logo_url' | 'idle_reset_enabled' | 'idle_reset_seconds'
>;

export type JewellerSettings = Omit<JewellerRow, 'pin_hash' | 'pin_salt'>;

const PUBLIC_COLUMNS =
  'id, slug, store_name, city, logo_url, idle_reset_enabled, idle_reset_seconds';

const FULL_COLUMNS =
  'id, slug, store_name, city, gstin, owner_name, phone, logo_url, pin_hash, pin_salt, idle_reset_enabled, idle_reset_seconds, created_at, updated_at';

const SETTINGS_COLUMNS =
  'id, slug, store_name, city, gstin, owner_name, phone, logo_url, idle_reset_enabled, idle_reset_seconds, created_at, updated_at';

/**
 * Fetch the customer-safe view of a jeweller. Used by GET /api/shop.
 */
export async function getJewellerPublic(id: string): Promise<JewellerPublic | null> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('jewellers')
    .select(PUBLIC_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as JewellerPublic | null) ?? null;
}

/**
 * Fetch the full row including pin_hash. Server-side only. Used by the PIN
 * verify path on /api/shop/unlock.
 */
export async function getJewellerInternal(id: string): Promise<JewellerRow | null> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('jewellers')
    .select(FULL_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as JewellerRow | null) ?? null;
}

export async function getJewellerSettings(id: string): Promise<JewellerSettings | null> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('jewellers')
    .select(SETTINGS_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as JewellerSettings | null) ?? null;
}

/**
 * Update fields on a jeweller. Always scoped by id; never returns or accepts
 * pin_hash here — PIN rotation goes through updateJewellerPinHash.
 */
export async function updateJewellerInfo(
  id: string,
  patch: Partial<
    Pick<
      JewellerRow,
      | 'store_name'
      | 'city'
      | 'gstin'
      | 'owner_name'
      | 'phone'
      | 'logo_url'
      | 'idle_reset_enabled'
      | 'idle_reset_seconds'
    >
  >,
): Promise<JewellerSettings | null> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('jewellers')
    .update(patch)
    .eq('id', id)
    .select(SETTINGS_COLUMNS)
    .maybeSingle();
  if (error) throw error;
  return (data as JewellerSettings | null) ?? null;
}

export async function updateJewellerPinHash(id: string, pinHash: string): Promise<void> {
  const sb = getSupabaseServer();
  const { error } = await sb.from('jewellers').update({ pin_hash: pinHash }).eq('id', id);
  if (error) throw error;
}

import { compare } from 'bcryptjs';
import { hash } from 'bcryptjs';
import { getSupabaseServer } from './client';

export type StoreRow = {
  id: string;
  jeweller_id: string | null;
  manufacturer_id: string | null;
  name: string;
  email: string;
  password_hash: string;
  city: string | null;
  phone: string | null;
  logo_url: string | null;
  tagline: string | null;
  website_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type StorePublic = Omit<StoreRow, 'password_hash'>;

export async function getStoreByEmail(email: string): Promise<StoreRow | null> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('stores')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw new Error(`getStoreByEmail: ${error.message}`);
  return data as StoreRow | null;
}

export async function getStoreById(id: string): Promise<StorePublic | null> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('stores')
    .select('id, jeweller_id, manufacturer_id, name, email, city, phone, logo_url, tagline, website_url, is_active, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`getStoreById: ${error.message}`);
  return data as StorePublic | null;
}

export async function getStoreByJewellerId(jewellerId: string): Promise<StorePublic | null> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('stores')
    .select('id, jeweller_id, manufacturer_id, name, email, city, phone, logo_url, tagline, website_url, is_active, created_at, updated_at')
    .eq('jeweller_id', jewellerId)
    .maybeSingle();
  if (error) throw new Error(`getStoreByJewellerId: ${error.message}`);
  return data as StorePublic | null;
}

export async function verifyStorePassword(
  email: string,
  password: string,
): Promise<StoreRow | null> {
  const row = await getStoreByEmail(email);
  if (!row) return null;
  const ok = await compare(password, row.password_hash);
  return ok ? row : null;
}

export async function listStoresByManufacturer(
  manufacturerId: string,
): Promise<StorePublic[]> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('stores')
    .select('id, jeweller_id, manufacturer_id, name, email, city, phone, logo_url, tagline, website_url, is_active, created_at, updated_at')
    .eq('manufacturer_id', manufacturerId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`listStoresByManufacturer: ${error.message}`);
  return (data ?? []) as StorePublic[];
}

export type CreateStoreInput = {
  manufacturerId: string;
  jewellerId: string;
  name: string;
  email: string;
  password: string;
  city?: string;
  phone?: string;
};

export async function createStore(input: CreateStoreInput): Promise<StorePublic> {
  const sb = getSupabaseServer();
  const passwordHash = await hash(input.password, 10);
  const { data, error } = await sb
    .from('stores')
    .insert({
      manufacturer_id: input.manufacturerId,
      jeweller_id: input.jewellerId,
      name: input.name,
      email: input.email.toLowerCase().trim(),
      password_hash: passwordHash,
      city: input.city ?? null,
      phone: input.phone ?? null,
      is_active: true,
    })
    .select('id, jeweller_id, manufacturer_id, name, email, city, phone, logo_url, tagline, website_url, is_active, created_at, updated_at')
    .single();
  if (error) throw new Error(`createStore: ${error.message}`);
  return data as StorePublic;
}

export async function updateStoreStatus(
  manufacturerId: string,
  storeId: string,
  isActive: boolean,
): Promise<StorePublic> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('stores')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', storeId)
    .eq('manufacturer_id', manufacturerId)
    .select('id, jeweller_id, manufacturer_id, name, email, city, phone, logo_url, tagline, website_url, is_active, created_at, updated_at')
    .single();
  if (error) throw new Error(`updateStoreStatus: ${error.message}`);
  return data as StorePublic;
}

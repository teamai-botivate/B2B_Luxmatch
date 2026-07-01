import { compare } from 'bcryptjs';
import { getSupabaseServer } from './client';

export type ManufacturerRow = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ManufacturerPublic = Omit<ManufacturerRow, 'password_hash'>;

export async function getManufacturerByEmail(email: string): Promise<ManufacturerRow | null> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('manufacturers')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw new Error(`getManufacturerByEmail: ${error.message}`);
  return data as ManufacturerRow | null;
}

export async function getManufacturerById(id: string): Promise<ManufacturerPublic | null> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('manufacturers')
    .select('id, name, email, is_active, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`getManufacturerById: ${error.message}`);
  return data as ManufacturerPublic | null;
}

export async function verifyManufacturerPassword(
  email: string,
  password: string,
): Promise<ManufacturerRow | null> {
  const row = await getManufacturerByEmail(email);
  if (!row) return null;
  const ok = await compare(password, row.password_hash);
  return ok ? row : null;
}

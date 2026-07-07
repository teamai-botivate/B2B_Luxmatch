import { getSupabaseServer } from './client';

export type StoreManagerRow = {
  id: string;
  store_id: string;
  naam: string;
  email: string;
  password_hash: string;
  phone: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type StoreManagerPublic = Omit<StoreManagerRow, 'password_hash'>;

export type CreateStoreManagerInput = {
  store_id: string;
  naam: string;
  email: string;
  password_hash: string;
  phone?: string;
  created_by?: string;
};

export type UpdateStoreManagerInput = {
  naam?: string;
  phone?: string;
  is_active?: boolean;
};

export async function getStoreManagerByEmail(
  storeId: string,
  email: string,
): Promise<StoreManagerRow | null> {
  const sb = getSupabaseServer();
  const { data } = await sb
    .from('store_managers')
    .select('*')
    .eq('store_id', storeId)
    .eq('email', email)
    .eq('is_active', true)
    .single();
  return data ?? null;
}

export async function getStoreManagerByEmailGlobal(
  email: string,
): Promise<StoreManagerRow | null> {
  const sb = getSupabaseServer();
  const { data } = await sb
    .from('store_managers')
    .select('*')
    .eq('email', email)
    .eq('is_active', true)
    .single();
  return data ?? null;
}

export async function getStoreManagerById(id: string): Promise<StoreManagerRow | null> {
  const sb = getSupabaseServer();
  const { data } = await sb.from('store_managers').select('*').eq('id', id).single();
  return data ?? null;
}

export async function listStoreManagers(storeId: string): Promise<StoreManagerPublic[]> {
  const sb = getSupabaseServer();
  const { data } = await sb
    .from('store_managers')
    .select('id, store_id, naam, email, phone, is_active, created_by, created_at, updated_at')
    .eq('store_id', storeId)
    .order('created_at', { ascending: true });
  return (data ?? []) as StoreManagerPublic[];
}

export async function createStoreManager(
  input: CreateStoreManagerInput,
): Promise<StoreManagerPublic> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('store_managers')
    .insert({
      store_id: input.store_id,
      naam: input.naam,
      email: input.email,
      password_hash: input.password_hash,
      phone: input.phone ?? null,
      created_by: input.created_by ?? null,
    })
    .select('id, store_id, naam, email, phone, is_active, created_by, created_at, updated_at')
    .single();
  if (error) throw error;
  return data as StoreManagerPublic;
}

export async function updateStoreManager(
  storeId: string,
  managerId: string,
  input: UpdateStoreManagerInput,
): Promise<StoreManagerPublic> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('store_managers')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', managerId)
    .eq('store_id', storeId)
    .select('id, store_id, naam, email, phone, is_active, created_by, created_at, updated_at')
    .single();
  if (error) throw error;
  return data as StoreManagerPublic;
}

export async function deleteStoreManager(storeId: string, managerId: string): Promise<void> {
  const sb = getSupabaseServer();
  const { error } = await sb
    .from('store_managers')
    .delete()
    .eq('id', managerId)
    .eq('store_id', storeId);
  if (error) throw error;
}

export async function updateStoreManagerPassword(
  managerId: string,
  newPasswordHash: string,
): Promise<void> {
  const sb = getSupabaseServer();
  const { error } = await sb
    .from('store_managers')
    .update({ password_hash: newPasswordHash, updated_at: new Date().toISOString() })
    .eq('id', managerId);
  if (error) throw error;
}

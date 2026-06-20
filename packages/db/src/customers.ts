import { getSupabaseServer } from './client';

export type CustomerRow = {
  id: string;
  jeweller_id: string;
  phone: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  avatar_public_id: string | null;
  created_at: string;
};

export type CustomerAddressRow = {
  id: string;
  customer_id: string;
  label: string;
  name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pin_code: string;
  is_default: boolean;
  created_at: string;
};

export async function getOrCreateCustomer(
  jewellerId: string,
  phone: string,
  email?: string,
): Promise<CustomerRow> {
  const sb = getSupabaseServer();
  const { data: existing } = await sb
    .from('customers')
    .select('*')
    .eq('jeweller_id', jewellerId)
    .eq('phone', phone)
    .maybeSingle();
  if (existing) {
    const row = existing as CustomerRow;
    if (email && row.email !== email) {
      await sb
        .from('customers')
        .update({ email })
        .eq('jeweller_id', jewellerId)
        .eq('id', row.id);
      return { ...row, email };
    }
    return row;
  }

  const { data: created, error } = await sb
    .from('customers')
    .insert({ jeweller_id: jewellerId, phone, email: email ?? null })
    .select()
    .single();
  if (error) throw new Error(`Failed to create customer: ${error.message}`);
  return created as CustomerRow;
}

export async function getCustomerById(jewellerId: string, customerId: string): Promise<CustomerRow | null> {
  const sb = getSupabaseServer();
  const { data } = await sb
    .from('customers')
    .select('*')
    .eq('jeweller_id', jewellerId)
    .eq('id', customerId)
    .maybeSingle();
  return data as CustomerRow | null;
}

/**
 * Look up a customer by email within a jeweller. Used by password sign-in, where
 * we authenticate against Supabase Auth (global) and then resolve the shop-scoped
 * customer row. `phone` is the unique key, so emails could in theory collide;
 * we take the earliest-created row to stay deterministic.
 */
export async function getCustomerByEmail(jewellerId: string, email: string): Promise<CustomerRow | null> {
  const sb = getSupabaseServer();
  const { data } = await sb
    .from('customers')
    .select('*')
    .eq('jeweller_id', jewellerId)
    .eq('email', email)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data as CustomerRow | null;
}

export async function updateCustomerName(
  jewellerId: string,
  customerId: string,
  name: string,
  email?: string,
): Promise<void> {
  const sb = getSupabaseServer();
  const patch: Record<string, string> = { name };
  if (email) patch.email = email;
  await sb.from('customers').update(patch).eq('jeweller_id', jewellerId).eq('id', customerId);
}

/**
 * Persists a customer's profile picture. The image file itself lives in
 * Cloudinary (luxematch/<jewellerId>/avatars/); here we only store the secure
 * URL + public_id so the UI can render it and the next replacement can delete
 * the previous asset. Pass nulls to clear the avatar.
 *
 * Returns the previous public_id (if any) so the caller can destroy the old
 * Cloudinary asset after a successful swap.
 */
export async function updateCustomerAvatar(
  jewellerId: string,
  customerId: string,
  avatar: { url: string | null; publicId: string | null },
): Promise<{ previousPublicId: string | null }> {
  const sb = getSupabaseServer();
  const { data: existing } = await sb
    .from('customers')
    .select('avatar_public_id')
    .eq('jeweller_id', jewellerId)
    .eq('id', customerId)
    .maybeSingle();

  const { error } = await sb
    .from('customers')
    .update({ avatar_url: avatar.url, avatar_public_id: avatar.publicId })
    .eq('jeweller_id', jewellerId)
    .eq('id', customerId);
  if (error) throw new Error(`Failed to update avatar: ${error.message}`);

  return { previousPublicId: (existing as { avatar_public_id: string | null } | null)?.avatar_public_id ?? null };
}

/**
 * Tenancy guard for the address helpers: customer_addresses has no jeweller_id
 * column of its own (it FKs to customers), so we verify the customer row belongs
 * to this jeweller before touching addresses keyed by customer_id. Throws if the
 * customer does not belong to the shop — never depend on upstream cookie scoping
 * alone.
 */
async function assertCustomerBelongsToJeweller(
  jewellerId: string,
  customerId: string,
): Promise<void> {
  const sb = getSupabaseServer();
  const { data } = await sb
    .from('customers')
    .select('id')
    .eq('jeweller_id', jewellerId)
    .eq('id', customerId)
    .maybeSingle();
  if (!data) throw new Error('Customer does not belong to this jeweller');
}

export async function getCustomerAddresses(
  jewellerId: string,
  customerId: string,
): Promise<CustomerAddressRow[]> {
  await assertCustomerBelongsToJeweller(jewellerId, customerId);
  const sb = getSupabaseServer();
  const { data } = await sb
    .from('customer_addresses')
    .select('*')
    .eq('customer_id', customerId)
    .order('is_default', { ascending: false });
  return (data as CustomerAddressRow[] | null) ?? [];
}

export async function upsertCustomerAddress(
  jewellerId: string,
  customerId: string,
  address: Omit<CustomerAddressRow, 'id' | 'customer_id' | 'created_at'>,
): Promise<CustomerAddressRow> {
  await assertCustomerBelongsToJeweller(jewellerId, customerId);
  const sb = getSupabaseServer();
  if (address.is_default) {
    await sb.from('customer_addresses').update({ is_default: false }).eq('customer_id', customerId);
  }
  const { data, error } = await sb
    .from('customer_addresses')
    .insert({ customer_id: customerId, ...address })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as CustomerAddressRow;
}

// OTP helpers
export async function createOtp(jewellerId: string, phone: string, otp: string): Promise<void> {
  const sb = getSupabaseServer();
  // Expire old OTPs
  await sb.from('customer_otps')
    .update({ verified: true })
    .eq('jeweller_id', jewellerId)
    .eq('phone', phone)
    .eq('verified', false);
  await sb.from('customer_otps').insert({
    jeweller_id: jewellerId,
    phone,
    otp,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min
  });
}

export async function verifyOtp(jewellerId: string, phone: string, otp: string): Promise<boolean> {
  const sb = getSupabaseServer();
  const { data } = await sb
    .from('customer_otps')
    .select('id, otp, expires_at, verified')
    .eq('jeweller_id', jewellerId)
    .eq('phone', phone)
    .eq('verified', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return false;
  const row = data as { id: string; otp: string; expires_at: string; verified: boolean };
  if (row.otp !== otp) return false;
  if (new Date(row.expires_at) < new Date()) return false;

  await sb.from('customer_otps').update({ verified: true }).eq('id', row.id);
  return true;
}

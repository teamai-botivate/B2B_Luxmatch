import { getSupabaseServer } from './client';

export type CustomDesignStatus = 'pending' | 'approved' | 'rejected' | 'forwarded';
export type CustomDesignOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'in_production'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type CustomDesignRequestRow = {
  id: string;
  store_id: string;
  jeweller_id: string;
  customer_naam: string;
  customer_phone: string;
  customer_notes: string | null;
  reference_image_url: string | null;
  reference_image_public_id: string | null;
  category: string;
  weight_grams: number | null;
  purity: string | null;
  design_notes: string | null;
  status: CustomDesignStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomDesignOrderRow = {
  id: string;
  custom_design_request_id: string;
  manufacturer_id: string;
  store_id: string;
  store_naam_snapshot: string;
  store_address_snapshot: string;
  category: string;
  weight_grams: number | null;
  purity: string | null;
  reference_image_url: string | null;
  design_notes: string | null;
  status: CustomDesignOrderStatus;
  order_number: string;
  tracking_number: string | null;
  created_at: string;
  updated_at: string;
};

export type PlaceCustomDesignRequestInput = {
  store_id: string;
  jeweller_id: string;
  customer_naam: string;
  customer_phone: string;
  customer_notes?: string;
  reference_image_url?: string;
  reference_image_public_id?: string;
  category: string;
  weight_grams?: number;
  purity?: string;
  design_notes?: string;
};

export async function placeCustomDesignRequest(
  input: PlaceCustomDesignRequestInput,
): Promise<CustomDesignRequestRow> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('custom_design_requests')
    .insert({
      store_id: input.store_id,
      jeweller_id: input.jeweller_id,
      customer_naam: input.customer_naam,
      customer_phone: input.customer_phone,
      customer_notes: input.customer_notes ?? null,
      reference_image_url: input.reference_image_url ?? null,
      reference_image_public_id: input.reference_image_public_id ?? null,
      category: input.category,
      weight_grams: input.weight_grams ?? null,
      purity: input.purity ?? null,
      design_notes: input.design_notes ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as CustomDesignRequestRow;
}

export type CustomDesignRequestWithOrder = CustomDesignRequestRow & {
  custom_design_orders?: { id: string; status: CustomDesignOrderStatus; order_number: string; tracking_number: string | null }[];
};

export async function listCustomDesignRequests(
  storeId: string,
  filters?: { status?: CustomDesignStatus },
): Promise<CustomDesignRequestWithOrder[]> {
  const sb = getSupabaseServer();
  let q = sb
    .from('custom_design_requests')
    .select('*, custom_design_orders(id, status, order_number, tracking_number)')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });
  if (filters?.status) q = q.eq('status', filters.status);
  const { data } = await q;
  return (data ?? []) as CustomDesignRequestWithOrder[];
}

export async function getCustomDesignRequest(
  storeId: string,
  requestId: string,
): Promise<CustomDesignRequestRow | null> {
  const sb = getSupabaseServer();
  const { data } = await sb
    .from('custom_design_requests')
    .select('*')
    .eq('id', requestId)
    .eq('store_id', storeId)
    .single();
  return data ?? null;
}

export async function approveCustomDesignRequest(
  storeId: string,
  requestId: string,
  reviewedBy: string | null,
): Promise<CustomDesignRequestRow> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('custom_design_requests')
    .update({
      status: 'approved',
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('store_id', storeId)
    .select('*')
    .single();
  if (error) throw error;
  return data as CustomDesignRequestRow;
}

export async function rejectCustomDesignRequest(
  storeId: string,
  requestId: string,
  reviewedBy: string | null,
  reason?: string,
): Promise<CustomDesignRequestRow> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('custom_design_requests')
    .update({
      status: 'rejected',
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('store_id', storeId)
    .select('*')
    .single();
  if (error) throw error;
  return data as CustomDesignRequestRow;
}

function generateCustomDesignOrderNumber(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  // High-entropy suffix so concurrent forwards can't collide on order_number UNIQUE.
  const suffix = (Date.now() % 10000).toString().padStart(4, '0')
    + Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CD-${y}${m}${d}-${suffix}`;
}

export async function forwardCustomDesignToManufacturer(
  storeId: string,
  requestId: string,
  manufacturerId: string,
  storeNaam: string,
  storeAddress: string,
  reviewedBy: string | null,
): Promise<CustomDesignOrderRow> {
  const sb = getSupabaseServer();

  const request = await getCustomDesignRequest(storeId, requestId);
  if (!request) throw new Error('Custom design request not found');

  const { data: order, error: orderError } = await sb
    .from('custom_design_orders')
    .insert({
      custom_design_request_id: requestId,
      manufacturer_id: manufacturerId,
      store_id: storeId,
      store_naam_snapshot: storeNaam,
      store_address_snapshot: storeAddress,
      category: request.category,
      weight_grams: request.weight_grams,
      purity: request.purity,
      reference_image_url: request.reference_image_url,
      design_notes: request.design_notes,
      order_number: generateCustomDesignOrderNumber(),
    })
    .select('*')
    .single();
  if (orderError) throw orderError;

  const { error: updateError } = await sb
    .from('custom_design_requests')
    .update({
      status: 'forwarded',
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId);
  // Must not silently fail — if the status doesn't flip, the manager sees the
  // request as still-pending and re-approves, creating duplicate orders.
  if (updateError) {
    // Roll back the order we just inserted so we don't leave an orphan.
    await sb.from('custom_design_orders').delete().eq('id', order.id);
    throw new Error(`forwardCustomDesignToManufacturer status update failed: ${updateError.message}`);
  }

  return order as CustomDesignOrderRow;
}

export async function listCustomDesignOrdersByManufacturer(
  manufacturerId: string,
  filters?: { status?: CustomDesignOrderStatus },
): Promise<CustomDesignOrderRow[]> {
  const sb = getSupabaseServer();
  let q = sb
    .from('custom_design_orders')
    .select('*')
    .eq('manufacturer_id', manufacturerId)
    .order('created_at', { ascending: false });
  if (filters?.status) q = q.eq('status', filters.status);
  const { data } = await q;
  return (data ?? []) as CustomDesignOrderRow[];
}

export async function listCustomDesignOrdersByStore(
  storeId: string,
): Promise<CustomDesignOrderRow[]> {
  const sb = getSupabaseServer();
  const { data } = await sb
    .from('custom_design_orders')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });
  return (data ?? []) as CustomDesignOrderRow[];
}

export async function updateCustomDesignOrderStatus(
  manufacturerId: string,
  orderId: string,
  status: CustomDesignOrderStatus,
  trackingNumber?: string,
): Promise<CustomDesignOrderRow> {
  const sb = getSupabaseServer();
  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (trackingNumber) update.tracking_number = trackingNumber;

  const { data, error } = await sb
    .from('custom_design_orders')
    .update(update)
    .eq('id', orderId)
    .eq('manufacturer_id', manufacturerId)
    .select('*')
    .single();
  if (error) throw error;
  return data as CustomDesignOrderRow;
}

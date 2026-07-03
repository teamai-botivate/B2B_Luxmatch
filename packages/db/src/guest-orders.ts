import { getSupabaseServer } from './client';

// ── Types ─────────────────────────────────────────────────────────────────────

export type GuestOrderStatus =
  | 'placed'
  | 'confirmed'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type GuestOrderSource = 'kiosk' | 'web' | 'whatsapp';

export type GuestOrderRow = {
  id: string;
  manufacturer_id: string;
  store_id: string;
  jeweller_id: string;
  store_name_snapshot: string;
  store_city_snapshot: string | null;
  store_phone_snapshot: string | null;
  store_email_snapshot: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  delivery_address: string | null;
  pickup_store: boolean;
  notes: string | null;
  order_number: string;
  order_source: GuestOrderSource;
  status: GuestOrderStatus;
  total_items: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
};

export type GuestOrderItemRow = {
  id: string;
  guest_order_id: string;
  product_id: string | null;
  product_name_snapshot: string;
  product_sku_snapshot: string | null;
  product_image_snapshot: string | null;
  category_snapshot: string | null;
  metal_snapshot: string | null;
  quantity: number;
  unit_price_snapshot: number;
  created_at: string;
};

export type GuestOrderStatusHistoryRow = {
  id: string;
  guest_order_id: string;
  status: string;
  note: string | null;
  changed_by: string | null;
  created_at: string;
};

export type GuestOrderWithItems = GuestOrderRow & {
  items: GuestOrderItemRow[];
  history: GuestOrderStatusHistoryRow[];
};

export type PlaceGuestOrderItemInput = {
  productId: string | null;
  productNameSnapshot: string;
  productSkuSnapshot?: string;
  productImageSnapshot?: string;
  categorySnapshot?: string;
  metalSnapshot?: string;
  quantity: number;
  unitPriceSnapshot: number;
};

export type PlaceGuestOrderInput = {
  manufacturerId: string;
  storeId: string;
  jewellerId: string;
  storeNameSnapshot: string;
  storeCitySnapshot?: string;
  storePhoneSnapshot?: string;
  storeEmailSnapshot?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress?: string;
  pickupStore: boolean;
  notes?: string;
  orderSource?: GuestOrderSource;
  items: PlaceGuestOrderItemInput[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateGuestOrderNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `GK-${date}-${rand}`;
}

// ── Write ─────────────────────────────────────────────────────────────────────

export async function placeGuestOrder(
  input: PlaceGuestOrderInput,
): Promise<GuestOrderRow> {
  const sb = getSupabaseServer();

  const totalItems = input.items.reduce((s, i) => s + i.quantity, 0);
  const totalAmount = input.items.reduce(
    (s, i) => s + i.unitPriceSnapshot * i.quantity,
    0,
  );

  const orderNumber = generateGuestOrderNumber();

  const { data: order, error: orderError } = await sb
    .from('guest_orders')
    .insert({
      manufacturer_id: input.manufacturerId,
      store_id: input.storeId,
      jeweller_id: input.jewellerId,
      store_name_snapshot: input.storeNameSnapshot,
      store_city_snapshot: input.storeCitySnapshot ?? null,
      store_phone_snapshot: input.storePhoneSnapshot ?? null,
      store_email_snapshot: input.storeEmailSnapshot ?? null,
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      customer_email: input.customerEmail ?? null,
      delivery_address: input.pickupStore ? null : (input.deliveryAddress ?? null),
      pickup_store: input.pickupStore,
      notes: input.notes ?? null,
      order_number: orderNumber,
      order_source: input.orderSource ?? 'kiosk',
      status: 'placed',
      total_items: totalItems,
      total_amount: totalAmount,
    })
    .select('*')
    .single();

  if (orderError) throw new Error(`placeGuestOrder: ${orderError.message}`);

  const itemRows = input.items.map((i) => ({
    guest_order_id: order.id,
    product_id: i.productId ?? null,
    product_name_snapshot: i.productNameSnapshot,
    product_sku_snapshot: i.productSkuSnapshot ?? null,
    product_image_snapshot: i.productImageSnapshot ?? null,
    category_snapshot: i.categorySnapshot ?? null,
    metal_snapshot: i.metalSnapshot ?? null,
    quantity: i.quantity,
    unit_price_snapshot: i.unitPriceSnapshot,
  }));

  const { error: itemsError } = await sb.from('guest_order_items').insert(itemRows);
  if (itemsError) throw new Error(`placeGuestOrder items: ${itemsError.message}`);

  const { error: histError } = await sb.from('guest_order_status_history').insert({
    guest_order_id: order.id,
    status: 'placed',
    note: 'Guest order placed at kiosk',
    changed_by: 'system',
  });
  if (histError) throw new Error(`placeGuestOrder history: ${histError.message}`);

  return order as GuestOrderRow;
}

export async function updateGuestOrderStatus(
  orderId: string,
  status: GuestOrderStatus,
  note?: string,
  changedBy?: string,
  trackingNumber?: string,
): Promise<void> {
  const sb = getSupabaseServer();

  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (trackingNumber) patch.tracking_number = trackingNumber;

  const { error } = await sb
    .from('guest_orders')
    .update(patch)
    .eq('id', orderId);
  if (error) throw new Error(`updateGuestOrderStatus: ${error.message}`);

  const { error: histError } = await sb.from('guest_order_status_history').insert({
    guest_order_id: orderId,
    status,
    note: note ?? null,
    changed_by: changedBy ?? 'system',
  });
  if (histError) throw new Error(`updateGuestOrderStatus history: ${histError.message}`);
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getGuestOrdersByStore(
  storeId: string,
  status?: GuestOrderStatus,
): Promise<GuestOrderRow[]> {
  const sb = getSupabaseServer();
  let q = sb
    .from('guest_orders')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw new Error(`getGuestOrdersByStore: ${error.message}`);
  return (data ?? []) as GuestOrderRow[];
}

export async function getGuestOrdersByManufacturer(
  manufacturerId: string,
  status?: GuestOrderStatus,
): Promise<GuestOrderRow[]> {
  const sb = getSupabaseServer();
  let q = sb
    .from('guest_orders')
    .select('*')
    .eq('manufacturer_id', manufacturerId)
    .order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw new Error(`getGuestOrdersByManufacturer: ${error.message}`);
  return (data ?? []) as GuestOrderRow[];
}

export async function getGuestOrderWithItems(
  orderId: string,
): Promise<GuestOrderWithItems | null> {
  const sb = getSupabaseServer();

  const { data: order, error: orderError } = await sb
    .from('guest_orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();
  if (orderError) throw new Error(`getGuestOrderWithItems: ${orderError.message}`);
  if (!order) return null;

  const { data: items, error: itemsError } = await sb
    .from('guest_order_items')
    .select('*')
    .eq('guest_order_id', orderId)
    .order('created_at', { ascending: true });
  if (itemsError) throw new Error(`getGuestOrderWithItems items: ${itemsError.message}`);

  const { data: history, error: histError } = await sb
    .from('guest_order_status_history')
    .select('*')
    .eq('guest_order_id', orderId)
    .order('created_at', { ascending: true });
  if (histError) throw new Error(`getGuestOrderWithItems history: ${histError.message}`);

  return {
    ...(order as GuestOrderRow),
    items: (items ?? []) as GuestOrderItemRow[],
    history: (history ?? []) as GuestOrderStatusHistoryRow[],
  };
}

// ── Store branding helpers ─────────────────────────────────────────────────────

export type StoreBranding = {
  logo_url: string | null;
  tagline: string | null;
  website_url: string | null;
};

export type StoreProfile = {
  id: string;
  name: string;
  city: string | null;
  phone: string | null;
  email: string;
  logo_url: string | null;
  tagline: string | null;
  website_url: string | null;
};

export async function getStoreBranding(
  jewellerId: string,
): Promise<StoreProfile | null> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('stores')
    .select('id, name, city, phone, email, logo_url, tagline, website_url')
    .eq('jeweller_id', jewellerId)
    .maybeSingle();
  if (error) throw new Error(`getStoreBranding: ${error.message}`);
  return data as StoreProfile | null;
}

export async function updateStoreBranding(
  storeId: string,
  branding: Partial<StoreBranding>,
): Promise<void> {
  const sb = getSupabaseServer();
  const { error } = await sb
    .from('stores')
    .update({ ...branding, updated_at: new Date().toISOString() })
    .eq('id', storeId);
  if (error) throw new Error(`updateStoreBranding: ${error.message}`);
}

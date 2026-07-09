import { getSupabaseServer } from './client';
import type { CategoryRow } from './taxonomy';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ManufacturerProductStatus = 'draft' | 'active' | 'archived';

export type ManufacturerProductRow = {
  id: string;
  manufacturer_id: string;
  sku: string;
  design_number: string | null;
  name: string;
  category: string | null;
  description: string | null;
  weight_grams: number | null;
  base_price: number | null;
  metal: string | null;
  purity: string | null;
  gemstones: string[];
  occasion_tags: string[];
  style_tags: string[];
  min_order_qty: number;
  status: ManufacturerProductStatus;
  has_tryon: boolean;
  created_at: string;
  updated_at: string;
};

export type ManufacturerProductImageRow = {
  id: string;
  product_id: string;
  cloudinary_public_id: string;
  secure_url: string;
  is_primary: boolean;
  is_tryon: boolean;
  jewellery_type: string | null;
  sort_order: number;
  created_at: string;
};

export type ManufacturerProductWithImages = ManufacturerProductRow & {
  images: ManufacturerProductImageRow[];
};

export type B2BOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type B2BOrderRow = {
  id: string;
  store_id: string;
  jeweller_id: string;
  manufacturer_id: string;
  order_number: string;
  status: B2BOrderStatus;
  delivery_address: string;
  notes: string | null;
  tracking_number: string | null;
  fulfilled_at: string | null;
  fulfilled_product_ids: string[] | null;
  total_items: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
};

export type B2BOrderItemRow = {
  id: string;
  b2b_order_id: string;
  manufacturer_product_id: string;
  quantity: number;
  unit_price_snapshot: number | null;
  product_name_snapshot: string | null;
  created_at: string;
};

export type B2BOrderStatusHistoryRow = {
  id: string;
  b2b_order_id: string;
  status: string;
  note: string | null;
  created_at: string;
};

export type B2BOrderWithItems = B2BOrderRow & {
  items: B2BOrderItemRow[];
  history: B2BOrderStatusHistoryRow[];
};

export type FulfillB2BOrderResult = {
  createdProductIds: string[];
  updatedProductIds: string[];
};

export type PlaceB2BOrderInput = {
  storeId: string;
  jewellerId: string;
  manufacturerId: string;
  deliveryAddress: string;
  notes?: string;
  items: Array<{
    manufacturerProductId: string;
    quantity: number;
    unitPrice?: number | null;
    productName: string;
  }>;
};

// ─── Product catalog ──────────────────────────────────────────────────────────

export type ManufacturerProductFilters = {
  category?: string;
  metal?: string;
  status?: ManufacturerProductStatus | 'all';
  search?: string;
};

export async function listManufacturerProducts(
  filters: ManufacturerProductFilters = {},
): Promise<ManufacturerProductWithImages[]> {
  const sb = getSupabaseServer();
  let q = sb
    .from('manufacturer_products')
    .select(
      `*, manufacturer_product_images (
        id, product_id, cloudinary_public_id, secure_url, is_primary, is_tryon, jewellery_type, sort_order, created_at
      )`,
    )
    .order('created_at', { ascending: false });

  if (filters.status && filters.status !== 'all') {
    q = q.eq('status', filters.status);
  } else if (filters.status !== 'all') {
    q = q.eq('status', 'active');
  }
  if (filters.category) q = q.eq('category', filters.category);
  if (filters.metal) q = q.eq('metal', filters.metal);
  if (filters.search) q = q.ilike('name', `%${filters.search}%`);

  const { data, error } = await q;
  if (error) throw new Error(`listManufacturerProducts: ${error.message}`);

  return (data ?? []).map((row) => ({
    ...(row as ManufacturerProductRow),
    images: ((row as Record<string, unknown>).manufacturer_product_images ?? []) as ManufacturerProductImageRow[],
  }));
}

export async function getManufacturerProductById(
  id: string,
): Promise<ManufacturerProductWithImages | null> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('manufacturer_products')
    .select(
      `*, manufacturer_product_images (
        id, product_id, cloudinary_public_id, secure_url, is_primary, is_tryon, jewellery_type, sort_order, created_at
      )`,
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`getManufacturerProductById: ${error.message}`);
  if (!data) return null;
  return {
    ...(data as ManufacturerProductRow),
    images: ((data as Record<string, unknown>).manufacturer_product_images ?? []) as ManufacturerProductImageRow[],
  };
}

export async function getManufacturerProductByDesignNumberOrId(
  idOrDesignNumber: string,
): Promise<ManufacturerProductWithImages | null> {
  // Try UUID first
  const byId = await getManufacturerProductById(idOrDesignNumber).catch(() => null);
  if (byId) return byId;

  // Fall back to design_number lookup (e.g. "JF-0007")
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('manufacturer_products')
    .select(
      `*, manufacturer_product_images (
        id, product_id, cloudinary_public_id, secure_url, is_primary, is_tryon, jewellery_type, sort_order, created_at
      )`,
    )
    .eq('design_number', idOrDesignNumber)
    .maybeSingle();
  if (error) throw new Error(`getManufacturerProductByDesignNumberOrId: ${error.message}`);
  if (!data) return null;
  return {
    ...(data as ManufacturerProductRow),
    images: ((data as Record<string, unknown>).manufacturer_product_images ?? []) as ManufacturerProductImageRow[],
  };
}

export type CreateManufacturerProductInput = {
  manufacturerId: string;
  name: string;
  category?: string;
  description?: string;
  weightGrams?: number;
  purity?: string;
  gemstones?: string[];
  occasionTags?: string[];
  styleTags?: string[];
  minOrderQty?: number;
  status?: ManufacturerProductStatus;
};

export async function createManufacturerProduct(
  input: CreateManufacturerProductInput,
): Promise<ManufacturerProductRow> {
  const sb = getSupabaseServer();
  // design_number and sku are auto-generated by migration 0008 trigger/sequence
  const { data, error } = await sb
    .from('manufacturer_products')
    .insert({
      manufacturer_id: input.manufacturerId,
      name: input.name,
      category: input.category ?? null,
      description: input.description ?? null,
      weight_grams: input.weightGrams ?? null,
      purity: input.purity ?? null,
      gemstones: input.gemstones ?? [],
      occasion_tags: input.occasionTags ?? [],
      style_tags: input.styleTags ?? [],
      min_order_qty: input.minOrderQty ?? 1,
      status: input.status ?? 'draft',
      // sku kept as fallback for DBs where the column is still NOT NULL
      sku: `SKU-${Date.now()}`,
    })
    .select()
    .single();
  if (error) throw new Error(`createManufacturerProduct: ${error.message}`);
  return data as ManufacturerProductRow;
}

export type UpdateManufacturerProductInput = Partial<Omit<CreateManufacturerProductInput, 'manufacturerId' | 'sku'>>;

export async function updateManufacturerProduct(
  id: string,
  input: UpdateManufacturerProductInput,
): Promise<ManufacturerProductRow> {
  const sb = getSupabaseServer();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.category !== undefined) patch.category = input.category;
  if (input.description !== undefined) patch.description = input.description;
  if (input.weightGrams !== undefined) patch.weight_grams = input.weightGrams;
  if (input.purity !== undefined) patch.purity = input.purity;
  if (input.gemstones !== undefined) patch.gemstones = input.gemstones;
  if (input.occasionTags !== undefined) patch.occasion_tags = input.occasionTags;
  if (input.styleTags !== undefined) patch.style_tags = input.styleTags;
  if (input.minOrderQty !== undefined) patch.min_order_qty = input.minOrderQty;
  if (input.status !== undefined) patch.status = input.status;

  const { data, error } = await sb
    .from('manufacturer_products')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`updateManufacturerProduct: ${error.message}`);
  return data as ManufacturerProductRow;
}

export async function deleteManufacturerProduct(id: string): Promise<void> {
  const sb = getSupabaseServer();
  const { error } = await sb.from('manufacturer_products').delete().eq('id', id);
  if (error) throw new Error(`deleteManufacturerProduct: ${error.message}`);
}

// ─── Product images ───────────────────────────────────────────────────────────

export async function addManufacturerProductImage(input: {
  productId: string;
  cloudinaryPublicId: string;
  secureUrl: string;
  isPrimary?: boolean;
  isTryon?: boolean;
  jewelleryType?: string | null;
  sortOrder?: number;
}): Promise<ManufacturerProductImageRow> {
  const sb = getSupabaseServer();
  if (input.isPrimary) {
    await sb
      .from('manufacturer_product_images')
      .update({ is_primary: false })
      .eq('product_id', input.productId);
  }
  const { data, error } = await sb
    .from('manufacturer_product_images')
    .insert({
      product_id: input.productId,
      cloudinary_public_id: input.cloudinaryPublicId,
      secure_url: input.secureUrl,
      is_primary: input.isPrimary ?? false,
      is_tryon: input.isTryon ?? false,
      jewellery_type: input.jewelleryType ?? null,
      sort_order: input.sortOrder ?? 0,
    })
    .select()
    .single();
  if (error) throw new Error(`addManufacturerProductImage: ${error.message}`);
  return data as ManufacturerProductImageRow;
}

export async function removeManufacturerProductImage(cloudinaryPublicId: string): Promise<void> {
  const sb = getSupabaseServer();
  const { error } = await sb
    .from('manufacturer_product_images')
    .delete()
    .eq('cloudinary_public_id', cloudinaryPublicId);
  if (error) throw new Error(`removeManufacturerProductImage: ${error.message}`);
}

// ─── B2B orders ───────────────────────────────────────────────────────────────

export async function trackManufacturerProductEmbedding(input: {
  productId: string;
  qdrantPointId?: string;
  imageUrl?: string | null;
  embeddingModel?: string;
  dimensions?: number;
}): Promise<void> {
  const sb = getSupabaseServer();
  const { error } = await sb.from('manufacturer_product_embeddings').upsert(
    {
      product_id: input.productId,
      qdrant_point_id: input.qdrantPointId ?? input.productId,
      image_url: input.imageUrl ?? null,
      embedding_model: input.embeddingModel ?? 'open_clip:ViT-B-32:laion2b_s34b_b79k',
      dimensions: input.dimensions ?? 512,
      indexed_at: new Date().toISOString(),
    },
    { onConflict: 'product_id' },
  );
  if (error) throw new Error(`trackManufacturerProductEmbedding: ${error.message}`);
}

export async function isManufacturerProductEmbedded(productId: string): Promise<boolean> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('manufacturer_product_embeddings')
    .select('product_id')
    .eq('product_id', productId)
    .maybeSingle();
  if (error) throw new Error(`isManufacturerProductEmbedded: ${error.message}`);
  return Boolean(data);
}

function generateOrderNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `B2B-${date}-${rand}`;
}

function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'product';
}

async function makeUniqueProductSlug(
  jewellerId: string,
  name: string,
  suffix: string,
): Promise<string> {
  const sb = getSupabaseServer();
  const base = slugify(name);
  let slug = `${base}-${suffix}`.slice(0, 96).replace(/-+$/g, '');
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt + 1}`;
    const { data, error } = await sb
      .from('products')
      .select('id')
      .eq('jeweller_id', jewellerId)
      .eq('slug', candidate)
      .maybeSingle();
    if (error) throw new Error(`makeUniqueProductSlug: ${error.message}`);
    if (!data) return candidate;
  }
  return `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
}

async function getCategoryIdBySlug(slug: string | null): Promise<string | null> {
  if (!slug) return null;
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('categories')
    .select('id, slug, name, sort_order')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(`getCategoryIdBySlug: ${error.message}`);
  return (data as CategoryRow | null)?.id ?? null;
}

export async function placeB2BOrder(input: PlaceB2BOrderInput): Promise<B2BOrderRow> {
  const sb = getSupabaseServer();
  const totalItems = input.items.reduce((sum, i) => sum + i.quantity, 0);
  const totalAmount = input.items.reduce((sum, i) => sum + i.quantity * (i.unitPrice ?? 0), 0);

  const { data: order, error: orderError } = await sb
    .from('b2b_orders')
    .insert({
      store_id: input.storeId,
      jeweller_id: input.jewellerId,
      manufacturer_id: input.manufacturerId,
      order_number: generateOrderNumber(),
      status: 'pending',
      delivery_address: input.deliveryAddress,
      notes: input.notes ?? null,
      total_items: totalItems,
      total_amount: totalAmount,
      pending_manager_approval: true,
    })
    .select()
    .single();
  if (orderError) throw new Error(`placeB2BOrder (order): ${orderError.message}`);

  const orderRow = order as B2BOrderRow;

  const { error: itemsError } = await sb.from('b2b_order_items').insert(
    input.items.map((i) => ({
      b2b_order_id: orderRow.id,
      manufacturer_product_id: i.manufacturerProductId,
      quantity: i.quantity,
      unit_price_snapshot: i.unitPrice,
      product_name_snapshot: i.productName,
    })),
  );
  if (itemsError) throw new Error(`placeB2BOrder (items): ${itemsError.message}`);

  await sb.from('b2b_order_status_history').insert({
    b2b_order_id: orderRow.id,
    status: 'pending',
    note: 'Order placed',
  });

  return orderRow;
}

export async function getB2BOrdersByStore(storeId: string): Promise<B2BOrderRow[]> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('b2b_orders')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`getB2BOrdersByStore: ${error.message}`);
  return (data ?? []) as B2BOrderRow[];
}

export async function getB2BOrdersByManufacturer(manufacturerId: string): Promise<B2BOrderRow[]> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('b2b_orders')
    .select('*')
    .eq('manufacturer_id', manufacturerId)
    .neq('pending_manager_approval', true)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`getB2BOrdersByManufacturer: ${error.message}`);
  return (data ?? []) as B2BOrderRow[];
}

export async function getB2BOrderWithItems(orderId: string): Promise<B2BOrderWithItems | null> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('b2b_orders')
    .select(
      `*, b2b_order_items(*), b2b_order_status_history(*)`,
    )
    .eq('id', orderId)
    .maybeSingle();
  if (error) throw new Error(`getB2BOrderWithItems: ${error.message}`);
  if (!data) return null;
  const row = data as Record<string, unknown>;
  return {
    ...(row as B2BOrderRow),
    items: (row.b2b_order_items ?? []) as B2BOrderItemRow[],
    history: (row.b2b_order_status_history ?? []) as B2BOrderStatusHistoryRow[],
  };
}

export async function updateB2BOrderStatus(
  orderId: string,
  status: B2BOrderStatus,
  note?: string,
  trackingNumber?: string,
): Promise<{ fulfillment?: FulfillB2BOrderResult }> {
  const sb = getSupabaseServer();
  const existing = await getB2BOrderWithItems(orderId);
  if (!existing) throw new Error('B2B order not found');

  let fulfillment: FulfillB2BOrderResult | undefined;
  if (status === 'delivered' && existing.status !== 'delivered') {
    fulfillment = await fulfillB2BOrder(orderId);
  }

  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (trackingNumber !== undefined) {
    patch.tracking_number = trackingNumber || null;
  }
  const { error } = await sb
    .from('b2b_orders')
    .update(patch)
    .eq('id', orderId);
  if (error) throw new Error(`updateB2BOrderStatus: ${error.message}`);

  await sb.from('b2b_order_status_history').insert({
    b2b_order_id: orderId,
    status,
    note: note ?? null,
  });

  return fulfillment ? { fulfillment } : {};
}

export async function fulfillB2BOrder(orderId: string): Promise<FulfillB2BOrderResult> {
  const sb = getSupabaseServer();
  const order = await getB2BOrderWithItems(orderId);
  if (!order) throw new Error('B2B order not found');
  if (order.status === 'cancelled') throw new Error('Cancelled B2B orders cannot be fulfilled');
  if (order.fulfilled_at) {
    return {
      createdProductIds: [],
      updatedProductIds: order.fulfilled_product_ids ?? [],
    };
  }

  const createdProductIds: string[] = [];
  const updatedProductIds: string[] = [];

  for (const item of order.items) {
    const product = await getManufacturerProductById(item.manufacturer_product_id);
    if (!product) {
      throw new Error(`Manufacturer product ${item.manufacturer_product_id} not found`);
    }
    if (product.manufacturer_id !== order.manufacturer_id) {
      throw new Error(`Manufacturer product ${product.id} does not belong to this order`);
    }

    const { data: existingProduct, error: existingError } = await sb
      .from('products')
      .select('id, stock_count')
      .eq('jeweller_id', order.jeweller_id)
      .eq('manufacturer_product_id', product.id)
      .maybeSingle();
    if (existingError) {
      throw new Error(`fulfillB2BOrder existing product: ${existingError.message}`);
    }

    if (existingProduct) {
      const row = existingProduct as { id: string; stock_count: number | null };
      const nextStock = (row.stock_count ?? 0) + item.quantity;
      const { error: stockError } = await sb
        .from('products')
        .update({ stock_count: nextStock, updated_at: new Date().toISOString() })
        .eq('id', row.id)
        .eq('jeweller_id', order.jeweller_id);
      if (stockError) throw new Error(`fulfillB2BOrder stock update: ${stockError.message}`);
      updatedProductIds.push(row.id);
      continue;
    }

    const suffix = product.sku ? slugify(product.sku) : order.order_number.toLowerCase();
    const slug = await makeUniqueProductSlug(order.jeweller_id, product.name, suffix);
    const categoryId = await getCategoryIdBySlug(product.category);

    const { data: created, error: createError } = await sb
      .from('products')
      .insert({
        jeweller_id: order.jeweller_id,
        manufacturer_product_id: product.id,
        slug,
        sku: product.sku ? `${product.sku}-${order.order_number}` : null,
        name: product.name,
        description: product.description,
        category_id: categoryId,
        metal: product.metal,
        purity: product.purity,
        gemstones: product.gemstones ?? [],
        style_tags: product.style_tags ?? [],
        occasion_tags: product.occasion_tags ?? [],
        price_min: product.base_price,
        price_max: product.base_price,
        weight_grams: product.weight_grams,
        stock_count: item.quantity,
        is_active: true,
        is_featured: false,
      })
      .select('id')
      .single();
    if (createError) throw new Error(`fulfillB2BOrder product create: ${createError.message}`);

    const productId = (created as { id: string }).id;
    createdProductIds.push(productId);

    const catalogImages = product.images.filter((image) => !image.is_tryon);
    if (catalogImages.length > 0) {
      const images = catalogImages.map((image) => ({
        product_id: productId,
        cloudinary_public_id: image.cloudinary_public_id,
        url: image.secure_url,
        width: null,
        height: null,
        alt: product.name,
        sort_order: image.sort_order,
        is_primary: image.is_primary,
      }));
      const { error: imageError } = await sb.from('product_images').insert(images);
      if (imageError) throw new Error(`fulfillB2BOrder image copy: ${imageError.message}`);
    }

    const tryonImages = product.images.filter((image) => image.is_tryon && image.jewellery_type);
    if (tryonImages.length > 0) {
      const tryonAssets = tryonImages.map((image) => ({
        product_id: productId,
        cloudinary_public_id: image.cloudinary_public_id,
        asset_url: image.secure_url,
        jewellery_type: image.jewellery_type,
        pivot_x: 0.5,
        pivot_y: 0.5,
        x_offset: 0,
        y_offset: 0,
        scale_multiplier: 1.0,
        rotation_offset_deg: 0,
        is_active: true,
      }));
      const { error: tryonError } = await sb.from('product_tryon_assets').insert(tryonAssets);
      if (tryonError) throw new Error(`fulfillB2BOrder try-on copy: ${tryonError.message}`);
    } else if (product.has_tryon) {
      // Copy from dedicated manufacturer try-on asset (uploaded via B20 flow)
      const { data: mfrAsset } = await sb
        .from('product_tryon_assets')
        .select('*')
        .eq('manufacturer_product_id', product.id)
        .eq('is_active', true)
        .maybeSingle();
      if (mfrAsset) {
        const row = mfrAsset as Record<string, unknown>;
        const { error: tryonCopyError } = await sb.from('product_tryon_assets').insert({
          product_id: productId,
          cloudinary_public_id: row.cloudinary_public_id ?? null,
          asset_url: row.asset_url,
          jewellery_type: row.jewellery_type,
          pivot_x: row.pivot_x,
          pivot_y: row.pivot_y,
          x_offset: row.x_offset,
          y_offset: row.y_offset,
          scale_multiplier: row.scale_multiplier,
          rotation_offset_deg: row.rotation_offset_deg,
          is_active: true,
        });
        if (tryonCopyError) throw new Error(`fulfillB2BOrder try-on asset copy: ${tryonCopyError.message}`);
      }
    }
  }

  const fulfilledProductIds = [...createdProductIds, ...updatedProductIds];
  const { error: markerError } = await sb
    .from('b2b_orders')
    .update({
      fulfilled_at: new Date().toISOString(),
      fulfilled_product_ids: fulfilledProductIds,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);
  if (markerError) throw new Error(`fulfillB2BOrder marker update: ${markerError.message}`);

  return { createdProductIds, updatedProductIds };
}

// ─── Manager approval helpers for B2B orders ──────────────────────────────────

export async function approveB2BOrder(
  orderId: string,
  approvedById: string,
): Promise<void> {
  const sb = getSupabaseServer();
  const { error } = await sb
    .from('b2b_orders')
    .update({
      pending_manager_approval: false,
      manager_approved_by: approvedById,
      manager_approved_at: new Date().toISOString(),
    })
    .eq('id', orderId);
  if (error) throw new Error(`approveB2BOrder: ${error.message}`);
}

export async function rejectB2BOrder(orderId: string): Promise<void> {
  const sb = getSupabaseServer();
  const { error } = await sb
    .from('b2b_orders')
    .update({ status: 'cancelled', pending_manager_approval: false })
    .eq('id', orderId);
  if (error) throw new Error(`rejectB2BOrder: ${error.message}`);
}

export async function getB2BOrdersPendingByStore(
  storeId: string,
): Promise<B2BOrderRow[]> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('b2b_orders')
    .select('*')
    .eq('store_id', storeId)
    .eq('pending_manager_approval', true)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`getB2BOrdersPendingByStore: ${error.message}`);
  return (data ?? []) as B2BOrderRow[];
}

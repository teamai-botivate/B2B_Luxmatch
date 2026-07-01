import { getServerEnv } from '@luxematch/config';
import { EMBEDDING_DIM } from '@luxematch/embeddings';
import { QdrantClient } from '@qdrant/js-client-rest';

// ────────────────────────────────────────────────────────────────────────────
// Multi-tenant Qdrant client
//
// Single collection (default name: luxematch_products), single vector per
// point (512-d cosine — same space as the OpenCLIP image embedder). Tenancy
// is enforced by an indexed jeweller_id payload field plus a mandatory
// must-filter on every query.
// ────────────────────────────────────────────────────────────────────────────

let _client: QdrantClient | undefined;

export function getQdrantClient(): QdrantClient {
  if (_client) return _client;
  const env = getServerEnv();
  _client = new QdrantClient({
    url: env.QDRANT_URL,
    apiKey: env.QDRANT_API_KEY,
  });
  return _client;
}

function collectionName(): string {
  return getServerEnv().QDRANT_COLLECTION;
}

function manufacturerCollectionName(): string {
  return getServerEnv().QDRANT_MANUFACTURER_COLLECTION;
}

// ────────────────────────────────────────────────────────────────────────────
// Payload contract
//
// Keep this minimal — Supabase is the source of truth for full product info.
// Qdrant only needs enough to (a) filter cheaply and (b) round-trip product
// IDs back to Supabase.
// ────────────────────────────────────────────────────────────────────────────

export type ProductPayload = {
  product_id: string;
  jeweller_id: string;
  slug: string;
  category_id: string | null;
  metal: string | null;
  occasion_tags: string[];
  style_tags: string[];
  price_min: number | null;
  price_max: number | null;
  has_tryon: boolean;
};

export type SearchFilter = {
  /** Required at the API layer; the helpers add it automatically. */
  jewellerId: string;
  categoryId?: string;
  metal?: string;
  occasionTags?: string[];
  priceMin?: number;
  priceMax?: number;
  hasTryOn?: boolean;
};

export type ScoredProduct = {
  productId: string;
  jewellerId: string;
  slug: string;
  score: number;
  hasTryOn: boolean;
};

export type ManufacturerProductPayload = {
  manufacturer_product_id: string;
  manufacturer_id: string;
  category: string | null;
  metal: string | null;
  purity: string | null;
  occasion_tags: string[];
  style_tags: string[];
};

export type ManufacturerCatalogFilter = {
  manufacturerId?: string;
  category?: string;
  metal?: string;
  purity?: string;
  occasionTags?: string[];
  styleTags?: string[];
};

export type ScoredManufacturerProduct = {
  manufacturerProductId: string;
  manufacturerId: string;
  score: number;
};

// ────────────────────────────────────────────────────────────────────────────
// Collection bootstrap
// ────────────────────────────────────────────────────────────────────────────

export async function ensureCollection(): Promise<void> {
  const qdrant = getQdrantClient();
  const name = collectionName();

  const collections = await qdrant.getCollections();
  const exists = collections.collections.some((c) => c.name === name);

  if (!exists) {
    await qdrant.createCollection(name, {
      vectors: { size: EMBEDDING_DIM, distance: 'Cosine' },
    });
  }

  // Index the payload fields we filter on. Idempotent.
  const fieldsToIndex: Array<{
    field_name: string;
    field_schema: 'keyword' | 'float' | 'bool';
  }> = [
    { field_name: 'jeweller_id', field_schema: 'keyword' },
    { field_name: 'category_id', field_schema: 'keyword' },
    { field_name: 'metal', field_schema: 'keyword' },
    { field_name: 'occasion_tags', field_schema: 'keyword' },
    { field_name: 'style_tags', field_schema: 'keyword' },
    { field_name: 'price_min', field_schema: 'float' },
    { field_name: 'price_max', field_schema: 'float' },
    { field_name: 'has_tryon', field_schema: 'bool' },
  ];

  for (const f of fieldsToIndex) {
    try {
      await qdrant.createPayloadIndex(name, {
        field_name: f.field_name,
        field_schema: f.field_schema,
      });
    } catch (err) {
      // Qdrant returns 409/conflict if the index already exists. Anything
      // else is a real problem and should bubble up.
      const msg = err instanceof Error ? err.message : String(err);
      if (!/already exists|conflict/i.test(msg)) throw err;
    }
  }
}

export async function ensureManufacturerCollection(): Promise<void> {
  const qdrant = getQdrantClient();
  const name = manufacturerCollectionName();

  const collections = await qdrant.getCollections();
  const exists = collections.collections.some((c) => c.name === name);

  if (!exists) {
    await qdrant.createCollection(name, {
      vectors: { size: EMBEDDING_DIM, distance: 'Cosine' },
    });
  }

  const fieldsToIndex: Array<{
    field_name: string;
    field_schema: 'keyword';
  }> = [
    { field_name: 'manufacturer_product_id', field_schema: 'keyword' },
    { field_name: 'manufacturer_id', field_schema: 'keyword' },
    { field_name: 'category', field_schema: 'keyword' },
    { field_name: 'metal', field_schema: 'keyword' },
    { field_name: 'purity', field_schema: 'keyword' },
    { field_name: 'occasion_tags', field_schema: 'keyword' },
    { field_name: 'style_tags', field_schema: 'keyword' },
  ];

  for (const f of fieldsToIndex) {
    try {
      await qdrant.createPayloadIndex(name, {
        field_name: f.field_name,
        field_schema: f.field_schema,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/already exists|conflict/i.test(msg)) throw err;
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Upserts and deletes
// ────────────────────────────────────────────────────────────────────────────

export async function upsertProductVector(opts: {
  productId: string;
  vector: number[];
  payload: ProductPayload;
}): Promise<void> {
  if (opts.vector.length !== EMBEDDING_DIM) {
    throw new Error(
      `Vector length ${opts.vector.length} does not match expected ${EMBEDDING_DIM}`,
    );
  }
  if (opts.payload.product_id !== opts.productId) {
    throw new Error('payload.product_id must match productId');
  }
  const qdrant = getQdrantClient();
  await qdrant.upsert(collectionName(), {
    wait: true,
    points: [
      {
        id: opts.productId,
        vector: opts.vector,
        payload: opts.payload as unknown as Record<string, unknown>,
      },
    ],
  });
}

export async function deleteProductVector(productId: string): Promise<void> {
  const qdrant = getQdrantClient();
  await qdrant.delete(collectionName(), {
    wait: true,
    points: [productId],
  });
}

export async function upsertManufacturerProductVector(opts: {
  productId: string;
  vector: number[];
  payload: ManufacturerProductPayload;
}): Promise<void> {
  if (opts.vector.length !== EMBEDDING_DIM) {
    throw new Error(
      `Vector length ${opts.vector.length} does not match expected ${EMBEDDING_DIM}`,
    );
  }
  if (opts.payload.manufacturer_product_id !== opts.productId) {
    throw new Error('payload.manufacturer_product_id must match productId');
  }
  const qdrant = getQdrantClient();
  await ensureManufacturerCollection();
  await qdrant.upsert(manufacturerCollectionName(), {
    wait: true,
    points: [
      {
        id: opts.productId,
        vector: opts.vector,
        payload: opts.payload as unknown as Record<string, unknown>,
      },
    ],
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Search
//
// Tenancy enforcement: every query must include jewellerId. The helper
// merges it into the must-filter list so callers cannot accidentally
// search across shops.
// ────────────────────────────────────────────────────────────────────────────

type QdrantCondition =
  | { key: string; match: { value: string | number | boolean } }
  | { key: string; match: { any: (string | number)[] } }
  | { key: string; range: { gte?: number; lte?: number } };

export function buildSearchMustFilter(filter: SearchFilter): QdrantCondition[] {
  const must: QdrantCondition[] = [
    { key: 'jeweller_id', match: { value: filter.jewellerId } },
  ];

  if (filter.categoryId) {
    must.push({ key: 'category_id', match: { value: filter.categoryId } });
  }
  if (filter.metal) {
    must.push({ key: 'metal', match: { value: filter.metal } });
  }
  if (filter.hasTryOn !== undefined) {
    must.push({ key: 'has_tryon', match: { value: filter.hasTryOn } });
  }
  if (filter.occasionTags?.length) {
    must.push({ key: 'occasion_tags', match: { any: filter.occasionTags } });
  }
  if (filter.priceMin !== undefined || filter.priceMax !== undefined) {
    const range: { gte?: number; lte?: number } = {};
    if (filter.priceMin !== undefined) range.gte = filter.priceMin;
    if (filter.priceMax !== undefined) range.lte = filter.priceMax;
    // Price-range matches against price_max so a product whose top price
    // exceeds the requested floor still shows up. This is the conservative
    // choice for catalog filtering.
    must.push({ key: 'price_max', range });
  }
  return must;
}

function buildManufacturerSearchMustFilter(
  filter: ManufacturerCatalogFilter = {},
): QdrantCondition[] {
  const must: QdrantCondition[] = [];
  if (filter.manufacturerId) {
    must.push({ key: 'manufacturer_id', match: { value: filter.manufacturerId } });
  }
  if (filter.category) {
    must.push({ key: 'category', match: { value: filter.category } });
  }
  if (filter.metal) {
    must.push({ key: 'metal', match: { value: filter.metal } });
  }
  if (filter.purity) {
    must.push({ key: 'purity', match: { value: filter.purity } });
  }
  if (filter.occasionTags?.length) {
    must.push({ key: 'occasion_tags', match: { any: filter.occasionTags } });
  }
  if (filter.styleTags?.length) {
    must.push({ key: 'style_tags', match: { any: filter.styleTags } });
  }
  return must;
}

export async function searchByVector(opts: {
  vector: number[];
  filter: SearchFilter;
  limit?: number;
}): Promise<ScoredProduct[]> {
  if (opts.vector.length !== EMBEDDING_DIM) {
    throw new Error(
      `Vector length ${opts.vector.length} does not match expected ${EMBEDDING_DIM}`,
    );
  }
  const qdrant = getQdrantClient();
  const limit = Math.min(opts.limit ?? 20, 100);

  const result = await qdrant.search(collectionName(), {
    vector: opts.vector,
    limit,
    with_payload: true,
    filter: { must: buildSearchMustFilter(opts.filter) as unknown as never },
  });

  return result.map((hit) => {
    const payload = hit.payload as ProductPayload;
    return {
      productId: payload.product_id,
      jewellerId: payload.jeweller_id,
      slug: payload.slug,
      score: hit.score,
      hasTryOn: payload.has_tryon,
    };
  });
}

export async function searchManufacturerCatalog(opts: {
  vector: number[];
  filter?: ManufacturerCatalogFilter;
  limit?: number;
}): Promise<ScoredManufacturerProduct[]> {
  if (opts.vector.length !== EMBEDDING_DIM) {
    throw new Error(
      `Vector length ${opts.vector.length} does not match expected ${EMBEDDING_DIM}`,
    );
  }
  const qdrant = getQdrantClient();
  const limit = Math.min(opts.limit ?? 20, 100);
  const must = buildManufacturerSearchMustFilter(opts.filter);

  const result = await qdrant.search(manufacturerCollectionName(), {
    vector: opts.vector,
    limit,
    with_payload: true,
    filter: must.length ? { must: must as unknown as never } : undefined,
  });

  return result.map((hit) => {
    const payload = hit.payload as ManufacturerProductPayload;
    return {
      manufacturerProductId: payload.manufacturer_product_id,
      manufacturerId: payload.manufacturer_id,
      score: hit.score,
    };
  });
}

export async function getPoint(productId: string): Promise<ProductPayload | null> {
  const qdrant = getQdrantClient();
  const res = await qdrant.retrieve(collectionName(), {
    ids: [productId],
    with_payload: true,
  });
  if (!res.length) return null;
  return res[0]!.payload as ProductPayload;
}

export const PACKAGE_NAME = '@luxematch/qdrant';

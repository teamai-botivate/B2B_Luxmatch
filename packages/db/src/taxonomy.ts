import { getSupabaseServer } from './client';

export type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
};

export type CollectionRow = {
  id: string;
  jeweller_id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
};

/**
 * Categories are global. Cached by the caller (server component) if needed.
 */
export async function getCategories(): Promise<CategoryRow[]> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('categories')
    .select('id, slug, name, sort_order')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data as CategoryRow[] | null) ?? [];
}

export async function getCollections(jewellerId: string): Promise<CollectionRow[]> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('collections')
    .select('id, jeweller_id, slug, name, description, image_url, sort_order')
    .eq('jeweller_id', jewellerId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data as CollectionRow[] | null) ?? [];
}

export async function getCollectionBySlug(
  jewellerId: string,
  slug: string,
): Promise<CollectionRow | null> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('collections')
    .select('id, jeweller_id, slug, name, description, image_url, sort_order')
    .eq('jeweller_id', jewellerId)
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return (data as CollectionRow | null) ?? null;
}

export async function getCollectionProductIds(collectionId: string): Promise<string[]> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('product_collections')
    .select('product_id')
    .eq('collection_id', collectionId);
  if (error) throw error;
  return (data as { product_id: string }[] | null ?? []).map((r) => r.product_id);
}

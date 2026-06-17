/**
 * Storefront image-selection invariants. adaptProduct() turns an API product
 * (with product_images) into the frontend Product shape; the primary image must
 * sort first (is_primary, then sort_order) so cards/detail render the real
 * Cloudinary primary photo, and productImageUrl() must fall back safely when a
 * product has no image rather than emitting a broken <img>.
 */
import { describe, expect, it } from 'vitest';

import {
  PLACEHOLDER_IMAGE_URL,
  adaptProduct,
  productImageUrl,
  type ApiCategory,
  type ApiProduct,
} from '@/lib/catalog-adapter';

const CATEGORIES: ApiCategory[] = [{ id: 'cat-1', name: 'Necklace', slug: 'necklace' }];

function makeProduct(images: ApiProduct['images']): ApiProduct {
  return {
    id: 'p1',
    jeweller_id: 'j1',
    slug: 'polki-necklace',
    name: 'Polki Necklace',
    description: null,
    category_id: 'cat-1',
    metal: 'gold',
    purity: '22K',
    weight_grams: 12,
    gemstones: [],
    style_tags: [],
    occasion_tags: [],
    price_min: 85000,
    price_max: null,
    stock_count: 3,
    is_featured: true,
    is_active: true,
    has_tryon: false,
    has_embedding: true,
    primary_image_url: images[0]?.url ?? null,
    images,
    created_at: '2026-01-01T00:00:00Z',
  };
}

function img(over: Partial<ApiProduct['images'][number]>): ApiProduct['images'][number] {
  return {
    id: 'i',
    url: 'https://res.cloudinary.com/x/image/upload/luxematch/j1/products/a.jpg',
    alt: null,
    is_primary: false,
    sort_order: 0,
    ...over,
  };
}

describe('adaptProduct image selection', () => {
  it('places the is_primary image first regardless of array order', () => {
    const p = makeProduct([
      img({ id: 'secondary', url: 'https://res.cloudinary.com/x/2.jpg', sort_order: 0 }),
      img({ id: 'primary', url: 'https://res.cloudinary.com/x/1.jpg', is_primary: true, sort_order: 5 }),
    ]);
    const adapted = adaptProduct(p, CATEGORIES);
    expect(adapted.images[0]!.id).toBe('primary');
    expect(adapted.images[0]!.url).toBe('https://res.cloudinary.com/x/1.jpg');
  });

  it('falls back to sort_order when no image is primary', () => {
    const p = makeProduct([
      img({ id: 'b', sort_order: 2 }),
      img({ id: 'a', sort_order: 1 }),
    ]);
    const adapted = adaptProduct(p, CATEGORIES);
    expect(adapted.images.map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('preserves the real Cloudinary URL on the mapped image', () => {
    const url = 'https://res.cloudinary.com/dyrc4bo4m/image/upload/luxematch/j1/products/x.jpg';
    const adapted = adaptProduct(makeProduct([img({ is_primary: true, url })]), CATEGORIES);
    expect(adapted.images[0]!.url).toBe(url);
  });
});

describe('productImageUrl fallback', () => {
  it('returns the first image url when present', () => {
    expect(productImageUrl([{ url: 'https://res.cloudinary.com/x/1.jpg' }])).toBe(
      'https://res.cloudinary.com/x/1.jpg',
    );
  });

  it('returns the placeholder when there are no images', () => {
    expect(productImageUrl([])).toBe(PLACEHOLDER_IMAGE_URL);
    expect(productImageUrl(undefined)).toBe(PLACEHOLDER_IMAGE_URL);
  });
});

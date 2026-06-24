import type { TryOnProduct } from '@luxematch/db';
import { arDemoAssetUrl, arDemoPublicId } from '@/lib/ar-demo-assets';

const now = '2026-01-01T00:00:00.000Z';

function asset(
  productId: string,
  file: string,
  jewelleryType: TryOnProduct['assets'][number]['jewellery_type'],
  scaleMultiplier: number,
): TryOnProduct['assets'][number] {
  return {
    id: `showcase-${productId}`,
    product_id: productId,
    cloudinary_public_id: null,
    asset_url: file,
    jewellery_type: jewelleryType,
    pivot_x: 0.5,
    pivot_y: jewelleryType === 'necklace' ? 0.08 : 0.5,
    x_offset: 0,
    y_offset: jewelleryType === 'necklace' ? 0.03 : 0,
    scale_multiplier: scaleMultiplier,
    rotation_offset_deg: 0,
    width_mm: null,
    height_mm: null,
    is_active: true,
    created_at: now,
    updated_at: now,
  };
}

export const SHOWCASE_AR_PRODUCTS: TryOnProduct[] = [
  {
    id: 'showcase-necklace-n1',
    slug: 'showcase-necklace-n1',
    name: 'Showcase Necklace N1',
    primary_image_url: '/All_jewelleries/necklace/N1.png',
    assets: [asset('showcase-necklace-n1', '/All_jewelleries/necklace/N1.png', 'necklace', 1.04)],
  },
  {
    id: 'showcase-necklace-n2',
    slug: 'showcase-necklace-n2',
    name: 'Showcase Necklace N2',
    primary_image_url: '/All_jewelleries/necklace/N2.png',
    assets: [asset('showcase-necklace-n2', '/All_jewelleries/necklace/N2.png', 'necklace', 1.02)],
  },
  {
    id: 'showcase-necklace-n3',
    slug: 'showcase-necklace-n3',
    name: 'Showcase Necklace N3',
    primary_image_url: '/All_jewelleries/necklace/N3.png',
    assets: [asset('showcase-necklace-n3', '/All_jewelleries/necklace/N3.png', 'necklace', 1.08)],
  },
  {
    id: 'showcase-necklace-n4',
    slug: 'showcase-necklace-n4',
    name: 'Showcase Necklace N4',
    primary_image_url: '/All_jewelleries/necklace/N4.png',
    assets: [asset('showcase-necklace-n4', '/All_jewelleries/necklace/N4.png', 'necklace', 1.05)],
  },
  {
    id: 'showcase-necklace-n5',
    slug: 'showcase-necklace-n5',
    name: 'Showcase Necklace N5',
    primary_image_url: '/All_jewelleries/necklace/N5.png',
    assets: [asset('showcase-necklace-n5', '/All_jewelleries/necklace/N5.png', 'necklace', 1.06)],
  },
  {
    id: 'showcase-necklace-n6',
    slug: 'showcase-necklace-n6',
    name: 'Showcase Necklace N6',
    primary_image_url: '/All_jewelleries/necklace/N6.png',
    assets: [asset('showcase-necklace-n6', '/All_jewelleries/necklace/N6.png', 'necklace', 1.03)],
  },
  {
    id: 'showcase-necklace-n7',
    slug: 'showcase-necklace-n7',
    name: 'Showcase Necklace N7',
    primary_image_url: '/All_jewelleries/necklace/N7.png',
    assets: [asset('showcase-necklace-n7', '/All_jewelleries/necklace/N7.png', 'necklace', 1.08)],
  },
  {
    id: 'showcase-necklace-n8',
    slug: 'showcase-necklace-n8',
    name: 'Showcase Necklace N8',
    primary_image_url: '/All_jewelleries/necklace/N8.png',
    assets: [asset('showcase-necklace-n8', '/All_jewelleries/necklace/N8.png', 'necklace', 1.04)],
  },
  {
    id: 'showcase-necklace-n9',
    slug: 'showcase-necklace-n9',
    name: 'Showcase Necklace N9',
    primary_image_url: '/All_jewelleries/necklace/N9.png',
    assets: [asset('showcase-necklace-n9', '/All_jewelleries/necklace/N9.png', 'necklace', 1.05)],
  },
  {
    id: 'showcase-ring-1',
    slug: 'showcase-ring-1',
    name: 'Showcase Ring 1',
    primary_image_url: '/All_jewelleries/rings/1.png',
    assets: [asset('showcase-ring-1', '/All_jewelleries/rings/1.png', 'ring_index', 1)],
  },
  {
    id: 'showcase-ring-2',
    slug: 'showcase-ring-2',
    name: 'Showcase Ring 2',
    primary_image_url: '/All_jewelleries/rings/2.png',
    assets: [asset('showcase-ring-2', '/All_jewelleries/rings/2.png', 'ring_index', 1)],
  },
  {
    id: 'showcase-ring-3',
    slug: 'showcase-ring-3',
    name: 'Showcase Ring 3',
    primary_image_url: '/All_jewelleries/rings/3.png',
    assets: [asset('showcase-ring-3', '/All_jewelleries/rings/3.png', 'ring_index', 1)],
  },
  {
    id: 'showcase-ring-4',
    slug: 'showcase-ring-4',
    name: 'Showcase Ring 4',
    primary_image_url: '/All_jewelleries/rings/4.png',
    assets: [asset('showcase-ring-4', '/All_jewelleries/rings/4.png', 'ring_index', 1)],
  },
  {
    id: 'showcase-ring-5',
    slug: 'showcase-ring-5',
    name: 'Showcase Ring 5',
    primary_image_url: '/All_jewelleries/rings/5.png',
    assets: [asset('showcase-ring-5', '/All_jewelleries/rings/5.png', 'ring_index', 1)],
  },
  {
    id: 'showcase-ring-6',
    slug: 'showcase-ring-6',
    name: 'Showcase Ring 6',
    primary_image_url: '/All_jewelleries/rings/6.png',
    assets: [asset('showcase-ring-6', '/All_jewelleries/rings/6.png', 'ring_index', 1)],
  },
  {
    id: 'showcase-ring-7',
    slug: 'showcase-ring-7',
    name: 'Showcase Ring 7',
    primary_image_url: '/All_jewelleries/rings/7.png',
    assets: [asset('showcase-ring-7', '/All_jewelleries/rings/7.png', 'ring_index', 1)],
  },
  {
    id: 'showcase-ring-8',
    slug: 'showcase-ring-8',
    name: 'Showcase Ring 8',
    primary_image_url: '/All_jewelleries/rings/8.png',
    assets: [asset('showcase-ring-8', '/All_jewelleries/rings/8.png', 'ring_index', 1)],
  },
  {
    id: 'showcase-ring-9',
    slug: 'showcase-ring-9',
    name: 'Showcase Ring 9',
    primary_image_url: '/All_jewelleries/rings/9.png',
    assets: [asset('showcase-ring-9', '/All_jewelleries/rings/9.png', 'ring_index', 1)],
  },
  {
    id: 'showcase-ring-10',
    slug: 'showcase-ring-10',
    name: 'Showcase Ring 10',
    primary_image_url: '/All_jewelleries/rings/10.png',
    assets: [asset('showcase-ring-10', '/All_jewelleries/rings/10.png', 'ring_index', 1)],
  },
  {
    id: 'showcase-ring-11',
    slug: 'showcase-ring-11',
    name: 'Showcase Ring 11',
    primary_image_url: '/All_jewelleries/rings/11.png',
    assets: [asset('showcase-ring-11', '/All_jewelleries/rings/11.png', 'ring_index', 1)],
  },
  {
    id: 'showcase-ring-12',
    slug: 'showcase-ring-12',
    name: 'Showcase Ring 12',
    primary_image_url: '/All_jewelleries/rings/12.png',
    assets: [asset('showcase-ring-12', '/All_jewelleries/rings/12.png', 'ring_index', 1)],
  },
  {
    id: 'showcase-bracelet-1',
    slug: 'showcase-bracelet-1',
    name: 'Showcase Bracelet 1',
    primary_image_url: '/All_jewelleries/bracelets/1.png',
    assets: [asset('showcase-bracelet-1', '/All_jewelleries/bracelets/1.png', 'bangle', 1)],
  },
  {
    id: 'showcase-bracelet-2',
    slug: 'showcase-bracelet-2',
    name: 'Showcase Bracelet 2',
    primary_image_url: '/All_jewelleries/bracelets/2.png',
    assets: [asset('showcase-bracelet-2', '/All_jewelleries/bracelets/2.png', 'bangle', 1)],
  },
];

export const CLOUDINARY_READY_SHOWCASE_AR_PRODUCTS: TryOnProduct[] = SHOWCASE_AR_PRODUCTS.map((product) => ({
  ...product,
  primary_image_url: product.primary_image_url ? arDemoAssetUrl(product.primary_image_url) : product.primary_image_url,
  assets: product.assets.map((item) => ({
    ...item,
    cloudinary_public_id: arDemoPublicId(item.asset_url),
    asset_url: arDemoAssetUrl(item.asset_url),
  })),
}));

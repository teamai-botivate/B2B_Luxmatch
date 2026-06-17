import { createHash } from 'node:crypto';

type CloudinaryResource = {
  public_id: string;
  secure_url: string;
  width?: number;
  height?: number;
  format?: string;
  created_at?: string;
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  updated_at?: string;
};

type ProductImageRow = {
  id: string;
  product_id: string;
  cloudinary_public_id: string;
  url: string;
  is_primary: boolean;
  sort_order: number;
};

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const replaceSeed = args.has('--replace-seed');
const sourcePrefix =
  readArg('--source-prefix') ?? process.env.CLOUDINARY_IMPORT_SOURCE_PREFIX ?? 'jewellery_search';
const limit = Number(readArg('--limit') ?? process.env.CLOUDINARY_IMPORT_LIMIT ?? '12');

function readArg(name: string): string | undefined {
  const prefix = `${name}=`;
  const arg = process.argv.slice(2).find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function signCloudinary(params: Record<string, string | number>, secret: string): string {
  const payload = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== '')
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return createHash('sha1').update(payload + secret).digest('hex');
}

function normalizePublicId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160);
}

async function cloudinaryGet(path: string): Promise<unknown> {
  const cloud = requireEnv('CLOUDINARY_CLOUD_NAME');
  const key = requireEnv('CLOUDINARY_API_KEY');
  const secret = requireEnv('CLOUDINARY_API_SECRET');
  const auth = Buffer.from(`${key}:${secret}`).toString('base64');
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}${path}`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  const json = (await res.json()) as { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(`Cloudinary GET ${path} failed: ${json.error?.message ?? res.status}`);
  }
  return json;
}

async function cloudinaryUploadFromUrl(opts: {
  sourceUrl: string;
  folder: string;
  publicId: string;
}): Promise<CloudinaryResource> {
  const cloud = requireEnv('CLOUDINARY_CLOUD_NAME');
  const key = requireEnv('CLOUDINARY_API_KEY');
  const secret = requireEnv('CLOUDINARY_API_SECRET');
  const timestamp = Math.floor(Date.now() / 1000);
  const params = {
    folder: opts.folder,
    public_id: opts.publicId,
    timestamp,
    overwrite: 'true',
  };
  const body = new URLSearchParams({
    file: opts.sourceUrl,
    api_key: key,
    folder: opts.folder,
    public_id: opts.publicId,
    timestamp: String(timestamp),
    overwrite: 'true',
    signature: signCloudinary(params, secret),
  });
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: 'POST',
    body,
  });
  const json = (await res.json()) as CloudinaryResource & { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(`Cloudinary upload failed: ${json.error?.message ?? res.status}`);
  }
  return json;
}

async function supabaseGet<T>(path: string): Promise<T> {
  const base = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const res = await fetch(`${base}/rest/v1/${path}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase GET ${path} failed: ${res.status} ${text}`);
  return JSON.parse(text) as T;
}

async function supabasePatch(path: string, body: unknown): Promise<void> {
  const base = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const res = await fetch(`${base}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase PATCH ${path} failed: ${res.status} ${text}`);
}

async function supabasePost(path: string, body: unknown): Promise<void> {
  const base = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const res = await fetch(`${base}/rest/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase POST ${path} failed: ${res.status} ${text}`);
}

async function main() {
  const jewellerId = requireEnv('SHOP_JEWELLER_ID');
  const targetFolder = `luxematch/${jewellerId}/products`;

  const products = await supabaseGet<ProductRow[]>(
    `products?select=id,slug,name,updated_at&jeweller_id=eq.${jewellerId}&order=updated_at.desc&limit=${limit}`,
  );
  const imageRows = await supabaseGet<ProductImageRow[]>(
    `product_images?select=id,product_id,cloudinary_public_id,url,is_primary,sort_order&product_id=in.(${products.map((p) => p.id).join(',')})`,
  );

  const search = (await cloudinaryGet(
    `/resources/image/upload?prefix=${encodeURIComponent(sourcePrefix)}&max_results=${limit}&direction=desc`,
  )) as { resources?: CloudinaryResource[] };
  const resources = search.resources ?? [];

  console.log(`Cloudinary source prefix: ${sourcePrefix}`);
  console.log(`Cloudinary target folder: ${targetFolder}`);
  console.log(`Products: ${products.length}; source images: ${resources.length}; mode: ${apply ? 'APPLY' : 'DRY RUN'}`);

  if (resources.length < products.length) {
    throw new Error(`Not enough Cloudinary images: ${resources.length} for ${products.length} products`);
  }

  for (let i = 0; i < products.length; i += 1) {
    const product = products[i]!;
    const source = resources[i]!;
    const existing = imageRows.filter((row) => row.product_id === product.id);
    const primary = existing.find((row) => row.is_primary) ?? existing[0];
    const canReplace =
      !primary ||
      replaceSeed ||
      primary.cloudinary_public_id.startsWith('seed/') ||
      primary.url.includes('images.unsplash.com');
    const publicId = normalizePublicId(`${product.slug}-primary`);

    console.log(
      `${apply ? 'IMPORT' : 'WOULD IMPORT'} ${source.public_id} -> ${targetFolder}/${publicId} -> ${product.slug}`,
    );

    if (!apply) continue;
    if (!canReplace) {
      console.log(`  skipped: product already has non-seed image ${primary?.cloudinary_public_id}`);
      continue;
    }

    const uploaded = await cloudinaryUploadFromUrl({
      sourceUrl: source.secure_url,
      folder: targetFolder,
      publicId,
    });

    if (primary) {
      await supabasePatch(`product_images?id=eq.${primary.id}`, {
        cloudinary_public_id: uploaded.public_id,
        url: uploaded.secure_url,
        width: uploaded.width ?? null,
        height: uploaded.height ?? null,
        alt: product.name,
        sort_order: 0,
        is_primary: true,
      });
    } else {
      await supabasePost('product_images', {
        product_id: product.id,
        cloudinary_public_id: uploaded.public_id,
        url: uploaded.secure_url,
        width: uploaded.width ?? null,
        height: uploaded.height ?? null,
        alt: product.name,
        sort_order: 0,
        is_primary: true,
      });
    }
  }

  if (!apply) {
    console.log('Dry run only. Re-run with --apply --replace-seed to update product_images.');
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

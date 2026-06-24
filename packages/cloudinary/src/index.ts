import { getServerEnv } from '@luxematch/config';
import { createHash } from 'node:crypto';

// ────────────────────────────────────────────────────────────────────────────
// Folder namespacing
//
// Every asset lives under luxematch/<jewellerId>/<bucket>/ so a destroy()
// call can verify the publicId prefix matches the requesting shop before
// deleting. The bucket is one of three fixed values; the client cannot
// pass an arbitrary folder path.
// ────────────────────────────────────────────────────────────────────────────

export const CLOUDINARY_BUCKETS = ['products', 'tryon', 'logo', 'avatars'] as const;
export type CloudinaryBucket = (typeof CLOUDINARY_BUCKETS)[number];

export type AllowedFormat = 'jpg' | 'jpeg' | 'png' | 'webp' | 'avif';

const ALLOWED_FORMATS_BY_BUCKET: Record<CloudinaryBucket, AllowedFormat[]> = {
  products: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
  // Try-on assets require transparency, so jpg is rejected.
  tryon: ['png', 'webp', 'avif'],
  logo: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
  // Customer profile pictures.
  avatars: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
};

export function getAllowedFormats(bucket: CloudinaryBucket): AllowedFormat[] {
  return ALLOWED_FORMATS_BY_BUCKET[bucket];
}

export function folderFor(jewellerId: string, bucket: CloudinaryBucket): string {
  return `luxematch/${jewellerId}/${bucket}`;
}

/**
 * Verifies a publicId belongs to a jeweller's folder. Used by the deletion
 * endpoint to prevent a shop from deleting another shop's assets.
 */
export function publicIdBelongsToJeweller(
  publicId: string,
  jewellerId: string,
): boolean {
  const prefix = `luxematch/${jewellerId}/`;
  return publicId.startsWith(prefix);
}

// ────────────────────────────────────────────────────────────────────────────
// Signed upload params
//
// Cloudinary signed-upload contract:
//   sig = SHA-1( "<key>=<value>&..." sorted_alphabetically + api_secret )
// We only ever sign folder + timestamp + optional public_id, keeping the
// browser unable to upload to any other folder.
// ────────────────────────────────────────────────────────────────────────────

export type SignedUploadParams = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  publicId?: string;
  signature: string;
  uploadUrl: string;
  allowedFormats: AllowedFormat[];
  /** Max upload size in bytes — enforced client-side as a UX guard. */
  maxBytes: number;
};

const MAX_BYTES_DEFAULT = 10 * 1024 * 1024; // 10 MB

function signParams(params: Record<string, string | number>, apiSecret: string): string {
  const sorted = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== '')
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return createHash('sha1').update(sorted + apiSecret).digest('hex');
}

export function generateSignedUploadParams(opts: {
  jewellerId: string;
  bucket: CloudinaryBucket;
  publicId?: string;
}): SignedUploadParams {
  const env = getServerEnv();
  const folder = folderFor(opts.jewellerId, opts.bucket);
  const timestamp = Math.floor(Date.now() / 1000);

  const toSign: Record<string, string | number> = { folder, timestamp };
  if (opts.publicId) toSign.public_id = opts.publicId;

  const signature = signParams(toSign, env.CLOUDINARY_API_SECRET);

  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    timestamp,
    folder,
    publicId: opts.publicId,
    signature,
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    allowedFormats: getAllowedFormats(opts.bucket),
    maxBytes: MAX_BYTES_DEFAULT,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Asset deletion
// ────────────────────────────────────────────────────────────────────────────

export type DeleteAssetResult =
  | { ok: true; result: 'ok' | 'not_found' }
  | { ok: false; error: string };

export async function deleteAsset(publicId: string): Promise<DeleteAssetResult> {
  const env = getServerEnv();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signParams(
    { public_id: publicId, timestamp },
    env.CLOUDINARY_API_SECRET,
  );

  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: env.CLOUDINARY_API_KEY,
    signature,
  });

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/destroy`,
    { method: 'POST', body },
  );
  if (!res.ok) {
    return { ok: false, error: `Cloudinary destroy returned ${res.status}` };
  }
  const json = (await res.json()) as { result?: string };
  if (json.result === 'ok' || json.result === 'not found') {
    return { ok: true, result: json.result === 'ok' ? 'ok' : 'not_found' };
  }
  return {
    ok: false,
    error: `Unexpected Cloudinary response: ${JSON.stringify(json)}`,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Optimized URL helper
// ────────────────────────────────────────────────────────────────────────────

export type OptimizedUrlOptions = {
  width?: number;
  height?: number;
  crop?: 'fill' | 'fit' | 'limit' | 'scale';
  /** Defaults to true; pass false to disable. */
  autoFormat?: boolean;
  /** Defaults to true; pass false to disable. */
  autoQuality?: boolean;
};

export function getOptimizedUrl(
  publicId: string,
  opts: OptimizedUrlOptions = {},
): string {
  const env = getServerEnv();
  const parts: string[] = [];
  if (opts.autoFormat !== false) parts.push('f_auto');
  if (opts.autoQuality !== false) parts.push('q_auto');
  if (opts.width) parts.push(`w_${opts.width}`);
  if (opts.height) parts.push(`h_${opts.height}`);
  if (opts.crop) parts.push(`c_${opts.crop}`);
  const transform = parts.length ? parts.join(',') + '/' : '';
  return `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/upload/${transform}${publicId}`;
}

export const PACKAGE_NAME = '@luxematch/cloudinary';

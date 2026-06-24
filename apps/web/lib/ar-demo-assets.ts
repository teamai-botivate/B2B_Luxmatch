const LOCAL_AR_PREFIX = '/All_jewelleries/';
const CLOUDINARY_AR_DEMO_FOLDER = 'AR-ITEMS-DEMO';

function normalizedBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_AR_DEMO_ASSET_BASE_URL ?? '').replace(/\/+$/, '');
}

function relativeAssetPath(localPath: string): string | null {
  if (!localPath.startsWith(LOCAL_AR_PREFIX)) return null;
  return localPath.slice(LOCAL_AR_PREFIX.length);
}

export function arDemoAssetUrl(localPath: string): string {
  const base = normalizedBaseUrl();
  const relativePath = relativeAssetPath(localPath);
  if (!base || !relativePath) return localPath;

  const avifPath = relativePath.replace(/\.[^.]+$/, '.avif');
  return `${base}/${avifPath}`;
}

export function arDemoPublicId(localPath: string): string | null {
  const relativePath = relativeAssetPath(localPath);
  if (!relativePath) return null;

  return `${CLOUDINARY_AR_DEMO_FOLDER}/${relativePath.replace(/\.[^.]+$/, '')}`;
}


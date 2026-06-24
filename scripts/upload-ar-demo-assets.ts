import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type UploadResult = {
  public_id: string;
  secure_url: string;
  width?: number;
  height?: number;
  bytes?: number;
  eager?: Array<{
    secure_url: string;
    width?: number;
    height?: number;
    bytes?: number;
    format?: string;
  }>;
};

type ManifestEntry = {
  localPath: string;
  publicId: string;
  deliveryUrl: string;
  width: number | null;
  height: number | null;
  bytes: number | null;
};

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const folder = readArg('--folder') ?? process.env.CLOUDINARY_AR_DEMO_FOLDER ?? 'AR-ITEMS-DEMO';
const sourceDir = path.resolve(readArg('--source-dir') ?? 'apps/web/public/All_jewelleries');
const maxWidth = Number(readArg('--max-width') ?? process.env.CLOUDINARY_AR_DEMO_MAX_WIDTH ?? '1400');
const manifestPath = path.resolve(
  readArg('--manifest') ?? 'apps/web/public/ar-items-demo.manifest.json',
);

function readArg(name: string): string | undefined {
  const prefix = `${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
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

function toPosixPath(value: string): string {
  return value.split(path.sep).join('/');
}

function publicIdFor(filePath: string): string {
  const relative = toPosixPath(path.relative(sourceDir, filePath));
  return relative.replace(/\.[^.]+$/, '');
}

function localPublicPath(filePath: string): string {
  return `/All_jewelleries/${toPosixPath(path.relative(sourceDir, filePath))}`;
}

async function listPngFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return listPngFiles(fullPath);
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) return [fullPath];
      return [];
    }),
  );
  return files.flat().sort();
}

async function uploadAsset(filePath: string): Promise<UploadResult> {
  const cloud = requireEnv('CLOUDINARY_CLOUD_NAME');
  const key = requireEnv('CLOUDINARY_API_KEY');
  const secret = requireEnv('CLOUDINARY_API_SECRET');
  const timestamp = Math.floor(Date.now() / 1000);
  const eager = `c_limit,w_${maxWidth},q_auto:good,f_avif`;
  const publicId = publicIdFor(filePath);
  const params = {
    eager,
    folder,
    overwrite: 'true',
    public_id: publicId,
    timestamp,
  };
  const bytes = await readFile(filePath);
  const body = new URLSearchParams({
    file: `data:image/png;base64,${bytes.toString('base64')}`,
    api_key: key,
    eager,
    folder,
    overwrite: 'true',
    public_id: publicId,
    timestamp: String(timestamp),
    signature: signCloudinary(params, secret),
  });

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: 'POST',
    body,
  });
  const json = (await res.json()) as UploadResult & { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(`Cloudinary upload failed for ${filePath}: ${json.error?.message ?? res.status}`);
  }
  return json;
}

async function main() {
  const cloud = requireEnv('CLOUDINARY_CLOUD_NAME');
  const files = await listPngFiles(sourceDir);
  const baseDeliveryUrl =
    `https://res.cloudinary.com/${cloud}/image/upload/c_limit,w_${maxWidth},q_auto:good,f_avif/${folder}`;

  console.log(`Source: ${sourceDir}`);
  console.log(`Cloudinary folder: ${folder}`);
  console.log(`Files: ${files.length}`);
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Set NEXT_PUBLIC_AR_DEMO_ASSET_BASE_URL=${baseDeliveryUrl}`);

  const manifest: ManifestEntry[] = [];
  for (const filePath of files) {
    const publicId = `${folder}/${publicIdFor(filePath)}`;
    const deliveryUrl = `${baseDeliveryUrl}/${publicIdFor(filePath)}.avif`;
    console.log(`${apply ? 'UPLOAD' : 'WOULD UPLOAD'} ${localPublicPath(filePath)} -> ${publicId}.avif`);

    if (!apply) {
      manifest.push({
        localPath: localPublicPath(filePath),
        publicId,
        deliveryUrl,
        width: null,
        height: null,
        bytes: null,
      });
      continue;
    }

    const uploaded = await uploadAsset(filePath);
    const eagerAsset = uploaded.eager?.[0];
    manifest.push({
      localPath: localPublicPath(filePath),
      publicId: uploaded.public_id,
      deliveryUrl: eagerAsset?.secure_url ?? deliveryUrl,
      width: eagerAsset?.width ?? uploaded.width ?? null,
      height: eagerAsset?.height ?? uploaded.height ?? null,
      bytes: eagerAsset?.bytes ?? uploaded.bytes ?? null,
    });
  }

  if (apply) {
    await writeFile(manifestPath, `${JSON.stringify({ folder, baseDeliveryUrl, assets: manifest }, null, 2)}\n`);
    console.log(`Wrote manifest: ${manifestPath}`);
  } else {
    console.log('Dry run only. Re-run with --apply to upload and write the manifest.');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});


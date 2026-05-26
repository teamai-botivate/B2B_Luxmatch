import { getServerEnv } from '@luxematch/config';

// ────────────────────────────────────────────────────────────────────────────
// Thin TypeScript client for the OpenCLIP embedder service.
//
// Same model + dim contract as Jewellery_AI/backend/models.py:
//   ViT-B-32 / laion2b_s34b_b79k / 512-d L2-normalised
//
// The service runs at EMBEDDER_URL. All requests carry a bearer token in
// EMBEDDER_API_KEY when set.
// ────────────────────────────────────────────────────────────────────────────

export const EMBEDDING_DIM = 512;

type EmbedResponse = { dim: number; embedding: number[] };
type BatchEmbedResponse = { dim: number; embeddings: (number[] | null)[] };

function authHeaders(): Record<string, string> {
  const env = getServerEnv();
  const headers: Record<string, string> = {};
  if (env.EMBEDDER_API_KEY) headers.Authorization = `Bearer ${env.EMBEDDER_API_KEY}`;
  return headers;
}

function baseUrl(): string {
  return getServerEnv().EMBEDDER_URL.replace(/\/$/, '');
}

async function readJsonOrThrow<T>(res: Response, ctx: string): Promise<T> {
  if (!res.ok) {
    let body = '';
    try {
      body = await res.text();
    } catch {
      /* ignore */
    }
    throw new Error(`[embeddings] ${ctx} failed: ${res.status} ${body}`);
  }
  return (await res.json()) as T;
}

// ────────────────────────────────────────────────────────────────────────────
// Text
// ────────────────────────────────────────────────────────────────────────────

export async function embedText(text: string): Promise<number[]> {
  const res = await fetch(`${baseUrl()}/embed/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ text }),
  });
  const data = await readJsonOrThrow<EmbedResponse>(res, 'embed/text');
  return data.embedding;
}

// ────────────────────────────────────────────────────────────────────────────
// Image (single + batch)
//
// The embedder expects multipart/form-data with a "file" field. We support
// either a raw Buffer (for server-side fetches from Cloudinary) or a Blob
// (rare; mostly Buffer is what callers pass).
// ────────────────────────────────────────────────────────────────────────────

function toBlob(input: Buffer | Blob): Blob {
  if (input instanceof Blob) return input;
  // node 20 exposes Blob globally; Buffer → Blob is straightforward.
  return new Blob([new Uint8Array(input)]);
}

export async function embedImage(input: Buffer | Blob): Promise<number[]> {
  const form = new FormData();
  form.append('file', toBlob(input), 'image');
  const res = await fetch(`${baseUrl()}/embed/image`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  const data = await readJsonOrThrow<EmbedResponse>(res, 'embed/image');
  return data.embedding;
}

export async function embedImageBatch(
  inputs: (Buffer | Blob)[],
): Promise<(number[] | null)[]> {
  const form = new FormData();
  for (let i = 0; i < inputs.length; i++) {
    form.append('files', toBlob(inputs[i]!), `image-${i}`);
  }
  const res = await fetch(`${baseUrl()}/embed/image/batch`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  const data = await readJsonOrThrow<BatchEmbedResponse>(res, 'embed/image/batch');
  return data.embeddings;
}

// ────────────────────────────────────────────────────────────────────────────
// Hybrid: text + image fused in a single 512-d vector
//
// Used by /api/search/hybrid. The embedder does the weighted average and
// re-normalisation; the TS side just forwards the inputs.
// ────────────────────────────────────────────────────────────────────────────

export async function embedHybrid(opts: {
  text?: string;
  image?: Buffer | Blob;
  /** 0 = image only, 1 = text only, 0.5 default. */
  weight?: number;
}): Promise<number[]> {
  if (!opts.text && !opts.image) {
    throw new Error('embedHybrid requires text, image, or both');
  }
  const form = new FormData();
  if (opts.text) form.append('text', opts.text);
  if (opts.weight !== undefined) form.append('weight', String(opts.weight));
  if (opts.image) form.append('file', toBlob(opts.image), 'image');

  const res = await fetch(`${baseUrl()}/embed/hybrid`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  const data = await readJsonOrThrow<EmbedResponse>(res, 'embed/hybrid');
  return data.embedding;
}

// ────────────────────────────────────────────────────────────────────────────
// Build product text — same recipe as Jewellery_AI but adapted for the rich
// metadata LuxeMatch stores.
// ────────────────────────────────────────────────────────────────────────────

export function buildProductEmbeddingText(p: {
  name: string;
  description?: string | null;
  category?: string | null;
  metal?: string | null;
  purity?: string | null;
  gemstones?: string[];
  style_tags?: string[];
  occasion_tags?: string[];
}): string {
  const parts: string[] = [p.name];
  if (p.description) parts.push(p.description);
  if (p.category) parts.push(p.category);
  if (p.metal) parts.push(p.metal);
  if (p.purity) parts.push(p.purity);
  if (p.gemstones?.length) parts.push(p.gemstones.join(' '));
  if (p.style_tags?.length) parts.push(p.style_tags.join(' '));
  if (p.occasion_tags?.length) parts.push(p.occasion_tags.join(' '));
  return parts.join(' · ').slice(0, 2000);
}

export const PACKAGE_NAME = '@luxematch/embeddings';

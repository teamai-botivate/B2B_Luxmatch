import { z } from 'zod';

const ServerEnvSchema = z.object({
  // Shop tenancy — set per-device at install time by scripts/provision-shop.ts
  SHOP_JEWELLER_ID: z.string().uuid('SHOP_JEWELLER_ID must be a UUID'),
  LM_PIN_COOKIE_SECRET: z
    .string()
    .min(32, 'LM_PIN_COOKIE_SECRET must be at least 32 chars'),
  LM_PIN_COOKIE_TTL_SECONDS: z.coerce.number().int().positive().default(14_400),
  // Read on the server too so the Supabase server client can use it without
  // a separate client-env import path.
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  QDRANT_URL: z.string().url('QDRANT_URL must be a valid URL'),
  QDRANT_API_KEY: z.string().min(1, 'QDRANT_API_KEY is required'),
  QDRANT_COLLECTION: z.string().min(1).default('luxematch_products'),
  // OpenCLIP embedder service (apps/embedder). Same model as Jewellery_AI:
  // ViT-B-32 / laion2b_s34b_b79k / 512-d.
  EMBEDDER_URL: z.string().url('EMBEDDER_URL must be a valid URL').optional(),
  EMBEDDER_API_KEY: z.string().optional(),
  // Optional transactional email sender for non-auth messages such as order
  // confirmations. Supabase Auth OTP emails use the SMTP settings configured
  // in the Supabase dashboard, not these env vars.
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  SMTP_FROM_EMAIL: z.string().email().optional(),
  SMTP_FROM_NAME: z.string().min(1).optional(),
  // CORS allow-list (comma-separated origins). When unset, the API allows the
  // same-origin browser app only (dev convenience). In production set this to
  // the deployed web origin(s), e.g. "https://shop.luxematch.in".
  ALLOWED_ORIGINS: z.string().optional(),
  // Standard Node hint — used to decide whether CORS rejects unknown origins.
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const ClientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z
    .string()
    .min(1, 'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is required'),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;
export type ClientEnv = z.infer<typeof ClientEnvSchema>;

function isServer(): boolean {
  return typeof window === 'undefined';
}

function formatIssues(issues: z.ZodIssue[]): string {
  return issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
}

function parseServerEnv(): ServerEnv {
  const parsed = ServerEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `[@luxematch/config] Invalid server environment variables:\n${formatIssues(parsed.error.issues)}`,
    );
  }
  return parsed.data;
}

function parseClientEnv(): ClientEnv {
  const source = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  };
  const parsed = ClientEnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(
      `[@luxematch/config] Invalid public environment variables:\n${formatIssues(parsed.error.issues)}`,
    );
  }
  return parsed.data;
}

let _serverEnv: ServerEnv | undefined;
let _clientEnv: ClientEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (!isServer()) {
    throw new Error('[@luxematch/config] getServerEnv() called in a client bundle');
  }
  if (!_serverEnv) _serverEnv = parseServerEnv();
  return _serverEnv;
}

export function getClientEnv(): ClientEnv {
  if (!_clientEnv) _clientEnv = parseClientEnv();
  return _clientEnv;
}

// Eager validation:
//   - On the server: validate server env at module load so misconfiguration
//     blows up at startup, not at first request.
//   - On the client: skip eager validation here; consumers call getClientEnv()
//     where needed. Eager parsing on the client would pull NEXT_PUBLIC_*
//     into bundles that don't use them.
if (isServer()) {
  getServerEnv();
}

export const PACKAGE_NAME = '@luxematch/config';

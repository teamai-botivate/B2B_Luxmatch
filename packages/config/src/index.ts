import { z } from 'zod';

const ServerEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  QDRANT_URL: z.string().url('QDRANT_URL must be a valid URL'),
  QDRANT_API_KEY: z.string().min(1, 'QDRANT_API_KEY is required'),
  QDRANT_COLLECTION: z.string().min(1).default('luxematch_products'),
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

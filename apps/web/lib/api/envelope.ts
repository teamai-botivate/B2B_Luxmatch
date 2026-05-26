import type { ApiError } from '@luxematch/types';
import type { Context } from 'hono';
import { randomUUID } from 'node:crypto';

type StatusCode = 200 | 201 | 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 502 | 503;

export function sendData<T>(c: Context, data: T, status: StatusCode = 200) {
  // hono types want a narrower status union; cast is fine since we pass valid codes
  return c.json({ data }, status as 200);
}

export function sendError(
  c: Context,
  code: ApiError['code'],
  message: string,
  status: StatusCode,
  details?: ApiError['details'],
) {
  const err: ApiError = {
    code,
    message,
    requestId: randomUUID(),
    ...(details ? { details } : {}),
  };
  return c.json({ error: err }, status as 400);
}

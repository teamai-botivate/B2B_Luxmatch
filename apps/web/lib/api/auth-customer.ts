import { getServerEnv } from '@luxematch/config';
import {
  getCustomerByEmail,
  getCustomerById,
  getOrCreateCustomer,
  updateCustomerAvatar,
  updateCustomerName,
} from '@luxematch/db';
import {
  deleteAsset,
  generateSignedUploadParams,
  publicIdBelongsToJeweller,
} from '@luxematch/cloudinary';
import { createClient } from '@supabase/supabase-js';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { deleteCookie, setCookie } from 'hono/cookie';
import { z } from 'zod';

import {
  CUSTOMER_COOKIE_NAME,
  CUSTOMER_COOKIE_TTL,
  readCustomerCookie,
  signCustomerCookie,
  verifyCustomerCookie,
} from '../customer-auth';
import { sendData, sendError } from './envelope';
import { tenantMiddleware } from './middleware';

type Vars = { Variables: { shopJewellerId: string } };

export const authCustomerRoutes = new Hono<Vars>();
authCustomerRoutes.use('*', tenantMiddleware);

function getSupabaseAuthClient() {
  const env = getServerEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// POST /api/customer/send-otp   { email, phone }
const SendOtpBody = z.object({
  email: z.string().email(),
  phone: z.string().min(10).max(15),
  name: z.string().min(1).max(120).optional(),
});
authCustomerRoutes.post('/send-otp', zValidator('json', SendOtpBody), async (c) => {
  const jewellerId = c.get('shopJewellerId');
  const { email, phone, name } = c.req.valid('json');
  const supabase = getSupabaseAuthClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      data: {
        // Metadata is convenience-only. Tenancy is enforced by the app DB
        // customer row and signed lm_customer cookie, not by JWT metadata.
        phone,
        name,
        jeweller_id: jewellerId,
      },
    },
  });

  if (error) {
    const status = (error as { status?: number }).status;
    const code = status === 429 ? 'rate_limited' : 'bad_request';
    const responseStatus = status === 429 ? 429 : 400;

    // Surface the underlying Supabase Auth reason in server logs — the client
    // only sees a generic message. Common causes: email signups disabled,
    // no SMTP configured in the Supabase dashboard, or auth rate limiting.
    console.error('[send-otp] supabase signInWithOtp failed', {
      status,
      code: (error as { code?: string }).code,
      message: error.message,
    });
    return sendError(c, code, error.message, responseStatus);
  }

  return sendData(c, {
    sent: true,
    message: `OTP sent to ${email}`,
  });
});

// POST /api/customer/verify-otp  { email, phone, otp, name?, password? }
//
// This is the one-time email verification step of sign-up. The OTP confirms the
// email; the password (set here via updateUser on the freshly-authenticated
// session) becomes the customer's primary credential for every future sign-in.
const VerifyOtpBody = z.object({
  email: z.string().email(),
  phone: z.string().min(10).max(15),
  otp: z.string().regex(/^\d{6,8}$/, 'OTP must be 6–8 digits'),
  name: z.string().min(1).max(120).optional(),
  password: z.string().min(6).max(72).optional(),
});
authCustomerRoutes.post('/verify-otp', zValidator('json', VerifyOtpBody), async (c) => {
  const jewellerId = c.get('shopJewellerId');
  const env = getServerEnv();
  const { email, phone, otp, name, password } = c.req.valid('json');
  const supabase = getSupabaseAuthClient();

  const { error } = await supabase.auth.verifyOtp({
    email,
    token: otp,
    type: 'email',
  });
  if (error) return sendError(c, 'unauthorized', 'Incorrect or expired OTP', 401);

  // verifyOtp leaves an active session on this client instance, so updateUser
  // sets the password against the just-verified account.
  if (password) {
    const { error: pwError } = await supabase.auth.updateUser({ password });
    if (pwError) {
      console.error('[verify-otp] failed to set password', { message: pwError.message });
      return sendError(c, 'bad_request', pwError.message, 400);
    }
  }

  const customer = await getOrCreateCustomer(jewellerId, phone, email);
  if (name && !customer.name) {
    await updateCustomerName(jewellerId, customer.id, name);
  }

  const cookie = await signCustomerCookie(
    { customerId: customer.id, phone, email, name: name ?? customer.name },
    env.LM_PIN_COOKIE_SECRET,
  );

  setCookie(c, CUSTOMER_COOKIE_NAME, cookie, {
    httpOnly: true,
    sameSite: 'Lax',
    maxAge: CUSTOMER_COOKIE_TTL,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  });

  return sendData(c, { customerId: customer.id, phone, email, name: name ?? customer.name });
});

// POST /api/customer/signin  { email, password }
//
// Primary sign-in path: authenticate the password against Supabase Auth, then
// resolve the shop-scoped customer row by email. OTP is no longer used here — it
// only runs once during sign-up to verify the email.
const SignInBody = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(72),
});
authCustomerRoutes.post('/signin', zValidator('json', SignInBody), async (c) => {
  const jewellerId = c.get('shopJewellerId');
  const env = getServerEnv();
  const { email, password } = c.req.valid('json');
  const supabase = getSupabaseAuthClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return sendError(c, 'unauthorized', 'Incorrect email or password', 401);

  const customer = await getCustomerByEmail(jewellerId, email);
  if (!customer) {
    return sendError(c, 'not_found', 'No account found for this store. Please create one first.', 404);
  }

  const cookie = await signCustomerCookie(
    { customerId: customer.id, phone: customer.phone, email, name: customer.name },
    env.LM_PIN_COOKIE_SECRET,
  );
  setCookie(c, CUSTOMER_COOKIE_NAME, cookie, {
    httpOnly: true,
    sameSite: 'Lax',
    maxAge: CUSTOMER_COOKIE_TTL,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  });

  return sendData(c, { customerId: customer.id, phone: customer.phone, email, name: customer.name });
});

// GET /api/customer/me
authCustomerRoutes.get('/me', async (c) => {
  const env = getServerEnv();
  const jewellerId = c.get('shopJewellerId');
  const result = await verifyCustomerCookie(readCustomerCookie(c), env.LM_PIN_COOKIE_SECRET);
  if (!result.valid) return sendError(c, 'unauthorized', 'Not logged in', 401);

  // Read mutable fields (name, avatar) fresh from the DB so changes made after
  // login show up without re-issuing the signed cookie.
  const row = await getCustomerById(jewellerId, result.payload.customerId);
  return sendData(c, {
    ...result.payload,
    name: row?.name ?? result.payload.name,
    avatarUrl: row?.avatar_url ?? null,
  });
});

// POST /api/customer/logout
authCustomerRoutes.post('/logout', async (c) => {
  deleteCookie(c, CUSTOMER_COOKIE_NAME, { path: '/' });
  return sendData(c, { ok: true });
});

// POST /api/customer/profile   { name, email }
const ProfileBody = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
});
authCustomerRoutes.post('/profile', zValidator('json', ProfileBody), async (c) => {
  const env = getServerEnv();
  const jewellerId = c.get('shopJewellerId');
  const session = await verifyCustomerCookie(readCustomerCookie(c), env.LM_PIN_COOKIE_SECRET);
  if (!session.valid) return sendError(c, 'unauthorized', 'Not logged in', 401);

  const { name, email } = c.req.valid('json');
  if (name || email) {
    const { updateCustomerName: upd } = await import('@luxematch/db');
    await upd(jewellerId, session.payload.customerId, name ?? session.payload.name ?? '', email);
  }
  return sendData(c, { ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// Profile picture (DP)
//
// File lives in Cloudinary (luxematch/<jewellerId>/avatars/); Postgres stores
// only the secure_url + public_id. All three routes are customer-gated via the
// signed lm_customer cookie.
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/customer/avatar/sign — short-lived signed upload params for the
// avatars bucket. The public_id is forced to the customer id so a re-upload
// overwrites the previous file instead of accumulating orphans.
authCustomerRoutes.post('/avatar/sign', async (c) => {
  const env = getServerEnv();
  const jewellerId = c.get('shopJewellerId');
  const session = await verifyCustomerCookie(readCustomerCookie(c), env.LM_PIN_COOKIE_SECRET);
  if (!session.valid) return sendError(c, 'unauthorized', 'Not logged in', 401);

  const params = generateSignedUploadParams({
    jewellerId,
    bucket: 'avatars',
    publicId: `avatar_${session.payload.customerId}`,
  });
  return sendData(c, params);
});

// POST /api/customer/avatar  { url, public_id } — persist the uploaded asset
// and destroy the previous one if it changed.
const AvatarBody = z.object({
  url: z.string().url(),
  public_id: z.string().min(1).max(200),
});
authCustomerRoutes.post('/avatar', zValidator('json', AvatarBody), async (c) => {
  const env = getServerEnv();
  const jewellerId = c.get('shopJewellerId');
  const session = await verifyCustomerCookie(readCustomerCookie(c), env.LM_PIN_COOKIE_SECRET);
  if (!session.valid) return sendError(c, 'unauthorized', 'Not logged in', 401);

  const { url, public_id } = c.req.valid('json');
  // Reject a public_id outside this shop's folder — the client signs the upload,
  // but never trust the round-tripped id.
  if (!publicIdBelongsToJeweller(public_id, jewellerId)) {
    return sendError(c, 'forbidden', 'Asset does not belong to this shop', 403);
  }

  const { previousPublicId } = await updateCustomerAvatar(jewellerId, session.payload.customerId, {
    url,
    publicId: public_id,
  });
  if (previousPublicId && previousPublicId !== public_id) {
    void deleteAsset(previousPublicId); // fire-and-forget cleanup
  }
  return sendData(c, { avatarUrl: url });
});

// DELETE /api/customer/avatar — clear avatar and remove the Cloudinary asset.
authCustomerRoutes.delete('/avatar', async (c) => {
  const env = getServerEnv();
  const jewellerId = c.get('shopJewellerId');
  const session = await verifyCustomerCookie(readCustomerCookie(c), env.LM_PIN_COOKIE_SECRET);
  if (!session.valid) return sendError(c, 'unauthorized', 'Not logged in', 401);

  const { previousPublicId } = await updateCustomerAvatar(jewellerId, session.payload.customerId, {
    url: null,
    publicId: null,
  });
  if (previousPublicId) void deleteAsset(previousPublicId);
  return sendData(c, { ok: true });
});

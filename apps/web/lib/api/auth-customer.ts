import { getServerEnv } from '@luxematch/config';
import {
  createOtp,
  getOrCreateCustomer,
  updateCustomerName,
  verifyOtp,
} from '@luxematch/db';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { deleteCookie, setCookie } from 'hono/cookie';
import { z } from 'zod';

import {
  CUSTOMER_COOKIE_NAME,
  CUSTOMER_COOKIE_TTL,
  signCustomerCookie,
  verifyCustomerCookie,
} from '../customer-auth';
import { sendData, sendError } from './envelope';
import { tenantMiddleware } from './middleware';

type Vars = { Variables: { shopJewellerId: string } };

export const authCustomerRoutes = new Hono<Vars>();
authCustomerRoutes.use('*', tenantMiddleware);

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// POST /api/customer/send-otp   { phone }
const SendOtpBody = z.object({ phone: z.string().min(10).max(15) });
authCustomerRoutes.post('/send-otp', zValidator('json', SendOtpBody), async (c) => {
  const jewellerId = c.get('shopJewellerId');
  const { phone } = c.req.valid('json');
  const otp = generateOtp();
  await createOtp(jewellerId, phone, otp);
  // The OTP must never leave the server in production — anyone could log in
  // as any phone number. Outside production it is returned so the demo UI
  // can display it (no SMS provider is wired up yet).
  const isProduction = getServerEnv().NODE_ENV === 'production';
  return sendData(c, {
    sent: true,
    ...(isProduction ? {} : { demo_otp: otp }),
    message: isProduction
      ? `OTP sent to ${phone}`
      : `OTP sent to ${phone} (demo: shown below)`,
  });
});

// POST /api/customer/verify-otp  { phone, otp }
const VerifyOtpBody = z.object({
  phone: z.string().min(10).max(15),
  otp: z.string().length(6),
  name: z.string().min(1).max(120).optional(),
});
authCustomerRoutes.post('/verify-otp', zValidator('json', VerifyOtpBody), async (c) => {
  const jewellerId = c.get('shopJewellerId');
  const env = getServerEnv();
  const { phone, otp, name } = c.req.valid('json');

  const valid = await verifyOtp(jewellerId, phone, otp);
  if (!valid) return sendError(c, 'unauthorized', 'Incorrect or expired OTP', 401);

  const customer = await getOrCreateCustomer(jewellerId, phone);
  if (name && !customer.name) {
    await updateCustomerName(jewellerId, customer.id, name);
  }

  const cookie = await signCustomerCookie(
    { customerId: customer.id, phone, name: name ?? customer.name },
    env.LM_PIN_COOKIE_SECRET,
  );

  setCookie(c, CUSTOMER_COOKIE_NAME, cookie, {
    httpOnly: true,
    sameSite: 'Lax',
    maxAge: CUSTOMER_COOKIE_TTL,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  });

  return sendData(c, { customerId: customer.id, phone, name: name ?? customer.name });
});

// GET /api/customer/me
authCustomerRoutes.get('/me', async (c) => {
  const env = getServerEnv();
  const cookie = c.req.header('cookie')
    ?.split(';')
    .find(s => s.trim().startsWith(CUSTOMER_COOKIE_NAME + '='))
    ?.split('=')
    .slice(1)
    .join('=')
    .trim();

  const result = await verifyCustomerCookie(cookie, env.LM_PIN_COOKIE_SECRET);
  if (!result.valid) return sendError(c, 'unauthorized', 'Not logged in', 401);
  return sendData(c, result.payload);
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
  const cookie = c.req.header('cookie')
    ?.split(';')
    .find(s => s.trim().startsWith(CUSTOMER_COOKIE_NAME + '='))
    ?.split('=')
    .slice(1)
    .join('=')
    .trim();

  const session = await verifyCustomerCookie(cookie, env.LM_PIN_COOKIE_SECRET);
  if (!session.valid) return sendError(c, 'unauthorized', 'Not logged in', 401);

  const { name, email } = c.req.valid('json');
  if (name || email) {
    const { updateCustomerName: upd } = await import('@luxematch/db');
    await upd(jewellerId, session.payload.customerId, name ?? session.payload.name ?? '', email);
  }
  return sendData(c, { ok: true });
});

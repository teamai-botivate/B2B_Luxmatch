import { getServerEnv } from '@luxematch/config';
import {
  getStoreManagerByEmailGlobal,
  listStoreManagers,
  createStoreManager,
  updateStoreManager,
  deleteStoreManager,
  updateStoreManagerPassword,
  getStoreById,
  createPasswordResetToken,
  verifyPasswordResetToken,
  consumePasswordResetToken,
  getGuestOrdersByStorePending,
  getGuestOrderWithItems,
  approveKioskOrder,
  rejectKioskOrder,
  getB2BOrdersPendingByStore,
  getB2BOrderWithItems,
  approveB2BOrder,
  rejectB2BOrder,
  listCustomDesignRequests,
  getCustomDesignRequest,
  rejectCustomDesignRequest,
  forwardCustomDesignToManufacturer,
  getStoreByJewellerId,
  formatStoreFixedAddress,
} from '@luxematch/db';
import { hash } from 'bcryptjs';
import {
  STORE_MANAGER_COOKIE_NAME,
  issueStoreManagerCookie,
  verifyStoreManagerCookie,
} from '@luxematch/tenant';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { compare } from 'bcryptjs';
import { z } from 'zod';

import { sendData, sendError } from './envelope';
import { managerGuard, storeGuard } from './middleware';

type Vars = {
  Variables: {
    shopJewellerId: string;
    storeId: string;
    managerId: string;
    isOwner: boolean;
  };
};

export const storeManagerRoutes = new Hono<Vars>();

// ── Auth (public) ─────────────────────────────────────────────────────────────

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/manager/login
storeManagerRoutes.post('/login', zValidator('json', LoginBody), async (c) => {
  const env = getServerEnv();
  const { email, password } = c.req.valid('json');

  const row = await getStoreManagerByEmailGlobal(email);
  if (!row || !row.is_active) {
    return sendError(c, 'unauthorized', 'Invalid email or password', 401);
  }
  const ok = await compare(password, row.password_hash);
  if (!ok) return sendError(c, 'unauthorized', 'Invalid email or password', 401);

  // Resolve jewellerId from store
  const store = await getStoreById(row.store_id);
  if (!store?.jeweller_id) {
    return sendError(c, 'internal_error', 'Store has no linked jeweller account', 500);
  }

  const cookie = await issueStoreManagerCookie(row.id, row.store_id, store.jeweller_id, {
    secret: env.LM_PIN_COOKIE_SECRET,
    ttlSeconds: env.LM_STORE_COOKIE_TTL_SECONDS,
  });
  setCookie(c, cookie.name, cookie.value, cookie.options);
  return sendData(c, {
    id: row.id,
    naam: row.naam,
    email: row.email,
    storeId: row.store_id,
    jewellerId: store.jeweller_id,
  });
});

// POST /api/manager/logout
storeManagerRoutes.post('/logout', (c) => {
  deleteCookie(c, STORE_MANAGER_COOKIE_NAME, { path: '/' });
  return sendData(c, { ok: true });
});

// GET /api/manager/me
storeManagerRoutes.get('/me', managerGuard, async (c) => {
  const env = getServerEnv();
  const managerCookieRaw = getCookie(c, STORE_MANAGER_COOKIE_NAME);
  const isOwner = c.get('isOwner');
  if (isOwner) {
    return sendData(c, {
      role: 'owner',
      storeId: c.get('storeId'),
      jewellerId: c.get('shopJewellerId'),
    });
  }
  const result = await verifyStoreManagerCookie(managerCookieRaw, {
    secret: env.LM_PIN_COOKIE_SECRET,
    ttlSeconds: env.LM_STORE_COOKIE_TTL_SECONDS,
  });
  if (!result.valid) return sendError(c, 'unauthorized', 'Not authenticated', 401);
  return sendData(c, {
    role: 'manager',
    managerId: result.managerId,
    storeId: result.storeId,
    jewellerId: result.jewellerId,
  });
});

// ── Manager CRUD (owner only) ─────────────────────────────────────────────────
// All routes below: lm_store cookie required (owner only can manage managers)

const CreateManagerBody = z.object({
  naam: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
});

// GET /api/manager/list — list managers for this store
storeManagerRoutes.get('/list', storeGuard, async (c) => {
  const managers = await listStoreManagers(c.get('storeId'));
  return sendData(c, managers);
});

// POST /api/manager — create manager (store owner only)
storeManagerRoutes.post('/', storeGuard, zValidator('json', CreateManagerBody), async (c) => {
  const body = c.req.valid('json');
  const passwordHash = await hash(body.password, 10);
  try {
    const manager = await createStoreManager({
      store_id: c.get('storeId'),
      naam: body.naam,
      email: body.email,
      password_hash: passwordHash,
      phone: body.phone,
      created_by: c.get('storeId'),
    });
    return sendData(c, manager, 201);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return sendError(c, 'conflict', 'Email already registered', 409);
    }
    return sendError(c, 'internal_error', msg, 500);
  }
});

// PATCH /api/manager/:id — update manager info
storeManagerRoutes.patch(
  '/:id',
  storeGuard,
  zValidator(
    'json',
    z.object({
      naam: z.string().min(2).optional(),
      phone: z.string().optional(),
      is_active: z.boolean().optional(),
    }),
  ),
  async (c) => {
    // updateStoreManager(storeId, managerId, input)
    await updateStoreManager(c.get('storeId'), c.req.param('id'), c.req.valid('json'));
    return sendData(c, { ok: true });
  },
);

// PUT /api/manager/:id/password — reset manager password
storeManagerRoutes.put(
  '/:id/password',
  storeGuard,
  zValidator('json', z.object({ password: z.string().min(6) })),
  async (c) => {
    const passwordHash = await hash(c.req.valid('json').password, 10);
    await updateStoreManagerPassword(c.req.param('id'), passwordHash);
    return sendData(c, { ok: true });
  },
);

// DELETE /api/manager/:id
storeManagerRoutes.delete('/:id', storeGuard, async (c) => {
  // deleteStoreManager(storeId, managerId)
  await deleteStoreManager(c.get('storeId'), c.req.param('id'));
  return sendData(c, { ok: true });
});

// ── Forgot / Reset password (public) ─────────────────────────────────────────

const ForgotPasswordBody = z.object({
  email: z.string().email(),
});

// POST /api/manager/forgot-password
storeManagerRoutes.post(
  '/forgot-password',
  zValidator('json', ForgotPasswordBody),
  async (c) => {
    const { email } = c.req.valid('json');
    // Look up manager globally; always return 200 to avoid email enumeration
    try {
      const manager = await getStoreManagerByEmailGlobal(email);
      if (manager && manager.is_active) {
        const token = await createPasswordResetToken(email, 'store_manager', manager.store_id);
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
        const resetLink = `${appUrl}/store/manager/reset-password?token=${token}`;

        // Send email via nodemailer (fire-and-forget; skip if SMTP not configured)
        const env = getServerEnv();
        if (
          env.SMTP_HOST &&
          env.SMTP_PORT &&
          env.SMTP_USER &&
          env.SMTP_PASS &&
          env.SMTP_FROM_EMAIL
        ) {
          const nodemailer = await import('nodemailer');
          const transporter = nodemailer.default.createTransport({
            host: env.SMTP_HOST,
            port: env.SMTP_PORT,
            secure: env.SMTP_PORT === 465,
            auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
          });
          transporter
            .sendMail({
              from: `"${env.SMTP_FROM_NAME ?? 'Jewel Factory'}" <${env.SMTP_FROM_EMAIL}>`,
              to: email,
              subject: 'Reset your Jewel Factory manager password',
              text: `Hi ${manager.naam},\n\nClick the link below to reset your password (valid for 1 hour):\n\n${resetLink}\n\nIf you did not request this, ignore this email.`,
              html: `<p>Hi ${manager.naam},</p><p>Click the link below to reset your manager password (valid for 1 hour):</p><p><a href="${resetLink}">${resetLink}</a></p><p>If you did not request this, ignore this email.</p>`,
            })
            .catch((err: unknown) => {
              console.error('[forgot-password/manager] Email send failed:', err);
            });
        } else {
          console.warn('[forgot-password/manager] SMTP not configured; reset link:', resetLink);
        }
      }
    } catch (err) {
      console.error('[forgot-password/manager] Error:', err);
    }
    // Always return generic 200 (don't reveal whether email exists)
    return sendData(c, { ok: true });
  },
);

const ResetPasswordBody = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
});

// POST /api/manager/reset-password
storeManagerRoutes.post(
  '/reset-password',
  zValidator('json', ResetPasswordBody),
  async (c) => {
    const { token, password } = c.req.valid('json');

    const tokenRow = await verifyPasswordResetToken(token, 'store_manager');
    if (!tokenRow) {
      return sendError(c, 'bad_request', 'Reset link is invalid or has expired', 400);
    }

    // Look up manager by email to get their id
    const manager = await getStoreManagerByEmailGlobal(tokenRow.email);
    if (!manager) {
      return sendError(c, 'not_found', 'Manager account not found', 404);
    }

    const passwordHash = await hash(password, 10);
    await updateStoreManagerPassword(manager.id, passwordHash);
    await consumePasswordResetToken(tokenRow.id);

    return sendData(c, { ok: true });
  },
);

// ── Kiosk order approvals (C13) ───────────────────────────────────────────────

// GET /api/manager/kiosk-orders/pending
storeManagerRoutes.get('/kiosk-orders/pending', managerGuard, async (c) => {
  const orders = await getGuestOrdersByStorePending(c.get('storeId'));
  return sendData(c, orders);
});

// POST /api/manager/kiosk-orders/:id/approve
storeManagerRoutes.post('/kiosk-orders/:id/approve', managerGuard, async (c) => {
  const order = await getGuestOrderWithItems(c.req.param('id'));
  if (!order) return sendError(c, 'not_found', 'Order not found', 404);
  if (order.store_id !== c.get('storeId')) return sendError(c, 'forbidden', 'Not your order', 403);
  await approveKioskOrder(order.id, c.get('managerId'));
  return sendData(c, { ok: true });
});

// POST /api/manager/kiosk-orders/:id/reject
storeManagerRoutes.post('/kiosk-orders/:id/reject', managerGuard, async (c) => {
  const order = await getGuestOrderWithItems(c.req.param('id'));
  if (!order) return sendError(c, 'not_found', 'Order not found', 404);
  if (order.store_id !== c.get('storeId')) return sendError(c, 'forbidden', 'Not your order', 403);
  await rejectKioskOrder(order.id);
  return sendData(c, { ok: true });
});

// ── B2B order approvals (C14) ─────────────────────────────────────────────────

// GET /api/manager/b2b-orders/pending
storeManagerRoutes.get('/b2b-orders/pending', managerGuard, async (c) => {
  const orders = await getB2BOrdersPendingByStore(c.get('storeId'));
  return sendData(c, orders);
});

// POST /api/manager/b2b-orders/:id/approve
storeManagerRoutes.post('/b2b-orders/:id/approve', managerGuard, async (c) => {
  const order = await getB2BOrderWithItems(c.req.param('id'));
  if (!order) return sendError(c, 'not_found', 'Order not found', 404);
  if (order.store_id !== c.get('storeId')) return sendError(c, 'forbidden', 'Not your order', 403);
  await approveB2BOrder(order.id, c.get('managerId'));
  return sendData(c, { ok: true });
});

// POST /api/manager/b2b-orders/:id/reject
storeManagerRoutes.post('/b2b-orders/:id/reject', managerGuard, async (c) => {
  const order = await getB2BOrderWithItems(c.req.param('id'));
  if (!order) return sendError(c, 'not_found', 'Order not found', 404);
  if (order.store_id !== c.get('storeId')) return sendError(c, 'forbidden', 'Not your order', 403);
  await rejectB2BOrder(order.id);
  return sendData(c, { ok: true });
});

// ── Custom design requests (C16 + C17) ───────────────────────────────────────

// GET /api/manager/custom-designs — list all custom design requests for this store
storeManagerRoutes.get('/custom-designs', managerGuard, async (c) => {
  const requests = await listCustomDesignRequests(c.get('storeId'));
  return sendData(c, requests);
});

// POST /api/manager/custom-designs/:id/approve — approve + forward to manufacturer
storeManagerRoutes.post('/custom-designs/:id/approve', managerGuard, async (c) => {
  const storeId = c.get('storeId');
  const requestId = c.req.param('id');

  const request = await getCustomDesignRequest(storeId, requestId);
  if (!request) return sendError(c, 'not_found', 'Custom design request not found', 404);

  // Resolve store + manufacturer for C17 forwarding
  const store = await getStoreByJewellerId(c.get('shopJewellerId'));
  if (!store) return sendError(c, 'not_found', 'Store not found', 404);
  if (!store.manufacturer_id) {
    return sendError(c, 'bad_request', 'Store is not linked to a manufacturer', 400);
  }

  const storeAddress = formatStoreFixedAddress(store);

  await forwardCustomDesignToManufacturer(
    storeId,
    requestId,
    store.manufacturer_id,
    store.name,
    storeAddress,
    c.get('managerId'),
  );

  return sendData(c, { ok: true });
});

// POST /api/manager/custom-designs/:id/reject
storeManagerRoutes.post('/custom-designs/:id/reject', managerGuard, async (c) => {
  const storeId = c.get('storeId');
  const requestId = c.req.param('id');

  const request = await getCustomDesignRequest(storeId, requestId);
  if (!request) return sendError(c, 'not_found', 'Custom design request not found', 404);

  await rejectCustomDesignRequest(storeId, requestId, c.get('managerId'));
  return sendData(c, { ok: true });
});

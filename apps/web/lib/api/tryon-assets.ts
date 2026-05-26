import { deleteAsset } from '@luxematch/cloudinary';
import {
  addTryOnAsset,
  removeTryOnAssetById,
  updateTryOnAsset,
} from '@luxematch/db';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { sendData, sendError } from './envelope';
import { pinGuard, tenantMiddleware } from './middleware';

type Vars = { Variables: { shopJewellerId: string } };

export const tryOnAssetRoutes = new Hono<Vars>();

tryOnAssetRoutes.use('*', tenantMiddleware);

// ────────────────────────────────────────────────────────────────────────────
// Shared shapes
// ────────────────────────────────────────────────────────────────────────────

const JewelleryType = z.enum([
  'necklace',
  'earring_left',
  'earring_right',
  'ring_index',
  'ring_middle',
  'bangle',
]);

// ────────────────────────────────────────────────────────────────────────────
// POST /api/tryon-assets  // PIN GUARD
//
// Body shape mirrors what MediaUploader returns + the calibration fields.
// We always set is_active=true on create — the jeweller can publish/unpublish
// via PATCH later.
// ────────────────────────────────────────────────────────────────────────────

const CreateBody = z.object({
  productId: z.string().uuid(),
  cloudinaryPublicId: z.string().min(1),
  assetUrl: z.string().url(),
  jewelleryType: JewelleryType,
  pivotX: z.number().min(0).max(1).optional(),
  pivotY: z.number().min(0).max(1).optional(),
  xOffset: z.number().optional(),
  yOffset: z.number().optional(),
  scaleMultiplier: z.number().positive().optional(),
  rotationOffsetDeg: z.number().optional(),
  widthMm: z.number().positive().nullable().optional(),
  heightMm: z.number().positive().nullable().optional(),
  isActive: z.boolean().optional(),
});

tryOnAssetRoutes.post('/', pinGuard, zValidator('json', CreateBody), async (c) => {
  const jewellerId = c.get('shopJewellerId');
  const body = c.req.valid('json');
  try {
    const row = await addTryOnAsset(jewellerId, {
      productId: body.productId,
      cloudinaryPublicId: body.cloudinaryPublicId,
      assetUrl: body.assetUrl,
      jewelleryType: body.jewelleryType,
      pivotX: body.pivotX,
      pivotY: body.pivotY,
      xOffset: body.xOffset,
      yOffset: body.yOffset,
      scaleMultiplier: body.scaleMultiplier,
      rotationOffsetDeg: body.rotationOffsetDeg,
      widthMm: body.widthMm ?? undefined,
      heightMm: body.heightMm ?? undefined,
      isActive: body.isActive,
    });
    return sendData(c, row, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/does not belong/i.test(msg)) {
      return sendError(c, 'forbidden', msg, 403);
    }
    return sendError(c, 'internal_error', msg, 500);
  }
});

// ────────────────────────────────────────────────────────────────────────────
// PATCH /api/tryon-assets/:id  // PIN GUARD
//
// All fields optional. Ownership is verified by updateTryOnAsset via the
// products join — passing a foreign id returns null and we 404.
// ────────────────────────────────────────────────────────────────────────────

const PatchBody = z.object({
  pivotX: z.number().min(0).max(1).optional(),
  pivotY: z.number().min(0).max(1).optional(),
  xOffset: z.number().optional(),
  yOffset: z.number().optional(),
  scaleMultiplier: z.number().positive().optional(),
  rotationOffsetDeg: z.number().optional(),
  widthMm: z.number().positive().nullable().optional(),
  heightMm: z.number().positive().nullable().optional(),
  isActive: z.boolean().optional(),
  jewelleryType: JewelleryType.optional(),
});

tryOnAssetRoutes.patch(
  '/:id',
  pinGuard,
  zValidator('json', PatchBody),
  async (c) => {
    const jewellerId = c.get('shopJewellerId');
    const id = c.req.param('id');
    const body = c.req.valid('json');
    const row = await updateTryOnAsset(jewellerId, id, {
      pivotX: body.pivotX,
      pivotY: body.pivotY,
      xOffset: body.xOffset,
      yOffset: body.yOffset,
      scaleMultiplier: body.scaleMultiplier,
      rotationOffsetDeg: body.rotationOffsetDeg,
      widthMm: body.widthMm ?? undefined,
      heightMm: body.heightMm ?? undefined,
      isActive: body.isActive,
      jewelleryType: body.jewelleryType,
    });
    if (!row) {
      return sendError(c, 'not_found', 'Asset not found', 404);
    }
    return sendData(c, row);
  },
);

// ────────────────────────────────────────────────────────────────────────────
// DELETE /api/tryon-assets/:id  // PIN GUARD
//
// Removes the row and best-effort cleans up the Cloudinary asset. The
// Cloudinary call is fire-and-forget — if it fails the DB has already been
// reconciled, and a janitor script can sweep orphans later.
// ────────────────────────────────────────────────────────────────────────────

tryOnAssetRoutes.delete('/:id', pinGuard, async (c) => {
  const jewellerId = c.get('shopJewellerId');
  const id = c.req.param('id');
  const removed = await removeTryOnAssetById(jewellerId, id);
  if (!removed) {
    return sendError(c, 'not_found', 'Asset not found', 404);
  }
  if (removed.cloudinaryPublicId) {
    // Don't block the response on Cloudinary; log failures.
    void deleteAsset(removed.cloudinaryPublicId).then((r) => {
      if (!r.ok) console.warn('[tryon-assets] Cloudinary cleanup failed:', r.error);
    });
  }
  return sendData(c, { ok: true });
});

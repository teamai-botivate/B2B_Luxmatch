import {
  CLOUDINARY_BUCKETS,
  deleteAsset,
  generateSignedUploadParams,
  publicIdBelongsToJeweller,
} from '@luxematch/cloudinary';
import {
  removeProductImageByPublicId,
  removeTryOnAssetByPublicId,
} from '@luxematch/db';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { sendData, sendError } from './envelope';
import { pinGuard, tenantMiddleware } from './middleware';

type Vars = { Variables: { shopJewellerId: string } };

export const cloudinaryRoutes = new Hono<Vars>();

cloudinaryRoutes.use('*', tenantMiddleware);

// ────────────────────────────────────────────────────────────────────────────
// POST /api/cloudinary/sign-upload  // PIN GUARD
//
// The client receives a short-lived signature scoped to a fixed folder. It
// then posts the file directly to Cloudinary — bytes never touch our server.
// ────────────────────────────────────────────────────────────────────────────

const SignBody = z.object({
  bucket: z.enum(CLOUDINARY_BUCKETS),
  publicId: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-zA-Z0-9_\-./]+$/, 'publicId may only contain a-z, 0-9, _, -, ., /')
    .optional(),
});

cloudinaryRoutes.post(
  '/sign-upload',
  pinGuard,
  zValidator('json', SignBody),
  (c) => {
    const jewellerId = c.get('shopJewellerId');
    const { bucket, publicId } = c.req.valid('json');
    const params = generateSignedUploadParams({ jewellerId, bucket, publicId });
    return sendData(c, params);
  },
);

// ────────────────────────────────────────────────────────────────────────────
// POST /api/cloudinary/delete  // PIN GUARD
//
// Removes the Cloudinary asset AND the matching row in product_images or
// product_tryon_assets. Refuses if the publicId is outside this shop's
// folder prefix.
//
// (POST rather than DELETE because some hosting setups strip request bodies
// on DELETE; the action is mutation either way.)
// ────────────────────────────────────────────────────────────────────────────

const DeleteBody = z.object({
  publicId: z.string().min(1),
});

cloudinaryRoutes.post(
  '/delete',
  pinGuard,
  zValidator('json', DeleteBody),
  async (c) => {
    const jewellerId = c.get('shopJewellerId');
    const { publicId } = c.req.valid('json');

    if (!publicIdBelongsToJeweller(publicId, jewellerId)) {
      return sendError(
        c,
        'forbidden',
        'publicId does not belong to this shop',
        403,
      );
    }

    // Remove the DB row first so a partial failure (Cloudinary up, our DB
    // down) doesn't leave a dangling product_image pointing at a deleted
    // asset. If the asset isn't in either table, we still proceed to
    // Cloudinary destroy() — the asset may have been orphaned.
    const removedImage = await removeProductImageByPublicId(jewellerId, publicId);
    const removedTryOn = removedImage
      ? false
      : await removeTryOnAssetByPublicId(jewellerId, publicId);

    const result = await deleteAsset(publicId);
    if (!result.ok) {
      return sendError(c, 'upstream_failed', result.error, 502);
    }
    return sendData(c, {
      cloudinary: result.result,
      removedImage,
      removedTryOn,
    });
  },
);

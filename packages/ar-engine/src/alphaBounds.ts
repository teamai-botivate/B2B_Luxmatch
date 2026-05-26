/**
 * Scan an HTMLImageElement and return the pixel bounding box of non-transparent
 * pixels. Used to find where the actual jewelry sits inside a PNG that may
 * have huge transparent margins or an off-center subject — the anchor logic
 * downstream uses this to position the overlay correctly regardless of the
 * canvas padding the jeweller's asset happens to have.
 *
 * Same algorithm as the working app.js — downscale to max 512px, read pixels,
 * find the alpha>threshold bounding box.
 */
export type AlphaBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export function computeAlphaBounds(
  img: HTMLImageElement | ImageBitmap,
  alphaThreshold = 12,
): AlphaBounds {
  const w = img.width;
  const h = img.height;
  const scale = Math.min(1, 512 / Math.max(w, h));
  const sw = Math.max(1, Math.round(w * scale));
  const sh = Math.max(1, Math.round(h * scale));

  const cnv = document.createElement('canvas');
  cnv.width = sw;
  cnv.height = sh;
  const ctx = cnv.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return { minX: 0, minY: 0, maxX: w, maxY: h };
  }
  ctx.drawImage(img as CanvasImageSource, 0, 0, sw, sh);

  let minX = sw;
  let minY = sh;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  try {
    const data = ctx.getImageData(0, 0, sw, sh).data;
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const i = (y * sw + x) * 4;
        const a = data[i + 3]!;
        if (a > alphaThreshold) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
          found = true;
        }
      }
    }
  } catch (e) {
    // Usually a CORS taint — Cloudinary URLs must be served with the right
    // CORS headers (image/upload + f_auto/q_auto via res.cloudinary.com
    // sets `Access-Control-Allow-Origin: *` automatically). Fall back to the
    // full image rectangle.
    console.warn('[ar-engine] alpha bounds scan failed (likely CORS):', e);
    return { minX: 0, minY: 0, maxX: w, maxY: h };
  }

  if (!found) return { minX: 0, minY: 0, maxX: w, maxY: h };
  return {
    minX: minX / scale,
    minY: minY / scale,
    maxX: maxX / scale,
    maxY: maxY / scale,
  };
}

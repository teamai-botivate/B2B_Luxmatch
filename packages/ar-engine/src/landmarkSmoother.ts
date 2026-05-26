import { OneEuroFilter } from './oneEuroFilter';

/**
 * A single MediaPipe-style landmark in normalized [0, 1] image coordinates.
 * visibility is present only on pose landmarks.
 */
export type Landmark = {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
};

/**
 * Mirror landmark X coordinates so downstream code works in display-space.
 *
 * MediaPipe receives the raw camera frame; the visible <video> element is
 * CSS-flipped (`transform: scaleX(-1)`) on most front-camera setups. The
 * AR canvas is NOT flipped because Three.js renders into a fresh framebuffer
 * — so we mirror the landmarks once, here, and every consumer (overlay math,
 * smoothing, debug draw) is consistent.
 *
 * Y is untouched. The orthographic camera below is configured Y-down so
 * `y * height` already maps to pixels with origin at top.
 */
export function mirrorLandmarks<T extends Landmark>(landmarks: T[] | null | undefined): T[] | null {
  if (!landmarks) return null;
  const out = new Array<T>(landmarks.length);
  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i]!;
    out[i] = {
      ...lm,
      x: 1.0 - lm.x,
    } as T;
  }
  return out;
}

/**
 * Per-process pool of OneEuro filters keyed by `${kind}:${index}:${axis}`.
 * Lives at module scope so the filter history survives between frames — that
 * history is what makes the smoothing actually smooth.
 */
const filterPool = new Map<string, OneEuroFilter>();

function getFilter(key: string): OneEuroFilter {
  let f = filterPool.get(key);
  if (!f) {
    f = new OneEuroFilter();
    filterPool.set(key, f);
  }
  return f;
}

/**
 * Smooth ONLY the landmark indices we actually use. Smoothing all 500+ face
 * landmarks per frame was the main cause of "tracks fast but positions slowly"
 * — the unused ones added cost without value.
 *
 * @param landmarks  raw landmark array (already mirrored)
 * @param kind       'face' / 'hand' / 'pose' — namespaces the filter keys
 * @param indices    which indices to smooth (see anchors.ts)
 * @param t          frame timestamp in ms
 */
export function smoothLandmarks<T extends Landmark>(
  landmarks: T[] | null | undefined,
  kind: string,
  indices: readonly number[],
  t: number,
): T[] | null {
  if (!landmarks) return null;
  // Shallow-copy so unused indices retain their original objects.
  const out = landmarks.slice();
  for (const i of indices) {
    const lm = landmarks[i];
    if (!lm) continue;
    const kx = `${kind}:${i}:x`;
    const ky = `${kind}:${i}:y`;
    out[i] = {
      ...lm,
      x: getFilter(kx).filter(lm.x, t),
      y: getFilter(ky).filter(lm.y, t),
    } as T;
  }
  return out;
}

/** Reset all smoother state. Call when switching products or restarting tracking. */
export function resetSmootherPool(): void {
  filterPool.clear();
}

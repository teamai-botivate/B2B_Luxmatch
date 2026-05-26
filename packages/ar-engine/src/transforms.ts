import type { Landmark } from './landmarkSmoother';

// The 6 jewellery types LuxeMatch supports. Matches the
// product_tryon_assets.jewellery_type enum in supabase/migrations/0001_init.sql.
export type JewelleryType =
  | 'necklace'
  | 'earring_left'
  | 'earring_right'
  | 'ring_index'
  | 'ring_middle'
  | 'bangle';

export type HandResult = {
  landmarks: Landmark[][];
  handedness?: Array<Array<{ score: number }>>;
};

export type Overlay = {
  /** [x, y] in display-space pixels, or null when nothing is tracked. */
  position: [number, number] | null;
  /** Width (px) of the jewellery's visible content. The renderer uses this to set scale. */
  scale: number;
  /** In-plane rotation (radians). */
  rotationZ: number;
  /** 0..1 — opacity hint for the renderer. */
  confidence: number;
};

// ────────────────────────────────────────────────────────────────────────────
// Internal helpers (same shapes as app.js)
// ────────────────────────────────────────────────────────────────────────────

function dist(a: Landmark, b: Landmark, w: number, h: number): number {
  const dx = (b.x - a.x) * w;
  const dy = (b.y - a.y) * h;
  return Math.sqrt(dx * dx + dy * dy);
}

function headRollZ(faceLMs: Landmark[], w: number, h: number): number {
  // After mirrorLandmarks(), index 33 is on screen-RIGHT and 263 on screen-LEFT.
  // The Three.js orthographic camera is configured Y-down, which flips the
  // sign convention of Z-rotation. atan2 directly (no negation) makes the
  // overlay tilt with the head.
  const screenLeftEye = faceLMs[263];
  const screenRightEye = faceLMs[33];
  if (!screenLeftEye || !screenRightEye) return 0;
  const dx = (screenRightEye.x - screenLeftEye.x) * w;
  const dy = (screenRightEye.y - screenLeftEye.y) * h;
  return Math.atan2(dy, dx);
}

type PickedHand = { landmarks: Landmark[]; score: number };

function pickHand(handResults: HandResult | null): PickedHand | null {
  if (!handResults || !handResults.landmarks || handResults.landmarks.length === 0) {
    return null;
  }
  const landmarks = handResults.landmarks[0]!;
  const score = handResults.handedness?.[0]?.[0]?.score ?? 0.9;
  return { landmarks, score };
}

/**
 * Ring placement: position interpolated between MCP and PIP, rotation
 * perpendicular to the finger bone, scale tied to adjacent-finger distance
 * (a proxy for finger width).
 */
function placeRing(
  mcp: Landmark,
  pip: Landmark,
  adjMcp: Landmark,
  t: number,
  w: number,
  h: number,
): [[number, number], number, number] {
  const px = (mcp.x * (1 - t) + pip.x * t) * w;
  const py = (mcp.y * (1 - t) + pip.y * t) * h;

  const dx = (pip.x - mcp.x) * w;
  const dy = (pip.y - mcp.y) * h;
  // Y-down camera convention: atan2(dy, dx) + π/2 already orients the ring
  // perpendicular to the bone direction.
  const rotationZ = Math.atan2(dy, dx) + Math.PI / 2;

  const fingerWidth = Math.hypot((adjMcp.x - mcp.x) * w, (adjMcp.y - mcp.y) * h);
  const RING_FIT = 1.05;
  return [[px, py], rotationZ, fingerWidth * RING_FIT];
}

// ────────────────────────────────────────────────────────────────────────────
// Public: compute the overlay for the selected jewellery type
// ────────────────────────────────────────────────────────────────────────────

export function computeOverlay(opts: {
  jewelleryType: JewelleryType;
  face: Landmark[] | null;
  hands: HandResult | null;
  pose: Landmark[] | null;
  width: number;
  height: number;
}): Overlay {
  const { jewelleryType, face: faceLMs, hands: handResults, pose: poseLMs, width: w, height: h } = opts;

  const empty: Overlay = { position: null, scale: 1, rotationZ: 0, confidence: 0 };

  if (jewelleryType === 'ring_index') {
    const hand = pickHand(handResults);
    if (!hand) return empty;
    const mcp = hand.landmarks[5];
    const pip = hand.landmarks[6];
    const midMcp = hand.landmarks[9];
    if (!mcp || !pip || !midMcp) return empty;
    const [position, rotationZ, scale] = placeRing(mcp, pip, midMcp, 0.5, w, h);
    return { position, rotationZ, scale, confidence: hand.score };
  }

  if (jewelleryType === 'ring_middle') {
    const hand = pickHand(handResults);
    if (!hand) return empty;
    const mcp = hand.landmarks[9];
    const pip = hand.landmarks[10];
    const ringMcp = hand.landmarks[13];
    if (!mcp || !pip || !ringMcp) return empty;
    const [position, rotationZ, scale] = placeRing(mcp, pip, ringMcp, 0.5, w, h);
    return { position, rotationZ, scale, confidence: hand.score };
  }

  if (jewelleryType === 'bangle') {
    const hand = pickHand(handResults);
    if (!hand) return empty;
    const wrist = hand.landmarks[0];
    const idx = hand.landmarks[5];
    const pnk = hand.landmarks[17];
    const mid = hand.landmarks[9];
    if (!wrist || !idx || !pnk || !mid) return empty;

    const position: [number, number] = [wrist.x * w, wrist.y * h];
    const wristWidth = Math.hypot((pnk.x - idx.x) * w, (pnk.y - idx.y) * h);
    const scale = wristWidth * 1.2;
    const dx = (mid.x - wrist.x) * w;
    const dy = (mid.y - wrist.y) * h;
    // Y-down camera: atan2 + π/2 orients perpendicular to the arm.
    const rotationZ = Math.atan2(dy, dx) + Math.PI / 2;
    return { position, rotationZ, scale, confidence: hand.score };
  }

  if ((jewelleryType === 'earring_left' || jewelleryType === 'earring_right') && faceLMs) {
    const ear = faceLMs[jewelleryType === 'earring_left' ? 234 : 454];
    const leye = faceLMs[33];
    const reye = faceLMs[263];
    if (!ear || !leye || !reye) return empty;
    const ipd = dist(leye, reye, w, h);
    return {
      position: [ear.x * w, ear.y * h],
      scale: ipd * 0.25,
      rotationZ: headRollZ(faceLMs, w, h),
      confidence: 0.95,
    };
  }

  if (jewelleryType === 'necklace' && faceLMs) {
    const chin = faceLMs[152];
    const leye = faceLMs[33];
    const reye = faceLMs[263];
    if (!chin || !leye || !reye) return empty;
    const ipd = dist(leye, reye, w, h);

    const ls = poseLMs?.[11];
    const rs = poseLMs?.[12];
    const shouldersVisible =
      ls && rs && (ls.visibility ?? 1) > 0.5 && (rs.visibility ?? 1) > 0.5;

    let neckCenterX: number;
    let neckY: number;
    let scaleWidth: number;
    let confidence: number;

    if (shouldersVisible && ls && rs) {
      neckCenterX = ((ls.x + rs.x) / 2) * w;
      const shoulderY = ((ls.y + rs.y) / 2) * h;
      const chinY = chin.y * h;
      // pose_landmarker_lite tends to read "shoulders" below the true
      // acromion in close selfie framing. 0.55 of the chin→shoulder span
      // lands the anchor at the collarbone notch where a necklace clasp
      // rests, without pulling the chain onto the chest.
      neckY = chinY + (shoulderY - chinY) * 0.55;
      scaleWidth = dist(ls, rs, w, h) * 0.75;
      confidence = Math.min(ls.visibility ?? 1, rs.visibility ?? 1);
    } else {
      const jawL = faceLMs[132];
      const jawR = faceLMs[361];
      if (!jawL || !jawR) return empty;
      neckCenterX = ((jawL.x + jawR.x) / 2) * w;
      neckY = chin.y * h + ipd * 1.0;
      scaleWidth = dist(jawL, jawR, w, h) * 1.8;
      confidence = 0.85;
    }

    return {
      position: [neckCenterX, neckY],
      scale: scaleWidth,
      rotationZ: headRollZ(faceLMs, w, h),
      confidence,
    };
  }

  return empty;
}

// ────────────────────────────────────────────────────────────────────────────
// Calibration overlay (from product_tryon_assets row)
//
// Applies the jeweller-tuned offsets / scale / rotation on top of the
// automatic placement. Phase 7's calibration tool tweaks these fields live.
// ────────────────────────────────────────────────────────────────────────────

export type Calibration = {
  pivot_x?: number; // 0..1 (currently informational; the renderer uses anchors)
  pivot_y?: number;
  x_offset?: number;
  y_offset?: number;
  scale_multiplier?: number;
  rotation_offset_deg?: number;
};

export function applyCalibration(o: Overlay, c: Calibration | null | undefined): Overlay {
  if (!o.position || !c) return o;
  const [x, y] = o.position;
  return {
    position: [x + (c.x_offset ?? 0), y + (c.y_offset ?? 0)],
    scale: o.scale * (c.scale_multiplier ?? 1),
    rotationZ: o.rotationZ + ((c.rotation_offset_deg ?? 0) * Math.PI) / 180,
    confidence: o.confidence,
  };
}

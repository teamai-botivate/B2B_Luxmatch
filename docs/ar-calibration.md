# AR Calibration — MediaPipe Landmarks, Calibration Fields, and Canvas 2D Transforms

This document specifies how a transparent PNG try-on asset is placed onto a live camera feed using MediaPipe JS landmarks and the Canvas 2D API. All computation runs in the browser; no frames leave the device. See [architecture.md §8–9 and §10.5](./architecture.md) for the surrounding flow.

> **Scope:** 2D placement only. There is no head pose estimation beyond a planar yaw/roll signal derived from landmark pairs. No 3D models, no perspective projection — Canvas 2D `transform()` is sufficient.

---

## 1. Supported jewellery types and their landmark targets

| `jewellery_type` | Landmarker | Primary landmark(s) | Secondary landmark(s) | Anchor (what the asset's pivot is placed on) | Default scale reference |
|---|---|---|---|---|---|
| `necklace` | `FaceLandmarker` | chin **152** | left jaw **234**, right jaw **454**; (shoulder estimate: extrapolate **152** downward by `α·jaw_width`) | the midpoint between the two jaw landmarks, offset downward to the base of the neck | jaw width (`distance(234, 454)`) — the IPD-based formula in §6 is also computed and used when face is near-frontal |
| `earring_left` | `FaceLandmarker` | left ear tragion **234** | `IPD` pair (**468**, **473**) for scale | landmark **234** | IPD |
| `earring_right` | `FaceLandmarker` | right ear tragion **454** | `IPD` pair (**468**, **473**) for scale | landmark **454** | IPD |
| `ring_index` | `HandLandmarker` | index MCP **5** | index PIP **6** | midpoint of **5** and **6** (along the proximal phalanx) | distance(**5**, **6**) |
| `ring_middle` | `HandLandmarker` | middle MCP **9** | middle PIP **10** | midpoint of **9** and **10** | distance(**9**, **10**) |
| `bangle` | `HandLandmarker` | wrist **0** | hand span (e.g. distance(**5**, **17**)) for scale; index MCP **5** + pinky MCP **17** for wrist axis | landmark **0**, offset upward (toward the forearm) along the wrist axis | hand span = distance(**5**, **17**) |

> "Tragion" is being used loosely — MediaPipe's face mesh does not label a true tragion, but landmark **234** (left side of the jaw near the ear) and **454** (right side) are stable, well-lit-in-most-poses anchors for clip-on earrings and necklace endpoints. If a future migration to a different face-mesh head requires a different anchor (e.g. the dedicated face-oval ring), the indices below are the only thing that needs to change.

---

## 2. MediaPipe JS landmark indices

### FaceLandmarker (478 landmarks per face)

The values below are the indices we read into [`@mediapipe/tasks-vision`](https://www.npmjs.com/package/@mediapipe/tasks-vision) `FaceLandmarkerResult.faceLandmarks[0]`. Indices follow the canonical MediaPipe Face Mesh topology.

| Target | Index | Use |
|---|---|---|
| Chin | **152** | necklace anchor (Y baseline) |
| Left jaw edge | **234** | necklace left endpoint; left earring anchor |
| Right jaw edge | **454** | necklace right endpoint; right earring anchor |
| Nose tip | **1** | yaw/roll signal (fallback) |
| Forehead midpoint | **10** | roll signal (paired with **152**) |
| Left iris centre | **468** | IPD endpoint (left) — required for IPD scale; only available when `outputFaceBlendshapes` / iris landmarks are enabled in the `FaceLandmarker` options |
| Right iris centre | **473** | IPD endpoint (right) |
| Left eye outer corner | **33** | IPD fallback if iris landmarks are unavailable (use distance **33** ↔ **263**) |
| Right eye outer corner | **263** | IPD fallback |

**Roll angle (degrees)** — used for `rotation_offset_deg` baseline on face-anchored items:

```ts
const roll = (Math.atan2(landmarks[10].y - landmarks[152].y, landmarks[10].x - landmarks[152].x) * 180) / Math.PI - 90;
```

Yaw is not used in V1 (2D placement; we simply alpha-fade the asset when `|yaw|` exceeds a threshold derived from `distance(468, 473) / distance(33, 263)`).

### HandLandmarker (21 landmarks per hand)

Read from `HandLandmarkerResult.landmarks[handIndex]`. The canonical hand landmark map:

| Target | Index | Use |
|---|---|---|
| Wrist | **0** | bangle anchor |
| Thumb CMC / MCP / IP / TIP | 1 / 2 / 3 / 4 | (not used in V1) |
| Index MCP | **5** | ring_index anchor (base) |
| Index PIP | **6** | ring_index orientation/scale |
| Index DIP / TIP | 7 / 8 | (not used) |
| Middle MCP | **9** | ring_middle anchor (base) |
| Middle PIP | **10** | ring_middle orientation/scale |
| Middle DIP / TIP | 11 / 12 | (not used) |
| Ring MCP / PIP / DIP / TIP | 13 / 14 / 15 / 16 | (reserved for `ring_ring` in a future iteration) |
| Pinky MCP | **17** | bangle scale (paired with **5**) |
| Pinky PIP / DIP / TIP | 18 / 19 / 20 | (not used) |

**Hand orientation (degrees)** — angle of the proximal phalanx, used for ring rotation:

```ts
// for ring_index
const rotIndex = (Math.atan2(landmarks[6].y - landmarks[5].y, landmarks[6].x - landmarks[5].x) * 180) / Math.PI - 90;
// for ring_middle: replace 5 → 9, 6 → 10
```

**Wrist axis (degrees)** — used for bangle rotation:

```ts
const wristAxis = (Math.atan2(landmarks[17].y - landmarks[5].y, landmarks[17].x - landmarks[5].x) * 180) / Math.PI;
```

**Handedness:** `HandLandmarkerResult.handedness[handIndex][0].categoryName` returns `'Left'` or `'Right'`. We use this to mirror the asset for left-handed wear and to disambiguate which hand the user is offering.

---

## 3. Calibration fields

Stored per `try_on_assets` row (see [api-contracts.md → `TryOnAsset`](./api-contracts.md)).

| Field | Type | Units | Meaning |
|---|---|---|---|
| `pivot_x` | `number` (0–1) | normalized | The asset's pivot point on its own PNG, X coordinate. `0` = left edge of the PNG, `1` = right edge. The pivot is the point that lands **on** the chosen anchor landmark. Example: a pair of earrings drawn with the post at `pivot_x = 0.5, pivot_y = 0.05` will hang from the earlobe. |
| `pivot_y` | `number` (0–1) | normalized | Same as above for the Y axis. `0` = top edge of the PNG, `1` = bottom edge. |
| `x_offset` | `number` | landmark-relative pixels (after IPD-normalization — see §4) | Horizontal nudge applied after anchoring to the landmark. Positive moves right. Used to fine-tune asymmetric assets or to push a necklace toward the throat hollow. |
| `y_offset` | `number` | same | Vertical nudge. Positive moves down. Negative pulls a necklace up onto the collarbone. |
| `scale_multiplier` | `number` (positive, typical 0.5–2.0) | unitless | Final multiplier applied **after** the IPD/hand-span scale formula. `1.0` means "the calibrated jeweller-set scale matches reality"; `>1` enlarges. This is the dial the jeweller turns to make a 22mm hoop actually read as 22mm on the average ear. |
| `rotation_offset_deg` | `number` (-180 to 180) | degrees | Added to the landmark-derived rotation (roll for face items, hand axis for ring/bangle items). `0` means "use the landmark's rotation as-is". |
| `width_mm` | `number` (positive) | mm | The true physical width of the piece. Used together with `height_mm` to compute the world-scale-to-pixel ratio in §6. |
| `height_mm` | `number` (positive) | mm | True physical height. |

**Why both `*_offset` and `pivot_*`?** They feel similar but are different controls:

- `pivot_x/y` describes the **PNG itself** — "where on this asset is the contact point?" The jeweller sets this once when uploading.
- `x_offset / y_offset` describes the **placement** — "how far away from the chosen landmark do I want this contact point to land?" Used to tune for face-shape variation without re-shooting the asset.

---

## 4. Mapping calibration fields to the Canvas 2D transform

Per-frame, in the active animation loop:

```ts
const anchor = anchorFromLandmarks(jewellery_type, landmarks);     // {x, y} in canvas px
const refLen = scaleReferencePx(jewellery_type, landmarks);        // IPD px, hand-span px, etc.
const worldPxPerMm = refLen / referenceMm(jewellery_type);          // see §6
const scaleBase = (calibration.width_mm * worldPxPerMm) / pngWidthPx;
const scale = scaleBase * calibration.scale_multiplier;

const baseRot = landmarkRotationDeg(jewellery_type, landmarks);     // roll for face, hand axis for hand
const rotation = baseRot + calibration.rotation_offset_deg;

const offsetX_px = calibration.x_offset * (refLen / referenceLandmarkPx(jewellery_type));
const offsetY_px = calibration.y_offset * (refLen / referenceLandmarkPx(jewellery_type));

const tx = anchor.x + offsetX_px;
const ty = anchor.y + offsetY_px;

// Pivot in PNG pixels:
const pivotPxX = calibration.pivot_x * pngWidthPx;
const pivotPxY = calibration.pivot_y * pngHeightPx;

// One-Euro filter the four signals independently (see §7):
const smTx  = oeTx.filter(tx, now);
const smTy  = oeTy.filter(ty, now);
const smRot = oeRot.filter(rotation, now);
const smScl = oeScl.filter(scale, now);

ctx.save();
ctx.translate(smTx, smTy);
ctx.rotate((smRot * Math.PI) / 180);
ctx.scale(smScl, smScl);
ctx.drawImage(pngOverlay, -pivotPxX, -pivotPxY);
ctx.restore();
```

Notes:
- The pivot is implemented by drawing the image with a negative offset equal to the pivot — Canvas 2D has no first-class pivot for `drawImage`, but `translate → rotate → scale → drawImage(-pivot)` is the canonical idiom.
- For `earring_left` and `earring_right`, the same transform is applied to two different PNGs anchored at two different landmarks; the rotation comes from the same face roll.
- For `bangle`, `rotation_offset_deg` is added to the wrist axis, not to face roll.
- `x_offset / y_offset` are stored in landmark-relative units so a calibration recorded against a model face transfers to a different face at a different distance from the camera. Internally we normalize against IPD for face items and against hand span for hand items — see `referenceLandmarkPx` above.

---

## 5. Default recommended ranges per jewellery type

These are the slider ranges shown to jewellers during the `/jeweller/products/new` try-on calibration step. They are not validation hard-limits (the Zod schemas in [api-contracts.md](./api-contracts.md) only enforce sign and basic bounds), but they are what the UI defaults to.

| `jewellery_type` | `pivot_x` | `pivot_y` | `x_offset` | `y_offset` | `scale_multiplier` | `rotation_offset_deg` | `width_mm` | `height_mm` |
|---|---|---|---|---|---|---|---|---|
| `necklace` | 0.50 (centre) | 0.00 (top — clasp area sits at chin) | -0.10 to 0.10 (default 0) | 0.10 to 0.60 (default 0.30 — sit at throat hollow) | 0.7–1.4 (default 1.0) | -10 to 10 (default 0) | 60–220 | 30–160 |
| `earring_left` | 0.50 | 0.05 (post just below top edge) | -0.10 to 0.10 (default 0) | 0.00 to 0.20 (default 0.05) | 0.6–1.6 (default 1.0) | -15 to 15 (default 0) | 8–60 | 12–80 |
| `earring_right` | 0.50 | 0.05 | -0.10 to 0.10 (default 0) | 0.00 to 0.20 (default 0.05) | 0.6–1.6 (default 1.0) | -15 to 15 (default 0) | 8–60 | 12–80 |
| `ring_index` | 0.50 | 0.50 (centred on the band) | -0.30 to 0.30 (default 0) | -0.30 to 0.30 (default 0) | 0.5–1.8 (default 1.0) | -20 to 20 (default 0) | 8–18 | 8–18 |
| `ring_middle` | 0.50 | 0.50 | -0.30 to 0.30 (default 0) | -0.30 to 0.30 (default 0) | 0.5–1.8 (default 1.0) | -20 to 20 (default 0) | 8–18 | 8–18 |
| `bangle` | 0.50 | 0.50 | -0.30 to 0.30 (default 0) | -0.40 to 0.20 (default -0.10 — sits above the wrist crease) | 0.6–1.5 (default 1.0) | -20 to 20 (default 0) | 50–90 | 50–90 |

---

## 6. IPD-based scale formula

We translate from **physical mm** to **canvas pixels** using a known reference distance.

**For face-anchored items** (necklace, earrings), the reference is the **interpupillary distance (IPD)**. The IPD is well-studied and remarkably stable across the adult population: a mean of **63 mm** with most adults between 54 and 73 mm. We use **63 mm** as the assumed IPD constant.

Let:

- `IPD_px` = pixel distance between landmarks **468** (left iris centre) and **473** (right iris centre) in canvas coordinates. If iris landmarks are unavailable (older FaceLandmarker task asset), fall back to `0.86 × distance(33, 263)` — the empirical ratio of IPD to outer-corner eye width.
- `IPD_MM = 63` — assumed real-world IPD.

Then the world-pixels-per-mm scale is:

```ts
const IPD_MM = 63;
const worldPxPerMm = IPD_px / IPD_MM;

// Asset scale (PNG-pixels → canvas-pixels), before scale_multiplier:
const scaleBase = (calibration.width_mm * worldPxPerMm) / pngWidthPx;
const scale = scaleBase * calibration.scale_multiplier;
```

**For hand-anchored items** (ring_index, ring_middle, bangle), the reference is **hand span** = distance between index MCP (**5**) and pinky MCP (**17**). The population mean for adult hand span at these landmarks is approximately **80 mm**:

```ts
const HAND_SPAN_MM = 80;
const handSpanPx = distance(landmarks[5], landmarks[17]);
const worldPxPerMm = handSpanPx / HAND_SPAN_MM;
```

The same `scaleBase` formula then applies. For finger-width-sensitive items (rings), we additionally clamp the scale so the asset's projected width does not exceed `1.3 × distance(MCP, PIP)` — preventing an obviously oversized ring from being drawn when the hand is far from the camera and the per-finger landmark spacing becomes unreliable.

`scale_multiplier` is the jeweller's per-asset correction on top of this. In practice, scale_multiplier between 0.9 and 1.1 is typical when the assumed IPD/hand-span constants hold; values outside that range usually indicate either an unusual PNG export resolution or that the asset was photographed at a different camera distance than implied by `width_mm`.

---

## 7. One-Euro filter for jitter smoothing

Landmark output jitters frame-to-frame even on a static subject. We smooth the four placement signals (`tx`, `ty`, `rotation`, `scale`) **independently** with a One-Euro filter — a low-pass filter whose cutoff frequency rises with measured speed, so it smooths a still hand and tracks a moving hand without lag.

```ts
// packages/ui/src/tryon/one-euro.ts (illustrative — implementation lives in the try-on bundle)

export interface OneEuroOptions {
  minCutoff: number;   // Hz; lower = more smoothing at rest
  beta: number;        // speed coefficient; higher = less lag when moving
  dCutoff: number;     // Hz; cutoff for the derivative low-pass
}

export class OneEuroFilter {
  private xPrev: number | null = null;
  private dxPrev = 0;
  private tPrev: number | null = null;
  constructor(private opts: OneEuroOptions) {}

  filter(x: number, tNowMs: number): number {
    if (this.xPrev === null || this.tPrev === null) {
      this.xPrev = x;
      this.tPrev = tNowMs;
      return x;
    }
    const dt = Math.max(1e-3, (tNowMs - this.tPrev) / 1000);
    const dx = (x - this.xPrev) / dt;
    const aD = alpha(this.opts.dCutoff, dt);
    const dxHat = aD * dx + (1 - aD) * this.dxPrev;
    const cutoff = this.opts.minCutoff + this.opts.beta * Math.abs(dxHat);
    const a = alpha(cutoff, dt);
    const xHat = a * x + (1 - a) * this.xPrev;
    this.xPrev = xHat;
    this.dxPrev = dxHat;
    this.tPrev = tNowMs;
    return xHat;
  }
}

function alpha(cutoffHz: number, dt: number): number {
  const tau = 1 / (2 * Math.PI * cutoffHz);
  return 1 / (1 + tau / dt);
}
```

**Recommended parameters** — these are the V1 defaults, chosen for the camera frame rate (~30–60 Hz) and the typical user motion when trying on jewellery:

| Signal | `minCutoff` (Hz) | `beta` | `dCutoff` (Hz) | Notes |
|---|---|---|---|---|
| Translation (`tx`, `ty`) — face items | 1.0 | 0.007 | 1.0 | Heavy smoothing at rest; eyes track small head turns smoothly. |
| Translation — hand items | 1.5 | 0.015 | 1.0 | Hands move faster than heads; allow more responsiveness. |
| Rotation (`rotation`) | 1.0 | 0.010 | 1.0 | Roll changes slowly; visible jitter in rotation is the most distracting, so smooth firmly. |
| Scale | 0.5 | 0.005 | 1.0 | Scale jitter (depth bounce) is very visible — smooth even more aggressively. |

These parameters are exposed (read-only) in the try-on settings panel during V1 jeweller QA but are not user-facing on `/try-on`. If a future iteration wants higher responsiveness on /try-on for power users, raise `beta` by ~2× across the board.

**Reference:** Casiez, Roussel, Vogel — *1€ Filter: A Simple Speed-based Low-pass Filter for Noisy Input in Interactive Systems* (CHI 2012). The implementation above is the canonical port; the algorithm is in the public domain.

/**
 * Landmark indices the overlay math actually consumes per stream. We smooth
 * only these (not all ~500 face landmarks) so motion stays snappy — this is
 * the same shortlist the working app.js uses.
 */

// Face: eyes (33 right, 263 left after mirroring), jaw edges (132 / 361),
// chin (152), ear tragions (234 / 454).
export const FACE_LM_USED = [33, 132, 152, 234, 263, 361, 454];

// Hand: wrist (0), finger MCPs / PIPs for ring + bangle anchoring.
export const HAND_LM_USED = [0, 5, 6, 9, 10, 13, 17];

// Pose: left + right shoulder.
export const POSE_LM_USED = [11, 12];

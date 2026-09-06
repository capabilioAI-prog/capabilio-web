/**
 * wheelMath.js — pure geometry for ArenaWheel. No React, no randomness:
 * the wheel NEVER computes its own outcome (spec §3) — it only computes
 * how far to visually rotate so the pointer lands on a result the
 * backend already returned.
 *
 * Segment i (0-indexed) is centered at angle i * (360/segmentCount),
 * measured clockwise from the pointer's fixed position at the top
 * (12 o'clock = 0deg). Rotating the wheel disk clockwise by R degrees
 * moves the point that WAS at angle (-R mod 360) under the pointer — so
 * to land segment i under the pointer, R must satisfy
 * R ≡ -segmentCenter(i) (mod 360), i.e. R mod 360 = (360 - segmentCenter) mod 360.
 */

// Hard product requirement: the VISIBLE wheel spin (acceleration + main
// rotation + deceleration + micro-settle) must never exceed 5 seconds.
// Landing animation + the small settle bounce sum to well under that —
// verified in wheelMath.test.js so a future tuning pass can't silently
// blow the budget. The indeterminate "preparing" state while waiting on
// the server does NOT rotate the wheel at all, so it never counts
// against this budget in the first place.
export const SPIN_DURATION_SECONDS = 4.0
export const SETTLE_BOUNCE_SECONDS = 0.28
export const MAX_SPIN_BUDGET_SECONDS = 5

export function segmentAngle(segmentCount) {
  return 360 / segmentCount
}

export function segmentCenterAngle(index, segmentCount) {
  return index * segmentAngle(segmentCount)
}

/**
 * The wedge boundaries for segment `index` — CENTERED on segmentCenterAngle
 * (spanning a half-segment either side), not starting there. ArenaWheel.jsx
 * uses this directly for both the drawn wedge shape and the label position,
 * so the rendered wheel and computeTargetRotation's landing math can never
 * drift apart again the way they did once already (drawing wedge i as
 * [i*angle, (i+1)*angle) instead of centered made the wheel visually land
 * on the segment AFTER the intended one).
 */
export function wedgeBounds(index, segmentCount) {
  const mid = segmentCenterAngle(index, segmentCount)
  const half = segmentAngle(segmentCount) / 2
  return { start: mid - half, mid, end: mid + half }
}

/**
 * @param {number} currentRotation - the wheel's current accumulated rotation (degrees, can exceed 360)
 * @param {number} targetIndex - index into `outcomes` of the authoritative result
 * @param {number} segmentCount
 * @param {number} extraSpins - full additional rotations for visual effect (default 5)
 * @returns {number} the new absolute rotation to animate to — always > currentRotation,
 *   guaranteeing the wheel only ever spins forward, never snaps backward.
 */
export function computeTargetRotation(currentRotation, targetIndex, segmentCount, extraSpins = 5) {
  const center = segmentCenterAngle(targetIndex, segmentCount)
  const desiredMod = ((360 - center) % 360 + 360) % 360
  const currentMod = ((currentRotation % 360) + 360) % 360
  let delta = desiredMod - currentMod
  if (delta <= 0) delta += 360
  return currentRotation + delta + extraSpins * 360
}

/** Which outcome value the wheel is currently showing at rest, given a
 *  resting rotation — used only for the accessible textual readout after
 *  the wheel settles, never to decide anything. */
export function outcomeAtRotation(rotation, outcomes) {
  const count = outcomes.length
  const mod = ((rotation % 360) + 360) % 360
  // Inverse of computeTargetRotation's relationship: center = 360 - mod (mod 360)
  const center = ((360 - mod) % 360 + 360) % 360
  const index = Math.round(center / segmentAngle(count)) % count
  return outcomes[index]
}

import { test } from "node:test"
import assert from "node:assert/strict"
import { computeTargetRotation, outcomeAtRotation, segmentCenterAngle, wedgeBounds } from "./wheelMath.js"

const OUTCOMES = [5, 6, 7, 8, 9, 10, 11, 12] // 8 segments

test("computeTargetRotation always moves forward from the current rotation (never snaps backward)", () => {
  for (let current = 0; current < 1000; current += 37) {
    for (let idx = 0; idx < OUTCOMES.length; idx++) {
      const target = computeTargetRotation(current, idx, OUTCOMES.length)
      assert.ok(target > current, `target rotation ${target} must exceed current ${current}`)
    }
  }
})

test("landing at the computed target rotation actually reports the intended outcome index", () => {
  for (let idx = 0; idx < OUTCOMES.length; idx++) {
    const target = computeTargetRotation(0, idx, OUTCOMES.length)
    const landed = outcomeAtRotation(target, OUTCOMES)
    assert.equal(landed, OUTCOMES[idx], `landing rotation for index ${idx} should read back as outcome ${OUTCOMES[idx]}`)
  }
})

test("computeTargetRotation includes the requested number of extra full spins", () => {
  const target = computeTargetRotation(0, 0, OUTCOMES.length, 5)
  // At least 5 full rotations (1800deg) before landing, since currentRotation is 0
  assert.ok(target >= 5 * 360)
})

test("repeated spins from a non-zero starting rotation still land correctly and keep moving forward", () => {
  let rotation = 0
  for (const idx of [3, 0, 7, 2]) {
    const next = computeTargetRotation(rotation, idx, OUTCOMES.length)
    assert.ok(next > rotation)
    assert.equal(outcomeAtRotation(next, OUTCOMES), OUTCOMES[idx])
    rotation = next
  }
})

test("segmentCenterAngle divides the circle evenly across 8 segments", () => {
  const centers = OUTCOMES.map((_, i) => segmentCenterAngle(i, OUTCOMES.length))
  assert.deepEqual(centers, [0, 45, 90, 135, 180, 225, 270, 315])
})

test("computeTargetRotation for every outcome index produces a distinct resting angle mod 360", () => {
  const mods = OUTCOMES.map((_, idx) => computeTargetRotation(0, idx, OUTCOMES.length) % 360)
  assert.equal(new Set(mods).size, OUTCOMES.length, "each of the 8 outcomes must land at a distinct wheel angle")
})

test("wedgeBounds is centered on segmentCenterAngle — regression test for a real bug where the drawn wedge was offset by half a segment, making the wheel visually land on the WRONG number after spinning", () => {
  for (let i = 0; i < OUTCOMES.length; i++) {
    const { start, mid, end } = wedgeBounds(i, OUTCOMES.length)
    assert.equal(mid, segmentCenterAngle(i, OUTCOMES.length))
    assert.equal(end - start, 45, "wedge must span exactly one full segment")
    assert.equal(mid - start, 22.5, "the center must sit exactly halfway between start and end")
    assert.equal(end - mid, 22.5)
  }
})

test("after computeTargetRotation, the pointer (angle 0 in the wheel's own unrotated frame) falls INSIDE the intended wedge's bounds — this is what actually connects the visual wedge to the landing math", () => {
  for (let idx = 0; idx < OUTCOMES.length; idx++) {
    const target = computeTargetRotation(0, idx, OUTCOMES.length)
    const restMod = ((target % 360) + 360) % 360
    // The point now under the pointer, in the wheel's own unrotated coordinate frame:
    const pointerPointInWheelFrame = ((360 - restMod) % 360 + 360) % 360
    const { start, end } = wedgeBounds(idx, OUTCOMES.length)
    const normalizedStart = ((start % 360) + 360) % 360
    const normalizedEnd = ((end % 360) + 360) % 360
    // idx 0's wedge wraps across the 0/360 boundary ([-22.5, 22.5)) — handle that case explicitly.
    const inWedge = normalizedStart < normalizedEnd
      ? pointerPointInWheelFrame >= normalizedStart && pointerPointInWheelFrame < normalizedEnd
      : pointerPointInWheelFrame >= normalizedStart || pointerPointInWheelFrame < normalizedEnd
    assert.ok(inWedge, `outcome index ${idx}: pointer point ${pointerPointInWheelFrame} must fall inside wedge [${normalizedStart}, ${normalizedEnd})`)
  }
})

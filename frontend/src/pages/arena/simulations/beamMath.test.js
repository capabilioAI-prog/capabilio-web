import { test } from "node:test"
import assert from "node:assert/strict"
import { computeMomentOfInertiaMm4, computeMomentAt, computeDeflectionAt, deflectionToPolyline } from "./beamMath.js"

const BEAM = { spanMm: 4000, loadN: 20000, loadPositionMm: 1500, modulusMPa: 200000 }

test("computeMomentOfInertiaMm4 matches b*h^3/12", () => {
  assert.equal(computeMomentOfInertiaMm4(100, 200), (100 * 200 ** 3) / 12)
})

test("computeMomentAt is zero at both ends and positive at the load", () => {
  assert.ok(Math.abs(computeMomentAt(0, BEAM)) < 1e-6)
  assert.ok(Math.abs(computeMomentAt(4000, BEAM)) < 1e-6)
  assert.ok(computeMomentAt(1500, BEAM) > 0)
})

test("computeDeflectionAt matches the backend's known hand-calculated value at the load point", () => {
  const I = computeMomentOfInertiaMm4(100, 200)
  const d = computeDeflectionAt(1500, { ...BEAM, momentOfInertiaMm4: I })
  assert.ok(Math.abs(d - 1.758) < 0.01)
})

test("deflectionToPolyline maps position/deflection into the given viewbox", () => {
  const points = [{ xMm: 0, deflectionMm: 0 }, { xMm: 4000, deflectionMm: 0 }]
  const poly = deflectionToPolyline(points, { width: 400, height: 120, spanMm: 4000, maxDeflectionMm: 2, baselineY: 60 })
  assert.equal(poly, "0.00,60.00 400.00,60.00")
})

test("deflectionToPolyline returns empty string for fewer than 2 points", () => {
  assert.equal(deflectionToPolyline([{ xMm: 0, deflectionMm: 0 }], { width: 400, height: 120, spanMm: 4000, maxDeflectionMm: 2, baselineY: 60 }), "")
})

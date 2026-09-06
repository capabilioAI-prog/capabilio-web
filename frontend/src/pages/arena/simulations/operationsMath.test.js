import { test } from "node:test"
import assert from "node:assert/strict"
import { computeOperatingPoint, sweepToPolyline, stockLevelToX } from "./operationsMath.js"

const MODEL = { demandLowUnits: 800, demandHighUnits: 1200, unitHoldingCost: 2, unitStockoutCost: 8 }

test("matches the backend's known hand-calculated point at S=1160", () => {
  const point = computeOperatingPoint({ ...MODEL, stockLevelUnits: 1160 })
  assert.equal(point.serviceLevelPct, 90)
  assert.equal(point.expectedStockoutUnits, 2)
  assert.equal(point.totalCostWeekly, 340)
})

test("service level is 0% at the lowest stock level and 100% at the highest", () => {
  assert.equal(computeOperatingPoint({ ...MODEL, stockLevelUnits: 800 }).serviceLevelPct, 0)
  assert.equal(computeOperatingPoint({ ...MODEL, stockLevelUnits: 1200 }).serviceLevelPct, 100)
})

test("sweepToPolyline maps stock level/value pairs into the given viewbox", () => {
  const points = [{ stockLevelUnits: 800, totalCostWeekly: 0 }, { stockLevelUnits: 1200, totalCostWeekly: 100 }]
  const poly = sweepToPolyline(points, { width: 300, height: 150, field: "totalCostWeekly", demandLowUnits: 800, demandHighUnits: 1200, maxValue: 100 })
  const [first, last] = poly.split(" ")
  assert.equal(first, "0.00,150.00")
  assert.equal(last, "300.00,0.00")
})

test("stockLevelToX places the low bound at x=0 and the high bound at x=width", () => {
  assert.equal(stockLevelToX(800, { width: 300, demandLowUnits: 800, demandHighUnits: 1200 }), 0)
  assert.equal(stockLevelToX(1200, { width: 300, demandLowUnits: 800, demandHighUnits: 1200 }), 300)
})

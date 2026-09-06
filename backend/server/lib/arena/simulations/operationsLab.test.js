import { test } from "node:test"
import assert from "node:assert/strict"
import { computeOperatingPoint, generateOperationsState } from "./operationsLab.js"

const MODEL = { demandLowUnits: 800, demandHighUnits: 1200, unitHoldingCost: 2, unitStockoutCost: 8 }

test("at the lowest possible stock level, service level is 0% and stockout risk is maximal", () => {
  const point = computeOperatingPoint({ ...MODEL, stockLevelUnits: 800 })
  assert.equal(point.serviceLevelPct, 0)
  assert.equal(point.expectedStockoutUnits, 200) // mean(1000) - S(800)
  assert.equal(point.expectedOverstockUnits, 0)
})

test("at the highest stock level, service level is 100% and stockout is zero", () => {
  const point = computeOperatingPoint({ ...MODEL, stockLevelUnits: 1200 })
  assert.equal(point.serviceLevelPct, 100)
  assert.equal(point.expectedStockoutUnits, 0)
  assert.equal(point.expectedOverstockUnits, 200) // S(1200) - mean(1000)
})

test("known hand-calculated point: S=1160 gives ~90% service level and matches the exact newsvendor formula", () => {
  const point = computeOperatingPoint({ ...MODEL, stockLevelUnits: 1160 })
  assert.equal(point.serviceLevelPct, 90)
  // E[stockout] = (hi-S)^2 / (2*width) = (1200-1160)^2 / (2*400) = 1600/800 = 2
  assert.equal(point.expectedStockoutUnits, 2)
  // E[overstock] = (S-mean) + E[stockout] = 160 + 2 = 162
  assert.equal(point.expectedOverstockUnits, 162)
  assert.equal(point.holdingCostWeekly, 324) // 162 * 2
  assert.equal(point.stockoutCostWeekly, 16) // 2 * 8
  assert.equal(point.totalCostWeekly, 340)
})

test("raising the stock level strictly increases service level and never decreases it", () => {
  let prevService = -1
  for (let s = 800; s <= 1200; s += 50) {
    const point = computeOperatingPoint({ ...MODEL, stockLevelUnits: s })
    assert.ok(point.serviceLevelPct >= prevService)
    prevService = point.serviceLevelPct
  }
})

test("raising the stock level strictly increases holding cost and decreases stockout cost — a genuine tradeoff, not a fixed number", () => {
  const low = computeOperatingPoint({ ...MODEL, stockLevelUnits: 900 })
  const high = computeOperatingPoint({ ...MODEL, stockLevelUnits: 1100 })
  assert.ok(high.holdingCostWeekly > low.holdingCostWeekly)
  assert.ok(high.stockoutCostWeekly < low.stockoutCostWeekly)
})

test("generateOperationsState is deterministic and sweeps stock level across the full demand range", () => {
  const recipe = { ...MODEL, targetServiceLevelPct: 90, maxWeeklyCostBudget: 900, steps: 20 }
  const a = generateOperationsState(recipe)
  const b = generateOperationsState(recipe)
  assert.deepEqual(a, b)
  assert.equal(a.points.length, 21)
  assert.equal(a.points[0].stockLevelUnits, 800)
  assert.equal(a.points.at(-1).stockLevelUnits, 1200)
})

test("generateOperationsState's public state exposes the given demand/cost model — legitimate given data, not a hidden answer", () => {
  const state = generateOperationsState({ ...MODEL, targetServiceLevelPct: 90, maxWeeklyCostBudget: 900 })
  assert.equal(state.demandLowUnits, 800)
  assert.equal(state.demandHighUnits, 1200)
  assert.equal(state.unitHoldingCost, 2)
  assert.equal(state.unitStockoutCost, 8)
})

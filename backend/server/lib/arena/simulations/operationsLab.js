/**
 * arena/simulations/operationsLab.js — the MBA "Business Lab" micro-
 * simulation: an inventory stock-level decision under uniformly-
 * distributed weekly demand — the classic newsvendor cost model, closed-
 * form for a uniform demand distribution (not a physics engine, but the
 * same "real equations, not random numbers" standard per spec §37).
 *
 * A student's chosen stock level has real, computed consequences
 * (expected stockout, expected overstock, holding/stockout cost, service
 * level) — clicking a control changes the simulated business state, per
 * spec §19, not just a highlighted choice.
 */

export const SIMULATION_TYPE = "operations_lab"

function round(v, decimals = 2) {
  const f = 10 ** decimals
  return Math.round(v * f) / f
}

/**
 * Exact expectations for D ~ Uniform[demandLowUnits, demandHighUnits]
 * at a chosen stock level S:
 *   E[max(0, D-S)]  (expected stockout/underage)
 *   E[max(0, S-D)]  (expected overstock/overage), via the identity
 *   max(0,S-D) = (S-D) + max(0,D-S)
 */
export function computeOperatingPoint({ demandLowUnits, demandHighUnits, unitHoldingCost, unitStockoutCost, stockLevelUnits }) {
  const lo = demandLowUnits, hi = demandHighUnits, width = hi - lo, mean = (lo + hi) / 2
  const S = stockLevelUnits

  let expectedStockoutUnits
  if (S >= hi) expectedStockoutUnits = 0
  else if (S <= lo) expectedStockoutUnits = mean - S
  else expectedStockoutUnits = (hi - S) ** 2 / (2 * width)

  const expectedOverstockUnits = Math.max(0, (S - mean) + expectedStockoutUnits)
  const serviceLevelPct = Math.max(0, Math.min(100, ((S - lo) / width) * 100))
  const holdingCostWeekly = expectedOverstockUnits * unitHoldingCost
  const stockoutCostWeekly = expectedStockoutUnits * unitStockoutCost
  const totalCostWeekly = holdingCostWeekly + stockoutCostWeekly

  return {
    stockLevelUnits: S,
    expectedStockoutUnits: round(expectedStockoutUnits),
    expectedOverstockUnits: round(expectedOverstockUnits),
    serviceLevelPct: round(serviceLevelPct, 1),
    holdingCostWeekly: round(holdingCostWeekly),
    stockoutCostWeekly: round(stockoutCostWeekly),
    totalCostWeekly: round(totalCostWeekly),
  }
}

/**
 * @param {object} recipe — { demandLowUnits, demandHighUnits,
 *   unitHoldingCost, unitStockoutCost, targetServiceLevelPct,
 *   maxWeeklyCostBudget, steps? }
 * @returns {object} PUBLIC simulation state: the given demand/cost model
 *   plus a stock-level sweep (cost & service level vs stock level) for
 *   the response graph. Nothing here is a hidden answer — a real
 *   operations analyst is GIVEN the demand range and unit costs.
 */
export function generateOperationsState(recipe) {
  const steps = recipe.steps ?? 40
  const { demandLowUnits, demandHighUnits, unitHoldingCost, unitStockoutCost, targetServiceLevelPct, maxWeeklyCostBudget } = recipe
  const points = []
  for (let i = 0; i <= steps; i++) {
    const stockLevelUnits = demandLowUnits + ((demandHighUnits - demandLowUnits) * i) / steps
    points.push(computeOperatingPoint({ demandLowUnits, demandHighUnits, unitHoldingCost, unitStockoutCost, stockLevelUnits }))
  }
  return {
    simulationType: SIMULATION_TYPE,
    demandLowUnits, demandHighUnits, unitHoldingCost, unitStockoutCost,
    targetServiceLevelPct, maxWeeklyCostBudget,
    points,
  }
}

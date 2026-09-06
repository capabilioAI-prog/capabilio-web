/**
 * simulations/operationsMath.js — pure, JSX-free newsvendor cost model
 * shared by OperationsLab.jsx. Duplicates backend/server/lib/arena/
 * simulations/operationsLab.js's formula — the demand range and unit
 * costs are public given data (spec §36), so recomputing them live on
 * the frontend as the student drags the stock-level control is safe.
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

  return {
    expectedStockoutUnits, expectedOverstockUnits, serviceLevelPct,
    holdingCostWeekly, stockoutCostWeekly,
    totalCostWeekly: holdingCostWeekly + stockoutCostWeekly,
  }
}

/** Maps a stock-level sweep to an SVG polyline for a given output field
 *  (e.g. "totalCostWeekly" or "serviceLevelPct"). */
export function sweepToPolyline(points, { width, height, field, demandLowUnits, demandHighUnits, maxValue }) {
  if (points.length < 2) return ""
  return points
    .map((p) => {
      const x = ((p.stockLevelUnits - demandLowUnits) / (demandHighUnits - demandLowUnits)) * width
      const y = height - (p[field] / maxValue) * height
      return `${x.toFixed(2)},${Math.max(0, Math.min(height, y)).toFixed(2)}`
    })
    .join(" ")
}

export function stockLevelToX(stockLevelUnits, { width, demandLowUnits, demandHighUnits }) {
  return ((stockLevelUnits - demandLowUnits) / (demandHighUnits - demandLowUnits)) * width
}

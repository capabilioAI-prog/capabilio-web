/**
 * arena/simulations/dataInvestigationStudio.js — the Data Science "Data
 * Investigation Studio" micro-simulation. A small tabular dataset,
 * filtered and grouped/aggregated by the student's chosen combination —
 * exact sum/count/average arithmetic over real rows, not a SQL query
 * workstation or a statistical test. Distinct object set (rows, filter
 * toggle, group-by column, aggregate table) and interaction (toggle a
 * filter, pick a group-by column) from every other registered
 * simulation.
 */

export const SIMULATION_TYPE = "data_investigation_studio"

function round(v, decimals = 2) {
  const f = 10 ** decimals
  return Math.round(v * f) / f
}

/** Sum/count/average of `aggregateColumn`, grouped by `groupByColumn`. */
export function aggregate(rows, groupByColumn, aggregateColumn) {
  const groups = new Map()
  for (const row of rows) {
    const key = row[groupByColumn]
    if (!groups.has(key)) groups.set(key, { sum: 0, count: 0 })
    const g = groups.get(key)
    g.sum += row[aggregateColumn]
    g.count += 1
  }
  return [...groups.entries()].map(([group, g]) => ({ group, sum: round(g.sum), count: g.count, avg: round(g.sum / g.count) }))
}

/**
 * @param {object} recipe — hidden, server-only (verification_definition.simulation).
 *   { rows: object[], excludeFilter: {column, equalsValue, label},
 *     groupByOptions: string[], aggregateColumn: string }
 * @returns {object} PUBLIC simulation state: the full raw dataset (given,
 *   public) plus a precomputed aggregate table for every (filter on/off) x
 *   (group-by column) combination the student can select.
 */
export function generateDataInvestigationState(recipe) {
  const { rows, excludeFilter, groupByOptions, aggregateColumn } = recipe
  const filteredRows = rows.filter((r) => r[excludeFilter.column] !== excludeFilter.equalsValue)

  const tables = { filterOff: {}, filterOn: {} }
  for (const col of groupByOptions) {
    tables.filterOff[col] = aggregate(rows, col, aggregateColumn)
    tables.filterOn[col] = aggregate(filteredRows, col, aggregateColumn)
  }

  return {
    simulationType: SIMULATION_TYPE,
    rows, excludeFilterLabel: excludeFilter.label, groupByOptions, aggregateColumn,
    tables,
  }
}

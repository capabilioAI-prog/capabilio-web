import { test } from "node:test"
import assert from "node:assert/strict"
import { aggregate, generateDataInvestigationState } from "./dataInvestigationStudio.js"

const ROWS = [
  { id: 1, region: "North", amountUSD: 100, isReturn: false },
  { id: 2, region: "North", amountUSD: -50, isReturn: true },
  { id: 3, region: "South", amountUSD: 200, isReturn: false },
  { id: 4, region: "South", amountUSD: 150, isReturn: false },
]

test("aggregate sums and counts correctly per group", () => {
  const result = aggregate(ROWS, "region", "amountUSD")
  const north = result.find((r) => r.group === "North")
  assert.equal(north.sum, 50)
  assert.equal(north.count, 2)
  assert.equal(north.avg, 25)
})

test("excluding returns changes a group's average without touching an unaffected group", () => {
  const state = generateDataInvestigationState({
    rows: ROWS,
    excludeFilter: { column: "isReturn", equalsValue: true, label: "Exclude returns" },
    groupByOptions: ["region"],
    aggregateColumn: "amountUSD",
  })
  const northOff = state.tables.filterOff.region.find((r) => r.group === "North")
  const northOn = state.tables.filterOn.region.find((r) => r.group === "North")
  const southOff = state.tables.filterOff.region.find((r) => r.group === "South")
  const southOn = state.tables.filterOn.region.find((r) => r.group === "South")
  assert.equal(northOff.avg, 25)
  assert.equal(northOn.avg, 100) // the return was masking the true average
  assert.deepEqual(southOff, southOn) // South has no returns — filter has no effect
})

test("generateDataInvestigationState precomputes a table for every group-by option requested", () => {
  const state = generateDataInvestigationState({
    rows: ROWS,
    excludeFilter: { column: "isReturn", equalsValue: true, label: "Exclude returns" },
    groupByOptions: ["region"],
    aggregateColumn: "amountUSD",
  })
  assert.equal(state.simulationType, "data_investigation_studio")
  assert.deepEqual(state.rows, ROWS)
  assert.ok(state.tables.filterOff.region)
  assert.ok(state.tables.filterOn.region)
})

test("is deterministic", () => {
  const recipe = { rows: ROWS, excludeFilter: { column: "isReturn", equalsValue: true, label: "x" }, groupByOptions: ["region"], aggregateColumn: "amountUSD" }
  assert.deepEqual(generateDataInvestigationState(recipe), generateDataInvestigationState(recipe))
})

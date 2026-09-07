import { test } from "node:test"
import assert from "node:assert/strict"
import { computeBaselineReading, applyFault, generateMotorTestBenchState } from "./motorTestBench.js"

const RATED = { ratedRPM: 1450, ratedCurrentA: 10, noLoadCurrentA: 2, ambientC: 25, ratedTempRiseC: 40, baselineVibrationMmS: 1.2 }

test("with no fault, observed readings exactly match the expected baseline at every load level", () => {
  const state = generateMotorTestBenchState({ rated: RATED, loadLevelsPct: [25, 50, 75, 100] })
  for (const r of state.readings) assert.deepEqual(r.observed, r.expected)
})

test("bearing_wear elevates only vibration, leaving RPM/current/temperature untouched", () => {
  const baseline = computeBaselineReading(100, RATED)
  const faulted = applyFault(baseline, "bearing_wear", 2)
  assert.equal(faulted.vibrationMmS, baseline.vibrationMmS * 3)
  assert.equal(faulted.rpm, baseline.rpm)
  assert.equal(faulted.currentA, baseline.currentA)
  assert.equal(faulted.tempC, baseline.tempC)
})

test("winding_short elevates current and temperature, leaving RPM and vibration untouched", () => {
  const baseline = computeBaselineReading(100, RATED)
  const faulted = applyFault(baseline, "winding_short", 1)
  assert.equal(faulted.currentA, baseline.currentA * 2)
  assert.ok(faulted.tempC > baseline.tempC)
  assert.equal(faulted.rpm, baseline.rpm)
  assert.equal(faulted.vibrationMmS, baseline.vibrationMmS)
})

test("supply_imbalance depresses RPM and elevates current, leaving temperature and vibration untouched", () => {
  const baseline = computeBaselineReading(100, RATED)
  const faulted = applyFault(baseline, "supply_imbalance", 1)
  assert.ok(faulted.rpm < baseline.rpm)
  assert.ok(faulted.currentA > baseline.currentA)
  assert.equal(faulted.tempC, baseline.tempC)
  assert.equal(faulted.vibrationMmS, baseline.vibrationMmS)
})

test("RPM droops and current/temperature rise monotonically with load in a healthy motor", () => {
  const at25 = computeBaselineReading(25, RATED)
  const at100 = computeBaselineReading(100, RATED)
  assert.ok(at100.rpm < at25.rpm)
  assert.ok(at100.currentA > at25.currentA)
  assert.ok(at100.tempC > at25.tempC)
})

test("generateMotorTestBenchState exposes the nameplate rating and per-condition readings, is deterministic", () => {
  const recipe = { rated: RATED, loadLevelsPct: [50, 100], faultType: "bearing_wear", faultSeverity: 1.5 }
  const a = generateMotorTestBenchState(recipe)
  const b = generateMotorTestBenchState(recipe)
  assert.deepEqual(a, b)
  assert.deepEqual(a.nameplate, RATED)
  assert.equal(a.readings.length, 2)
})

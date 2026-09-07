import { test } from "node:test"
import assert from "node:assert/strict"
import { simulatePneumatic, generatePneumaticTrainerState } from "./pneumaticTrainer.js"

const RECIPE = {
  strokeMm: 100, extendFlowRateMmS: 25, retractFlowRateMmS: 25, supplyPressureBar: 6,
  valveSequence: [
    { step: 1, state: "extend" }, { step: 2, state: "extend" }, { step: 3, state: "extend" }, { step: 4, state: "extend" },
    { step: 5, state: "hold" }, { step: 6, state: "retract" },
  ],
}

test("a healthy cylinder reaches full stroke at the nominal extend rate and clamps at the mechanical limit", () => {
  const trace = simulatePneumatic(RECIPE)
  assert.equal(trace[3].positionMm, 100)
  assert.equal(trace[4].positionMm, 100) // clamped, doesn't overshoot
})

test("energizing extend pressurizes the extend chamber and fully exhausts the retract chamber", () => {
  const trace = simulatePneumatic(RECIPE)
  assert.equal(trace[0].extendChamberBar, 6)
  assert.equal(trace[0].retractChamberBar, 0)
})

test("a hold step traps whatever chamber pressures were already present, rather than resetting them", () => {
  const trace = simulatePneumatic(RECIPE)
  assert.equal(trace[4].valveState, "hold")
  assert.equal(trace[4].extendChamberBar, trace[3].extendChamberBar)
})

test("switching to retract reverses direction and swaps which chamber is pressurized", () => {
  const trace = simulatePneumatic(RECIPE)
  const last = trace.at(-1)
  assert.equal(last.positionMm, 75) // 100 - 25mm/s for 1 step
  assert.equal(last.extendChamberBar, 0)
  assert.equal(last.retractChamberBar, 6)
})

test("a fault restricted to one direction only slows that direction, leaving the other at its nominal rate", () => {
  const faulted = simulatePneumatic({ ...RECIPE, faultDirection: "extend", faultSeverity: 0.6 })
  const healthy = simulatePneumatic(RECIPE)
  assert.ok(faulted[0].positionMm < healthy[0].positionMm) // extend is slower
  const retractDelta = faulted[4].positionMm - faulted[5].positionMm
  assert.equal(retractDelta, 25) // retract rate is unaffected
})

test("generatePneumaticTrainerState exposes nominal rated flow rates and the observed trace, is deterministic", () => {
  const a = generatePneumaticTrainerState(RECIPE)
  const b = generatePneumaticTrainerState(RECIPE)
  assert.deepEqual(a, b)
  assert.equal(a.nominal.extendFlowRateMmS, 25)
  assert.equal(a.trace.length, 6)
})

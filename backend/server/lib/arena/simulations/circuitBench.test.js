import { test } from "node:test"
import assert from "node:assert/strict"
import { solveCircuit, generateCircuitBenchState } from "./circuitBench.js"

test("a healthy R1-series/(R2 parallel R3) network splits current evenly when R2 equals R3", () => {
  const r = solveCircuit({ sourceVoltageV: 12, r1Ohms: 100, r2Ohms: 200, r3Ohms: 200 })
  assert.equal(r.nodeBVoltageV, 6)
  assert.equal(r.i1A, 0.06)
  assert.equal(r.i2A, 0.03)
  assert.equal(r.i3A, 0.03)
})

test("an open R2 routes all parallel-branch current through R3", () => {
  const r = solveCircuit({ sourceVoltageV: 12, r1Ohms: 100, r2Ohms: Infinity, r3Ohms: 200 })
  assert.equal(r.i2A, 0)
  assert.equal(r.i3A, r.i1A)
})

test("a shorted R2 pulls node B to 0V and takes all current, leaving R3 with none", () => {
  const r = solveCircuit({ sourceVoltageV: 12, r1Ohms: 100, r2Ohms: 0, r3Ohms: 200 })
  assert.equal(r.nodeBVoltageV, 0)
  assert.equal(r.i2A, r.i1A)
  assert.equal(r.i3A, 0)
})

test("an open R1 (series element) kills all current in the entire network", () => {
  const r = solveCircuit({ sourceVoltageV: 12, r1Ohms: Infinity, r2Ohms: 200, r3Ohms: 200 })
  assert.equal(r.i1A, 0)
  assert.equal(r.nodeBVoltageV, 0)
})

test("generateCircuitBenchState exposes nominal values and source voltage but only measured probe readings, never the actual fault directly", () => {
  const state = generateCircuitBenchState({
    sourceVoltageV: 12,
    nominal: { r1Ohms: 100, r2Ohms: 200, r3Ohms: 200 },
    actual: { r1Ohms: 100, r2Ohms: Infinity, r3Ohms: 200 },
  })
  assert.equal(state.probes.nodeA, 12)
  assert.equal(state.probes.nodeB, 8) // reflects the fault's consequence
  assert.deepEqual(state.nominal, { r1Ohms: 100, r2Ohms: 200, r3Ohms: 200 }) // design spec is public
  assert.equal(state.actual, undefined) // the actual faulted values are never exposed directly
})

test("is deterministic", () => {
  const recipe = { sourceVoltageV: 9, nominal: { r1Ohms: 50, r2Ohms: 100, r3Ohms: 100 }, actual: { r1Ohms: 50, r2Ohms: 100, r3Ohms: 100 } }
  assert.deepEqual(generateCircuitBenchState(recipe), generateCircuitBenchState(recipe))
})

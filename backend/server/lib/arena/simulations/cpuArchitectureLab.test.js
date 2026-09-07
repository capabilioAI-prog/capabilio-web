import { test } from "node:test"
import assert from "node:assert/strict"
import { computeStalls, simulateCache, generateCpuArchitectureState } from "./cpuArchitectureLab.js"

const HAZARD_CHAIN = [
  { id: 1, op: "LOAD", dest: "R1", srcs: [] },
  { id: 2, op: "ADD", dest: "R2", srcs: ["R1", "R3"] },
  { id: 3, op: "SUB", dest: "R4", srcs: ["R2"] },
  { id: 4, op: "MUL", dest: "R5", srcs: ["R6", "R7"] },
]

test("without forwarding, a RAW dependency on the immediately preceding instruction costs the full 3-cycle penalty", () => {
  const { totalStalls, perInstrStalls } = computeStalls(HAZARD_CHAIN, false)
  assert.equal(totalStalls, 6)
  assert.deepEqual(perInstrStalls, [0, 3, 3, 0])
})

test("with forwarding, only the load-use hazard survives, costing exactly 1 cycle", () => {
  const { totalStalls, perInstrStalls } = computeStalls(HAZARD_CHAIN, true)
  assert.equal(totalStalls, 1)
  assert.deepEqual(perInstrStalls, [0, 1, 0, 0])
})

test("an independent instruction stream has zero stalls with or without forwarding", () => {
  const independent = [
    { id: 1, op: "ADD", dest: "R1", srcs: ["R2", "R3"] },
    { id: 2, op: "SUB", dest: "R4", srcs: ["R5", "R6"] },
  ]
  assert.equal(computeStalls(independent, false).totalStalls, 0)
  assert.equal(computeStalls(independent, true).totalStalls, 0)
})

test("enough independent instructions between producer and consumer fully hide a non-load hazard even without forwarding", () => {
  const spaced = [
    { id: 1, op: "ADD", dest: "R1", srcs: [] },
    { id: 2, op: "NOP", srcs: [] },
    { id: 3, op: "NOP", srcs: [] },
    { id: 4, op: "NOP", srcs: [] },
    { id: 5, op: "SUB", dest: "R4", srcs: ["R1"] },
  ]
  assert.equal(computeStalls(spaced, false).totalStalls, 0)
})

test("simulateCache: a direct-mapped cache hits only when the same block is re-accessed before its index is evicted", () => {
  const { trace, hitCount, hitRatePct } = simulateCache([0, 4, 8, 0, 16, 4], 2, 4)
  assert.equal(hitCount, 1)
  assert.equal(hitRatePct, 16.7)
  assert.equal(trace[5].hit, true) // re-accessing address 4 (block 1) before index 1 was evicted
  assert.equal(trace[3].hit, false) // address 0 (block 0) was evicted by address 8 (also index 0)
})

test("generateCpuArchitectureState exposes both forwarding-off and forwarding-on timelines plus the cache trace", () => {
  const state = generateCpuArchitectureState({
    instructions: HAZARD_CHAIN,
    cache: { sizeBlocks: 2, blockSize: 4, addresses: [0, 4, 8, 0, 16, 4] },
  })
  assert.equal(state.simulationType, "cpu_architecture_lab")
  assert.equal(state.totalStallsNoForwarding, 6)
  assert.equal(state.totalStallsForwarding, 1)
  assert.equal(state.timelineNoForwarding.length, 4)
  assert.equal(state.cache.hitCount, 1)
})

test("generateCpuArchitectureState is deterministic", () => {
  const recipe = { instructions: HAZARD_CHAIN, cache: { sizeBlocks: 2, blockSize: 4, addresses: [0, 4, 8] } }
  assert.deepEqual(generateCpuArchitectureState(recipe), generateCpuArchitectureState(recipe))
})

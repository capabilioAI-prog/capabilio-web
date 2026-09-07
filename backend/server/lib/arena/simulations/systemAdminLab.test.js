import { test } from "node:test"
import assert from "node:assert/strict"
import { computeGrowthRate, generateSystemAdminState } from "./systemAdminLab.js"

const RECIPE = {
  processes: [{ pid: "p1", label: "nginx" }, { pid: "p2", label: "backup-agent" }],
  totalMemoryMB: 4096,
  metrics: [
    { timestampMin: 0, perProcessMemoryMB: { p1: 200, p2: 150 } },
    { timestampMin: 10, perProcessMemoryMB: { p1: 210, p2: 600 } },
    { timestampMin: 20, perProcessMemoryMB: { p1: 195, p2: 1100 } },
  ],
}

test("a flat process's growth rate is near zero", () => {
  const rate = computeGrowthRate([{ timestampMin: 0, memoryMB: 200 }, { timestampMin: 20, memoryMB: 195 }])
  assert.equal(rate, -0.25)
})

test("a leaking process shows a clearly positive, sustained growth rate", () => {
  const rate = computeGrowthRate([{ timestampMin: 0, memoryMB: 150 }, { timestampMin: 20, memoryMB: 1100 }])
  assert.equal(rate, 47.5)
})

test("a single data point has an undefined trend and returns 0 rather than dividing by zero", () => {
  assert.equal(computeGrowthRate([{ timestampMin: 0, memoryMB: 100 }]), 0)
})

test("generateSystemAdminState isolates the leaking process by growth rate, distinct from the flat one", () => {
  const state = generateSystemAdminState(RECIPE)
  const nginx = state.perProcess.find((p) => p.pid === "p1")
  const backup = state.perProcess.find((p) => p.pid === "p2")
  assert.ok(Math.abs(nginx.growthRateMBPerMin) < 1)
  assert.ok(backup.growthRateMBPerMin > 40)
})

test("generateSystemAdminState sums total memory usage correctly at every timestamp", () => {
  const state = generateSystemAdminState(RECIPE)
  assert.deepEqual(state.totalOverTime.map((t) => t.totalUsedMB), [350, 810, 1295])
})

test("is deterministic", () => {
  assert.deepEqual(generateSystemAdminState(RECIPE), generateSystemAdminState(RECIPE))
})

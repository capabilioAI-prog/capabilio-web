import { test } from "node:test"
import assert from "node:assert/strict"
import { computeHealth, simulateRestart, generateNocState } from "./networkOperationsCenter.js"

const CHAIN = [
  { id: "dns", label: "DNS Resolver", dependsOn: [], initialStatus: "crashed" },
  { id: "db", label: "Database", dependsOn: ["dns"], initialStatus: "up" },
  { id: "web", label: "Web App", dependsOn: ["db"], initialStatus: "up" },
]

test("a crashed root-cause service cascades DOWN status to everything depending on it, even transitively", () => {
  const health = computeHealth(CHAIN)
  assert.equal(health.dns, true)
  assert.equal(health.db, true)
  assert.equal(health.web, true)
})

test("restarting a downstream symptom (not the root cause) fixes nothing — its dependency is still down", () => {
  const result = simulateRestart(CHAIN, "db")
  assert.equal(result.db, true)
  assert.equal(result.web, true)
})

test("restarting the true root cause clears the entire chain", () => {
  const result = simulateRestart(CHAIN, "dns")
  assert.equal(result.dns, false)
  assert.equal(result.db, false)
  assert.equal(result.web, false)
})

test("a service with no crashed dependency anywhere in its chain is always up", () => {
  const independent = [{ id: "cache", label: "Cache", dependsOn: [], initialStatus: "up" }]
  const health = computeHealth([...CHAIN, ...independent])
  assert.equal(health.cache, false)
})

test("a cyclic dependency never infinite-loops (cycle guard)", () => {
  const cyclic = [
    { id: "a", label: "A", dependsOn: ["b"], initialStatus: "up" },
    { id: "b", label: "B", dependsOn: ["a"], initialStatus: "up" },
  ]
  assert.doesNotThrow(() => computeHealth(cyclic))
})

test("generateNocState computes a restart outcome for every currently-down service, and is deterministic", () => {
  const state = generateNocState({ services: CHAIN })
  assert.equal(state.simulationType, "network_operations_center")
  assert.equal(state.restartOutcomes.length, 3) // all three are down in baseline
  const dnsOutcome = state.restartOutcomes.find((o) => o.restartedServiceId === "dns")
  assert.deepEqual(dnsOutcome.resultingHealth, { dns: false, db: false, web: false })
  assert.deepEqual(generateNocState({ services: CHAIN }), state)
})

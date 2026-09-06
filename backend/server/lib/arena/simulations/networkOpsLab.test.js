import { test } from "node:test"
import assert from "node:assert/strict"
import { generateNetworkOpsState } from "./networkOpsLab.js"

const CHAIN_RECIPE = {
  nodes: [
    { id: "core", label: "Core", role: "router" },
    { id: "dist", label: "Dist", role: "switch" },
    { id: "host", label: "Host", role: "host" },
  ],
  links: [
    { id: "L1", from: "core", to: "dist", ratedLatencyMs: 2, ratedCapacityMbps: 1000 },
    { id: "L2", from: "dist", to: "host", ratedLatencyMs: 1, ratedCapacityMbps: 1000 },
  ],
  faultLinkId: "L2",
  faultType: "down",
}

test("generateNetworkOpsState is deterministic — same recipe always produces the same public state", () => {
  const a = generateNetworkOpsState(CHAIN_RECIPE)
  const b = generateNetworkOpsState(CHAIN_RECIPE)
  assert.deepEqual(a, b)
})

test("a down link downstream of a healthy hop still cuts off the destination — reachability propagates through the path", () => {
  const state = generateNetworkOpsState(CHAIN_RECIPE)
  assert.equal(state.routes.dist.reachable, true, "the hop before the fault must still be reachable")
  assert.equal(state.routes.dist.totalLatencyMs, 2)
  assert.equal(state.routes.host.reachable, false, "the fault must cut off everything beyond it")
})

test("congested fault produces packet loss with only mildly elevated latency, distinct from degraded and down", () => {
  const state = generateNetworkOpsState({ ...CHAIN_RECIPE, faultType: "congested", faultSeverity: 30 })
  const faulty = state.links.find((l) => l.id === "L2")
  assert.equal(faulty.observedPacketLossPct, 30)
  assert.ok(faulty.observedLatencyMs > 1 && faulty.observedLatencyMs < 3, "congestion should only mildly elevate latency, not spike it")
})

test("an unaffected link always reports its exact rated latency with zero loss", () => {
  const state = generateNetworkOpsState(CHAIN_RECIPE)
  const healthy = state.links.find((l) => l.id === "L1")
  assert.equal(healthy.observedLatencyMs, 2)
  assert.equal(healthy.observedPacketLossPct, 0)
})

test("cumulative packet loss compounds across hops on a multi-hop congested path", () => {
  const recipe = {
    nodes: [
      { id: "core", label: "Core", role: "router" },
      { id: "mid", label: "Mid", role: "switch" },
      { id: "edge", label: "Edge", role: "host" },
    ],
    links: [
      { id: "A", from: "core", to: "mid", ratedLatencyMs: 2, ratedCapacityMbps: 1000 },
      { id: "B", from: "mid", to: "edge", ratedLatencyMs: 2, ratedCapacityMbps: 1000 },
    ],
    faultLinkId: "A",
    faultType: "congested",
    faultSeverity: 50,
  }
  const state = generateNetworkOpsState(recipe)
  assert.equal(state.routes.edge.reachable, true)
  assert.equal(state.routes.edge.totalPacketLossPct, 50) // one lossy hop, one clean hop: 1-(1-0.5)*(1-0) = 0.5
})

import { test } from "node:test"
import assert from "node:assert/strict"
import { computeReplicationState, generateDistributedSystemsState } from "./distributedSystemsLab.js"

const CLUSTER = {
  nodes: [{ id: "leader", label: "Leader" }, { id: "r1", label: "Replica 1" }, { id: "r2", label: "Replica 2" }],
  leaderId: "leader",
  writes: ["w1", "w2", "w3", "w4"],
  downWindows: [{ nodeId: "r2", fromStep: 2, toStep: 3, reason: "partitioned" }],
}

test("a node down during a write's step never receives that write", () => {
  const { nodeResults } = computeReplicationState(CLUSTER)
  const r2 = nodeResults.find((n) => n.id === "r2")
  assert.equal(r2.missedCount, 2)
  assert.equal(r2.consistent, false)
})

test("a node that stays up the whole time remains fully consistent", () => {
  const { nodeResults } = computeReplicationState(CLUSTER)
  const r1 = nodeResults.find((n) => n.id === "r1")
  assert.equal(r1.missedCount, 0)
  assert.equal(r1.consistent, true)
})

test("with no outages at all, every node is consistent", () => {
  const { nodeResults } = computeReplicationState({ ...CLUSTER, downWindows: [] })
  assert.ok(nodeResults.every((n) => n.consistent))
})

test("a node down for the entire run misses every write", () => {
  const { nodeResults } = computeReplicationState({ ...CLUSTER, downWindows: [{ nodeId: "r2", fromStep: 1, toStep: 4, reason: "paused" }] })
  const r2 = nodeResults.find((n) => n.id === "r2")
  assert.equal(r2.missedCount, 4)
  assert.equal(r2.logLength, 0)
})

test("the leader itself is never affected by an outage window (it always has the full log)", () => {
  const { leaderLog } = computeReplicationState(CLUSTER)
  assert.deepEqual(leaderLog, CLUSTER.writes)
})

test("generateDistributedSystemsState exposes the outage timeline without pre-computing consistency (the mission is to reason over it)", () => {
  const state = generateDistributedSystemsState(CLUSTER)
  assert.equal(state.simulationType, "distributed_systems_lab")
  assert.equal(state.writeCount, 4)
  assert.deepEqual(state.downWindows, CLUSTER.downWindows)
  assert.equal(state.perStep.length, 4)
})

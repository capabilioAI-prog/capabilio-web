import { test } from "node:test"
import assert from "node:assert/strict"
import { loadCapabilityState } from "./profileService.js"

function fakeSupabase({ nodes, states }) {
  const chain = (table) => {
    const data = table === "skill_graph_nodes" ? nodes : states
    const self = {
      select: () => self,
      eq: () => self,
      in: () => self,
      then: (resolve) => resolve({ data, error: null }),
    }
    return self
  }
  return { supabaseAdmin: { from: chain } }
}

test("loadCapabilityState: zero-competency graceful degradation — no tagged nodes for this domain", async () => {
  const deps = fakeSupabase({ nodes: [], states: [] })
  const result = await loadCapabilityState({ userId: "u1", domainKey: "untouched-domain" }, deps)
  assert.deepEqual(result, { competencies: [], hasData: false })
})

test("loadCapabilityState: nodes exist but student has no memory_states rows yet — confidence is null, never fabricated", async () => {
  const deps = fakeSupabase({
    nodes: [{ id: "n1", slug: "arena-college-stream-cse", label: "CSE (College Stream)", node_type: "competency", domain_key: "cse" }],
    states: [],
  })
  const result = await loadCapabilityState({ userId: "u1", domainKey: "cse" }, deps)
  assert.equal(result.hasData, false)
  assert.equal(result.competencies.length, 1)
  assert.equal(result.competencies[0].confidence, null)
  assert.equal(result.competencies[0].skillGraphNodeId, "n1")
})

test("loadCapabilityState: real memory_states evidence is surfaced honestly, not rounded/guessed", async () => {
  const deps = fakeSupabase({
    nodes: [{ id: "n1", slug: "s", label: "SQL Basics", node_type: "competency", domain_key: "cse" }],
    states: [{ skill_graph_node_id: "n1", confidence: 0.42, last_reinforced_at: "2026-08-01T00:00:00Z" }],
  })
  const result = await loadCapabilityState({ userId: "u1", domainKey: "cse" }, deps)
  assert.equal(result.hasData, true)
  assert.equal(result.competencies[0].confidence, 0.42)
})

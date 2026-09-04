import { test } from "node:test"
import assert from "node:assert/strict"
import {
  applyConfidenceToSkillGraph, deriveStrengthsAndWeakAreas, syncSkillGraphFromMemoryStates,
} from "./skillGraphSync.js"

// ── applyConfidenceToSkillGraph — pure ──────────────────────────────────────

test("applyConfidenceToSkillGraph: updates only the matching-label entry, preserves every unrelated skill untouched", () => {
  const skillGraph = [
    { label: "SQL (Advanced)", value: 20 },
    { label: "Python (Pandas/NumPy)", value: 67 },
    { label: "Excel / Spreadsheets", value: 100 },
  ]
  const { skillGraph: next, changed } = applyConfidenceToSkillGraph(skillGraph, new Map([["SQL (Advanced)", 0.62]]))
  assert.equal(changed, true)
  assert.equal(next.find(s => s.label === "SQL (Advanced)").value, 62)
  assert.equal(next.find(s => s.label === "Python (Pandas/NumPy)").value, 67, "unrelated skill must not move")
  assert.equal(next.find(s => s.label === "Excel / Spreadsheets").value, 100, "unrelated skill must not move")
  assert.equal(skillGraph.find(s => s.label === "SQL (Advanced)").value, 20, "input array must not be mutated")
})

test("applyConfidenceToSkillGraph: never invents a new entry for a node with no matching label", () => {
  const skillGraph = [{ label: "SQL (Advanced)", value: 20 }]
  const { skillGraph: next, changed } = applyConfidenceToSkillGraph(
    skillGraph, new Map([["Some Node With No Matching Profile Skill", 0.9]])
  )
  assert.equal(changed, false)
  assert.equal(next.length, 1, "no new skill entry should ever be fabricated")
})

test("applyConfidenceToSkillGraph: reports changed:false when the rounded value is identical (no pointless write)", () => {
  const skillGraph = [{ label: "SQL (Advanced)", value: 62 }]
  const { changed } = applyConfidenceToSkillGraph(skillGraph, new Map([["SQL (Advanced)", 0.62]]))
  assert.equal(changed, false)
})

// ── deriveStrengthsAndWeakAreas — pure, mirrors Aura's own interview-driven
// top-3/bottom-3 pattern ────────────────────────────────────────────────────

test("deriveStrengthsAndWeakAreas: top 3 by value are strengths, bottom 3 are weak areas", () => {
  const skillGraph = [
    { label: "A", value: 90 }, { label: "B", value: 80 }, { label: "C", value: 70 },
    { label: "D", value: 40 }, { label: "E", value: 20 }, { label: "F", value: 10 },
  ]
  const { strengths, weakAreas } = deriveStrengthsAndWeakAreas(skillGraph)
  assert.deepEqual(strengths, ["A", "B", "C"])
  assert.deepEqual(weakAreas, ["F", "E", "D"])
})

// ── syncSkillGraphFromMemoryStates — DI'd ───────────────────────────────────

function baseDeps(overrides = {}) {
  const updateCalls = []
  const supabaseAdmin = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: overrides.profile ?? null, error: null }),
        }),
      }),
      update: (patch) => {
        updateCalls.push(patch)
        return { eq: async () => ({ data: null, error: null }) }
      },
    }),
  }
  return {
    deps: {
      supabaseAdmin,
      loadCapabilityState: overrides.loadCapabilityState || (async () => ({ competencies: [], hasData: false })),
    },
    updateCalls,
  }
}

test("syncSkillGraphFromMemoryStates: no-op (honest, not fabricated) when no memory_states evidence exists yet", async () => {
  const { deps, updateCalls } = baseDeps({
    profile: { skill_graph: [{ label: "SQL (Advanced)", value: 20 }], strengths: [], weak_areas: [] },
  })
  const result = await syncSkillGraphFromMemoryStates({ userId: "u1", domainKey: "data" }, deps)
  assert.equal(result.ok, true)
  assert.equal(result.skipped, "no_reinforced_competencies_yet")
  assert.equal(updateCalls.length, 0)
})

test("syncSkillGraphFromMemoryStates: writes the updated skill_graph and recomputed strengths/weak_areas when the ranking changes", async () => {
  const { deps, updateCalls } = baseDeps({
    profile: {
      skill_graph: [
        { label: "SQL (Advanced)", value: 20 },
        { label: "Python (Pandas/NumPy)", value: 67 },
      ],
      strengths: ["Excel / Spreadsheets: some rich onboarding text"],
      weak_areas: ["SQL (Advanced): you missed joins..."],
    },
    loadCapabilityState: async () => ({
      hasData: true,
      competencies: [{ skillGraphNodeId: "n1", label: "SQL (Advanced)", confidence: 0.71, lastReinforcedAt: "2026-09-04" }],
    }),
  })
  const result = await syncSkillGraphFromMemoryStates({ userId: "u1", domainKey: "data" }, deps)
  assert.equal(result.ok, true)
  assert.equal(updateCalls.length, 1)
  const patch = updateCalls[0]
  assert.equal(patch.skill_graph.find(s => s.label === "SQL (Advanced)").value, 71)
  assert.equal(patch.skill_graph.find(s => s.label === "Python (Pandas/NumPy)").value, 67, "unrelated skill preserved")
  assert.ok(Array.isArray(patch.strengths), "ranking changed (SQL rose above nothing before it existed in top-3) — strengths recomputed")
})

test("syncSkillGraphFromMemoryStates: never fabricates a skill_graph for a profile that doesn't have one yet", async () => {
  const { deps, updateCalls } = baseDeps({
    profile: { skill_graph: null, strengths: [], weak_areas: [] },
    loadCapabilityState: async () => ({
      hasData: true,
      competencies: [{ skillGraphNodeId: "n1", label: "SQL (Advanced)", confidence: 0.71 }],
    }),
  })
  const result = await syncSkillGraphFromMemoryStates({ userId: "u1", domainKey: "data" }, deps)
  assert.equal(result.ok, true)
  assert.equal(result.skipped, "no_skill_graph_on_profile")
  assert.equal(updateCalls.length, 0)
})

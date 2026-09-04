import { test } from "node:test"
import assert from "node:assert/strict"
import { computeEvidenceMultiplier, reinforceArenaSubmission } from "./arenaReinforcement.js"

// ── computeEvidenceMultiplier — pure, no DI needed ──────────────────────────

test("computeEvidenceMultiplier: a perfect score on a hard task weighs more than a bare pass on an easy task", () => {
  const strong = computeEvidenceMultiplier({ score: 100, difficulty: "hard" })
  const bare = computeEvidenceMultiplier({ score: 61, difficulty: "easy" })
  assert.ok(strong > bare, "evidence quality must actually differentiate — this is the whole point of Fix 3")
})

test("computeEvidenceMultiplier: unknown/missing difficulty falls back to medium, never an extreme", () => {
  const unknown = computeEvidenceMultiplier({ score: 80, difficulty: "nonsense" })
  const medium = computeEvidenceMultiplier({ score: 80, difficulty: "medium" })
  assert.equal(unknown, medium)
})

test("computeEvidenceMultiplier: bounded regardless of input — cannot exceed [0.5, 1.4]", () => {
  assert.ok(computeEvidenceMultiplier({ score: 100, difficulty: "expert" }) <= 1.4)
  assert.ok(computeEvidenceMultiplier({ score: -50, difficulty: "easy" }) >= 0.5)
  assert.ok(computeEvidenceMultiplier({ score: 99999, difficulty: "expert" }) <= 1.4)
})

test("computeEvidenceMultiplier: a missing score still returns a sane, bounded default (never NaN)", () => {
  const result = computeEvidenceMultiplier({ score: undefined, difficulty: "medium" })
  assert.ok(Number.isFinite(result))
  assert.ok(result >= 0.5 && result <= 1.4)
})

// ── reinforceArenaSubmission — DI'd, same fake-deps pattern as
// arenaIngestion.test.js's baseDeps/fakeSupabase ─────────────────────────────

function fakeSupabase({ ledgerUpsertData = { id: "ledger-1" } } = {}) {
  const calls = []
  const chain = (table) => {
    const self = {
      _table: table,
      upsert: (row, opts) => { calls.push(["upsert", table, row, opts]); return self },
      update: (patch) => { calls.push(["update", table, patch]); return self },
      select: (...args) => { calls.push(["select", table, args]); return self },
      eq: (...args) => { calls.push(["eq", table, args]); return self },
      maybeSingle: async () => {
        if (table === "arena_skill_reinforcements" && calls.some(c => c[0] === "upsert")) {
          return { data: ledgerUpsertData, error: null }
        }
        return { data: null, error: null }
      },
      then: (resolve) => resolve({ data: null, error: null }),
    }
    return self
  }
  return { supabaseAdmin: { from: chain }, calls }
}

function baseDeps(overrides = {}) {
  const { supabaseAdmin, calls } = fakeSupabase(overrides.sb || {})
  const reinforceCalls = []
  const syncCalls = []
  return {
    deps: {
      supabaseAdmin,
      reinforce: overrides.reinforce || (async (args) => { reinforceCalls.push(args); return { confidence: 0.62 } }),
      syncSkillGraphFromMemoryStates: overrides.syncSkillGraphFromMemoryStates || (async (args) => { syncCalls.push(args); return { ok: true } }),
      logger: { error: () => {}, warn: () => {}, info: () => {} },
    },
    calls, reinforceCalls, syncCalls,
  }
}

test("reinforceArenaSubmission: skips honestly when the mission has no tagged skill_graph_node_id (most roles today)", async () => {
  const { deps, reinforceCalls } = baseDeps()
  const result = await reinforceArenaSubmission({
    userId: "u1", skillGraphNodeId: null, domainKey: "mechanical",
    correct: true, score: 90, difficulty: "easy",
    submissionTable: "domain_submissions", submissionId: "sub-1",
  }, deps)
  assert.equal(result.ok, true)
  assert.equal(result.skipped, "no_skill_graph_node_id")
  assert.equal(reinforceCalls.length, 0, "must never call reinforce() without a real skill target")
})

test("reinforceArenaSubmission: calls reinforce() with source=arena and the computed multiplier on a real submission", async () => {
  const { deps, reinforceCalls } = baseDeps()
  const result = await reinforceArenaSubmission({
    userId: "u1", skillGraphNodeId: "node-sql-advanced", domainKey: "data",
    correct: true, score: 100, difficulty: "medium",
    submissionTable: "domain_submissions", submissionId: "sub-1",
  }, deps)
  assert.equal(result.ok, true)
  assert.equal(reinforceCalls.length, 1)
  assert.equal(reinforceCalls[0].source, "arena")
  assert.equal(reinforceCalls[0].skillGraphNodeId, "node-sql-advanced")
  assert.equal(reinforceCalls[0].correct, true)
  assert.ok(reinforceCalls[0].strengthMultiplier > 1, "a perfect medium-difficulty score should weigh above the neutral 1.0")
})

test("reinforceArenaSubmission: idempotent — a second call for the SAME submission never reinforces twice", async () => {
  // Second call's upsert is a no-op (ignoreDuplicates) — simulate by making
  // the ledger fake return null data (as if the row already existed).
  const { deps, reinforceCalls } = baseDeps({ sb: { ledgerUpsertData: null } })
  const result = await reinforceArenaSubmission({
    userId: "u1", skillGraphNodeId: "node-sql-advanced", domainKey: "data",
    correct: true, score: 100, difficulty: "medium",
    submissionTable: "domain_submissions", submissionId: "sub-1",
  }, deps)
  assert.equal(result.ok, true)
  assert.equal(result.skipped, "already_reinforced")
  assert.equal(reinforceCalls.length, 0, "reinforce() must never run for a submission already in the ledger")
})

test("reinforceArenaSubmission: syncs the skill graph after a real reinforcement, using the given domainKey", async () => {
  const { deps, syncCalls } = baseDeps()
  await reinforceArenaSubmission({
    userId: "u1", skillGraphNodeId: "node-sql-advanced", domainKey: "data",
    correct: true, score: 88, difficulty: "hard",
    submissionTable: "domain_submissions", submissionId: "sub-2",
  }, deps)
  assert.equal(syncCalls.length, 1)
  assert.deepEqual(syncCalls[0], { userId: "u1", domainKey: "data" })
})

test("reinforceArenaSubmission: never throws — a reinforce() failure is caught, logged, and reported as ok:false", async () => {
  const errors = []
  const { deps } = baseDeps({
    reinforce: async () => { throw new Error("db unavailable") },
  })
  deps.logger = { error: (...args) => errors.push(args), warn: () => {}, info: () => {} }
  const result = await reinforceArenaSubmission({
    userId: "u1", skillGraphNodeId: "node-sql-advanced", domainKey: "data",
    correct: true, score: 90, difficulty: "easy",
    submissionTable: "domain_submissions", submissionId: "sub-3",
  }, deps)
  assert.equal(result.ok, false)
  assert.match(result.error, /db unavailable/)
  assert.equal(errors.length, 1, "the failure must be observable server-side, not silently swallowed")
})

test("reinforceArenaSubmission: requires userId/submissionTable/submissionId — never reinforces an unidentifiable event", async () => {
  const { deps, reinforceCalls } = baseDeps()
  const result = await reinforceArenaSubmission({
    skillGraphNodeId: "node-sql-advanced", domainKey: "data", correct: true,
  }, deps)
  assert.equal(result.ok, false)
  assert.equal(reinforceCalls.length, 0)
})

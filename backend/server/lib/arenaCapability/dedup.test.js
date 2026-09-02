import { test } from "node:test"
import assert from "node:assert/strict"
import { normalizeForDedup, wordOverlapRatio, computeFingerprint, checkDuplicate, recordFingerprint, findFingerprintByHash, NEAR_DUPLICATE_THRESHOLD } from "./dedup.js"

/**
 * NO REAL PRODUCTION DATABASE WRITE OCCURS ANYWHERE IN THIS FILE. Every test
 * that touches Supabase injects a fake `deps.supabaseAdmin` — the real
 * supabaseAdmin singleton (backend/server/lib/supabase.js) is never imported
 * here.
 */
function fakeSupabase({ existingByHash = null, insertError = null } = {}) {
  const calls = []
  return {
    supabaseAdmin: {
      from: (table) => ({
        select: () => ({
          eq: (col, val) => ({
            eq: (col2, val2) => ({
              maybeSingle: async () => {
                calls.push({ op: "select", table, filters: { [col]: val, [col2]: val2 } })
                return { data: existingByHash, error: null }
              },
            }),
          }),
        }),
        insert: (row) => {
          calls.push({ op: "insert", table, row })
          return Promise.resolve({ error: insertError })
        },
      }),
    },
    calls,
  }
}

// ── A. Content normalization ────────────────────────────────────────────

test("A1. whitespace differences normalize consistently", () => {
  assert.equal(normalizeForDedup("Fix   the   bug"), normalizeForDedup("Fix the bug"))
  assert.equal(normalizeForDedup("  Fix the bug  \n\n"), normalizeForDedup("Fix the bug"))
})

test("A2. irrelevant formatting differences (case, punctuation) normalize consistently", () => {
  assert.equal(normalizeForDedup("Fix the BUG!!!"), normalizeForDedup("fix the bug"))
  assert.equal(normalizeForDedup("Duplicate payments — race condition?"), normalizeForDedup("duplicate payments race condition"))
})

test("A3. materially different tasks do not collapse accidentally", () => {
  const a = normalizeForDedup("Fix the race condition in the payments retry logic")
  const b = normalizeForDedup("Optimize the SQL query joining three unrelated tables")
  assert.notEqual(a, b)
  assert.ok(wordOverlapRatio(a, b) < NEAR_DUPLICATE_THRESHOLD)
})

// ── B. Fingerprints ──────────────────────────────────────────────────────

test("B4. deterministic hash for identical normalized input", () => {
  const task = { title: "Fix the flaky query", prompt: "The report intermittently duplicates rows." }
  const fp1 = computeFingerprint(task)
  const fp2 = computeFingerprint(task)
  assert.equal(fp1.hash, fp2.hash)
})

test("B5. same content produces the same fingerprint even with whitespace/case noise", () => {
  const fp1 = computeFingerprint({ title: "Fix the flaky query", prompt: "The report intermittently duplicates rows." })
  const fp2 = computeFingerprint({ title: "FIX THE FLAKY QUERY", prompt: "  The report   intermittently duplicates rows.  " })
  assert.equal(fp1.hash, fp2.hash)
})

test("B6. changed semantic content produces a different fingerprint", () => {
  const fp1 = computeFingerprint({ title: "Fix the flaky query", prompt: "The report intermittently duplicates rows." })
  const fp2 = computeFingerprint({ title: "Optimize the join", prompt: "The dashboard query is too slow under load." })
  assert.notEqual(fp1.hash, fp2.hash)
})

test("fingerprint does not depend on provider/model/timestamp metadata (never part of the hashed content)", () => {
  const base = { title: "Fix the flaky query", prompt: "The report intermittently duplicates rows." }
  const withMetadata = { ...base, provider: "groq", model: "openai/gpt-oss-120b", generatedAt: "2026-09-02T00:00:00Z", requestId: "abc-123" }
  assert.equal(computeFingerprint(base).hash, computeFingerprint(withMetadata).hash)
})

// ── C. Deduplication ─────────────────────────────────────────────────────

test("C7. an exact existing fingerprint is detected", async () => {
  const { supabaseAdmin } = fakeSupabase({ existingByHash: { id: "fp-1", task_id: "existing-task-1", task_type: "experiment", normalized_hash: "x" } })
  const result = await checkDuplicate({ taskType: "experiment", task: { title: "Fix the flaky query", prompt: "..." } }, { supabaseAdmin })
  assert.equal(result.isDuplicate, true)
  assert.equal(result.reason, "exact_fingerprint_match")
  assert.equal(result.matchedTaskId, "existing-task-1")
})

test("C8. no fingerprint match, and no near-duplicate in the comparison set, proceeds as not-a-duplicate", async () => {
  const { supabaseAdmin } = fakeSupabase({ existingByHash: null })
  const result = await checkDuplicate({
    taskType: "experiment",
    task: { title: "Fix the flaky query", prompt: "The report intermittently duplicates rows under retry." },
    compareAgainst: [{ id: "other-1", title: "Optimize a join", prompt: "The dashboard query is too slow under load." }],
  }, { supabaseAdmin })
  assert.equal(result.isDuplicate, false)
})

test("C8b. a near-duplicate in the caller-supplied comparison set is detected even without an exact hash match", async () => {
  const { supabaseAdmin } = fakeSupabase({ existingByHash: null })
  const result = await checkDuplicate({
    taskType: "experiment",
    task: { title: "A brand new title", prompt: "The weekly finance report query returns duplicate customer rows under load." },
    compareAgainst: [{ id: "other-1", title: "A different title", prompt: "The weekly finance report query returns duplicate customer rows under heavy load." }],
  }, { supabaseAdmin })
  assert.equal(result.isDuplicate, true)
  assert.equal(result.reason, "near_duplicate_prompt")
})

test("C9. recordFingerprint has no verification gate of its own — the caller is responsible for only invoking it after a task has passed verification (documented contract, not enforced internally, since this module has no knowledge of verification results)", async () => {
  // This test documents the boundary explicitly rather than pretending
  // dedup.js can enforce something it structurally cannot know about.
  const { supabaseAdmin, calls } = fakeSupabase({ existingByHash: null })
  await recordFingerprint({ taskType: "experiment", taskId: "t1", task: { title: "x", prompt: "y" } }, { supabaseAdmin })
  assert.ok(calls.some((c) => c.op === "insert"))
})

test("C10. a verified, accepted task can write a fingerprint", async () => {
  const { supabaseAdmin, calls } = fakeSupabase({ existingByHash: null, insertError: null })
  const result = await recordFingerprint({ taskType: "experiment", taskId: "t1", task: { title: "Fix the flaky query", prompt: "..." } }, { supabaseAdmin })
  assert.equal(result.written, true)
  const insertCall = calls.find((c) => c.op === "insert")
  assert.equal(insertCall.row.task_type, "experiment")
  assert.equal(insertCall.row.task_id, "t1")
  assert.ok(typeof insertCall.row.normalized_hash === "string" && insertCall.row.normalized_hash.length === 64) // sha256 hex
})

test("C11. a duplicate task (hash already present) does not create another fingerprint row", async () => {
  const { supabaseAdmin, calls } = fakeSupabase({ existingByHash: { id: "fp-1", task_id: "existing-task-1" } })
  const result = await recordFingerprint({ taskType: "experiment", taskId: "t2", task: { title: "Fix the flaky query", prompt: "..." } }, { supabaseAdmin })
  assert.equal(result.written, false)
  assert.equal(result.reason, "exact_fingerprint_match")
  assert.equal(calls.some((c) => c.op === "insert"), false) // recheck caught it before ever attempting insert
})

test("C11b. a concurrent-insert race on the same task_id (unique constraint violation) is handled gracefully, not thrown", async () => {
  const { supabaseAdmin } = fakeSupabase({ existingByHash: null, insertError: { code: "23505", message: "duplicate key value violates unique constraint" } })
  const result = await recordFingerprint({ taskType: "experiment", taskId: "t1", task: { title: "x", prompt: "y" } }, { supabaseAdmin })
  assert.equal(result.written, false)
  assert.equal(result.reason, "concurrent_insert_same_task")
})

test("findFingerprintByHash is a pure read — never calls insert", async () => {
  const { supabaseAdmin, calls } = fakeSupabase({ existingByHash: null })
  await findFingerprintByHash({ taskType: "experiment", normalizedHash: "abc" }, { supabaseAdmin })
  assert.equal(calls.every((c) => c.op === "select"), true)
})

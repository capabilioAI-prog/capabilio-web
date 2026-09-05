/**
 * verification/index.test.js — proves verification is deterministic and
 * server-authoritative (spec §33, §44, §58 VERIFICATION section). Tests
 * the sync/no-subprocess verifiers directly plus sql_result (sql.js is a
 * pure-JS/wasm in-memory engine, safe to run in any test environment).
 * test_cases (real subprocess execution) is exercised via the live
 * production smoke test instead, since python3/node availability varies
 * by CI environment.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { verifyMission } from "./index.js"

test("numeric_tolerance: passes within tolerance, fails outside it", async () => {
  const def = { expectedValue: 100, tolerance: 5 }
  const within = await verifyMission("numeric_tolerance", { value: 103 }, def)
  assert.equal(within.passed, true)
  const outside = await verifyMission("numeric_tolerance", { value: 120 }, def)
  assert.equal(outside.passed, false)
})

test("numeric_tolerance: a non-numeric submission fails cleanly, never throws", async () => {
  const result = await verifyMission("numeric_tolerance", { value: "not a number" }, { expectedValue: 100, tolerance: 5 })
  assert.equal(result.passed, false)
  assert.equal(result.score, 0)
})

test("rule_based: passes only when every rule matches, is case-insensitive on the value", async () => {
  const def = { rules: [{ field: "answer", equals: "single_phasing" }] }
  const pass = await verifyMission("rule_based", { answers: { answer: "Single_Phasing" } }, def)
  assert.equal(pass.passed, true)
  const fail = await verifyMission("rule_based", { answers: { answer: "bearing_wear" } }, def)
  assert.equal(fail.passed, false)
})

test("rule_based: a missing answer field fails rather than throwing", async () => {
  const result = await verifyMission("rule_based", { answers: {} }, { rules: [{ field: "answer", equals: "x" }] })
  assert.equal(result.passed, false)
})

test("rubric: deterministic keyword scoring, not an LLM decision — same input always produces the same score", async () => {
  const def = { field: "explanation", criteria: [{ keyword: "overfitting", weight: 2 }, { keyword: "validation", weight: 1 }], passThreshold: 60 }
  const response = { answers: { explanation: "The gap between train and validation accuracy suggests overfitting." } }
  const a = await verifyMission("rubric", response, def)
  const b = await verifyMission("rubric", response, def)
  assert.deepEqual(a, b, "identical input must produce an identical verdict every time")
  assert.equal(a.passed, true)
})

test("rubric: text missing all criteria keywords fails", async () => {
  const def = { field: "explanation", criteria: [{ keyword: "overfitting", weight: 1 }], passThreshold: 60 }
  const result = await verifyMission("rubric", { answers: { explanation: "unrelated text" } }, def)
  assert.equal(result.passed, false)
})

test("sql_result: correct query against the seeded dataset passes", async () => {
  const def = {
    dataset: { tableName: "orders", columns: ["id", "status"], rows: [[1, "active"], [2, "inactive"]] },
    expectedResult: { columns: ["id"], rows: [[1]] },
    matchMode: "unordered_rows",
  }
  const result = await verifyMission("sql_result", { sql: "SELECT id FROM orders WHERE status = 'active'" }, def)
  assert.equal(result.passed, true)
})

test("sql_result: an incorrect query fails, never awards points client-side", async () => {
  const def = {
    dataset: { tableName: "orders", columns: ["id", "status"], rows: [[1, "active"], [2, "inactive"]] },
    expectedResult: { columns: ["id"], rows: [[1]] },
    matchMode: "unordered_rows",
  }
  const result = await verifyMission("sql_result", { sql: "SELECT id FROM orders" }, def) // returns both rows, not just active
  assert.equal(result.passed, false)
})

test("unknown verification_type fails safely instead of throwing", async () => {
  const result = await verifyMission("not_a_real_type", {}, {})
  assert.equal(result.passed, false)
})

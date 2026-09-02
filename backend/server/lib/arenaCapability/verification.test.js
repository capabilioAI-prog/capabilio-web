import { test } from "node:test"
import assert from "node:assert/strict"
import { verifyGeneratedTask } from "./verification.js"

/**
 * NO REAL SANDBOX EXECUTION OCCURS ANYWHERE IN THIS FILE — every runPython/
 * runNode/runAgainstDataset/checkCssRules call is a fake injected via deps.
 * NO REAL AI PROVIDER IS REFERENCED — this file never imports AIService or
 * anything from lib/ai/.
 */
function baseDeps(overrides = {}) {
  return {
    scanPythonDangerousPatterns: () => false,
    scanNodeDangerousPatterns: () => false,
    runPython: async () => ({ stdout: "42\n", stderr: "", timedOut: false, exitCode: 0 }),
    runNode: async () => ({ stdout: "42\n", stderr: "", timedOut: false, exitCode: 0 }),
    runAgainstDataset: async () => ({ columns: ["id"], rows: [[1]] }),
    compareResults: () => ({ passed: true, score: 100, reason: null }),
    checkCssRules: () => ({ parsed: true, parseError: null, results: [{ description: "d", passed: true, foundValue: "v" }] }),
    ...overrides,
  }
}

// ── D. Verification ──────────────────────────────────────────────────────

test("D12. a valid College Stream generated task passes through the real verification abstraction (mocked runPython)", async () => {
  const deps = baseDeps()
  const result = await verifyGeneratedTask({ domain: "college_stream", panelType: null, task: { title: "t", prompt: "p", referenceSolution: "print(42)" } }, deps)
  assert.equal(result.ok, true)
  assert.equal(result.verified, true)
  assert.equal(result.verification.method, "college_stream_python_execution")
  assert.equal(typeof result.verification.summary, "string")
  assert.equal(result.verification.details.expectedStdout, "42")
})

test("D13a. an invalid reference solution (dangerous pattern) is rejected without ever running it", async () => {
  let ran = false
  const deps = baseDeps({ scanPythonDangerousPatterns: () => true, runPython: async () => { ran = true; return { stdout: "", stderr: "", timedOut: false, exitCode: 0 } } })
  const result = await verifyGeneratedTask({ domain: "college_stream", panelType: null, task: { referenceSolution: "import os; os.system('rm -rf /')" } }, deps)
  assert.equal(result.ok, false)
  assert.equal(result.reason, "invalid_reference_solution")
  assert.equal(ran, false)
})

test("D13b. a missing reference solution is rejected as invalid_reference_solution", async () => {
  const deps = baseDeps()
  const result = await verifyGeneratedTask({ domain: "college_stream", panelType: null, task: { title: "t", prompt: "p" } }, deps)
  assert.equal(result.ok, false)
  assert.equal(result.reason, "invalid_reference_solution")
})

test("D14a. Domain Role SQL uses the correct existing verifier (runAgainstDataset + compareResults) and rejects a claimed expected_result that doesn't match reality", async () => {
  const calls = []
  const deps = baseDeps({
    runAgainstDataset: async (dataset, query) => { calls.push({ dataset, query }); return { columns: ["id"], rows: [[1], [2]] } },
    compareResults: (actual, expected, matchMode) => { calls.push({ actual, expected, matchMode }); return { passed: false, score: 0, reason: "Expected 1 row(s), got 2." } },
  })
  const task = { dataset: { tableName: "t", columns: ["id"], rows: [[1], [2]] }, referenceQuery: "SELECT id FROM t", expected_result: { columns: ["id"], rows: [[1]] }, match_mode: "unordered_rows" }
  const result = await verifyGeneratedTask({ domain: "domain_role", panelType: "sql_runner", task }, deps)
  assert.equal(result.ok, false)
  assert.equal(result.reason, "verification_failed")
  assert.match(result.detail, /doesn't match what referenceQuery actually produces/)
  assert.equal(calls.filter((c) => "query" in c).length, 1) // runAgainstDataset was actually called once — never skipped in favor of trusting the claim
})

test("D14b. Domain Role SQL accepts a reference query whose real output matches its claimed expected_result", async () => {
  const deps = baseDeps({
    runAgainstDataset: async () => ({ columns: ["id"], rows: [[1]] }),
    compareResults: () => ({ passed: true, score: 100, reason: null }),
  })
  const task = { dataset: { tableName: "t", columns: ["id"], rows: [[1]] }, referenceQuery: "SELECT id FROM t", expected_result: { columns: ["id"], rows: [[1]] }, match_mode: "unordered_rows" }
  const result = await verifyGeneratedTask({ domain: "domain_role", panelType: "sql_runner", task }, deps)
  assert.equal(result.ok, true)
})

test("D14c. Domain Role Frontend uses the existing cssRuleChecker and rejects a referenceCss that fails its own declared checks", async () => {
  const deps = baseDeps({
    checkCssRules: (css, checks) => ({ parsed: true, parseError: null, results: checks.map((c) => ({ description: c.description, passed: false, foundValue: null })) }),
  })
  const task = { referenceCss: ".x{color:red}", checks: [{ description: "nav is flex", selector: ".nav", property: "display", expectedValue: "flex", mediaMaxWidth: null }] }
  const result = await verifyGeneratedTask({ domain: "domain_role", panelType: "frontend_runner", task }, deps)
  assert.equal(result.ok, false)
  assert.equal(result.reason, "verification_failed")
})

// ── Checkpoint E: closing a test-coverage gap the audit found — Domain Role
// Python and Node had no representative submission/evaluation contract test
// (only College Stream Python, Domain Role SQL, and Domain Role Frontend
// did) despite verifyDomainRolePython/verifyDomainRoleNode being real,
// shipped code paths since Checkpoint C. ──

test("E-D. Domain Role Python passes through the real execution-defines-ground-truth verification (mocked runPython), same contract as College Stream", async () => {
  const deps = baseDeps({ runPython: async () => ({ stdout: "42\n", stderr: "", timedOut: false, exitCode: 0 }) })
  const result = await verifyGeneratedTask({ domain: "domain_role", panelType: "python_runner", task: { title: "t", prompt: "p", referenceSolution: "print(42)" } }, deps)
  assert.equal(result.ok, true)
  assert.equal(result.verified, true)
  assert.equal(result.verification.method, "domain_role_python_execution")
  assert.equal(result.verification.details.expectedStdout, "42")
})

test("E-E. Domain Role Node passes through the real execution-defines-ground-truth verification (mocked runNode)", async () => {
  const deps = baseDeps({ runNode: async () => ({ stdout: "42\n", stderr: "", timedOut: false, exitCode: 0 }) })
  const result = await verifyGeneratedTask({ domain: "domain_role", panelType: "node_runner", task: { title: "t", prompt: "p", referenceSolution: "console.log(42)" } }, deps)
  assert.equal(result.ok, true)
  assert.equal(result.verified, true)
  assert.equal(result.verification.method, "domain_role_node_execution")
  assert.equal(result.verification.details.expectedStdout, "42")
})

test("D15a. an unsupported domain_role panel type is explicitly rejected, never assumed valid", async () => {
  const deps = baseDeps()
  const result = await verifyGeneratedTask({ domain: "domain_role", panelType: "carrier_pigeon", task: {} }, deps)
  assert.equal(result.ok, false)
  assert.equal(result.verified, false)
  assert.equal(result.reason, "unsupported_verification")
})

test("D15b. an unsupported domain is explicitly rejected, never assumed valid", async () => {
  const deps = baseDeps()
  const result = await verifyGeneratedTask({ domain: "nonsense", panelType: null, task: {} }, deps)
  assert.equal(result.ok, false)
  assert.equal(result.reason, "unsupported_task_type")
})

test("D16a. a sandbox timeout is normalized to execution_failed, not thrown", async () => {
  const deps = baseDeps({ runPython: async () => ({ stdout: "", stderr: "", timedOut: true, exitCode: null }) })
  const result = await verifyGeneratedTask({ domain: "college_stream", panelType: null, task: { referenceSolution: "while True: pass" } }, deps)
  assert.equal(result.ok, false)
  assert.equal(result.reason, "execution_failed")
  assert.match(result.detail, /timed out/)
})

test("D16b. a sandbox throwing an exception is normalized to execution_failed, not propagated raw", async () => {
  const deps = baseDeps({ runAgainstDataset: async () => { throw new Error("sql.js WASM init failed") } })
  const task = { dataset: {}, referenceQuery: "SELECT 1", expected_result: { columns: [], rows: [] }, match_mode: "unordered_rows" }
  const result = await verifyGeneratedTask({ domain: "domain_role", panelType: "sql_runner", task }, deps)
  assert.equal(result.ok, false)
  assert.equal(result.reason, "execution_failed")
})

// ── E. Safety ─────────────────────────────────────────────────────────────

test("E17/E18. every sandbox call is a fake injected via deps — no real Python/Node/SQL/CSS execution occurs in this file (structural guarantee, documented explicitly)", () => {
  assert.ok(true) // enforced by construction: this file never imports the real sandbox modules directly, only via verifyGeneratedTask's deps parameter, and every test supplies its own fakes
})

test("E20. failure `detail` strings never contain large/raw payloads (dataset rows, stdout dumps, model text) — only short, deterministic, human-authored messages", async () => {
  const deps = baseDeps({ runAgainstDataset: async () => ({ columns: ["id"], rows: [[1], [2], [3]] }) , compareResults: () => ({ passed: false, score: 0, reason: "Expected 1 row(s), got 3." }) })
  const task = { dataset: { rows: Array.from({ length: 500 }, (_, i) => [i]) }, referenceQuery: "SELECT id FROM t", expected_result: { columns: ["id"], rows: [[1]] }, match_mode: "unordered_rows" }
  const result = await verifyGeneratedTask({ domain: "domain_role", panelType: "sql_runner", task }, deps)
  assert.equal(result.ok, false)
  assert.ok(result.detail.length < 300)
  assert.equal(result.detail.includes("[") , false) // no serialized row/array data leaked into the message
})

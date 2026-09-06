/**
 * arena/verification/index.js — deterministic verification dispatcher
 * (spec §33, §55). Every verification_type here is rule-based/executable;
 * none of them ask an LLM to decide pass/fail. Points and pass/fail are
 * always computed here, server-side, never client-submitted.
 */
import { runPython } from "../../sandbox/pythonSandbox.js"
import { runNode } from "../../sandbox/nodeSandbox.js"
import { runAgainstDataset, compareResults } from "../../sandbox/sqlSandbox.js"

function normalizeStdout(s) {
  return (s || "").trim().replace(/\r\n/g, "\n")
}

/** verification_type: test_cases (workstation_type: coding).
 *  response: { code: string, language: "python"|"javascript" }
 *  verification_definition: { language, testCases: [{ expectedStdout, matchType? }] } */
async function verifyTestCases(response, definition) {
  const language = definition.language || response.language || "javascript"
  const run = language === "python" ? runPython : runNode
  let execResult
  try {
    execResult = await run(response.code, { usePackages: false })
  } catch (e) {
    return { passed: false, score: 0, detail: { error: e.message } }
  }
  if (execResult.timedOut) return { passed: false, score: 0, detail: { error: "Execution timed out." } }

  const stdout = normalizeStdout(execResult.stdout)
  const testCases = definition.testCases || []
  let passedCount = 0
  const results = testCases.map((tc) => {
    const expected = normalizeStdout(tc.expectedStdout)
    const ok = tc.matchType === "contains" ? stdout.includes(expected) : stdout === expected
    if (ok) passedCount++
    return { expected, ok }
  })
  const total = testCases.length || 1
  const passed = passedCount === total
  return { passed, score: Math.round((passedCount / total) * 100), detail: { stdout, stderr: execResult.stderr, results } }
}

/** verification_type: sql_result (workstation_type: sql).
 *  response: { sql: string }
 *  verification_definition: { dataset, expectedResult, matchMode? } */
async function verifySqlResult(response, definition) {
  let actual
  try {
    actual = await runAgainstDataset(definition.dataset, response.sql)
  } catch (e) {
    return { passed: false, score: 0, detail: { error: e.message } }
  }
  const cmp = compareResults(actual, definition.expectedResult, definition.matchMode || "unordered_rows")
  return { passed: cmp.passed, score: cmp.score, detail: { actual, reason: cmp.reason } }
}

/** verification_type: numeric_tolerance (workstation_type: calculation).
 *  response: { value: number }
 *  verification_definition: { expectedValue, tolerance } */
function verifyNumericTolerance(response, definition) {
  const submitted = Number(response.value)
  if (!Number.isFinite(submitted)) return { passed: false, score: 0, detail: { error: "Submitted value is not a number." } }
  const tolerance = definition.tolerance ?? 0
  const withinTolerance = Math.abs(submitted - definition.expectedValue) <= tolerance
  return { passed: withinTolerance, score: withinTolerance ? 100 : 0, detail: { submitted, expectedValue: definition.expectedValue, tolerance } }
}

/** verification_type: rule_based (workstation_type: structured_response | decision | log_investigation).
 *  response: { answers: Record<string, string> }
 *  verification_definition: { rules: [{ field, equals } | { field, numeric: { expected, tolerance } }] } —
 *  every rule must match. A `numeric` rule (added for simulation missions
 *  like the EEE RLC lab's resonance-frequency field, where the correct
 *  answer is a computed value with a tolerance band, not a fixed string)
 *  parses the submission as a number and checks it's within tolerance of
 *  the expected value; a plain `equals` rule keeps its original
 *  case-insensitive string comparison for categorical fields. */
function verifyRuleBased(response, definition) {
  const answers = response.answers || {}
  const rules = definition.rules || []
  if (rules.length === 0) return { passed: false, score: 0, detail: { error: "No rules defined." } }
  let matched = 0
  const results = rules.map((rule) => {
    let ok
    if (rule.numeric) {
      const submitted = Number(answers[rule.field])
      ok = Number.isFinite(submitted) && Math.abs(submitted - rule.numeric.expected) <= (rule.numeric.tolerance ?? 0)
    } else {
      const submitted = (answers[rule.field] ?? "").toString().trim().toLowerCase()
      const expected = (rule.equals ?? "").toString().trim().toLowerCase()
      ok = submitted === expected
    }
    if (ok) matched++
    return { field: rule.field, ok }
  })
  const passed = matched === rules.length
  return { passed, score: Math.round((matched / rules.length) * 100), detail: { results } }
}

/** verification_type: rubric (workstation_type: structured_response | log_investigation).
 *  response: { answers: Record<string, string> } — free-text field(s).
 *  verification_definition: { field, criteria: [{ keyword, weight }], passThreshold }
 *  Deterministic keyword-presence scoring, never an LLM pass/fail decision. */
function verifyRubric(response, definition) {
  const text = ((response.answers || {})[definition.field] || "").toLowerCase()
  const criteria = definition.criteria || []
  const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 1), 0) || 1
  let earned = 0
  const matches = criteria.map((c) => {
    const hit = text.includes(String(c.keyword).toLowerCase())
    if (hit) earned += c.weight || 1
    return { keyword: c.keyword, hit }
  })
  const score = Math.round((earned / totalWeight) * 100)
  const passThreshold = definition.passThreshold ?? 60
  return { passed: score >= passThreshold, score, detail: { matches, passThreshold } }
}

const VERIFIERS = {
  test_cases: verifyTestCases,
  sql_result: verifySqlResult,
  numeric_tolerance: verifyNumericTolerance,
  rule_based: verifyRuleBased,
  rubric: verifyRubric,
}

/**
 * @param {string} verificationType
 * @param {object} response — student-submitted, shaped per verificationType above
 * @param {object} verificationDefinition — from the challenge row, never client-supplied
 * @returns {Promise<{ passed: boolean, score: number, detail: object }>}
 */
export async function verifyMission(verificationType, response, verificationDefinition) {
  const verifier = VERIFIERS[verificationType]
  if (!verifier) return { passed: false, score: 0, detail: { error: `No verifier for verification_type "${verificationType}"` } }
  return verifier(response, verificationDefinition)
}

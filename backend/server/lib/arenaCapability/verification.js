/**
 * verification.js — Arena Capability Engine, Phase 3, Checkpoint C.
 * ---------------------------------------------------------------------------
 * PRIMARY RULE: never trust an AI-generated reference solution merely
 * because the AI claims it's correct. Every verifier below re-executes the
 * reference solution for real, through the EXACT SAME deterministic
 * sandboxes/checkers that already grade live student submissions AND that
 * the existing offline generator scripts already use to verify their own
 * output before insert (verified by reading each script directly — the
 * accept/reject sequence per domain/panelType below is a line-for-line
 * match of scripts/generate{CollegeStreamContent,DomainRoleMissions,
 * Python/Node/FrontendDomainMissions}.mjs). No new sandbox is added here.
 *
 * Verification-only: does not persist anything, does not fingerprint, does
 * not touch task_generation_events. `detail`/`verification.summary` are
 * already the same short, safe, human-authored messages the offline
 * scripts already print to console — never raw stdout/stderr dumps, never
 * dataset contents, never AI/provider payloads.
 */
import { scanForDangerousPatterns as scanPythonDangerousPatterns, runPython } from "../collegeStream/pythonSandbox.js"
import { scanForDangerousPatterns as scanNodeDangerousPatterns, runNode } from "../collegeStream/nodeSandbox.js"
import { runAgainstDataset, compareResults, SqlSandboxError } from "../domainRole/sqlSandbox.js"
import { checkCssRules } from "../domainRole/cssRuleChecker.js"

export const defaultDeps = {
  runPython, scanPythonDangerousPatterns,
  runNode, scanNodeDangerousPatterns,
  runAgainstDataset, compareResults,
  checkCssRules,
}

// Exact existing constants from the offline scripts — not invented.
const COLLEGE_STREAM_PYTHON_TIMEOUT_MS = 5000 // scripts/generateCollegeStreamContent.mjs
const DOMAIN_ROLE_PYTHON_TIMEOUT_MS = 15000 // scripts/generatePythonDomainMissions.mjs (package-backed, longer budget)
const DOMAIN_ROLE_NODE_TIMEOUT_MS = 5000 // scripts/generateNodeDomainMissions.mjs

// Normalized failure reasons Checkpoint D will branch on. `verification_failed`
// covers "ran fine, but the claimed answer/checks don't hold up" (the
// PRIMARY RULE case); `execution_failed` covers "the sandbox itself
// couldn't run it" (timeout/crash/parse error); `invalid_reference_solution`
// covers "the generated task didn't even have the fields needed to try";
// `unsupported_verification`/`unsupported_task_type` cover a domain/panel
// type with no verifier wired at all — never silently treated as passing.
function fail(reason, detail) {
  return { ok: false, verified: false, reason, detail, verification: null }
}
function pass(method, summary, details) {
  return { ok: true, verified: true, reason: null, detail: null, verification: { method, summary, details } }
}

// ── College Stream: execution-defines-ground-truth (no claimed value to ──
// compare against — the reference solution's own real stdout becomes the
// rubric later, exactly as generateCollegeStreamContent.mjs already does).
async function verifyCollegeStream(task, deps) {
  if (!task?.referenceSolution) return fail("invalid_reference_solution", "missing referenceSolution")
  if (deps.scanPythonDangerousPatterns(task.referenceSolution)) {
    return fail("invalid_reference_solution", "reference solution uses a disallowed operation (file/network/system access)")
  }
  let run
  try {
    run = await deps.runPython(task.referenceSolution, { timeoutMs: COLLEGE_STREAM_PYTHON_TIMEOUT_MS })
  } catch (err) {
    return fail("execution_failed", `sandbox error: ${err.message}`)
  }
  if (run.timedOut) return fail("execution_failed", "reference solution timed out or exceeded resource limits")
  if (run.exitCode !== 0) return fail("execution_failed", `reference solution exited with code ${run.exitCode}`)
  const expectedStdout = run.stdout.trim()
  if (!expectedStdout) return fail("verification_failed", "reference solution produced empty stdout — degenerate task")
  return pass("college_stream_python_execution", "Reference solution executed successfully and produced output.", { expectedStdout })
}

// ── Domain Role Python: same execution-defines-ground-truth model as ──
// College Stream, longer timeout budget for package-backed (numpy/pandas) code.
async function verifyDomainRolePython(task, deps) {
  if (!task?.referenceSolution) return fail("invalid_reference_solution", "missing referenceSolution")
  if (deps.scanPythonDangerousPatterns(task.referenceSolution)) {
    return fail("invalid_reference_solution", "reference solution uses a disallowed operation (file/network/system access)")
  }
  let run
  try {
    run = await deps.runPython(task.referenceSolution, { timeoutMs: DOMAIN_ROLE_PYTHON_TIMEOUT_MS, usePackages: !!task.usePackages })
  } catch (err) {
    return fail("execution_failed", `sandbox error: ${err.message}`)
  }
  if (run.timedOut) return fail("execution_failed", "reference solution timed out or exceeded resource limits")
  if (run.exitCode !== 0) return fail("execution_failed", `reference solution exited with code ${run.exitCode}`)
  const expectedStdout = run.stdout.trim()
  if (!expectedStdout) return fail("verification_failed", "reference solution produced empty stdout — degenerate task")
  return pass("domain_role_python_execution", "Reference solution executed successfully and produced output.", { expectedStdout })
}

// ── Domain Role Node: same model, Node runtime. ──
async function verifyDomainRoleNode(task, deps) {
  if (!task?.referenceSolution) return fail("invalid_reference_solution", "missing referenceSolution")
  if (deps.scanNodeDangerousPatterns(task.referenceSolution)) {
    return fail("invalid_reference_solution", "reference solution uses a disallowed operation (file/network/system access)")
  }
  let run
  try {
    run = await deps.runNode(task.referenceSolution, { timeoutMs: DOMAIN_ROLE_NODE_TIMEOUT_MS })
  } catch (err) {
    return fail("execution_failed", `sandbox error: ${err.message}`)
  }
  if (run.timedOut) return fail("execution_failed", "reference solution timed out or exceeded resource limits")
  if (run.exitCode !== 0) return fail("execution_failed", `reference solution exited with code ${run.exitCode}`)
  const expectedStdout = run.stdout.trim()
  if (!expectedStdout) return fail("verification_failed", "reference solution produced empty stdout — degenerate task")
  return pass("domain_role_node_execution", "Reference solution executed successfully and produced output.", { expectedStdout })
}

// ── Domain Role SQL: the AI DOES claim a specific expected_result — this ──
// is the purest "never trust the claim" case: independently re-run
// referenceQuery and require it to actually produce that claimed result.
// Also verifies (existing pattern) that starterQuery, if present, is
// genuinely broken — verification-only, never persisted (Phase 3 targets
// the schema without starter_query, per the Domain Role Rule).
async function verifyDomainRoleSql(task, deps) {
  if (!task?.dataset || !task?.referenceQuery || !task?.expected_result || !task?.match_mode) {
    return fail("invalid_reference_solution", "missing dataset/referenceQuery/expected_result/match_mode")
  }
  let actual
  try {
    actual = await deps.runAgainstDataset(task.dataset, task.referenceQuery)
  } catch (err) {
    return fail("execution_failed", err instanceof SqlSandboxError ? err.message : `sandbox error: ${err.message}`)
  }
  if (!actual.rows || actual.rows.length === 0) {
    return fail("verification_failed", "reference query produced zero rows — degenerate task")
  }
  const comparison = deps.compareResults(actual, task.expected_result, task.match_mode)
  if (!comparison.passed) {
    return fail("verification_failed", `claimed expected_result doesn't match what referenceQuery actually produces (${comparison.reason})`)
  }
  if (task.starterQuery) {
    let starterActual = null
    try { starterActual = await deps.runAgainstDataset(task.dataset, task.starterQuery) }
    catch { /* a starter that doesn't even run is still a legitimate bug for a junior to diagnose */ }
    const starterMatchesExpected = starterActual && deps.compareResults(starterActual, task.expected_result, task.match_mode).passed
    if (starterMatchesExpected) {
      return fail("verification_failed", "starter query already produces the correct result — no real bug for the student to fix")
    }
  }
  return pass("domain_role_sql_comparison", "Reference query's real output matches the claimed expected result.", { actualRowCount: actual.rows.length })
}

// ── Domain Role Frontend: HAS a trustworthy automated verifier — confirmed ──
// by reading cssRuleChecker.js and scripts/generateFrontendDomainMissions.mjs
// directly. The AI also declares `checks` (structural CSS assertions); the
// SAME checker that grades live student submissions re-parses referenceCss
// and requires every check to pass.
async function verifyDomainRoleFrontend(task, deps) {
  if (!task?.referenceCss || !Array.isArray(task?.checks) || task.checks.length === 0) {
    return fail("invalid_reference_solution", "missing referenceCss/checks")
  }
  const refResult = deps.checkCssRules(task.referenceCss, task.checks)
  if (!refResult.parsed) return fail("execution_failed", `referenceCss failed to parse: ${refResult.parseError}`)
  const refAllPass = refResult.results.every((r) => r.passed)
  if (!refAllPass) {
    const failing = refResult.results.filter((r) => !r.passed).map((r) => r.description)
    return fail("verification_failed", `referenceCss doesn't satisfy its own checks (${failing.join("; ")})`)
  }
  if (task.starterCss) {
    const starterResult = deps.checkCssRules(task.starterCss, task.checks)
    const starterAllPass = starterResult.parsed && starterResult.results.every((r) => r.passed)
    if (starterAllPass) {
      return fail("verification_failed", "starter CSS already satisfies every check — no real bug for the student to fix")
    }
  }
  return pass("domain_role_frontend_css_check", "Reference CSS satisfies every declared structural check.", { checksPassed: refResult.results.length })
}

/**
 * @param {{ domain: "college_stream"|"domain_role", panelType: string|null, task: object }} args
 * @returns {Promise<{
 *   ok: boolean, verified: boolean,
 *   reason: "verification_failed"|"execution_failed"|"invalid_reference_solution"|"unsupported_verification"|"unsupported_task_type"|null,
 *   detail: string|null,
 *   verification: {method:string, summary:string, details:object}|null,
 *   domain, panelType, task
 * }>}
 */
export async function verifyGeneratedTask({ domain, panelType, task }, deps = defaultDeps) {
  let result

  if (domain === "college_stream") {
    result = await verifyCollegeStream(task, deps)
  } else if (domain === "domain_role") {
    switch (panelType) {
      case "sql_runner": result = await verifyDomainRoleSql(task, deps); break
      case "python_runner": result = await verifyDomainRolePython(task, deps); break
      case "node_runner": result = await verifyDomainRoleNode(task, deps); break
      case "frontend_runner": result = await verifyDomainRoleFrontend(task, deps); break
      default:
        // Explicit, honest gap-reporting — do NOT fake verification for a
        // panel type with no trustworthy automated verifier. (Today, all 4
        // registered panel types DO have one; this branch exists for a
        // future panel type added without a matching verifier ever being
        // wired here.)
        result = fail("unsupported_verification", `no trustworthy automated verifier exists for domain_role panel_type "${panelType}"`)
    }
  } else {
    result = fail("unsupported_task_type", `unknown domain "${domain}"`)
  }

  return { ...result, domain, panelType: panelType || null, task }
}

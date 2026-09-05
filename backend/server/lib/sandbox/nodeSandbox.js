/**
 * nodeSandbox.js — Career Workspace refactor (2026-08-20), Software
 * Engineering roles (SWE / Backend / Full Stack / Frontend-as-JS-logic).
 *
 * Runs a student's submitted JavaScript in a fresh `node` subprocess and
 * captures stdout for comparison against an expected value — exact same
 * shape and SECURITY MODEL as pythonSandbox.js in this same directory
 * (read that file's header if you haven't; this is a deliberate mirror,
 * not a divergent design):
 *   - Process-level isolation, NOT container/VM-level. Mitigates runaway
 *     CPU/memory/fork-bombs/credential-leakage/output-DoS via the same
 *     four mechanisms (timeout+SIGKILL, ulimit -v, ulimit -u, stripped env).
 *   - Does NOT provide filesystem or network isolation — same documented,
 *     informed trade-off, same "full container/VM isolation is the correct
 *     long-term answer, flagged as follow-up work" status.
 *   - The dangerous-pattern scan below is best-effort defense-in-depth for
 *     Node's equivalent risky APIs (fs, child_process, net, process.env,
 *     eval/Function), NOT a security boundary — real safety is the process
 *     limits above.
 *
 * `node --experimental-permission` (Node 20+) is deliberately NOT used
 * here even though it exists — it would be a real, meaningfully stronger
 * boundary, but changing the sandbox's actual security model is bigger
 * than "reuse the proven pattern for a second language," and this file's
 * job is that reuse, not a new security design. Flagged as a genuine
 * follow-up, not silently skipped.
 */
import { spawn, spawnSync } from "node:child_process"
import { mkdtempSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

export class NodeSandboxError extends Error {}
export class NodeSandboxBusyError extends Error {}

const MAX_CODE_LENGTH = 20_000
const MAX_STDOUT_BYTES = 64 * 1024
const DEFAULT_TIMEOUT_MS = 5_000
// 4GB, not pythonSandbox.js's 256MB (Vision Reset, 2026-08-20 — real
// production bug, found via live submission verification on Render, not
// hypothetical): `ulimit -v` bounds VIRTUAL address space, and V8 reserves
// several GB of it at platform-init time (pointer-compression cage +
// per-thread stacks for its own libuv threadpool) before a script's first
// line even runs — completely independent of the script's actual memory
// use. 256MB was copy-pasted from Python's limit (CPython has no
// comparable up-front reservation, so it never hit this), and on Render's
// Linux container it deterministically crashed `node` itself with
// "Assertion failed: (0) == (uv_thread_create(...))" before the sandboxed
// script could run — every node_runner submission failed. 4GB clears V8's
// own startup reservation with headroom while still being a real ceiling
// against a genuinely pathological allocation; wall-clock timeout+SIGKILL,
// `ulimit -t` CPU time, and `ulimit -u` process count remain the primary,
// unweakened defenses against runaway resource use.
const MEMORY_LIMIT_KB = 4 * 1024 * 1024
const CPU_LIMIT_SECONDS = 5
const MAX_PROCESSES = 16
// Separate concurrency budget from Python's — the two sandboxes share the
// same host but are independent process pools; capping them separately
// (rather than one shared counter) means a burst of Python submissions
// can't starve Node ones or vice versa. Same conservative-starting-point
// reasoning as pythonSandbox.js's own constant.
const MAX_CONCURRENT_EXECUTIONS = 4
let activeExecutions = 0

// Best-effort, not a boundary — see file header. Node-flavored equivalents
// of pythonSandbox.js's DANGEROUS_PATTERNS list.
const DANGEROUS_PATTERNS = [
  /require\s*\(\s*['"]fs['"]\s*\)/, /require\s*\(\s*['"]child_process['"]\s*\)/,
  /require\s*\(\s*['"]net['"]\s*\)/, /require\s*\(\s*['"]http['"]\s*\)/, /require\s*\(\s*['"]https['"]\s*\)/,
  /require\s*\(\s*['"]dgram['"]\s*\)/, /require\s*\(\s*['"]cluster['"]\s*\)/,
  /\bimport\s+.*from\s+['"](fs|child_process|net|http|https|dgram|cluster)['"]/,
  /process\s*\.\s*env/, /process\s*\.\s*exit/, /process\s*\.\s*binding/,
  /\beval\s*\(/, /new\s+Function\s*\(/,
]

let availabilityCache = null

/** Cached check for whether `node` is reachable — same "honest unavailable,
 * never a fake pass" discipline as pythonSandbox.js's checkPythonAvailable(). */
export function checkNodeAvailable() {
  if (availabilityCache !== null) return availabilityCache
  try {
    const result = spawnSync("node", ["--version"], { timeout: 3000 })
    availabilityCache = result.status === 0
  } catch {
    availabilityCache = false
  }
  return availabilityCache
}

/**
 * @param {string} code - student-submitted JavaScript source (plain
 *   Node.js, CommonJS — no bundler, no JSX/TSX transform)
 * @param {{ timeoutMs?: number }} [opts]
 * @returns {Promise<{ stdout: string, stderr: string, timedOut: boolean, exitCode: number|null }>}
 */
export function runNode(code, opts = {}) {
  const timeoutMs = opts.timeoutMs || DEFAULT_TIMEOUT_MS

  if (typeof code !== "string" || !code.trim()) {
    throw new NodeSandboxError("Code is empty.")
  }
  if (code.length > MAX_CODE_LENGTH) {
    throw new NodeSandboxError(`Code exceeds the ${MAX_CODE_LENGTH}-character limit.`)
  }

  return new Promise((resolve, reject) => {
    let dir
    try {
      dir = mkdtempSync(path.join(tmpdir(), "capabilio-node-"))
    } catch (e) {
      reject(new NodeSandboxError(`Sandbox setup failed: ${e.message}`))
      return
    }

    const scriptPath = path.join(dir, "submission.js")
    try {
      writeFileSync(scriptPath, code, { mode: 0o400 })
    } catch (e) {
      rmSync(dir, { recursive: true, force: true })
      reject(new NodeSandboxError(`Sandbox setup failed: ${e.message}`))
      return
    }

    // Same ulimit-via-shell-wrapper pattern as pythonSandbox.js, including
    // its `;` (not `&&`) fix so one unsupported ulimit flag (e.g. `-v` on
    // macOS dev) never aborts the whole chain before node even runs.
    const shellCmd = [
      `ulimit -v ${MEMORY_LIMIT_KB} 2>/dev/null`,
      `ulimit -t ${CPU_LIMIT_SECONDS} 2>/dev/null`,
      `ulimit -u ${MAX_PROCESSES} 2>/dev/null`,
      `exec node --disallow-code-generation-from-strings "${scriptPath}"`,
    ].join("; ")

    const child = spawn("bash", ["-c", shellCmd], {
      cwd: dir,
      env: { PATH: process.env.PATH || "/usr/bin:/bin" },
      timeout: timeoutMs,
      killSignal: "SIGKILL",
    })

    let stdout = ""
    let stderr = ""
    let stdoutTruncated = false

    child.stdout.on("data", chunk => {
      if (stdout.length >= MAX_STDOUT_BYTES) {
        stdoutTruncated = true
        child.kill("SIGKILL")
        return
      }
      stdout += chunk.toString()
    })
    child.stderr.on("data", chunk => {
      if (stderr.length < MAX_STDOUT_BYTES) stderr += chunk.toString()
    })

    let timedOut = false
    child.on("error", err => {
      rmSync(dir, { recursive: true, force: true })
      reject(new NodeSandboxError(`Failed to start sandbox: ${err.message}`))
    })
    child.on("close", (exitCode, signal) => {
      rmSync(dir, { recursive: true, force: true })
      if (signal === "SIGTERM" || signal === "SIGKILL") timedOut = timedOut || exitCode === null
      resolve({
        stdout: stdout.slice(0, MAX_STDOUT_BYTES),
        stderr: stderr.slice(0, MAX_STDOUT_BYTES),
        timedOut: timedOut || stdoutTruncated,
        exitCode,
      })
    })

    const killTimer = setTimeout(() => {
      timedOut = true
      child.kill("SIGKILL")
    }, timeoutMs + 200)
    child.on("close", () => clearTimeout(killTimer))
  })
}

export function scanForDangerousPatterns(code) {
  return DANGEROUS_PATTERNS.some(re => re.test(code))
}

/**
 * @param {object} rubric - { type: "node_stdout_match", expected_stdout, timeout_ms? }
 * @param {string} code - student-submitted JavaScript source
 * @returns {Promise<{ score: number, passed: boolean, stdout: string, stderr: string, error: string|null }>}
 */
export async function evaluateNodeStdout(rubric, code) {
  if (typeof rubric.expected_stdout !== "string") {
    throw new NodeSandboxError("node_stdout_match rubric requires a string 'expected_stdout'")
  }
  if (!checkNodeAvailable()) {
    throw new NodeSandboxError("Node execution isn't available in this environment.")
  }
  if (scanForDangerousPatterns(code)) {
    return { score: 0, passed: false, stdout: "", stderr: "", error: "Submission uses a disallowed operation (fs/network/process access). Solve it with plain computation and console.log()." }
  }

  if (activeExecutions >= MAX_CONCURRENT_EXECUTIONS) {
    throw new NodeSandboxBusyError("Code execution is at capacity right now — please try again in a few seconds.")
  }

  activeExecutions++
  let stdout, stderr, timedOut, exitCode
  try {
    ({ stdout, stderr, timedOut, exitCode } = await runNode(code, { timeoutMs: rubric.timeout_ms }))
  } finally {
    activeExecutions--
  }

  if (timedOut) {
    return { score: 0, passed: false, stdout, stderr, error: "Execution timed out or exceeded resource limits." }
  }
  if (exitCode !== 0) {
    return { score: 0, passed: false, stdout, stderr, error: stderr.trim() || `Process exited with code ${exitCode}.` }
  }

  const normalize = s => s.trim().replace(/\r\n/g, "\n")
  const isMatch = normalize(stdout) === normalize(rubric.expected_stdout)
  return { score: isMatch ? 100 : 0, passed: isMatch, stdout, stderr, error: null }
}

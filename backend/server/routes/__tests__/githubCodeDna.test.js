/**
 * Regression guard (2026-09-03) for the GitHub Code DNA canonical-identity
 * redesign — source-scan style, consistent with security.test.js and the
 * other regression tests in this directory: asserts the contract at the
 * file-content level (auth required, no raw provider errors leaked, no
 * client-supplied user id trusted, evidence-graded ownership language,
 * shared-secret-gated internal scanner) so a future edit can't silently
 * weaken any of these.
 */
import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const routesDir = path.join(__dirname, "..")
const githubSrc = readFileSync(path.join(routesDir, "github.js"), "utf8")
const internalSrc = readFileSync(path.join(routesDir, "internalCodeDnaScan.js"), "utf8")
const connectionSrc = readFileSync(path.join(routesDir, "../lib/codeDna/connection.js"), "utf8")
const serverSrc = readFileSync(path.join(routesDir, "../../server.js"), "utf8")

describe("github.js — canonical connection routes exist and require auth", () => {
  for (const route of ['router.post("/connect"', 'router.post("/disconnect"', 'router.get("/connection"']) {
    test(`${route} ...) is present, behind router.use(requireAuth)`, () => {
      assert.ok(githubSrc.includes(route))
    })
  }
  test("router-level auth guard covers the whole file (router.use(requireAuth))", () => {
    assert.ok(githubSrc.includes("router.use(requireAuth)"))
  })
})

describe("analyzeGithubProfile is a single shared implementation", () => {
  test("exported and used by both the HTTP route and (indirectly) the batch scanner", () => {
    assert.ok(githubSrc.includes("export async function analyzeGithubProfile"))
    assert.ok(githubSrc.includes('router.post("/analyze", async (req, res) => {'))
    assert.ok(internalSrc.includes("analyzeGithubProfile"))
    assert.ok(internalSrc.includes('import { analyzeGithubProfile } from "./github.js"'))
  })
  test("the HTTP /analyze route is a thin wrapper, not a second implementation", () => {
    const idx = githubSrc.indexOf('router.post("/analyze", async (req, res) => {')
    const body = githubSrc.slice(idx, idx + 300)
    assert.ok(body.includes("analyzeGithubProfile({"))
    assert.ok(body.includes("res.status(result.status).json(result.body)"))
  })
})

describe("No client-supplied user id ever substitutes for the verified JWT's own id", () => {
  test("/connect, /disconnect, /connection all act on req.user.id, never req.body", () => {
    for (const route of ["/connect", "/disconnect", "/connection"]) {
      const idx = githubSrc.indexOf(`router.${route === "/connection" ? "get" : "post"}("${route}"`)
      assert.notEqual(idx, -1, `route ${route} not found`)
      const body = githubSrc.slice(idx, idx + 1600)
      assert.ok(body.includes("req.user.id"), `${route} must act on req.user.id`)
    }
  })
  test("recovery of eligible-for-scan users never trusts a caller-supplied id — it's server-selected", () => {
    assert.ok(connectionSrc.includes("export async function claimEligibleForScan"))
    assert.ok(!/claimEligibleForScan\([^)]*req\.body/.test(internalSrc))
  })
})

describe("Ownership/originality signals use evidence-graded language, never absolute claims", () => {
  // Strip comments so a line *documenting* the forbidden vocabulary (e.g.
  // "never say X") doesn't itself trip this check — only literal string
  // values that could reach a response are scanned.
  const codeOnly = githubSrc
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n")
  const forbidden = [
    "100% verified owner", "Guaranteed original author", "Not copied",
    "definitely your original code", "definitely not copied", "sole author",
  ]
  for (const phrase of forbidden) {
    test(`never claims "${phrase}"`, () => {
      assert.ok(!codeOnly.toLowerCase().includes(phrase.toLowerCase()))
    })
  }
  test("classifyOwnership only returns the documented evidence-graded labels", () => {
    const idx = githubSrc.indexOf("function classifyOwnership")
    const body = githubSrc.slice(idx, githubSrc.indexOf("\n}", idx))
    for (const label of ["Strong ownership evidence", "Substantial contributor", "Limited contribution evidence", "Insufficient evidence", "Repository activity could not be fully verified"]) {
      assert.ok(body.includes(label), `missing expected label: ${label}`)
    }
  })
  test("originality signals are derived from metadata/commit-stats only — never a repo clone", () => {
    assert.ok(!/simple-git|isomorphic-git|git clone|exec\(.*clone/i.test(githubSrc))
  })
})

describe("Raw provider errors never reach the client", () => {
  test("/connect surfaces only safe, pre-written messages, never a raw GitHub error body", () => {
    const idx = githubSrc.indexOf('router.post("/connect"')
    const body = githubSrc.slice(idx, githubSrc.indexOf('router.post("/disconnect"'))
    assert.ok(!/error:\s*ur\.statusText/.test(body))
    assert.ok(body.includes("We couldn't find that GitHub profile"))
    assert.ok(body.includes("Unable to reach GitHub right now"))
  })
})

describe("Internal batch scanner is shared-secret gated, fails closed", () => {
  test("requireCronSecret fails closed when INTERNAL_CRON_SECRET is unset", () => {
    const idx = internalSrc.indexOf("function requireCronSecret")
    const body = internalSrc.slice(idx, idx + 400)
    assert.ok(body.includes("if (!expected)"))
    assert.ok(body.includes("503"))
  })
  test("scan-batch route is behind requireCronSecret", () => {
    assert.ok(internalSrc.includes('router.post("/code-dna/scan-batch", requireCronSecret'))
  })
  test("batch size is bounded regardless of what the caller requests", () => {
    assert.ok(internalSrc.includes("Math.min(Number(req.body?.batchSize)"))
  })
})

describe("Recovery-code-style backoff and scheduling are real, not fixed intervals", () => {
  test("markScanFailed increases consecutive_failures and backs off next_scan_at", () => {
    const idx = connectionSrc.indexOf("export async function markScanFailed")
    const body = connectionSrc.slice(idx, connectionSrc.indexOf("\n}", idx))
    assert.ok(body.includes("consecutive_failures"))
    assert.ok(body.includes("backoffMultiplier"))
  })
  test("claimEligibleForScan claims atomically (re-checks scan_status at update time, not just select time)", () => {
    const idx = connectionSrc.indexOf("export async function claimEligibleForScan")
    const body = connectionSrc.slice(idx, connectionSrc.indexOf("\n}", idx + 50) + 50)
    const updateCalls = body.match(/\.eq\("scan_status", "idle"\)/g) || []
    assert.ok(updateCalls.length >= 2, "expected scan_status='idle' checked both at select and at claim-update time")
  })
  test("only a fixed, safe error-category vocabulary is ever persisted (never a raw provider message)", () => {
    assert.ok(connectionSrc.includes('new Set(["not_found", "rate_limited", "network_error", "unknown"])'))
  })
})

describe("Mounted correctly in server.js", () => {
  test("github routes and the internal scanner are both mounted", () => {
    assert.ok(serverSrc.includes('app.use("/api/github",       githubRoutes)'))
    assert.ok(serverSrc.includes('app.use("/api/internal",     internalCodeDnaScanRoutes)'))
  })
})

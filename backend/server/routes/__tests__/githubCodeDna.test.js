/**
 * Regression guard (2026-09-03, revised same day) for the GitHub Code DNA
 * canonical-identity system — source-scan style, consistent with
 * security.test.js and the other regression tests in this directory:
 * asserts the contract at the file-content level so a future edit can't
 * silently weaken any of it.
 *
 * Revision note: the original version of this file also covered a Render
 * Cron Job batch scanner (routes/internalCodeDnaScan.js, connection.js's
 * claimEligibleForScan + exponential backoff). That infrastructure was
 * removed the same day, before ever being deployed — Code DNA rescanning is
 * now user-initiated only (POST /connect for the first analysis, POST
 * /refresh for every rescan after). This file was rewritten to match; there
 * is intentionally no test left referencing claimEligibleForScan,
 * requireCronSecret, or INTERNAL_CRON_SECRET because none of that code
 * exists anymore.
 */
import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const routesDir = path.join(__dirname, "..")
const githubSrc = readFileSync(path.join(routesDir, "github.js"), "utf8")
const connectionSrc = readFileSync(path.join(routesDir, "../lib/codeDna/connection.js"), "utf8")
const serverSrc = readFileSync(path.join(routesDir, "../../server.js"), "utf8")
const partnerBridgeSrc = readFileSync(path.join(routesDir, "partnerBridge.js"), "utf8")
const recruiterEvidenceSrc = readFileSync(path.join(routesDir, "../lib/recruiterEvidence.js"), "utf8")
const portfolioPublicSrc = readFileSync(path.join(routesDir, "portfolioPublic.js"), "utf8")
const dbJsSrc = readFileSync(path.join(routesDir, "../../../frontend/src/lib/db.js"), "utf8")
const auraSrc = readFileSync(path.join(routesDir, "../../../frontend/src/pages/Aura.jsx"), "utf8")

describe("No background scheduler exists", () => {
  test("the internal batch-scan route file was removed, not just unmounted", () => {
    assert.ok(!existsSync(path.join(routesDir, "internalCodeDnaScan.js")))
  })
  test("server.js no longer imports or mounts it", () => {
    assert.ok(!serverSrc.includes("internalCodeDnaScan"))
    assert.ok(!serverSrc.includes("/api/internal"))
  })
  test("connection.js has no batch-claim function and no actual timer/scheduler mechanism", () => {
    assert.ok(!connectionSrc.includes("claimEligibleForScan"))
    assert.ok(!/setInterval|setTimeout|node-cron|node-schedule/.test(connectionSrc))
  })
  test("nothing in the repo still references INTERNAL_CRON_SECRET or the old header", () => {
    assert.ok(!githubSrc.includes("INTERNAL_CRON_SECRET"))
    assert.ok(!githubSrc.includes("X-Internal-Cron-Secret"))
    assert.ok(!connectionSrc.includes("INTERNAL_CRON_SECRET"))
  })
})

describe("github.js — canonical connection + refresh routes exist and require auth", () => {
  for (const route of ['router.post("/connect"', 'router.post("/disconnect"', 'router.get("/connection"', 'router.post("/refresh"']) {
    test(`${route} ...) is present`, () => {
      assert.ok(githubSrc.includes(route))
    })
  }
  test("router-level auth guard covers the whole file (router.use(requireAuth))", () => {
    assert.ok(githubSrc.includes("router.use(requireAuth)"))
  })
})

describe("analyzeGithubProfile is a single shared implementation", () => {
  test("exported and used by the /analyze, /connect, and /refresh routes", () => {
    assert.ok(githubSrc.includes("export async function analyzeGithubProfile"))
    const analyzeCallSites = githubSrc.match(/analyzeGithubProfile\(\{/g) || []
    // /analyze, /connect, /refresh — three call sites into the one shared implementation
    assert.ok(analyzeCallSites.length >= 3, `expected at least 3 call sites, found ${analyzeCallSites.length}`)
  })
  test("the HTTP /analyze route is a thin wrapper, not a second implementation", () => {
    const idx = githubSrc.indexOf('router.post("/analyze"')
    const body = githubSrc.slice(idx, idx + 300)
    assert.ok(body.includes("analyzeGithubProfile({"))
    assert.ok(body.includes("res.status(result.status).json(result.body)"))
  })
})

describe("No client-supplied user id ever substitutes for the verified JWT's own id", () => {
  test("/connect, /disconnect, /connection, /refresh all act on req.user.id, never req.body", () => {
    const routes = [
      ['router.post("/connect"', "post"],
      ['router.post("/disconnect"', "post"],
      ['router.get("/connection"', "get"],
      ['router.post("/refresh"', "post"],
    ]
    for (const [needle] of routes) {
      const idx = githubSrc.indexOf(needle)
      assert.notEqual(idx, -1, `route ${needle} not found`)
      const body = githubSrc.slice(idx, idx + 1800)
      assert.ok(body.includes("req.user.id"), `${needle} must act on req.user.id`)
    }
  })
  test("tryStartManualScan takes only a userId, never trusts a request body for who to scan", () => {
    const idx = connectionSrc.indexOf("export async function tryStartManualScan")
    assert.notEqual(idx, -1)
    const signatureLine = connectionSrc.slice(idx, connectionSrc.indexOf("\n", idx))
    assert.ok(/tryStartManualScan\(userId\)/.test(signatureLine))
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
    "proves every line", "perfectly prove",
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
  test("/refresh never echoes a raw analyzeGithubProfile error straight through without a safe fallback", () => {
    const idx = githubSrc.indexOf('router.post("/refresh"')
    const body = githubSrc.slice(idx, githubSrc.indexOf('router.get("/connection"'))
    assert.ok(body.includes("your previous results are still shown"))
  })
})

describe("User-initiated refresh: no duplicate/concurrent scans, sensible cooldown", () => {
  test("tryStartManualScan claims atomically in one UPDATE (idle + no active cooldown), not select-then-update", () => {
    const idx = connectionSrc.indexOf("export async function tryStartManualScan")
    const body = connectionSrc.slice(idx, connectionSrc.indexOf("\n}", idx + 50) + 50)
    assert.ok(body.includes('.eq("scan_status", "idle")'))
    assert.ok(body.includes('.update({ scan_status: "scanning"'))
  })
  test("a claim failure is diagnosed into a specific, user-facing reason (not_connected / in_progress / cooldown)", () => {
    assert.ok(connectionSrc.includes('reason: "not_connected"'))
    assert.ok(connectionSrc.includes('reason: "in_progress"'))
    assert.ok(connectionSrc.includes('reason: "cooldown"'))
  })
  test("/refresh maps each reason to a distinct HTTP status (409 in-progress, 429 cooldown)", () => {
    const idx = githubSrc.indexOf('router.post("/refresh"')
    const body = githubSrc.slice(idx, githubSrc.indexOf('router.get("/connection"'))
    assert.ok(/in_progress[\s\S]{0,80}409/.test(body) || /409[\s\S]{0,120}in_progress/.test(body))
    assert.ok(/cooldown[\s\S]{0,120}429/.test(body) || /429[\s\S]{0,150}cooldown/.test(body))
  })
  test("/refresh is also covered by an IP-level rate limiter as defense in depth", () => {
    const idx = githubSrc.indexOf('router.post("/refresh"')
    const line = githubSrc.slice(idx, githubSrc.indexOf("\n", idx))
    assert.ok(line.includes("strictLimiter"))
  })
  test("a failed scan never touches the previous denormalized score/confidence/repo-count", () => {
    const idx = connectionSrc.indexOf("export async function markScanFailed")
    const body = connectionSrc.slice(idx, connectionSrc.indexOf("\n}", idx))
    assert.ok(!body.includes("code_dna_score"))
    assert.ok(!body.includes("confidence_level"))
    assert.ok(!body.includes("repositories_analyzed"))
  })
  test("only a fixed, safe error-category vocabulary is ever persisted (never a raw provider message)", () => {
    assert.ok(connectionSrc.includes('new Set(["not_found", "rate_limited", "network_error", "auth_failed", "access_denied", "unknown"])'))
  })
  test("cooldown is a short, fixed window — not the old 24h+ exponential scheduler backoff", () => {
    assert.ok(!/backoffMultiplier|MAX_CONSECUTIVE_FAILURES/.test(connectionSrc))
    assert.ok(connectionSrc.includes("REFRESH_COOLDOWN_MINUTES"))
  })
})

describe("GET /connection never frames state in scheduler language", () => {
  test("response uses refreshAvailableAt, not a nextScanAt/scheduled-scan field name", () => {
    const idx = githubSrc.indexOf('router.get("/connection"')
    const body = githubSrc.slice(idx, githubSrc.indexOf("\n})", idx) + 3)
    assert.ok(body.includes("refreshAvailableAt"))
    assert.ok(!body.includes("nextScanAt"))
  })
})

describe("Mounted correctly in server.js", () => {
  test("github routes are mounted and no internal-scanner route remains", () => {
    assert.ok(serverSrc.includes('app.use("/api/github",       githubRoutes)'))
  })
})

// ── GitHub Evidence Profile (2026-09-03) ────────────────────────────────────
describe("Collaboration evidence is real, unauthenticated public data, never fabricated", () => {
  test("getCollaborationEvidence exists and is wired into analyzeGithubProfile", () => {
    assert.ok(githubSrc.includes("async function getCollaborationEvidence"))
    assert.ok(githubSrc.includes("getCollaborationEvidence(user.login)"))
    assert.ok(githubSrc.includes("collaboration,")) // stored on responseBody
  })
  test("uses the public Search API author: qualifier, not an authenticated/OAuth-scoped endpoint", () => {
    const idx = githubSrc.indexOf("async function getCollaborationEvidence")
    const body = githubSrc.slice(idx, githubSrc.indexOf("\n}", idx + 50) + 1)
    assert.ok(body.includes("api.github.com/search/issues"))
    assert.ok(body.includes("author:"))
  })
  test("a search failure degrades to skipped:true rather than throwing or faking zero", () => {
    const idx = githubSrc.indexOf("async function getCollaborationEvidence")
    const body = githubSrc.slice(idx, githubSrc.indexOf("\n}", idx + 50) + 1)
    assert.ok(body.includes("skipped: true"))
  })
})

describe("Template-vs-fork detection is a real, mechanical signal, never an accusation", () => {
  test("classifyOwnership flags a single-commit non-fork repo as insufficient evidence, not 'template-generated' as fact", () => {
    const idx = githubSrc.indexOf("function classifyOwnership")
    const body = githubSrc.slice(idx, githubSrc.indexOf("\n}", idx))
    assert.ok(body.includes("commitCount <= 1"))
    assert.ok(!/this repository was generated from a template/i.test(body))
    assert.ok(body.includes("may be newly created or generated from a template"))
  })
})

describe("Test-directory signal costs zero extra API calls", () => {
  test("hasTestDir is derived from the same root-listing call as hasReadme/techStack", () => {
    const idx = githubSrc.indexOf("async function inspectRepoRoot")
    const body = githubSrc.slice(idx, githubSrc.indexOf("\n}", idx))
    assert.ok(body.includes("hasTestDir"))
    // Only one fetch() call in the whole function — confirms no new API cost.
    const fetchCalls = body.match(/fetch\(/g) || []
    assert.equal(fetchCalls.length, 1)
  })
})

describe("One canonical GitHub Evidence Profile builder — no more inconsistent recruiter views", () => {
  test("recruiterEvidence.js's buildCodeDnaRecruiterView delegates to lib/codeDna/evidenceProfile.js", () => {
    assert.ok(recruiterEvidenceSrc.includes('import { buildGithubEvidenceProfile } from "./codeDna/evidenceProfile.js"'))
    assert.ok(recruiterEvidenceSrc.includes("buildGithubEvidenceProfile(proof)"))
  })
  test("partnerBridge.js no longer builds its own inline codeDna object from raw source_ref", () => {
    assert.ok(partnerBridgeSrc.includes('import { buildCodeDnaRecruiterView } from "../lib/recruiterEvidence.js"'))
    assert.ok(partnerBridgeSrc.includes("buildCodeDnaRecruiterView(codeDnaRow)"))
    // The old raw fields must be gone from this file entirely — if any of
    // these reappear, someone re-introduced the raw-analytics leak.
    assert.ok(!partnerBridgeSrc.includes("ref.analysis?.avatar"))
    assert.ok(!partnerBridgeSrc.includes("ref.analysis?.bio"))
    assert.ok(!partnerBridgeSrc.includes("ref.analysis?.topRepos"))
    assert.ok(!partnerBridgeSrc.includes("ref.analysis?.followers"))
  })
})

// ── Production incident (2026-09-03): invalid GITHUB_TOKEN → every request
// got a 401 from GitHub, which fell into a generic, unlogged "GitHub API
// error" 502. Root-caused by replaying the exact production request and
// then testing the exact configured token directly against GitHub — see
// the session's diagnosis. This locks in the fix so a future edit can't
// silently reintroduce the same blind spot.
describe("GitHub upstream error classification (production incident fix)", () => {
  test("classifyGithubHttpError exists and distinguishes 401/403/429/5xx", () => {
    const idx = githubSrc.indexOf("function classifyGithubHttpError")
    assert.notEqual(idx, -1)
    const body = githubSrc.slice(idx, githubSrc.indexOf("\n}", idx))
    assert.ok(body.includes("status === 401"))
    assert.ok(body.includes("status === 403 || status === 429"))
    assert.ok(body.includes("status >= 500"))
    assert.ok(body.includes("x-ratelimit-remaining"))
  })
  test("a 401 (bad credentials) is never surfaced to the caller as if it were their own auth problem", () => {
    const idx = githubSrc.indexOf("function classifyGithubHttpError")
    const body = githubSrc.slice(idx, githubSrc.indexOf("\n}", idx))
    // Must not return HTTP 401 to the client — that would wrongly imply the
    // signed-in user is unauthenticated, when it's actually this server's
    // own GitHub credentials that are bad.
    assert.ok(!/status:\s*401/.test(body))
    assert.ok(body.includes("could not be authenticated"))
  })
  test("every classification branch logs the real GitHub status server-side, never the token", () => {
    const idx = githubSrc.indexOf("function classifyGithubHttpError")
    const body = githubSrc.slice(idx, githubSrc.indexOf("\n}", idx))
    assert.ok(body.includes("console.error"))
    assert.ok(!/GITHUB_TOKEN\}/.test(body)) // never interpolates the token value into a log line
    assert.ok(!body.includes("headers.get(\"authorization\")"))
  })
  test("all three call sites (verify-ownership, analyze, connect) use the shared classifier, not their own ad-hoc 403-only branch", () => {
    const occurrences = githubSrc.match(/classifyGithubHttpError\(ur,/g) || []
    assert.equal(occurrences.length, 3, `expected 3 call sites, found ${occurrences.length}`)
    assert.ok(githubSrc.includes('classifyGithubHttpError(ur, "verify-ownership")'))
    assert.ok(githubSrc.includes('classifyGithubHttpError(ur, "analyze")'))
    assert.ok(githubSrc.includes('classifyGithubHttpError(ur, "connect")'))
  })
  test("no remaining literal 'GitHub API error' generic message reachable in a response body (comments referencing the old bug are fine)", () => {
    const codeOnly = githubSrc.split("\n").filter(l => !l.trim().startsWith("//")).join("\n")
    assert.ok(!codeOnly.includes("GitHub API error"))
  })
  test("a thrown network/timeout error never echoes the raw exception message to the client", () => {
    assert.ok(!githubSrc.includes("body: { error: e.message }"))
    assert.ok(githubSrc.includes("Could not connect to GitHub right now"))
    assert.ok(githubSrc.includes('console.error("[github/analyze] network failure reaching GitHub:", e.message)'))
  })
})

// ── Production incident (2026-09-03): Save Changes failure + fragmented
// GitHub identity ────────────────────────────────────────────────────────
describe("leetcode_url: root cause fixed at both the schema and mapping level", () => {
  test("CAMEL_TO_SNAKE maps leetcodeUrl to the real snake_case column", () => {
    assert.ok(dbJsSrc.includes("leetcodeUrl:          'leetcode_url',"))
  })
  test("toCompat() aliases leetcode_url back onto leetcodeUrl for reads", () => {
    assert.ok(dbJsSrc.includes("leetcodeUrl:          data.leetcode_url"))
  })
  test("no new quoted camelCase duplicate column was created for it (the anti-pattern this bug class kept repeating)", () => {
    assert.ok(!dbJsSrc.includes('"leetcodeUrl"'))
  })
})

describe("Canonical GitHub identity: github_connections is authoritative, never silently reset or bypassed", () => {
  test("upsertConnectionIdentity only resets verification/scan state on an actual identity change", () => {
    const idx = connectionSrc.indexOf("export async function upsertConnectionIdentity")
    const body = connectionSrc.slice(idx, connectionSrc.indexOf("\n}", idx + 50) + 1)
    assert.ok(body.includes("isIdentityChange"))
    assert.ok(body.includes('(existing.username || "").toLowerCase() !== (username || "").toLowerCase()'))
    // The reset fields must be applied conditionally (inside the if), not
    // unconditionally on every call — that was the exact bug (re-confirming
    // the same account wiped verified status).
    assert.ok(/if\s*\(isIdentityChange\)\s*{[\s\S]*verification_state = "unverified"/.test(body))
  })
  test("a genuine identity change also clears the denormalized Code DNA summary, so stale evidence never appears to belong to a new account", () => {
    const idx = connectionSrc.indexOf("export async function upsertConnectionIdentity")
    const body = connectionSrc.slice(idx, connectionSrc.indexOf("\n}", idx + 50) + 1)
    assert.ok(body.includes("code_dna_score = null"))
    assert.ok(body.includes("repositories_analyzed = null"))
  })
  test("/verify-ownership reads the canonical connection and ignores any client-supplied githubUrl", () => {
    const idx = githubSrc.indexOf('router.post("/verify-ownership"')
    const body = githubSrc.slice(idx, githubSrc.indexOf("\n})", idx) + 3)
    assert.ok(body.includes("connectionRepo.getConnection(req.user.id)"))
    assert.ok(!body.includes("req.body"))
    assert.ok(!/const\s*{\s*githubUrl/.test(body))
  })
  test("/verify-ownership never claims success without writing the canonical connection first", () => {
    const idx = githubSrc.indexOf('router.post("/verify-ownership"')
    const body = githubSrc.slice(idx, githubSrc.indexOf("\n})", idx) + 3)
    const connIdx = body.indexOf("connectionRepo.markVerified")
    const proofIdx = body.indexOf("codeDnaRepo.markVerified")
    assert.ok(connIdx !== -1 && proofIdx !== -1 && connIdx < proofIdx, "canonical connection must be marked verified before (or without depending on) the proof_objects sync")
    // The canonical write is awaited directly (fails loudly); the
    // proof_objects sync is explicitly best-effort (wrapped in its own try/catch).
    assert.ok(/await connectionRepo\.markVerified\(req\.user\.id\)\s*\n\s*\/\//.test(body) || body.includes("await connectionRepo.markVerified(req.user.id)"))
  })
  test("/verification-code returns canonical connection status, not just the bare code", () => {
    const idx = githubSrc.indexOf('router.get("/verification-code"')
    const body = githubSrc.slice(idx, githubSrc.indexOf("\n})", idx) + 3)
    assert.ok(body.includes("connectionRepo.getConnection(req.user.id)"))
    assert.ok(body.includes("username:"))
    assert.ok(body.includes("verified:"))
  })
  test("the direct /analyze flow establishes a canonical identity only when none already exists — never overwrites an existing connection", () => {
    const idx = githubSrc.indexOf("export async function analyzeGithubProfile")
    const body = githubSrc.slice(idx, githubSrc.indexOf("collaborationPromise", idx))
    assert.ok(body.includes("connectionRepo.getConnection(userId)"))
    assert.ok(/if\s*\(!existingConnection \|\| existingConnection\.disconnected_at\)\s*{/.test(body))
  })
})

describe("Verification UX is proactive and unambiguous about which account is being checked", () => {
  test("Aura.jsx fetches canonical verification status on mount, not just after a failed verify click", () => {
    assert.ok(auraSrc.includes("loadGhVerification"))
    assert.ok(auraSrc.includes("/api/github/verification-code"))
    assert.ok(/useEffect\(\(\) => { loadGhVerification\(\) }/.test(auraSrc))
  })
  test("the verify call no longer sends a client-supplied githubUrl", () => {
    const idx = auraSrc.indexOf("const verifyGithubOwnership")
    const body = auraSrc.slice(idx, idx + 1200)
    assert.ok(!body.includes("body:JSON.stringify({githubUrl"))
  })
  test("the displayed username/code come from the canonical ghVerification state, not local component state", () => {
    assert.ok(auraSrc.includes("ghVerification.username"))
    assert.ok(auraSrc.includes("ghVerification.code"))
  })
  test("verified status is read from the canonical fetch, not a same-session-only local flag (the refresh-persistence bug)", () => {
    assert.ok(auraSrc.includes("ghVerification?.verified || githubVerifyMsg?.verified"))
  })
  test("a copy action exists for the verification code", () => {
    assert.ok(auraSrc.includes("navigator.clipboard"))
  })
  test("duplicate verify clicks are prevented (button disabled + an explicit re-entrancy guard)", () => {
    const idx = auraSrc.indexOf("const verifyGithubOwnership")
    const body = auraSrc.slice(idx, idx + 400)
    assert.ok(body.includes("if (githubVerifying) return"))
  })
})

describe("Portfolio recruiter view: one verification representation, not two that can disagree", () => {
  test("no separate boolean 'verified' field is set alongside the 'verification' string anymore", () => {
    assert.ok(!portfolioPublicSrc.includes("safe.codeDna.verified = connRow.verification_state"))
  })
  test("github_connections.verification_state is the source of truth for the one verification field consumers actually read", () => {
    const idx = portfolioPublicSrc.indexOf('if (connRow && !connRow.disconnected_at)')
    const body = portfolioPublicSrc.slice(idx, portfolioPublicSrc.indexOf("\n        }", idx) + 10)
    assert.ok(body.includes('safe.codeDna.verification = "Verified (GitHub ownership confirmed)"'))
    assert.ok(body.includes('safe.codeDna.verification = "Self-Selected (GitHub ownership unconfirmed)"'))
  })
})

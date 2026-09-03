// Routes: POST /api/github/analyze, GET /api/github/verification-code,
// POST /api/github/verify-ownership, POST /api/github/connect,
// POST /api/github/disconnect, GET /api/github/connection,
// POST /api/github/refresh — user-initiated Code DNA rescan, the ONLY
// rescan trigger (no background scheduler exists), plus repo-interview,
// visibility, and cross-verify further down.
//
// Code DNA (Aura.jsx, activeTab==="fingerprint") — Phase 1.
//
// AI output here is a best-effort profile summary from public GitHub data —
// NOT an ownership/authenticity verification on its own. A separate, real
// per-repo ownership-verification pipeline already exists at
// backend/server/lib/verification/providers/github.js (repo-level, writes to
// proof_objects/trust_level with a hash-chained audit log). This file adds a
// lighter, profile-level verification suited to Code DNA: the user proves
// they control the GitHub account by temporarily adding a deterministic code
// to their public bio (the same pattern used by many "verify your domain/
// profile" flows) — no OAuth app registration required. Until that check
// passes, every score/summary here is presented as "(unverified)" — never
// as a fact.
import { Router } from "express"
import crypto from "crypto"
import { groq, GROQ_FAST } from "../lib/groq.js"
import { requireAuth } from "../lib/auth.js"
import * as codeDnaRepo from "../lib/codeDna/repository.js"
import * as connectionRepo from "../lib/codeDna/connection.js"
import { supabaseAdmin } from "../lib/supabase.js"
import { strictLimiter } from "../lib/rateLimiters.js"
// makeSlug is the same normalization skillGraph.js's own routes use for
// user_skills.slug — reused here (not reimplemented) so cross-verify's
// matching logic can't silently drift from how that table's slugs are
// actually generated. skillGraph.js exports it explicitly for this kind of
// reuse (see its own file header on avoiding a second parallel schema).
import { makeSlug } from "./skillGraph.js"

const router = Router()
router.use(requireAuth)

// Same defensive JSON-extraction approach used by lib/claude.js (strip a
// ```json fence or grab the first {...} block) rather than groq.js callers'
// usual bare try/catch — an LLM occasionally wraps JSON in prose or a fence
// even when asked not to, and a bare JSON.parse would fail the whole request.
function extractJson(raw) {
  if (!raw) return {}
  const fenced = raw.match(/```json\s*([\s\S]*?)```/) || raw.match(/```\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1] : (raw.match(/(\{[\s\S]*\})/) || [])[1] || raw
  try { return JSON.parse(candidate) } catch { return {} }
}

// Same idea as extractJson but for a top-level JSON ARRAY response (used by
// repo-interview question generation) — grabs the first [...] block instead
// of the first {...} block.
function extractJsonArray(raw) {
  if (!raw) return []
  const fenced = raw.match(/```json\s*([\s\S]*?)```/) || raw.match(/```\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1] : (raw.match(/(\[[\s\S]*\])/) || [])[1] || raw
  try { const v = JSON.parse(candidate); return Array.isArray(v) ? v : [] } catch { return [] }
}

function ghHeaders() {
  return { Accept:"application/vnd.github.v3+json", ...(process.env.GITHUB_TOKEN?{Authorization:`token ${process.env.GITHUB_TOKEN}`}:{}) }
}

function parseUsername(githubUrl="") {
  return githubUrl.replace(/.*github\.com\//, "").replace(/\/.*/, "").trim()
}

// Real, filename-presence-only technology detection — one root directory
// listing per repo, no file-content fetches. Deliberately conservative: only
// flags a technology when the file that conventionally proves it actually
// exists in that exact repo.
const TECH_SIGNALS = [
  { file: "package.json",        tag: "Node.js" },
  { file: "requirements.txt",    tag: "Python" },
  { file: "pyproject.toml",      tag: "Python" },
  { file: "Dockerfile",          tag: "Docker" },
  { file: "docker-compose.yml",  tag: "Docker Compose" },
  { file: "go.mod",              tag: "Go" },
  { file: "Cargo.toml",          tag: "Rust" },
  { file: "pom.xml",             tag: "Java (Maven)" },
  { file: "build.gradle",        tag: "Java/Kotlin (Gradle)" },
  { file: "Gemfile",             tag: "Ruby" },
  { file: "composer.json",       tag: "PHP" },
  { file: "tsconfig.json",       tag: "TypeScript" },
  { file: ".github",             tag: "CI/CD (GitHub Actions)" },
]

const README_NAMES = new Set(["readme.md","readme","readme.rst","readme.txt"])
// Top-level-only signal (root listing has no recursion) — presence of a
// conventional test directory. Deliberately NOT a claim about test coverage
// or quality, just "a place for tests exists at the root," same honesty
// bar as hasReadme below.
const TEST_DIR_NAMES = new Set(["test","tests","__tests__","spec","specs"])

// Returns { techStack, hasReadme, skipped } from ONE root-listing call —
// README detection piggybacks on the same response already fetched for tech
// detection, so it costs nothing extra. hasReadme is a real presence check,
// not a quality judgement (we don't fetch/score README content).
//
// BUG FIX (2026-08-04, real-world test): this used to silently return empty
// results on ANY failure, including a 403 rate-limit — which looks
// identical in the UI to "genuinely nothing detected" even when the repo
// clearly has a .github/workflows folder and a README. `skipped:true` lets
// the UI say "detection skipped — try again shortly" instead of implying
// the repo has no CI/README/stack when we simply couldn't check.
// BUG FIX (2026-08-04, real-world test #2): `skipped` used to only get set
// on a 403/429 — any OTHER failure mode (401 from a bad/expired
// GITHUB_TOKEN, a 5xx from GitHub, a thrown network error) fell through to
// `skipped:false` with empty results, which the UI then rendered as "no
// tech/README found" — i.e. a confident-looking wrong answer for a repo
// that plainly has both. Every failure path now sets skipped:true and logs
// the real status/reason server-side, so (a) the UI always shows the honest
// "detection skipped" state instead of implying nothing exists, and (b)
// whoever has Render log access can see WHY (rate limit vs bad token vs
// GitHub outage) instead of guessing.
async function inspectRepoRoot(fullName) {
  if (!fullName) return { techStack: [], hasReadme: false, hasTestDir: false, skipped: false }
  try {
    const r = await fetch(`https://api.github.com/repos/${fullName}/contents`, { headers: ghHeaders() })
    if (!r.ok) {
      console.error(`[github/analyze] inspectRepoRoot(${fullName}) failed: HTTP ${r.status} ${r.statusText}`)
      return { techStack: [], hasReadme: false, hasTestDir: false, skipped: true }
    }
    const items = await r.json()
    if (!Array.isArray(items)) {
      console.error(`[github/analyze] inspectRepoRoot(${fullName}) failed: non-array response`)
      return { techStack: [], hasReadme: false, hasTestDir: false, skipped: true }
    }
    const names = new Set(items.map(i => i.name))
    const lowerNames = new Set(items.map(i => (i.name||"").toLowerCase()))
    return {
      techStack: TECH_SIGNALS.filter(sig => names.has(sig.file)).map(sig => sig.tag),
      hasReadme: [...lowerNames].some(n => README_NAMES.has(n)),
      hasTestDir: [...lowerNames].some(n => TEST_DIR_NAMES.has(n)),
      skipped: false,
    }
  } catch (e) {
    console.error(`[github/analyze] inspectRepoRoot(${fullName}) threw:`, e.message)
    return { techStack: [], hasReadme: false, hasTestDir: false, skipped: true }
  }
}

// BUG FIX (2026-08-04, real-world test): total commit count used to be a
// crude repo-count-scaled guess (public_repos*18 + stars*0.4) — for an
// account with one large, long-lived repo (303 real commits) that formula
// returned 18, off by 17x. GitHub's REST API doesn't return a total commit
// count directly, but there's a well-known real technique: request 1 commit
// per page and read the `Link` response header's `rel="last"` page number —
// that page number IS the total commit count. One extra call per repo,
// exact (not estimated), bounded to the same top-3 repos already being
// inspected above so it doesn't add a new cost category.
async function getRepoCommitCount(fullName) {
  if (!fullName) return null
  try {
    const r = await fetch(`https://api.github.com/repos/${fullName}/commits?per_page=1`, { headers: ghHeaders() })
    if (!r.ok) {
      console.error(`[github/analyze] getRepoCommitCount(${fullName}) failed: HTTP ${r.status} ${r.statusText}`)
      return null
    }
    const link = r.headers.get("link") || ""
    const match = link.match(/[?&]page=(\d+)>;\s*rel="last"/)
    if (match) return Number(match[1])
    // No Link header at all means there's only one page — i.e. exactly the
    // commits actually returned (0 or 1), not "unknown".
    const body = await r.json().catch(() => [])
    return Array.isArray(body) ? body.length : null
  } catch (e) {
    console.error(`[github/analyze] getRepoCommitCount(${fullName}) threw:`, e.message)
    return null
  }
}

// BUG FIX (2026-08-04, real-world test): language breakdown used to count
// ONE vote per repo for that repo's single GitHub-guessed "primary
// language" field — with one repo, that always collapses to 100% of
// whatever GitHub picked, ignoring the real byte-weighted mix GitHub's own
// repo page shows (e.g. a JS-primary repo can genuinely be 91% JS / 4%
// PLpgSQL / 2% TypeScript / 2% HTML by bytes). Real fix: fetch the actual
// per-repo language byte counts via /languages and aggregate real bytes,
// bounded to the same top-3 repos already being inspected.
async function getRepoLanguageBytes(fullName) {
  if (!fullName) return {}
  try {
    const r = await fetch(`https://api.github.com/repos/${fullName}/languages`, { headers: ghHeaders() })
    if (!r.ok) {
      console.error(`[github/analyze] getRepoLanguageBytes(${fullName}) failed: HTTP ${r.status} ${r.statusText}`)
      return {}
    }
    const data = await r.json()
    return (data && typeof data === "object") ? data : {}
  } catch (e) {
    console.error(`[github/analyze] getRepoLanguageBytes(${fullName}) threw:`, e.message)
    return {}
  }
}

// ─── Ownership / originality signals (2026-09-03) ──────────────────────────
// Everything below is derived ONLY from repository metadata + per-commit
// diff stats already reachable via GitHub's normal REST API — never by
// cloning a repository's actual content. This is a deliberate scope
// boundary (see the design report): GitHub exposes no code-similarity API,
// and cloning arbitrary users' repos for content comparison is exactly the
// kind of unbounded cost/legitimacy question this feature avoids by design.
// Every signal here is evidence, never proof — the language used
// downstream (classifyOwnership) is written to match that explicitly.

// One extra call per repo: fetch just the 5 most recent commits (already
// the API's default newest-first order) to see what fraction were authored
// by the connected GitHub account. A repo the user forked and never
// touched again shows 0% recent authorship from them; a repo they actively
// work on shows a high share. Bounded to 5 — this is a recency SAMPLE, not
// a full-history census (a full census would cost one call per commit,
// unbounded for a large repo).
async function getRecentAuthorShare(fullName, username) {
  if (!fullName || !username) return null
  try {
    const r = await fetch(`https://api.github.com/repos/${fullName}/commits?per_page=5`, { headers: ghHeaders() })
    if (!r.ok) return null
    const commits = await r.json()
    if (!Array.isArray(commits) || commits.length === 0) return null
    const byUser = commits.filter(c => (c.author?.login || "").toLowerCase() === username.toLowerCase()).length
    return { sampledCommits: commits.length, byConnectedUser: byUser }
  } catch (e) {
    console.error(`[github/analyze] getRecentAuthorShare(${fullName}) threw:`, e.message)
    return null
  }
}

// Reuses the exact Link-header "jump to the last page" trick
// getRepoCommitCount already established, but requests the LAST page (the
// repo's very first, oldest commit) and inspects its size. A single first
// commit that introduces an unusually large amount of code is the honest,
// narrow signal for "this looks like an imported/forked codebase dropped
// in at once" — not proof of anything, just a fact worth surfacing.
const LARGE_FIRST_COMMIT_THRESHOLD_LINES = 500
async function getFirstCommitSignal(fullName) {
  if (!fullName) return null
  try {
    const listRes = await fetch(`https://api.github.com/repos/${fullName}/commits?per_page=1`, { headers: ghHeaders() })
    if (!listRes.ok) return null
    const link = listRes.headers.get("link") || ""
    const match = link.match(/[?&]page=(\d+)>;\s*rel="last"/)
    const firstCommitPage = match ? Number(match[1]) : 1
    const oldestRes = await fetch(`https://api.github.com/repos/${fullName}/commits?per_page=1&page=${firstCommitPage}`, { headers: ghHeaders() })
    if (!oldestRes.ok) return null
    const oldestList = await oldestRes.json()
    const sha = Array.isArray(oldestList) && oldestList[0]?.sha
    if (!sha) return null
    const detailRes = await fetch(`https://api.github.com/repos/${fullName}/commits/${sha}`, { headers: ghHeaders() })
    if (!detailRes.ok) return null
    const detail = await detailRes.json()
    const totalLines = (detail?.stats?.additions || 0) + (detail?.stats?.deletions || 0)
    return { linesChanged: totalLines, filesChanged: Array.isArray(detail?.files) ? detail.files.length : null, isLarge: totalLines >= LARGE_FIRST_COMMIT_THRESHOLD_LINES }
  } catch (e) {
    console.error(`[github/analyze] getFirstCommitSignal(${fullName}) threw:`, e.message)
    return null
  }
}

// ── Collaboration evidence (2026-09-03, GitHub Evidence Profile) ───────────
// Real, public, unauthenticated GitHub data — no OAuth scope needed. Every
// public pull request the account has ever opened, anywhere on GitHub (not
// just its own repos), is discoverable via the Search API's `author:`
// qualifier: this is the only signal in the whole file that reflects work
// on OTHER people's repositories, i.e. actual collaboration rather than
// solo output. Two calls total per analysis (not per repo): one for the
// count of PRs authored, one for the subset that were merged.
//
// COST NOTE: the Search API has its OWN, much stricter rate limit than the
// core API this file otherwise uses — 10 req/min unauthenticated, 30/min
// authenticated (GITHUB_TOKEN) — completely separate budget from the
// 60/hr-or-5000/hr core-API limit tracked elsewhere in this file. A search
// failure must never fail the whole analysis; it degrades to
// `skipped: true` exactly like the other detectors above.
async function getCollaborationEvidence(username) {
  if (!username) return { pullRequestsAuthored: null, mergedPullRequests: null, distinctRepositories: null, skipped: true }
  try {
    const [allRes, mergedRes] = await Promise.all([
      fetch(`https://api.github.com/search/issues?q=${encodeURIComponent(`author:${username} type:pr`)}&per_page=30`, { headers: ghHeaders() }),
      fetch(`https://api.github.com/search/issues?q=${encodeURIComponent(`author:${username} type:pr is:merged`)}&per_page=1`, { headers: ghHeaders() }),
    ])
    if (!allRes.ok || !mergedRes.ok) {
      console.error(`[github/analyze] getCollaborationEvidence(${username}) failed: HTTP ${allRes.status}/${mergedRes.status}`)
      return { pullRequestsAuthored: null, mergedPullRequests: null, distinctRepositories: null, skipped: true }
    }
    const all = await allRes.json()
    const merged = await mergedRes.json()
    const items = Array.isArray(all?.items) ? all.items : []
    // repository_url looks like ".../repos/{owner}/{repo}" — distinct owner/repo
    // pairs across this page is a real (if partial, capped at 30) lower bound
    // on "how many different projects has this account sent PRs to."
    const distinctRepositories = new Set(
      items.map(i => (i.repository_url || "").split("/repos/")[1]).filter(Boolean)
    ).size
    return {
      pullRequestsAuthored: typeof all?.total_count === "number" ? all.total_count : null,
      mergedPullRequests: typeof merged?.total_count === "number" ? merged.total_count : null,
      distinctRepositories,
      skipped: false,
    }
  } catch (e) {
    console.error(`[github/analyze] getCollaborationEvidence(${username}) threw:`, e.message)
    return { pullRequestsAuthored: null, mergedPullRequests: null, distinctRepositories: null, skipped: true }
  }
}

// Careful, evidence-graded language — never "verified owner" or "not
// copied" (see the design report's Phase 5/6 language requirements). Every
// branch here is reachable and each one names the specific evidence (or
// lack of it) that produced the label, so the label is always explainable.
function classifyOwnership({ isFork, parentFullName, authorShare, firstCommitSignal, detectionSkipped, commitCount }) {
  if (detectionSkipped) {
    return { label: "Repository activity could not be fully verified", detail: "GitHub data for this repository couldn't be fully retrieved this run.", tone: "neutral" }
  }
  // Real, mechanical distinction (verified via research, not inferred): a
  // GitHub "Use this template" repo starts with exactly one fresh commit and
  // no inherited history, whereas an actual fork carries the parent's full
  // commit history. A single-commit, non-fork repo is therefore genuine
  // evidence of "insufficient original history to assess," not an
  // accusation that it WAS template-generated (a brand-new from-scratch repo
  // looks identical at this point) — checked before the other branches so a
  // one-commit repo never gets misread as "Strong ownership evidence" purely
  // because that one commit happens to be authored by the connected account.
  if (!isFork && typeof commitCount === "number" && commitCount <= 1) {
    return { label: "Insufficient evidence", detail: "This repository has only one commit, which is not enough history to assess original authorship — it may be newly created or generated from a template.", tone: "neutral" }
  }
  if (isFork && authorShare && authorShare.sampledCommits > 0 && authorShare.byConnectedUser === 0) {
    return { label: "Limited contribution evidence", detail: `This is a fork of ${parentFullName || "another repository"}, and none of the most recently sampled commits were authored by this account.`, tone: "caution" }
  }
  if (isFork && authorShare && authorShare.byConnectedUser > 0) {
    return { label: "Substantial contributor", detail: `A fork of ${parentFullName || "another repository"}, with recent commits authored by this account.`, tone: "positive" }
  }
  if (!isFork && authorShare && authorShare.sampledCommits > 0 && authorShare.byConnectedUser === authorShare.sampledCommits) {
    return { label: "Strong ownership evidence", detail: "An original (non-fork) repository where recently sampled commits are all authored by this account.", tone: "positive" }
  }
  if (!authorShare || authorShare.sampledCommits === 0) {
    return { label: "Insufficient evidence", detail: "Not enough recent commit history was available to assess contribution.", tone: "neutral" }
  }
  return { label: "Substantial contributor", detail: "Recent commit history shows meaningful activity from this account on this repository.", tone: "positive" }
}

// Deterministic per-user code — no separate table/column needed to store it,
// it's re-derivable from userId at any time. Short enough to comfortably fit
// a GitHub bio (160 char limit) alongside other bio text.
function verificationCodeFor(userId) {
  return "capabilio-verify-" + crypto.createHash("sha256").update(String(userId)).digest("hex").slice(0, 10)
}

router.get("/verification-code", (req, res) => {
  res.json({ code: verificationCodeFor(req.user.id) })
})

router.post("/verify-ownership", async (req, res) => {
  const { githubUrl="" } = req.body
  const username = parseUsername(githubUrl)
  if (!username) return res.status(400).json({ error: "Invalid GitHub URL" })
  try {
    const ur = await fetch(`https://api.github.com/users/${username}`, { headers: ghHeaders() })
    if (ur.status === 404) return res.status(404).json({ error: "GitHub user not found" })
    if (!ur.ok) return res.status(ur.status === 403 ? 429 : 502).json({ error: "GitHub API error" })
    const user = await ur.json()
    const code = verificationCodeFor(req.user.id)
    const verified = !!(user.bio && user.bio.includes(code))
    if (!verified) {
      return res.json({ verified: false, code, message: `Add "${code}" to your GitHub bio, save, then try again. You can remove it afterwards.` })
    }
    const row = await codeDnaRepo.markVerified(req.user.id)
    if (!row) return res.status(400).json({ error: "Analyze this profile at least once before verifying ownership." })
    try { await connectionRepo.markVerified(req.user.id) } catch (e) { console.error("[github/verify-ownership] connection sync failed:", e.message) }
    return res.json({ verified: true })
  } catch (e) { console.error("[github/verify-ownership]", e.message); res.status(500).json({ error: e.message }) }
})

// Core analysis engine — callable from the HTTP /analyze route, /connect
// (first-time analysis), and /refresh (user-initiated rescan), so every
// entry point runs the exact same real logic, never a second parallel
// implementation that could drift. There is no background scheduler — this
// only ever runs in direct response to a user action. Returns { status,
// body } instead of writing to a response object directly, so callers that
// aren't Express routes (there are none today, but this keeps the option
// open) aren't forced to fake a `res`.
export async function analyzeGithubProfile({ userId, githubUrl = "", keyword = "Developer" }) {
  const username = parseUsername(githubUrl)
  if (!username) return { status: 400, body: { error: "Invalid GitHub URL" } }
  try {
    const [ur, rr] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`, { headers: ghHeaders() }),
      fetch(`https://api.github.com/users/${username}/repos?sort=pushed&per_page=30`, { headers: ghHeaders() }),
    ])
    if (ur.status === 404) return { status: 404, body: { error: "GitHub user not found" }, errorCategory: "not_found" }
    if (!ur.ok) return { status: ur.status === 403 ? 429 : 502, body: { error: ur.status === 403 ? "GitHub API rate limit reached — try again shortly" : "GitHub API error" }, errorCategory: ur.status === 403 ? "rate_limited" : "network_error" }
    const user  = await ur.json()
    const repos = rr.ok ? await rr.json() : []
    // Kicked off now, awaited just before responseBody is assembled below —
    // its own separate Search-API rate-limit budget means it should run
    // concurrently with everything else, not add its own latency on top.
    const collaborationPromise = getCollaborationEvidence(user.login)

    // Coarse fallback (one vote per repo for GitHub's single "primary
    // language" guess) — used only for repos OUTSIDE the top 3 that get a
    // real byte-weighted breakdown below, so larger accounts still get some
    // signal from their long tail without an API call per repo.
    const lc  = {}; repos.forEach(r => { if (r.language) lc[r.language] = (lc[r.language]||0)+1 })

    const timeAgo = (iso) => {
      if (!iso) return "—"
      const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
      if (days < 1) return "today"
      if (days < 7) return `${days}d ago`
      if (days < 30) return `${Math.floor(days/7)}w ago`
      if (days < 365) return `${Math.floor(days/30)}mo ago`
      return `${Math.floor(days/365)}y ago`
    }
    const topRepos = [...repos]
      .sort((a,b) => (b.stargazers_count||0)-(a.stargazers_count||0))
      .slice(0,6)
      // topics: GitHub's own repo-topics field — already present on every
      // object returned by the repos-list call above, zero extra API cost,
      // just never surfaced before. Real data the owner tagged, not inferred.
      // pushedAtIso is kept (not just the human "3d ago" string) so a future
      // re-analysis can tell whether a repo genuinely changed — see caching
      // below.
      .map(r => ({ name:r.name, fullName:r.full_name, desc:r.description||"", stars:r.stargazers_count||0, forks:r.forks_count||0, lang:r.language||null, updated:timeAgo(r.pushed_at), pushedAtIso:r.pushed_at||null, url:r.html_url, topics:Array.isArray(r.topics)?r.topics.slice(0,5):[], isFork:!!r.fork }))

    // ── Real per-repo intelligence, now with per-repo caching (Phase 2/3/4/5) ──
    // Only the top 3 repos (by stars) get this — each costs up to 3 extra
    // GitHub API calls (root listing, commit-count via Link header,
    // language bytes), so 3 is a deliberate ceiling to keep total
    // calls-per-analyze bounded given the unauthenticated 60-req/hr limit
    // shared across every user hitting this route when GITHUB_TOKEN isn't
    // set (strongly recommended to configure — see file header). Tech/
    // README detection is filename presence only; commit counts and
    // language bytes are exact real values from GitHub, not estimates.
    //
    // Caching (2026-08-04): before spending those 3 calls, check the user's
    // last stored analysis for the SAME repo with the SAME pushed_at
    // timestamp — if it hasn't been pushed to since we last checked, the
    // repo's file structure/commit count/language mix genuinely cannot have
    // changed, so reuse the cached values instead of re-fetching. This is a
    // real correctness-preserving cache (any push invalidates it), not a
    // time-based guess — it cuts the dominant cost of a "Refresh" click
    // (which previously always re-did all 9 extra calls even if nothing
    // about the repos had changed) down to near-zero on repeat use.
    let prevByRepoName = {}
    try {
      const prevRow = await codeDnaRepo.getProfile(userId)
      const prevTopRepos = prevRow?.source_ref?.analysis?.topRepos
      if (Array.isArray(prevTopRepos)) {
        prevByRepoName = Object.fromEntries(prevTopRepos.filter(r=>r?.name).map(r => [r.name, r]))
      }
    } catch (e) { console.error("[github/analyze] cache lookup failed:", e.message) }

    const topN = topRepos.slice(0,3)
    const langByteTotals = {}
    let verifiedCommitTotal = 0
    let anyVerifiedCommitCount = false
    await Promise.all(topN.map(async (r) => {
      const cached = prevByRepoName[r.name]
      const cacheValid = cached && cached.pushedAtIso && cached.pushedAtIso === r.pushedAtIso && !cached.detectionSkipped && cached._langBytes
      if (cacheValid) {
        r.techStack = cached.techStack || []
        r.hasReadme = !!cached.hasReadme
        r.hasTestDir = !!cached.hasTestDir
        r.detectionSkipped = false
        r.fromCache = true
        if (typeof cached._commitCount === "number") { verifiedCommitTotal += cached._commitCount; anyVerifiedCommitCount = true }
        for (const [lang, bytes] of Object.entries(cached._langBytes)) langByteTotals[lang] = (langByteTotals[lang]||0) + bytes
        return
      }
      const [rootInfo, commitCount, langBytes] = await Promise.all([
        inspectRepoRoot(r.fullName),
        getRepoCommitCount(r.fullName),
        getRepoLanguageBytes(r.fullName),
      ])
      r.techStack = rootInfo.techStack
      r.hasReadme = rootInfo.hasReadme
      r.hasTestDir = rootInfo.hasTestDir
      // BUG FIX (2026-08-04, real-world test #2): detectionSkipped used to
      // only reflect inspectRepoRoot's own outcome — a real repo could have
      // its commit-count and language-bytes calls BOTH fail (bad/expired
      // GITHUB_TOKEN, GitHub 5xx, rate limit hit mid-batch) while root
      // happened to succeed (or vice versa), and the UI would silently show
      // whichever half succeeded as if it were the whole truth — e.g. "18
      // commits (est.)" with no visible reason why real numbers weren't
      // used. Now ANY of the three sub-fetches failing marks the repo
      // skipped, so the "⏳ Detection skipped" badge (Aura.jsx) always shows
      // up when the data on screen isn't fully real.
      const commitOk = typeof commitCount === "number"
      const langOk = langBytes && Object.keys(langBytes).length > 0
      r.detectionSkipped = rootInfo.skipped || !commitOk || !langOk
      r._commitCount = commitOk ? commitCount : null   // internal, stripped before sending to client
      r._langBytes = langBytes || {}                    // internal, stripped before sending to client
      if (commitOk) { verifiedCommitTotal += commitCount; anyVerifiedCommitCount = true }
      for (const [lang, bytes] of Object.entries(langBytes||{})) langByteTotals[lang] = (langByteTotals[lang]||0) + bytes
    }))

    // ── Ownership / originality evidence (2026-09-03, Phase 5/6/7) ────────
    // Deliberately NOT cached alongside the tech/commit-count block above —
    // this is a small, bounded number of calls per repo (1 for recent
    // author share, +1 only for actual forks to name the parent, +2 for the
    // first-commit signal) and always recomputed so a repo's ownership
    // picture can't silently go stale between the pushed_at-keyed cache's
    // hits. Every field here is evidence-graded language (see
    // classifyOwnership) — never "verified owner" or "not copied".
    await Promise.all(topN.map(async (r) => {
      let parentFullName = null
      if (r.isFork) {
        try {
          const fr = await fetch(`https://api.github.com/repos/${r.fullName}`, { headers: ghHeaders() })
          if (fr.ok) { const full = await fr.json(); parentFullName = full?.parent?.full_name || null }
        } catch (e) { console.error(`[github/analyze] fork-parent lookup(${r.fullName}) threw:`, e.message) }
      }
      const [authorShare, firstCommitSignal] = await Promise.all([
        getRecentAuthorShare(r.fullName, username),
        getFirstCommitSignal(r.fullName),
      ])
      r.parentFullName = parentFullName
      r.authorShare = authorShare
      r.firstCommitSignal = firstCommitSignal
      r.ownership = classifyOwnership({ isFork: r.isFork, parentFullName, authorShare, firstCommitSignal, detectionSkipped: r.detectionSkipped, commitCount: r._commitCount })
    }))
    // Persist the internal cache fields on cached hits too (so they survive
    // into the next save unchanged), then strip fullName + underscore-
    // prefixed internal fields from what actually gets stored/sent — the
    // client never needs raw language-byte maps or internal commit counts.
    topN.forEach(r => {
      if (r.fromCache) {
        const cached = prevByRepoName[r.name]
        r._commitCount = cached._commitCount
        r._langBytes = cached._langBytes
      }
    })

    // Language breakdown: real byte-weighted mix from the top-3 repos
    // (accurate — matches what GitHub's own repo page shows) blended with
    // the coarse one-vote-per-repo fallback for everything outside the top
    // 3, weighted down so it can't dominate the accurate portion.
    // languagesAreExact (2026-08-04, real-world test #2): the UI previously
    // had no way to tell whether a 100%-one-language result was real or the
    // coarse single-vote fallback kicking in because every real /languages
    // call failed — this flag lets Aura.jsx label it "(estimated)" so a
    // fallback never LOOKS as authoritative as a real byte-weighted mix.
    let languages
    const langByteTotal = Object.values(langByteTotals).reduce((a,b)=>a+b,0)
    const languagesAreExact = langByteTotal > 0
    if (langByteTotal > 0) {
      const combined = { ...langByteTotals }
      const topNNames = new Set(topN.map(r=>r.name))
      const fallbackWeight = langByteTotal * 0.15 // remaining repos count for at most 15% of the mix
      const fallbackTotal = Object.entries(lc).reduce((s,[,c])=>s+c, 0) || 1
      repos.forEach(r => {
        if (r.language && !topNNames.has(r.name)) combined[r.language] = (combined[r.language]||0) + (fallbackWeight/fallbackTotal)
      })
      const combinedTotal = Object.values(combined).reduce((a,b)=>a+b,0) || 1
      languages = Object.entries(combined)
        .map(([lang,bytes]) => ({ lang, pct: Math.round((bytes/combinedTotal)*100) }))
        .filter(l => l.pct > 0)
        .sort((a,b) => b.pct-a.pct).slice(0,8)
    } else {
      // Real language-bytes call failed for all top-3 repos (e.g. rate
      // limited) — fall back entirely to the coarse per-repo method rather
      // than showing nothing.
      const fallbackTotal = Object.values(lc).reduce((a,b)=>a+b,0) || 1
      languages = Object.entries(lc)
        .map(([lang,count]) => ({ lang, pct: Math.round((count/fallbackTotal)*100) }))
        .sort((a,b) => b.pct-a.pct).slice(0,8)
    }

    const totalStars = repos.reduce((s,r)=>s+(r.stargazers_count||0),0)
    const totalForks  = repos.reduce((s,r)=>s+(r.forks_count||0),0)
    // Commits: exact counts for the top-3 repos (via the Link-header trick)
    // plus a scaled estimate for any remaining repos beyond those 3 — so an
    // account with all its activity in 1-3 repos (the common case) now
    // shows a real, correct number instead of the old wildly-off guess.
    const remainingRepoCount = Math.max(0, (user.public_repos||0) - topN.length)
    const estimatedRemainder = Math.round(remainingRepoCount * 18)
    const estimatedCommits = anyVerifiedCommitCount ? (verifiedCommitTotal + estimatedRemainder) : Math.round((user.public_repos||0) * 18 + totalStars * 0.4)
    const commitsAreExact = anyVerifiedCommitCount && remainingRepoCount === 0

    const recentPushDays = repos.length
      ? Math.min(...repos.map(r => r.pushed_at ? Math.floor((Date.now()-new Date(r.pushed_at).getTime())/86400000) : 9999))
      : 9999

    // ── Basic identity scores ────────────────────────────────────────────
    // Deliberately simple, deterministic heuristics computed ONLY from data
    // already fetched above (no extra API calls, no per-repo README fetch).
    // These are estimates, not verified facts — presented in the UI as such,
    // same discipline as the AI-derived fingerprint below. Full architecture/
    // commit-intelligence/behavior-pattern scoring is a larger, separate
    // build (deferred — see capabilio-coordination-layer memory note).
    // BUG FIX (2026-08-04, real-world test): documentation score used to be
    // description-presence-only across ALL repos, which showed 0 for an
    // account whose one repo has a real README (visibly linked in GitHub's
    // own sidebar) but no one-line repo description set. Now blends in the
    // real hasReadme signal from the top-3 repos we actually checked.
    const reposWithDesc = repos.filter(r => r.description && r.description.trim().length>0).length
    const descScore = repos.length ? (reposWithDesc/repos.length)*100 : 0
    const readmeChecked = topN.filter(r => !r.detectionSkipped)
    const readmeScore = readmeChecked.length ? (readmeChecked.filter(r=>r.hasReadme).length/readmeChecked.length)*100 : null
    const documentationScore = Math.round(readmeScore==null ? descScore : (descScore*0.6 + readmeScore*0.4))
    const builderScore = Math.max(0, Math.min(100, Math.round((user.public_repos||0)*2.5 + totalStars*0.6 + languages.length*5)))
    const activeWithin90 = repos.filter(r => r.pushed_at && (Date.now()-new Date(r.pushed_at).getTime())/86400000 <= 90).length
    const consistencyScore = Math.max(0, Math.min(100, Math.round((recentPushDays===9999?0:Math.max(0,100-recentPushDays))*0.6 + Math.min(activeWithin90,5)*8)))

    // Tech Breadth + Tooling Maturity (2026-08-05) — two more identity
    // scores from the original spec, computed ONLY from data already
    // fetched above (no new API calls), same honesty discipline as the
    // three existing scores. Deliberately did NOT add a "community/
    // engagement" score from followers/stars — that measures popularity,
    // not skill, and this platform's core principle is skill-first
    // evaluation; conflating GitHub star count with capability would cut
    // against that, so it's left out rather than added just to round out a
    // number of scores.
    //
    // techBreadthScore: real language diversity + real detected tech-stack
    // diversity across the checked top repos + tagged topics — a developer
    // working across genuinely different tools/languages scores higher than
    // one doing the same thing repeatedly. Always computable (languages
    // always has at least the coarse fallback), so never null.
    const uniqueTech = new Set(readmeChecked.flatMap(r => r.techStack||[]))
    const uniqueTopics = new Set(topRepos.flatMap(r => r.topics||[])) // GitHub-tagged metadata, not detection-dependent — safe across all topRepos
    const techBreadthScore = Math.max(0, Math.min(100, Math.round(languages.length*10 + uniqueTech.size*8 + Math.min(uniqueTopics.size,5)*4)))

    // toolingScore: real CI/CD + containerization + README + config-file
    // presence across the top repos we actually managed to check — signals
    // professional engineering practice, distinct from Documentation (which
    // is about explaining the work) and Builder (which is about volume).
    // null (not 0) when nothing could be checked this run — same pattern as
    // documentationScore's readmeScore, so a rate-limited/skipped run never
    // silently reads as "no tooling found."
    const toolingScore = readmeChecked.length ? Math.max(0, Math.min(100, Math.round(
      (readmeChecked.some(r=>(r.techStack||[]).some(t=>t.includes("CI/CD")))?30:0) +
      (readmeChecked.some(r=>(r.techStack||[]).some(t=>t.includes("Docker")))?20:0) +
      (readmeChecked.some(r=>r.hasReadme)?20:0) +
      Math.min(readmeChecked.reduce((s,r)=>s+(r.techStack||[]).length,0),6)*5
    ))) : null

    const scores = { builder: builderScore, documentation: documentationScore, consistency: consistencyScore, techBreadth: techBreadthScore, tooling: toolingScore }

    // BUG FIX (2026-08-04, real-world test #3): confidenceScore used to be
    // scored purely off breadth signals (repo count / followers / stars) —
    // a real, substantial single-repo account (e.g. 307 verified commits,
    // 5 real languages, README present, CI configured) scored the same LOW
    // confidence as a genuinely thin one, because the prompt never told the
    // model anything about DEPTH. Now passes the real per-repo depth signals
    // already computed above (verified commit count when we have it, tech
    // stack breadth, README presence) and explicitly instructs the model to
    // weigh depth alongside breadth — a small, focused single-repo project
    // with real commit history and real tooling should NOT score as "Simple
    // and Limited" just because it's one repo with no stars/followers.
    const depthRepo = topN.find(r => !r.detectionSkipped) || topN[0]
    const aiRaw = await groq([{ role:"user", content:
`Analyse this public GitHub profile for a ${keyword} role. Base your answer only on the data given — do not invent facts. Return ONLY valid JSON, no prose.
User: ${user.login} | Public repos: ${user.public_repos} | Followers: ${user.followers} | Total stars: ${totalStars}
Top languages: ${languages.map(l=>`${l.lang}(${l.pct}%)`).join(", ") || "unknown"}
Repo names: ${topRepos.map(r=>r.name).join(", ") || "none"}
Most recent push: ${recentPushDays===9999?"unknown":`${recentPushDays} days ago`}
Total commits: ${estimatedCommits}${commitsAreExact?" (verified exact count via GitHub API)":" (estimate)"}
Primary repo depth signal: ${depthRepo ? `${depthRepo.name} — tech stack: ${(depthRepo.techStack||[]).join(", ")||"none detected"}, README: ${depthRepo.hasReadme?"present":"not found"}${depthRepo.detectionSkipped?" (detection was skipped this run — do not penalize for missing signals here)":""}` : "no repo data available"}

IMPORTANT on confidenceScore: this is a reading-confidence score, not a popularity score. A developer with ONE substantial repo, a verified high commit count, real tooling (README/CI/config files), and a coherent tech stack should score confidently even with zero followers/stars — depth of real, verified work matters more than breadth of social signals. Only score low when the data is genuinely thin (few commits, no real tooling, single trivial file) — not merely because there's one repo or no followers.

Return JSON exactly matching this schema:
{"fingerprintTitle":"<short role-flavoured title, e.g. 'Python Backend Practitioner'>","dna":"<2-3 sentence plain-language summary of what the public data suggests about this developer's focus and habits>","patterns":["<short observed pattern>","...", "up to 4"],"specialization":"<primary tech focus, 2-5 words>","codingStyle":"<short phrase>","standoutFact":"<one specific, data-grounded observation, or empty string if nothing stands out>","confidenceScore":<0-100, weighing real depth (verified commits, tech stack, README/CI) alongside breadth (repos/followers/stars) as instructed above — NOT a verification, just a reading confidence>}` }], { model: GROQ_FAST, max_tokens: 500, json: true })
    const ai = extractJson(aiRaw)

    const confidenceScore = Math.max(0, Math.min(100, Number(ai.confidenceScore) || 50))
    const fingerprint = {
      authenticityScore: confidenceScore,
      fingerprintTitle: ai.fingerprintTitle || `${languages[0]?.lang || "Multi-language"} Developer`,
      dna: ai.dna || `Public profile with ${user.public_repos} repositories across ${languages.length} language(s).`,
      patterns: Array.isArray(ai.patterns) ? ai.patterns.slice(0,4) : [],
      specialization: ai.specialization || languages[0]?.lang || "General",
      codingStyle: ai.codingStyle || "—",
      // Deliberately never says "verified" — this route only reads public
      // profile metadata, it does not confirm repo ownership on its own.
      // Real ownership confirmation is the bio-code check above.
      verificationStatus: confidenceScore>=80 ? "High reading confidence (unverified)" : confidenceScore>=55 ? "Moderate reading confidence (unverified)" : "Low reading confidence (unverified)",
      standoutFact: ai.standoutFact || "",
    }

    // Client never needs fullName (internal lookup key) or the underscore-
    // prefixed cache fields (raw commit count / language bytes per repo) —
    // those are kept only in the persisted copy below so the NEXT /analyze
    // call can reuse them via prevByRepoName.
    const topReposForClient = topRepos.map(({ fullName, _commitCount, _langBytes, fromCache, ...rest }) => rest)

    // Developer Identity Timeline (2026-08-05) — built entirely from data
    // already fetched in THIS call, no new API calls. `user.created_at` and
    // each repo's `created_at`/`pushed_at`/`stargazers_count` come straight
    // off the same /users and /users/:username/repos responses already
    // parsed above — just never extracted into the response before. Covers
    // ALL fetched repos (up to 30), not just the top-3 deep-inspected ones,
    // since creation/push dates cost nothing extra to expose. Deliberately
    // does NOT attempt a commits-per-month graph — we only have a total
    // commit count (exact for the top-3, estimated otherwise), never a
    // real per-period breakdown, so faking one would violate the same
    // honesty discipline as the scores above.
    const repoTimeline = repos.map(r => ({ name: r.name, createdAt: r.created_at||null, pushedAt: r.pushed_at||null, stars: r.stargazers_count||0, language: r.language||null }))

    const collaboration = await collaborationPromise

    const responseBody = {
      username: user.login,
      // 2026-08-05: GitHub's own profile "name" field (distinct from the
      // login/username) — real, unmodified data from the GitHub API,
      // exposed so the frontend can run an identity-mismatch check before
      // applying this analysis to an account (a GitHub profile belonging to
      // someone else was previously analyzable with no check at all). Null
      // when the GitHub user hasn't set a display name — many legitimately
      // don't, so the frontend check must treat null as "can't judge",
      // never as a mismatch.
      name: user.name || null,
      avatar: user.avatar_url,
      bio: user.bio || "",
      location: user.location || "",
      company: user.company || "",
      accountCreatedAt: user.created_at || null,
      repoTimeline,
      publicRepos: user.public_repos,
      followers: user.followers,
      totalStars,
      totalForks,
      totalCommits: estimatedCommits,
      commitsAreExact,
      languages,
      languagesAreExact,
      // True when at least one of the top-3 repos couldn't be fully
      // inspected (bad/expired GITHUB_TOKEN, GitHub rate limit, or a
      // transient GitHub error) — lets the UI explain WHY numbers are
      // estimates instead of silently showing them as if they were real.
      anyDetectionSkipped: topN.some(r => r.detectionSkipped),
      topRepos: topReposForClient,
      fingerprint,
      scores,
      collaboration,
    }

    // Persist as the user's current Code DNA snapshot. Stores the FULL
    // topRepos (including fullName + the internal _commitCount/_langBytes
    // cache fields on the top-3) so the next /analyze call can skip re-
    // fetching any repo whose pushed_at hasn't changed — see the caching
    // block above. Never blocks or fails the response — a persistence
    // hiccup shouldn't stop the user seeing their own analysis, it just
    // means it won't be cached/recruiter-visible until the next successful
    // save.
    try {
      const analysisForCache = { ...responseBody, topRepos }
      const saved = await codeDnaRepo.upsertProfile(userId, { username: user.login, analysis: analysisForCache, scores })
      // scoreHistory only exists after a successful save (it's computed
      // inside upsertProfile from the previous row) — attach it to the
      // response so the frontend has real progression data without a
      // second round-trip. Silently omitted if persistence failed below.
      responseBody.scoreHistory = saved?.source_ref?.scoreHistory || []
    } catch (persistErr) {
      console.error("[github/analyze] proof_objects persist failed:", persistErr.message)
    }

    // Refresh the canonical connection's denormalized summary (Settings/
    // Career & Vault/Portfolio/Profile Strength all read this, not the full
    // analysis blob) — best-effort, same non-blocking discipline as the
    // proof_objects persist above. A user who has never called /connect
    // (e.g. still on the old direct /analyze flow) simply has no
    // github_connections row yet; markScanCompleted is a plain UPDATE, so
    // this is a safe no-op for them, not an error.
    try {
      await connectionRepo.markScanCompleted(userId, {
        codeDnaScore: scores.builder ?? null,
        confidenceLevel: confidenceScore >= 80 ? "high" : confidenceScore >= 55 ? "moderate" : "low",
        repositoriesAnalyzed: repos.length,
      })
    } catch (connErr) {
      console.error("[github/analyze] connection summary update failed:", connErr.message)
    }

    return { status: 200, body: responseBody }
  } catch (e) {
    console.error("[github/analyze]", e.message)
    return { status: 500, body: { error: e.message }, errorCategory: "unknown" }
  }
}

// strictLimiter here is IP-level defense-in-depth, not the primary abuse
// guard — this route predates the canonical connection (Aura.jsx's Code DNA
// tab still calls it directly for its own client-cached preview, a
// deliberately unchanged legacy pathway; see 2026-09-03 design notes). The
// canonical, per-user atomic cooldown lives on POST /refresh below.
router.post("/analyze", strictLimiter, async (req, res) => {
  const result = await analyzeGithubProfile({ userId: req.user.id, githubUrl: req.body.githubUrl, keyword: req.body.keyword })
  res.status(result.status).json(result.body)
})

// ─── Canonical GitHub connection (2026-09-03) ──────────────────────────────
// The single entry point Settings, Career & Vault, and Onboarding all call
// to establish or update a user's GitHub identity — see the design report's
// "canonical identity" requirement. Runs one real analysis immediately (the
// same analyzeGithubProfile used by /analyze and the 24-hour batch scanner)
// so the user sees real data right away instead of an empty "connected, but
// no data yet" state.
router.post("/connect", strictLimiter, async (req, res) => {
  const { githubUrl = "" } = req.body || {}
  const username = parseUsername(githubUrl)
  if (!username) return res.status(400).json({ error: "Enter a valid GitHub profile URL, like https://github.com/username" })

  // Resolve the account BEFORE persisting anything, so a typo'd/nonexistent
  // username never creates a connection row pointing nowhere.
  let resolvedLogin
  try {
    const ur = await fetch(`https://api.github.com/users/${username}`, { headers: ghHeaders() })
    if (ur.status === 404) return res.status(404).json({ error: "We couldn't find that GitHub profile. Check the username or URL and try again." })
    if (!ur.ok) return res.status(ur.status === 403 ? 429 : 502).json({ error: ur.status === 403 ? "GitHub is rate-limiting requests right now — try again shortly." : "Unable to reach GitHub right now. Please try again later." })
    const user = await ur.json()
    resolvedLogin = user.login
  } catch (e) {
    console.error("[github/connect] user lookup failed:", e.message)
    return res.status(502).json({ error: "Unable to reach GitHub right now. Please try again later." })
  }

  try {
    await connectionRepo.upsertConnectionIdentity(req.user.id, {
      username: resolvedLogin,
      profileUrl: `https://github.com/${resolvedLogin}`,
    })
    // Reflects "Analyzing…" immediately for anyone watching /connection
    // (e.g. a second open tab) during the synchronous first analysis below —
    // purely a status signal, upsertConnectionIdentity already left the row
    // idle/claimable so this can't race with a concurrent /refresh.
    await connectionRepo.markScanning(req.user.id)
  } catch (e) {
    console.error("[github/connect] persist failed:", e.message)
    return res.status(500).json({ error: "Couldn't save your GitHub connection. Please try again." })
  }

  // Keep profiles.github_url in sync — every existing UI (Settings' Profile
  // Links form, Career & Vault, Portfolio) already reads this one field;
  // the new github_connections row is additive metadata alongside it, not
  // a replacement the rest of the app needs to be rewired to read first.
  try {
    await supabaseAdmin.from("profiles").update({ github_url: `https://github.com/${resolvedLogin}` }).eq("id", req.user.id)
  } catch (e) {
    console.error("[github/connect] profiles.github_url sync failed:", e.message)
  }

  const result = await analyzeGithubProfile({ userId: req.user.id, githubUrl: `https://github.com/${resolvedLogin}`, keyword: req.body.keyword })
  if (result.status !== 200) {
    try { await connectionRepo.markScanFailed(req.user.id, { errorCategory: result.errorCategory }) } catch { /* best-effort; already logged inside analyzeGithubProfile */ }
  }
  res.status(result.status === 200 ? 200 : 207).json({
    connected: true,
    username: resolvedLogin,
    analysis: result.status === 200 ? result.body : null,
    analysisError: result.status === 200 ? null : result.body?.error || "Analysis couldn't be completed right now — your connection was still saved.",
  })
})

router.post("/disconnect", async (req, res) => {
  try {
    await connectionRepo.markDisconnected(req.user.id)
    res.json({ success: true })
  } catch (e) {
    console.error("[github/disconnect]", e.message)
    res.status(500).json({ error: "Couldn't disconnect right now. Please try again." })
  }
})

// ─── User-initiated refresh (2026-09-03, revised) ──────────────────────────
// There is no automatic rescanning — this is the ONLY way (besides the
// initial /connect) a scan ever runs. tryStartManualScan is the sole,
// atomic gate: it prevents two concurrent refreshes for the same user (a
// double-click, two open tabs) and enforces a short cooldown against
// accidental spam, on top of the IP-level strictLimiter below. The previous
// successful score/confidence/repo-count are never touched by a failed
// scan (see markScanFailed), so a failed refresh always leaves the last
// good result exactly as it was.
router.post("/refresh", strictLimiter, async (req, res) => {
  const userId = req.user.id
  let claim
  try {
    claim = await connectionRepo.tryStartManualScan(userId)
  } catch (e) {
    console.error("[github/refresh] claim failed:", e.message)
    return res.status(500).json({ error: "Unable to start analysis right now. Please try again." })
  }

  if (!claim.started) {
    if (claim.reason === "not_connected") {
      return res.status(400).json({ error: "Connect your GitHub account first." })
    }
    if (claim.reason === "in_progress") {
      return res.status(409).json({ error: "Your GitHub analysis is already in progress." })
    }
    if (claim.reason === "cooldown") {
      return res.status(429).json({
        error: "Please wait a bit before refreshing again.",
        retryAfterSeconds: claim.retryAfterSeconds,
      })
    }
    return res.status(500).json({ error: "Unable to start analysis right now. Please try again." })
  }

  const { username, profile_url: profileUrl } = claim.connection
  const result = await analyzeGithubProfile({ userId, githubUrl: profileUrl || `https://github.com/${username}` })
  if (result.status !== 200) {
    try { await connectionRepo.markScanFailed(userId, { errorCategory: result.errorCategory }) } catch { /* best-effort; already logged inside analyzeGithubProfile */ }
    return res.status(207).json({
      refreshed: false,
      error: result.body?.error || "Analysis couldn't be completed right now — your previous results are still shown.",
    })
  }
  res.json({ refreshed: true, analysis: result.body })
})

// Canonical status object every UI surface (Settings, Career & Vault,
// Portfolio, Profile Strength) should read from, instead of each computing
// its own idea of "is GitHub connected" from profiles.github_url alone.
router.get("/connection", async (req, res) => {
  try {
    const conn = await connectionRepo.getConnection(req.user.id)
    if (!conn || conn.disconnected_at) return res.json({ connected: false })
    res.json({
      connected: true,
      username: conn.username,
      profileUrl: conn.profile_url,
      verificationState: conn.verification_state,
      scanStatus: conn.scan_status,
      lastScannedAt: conn.last_scanned_at,
      // Earliest time a manual refresh is allowed again (abuse-prevention
      // cooldown) — never framed to the user as a scheduled/automatic scan.
      refreshAvailableAt: conn.next_scan_at,
      lastScanFailed: !!conn.last_scan_error,
      codeDnaScore: conn.code_dna_score,
      confidenceLevel: conn.confidence_level,
      repositoriesAnalyzed: conn.repositories_analyzed,
    })
  } catch (e) {
    console.error("[github/connection]", e.message)
    res.status(500).json({ error: "Unable to load your GitHub connection right now." })
  }
})

// ─── AI Repository Interview (2026-08-04) ──────────────────────────────────
// Recruiter-facing verification: can the candidate coherently explain their
// OWN real repository? Deliberately NOT a video/webcam flow like the general
// AIInterviewPanel (frontend/src/pages/Aura.jsx) — that's a separate, skill-
// based mock interview unrelated to any specific repo. This is text-based
// and grounded ONLY in real signals already gathered by /analyze (tech
// stack, README presence, topics, language mix, commit count) — the model
// is explicitly told not to invent file/function names we never fetched
// (we only ever fetched a root directory listing, not file contents).
//
// SAFEGUARD (per project AI-integration policy): this is a probabilistic
// comprehension check, never an authoritative pass/fail. It does NOT touch
// scores.builder/documentation/consistency, does NOT touch ELO, and is
// stored as a clearly separate `repoInterview` sub-object — never folded
// into the scored fields used elsewhere. The recruiter view labels it
// "AI-assessed" explicitly (see recruiterEvidence.js).
//
// Same trust model as the existing AIInterviewPanel (Aura.jsx): the client
// echoes back the question text alongside each answer for grading, rather
// than the server re-fetching/validating question identity server-side.
// Acceptable here for the same reason it's acceptable there — this is
// informational, not a gate on any critical scoring/entitlement decision.
router.post("/repo-interview/generate", async (req, res) => {
  try {
    const row = await codeDnaRepo.getProfile(req.user.id)
    const analysis = row?.source_ref?.analysis
    const repo = analysis?.topRepos?.[0]
    if (!analysis || !repo) return res.status(400).json({ error: "Analyze a GitHub profile first, then generate interview questions." })

    const depthNote = repo.detectionSkipped
      ? "\nNote: technical detection was skipped for this repo (rate limit) — keep questions general/project-level, do not assume a specific tech stack or README exists."
      : ""

    const prompt = `You are preparing a short verification interview for a candidate about their OWN real GitHub repository. Ask questions ONLY about what's given below — never invent file names, functions, or implementation details that aren't listed. The goal is letting a recruiter judge genuine hands-on understanding, not trivia.

Repository: ${repo.name}
Description: ${repo.desc || "none given"}
Primary language mix: ${(analysis.languages||[]).map(l=>`${l.lang} ${l.pct}%`).join(", ") || "unknown"}
Detected tooling/tech stack: ${(repo.techStack||[]).join(", ") || "none detected"}
README present: ${repo.hasReadme ? "yes" : "no"}
Topics tagged: ${(repo.topics||[]).join(", ") || "none"}
Total commits: ${analysis.totalCommits}${analysis.commitsAreExact ? " (verified exact count)" : " (estimate)"}${depthNote}

Generate exactly 4 questions grounded ONLY in the above: one about why they chose their tech stack/languages, one asking them to walk through what the project actually does, one about how they'd improve or scale it, one about their commit history/consistency on it. Return ONLY a valid JSON array, no prose:
[{"id":1,"question":"...","testsSignal":"<which real signal above this checks>"}, ... exactly 4 items]`

    const raw = await groq([{ role:"user", content: prompt }], { model: GROQ_FAST, max_tokens: 500, json: true })
    let questions = extractJsonArray(raw).slice(0,4).map((q,i) => ({
      id: q.id ?? i+1,
      question: String(q.question || "").trim(),
      testsSignal: String(q.testsSignal || "").trim(),
    })).filter(q => q.question)

    if (!questions.length) {
      // Fallback: same real-data grounding, no AI dependency — never leave
      // the user stuck if Groq is unavailable/rate-limited.
      questions = [
        { id: 1, question: `Why did you choose ${(analysis.languages||[])[0]?.lang || "this"} language mix for ${repo.name}?`, testsSignal: "tech stack choice" },
        { id: 2, question: `Walk me through what ${repo.name} actually does, end to end.`, testsSignal: "project comprehension" },
        { id: 3, question: `If you had another month on ${repo.name}, what would you improve or scale first, and why?`, testsSignal: "improvement judgment" },
        { id: 4, question: `Your commit history on ${repo.name} shows ${analysis.totalCommits} commits — what does that history look like in practice (steady work, big pushes, refactors)?`, testsSignal: "commit consistency" },
      ]
    }
    return res.json({ repoName: repo.name, questions })
  } catch (e) { console.error("[github/repo-interview/generate]", e.message); res.status(500).json({ error: e.message }) }
})

router.post("/repo-interview/submit", async (req, res) => {
  const { repoName, questions, answers } = req.body || {}
  try {
    if (!repoName || !Array.isArray(questions) || !questions.length) return res.status(400).json({ error: "Missing repoName/questions" })
    if (!Array.isArray(answers) || !answers.length) return res.status(400).json({ error: "Missing answers" })

    const byId = new Map(questions.map(q => [q.id, q]))
    const qa = answers
      .map(a => { const q = byId.get(a.questionId); return q ? `Q: ${q.question}\nA: ${String(a.answer||"").trim()||"(no answer given)"}` : null })
      .filter(Boolean).join("\n\n")

    const prompt = `You are assessing whether a candidate genuinely understands their OWN real GitHub repository "${repoName}", based on their answers below. This is a comprehension check, not a coding test — judge coherence, specificity, and whether the answer plausibly reflects real hands-on experience with what they described, not writing quality.

${qa}

Return ONLY valid JSON, no prose:
{"overallVerdict":"<one of: Genuine understanding | Partial understanding | Vague or generic | Doesn't match stated project>","summary":"<1-2 sentence plain-language assessment>","questionFeedback":[{"questionId":<id>,"verdict":"<Genuine|Partial|Vague|Mismatch>","note":"<short specific reason>"}]}`

    const raw = await groq([{ role:"user", content: prompt }], { model: GROQ_FAST, max_tokens: 500, json: true })
    const ai = extractJson(raw)
    const evaluation = {
      overallVerdict: ai.overallVerdict || "Partial understanding",
      summary: ai.summary || "",
      questionFeedback: Array.isArray(ai.questionFeedback) ? ai.questionFeedback : [],
    }

    const transcript = answers.map(a => ({ questionId: a.questionId, question: byId.get(a.questionId)?.question || "", answer: String(a.answer||"").trim() }))
    const saved = await codeDnaRepo.saveRepoInterview(req.user.id, { repoName, questions, transcript, evaluation })
    return res.json({ repoInterview: saved.source_ref?.repoInterview })
  } catch (e) { console.error("[github/repo-interview/submit]", e.message); res.status(500).json({ error: e.message }) }
})

router.get("/repo-interview", async (req, res) => {
  try {
    const row = await codeDnaRepo.getProfile(req.user.id)
    return res.json({ repoInterview: row?.source_ref?.repoInterview || null })
  } catch (e) { console.error("[github/repo-interview:get]", e.message); res.status(500).json({ error: e.message }) }
})

// ─── Code DNA visibility (2026-08-05) ────────────────────────────────────────
// Lets the user control whether their Code DNA (capability signals + AI
// Repository Interview) shows up on their public portfolio / to recruiters —
// matches the existing certVisible pattern for certificates. Was previously
// hardcoded always-on with no user control at all; see
// lib/codeDna/repository.js's setVisibility() for the fix.
router.get("/visibility", async (req, res) => {
  try {
    const row = await codeDnaRepo.getProfile(req.user.id)
    if (!row) return res.json({ isPortfolioVisible: true, isRecruiterVisible: true, hasAnalysis: false })
    res.json({
      isPortfolioVisible: row.is_portfolio_visible !== false,
      isRecruiterVisible: row.is_recruiter_visible !== false,
      hasAnalysis: true,
    })
  } catch (e) { console.error("[github/visibility:get]", e.message); res.status(500).json({ error: e.message }) }
})

router.post("/visibility", async (req, res) => {
  try {
    const { isPortfolioVisible, isRecruiterVisible } = req.body || {}
    const updated = await codeDnaRepo.setVisibility(req.user.id, { isPortfolioVisible, isRecruiterVisible })
    if (!updated) return res.status(404).json({ error: "Analyze your GitHub profile at least once before changing visibility." })
    res.json({
      isPortfolioVisible: updated.is_portfolio_visible !== false,
      isRecruiterVisible: updated.is_recruiter_visible !== false,
    })
  } catch (e) { console.error("[github/visibility:post]", e.message); res.status(500).json({ error: e.message }) }
})

// ─── Cross-Verification against Arena/SkillStudio/Portfolio (2026-08-05) ───
// Checks whether Code DNA's real, GitHub-derived tech signals (languages +
// detected tooling across the top repos actually checked) also show up in
// user_skills — the single canonical, RLS-protected skill table this
// platform already writes to from Arena, SkillStudio, resume parsing, and
// manual entry (see routes/skillGraph.js's own header comment on avoiding a
// second parallel schema; deliberately reusing THAT table rather than
// re-deriving skill data from Arena/SkillStudio proof_objects rows
// separately, which would risk drifting out of sync with what the Skills
// page itself shows).
//
// Purely additive/informational, NOT a trust or scoring signal: a tech
// signal with no matching user_skills entry is labeled "not yet reflected",
// never "mismatch" or a negative flag — GitHub is necessarily incomplete
// evidence (private repos, work done outside personal GitHub, pair/mob
// programming not reflected in commit authorship, etc. are all invisible
// here), so absence of a match must never be read as absence of skill.
// This route only reads; it never writes to user_skills or touches ELO.
router.get("/cross-verify", async (req, res) => {
  try {
    const row = await codeDnaRepo.getProfile(req.user.id)
    const analysis = row?.source_ref?.analysis
    if (!analysis) return res.status(400).json({ error: "Analyze a GitHub profile first." })

    const signalNames = new Set()
    ;(analysis.languages||[]).forEach(l => l.lang && signalNames.add(l.lang))
    ;(analysis.topRepos||[]).forEach(r => (r.techStack||[]).forEach(t => t && signalNames.add(t)))
    if (!signalNames.size) return res.json({ corroborated: [], newSignals: [] })

    const { data: userSkills, error } = await supabaseAdmin
      .from("user_skills")
      .select("name,slug,level_score,verified,source")
      .eq("user_id", req.user.id)
    if (error) throw error

    const bySlug = new Map((userSkills||[]).filter(s=>s.slug).map(s => [s.slug, s]))
    const findMatch = (name) => {
      const slug = makeSlug(name)
      if (bySlug.has(slug)) return bySlug.get(slug)
      // Loose containment match for near-variants the exact slug won't catch
      // (e.g. GitHub's "TypeScript" vs a user_skills entry slugged from
      // "CSS/Tailwind" wouldn't match, but "Node.js"→"nodejs" vs a
      // "node"-slugged entry should).
      return (userSkills||[]).find(s => s.slug && (s.slug.includes(slug) || slug.includes(s.slug))) || null
    }

    const results = [...signalNames].map(name => {
      const match = findMatch(name)
      return match
        ? { signal: name, status: "corroborated", matchedSkill: match.name, levelScore: match.level_score, verified: !!match.verified, source: match.source }
        : { signal: name, status: "new_signal" }
    })

    return res.json({
      corroborated: results.filter(r => r.status === "corroborated"),
      newSignals: results.filter(r => r.status === "new_signal").map(r => r.signal),
    })
  } catch (e) { console.error("[github/cross-verify]", e.message); res.status(500).json({ error: e.message }) }
})

export default router

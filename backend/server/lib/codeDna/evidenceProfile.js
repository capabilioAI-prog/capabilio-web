// ─── GitHub Evidence Profile ────────────────────────────────────────────────
// The single, canonical builder for the recruiter/portfolio-facing "GitHub
// Evidence Profile" — a structured evidence report layered on top of the
// existing Code DNA analysis engine (routes/github.js's analyzeGithubProfile,
// unchanged), not a second analysis pipeline. Every field here is derived
// from data already fetched and persisted in proof_objects.source_ref; this
// module makes no GitHub API calls of its own.
//
// Why this file exists (2026-09-03, GitHub Evidence Profile): before this,
// two different, INCONSISTENT recruiter-facing views of the same data
// existed — recruiterEvidence.js's buildCodeDnaRecruiterView (safe, but only
// 4 boolean capability flags) and routes/partnerBridge.js's own inline
// object (which leaked raw repo names/stars/languages/bio/avatar directly,
// contradicting the very policy the other file's comment states). This
// module replaces both call sites' bespoke logic with one shared builder —
// recruiterEvidence.js's buildCodeDnaRecruiterView now delegates here, and
// partnerBridge.js calls that same function instead of building its own
// object. One canonical shape, one place where the "never expose raw
// analytics" rule can actually be enforced and tested.
//
// LANGUAGE DISCIPLINE: every label in this file is evidence-graded, never an
// absolute claim. In particular, this module never claims "no similarity
// found" or "not copied" for originality, because no code-content
// comparison is ever performed (see ORIGINALITY below) — claiming a check
// passed when no check ran would itself be a fabrication.
//
// SCORING INPUT TABLE (Phase 9 documentation requirement — kept here, next
// to the code it describes, rather than in a separate doc that can drift):
//
// INPUT SIGNAL              → WHY IT MATTERS                              → HOW MEASURED                                          → FAILURE/LIMITATION CASE                        → USER-FACING EXPLANATION
// ownership label per repo  → distinguishes solo original work from       → routes/github.js classifyOwnership(): fork/parent,   → detectionSkipped → "could not be fully          → "Authorship evidence" section, per-repo tags
//                             forked/derivative work                        5-commit author-share sample, first-commit size         verified"; single-commit repo → "insufficient
//                                                                                                                                     evidence" (never "template-generated", which
//                                                                                                                                     would be an accusation, not a fact)
// hasReadme / hasTestDir /  → maintainability signals recruiters actually → one root-directory listing per top repo (already     → root listing fails → all three default to      → "Engineering practice" section: observed /
// CI/CD tech-stack tag        look for (see research notes)                  fetched, zero extra cost)                               false AND detectionSkipped=true, so absence      not observed / not available for analysis
//                                                                                                                                     is never confused with "checked, not found"
// languages[] byte share    → real technology usage, not a single         → exact byte counts from GitHub's languages API,        → only computed for the top-3 repos; long-tail    → "Technical footprint" section, bucketed by
//                             dependency-file mention                        summed and %-ranked                                     repos fall back to a coarse per-repo vote        area (Frontend/Backend/Data/etc.), never a raw %
// pullRequestsAuthored /    → the ONLY signal reflecting work on OTHER    → GitHub Search API, author:{username} type:pr           → Search API's own stricter rate limit can fail   → "Collaboration evidence" section; null (not
// mergedPullRequests          people's repos — collaboration, not just      (2 calls, separate budget from the core API calls)      independently of everything else → skipped:true    zero) when unavailable, never fabricated
//                             solo output
// repoTimeline (pushed/     → sustained engineering activity over time,   → created_at/pushed_at already returned by the repos     → an account with few/no repos has too little     → "Contribution consistency" section — explicitly
// created dates)              not a gamed daily-commit streak                list call, zero extra cost                              spread to say anything — labeled, not guessed    NOT a green-square streak metric
// fingerprint.authenticity  → overall reading-confidence, reused rather   → Groq-generated 0-100 confidence score already stored  → always present once an analysis exists          → "Evidence confidence" — high/moderate/low,
// Score                       than computing a second, competing number     alongside the analysis                                                                                    never the raw 0-100 number to a recruiter

// ── Technology → area classification (used only to GROUP already-detected
// languages/tech-stack tags into recruiter-legible buckets — never used to
// invent a technology that wasn't actually detected). ──────────────────────
const AREA_BY_TECH = {
  // Frontend
  JavaScript: "Frontend", TypeScript: "Frontend", HTML: "Frontend", CSS: "Frontend", Vue: "Frontend", Svelte: "Frontend",
  // Backend
  Python: "Backend", Java: "Backend", Go: "Backend", Ruby: "Backend", PHP: "Backend", Rust: "Backend", "C#": "Backend", Kotlin: "Backend",
  "Node.js": "Backend", "Java (Maven)": "Backend", "Java/Kotlin (Gradle)": "Backend",
  // Data
  SQL: "Data", Jupyter: "Data", R: "Data",
  // DevOps
  Docker: "DevOps", "Docker Compose": "DevOps", Shell: "DevOps", "CI/CD (GitHub Actions)": "DevOps",
}

function bucketPrimaryTechnicalAreas(analysis) {
  const areas = new Map()
  for (const l of analysis?.languages || []) {
    const area = AREA_BY_TECH[l.lang]
    if (area) areas.set(area, (areas.get(area) || 0) + (l.pct || 1))
  }
  for (const r of analysis?.topRepos || []) {
    for (const t of r.techStack || []) {
      const area = AREA_BY_TECH[t]
      if (area) areas.set(area, (areas.get(area) || 0) + 1)
    }
  }
  return [...areas.entries()].sort((a, b) => b[1] - a[1]).map(([area]) => area).slice(0, 4)
}

function deriveTechnicalFootprint(analysis) {
  const byArea = new Map()
  const addTech = (area, tech, repoName) => {
    if (!area) return
    if (!byArea.has(area)) byArea.set(area, { technologies: new Set(), repos: new Set() })
    const entry = byArea.get(area)
    if (tech) entry.technologies.add(tech)
    if (repoName) entry.repos.add(repoName)
  }
  for (const l of analysis?.languages || []) addTech(AREA_BY_TECH[l.lang], l.lang, null)
  for (const r of analysis?.topRepos || []) {
    for (const t of r.techStack || []) addTech(AREA_BY_TECH[t], t, r.name)
  }
  return [...byArea.entries()].map(([area, { technologies, repos }]) => ({
    area,
    technologies: [...technologies],
    repositoryCount: repos.size,
    // Evidence strength is about how many independently-observed repos
    // corroborate this area, not a formula tuned to look impressive.
    evidenceStrength: repos.size >= 2 ? "Moderate" : repos.size === 1 ? "Limited" : "Indicated by language mix only",
  })).sort((a, b) => b.repositoryCount - a.repositoryCount)
}

function repoMaturity(repo) {
  if (!repo?.pushedAtIso) return "Activity timing unavailable"
  const monthsSincePush = (Date.now() - new Date(repo.pushedAtIso).getTime()) / (1000 * 60 * 60 * 24 * 30)
  if (monthsSincePush <= 6) return "Actively maintained"
  if (monthsSincePush <= 18) return "Maintained in the past year"
  return "Established, no recent activity observed"
}

function deriveProjectEvidence(analysis) {
  return (analysis?.topRepos || []).map(r => {
    const limitations = []
    if (r.detectionSkipped) limitations.push("Some repository data could not be fully retrieved during this analysis.")
    if (r.isFork) limitations.push("This repository is a fork of another project.")
    if (r.ownership?.tone === "neutral") limitations.push(r.ownership.detail)
    if (!r.hasReadme) limitations.push("No README was found, limiting evidence of documented project intent.")
    return {
      name: r.name,
      url: r.url,
      summary: r.desc || "No description was provided for this repository.",
      techStack: r.techStack || [],
      maturity: repoMaturity(r),
      authorshipEvidence: r.ownership || { label: "Insufficient evidence", detail: "Not enough data was available to assess.", tone: "neutral" },
      engineeringSignals: {
        hasReadme: !!r.hasReadme,
        hasTestDirectory: !!r.hasTestDir,
        hasCiConfig: (r.techStack || []).includes("CI/CD (GitHub Actions)"),
        isFork: !!r.isFork,
      },
      limitations,
    }
  })
}

const POSITIVE_OWNERSHIP_LABELS = new Set(["Strong ownership evidence", "Substantial contributor"])

function deriveAuthorshipEvidence(analysis) {
  const repos = analysis?.topRepos || []
  const positive = repos.filter(r => POSITIVE_OWNERSHIP_LABELS.has(r.ownership?.label))
  const strong = repos.filter(r => r.ownership?.label === "Strong ownership evidence")
  if (repos.length === 0) {
    return { label: "Insufficient evidence", detail: "No repositories were available to assess authorship.", contributingSignals: [] }
  }
  if (strong.length > 0) {
    return {
      label: "Strong authorship evidence",
      detail: `Recent commit history on ${strong.map(r => r.name).join(", ")} shows original, non-fork work consistently authored by this account.`,
      contributingSignals: strong.map(r => `${r.name}: ${r.ownership.detail}`),
    }
  }
  if (positive.length > 0) {
    return {
      label: "Moderate authorship evidence",
      detail: `Commit activity on ${positive.map(r => r.name).join(", ")} shows meaningful contribution from this account, though not exclusively original work.`,
      contributingSignals: positive.map(r => `${r.name}: ${r.ownership.detail}`),
    }
  }
  return {
    label: "Limited evidence available",
    detail: "The analyzed repositories did not show strong signals of original, sustained authorship from this account.",
    contributingSignals: repos.map(r => `${r.name}: ${r.ownership?.detail || "No assessment available."}`),
  }
}

// Deliberately never returns "No significant public similarity found" — this
// module never performs a code-content similarity comparison against other
// repositories (that would require cloning/fetching third-party source,
// which this platform has explicitly chosen not to do). Claiming a
// comparison was run and passed would be a fabrication; the honest label
// when nothing suspicious was detected is that comparison evidence is
// insufficient, not that similarity was checked and ruled out.
function deriveOriginalityEvidence(analysis) {
  const repos = analysis?.topRepos || []
  const singleCommitRepos = repos.filter(r => r.ownership?.label === "Insufficient evidence" && !r.isFork && r.firstCommitSignal)
  const unattributedForks = repos.filter(r => r.isFork && r.authorShare && r.authorShare.byConnectedUser === 0)
  const strongOriginal = repos.filter(r => r.ownership?.label === "Strong ownership evidence")

  if (unattributedForks.length > 0) {
    return {
      label: "Similarity signals detected",
      detail: `${unattributedForks.map(r => r.name).join(", ")} ${unattributedForks.length > 1 ? "are forks" : "is a fork"} of another repository with no recently sampled commits from this account — the underlying code is substantially derived from someone else's project.`,
      tone: "caution",
    }
  }
  if (singleCommitRepos.length > 0) {
    return {
      label: "Similarity signals detected",
      detail: `${singleCommitRepos.map(r => r.name).join(", ")} ${singleCommitRepos.length > 1 ? "have" : "has"} only a single commit, which is consistent with a freshly generated template or starter project rather than sustained original development. This is not evidence of copying — only that there isn't enough history to assess originality.`,
      tone: "caution",
    }
  }
  if (strongOriginal.length > 0) {
    return {
      label: "Strong originality evidence",
      detail: `${strongOriginal.map(r => r.name).join(", ")} ${strongOriginal.length > 1 ? "are original, non-fork repositories" : "is an original, non-fork repository"} with commit history consistently authored by this account.`,
      tone: "positive",
    }
  }
  return {
    label: "Insufficient comparison evidence",
    detail: "There is not enough repository history to draw a confident conclusion about originality one way or the other.",
    tone: "neutral",
  }
}

function evidenceState(values) {
  // Three-state, never boolean-as-fact: some repos genuinely couldn't be
  // checked, and "not observed" must stay distinct from "not available".
  if (values.every(v => v === null)) return "not_available"
  return values.some(v => v === true) ? "observed" : "not_observed"
}

function deriveEngineeringPractice(analysis) {
  const repos = analysis?.topRepos || []
  const val = (r, key) => (r.detectionSkipped ? null : !!r[key])
  return {
    testing: evidenceState(repos.map(r => val(r, "hasTestDir"))),
    continuousIntegration: evidenceState(repos.map(r => (r.detectionSkipped ? null : (r.techStack || []).includes("CI/CD (GitHub Actions)")))),
    documentation: evidenceState(repos.map(r => val(r, "hasReadme"))),
  }
}

function deriveContributionConsistency(analysis) {
  const timeline = (analysis?.repoTimeline || []).filter(r => r.pushedAt)
  if (timeline.length === 0) {
    return { label: "Insufficient evidence", detail: "No repository activity history was available to assess." }
  }
  const now = Date.now()
  const monthBuckets = new Set(
    timeline
      .filter(r => (now - new Date(r.pushedAt).getTime()) / (1000 * 60 * 60 * 24) <= 365)
      .map(r => new Date(r.pushedAt).toISOString().slice(0, 7))
  )
  if (monthBuckets.size >= 4) {
    return { label: "Sustained activity", detail: `Repository activity was observed across ${monthBuckets.size} distinct months in the last year, suggesting ongoing engineering work rather than a single burst.` }
  }
  if (monthBuckets.size >= 1) {
    return { label: "Limited recent activity", detail: "Repository activity in the last year is present but concentrated, rather than spread out over time." }
  }
  return { label: "No recent activity observed", detail: "No repository activity was found in the last year based on available data." }
}

function deriveCollaborationEvidence(analysis) {
  const c = analysis?.collaboration
  if (!c || c.skipped) return null
  if (typeof c.pullRequestsAuthored !== "number" || c.pullRequestsAuthored === 0) {
    return { label: "No public pull request activity found", detail: "No public pull requests authored by this account were found on GitHub.", pullRequestsAuthored: 0, mergedPullRequests: 0, distinctRepositories: 0 }
  }
  const label = c.mergedPullRequests > 0
    ? "Evidence of collaboration on external projects"
    : "Pull request activity found, contribution outcome unclear"
  const detail = c.mergedPullRequests > 0
    ? `${c.mergedPullRequests} of ${c.pullRequestsAuthored} public pull request(s) authored by this account across at least ${c.distinctRepositories || 1} project(s) were merged.`
    : `${c.pullRequestsAuthored} public pull request(s) were found, but none are confirmed merged in this analysis.`
  return { label, detail, pullRequestsAuthored: c.pullRequestsAuthored, mergedPullRequests: c.mergedPullRequests, distinctRepositories: c.distinctRepositories }
}

function deriveOverview(analysis, repositoriesAnalyzed) {
  const projectEvidence = deriveProjectEvidence(analysis)
  const meaningfulRepositories = projectEvidence.filter(p => p.authorshipEvidence?.tone === "positive").length
  const authenticityScore = analysis?.fingerprint?.authenticityScore
  const confidence = typeof authenticityScore === "number"
    ? (authenticityScore >= 80 ? "high" : authenticityScore >= 55 ? "moderate" : "low")
    : "low"

  let evidenceStrength = "Insufficient evidence"
  if (meaningfulRepositories >= 2) evidenceStrength = "Strong evidence"
  else if (meaningfulRepositories === 1) evidenceStrength = "Moderate evidence"
  else if (projectEvidence.length > 0) evidenceStrength = "Limited evidence"

  return {
    evidenceStrength,
    confidence,
    repositoriesAnalyzed: repositoriesAnalyzed ?? analysis?.publicRepos ?? null,
    meaningfulRepositories,
    lastAnalyzedAt: analysis?.analyzedAt || null,
    primaryTechnicalAreas: bucketPrimaryTechnicalAreas(analysis),
  }
}

function buildRecruiterSummary({ overview, authorshipEvidence, engineeringPractice }) {
  if (overview.repositoriesAnalyzed === 0 || !authorshipEvidence.contributingSignals?.length && overview.meaningfulRepositories === 0) {
    return "Based on the analyzed GitHub evidence, there is not yet enough public repository activity to draw conclusions about this candidate's engineering work."
  }
  const areas = overview.primaryTechnicalAreas.length ? overview.primaryTechnicalAreas.join(", ") : "a limited range of technologies"
  const practiceNote = engineeringPractice.testing === "observed" || engineeringPractice.continuousIntegration === "observed"
    ? " Evidence of testing and/or CI/CD practices was observed in at least one analyzed repository."
    : ""
  return `Based on the analyzed GitHub evidence, this candidate demonstrates activity in ${areas}, with ${authorshipEvidence.label.toLowerCase()}.${practiceNote}`
}

function buildLimitations({ verification }) {
  const limitations = [
    "Only publicly accessible repositories were analyzed — private repository activity is not included.",
    "GitHub activity can provide strong evidence of engineering work, but it cannot prove complete or exclusive authorship.",
    "Missing evidence for a technology or practice is not proof it wasn't used — it may simply not be visible in public repositories.",
    "Similarity signals reflect patterns worth reviewing, not confirmed copying.",
  ]
  if (verification !== "verified") {
    limitations.push("GitHub account ownership has not been independently verified for this analysis.")
  }
  return limitations
}

/**
 * The single canonical GitHub Evidence Profile, built from a proof_objects
 * row (source='github_code_dna'). Safe to expose to a recruiter or the
 * candidate's own portfolio viewers — never includes bio/avatar/follower
 * count/star counts/raw language byte maps, only evidence-graded summaries.
 * Returns null if no analysis exists yet (never fabricates a report).
 */
export function buildGithubEvidenceProfile(proof) {
  if (!proof?.source_ref?.analysis) return null
  const analysis = proof.source_ref.analysis
  const verified = proof.trust_level === "verified"
  const repositoriesAnalyzed = analysis.publicRepos ?? null

  const technicalFootprint = deriveTechnicalFootprint(analysis)
  const projectEvidence = deriveProjectEvidence(analysis)
  const authorshipEvidence = deriveAuthorshipEvidence(analysis)
  const originalityEvidence = deriveOriginalityEvidence(analysis)
  const engineeringPractice = deriveEngineeringPractice(analysis)
  const contributionConsistency = deriveContributionConsistency(analysis)
  const collaborationEvidence = deriveCollaborationEvidence(analysis)
  const overview = deriveOverview(analysis, repositoriesAnalyzed)

  const ri = proof.source_ref?.repoInterview
  const repoInterview = ri?.evaluation ? {
    verdict: ri.evaluation.overallVerdict || null,
    summary: ri.evaluation.summary || null,
    aiAssessed: true,
  } : null

  return {
    kind: "github_evidence_profile",
    verification: verified ? "Verified (GitHub ownership confirmed)" : "Self-Selected (GitHub ownership unconfirmed)",
    overview,
    technicalFootprint,
    projectEvidence,
    authorshipEvidence,
    originalityEvidence,
    engineeringPractice,
    contributionConsistency,
    collaborationEvidence,
    repoInterview,
    recruiterSummary: buildRecruiterSummary({ overview, authorshipEvidence, engineeringPractice }),
    limitations: buildLimitations({ verification: verified ? "verified" : "unverified" }),
    createdAt: proof.source_ref?.analyzedAt || proof.completed_at || null,
    title: proof.title || null,
  }
}

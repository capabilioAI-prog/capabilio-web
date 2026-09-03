import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { buildGithubEvidenceProfile } from "./evidenceProfile.js"

const FORBIDDEN_PHRASES = [
  "100% verified", "guaranteed original", "definitely copied", "definitely not copied",
  "sole author", "no significant public similarity found", "proves", "candidate copied",
  "candidate committed plagiarism", "definitely ai-generated",
]

function assertNoForbiddenLanguage(obj) {
  const text = JSON.stringify(obj).toLowerCase()
  for (const phrase of FORBIDDEN_PHRASES) {
    assert.ok(!text.includes(phrase), `forbidden phrase "${phrase}" found in evidence profile output`)
  }
}

function baseProof(overrides = {}) {
  return {
    trust_level: "unverified",
    title: "Code DNA — testuser",
    completed_at: "2026-01-01T00:00:00Z",
    source_ref: {
      username: "testuser",
      analyzedAt: "2026-09-03T00:00:00Z",
      scores: { builder: 70, documentation: 60, consistency: 50, techBreadth: 65, tooling: 55 },
      analysis: {
        publicRepos: 3,
        followers: 10,
        languages: [{ lang: "JavaScript", pct: 60 }, { lang: "Python", pct: 40 }],
        fingerprint: { authenticityScore: 75 },
        repoTimeline: [],
        topRepos: [],
        collaboration: { pullRequestsAuthored: null, mergedPullRequests: null, distinctRepositories: null, skipped: true },
        ...overrides.analysis,
      },
      ...overrides.source_ref,
    },
    ...overrides.top,
  }
}

describe("buildGithubEvidenceProfile — never fabricates, never over-claims", () => {
  test("returns null when there is no analysis yet (no GitHub connection)", () => {
    assert.equal(buildGithubEvidenceProfile(null), null)
    assert.equal(buildGithubEvidenceProfile({ source_ref: {} }), null)
  })

  test("zero-repository user gets 'Insufficient evidence', never a fabricated score narrative", () => {
    const proof = baseProof({ analysis: { publicRepos: 0, topRepos: [] } })
    const profile = buildGithubEvidenceProfile(proof)
    assert.equal(profile.overview.evidenceStrength, "Insufficient evidence")
    assert.equal(profile.overview.meaningfulRepositories, 0)
    assert.equal(profile.authorshipEvidence.label, "Insufficient evidence")
    assertNoForbiddenLanguage(profile)
  })

  test("a strong, original (non-fork) repo produces 'Strong ownership evidence' and 'Strong authorship evidence'", () => {
    const proof = baseProof({
      analysis: {
        topRepos: [{
          name: "my-app", url: "https://github.com/testuser/my-app", desc: "A real project",
          techStack: ["Node.js", "CI/CD (GitHub Actions)"], hasReadme: true, hasTestDir: true,
          isFork: false, pushedAtIso: new Date().toISOString(),
          authorShare: { sampledCommits: 5, byConnectedUser: 5 },
          ownership: { label: "Strong ownership evidence", detail: "An original (non-fork) repository where recently sampled commits are all authored by this account.", tone: "positive" },
        }],
      },
    })
    const profile = buildGithubEvidenceProfile(proof)
    assert.equal(profile.authorshipEvidence.label, "Strong authorship evidence")
    assert.equal(profile.originalityEvidence.label, "Strong originality evidence")
    // A single strong repo is "Moderate evidence" overall — the profile-wide
    // "Strong evidence" label requires 2+ meaningfully-strong repositories,
    // matching the research finding that recruiters look for multiple
    // quality signals, not just one.
    assert.equal(profile.overview.evidenceStrength, "Moderate evidence")
    assert.equal(profile.overview.meaningfulRepositories, 1)
    assert.equal(profile.engineeringPractice.testing, "observed")
    assert.equal(profile.engineeringPractice.continuousIntegration, "observed")
    assertNoForbiddenLanguage(profile)
  })

  test("mostly-forks user with zero authored commits produces caution-toned originality evidence, not an accusation", () => {
    const proof = baseProof({
      analysis: {
        topRepos: [{
          name: "forked-lib", url: "https://github.com/testuser/forked-lib", desc: "",
          techStack: [], hasReadme: false, hasTestDir: false, isFork: true, parentFullName: "original/forked-lib",
          pushedAtIso: new Date().toISOString(),
          authorShare: { sampledCommits: 5, byConnectedUser: 0 },
          ownership: { label: "Limited contribution evidence", detail: "This is a fork of original/forked-lib, and none of the most recently sampled commits were authored by this account.", tone: "caution" },
        }],
      },
    })
    const profile = buildGithubEvidenceProfile(proof)
    assert.equal(profile.originalityEvidence.label, "Similarity signals detected")
    assert.equal(profile.originalityEvidence.tone, "caution")
    assert.ok(!profile.originalityEvidence.detail.toLowerCase().includes("copied"))
    assertNoForbiddenLanguage(profile)
  })

  test("a single-commit, non-fork repo is flagged as insufficient template-like evidence, never an accusation of generating it", () => {
    const proof = baseProof({
      analysis: {
        topRepos: [{
          name: "fresh-repo", url: "https://github.com/testuser/fresh-repo", desc: "",
          techStack: [], hasReadme: true, hasTestDir: false, isFork: false,
          pushedAtIso: new Date().toISOString(),
          firstCommitSignal: { linesChanged: 40, filesChanged: 3, isLarge: false },
          ownership: { label: "Insufficient evidence", detail: "This repository has only one commit, which is not enough history to assess original authorship — it may be newly created or generated from a template.", tone: "neutral" },
        }],
      },
    })
    const profile = buildGithubEvidenceProfile(proof)
    assert.equal(profile.originalityEvidence.label, "Similarity signals detected")
    assert.ok(profile.originalityEvidence.detail.includes("not evidence of copying") || profile.originalityEvidence.detail.toLowerCase().includes("not evidence of copying"))
    assertNoForbiddenLanguage(profile)
  })

  test("never claims a similarity check passed when none was performed", () => {
    // A repo with plain positive-but-not-strong evidence should never
    // produce "no significant public similarity found" — that would imply
    // a comparison ran and passed, which never happens in this module.
    const proof = baseProof({
      analysis: {
        topRepos: [{
          name: "ok-repo", url: "https://github.com/testuser/ok-repo", desc: "",
          techStack: [], hasReadme: true, hasTestDir: false, isFork: false,
          pushedAtIso: new Date().toISOString(),
          authorShare: { sampledCommits: 3, byConnectedUser: 2 },
          ownership: { label: "Substantial contributor", detail: "Recent commit history shows meaningful activity.", tone: "positive" },
        }],
      },
    })
    const profile = buildGithubEvidenceProfile(proof)
    assert.notEqual(profile.originalityEvidence.label, "No significant public similarity found")
    assertNoForbiddenLanguage(profile)
  })

  test("collaboration evidence is null (not zero, not fabricated) when the search API was skipped", () => {
    const proof = baseProof({ analysis: { collaboration: { pullRequestsAuthored: null, mergedPullRequests: null, distinctRepositories: null, skipped: true } } })
    const profile = buildGithubEvidenceProfile(proof)
    assert.equal(profile.collaborationEvidence, null)
  })

  test("collaboration evidence with real merged PRs produces a positive, evidence-based label", () => {
    const proof = baseProof({ analysis: { collaboration: { pullRequestsAuthored: 5, mergedPullRequests: 3, distinctRepositories: 2, skipped: false } } })
    const profile = buildGithubEvidenceProfile(proof)
    assert.equal(profile.collaborationEvidence.label, "Evidence of collaboration on external projects")
    assert.equal(profile.collaborationEvidence.mergedPullRequests, 3)
  })

  test("engineering practice distinguishes not_observed from not_available (detectionSkipped)", () => {
    const proof = baseProof({
      analysis: {
        topRepos: [{ name: "skipped-repo", detectionSkipped: true, techStack: [], hasReadme: false, hasTestDir: false, isFork: false, ownership: { label: "Repository activity could not be fully verified", tone: "neutral" } }],
      },
    })
    const profile = buildGithubEvidenceProfile(proof)
    assert.equal(profile.engineeringPractice.testing, "not_available")
    assert.equal(profile.engineeringPractice.documentation, "not_available")
  })

  test("engineering practice reports not_observed (not not_available) when a repo was actually checked and lacked the signal", () => {
    const proof = baseProof({
      analysis: {
        topRepos: [{ name: "checked-repo", detectionSkipped: false, techStack: [], hasReadme: false, hasTestDir: false, isFork: false, pushedAtIso: new Date().toISOString(), ownership: { label: "Insufficient evidence", tone: "neutral" } }],
      },
    })
    const profile = buildGithubEvidenceProfile(proof)
    assert.equal(profile.engineeringPractice.testing, "not_observed")
    assert.equal(profile.engineeringPractice.documentation, "not_observed")
  })

  test("never exposes raw vanity metrics (followers, stars, avatar, bio) at the top level", () => {
    const proof = baseProof({ source_ref: { analysis: { followers: 99999, avatar: "http://x/y.png", bio: "hello world" } } })
    const profile = buildGithubEvidenceProfile(proof)
    const text = JSON.stringify(profile)
    assert.ok(!text.includes("99999"))
    assert.ok(!text.includes("avatar"))
    assert.ok(!text.includes("hello world"))
  })

  test("verification status flows through, and unverified analyses disclose it as a limitation", () => {
    const proof = baseProof({ top: { trust_level: "unverified" } })
    const profile = buildGithubEvidenceProfile(proof)
    assert.equal(profile.verification, "Self-Selected (GitHub ownership unconfirmed)")
    assert.ok(profile.limitations.some(l => l.toLowerCase().includes("not been independently verified")))
  })

  test("verified analyses do not carry the unverified-ownership limitation", () => {
    const proof = baseProof({ top: { trust_level: "verified" } })
    const profile = buildGithubEvidenceProfile(proof)
    assert.equal(profile.verification, "Verified (GitHub ownership confirmed)")
    assert.ok(!profile.limitations.some(l => l.toLowerCase().includes("not been independently verified")))
  })

  test("limitations always include the fixed, standard disclosures", () => {
    const profile = buildGithubEvidenceProfile(baseProof())
    const joined = profile.limitations.join(" ").toLowerCase()
    assert.ok(joined.includes("private"))
    assert.ok(joined.includes("cannot prove"))
    assert.ok(joined.includes("not proof it wasn't used") || joined.includes("not proof"))
  })
})

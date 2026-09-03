import { test } from "node:test"
import assert from "node:assert/strict"
import { buildRecruiterEvidence, buildRecruiterEvidenceView, buildRecruiterEvidenceViewFromProof, buildCodeDnaRecruiterView } from "./recruiterEvidence.js"

test("builds the recruiter evidence shape matching the spec's worked example fields", () => {
  const evidence = buildRecruiterEvidence({
    instance: { skill: "SQL", difficulty: "Hard", industry: "Banking", scenario_id: "fraud-detection" },
    assessment: { final_score: 92 },
    verification: "Verified",
  })
  assert.deepEqual(evidence, {
    skill: "SQL", status: "Completed", scorePct: 92, verification: "Verified",
    difficulty: "Hard", industry: "Banking", scenario: "fraud-detection", skillsDemonstrated: ["SQL"],
  })
})

test("handles null industry/scenario gracefully", () => {
  const evidence = buildRecruiterEvidence({
    instance: { skill: "SQL", difficulty: "Easy", industry: null, scenario_id: null },
    assessment: { final_score: 100 },
    verification: "Verified",
  })
  assert.equal(evidence.industry, null)
  assert.equal(evidence.scenario, null)
})

test("status is always 'Completed' — no artifact is ever created for an in-progress attempt", () => {
  const evidence = buildRecruiterEvidence({ instance: { skill: "SQL", difficulty: "Easy" }, assessment: { final_score: 10 }, verification: "Self-Selected" })
  assert.equal(evidence.status, "Completed")
})

test("buildRecruiterEvidenceView surfaces recruiter_evidence plus artifact-level metadata, not raw column names", () => {
  const artifact = {
    recruiter_evidence: { skill: "SQL", status: "Completed", scorePct: 92, verification: "Verified", difficulty: "Hard", industry: "Banking", scenario: "fraud-detection", skillsDemonstrated: ["SQL"] },
    artifact_type: "code", publish_state: "auto_published", created_at: "2026-01-01T00:00:00Z",
    id: "artifact-1", user_id: "user-1", assessment_id: "assess-1",
  }
  const view = buildRecruiterEvidenceView(artifact)
  assert.equal(view.skill, "SQL")
  assert.equal(view.artifactType, "code")
  assert.equal(view.publishState, "auto_published")
  assert.equal(view.createdAt, "2026-01-01T00:00:00Z")
  assert.equal("user_id" in view, false)
})

test("buildRecruiterEvidenceViewFromProof surfaces AI reviewer evidence (strengths/suggestions/readiness), not just a completion flag", () => {
  const proof = {
    skill: "Machine Learning", score: 82, publish_state: "auto_published",
    difficulty: "Medium", industry: "E-Commerce", skills_demonstrated: ["Python", "Pandas"],
    challenge_type: "domain", completed_at: "2026-07-28T00:00:00Z",
    role: "ML Engineer", title: "ML Engineer — Machine Learning",
    elo_delta: 12, time_taken_secs: 1840,
    validator_result: {
      metadata: {
        strengths: ["Real feature engineering", "Model trained cleanly"],
        suggestions: ["Add a train/test split"],
        taskQuality: "Solid first-pass model.",
        recruiterReadiness: "Recruiter-ready",
        recruiterReadinessNote: "Demonstrates end-to-end ML workflow.",
        criteriaScores: { correctness: 85 },
      },
    },
  }
  const view = buildRecruiterEvidenceViewFromProof(proof)
  assert.equal(view.eloDelta, 12)
  assert.equal(view.timeTakenSecs, 1840)
  assert.deepEqual(view.strengths, ["Real feature engineering", "Model trained cleanly"])
  assert.deepEqual(view.suggestions, ["Add a train/test split"])
  assert.equal(view.recruiterReadiness, "Recruiter-ready")
  assert.equal(view.criteriaScores.correctness, 85)
})

test("buildRecruiterEvidenceViewFromProof degrades gracefully when validator_result has no AI metadata (e.g. ground_truth_compare proofs)", () => {
  const proof = { skill: "SQL", score: 100, publish_state: "auto_published", difficulty: "Medium", skills_demonstrated: ["SQL"], challenge_type: "domain", completed_at: "2026-01-01T00:00:00Z" }
  const view = buildRecruiterEvidenceViewFromProof(proof)
  assert.deepEqual(view.strengths, [])
  assert.equal(view.recruiterReadiness, null)
  assert.equal(view.eloDelta, null)
})

// Regression guard (2026-09-03): buildCodeDnaRecruiterView is now the ONE
// canonical builder both portfolioPublic.js AND routes/partnerBridge.js call
// — partnerBridge.js used to build its own inline object straight from
// proof_objects.source_ref, leaking raw repo names/stars/languages/bio/
// avatar to the external recruiter product. This test locks in that the
// shared builder never does that, regardless of which caller invokes it.
function fakeCodeDnaProof() {
  return {
    trust_level: "verified",
    title: "Code DNA — octocat",
    source_ref: {
      username: "octocat",
      analyzedAt: "2026-09-03T00:00:00Z",
      scores: { builder: 90, documentation: 80, consistency: 70, techBreadth: 60, tooling: 50 },
      analysis: {
        publicRepos: 5,
        followers: 12345,
        avatar: "https://avatars.example/octocat.png",
        bio: "I like tacos",
        languages: [{ lang: "JavaScript", pct: 100 }],
        fingerprint: { authenticityScore: 90 },
        repoTimeline: [],
        collaboration: { skipped: true },
        topRepos: [{
          name: "Spoon-Knife", url: "https://github.com/octocat/Spoon-Knife", desc: "demo repo", stars: 14000,
          techStack: [], hasReadme: true, hasTestDir: false, isFork: false, pushedAtIso: new Date().toISOString(),
          authorShare: { sampledCommits: 3, byConnectedUser: 3 },
          ownership: { label: "Strong ownership evidence", detail: "An original (non-fork) repository...", tone: "positive" },
        }],
      },
    },
  }
}

test("buildCodeDnaRecruiterView delegates to the shared GitHub Evidence Profile builder", () => {
  const view = buildCodeDnaRecruiterView(fakeCodeDnaProof())
  assert.equal(view.kind, "code_dna")
  assert.ok(Array.isArray(view.capabilitySignals))
  assert.ok(view.overview)
  assert.ok(Array.isArray(view.projectEvidence))
  assert.equal(view.verification, "Verified (GitHub ownership confirmed)")
})

test("buildCodeDnaRecruiterView never leaks raw follower count, avatar URL, or bio text", () => {
  const view = buildCodeDnaRecruiterView(fakeCodeDnaProof())
  const text = JSON.stringify(view)
  assert.ok(!text.includes("12345"))
  assert.ok(!text.includes("avatars.example"))
  assert.ok(!text.includes("tacos"))
})

test("buildCodeDnaRecruiterView returns null (not a crash) when the proof has no analysis yet", () => {
  assert.equal(buildCodeDnaRecruiterView({ source_ref: {} }), null)
})

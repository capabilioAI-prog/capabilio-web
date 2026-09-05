import { test } from "node:test"
import assert from "node:assert/strict"
import { validateWorkstationVerificationCompat, ChallengeContentSchema } from "./contentSchema.js"

test("workstation/verification compatibility: coding only accepts test_cases", () => {
  assert.equal(validateWorkstationVerificationCompat({ workstation_type: "coding", verification_type: "test_cases" }).ok, true)
  assert.equal(validateWorkstationVerificationCompat({ workstation_type: "coding", verification_type: "sql_result" }).ok, false)
})

test("workstation/verification compatibility: sql only accepts sql_result", () => {
  assert.equal(validateWorkstationVerificationCompat({ workstation_type: "sql", verification_type: "sql_result" }).ok, true)
  assert.equal(validateWorkstationVerificationCompat({ workstation_type: "sql", verification_type: "rule_based" }).ok, false)
})

test("workstation/verification compatibility: structured_response accepts rule_based or rubric, not test_cases", () => {
  assert.equal(validateWorkstationVerificationCompat({ workstation_type: "structured_response", verification_type: "rule_based" }).ok, true)
  assert.equal(validateWorkstationVerificationCompat({ workstation_type: "structured_response", verification_type: "rubric" }).ok, true)
  assert.equal(validateWorkstationVerificationCompat({ workstation_type: "structured_response", verification_type: "test_cases" }).ok, false)
})

test("schema rejects estimated_minutes outside 3-30 range (spec: short weekly challenges only)", () => {
  const base = {
    competency_area: "Algorithms", skill: "Sorting", challenge_type: "debugging",
    title: "Test title here", scenario: "A realistic scenario with enough length to pass.",
    mission: "Do the thing.", difficulty: "easy", instructions: "Step by step instructions here.",
    workstation_type: "coding", verification_type: "test_cases", verification_definition: {},
  }
  assert.equal(ChallengeContentSchema.safeParse({ ...base, estimated_minutes: 10 }).success, true)
  assert.equal(ChallengeContentSchema.safeParse({ ...base, estimated_minutes: 120 }).success, false)
  assert.equal(ChallengeContentSchema.safeParse({ ...base, estimated_minutes: 1 }).success, false)
})

test("schema rejects an invalid difficulty (no year/role-based tiers allowed)", () => {
  const base = {
    competency_area: "Algorithms", skill: "Sorting", challenge_type: "debugging",
    title: "Test title here", scenario: "A realistic scenario with enough length to pass.",
    mission: "Do the thing.", instructions: "Step by step instructions here.", estimated_minutes: 10,
    workstation_type: "coding", verification_type: "test_cases", verification_definition: {},
  }
  assert.equal(ChallengeContentSchema.safeParse({ ...base, difficulty: "easy" }).success, true)
  assert.equal(ChallengeContentSchema.safeParse({ ...base, difficulty: "hard" }).success, false)
  assert.equal(ChallengeContentSchema.safeParse({ ...base, difficulty: "expert" }).success, false)
})

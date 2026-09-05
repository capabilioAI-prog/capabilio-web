/**
 * arena/contentSchema.js — the structured Challenge Content Contract
 * (spec §29). Both curated seed content and AI-generated content are
 * validated against this same schema before anything is persisted — the
 * AI never gets to return an uncontrolled shape.
 */
import { z } from "zod"

export const CHALLENGE_TYPES = [
  "concept_application", "scenario_analysis", "calculation", "diagnosis",
  "data_interpretation", "debugging", "implementation", "decision_making",
  "design_choice", "investigation", "simulation", "case_analysis",
]

export const WORKSTATION_TYPES = ["coding", "sql", "structured_response", "calculation", "decision", "log_investigation"]
export const VERIFICATION_TYPES = ["test_cases", "sql_result", "numeric_tolerance", "rule_based", "rubric"]
export const DIFFICULTIES = ["easy", "medium"]

// Which (workstation_type, verification_type) pairings are actually
// executable by the verification layer (spec §33, §39 workstation/
// verification compatibility validation). Anything outside this table is
// rejected before it ever reaches a student.
export const WORKSTATION_VERIFICATION_COMPAT = {
  coding: ["test_cases"],
  sql: ["sql_result"],
  calculation: ["numeric_tolerance"],
  structured_response: ["rule_based", "rubric"],
  decision: ["rule_based"],
  log_investigation: ["rule_based", "rubric"],
}

export const ChallengeContentSchema = z.object({
  competency_area: z.string().min(2),
  skill: z.string().min(2),
  challenge_type: z.enum(CHALLENGE_TYPES),
  title: z.string().min(4).max(140),
  scenario: z.string().min(20),
  mission: z.string().min(10),
  learning_objective: z.string().optional().nullable(),
  difficulty: z.enum(DIFFICULTIES),
  estimated_minutes: z.number().int().min(3).max(30),
  instructions: z.string().min(10),
  inputs: z.record(z.string(), z.any()).default({}),
  expected_output: z.record(z.string(), z.any()).default({}),
  workstation_type: z.enum(WORKSTATION_TYPES),
  verification_type: z.enum(VERIFICATION_TYPES),
  verification_definition: z.record(z.string(), z.any()),
  points: z.number().int().min(5).max(50).default(10),
  explanation: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
})

/** Deterministic rules that don't need a model call (spec §33/§39: handle
 *  what can be deterministic before any semantic/AI validation). */
export function validateWorkstationVerificationCompat(content) {
  const allowed = WORKSTATION_VERIFICATION_COMPAT[content.workstation_type] || []
  if (!allowed.includes(content.verification_type)) {
    return { ok: false, reason: `verification_type "${content.verification_type}" is not compatible with workstation_type "${content.workstation_type}"` }
  }
  return { ok: true }
}

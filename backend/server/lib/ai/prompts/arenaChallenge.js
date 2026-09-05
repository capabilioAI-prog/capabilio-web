/**
 * prompts/arenaChallenge.js — the ONE AI generation entry point for the new
 * Arena Common Challenges (spec §36-38). The model only ever produces
 * challenge CONTENT against an application-supplied specification; it
 * never decides stream, mission count, points, or pass/fail — see
 * arena/generation.js and arena/contentValidation.js for what happens to
 * this output before a student ever sees it.
 */
import { registerPrompt } from "./promptManager.js"
import { z } from "../responseValidator.js"
import { CHALLENGE_TYPES, WORKSTATION_TYPES, VERIFICATION_TYPES, DIFFICULTIES } from "../../arena/contentSchema.js"

const ResponseSchema = z.object({
  competency_area: z.string(),
  skill: z.string(),
  challenge_type: z.enum(CHALLENGE_TYPES),
  title: z.string(),
  scenario: z.string(),
  mission: z.string(),
  learning_objective: z.string().optional(),
  difficulty: z.enum(DIFFICULTIES),
  estimated_minutes: z.number(),
  instructions: z.string(),
  inputs: z.record(z.string(), z.any()).optional(),
  expected_output: z.record(z.string(), z.any()).optional(),
  workstation_type: z.enum(WORKSTATION_TYPES),
  verification_type: z.enum(VERIFICATION_TYPES),
  verification_definition: z.record(z.string(), z.any()),
  points: z.number().optional(),
  explanation: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

registerPrompt({
  id: "arena.generateChallenge",
  version: 1,
  owner: "arena",
  description: "Generates one Arena Common Challenge for a specific stream/competency/challenge-type/workstation, per an application-supplied specification. Rejected downstream (contentValidation.js) if it fails schema, semantic-stream, or workstation/verification-compatibility checks.",
  variables: ["streamName", "competencyArea", "skill", "challengeType", "difficulty", "workstationType", "verificationType", "estimatedMinutes", "constraints", "existingTitles"],
  expectedOutputFormat: "JSON matching the Arena Challenge Content Contract (see arena/contentSchema.js)",
  buildMessages: (v) => [{
    role: "user",
    content: `You are writing ONE short assessment challenge for Capabilio Arena — a PROOF environment, not a lesson. A student in the "${v.streamName}" academic stream must be able to genuinely DEMONSTRATE the competency below, not recall a definition.

Specification (all fields are REQUIRED, not suggestions):
- competency_area: "${v.competencyArea}"
- skill being assessed: "${v.skill}"
- challenge_type: "${v.challengeType}"
- difficulty: "${v.difficulty}" (easy or medium only — this is a short weekly challenge, not a project)
- workstation_type: "${v.workstationType}"
- verification_type: "${v.verificationType}"
- estimated_minutes: around ${v.estimatedMinutes} (must be between 3 and 30)

Hard constraints:
- The scenario, mission, and required reasoning must be GENUINELY specific to ${v.streamName} — not a generic task (e.g. a plain SQL SELECT/WHERE query, a generic CRUD form, a renamed inventory lookup) with the stream's name pasted onto table/variable names. A ${v.streamName} expert reading this must recognize real, discipline-specific reasoning, not a costume.
- Must be solvable by a student in a single short session (no multi-day project, no external tools beyond what the workstation provides).
- Must produce evidence that is OBJECTIVELY verifiable by the stated verification_type — do not write a scenario that actually requires human judgment if verification_type is deterministic (test_cases/sql_result/numeric_tolerance/rule_based).
- Must NOT assume professional work experience, a specific employer, or a specific academic year/semester.
- Do not duplicate any of these existing titles in this stream: ${(v.existingTitles || []).join(" | ") || "(none yet)"}.
${v.constraints ? `- ${(v.constraints || []).join("\n- ")}` : ""}

Return ONLY this JSON shape:
{
  "competency_area": "${v.competencyArea}",
  "skill": "${v.skill}",
  "challenge_type": "${v.challengeType}",
  "title": "short, specific, non-generic title",
  "scenario": "2-4 sentences of realistic context genuinely rooted in ${v.streamName}",
  "mission": "1-2 sentences: exactly what the student must do",
  "learning_objective": "1 sentence",
  "difficulty": "${v.difficulty}",
  "estimated_minutes": ${v.estimatedMinutes},
  "instructions": "step-by-step what the student should do in the workstation",
  "inputs": { "...": "any starting data/code/materials the workstation should preload, shaped for workstation_type ${v.workstationType}" },
  "expected_output": { "...": "what a correct response looks like, shaped for verification_type ${v.verificationType}" },
  "workstation_type": "${v.workstationType}",
  "verification_type": "${v.verificationType}",
  "verification_definition": { "...": "the concrete, machine-checkable definition of correctness for verification_type ${v.verificationType} — e.g. test_cases: [{input,expectedOutput}], sql_result: {expectedRows}, numeric_tolerance: {expectedValue,tolerance}, rule_based: {rules:[...]}, rubric: {criteria:[...]}" },
  "points": 10,
  "explanation": "1-3 sentences explaining the correct reasoning, shown to the student after they submit",
  "tags": ["...", "..."]
}`,
  }],
  responseSchema: ResponseSchema,
  defaultOpts: { capability: "generateText", provider: "gemini", fallbackProvider: "groq", maxTokens: 1400, json: true },
})

/**
 * workstationDefaults.js — pure, JSX-free so it's directly unit-testable
 * (node:test can't parse .jsx files). Extracted from Workstation.jsx
 * after a real bug found in visual QA: MissionWorkspace never seeded its
 * response state from the challenge's own `inputs.starterCode`, so every
 * coding/SQL mission's editor started completely blank — including
 * debugging missions whose entire premise is "here is buggy code, fix it."
 */

/**
 * The response state a mission's editor should START with, once its
 * challenge has loaded. Call this exactly once when a challenge first
 * loads; MissionWorkspace seeds its `response` state from this before the
 * student has typed anything.
 */
export function getInitialResponse(challenge) {
  switch (challenge.workstation_type) {
    case "coding":
      return { code: challenge.inputs?.starterCode || "// write your solution, then check the instructions for the expected output\n", language: "javascript" }
    case "sql":
      return { sql: challenge.inputs?.starterCode || "-- write your SQL query\nSELECT " }
    default:
      return {}
  }
}

/**
 * Fallback field set for a structured_response/decision/log_investigation
 * challenge that doesn't declare its own `inputs.responseFields` — keeps
 * every pre-existing rule_based/rubric seed challenge (which only ever
 * defined a single implicit "answer") working unchanged.
 */
export const DEFAULT_RESPONSE_FIELDS = [
  { key: "answer", label: "Your answer", type: "text" },
  { key: "explanation", label: "Your reasoning (optional, used for explanation-graded missions)", type: "textarea" },
]

/**
 * Structured-response field schema for a mission (spec §19 response_schema).
 * A simulation-backed diagnosis mission declares its own fields (e.g.
 * "diagnosis" + "cause" as selects) via `inputs.responseFields`; everything
 * else falls back to the generic answer/reasoning pair.
 */
export function getResponseFields(challenge) {
  const fields = challenge.inputs?.responseFields
  return Array.isArray(fields) && fields.length > 0 ? fields : DEFAULT_RESPONSE_FIELDS
}

/**
 * The single place a structured-response field's value gets written into
 * `response` state — always nested under `answers`, because that's the
 * shape verifyRuleBased/verifyRubric read server-side (response.answers[field]).
 * A prior version of DecisionPanel wrote flat `{answer, explanation}`
 * fields instead, which silently failed EVERY rule_based/rubric mission
 * (response.answers was always `{}`) — found while wiring this schema-
 * driven panel in, not something the old shape could ever have passed.
 */
export function buildAnswerUpdate(value, key, newValue) {
  return { ...value, answers: { ...(value.answers || {}), [key]: newValue } }
}

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

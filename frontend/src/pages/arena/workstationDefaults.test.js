import { test } from "node:test"
import assert from "node:assert/strict"
import { getInitialResponse } from "./workstationDefaults.js"

test("coding challenge with starterCode loads it verbatim as JavaScript", () => {
  const challenge = { workstation_type: "coding", inputs: { starterCode: "function fix() {\n  // buggy\n}\n" } }
  assert.deepEqual(getInitialResponse(challenge), { code: "function fix() {\n  // buggy\n}\n", language: "javascript" })
})

test("coding challenge with no starterCode falls back to a non-empty placeholder", () => {
  const { code, language } = getInitialResponse({ workstation_type: "coding", inputs: {} })
  assert.equal(language, "javascript")
  assert.ok(code.length > 0)
})

test("sql challenge with starterCode loads it verbatim", () => {
  const challenge = { workstation_type: "sql", inputs: { starterCode: "SELECT * FROM orders;" } }
  assert.deepEqual(getInitialResponse(challenge), { sql: "SELECT * FROM orders;" })
})

test("sql challenge with no starterCode falls back to a non-empty placeholder", () => {
  const { sql } = getInitialResponse({ workstation_type: "sql", inputs: {} })
  assert.ok(sql.length > 0)
})

test("non-code workstation types (calculation, decision, structured_response, log_investigation) return an empty object", () => {
  for (const workstation_type of ["calculation", "decision", "structured_response", "log_investigation"]) {
    assert.deepEqual(getInitialResponse({ workstation_type, inputs: {} }), {})
  }
})

test("missing inputs entirely does not throw (optional chaining guard)", () => {
  assert.doesNotThrow(() => getInitialResponse({ workstation_type: "coding" }))
  assert.doesNotThrow(() => getInitialResponse({ workstation_type: "sql" }))
})

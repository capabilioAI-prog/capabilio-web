import { test } from "node:test"
import assert from "node:assert/strict"
import { getInitialResponse, getResponseFields, DEFAULT_RESPONSE_FIELDS, buildAnswerUpdate } from "./workstationDefaults.js"

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

test("getResponseFields falls back to the generic answer/reasoning pair when a challenge declares no responseFields", () => {
  assert.deepEqual(getResponseFields({ inputs: {} }), DEFAULT_RESPONSE_FIELDS)
  assert.deepEqual(getResponseFields({ inputs: { responseFields: [] } }), DEFAULT_RESPONSE_FIELDS)
  assert.deepEqual(getResponseFields({}), DEFAULT_RESPONSE_FIELDS)
})

test("getResponseFields returns a challenge's own declared fields when present", () => {
  const fields = [{ key: "diagnosis", label: "What is wrong?", type: "select", options: ["A", "B"] }]
  assert.deepEqual(getResponseFields({ inputs: { responseFields: fields } }), fields)
})

test("buildAnswerUpdate nests the value under answers, matching what the backend verifier reads (response.answers[field])", () => {
  const next = buildAnswerUpdate({}, "diagnosis", "Amplitude clipping")
  assert.deepEqual(next, { answers: { diagnosis: "Amplitude clipping" } })
})

test("buildAnswerUpdate preserves other already-answered fields and other response keys", () => {
  const prior = { code: "unrelated", answers: { diagnosis: "A" } }
  const next = buildAnswerUpdate(prior, "cause", "Sensor gain")
  assert.deepEqual(next, { code: "unrelated", answers: { diagnosis: "A", cause: "Sensor gain" } })
})

/**
 * contentValidation.test.js — proves the pipeline that stands between AI
 * (or seed) content and a student: schema, semantic-stream (the "generic
 * renamed task" rejection from spec §14/§39), workstation/verification
 * compatibility, and duplicate detection. Uses the codebase's existing
 * globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ hook (backend/server/lib/
 * supabase.js) so no real Supabase project is touched.
 */
import { test, before, after } from "node:test"
import assert from "node:assert/strict"

function makeFakeSupabase({ existingFingerprints = [] } = {}) {
  function chain(table) {
    const state = { table, filters: {} }
    const api = {
      select() { return api },
      eq(col, val) { state.filters[col] = val; return api },
      neq() { return api },
      limit() { return api },
      then(resolve) {
        if (table === "arena_challenges") {
          const hit = existingFingerprints.includes(state.filters.content_fingerprint)
          return resolve({ data: hit ? [{ id: "existing-id" }] : [], error: null })
        }
        return resolve({ data: [], error: null })
      },
    }
    return api
  }
  return { from: (table) => chain(table) }
}

const STREAM_ID = "11111111-1111-1111-1111-111111111111"

let validateChallengeContent

before(async () => {
  globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ = makeFakeSupabase()
  ;({ validateChallengeContent } = await import("./contentValidation.js"))
})

after(() => {
  delete globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__
})

const validCseContent = {
  competency_area: "Algorithms",
  skill: "Binary Search",
  challenge_type: "debugging",
  title: "Fix an off-by-one bug in binary search",
  scenario: "A binary search implementation has an off-by-one bug in its loop bounds causing incorrect results on sorted arrays.",
  mission: "Fix the algorithm and verify correctness.",
  difficulty: "easy",
  estimated_minutes: 10,
  instructions: "Correct the loop bounds and midpoint update.",
  workstation_type: "coding",
  verification_type: "test_cases",
  verification_definition: { testCases: [{ expectedStdout: "3" }] },
}

test("rejects malformed content at the schema stage", async () => {
  const result = await validateChallengeContent({ title: "x" }, { streamId: STREAM_ID, streamSlug: "cse" })
  assert.equal(result.ok, false)
  assert.equal(result.stage, "schema")
})

test("rejects a generic renamed task that has no discipline vocabulary (spec §14/§39)", async () => {
  const genericRenamed = {
    competency_area: "Algorithms",
    skill: "SQL",
    challenge_type: "data_interpretation",
    title: "ECE Customer Database",
    scenario: "The 'circuits' table has columns id, name, status. Write a query that returns the id and name for every circuit with status active.",
    mission: "Write a SQL query against the circuits table.",
    difficulty: "easy",
    estimated_minutes: 10,
    instructions: "Filter the table.",
    workstation_type: "sql",
    verification_type: "sql_result",
    verification_definition: { dataset: {}, expectedResult: {} },
  }
  const result = await validateChallengeContent(genericRenamed, { streamId: STREAM_ID, streamSlug: "ece" })
  assert.equal(result.ok, false)
  assert.equal(result.stage, "semantic_stream")
})

test("rejects a competency_area that does not belong to the target stream", async () => {
  const wrongArea = { ...validCseContent, competency_area: "Power Systems" } // an EEE area, not CSE
  const result = await validateChallengeContent(wrongArea, { streamId: STREAM_ID, streamSlug: "cse" })
  assert.equal(result.ok, false)
  assert.equal(result.stage, "semantic_stream")
})

test("rejects an incompatible workstation/verification pairing", async () => {
  const incompatible = { ...validCseContent, workstation_type: "sql", verification_type: "test_cases" }
  const result = await validateChallengeContent(incompatible, { streamId: STREAM_ID, streamSlug: "cse" })
  assert.equal(result.ok, false)
  assert.equal(result.stage, "workstation_verification_compat")
})

test("accepts genuinely valid, stream-specific content and returns a stable fingerprint", async () => {
  const result = await validateChallengeContent(validCseContent, { streamId: STREAM_ID, streamSlug: "cse" })
  assert.equal(result.ok, true)
  assert.equal(typeof result.fingerprint, "string")
  assert.ok(result.fingerprint.length > 0)
})

test("rejects duplicate content (same normalized title/scenario/mission)", async () => {
  const { computeContentFingerprint } = await import("./contentValidation.js")
  const fp = computeContentFingerprint(validCseContent)
  globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ = makeFakeSupabase({ existingFingerprints: [fp] })
  const result = await validateChallengeContent(validCseContent, { streamId: STREAM_ID, streamSlug: "cse" })
  assert.equal(result.ok, false)
  assert.equal(result.stage, "duplicate")
})

// ─── Hard product rule: non-IT streams require a real simulation (spec §45) ───

const eceTextOnlyContent = {
  competency_area: "Signals",
  skill: "Waveform Reading",
  challenge_type: "diagnosis",
  title: "Read the Oscilloscope Trace",
  scenario: "A sensor's waveform was captured on an oscilloscope for review.",
  mission: "State what is wrong with the captured signal.",
  difficulty: "easy",
  estimated_minutes: 8,
  instructions: "Answer using the scenario above.",
  workstation_type: "structured_response",
  verification_type: "rule_based",
  verification_definition: { rules: [{ field: "answer", equals: "clipping" }] }, // no `simulation` key at all
}

test("rejects a non-IT (ece) challenge with simulation_type: null — plain text/answer-only is not eligible", async () => {
  globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ = makeFakeSupabase()
  const result = await validateChallengeContent({ ...eceTextOnlyContent, simulation_type: null }, { streamId: STREAM_ID, streamSlug: "ece" })
  assert.equal(result.ok, false)
  assert.equal(result.stage, "simulation_required")
})

test("rejects a non-IT (ece) challenge with a declared simulation_type but an empty simulation_config", async () => {
  globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ = makeFakeSupabase()
  const content = { ...eceTextOnlyContent, simulation_type: "waveform_lab", verification_definition: { simulation: {}, rules: [{ field: "answer", equals: "x" }] } }
  const result = await validateChallengeContent(content, { streamId: STREAM_ID, streamSlug: "ece" })
  assert.equal(result.ok, false)
  assert.equal(result.stage, "simulation_required")
})

test("rejects a non-IT (ece) challenge declaring an unknown simulation_type", async () => {
  globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ = makeFakeSupabase()
  const content = { ...eceTextOnlyContent, simulation_type: "foo_lab" }
  const result = await validateChallengeContent(content, { streamId: STREAM_ID, streamSlug: "ece" })
  assert.equal(result.ok, false)
  assert.equal(result.stage, "simulation_compat")
})

test("rejects a non-IT (ece) challenge whose simulation_config has a renderer but no meaningful interaction fields (spec §45)", async () => {
  globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ = makeFakeSupabase()
  // A renderer exists for waveform_lab, but this config declares neither
  // channel — the generator would silently default both (it's defensive
  // against malformed AI output), so "does it throw" can't catch this;
  // requiredConfigKeys is the explicit floor that does.
  const content = { ...eceTextOnlyContent, simulation_type: "waveform_lab", verification_definition: { simulation: { notAChannel: true }, rules: [{ field: "answer", equals: "x" }] } }
  const result = await validateChallengeContent(content, { streamId: STREAM_ID, streamSlug: "ece" })
  assert.equal(result.ok, false)
  assert.equal(result.stage, "simulation_required")
})

test("accepts a genuinely valid ECE simulation challenge (real simulation_type + working config)", async () => {
  globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ = makeFakeSupabase()
  const content = {
    ...eceTextOnlyContent,
    simulation_type: "waveform_lab",
    verification_definition: {
      simulation: {
        sampleCount: 50, durationMs: 20, seed: 1,
        channel1: { frequencyHz: 500, amplitude: 1 },
        channel2: { frequencyHz: 500, amplitude: 1, anomaly: { type: "amplitude_clipping", severity: 0.5 } },
      },
      rules: [{ field: "diagnosis", equals: "Amplitude clipping" }],
    },
  }
  const result = await validateChallengeContent(content, { streamId: STREAM_ID, streamSlug: "ece" })
  assert.equal(result.ok, true)
})

test("does NOT require a simulation_type for IT/computing streams (cse) — a valid coding challenge still passes", async () => {
  globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ = makeFakeSupabase()
  const result = await validateChallengeContent(validCseContent, { streamId: STREAM_ID, streamSlug: "cse" })
  assert.equal(result.ok, true)
})

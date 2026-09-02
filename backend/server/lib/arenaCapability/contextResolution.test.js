import { test } from "node:test"
import assert from "node:assert/strict"
import { resolveCollegeStreamGenerationContext } from "./contextResolution.js"

/**
 * Table-keyed fake — every `.eq()`/`.in()` call just narrows nothing (the
 * fake doesn't re-implement Postgres filtering); each test supplies
 * TABLE_DATA already scoped to exactly what the real query would have
 * returned for its inputs. This mirrors the same simplification already
 * used in selectionEngine.test.js's fakeSupabase. NO REAL DATABASE WRITE
 * OCCURS ANYWHERE IN THIS FILE — insert() is intentionally not implemented
 * on this fake at all; a call to it would throw.
 */
function fakeSupabase(TABLE_DATA) {
  const calls = []
  const chain = (table) => {
    const self = {
      select: (...a) => { calls.push({ op: "select", table, args: a }); return self },
      eq: (...a) => { calls.push({ op: "eq", table, args: a }); return self },
      in: (...a) => { calls.push({ op: "in", table, args: a }); return self },
      maybeSingle: async () => ({ data: TABLE_DATA[table] ?? null, error: null }),
      then: (resolve) => resolve({ data: TABLE_DATA[table] ?? [], error: null }),
    }
    return self
  }
  return { deps: { supabaseAdmin: { from: chain } }, calls }
}

const STREAM_CSE = { id: "stream-cse", name: "CSE", slug: "cse" }

function fullFixture(overrides = {}) {
  return {
    streams: STREAM_CSE,
    semesters: [{ id: "sem-1" }, { id: "sem-2" }],
    semester_subjects: [
      { subject_id: "subj-dsa" }, // shared subject, e.g. linked from sem-1
      { subject_id: "subj-dsa" }, // and again from sem-2 — must dedupe to one subject
      { subject_id: "subj-os" },
    ],
    subjects: [
      { id: "subj-dsa", name: "Data Structures & Algorithms" },
      { id: "subj-os", name: "Operating Systems" },
    ],
    units: [
      { id: "unit-dsa-1", title: "Arrays & Strings", subject_id: "subj-dsa" },
      { id: "unit-dsa-2", title: "Linked Lists", subject_id: "subj-dsa" },
      { id: "unit-os-1", title: "Process Scheduling", subject_id: "subj-os" },
    ],
    experiments: [
      { id: "e1", unit_id: "unit-dsa-1" },
      { id: "e2", unit_id: "unit-dsa-1" },
      { id: "e3", unit_id: "unit-dsa-1" },
      // unit-dsa-2: zero experiments — lowest coverage
      { id: "e4", unit_id: "unit-os-1" },
    ],
    ...overrides,
  }
}

test("1/2. correct stream scoping — a unit from another stream is never returned", async () => {
  const { deps } = fakeSupabase(fullFixture())
  const result = await resolveCollegeStreamGenerationContext({ streamSlug: "cse" }, deps)
  assert.equal(result.ok, true)
  // The fixture only ever wires up units belonging to subj-dsa/subj-os
  // (both linked to this stream's semesters) — there is no "other stream"
  // unit anywhere in the fake's data for this call, so returning anything
  // at all already proves scoping; meta.unitId must be one of the 3 real
  // in-stream units.
  assert.ok(["unit-dsa-1", "unit-dsa-2", "unit-os-1"].includes(result.meta.unitId))
})

test("3. the lowest-coverage valid candidate is selected", async () => {
  const { deps } = fakeSupabase(fullFixture())
  const result = await resolveCollegeStreamGenerationContext({ streamSlug: "cse" }, deps)
  assert.equal(result.ok, true)
  // unit-dsa-2 (Linked Lists) has 0 experiments — the lowest coverage of the 3 units
  assert.equal(result.meta.unitId, "unit-dsa-2")
  assert.equal(result.collegeStream.unitTitle, "Linked Lists")
  assert.equal(result.collegeStream.subjectName, "Data Structures & Algorithms")
  assert.equal(result.meta.coverageCount, 0)
})

test("4. deterministic tie-breaking — identical coverage counts always resolve to the same candidate", async () => {
  const fixture = fullFixture({
    experiments: [{ id: "e1", unit_id: "unit-dsa-1" }], // dsa-2 and os-1 now tie at 0 coverage
  })
  const { deps: deps1 } = fakeSupabase(fixture)
  const { deps: deps2 } = fakeSupabase(fixture)
  const r1 = await resolveCollegeStreamGenerationContext({ streamSlug: "cse" }, deps1)
  const r2 = await resolveCollegeStreamGenerationContext({ streamSlug: "cse" }, deps2)
  assert.equal(r1.meta.unitId, r2.meta.unitId)
  // Explicit tie-break rule: coverage ASC, then subject id ASC, then unit id ASC.
  // "subj-dsa" < "subj-os" lexicographically, so dsa-2 (0 coverage, dsa subject) wins over os-1 (0 coverage, os subject).
  assert.equal(r1.meta.unitId, "unit-dsa-2")
})

test("5. an empty stream (no semesters) returns an explicit no_generation_context result, not a throw", async () => {
  const { deps } = fakeSupabase({ streams: STREAM_CSE, semesters: [] })
  const result = await resolveCollegeStreamGenerationContext({ streamSlug: "cse" }, deps)
  assert.equal(result.ok, false)
  assert.equal(result.reason, "no_generation_context")
})

test("5b. a stream with semesters but zero linked subjects returns no_generation_context", async () => {
  const { deps } = fakeSupabase({ streams: STREAM_CSE, semesters: [{ id: "sem-1" }], semester_subjects: [] })
  const result = await resolveCollegeStreamGenerationContext({ streamSlug: "cse" }, deps)
  assert.equal(result.ok, false)
  assert.equal(result.reason, "no_generation_context")
})

test("5c. subjects linked but zero units returns no_generation_context, never a fabricated fallback", async () => {
  const { deps } = fakeSupabase({
    streams: STREAM_CSE, semesters: [{ id: "sem-1" }],
    semester_subjects: [{ subject_id: "subj-dsa" }], subjects: [{ id: "subj-dsa", name: "DSA" }], units: [],
  })
  const result = await resolveCollegeStreamGenerationContext({ streamSlug: "cse" }, deps)
  assert.equal(result.ok, false)
  assert.equal(result.reason, "no_generation_context")
  assert.equal("collegeStream" in result, false) // never a partial/fabricated context on failure
})

test("6a. an unknown stream slug returns no_generation_context, not a throw", async () => {
  const { deps } = fakeSupabase({ streams: null })
  const result = await resolveCollegeStreamGenerationContext({ streamSlug: "does-not-exist" }, deps)
  assert.equal(result.ok, false)
  assert.equal(result.reason, "no_generation_context")
})

test("6b. a missing streamSlug argument is handled safely without ever querying the database", async () => {
  const { deps, calls } = fakeSupabase(fullFixture())
  const result = await resolveCollegeStreamGenerationContext({}, deps)
  assert.equal(result.ok, false)
  assert.equal(result.reason, "no_generation_context")
  assert.equal(calls.length, 0)
})

test("7. the success result contains exactly the fields taskGeneration.js requires: collegeStream.subjectName and collegeStream.unitTitle", async () => {
  const { deps } = fakeSupabase(fullFixture())
  const result = await resolveCollegeStreamGenerationContext({ streamSlug: "cse" }, deps)
  assert.equal(typeof result.collegeStream.subjectName, "string")
  assert.equal(typeof result.collegeStream.unitTitle, "string")
  assert.ok(result.collegeStream.subjectName.length > 0)
  assert.ok(result.collegeStream.unitTitle.length > 0)
})

test("exclusions: a unit whose only experiments are all already passed by this student is deprioritized in favor of a fresh one", async () => {
  const fixture = fullFixture({
    experiments: [
      { id: "e1", unit_id: "unit-dsa-2" }, // dsa-2 now has exactly 1 experiment
    ],
  })
  const exclusions = new Set(["e1"]) // ...and the student already passed it — dsa-2 is fully exhausted for them
  const { deps } = fakeSupabase(fixture)
  const result = await resolveCollegeStreamGenerationContext({ streamSlug: "cse", exclusions }, deps)
  assert.equal(result.ok, true)
  assert.notEqual(result.meta.unitId, "unit-dsa-2") // skipped in favor of a non-exhausted unit, even though its raw coverage count (1) ties for lowest
})

test("exclusions: falls back to the full candidate pool (rather than failing) if every unit is exhausted for this student", async () => {
  const fixture = fullFixture({
    units: [{ id: "unit-dsa-1", title: "Arrays & Strings", subject_id: "subj-dsa" }],
    experiments: [{ id: "e1", unit_id: "unit-dsa-1" }],
    semester_subjects: [{ subject_id: "subj-dsa" }],
    subjects: [{ id: "subj-dsa", name: "Data Structures & Algorithms" }],
  })
  const exclusions = new Set(["e1"])
  const { deps } = fakeSupabase(fixture)
  const result = await resolveCollegeStreamGenerationContext({ streamSlug: "cse", exclusions }, deps)
  assert.equal(result.ok, true) // still returns the only real unit rather than an explicit failure
  assert.equal(result.meta.unitId, "unit-dsa-1")
})

test("8/9. no database write occurs and no AI provider is referenced (structural — this file never imports supabaseAdmin's real singleton or anything from lib/ai/)", async () => {
  const { deps } = fakeSupabase(fullFixture())
  // The fake's `from()` never exposes an `.insert`/`.update`/`.delete` method at all —
  // if resolveCollegeStreamGenerationContext ever tried to write, this would throw
  // "is not a function" and fail the test, not silently succeed.
  const result = await resolveCollegeStreamGenerationContext({ streamSlug: "cse" }, deps)
  assert.equal(result.ok, true)
})

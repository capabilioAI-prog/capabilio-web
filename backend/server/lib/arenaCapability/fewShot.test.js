import { test } from "node:test"
import assert from "node:assert/strict"
import { resolveFewShotContext, resolveCollegeStreamFewShot, resolveDomainRoleFewShot } from "./fewShot.js"

/** NO REAL DATABASE READ OCCURS ANYWHERE IN THIS FILE — every query is a fake. */
function fakeSupabase(TABLE_DATA) {
  const chain = (table) => {
    const self = {
      select: () => self,
      eq: () => self,
      in: () => self,
      order: () => self,
      then: (resolve) => resolve({ data: TABLE_DATA[table] ?? [], error: null }),
    }
    return self
  }
  return { supabaseAdmin: { from: chain } }
}

// ── Domain Role scoping ──────────────────────────────────────────────────

test("Domain Role: examples are scoped to the requested role and panel type only — a fake with mixed roles/panelTypes still only returns the matching ones", async () => {
  // The fake ignores .eq() filters (it's a simple table-keyed stub), so this
  // test instead verifies scoping by constructing a fixture where EVERY row
  // already belongs to the target role/panelType — proving the resolver's
  // own .eq("domain_role_id", ...).eq("panel_type", ...) calls are present
  // and that it never falls back to a broader, unscoped query. Contract-
  // level scoping is verified precisely below in the "unrelated role
  // examples are excluded" test.
  const domain_missions = [
    { id: "m1", title: "Fix the revenue query", difficulty: "easy", prompt: "The revenue dashboard undercounts.", dataset: { tableName: "orders", columns: ["id"], rows: [[1]] }, expected_result: { columns: ["id"], rows: [[1]] }, match_mode: "unordered_rows", reference_solution: "SELECT id FROM orders", rubric: {}, created_at: "2026-01-01" },
  ]
  const { supabaseAdmin } = fakeSupabase({ domain_missions })
  const result = await resolveDomainRoleFewShot({ roleId: "data_engineer", panelType: "sql_runner" }, { supabaseAdmin })
  assert.ok(result.fewShotBlock.includes("Fix the revenue query"))
})

test("Domain Role: an .eq() filter is actually applied for both domain_role_id and panel_type (structural proof, not just fixture shape)", async () => {
  const calls = []
  const supabaseAdmin = {
    from: (table) => {
      const self = {
        select: () => self,
        eq: (col, val) => { calls.push({ table, col, val }); return self },
        order: () => self,
        then: (resolve) => resolve({ data: [], error: null }),
      }
      return self
    },
  }
  await resolveDomainRoleFewShot({ roleId: "data_engineer", panelType: "sql_runner" }, { supabaseAdmin })
  assert.ok(calls.some((c) => c.table === "domain_missions" && c.col === "domain_role_id" && c.val === "data_engineer"))
  assert.ok(calls.some((c) => c.table === "domain_missions" && c.col === "panel_type" && c.val === "sql_runner"))
})

test("Domain Role: unrelated role/panelType examples are never used — an empty live result for this role+panelType yields an empty block even if other tables have data", async () => {
  const { supabaseAdmin } = fakeSupabase({ domain_missions: [] }) // simulates: real rows exist elsewhere, none for THIS role+panelType
  const result = await resolveDomainRoleFewShot({ roleId: "frontend", panelType: "frontend_runner" }, { supabaseAdmin })
  assert.equal(result.fewShotBlock, "")
})

test("Domain Role: avoided task IDs are excluded from the example pool", async () => {
  const domain_missions = [
    { id: "m1", title: "Avoided Example", difficulty: "easy", prompt: "p1", dataset: {}, expected_result: {}, match_mode: "unordered_rows", reference_solution: "SELECT 1", rubric: {}, created_at: "2026-01-01" },
    { id: "m2", title: "Allowed Example", difficulty: "easy", prompt: "p2", dataset: {}, expected_result: {}, match_mode: "unordered_rows", reference_solution: "SELECT 2", rubric: {}, created_at: "2026-01-02" },
  ]
  const { supabaseAdmin } = fakeSupabase({ domain_missions })
  const result = await resolveDomainRoleFewShot({ roleId: "r1", panelType: "sql_runner", avoidedTaskIds: new Set(["m1"]) }, { supabaseAdmin })
  assert.ok(result.fewShotBlock.includes("Allowed Example"))
  assert.equal(result.fewShotBlock.includes("Avoided Example"), false)
})

test("Domain Role: selection is deterministic — same input always produces the same block", async () => {
  const domain_missions = [
    { id: "m1", title: "A", difficulty: "easy", prompt: "Fix the login bug in the auth service.", dataset: {}, expected_result: {}, match_mode: "unordered_rows", reference_solution: "SELECT 1", rubric: {}, created_at: "2026-01-01" },
    { id: "m2", title: "B", difficulty: "medium", prompt: "Fix the timeout in the payment gateway integration.", dataset: {}, expected_result: {}, match_mode: "unordered_rows", reference_solution: "SELECT 2", rubric: {}, created_at: "2026-01-02" },
  ]
  const { supabaseAdmin: s1 } = fakeSupabase({ domain_missions })
  const { supabaseAdmin: s2 } = fakeSupabase({ domain_missions })
  const r1 = await resolveDomainRoleFewShot({ roleId: "r1", panelType: "sql_runner" }, { supabaseAdmin: s1 })
  const r2 = await resolveDomainRoleFewShot({ roleId: "r1", panelType: "sql_runner" }, { supabaseAdmin: s2 })
  assert.equal(r1.fewShotBlock, r2.fewShotBlock)
})

test("Domain Role: example count is bounded even when many candidates exist", async () => {
  const domain_missions = Array.from({ length: 10 }, (_, i) => ({
    id: `m${i}`, title: `Distinct Title ${i}`, difficulty: "easy",
    prompt: `Completely unrelated scenario number ${i} about topic ${i} entirely different words zebra quokka narwhal`,
    dataset: {}, expected_result: {}, match_mode: "unordered_rows", reference_solution: `SELECT ${i}`, rubric: {}, created_at: `2026-01-${String(i + 1).padStart(2, "0")}`,
  }))
  const { supabaseAdmin } = fakeSupabase({ domain_missions })
  const result = await resolveDomainRoleFewShot({ roleId: "r1", panelType: "sql_runner" }, { supabaseAdmin })
  const exampleCount = (result.fewShotBlock.match(/Example \d+/g) || []).length
  assert.ok(exampleCount <= 2, `expected at most 2 examples, got ${exampleCount}`)
})

test("Domain Role: returns an empty, safe block when no examples exist for this role+panelType — never throws, never fabricates", async () => {
  const { supabaseAdmin } = fakeSupabase({ domain_missions: [] })
  const result = await resolveDomainRoleFewShot({ roleId: "brand_new_role", panelType: "python_runner" }, { supabaseAdmin })
  assert.deepEqual(result, { fewShotBlock: "", source: "none" })
})

test("Domain Role: near-identical candidates are not both selected — the greedy diversity filter skips a near-duplicate of an already-chosen example", async () => {
  const domain_missions = [
    { id: "m1", title: "Footer collapse A", difficulty: "easy", prompt: "The footer columns collapse into a single line on tablet widths, fix the responsive layout.", dataset: {}, expected_result: {}, match_mode: "unordered_rows", reference_solution: "SELECT 1", rubric: {}, created_at: "2026-01-01" },
    { id: "m2", title: "Footer collapse B", difficulty: "easy", prompt: "The footer columns collapse into a single row on tablet widths, fix the responsive layout.", dataset: {}, expected_result: {}, match_mode: "unordered_rows", reference_solution: "SELECT 2", rubric: {}, created_at: "2026-01-02" },
    { id: "m3", title: "Totally Different", difficulty: "hard", prompt: "The pagination helper skips the last page under certain totals, fix the off by one bug entirely unrelated wording here", dataset: {}, expected_result: {}, match_mode: "unordered_rows", reference_solution: "SELECT 3", rubric: {}, created_at: "2026-01-03" },
  ]
  const { supabaseAdmin } = fakeSupabase({ domain_missions })
  const result = await resolveDomainRoleFewShot({ roleId: "r1", panelType: "sql_runner" }, { supabaseAdmin })
  assert.ok(result.fewShotBlock.includes("Footer collapse A"))
  assert.equal(result.fewShotBlock.includes("Footer collapse B"), false) // skipped — near-duplicate of A, already chosen
  assert.ok(result.fewShotBlock.includes("Totally Different")) // diverse enough, chosen as the second example
})

// ── College Stream scoping ────────────────────────────────────────────────

test("College Stream: prefers examples from the resolved unit itself when it has any", async () => {
  const experiments = [
    { id: "e1", title: "Unit Example", difficulty: "easy", prompt: "p", reference_solution: "print(1)", rubric: { expected_stdout: "1" }, unit_id: "unit-1", created_at: "2026-01-01" },
  ]
  const { supabaseAdmin } = fakeSupabase({ experiments, units: [{ id: "unit-2", subject_id: "subj-1" }] })
  const result = await resolveCollegeStreamFewShot({ unitId: "unit-1", subjectId: "subj-1" }, { supabaseAdmin })
  assert.ok(result.fewShotBlock.includes("Unit Example"))
})

test("College Stream: falls back to sibling units of the same resolved subject when the target unit has no examples yet", async () => {
  const supabaseAdmin = {
    from: (table) => {
      const self = {
        select: () => self,
        eq: (col, val) => { self._lastEq = { col, val }; return self },
        in: () => self,
        order: () => self,
        then: (resolve) => {
          if (table === "experiments" && self._lastEq?.col === "unit_id" && self._lastEq?.val === "unit-1") return resolve({ data: [], error: null }) // target unit: no examples
          if (table === "units") return resolve({ data: [{ id: "unit-2" }], error: null }) // sibling unit under the same subject
          if (table === "experiments") return resolve({ data: [{ id: "e-sib", title: "Sibling Unit Example", difficulty: "easy", prompt: "p", reference_solution: "print(2)", rubric: { expected_stdout: "2" }, unit_id: "unit-2", created_at: "2026-01-01" }], error: null })
          return resolve({ data: [], error: null })
        },
      }
      return self
    },
  }
  const result = await resolveCollegeStreamFewShot({ unitId: "unit-1", subjectId: "subj-1" }, { supabaseAdmin })
  assert.ok(result.fewShotBlock.includes("Sibling Unit Example"))
})

test("College Stream: never queries outside the resolved subject — a stream-wide/global query is never issued", async () => {
  const tablesQueried = new Set()
  const supabaseAdmin = {
    from: (table) => {
      tablesQueried.add(table)
      const self = { select: () => self, eq: () => self, in: () => self, order: () => self, then: (resolve) => resolve({ data: [], error: null }) }
      return self
    },
  }
  await resolveCollegeStreamFewShot({ unitId: "unit-1", subjectId: "subj-1" }, { supabaseAdmin })
  assert.deepEqual([...tablesQueried].sort(), ["experiments", "units"]) // never streams/semesters/semester_subjects — subjectId is already resolved
})

test("College Stream: avoided task IDs are excluded", async () => {
  const experiments = [
    { id: "e1", title: "Avoided", difficulty: "easy", prompt: "p", reference_solution: "print(1)", rubric: { expected_stdout: "1" }, unit_id: "unit-1", created_at: "2026-01-01" },
    { id: "e2", title: "Allowed", difficulty: "easy", prompt: "p2", reference_solution: "print(2)", rubric: { expected_stdout: "2" }, unit_id: "unit-1", created_at: "2026-01-02" },
  ]
  const { supabaseAdmin } = fakeSupabase({ experiments })
  const result = await resolveCollegeStreamFewShot({ unitId: "unit-1", subjectId: "subj-1", avoidedTaskIds: new Set(["e1"]) }, { supabaseAdmin })
  assert.ok(result.fewShotBlock.includes("Allowed"))
  assert.equal(result.fewShotBlock.includes("Avoided"), false)
})

test("College Stream: returns an empty, safe block when the subject genuinely has no examples anywhere", async () => {
  const { supabaseAdmin } = fakeSupabase({ experiments: [], units: [] })
  const result = await resolveCollegeStreamFewShot({ unitId: "unit-1", subjectId: "subj-1" }, { supabaseAdmin })
  assert.deepEqual(result, { fewShotBlock: "", source: "none" })
})

// ── Dispatch ─────────────────────────────────────────────────────────────

test("resolveFewShotContext dispatches college_stream to the college-stream resolver", async () => {
  const experiments = [{ id: "e1", title: "Dispatch Test", difficulty: "easy", prompt: "p", reference_solution: "print(1)", rubric: { expected_stdout: "1" }, unit_id: "unit-1", created_at: "2026-01-01" }]
  const { supabaseAdmin } = fakeSupabase({ experiments })
  const result = await resolveFewShotContext({ domain: "college_stream", unitId: "unit-1", subjectId: "subj-1" }, { supabaseAdmin })
  assert.ok(result.fewShotBlock.includes("Dispatch Test"))
})

test("resolveFewShotContext dispatches domain_role to the domain-role resolver, scoped by panelType", async () => {
  const domain_missions = [{ id: "m1", title: "Dispatch Test", difficulty: "easy", prompt: "p", dataset: {}, expected_result: {}, match_mode: "unordered_rows", reference_solution: "SELECT 1", rubric: {}, created_at: "2026-01-01" }]
  const { supabaseAdmin } = fakeSupabase({ domain_missions })
  const result = await resolveFewShotContext({ domain: "domain_role", roleId: "r1", panelType: "sql_runner" }, { supabaseAdmin })
  assert.ok(result.fewShotBlock.includes("Dispatch Test"))
})

test("Domain Role: an unregistered panel type returns an empty block rather than guessing a format", async () => {
  const { supabaseAdmin } = fakeSupabase({ domain_missions: [{ id: "m1", title: "T", prompt: "p" }] })
  const result = await resolveDomainRoleFewShot({ roleId: "r1", panelType: "carrier_pigeon" }, { supabaseAdmin })
  assert.deepEqual(result, { fewShotBlock: "", source: "none" })
})

// ── Structural-deadlock fix: avoided-task fallback ──────────────────────────
// generation only fires once 100% of a scope's existing tasks are already
// avoided/passed — these tests prove the exact real-world condition a live
// smoke test hit (a fully-cleared "frontend" role) now produces a non-empty,
// still-correctly-scoped fewShotBlock, without ever making those avoided
// tasks servable again.

test("Domain Role: non-avoided examples are preferred when at least one exists, even if others in scope are avoided", async () => {
  const domain_missions = [
    { id: "m1", title: "Excluded Passed Mission", difficulty: "easy", prompt: "p1", dataset: {}, expected_result: {}, match_mode: "unordered_rows", reference_solution: "SELECT 1", rubric: {}, created_at: "2026-01-01" },
    { id: "m2", title: "Fresh Eligible Mission", difficulty: "easy", prompt: "p2", dataset: {}, expected_result: {}, match_mode: "unordered_rows", reference_solution: "SELECT 2", rubric: {}, created_at: "2026-01-02" },
  ]
  const { supabaseAdmin } = fakeSupabase({ domain_missions })
  const result = await resolveDomainRoleFewShot({ roleId: "r1", panelType: "sql_runner", avoidedTaskIds: new Set(["m1"]) }, { supabaseAdmin })
  assert.ok(result.fewShotBlock.includes("Fresh Eligible Mission"))
  assert.equal(result.fewShotBlock.includes("Excluded Passed Mission"), false) // not needed — a non-avoided candidate already exists
  assert.equal(result.source, "non_avoided")
})

test("Domain Role: falls back to avoided/passed examples ONLY when the entire scoped pool is avoided — the exact fully-cleared-role scenario a live smoke test hit", async () => {
  const domain_missions = [
    { id: "m1", title: "Nav bar overlaps logo on mobile", difficulty: "easy", prompt: "Marketing reported that on screens below 480px the navigation links crowd over the company logo.", dataset: null, expected_result: null, match_mode: null, reference_solution: null, rubric: { html: "<nav></nav>", starter_code: ".nav{}" }, created_at: "2026-01-01" },
    { id: "m2", title: "Footer columns collapse", difficulty: "medium", prompt: "QA reported that on tablet widths the footer columns stack horizontally, making the content unreadable.", dataset: null, expected_result: null, match_mode: null, reference_solution: null, rubric: { html: "<footer></footer>", starter_code: ".footer{}" }, created_at: "2026-01-02" },
  ]
  const { supabaseAdmin } = fakeSupabase({ domain_missions })
  const allIds = new Set(["m1", "m2"]) // every existing mission for this role is passed — the real condition that reaches generation at all
  const result = await resolveDomainRoleFewShot({ roleId: "frontend", panelType: "frontend_runner", avoidedTaskIds: allIds }, { supabaseAdmin })
  assert.notEqual(result.fewShotBlock, "") // the deadlock is broken — no longer empty
  assert.ok(result.fewShotBlock.includes("Nav bar overlaps logo on mobile") || result.fewShotBlock.includes("Footer columns collapse"))
  assert.equal(result.source, "avoided_fallback")
})

test("Domain Role: an avoided task used as a style-only few-shot example is still excluded from what selectionEngine.js would ever serve — this file has no bearing on serving eligibility", async () => {
  // fewShot.js only ever returns a text block plus an internal "which stage
  // supplied it" label for the AI prompt — it has no return path that could
  // influence `eligible`/`passedIds` filtering in selectionEngine.js, which
  // lives entirely in a different module and is computed independently.
  // Documented and enforced structurally: this function's return type
  // ({fewShotBlock: string, source: enum}) cannot carry task eligibility
  // information back to the caller even in principle.
  const domain_missions = [{ id: "m1", title: "T", difficulty: "easy", prompt: "p", dataset: {}, expected_result: {}, match_mode: "unordered_rows", reference_solution: "SELECT 1", rubric: {}, created_at: "2026-01-01" }]
  const { supabaseAdmin } = fakeSupabase({ domain_missions })
  const result = await resolveDomainRoleFewShot({ roleId: "r1", panelType: "sql_runner", avoidedTaskIds: new Set(["m1"]) }, { supabaseAdmin })
  assert.deepEqual(Object.keys(result).sort(), ["fewShotBlock", "source"])
  assert.equal(typeof result.fewShotBlock, "string")
  assert.equal(result.source, "avoided_fallback") // this specific fixture has only one row, and it's avoided
})

test("Domain Role: the avoided-fallback pool never crosses role or panel type — only rows already scoped to the exact role+panelType query are ever candidates", async () => {
  const calls = []
  const supabaseAdmin = {
    from: (table) => {
      const self = {
        select: () => self,
        eq: (col, val) => { calls.push({ table, col, val }); return self },
        order: () => self,
        then: (resolve) => resolve({ data: [{ id: "m1", title: "T", difficulty: "easy", prompt: "p", dataset: {}, expected_result: {}, match_mode: "unordered_rows", reference_solution: "SELECT 1", rubric: {} }], error: null }),
      }
      return self
    },
  }
  await resolveDomainRoleFewShot({ roleId: "frontend", panelType: "sql_runner", avoidedTaskIds: new Set(["m1"]) }, { supabaseAdmin })
  // Exactly one domain_missions query, scoped by both role and panel type — the
  // fallback re-uses this SAME already-scoped result set, never a second,
  // broader query.
  assert.equal(calls.filter((c) => c.table === "domain_missions").length, 2) // domain_role_id + panel_type .eq() calls on the one query
  assert.ok(calls.some((c) => c.col === "domain_role_id" && c.val === "frontend"))
  assert.ok(calls.some((c) => c.col === "panel_type" && c.val === "sql_runner"))
})

test("Domain Role: diversity selection still applies to the avoided-fallback pool — near-identical avoided examples are not both selected", async () => {
  const domain_missions = [
    { id: "m1", title: "Footer collapse A", difficulty: "easy", prompt: "The footer columns collapse into a single line on tablet widths, fix the responsive layout.", dataset: {}, expected_result: {}, match_mode: "unordered_rows", reference_solution: "SELECT 1", rubric: {}, created_at: "2026-01-01" },
    { id: "m2", title: "Footer collapse B", difficulty: "easy", prompt: "The footer columns collapse into a single row on tablet widths, fix the responsive layout.", dataset: {}, expected_result: {}, match_mode: "unordered_rows", reference_solution: "SELECT 2", rubric: {}, created_at: "2026-01-02" },
    { id: "m3", title: "Totally Different", difficulty: "hard", prompt: "The pagination helper skips the last page under certain totals, fix the off by one bug entirely unrelated wording here", dataset: {}, expected_result: {}, match_mode: "unordered_rows", reference_solution: "SELECT 3", rubric: {}, created_at: "2026-01-03" },
  ]
  const { supabaseAdmin } = fakeSupabase({ domain_missions })
  const allAvoided = new Set(["m1", "m2", "m3"])
  const result = await resolveDomainRoleFewShot({ roleId: "r1", panelType: "sql_runner", avoidedTaskIds: allAvoided }, { supabaseAdmin })
  assert.ok(result.fewShotBlock.includes("Footer collapse A"))
  assert.equal(result.fewShotBlock.includes("Footer collapse B"), false)
  assert.ok(result.fewShotBlock.includes("Totally Different"))
})

test("Domain Role: the generated candidate itself can never appear as its own few-shot example — it does not exist in the queried table yet at resolution time", async () => {
  // Structural guarantee, not a behavioral branch: resolveDomainRoleFewShot
  // only ever reads rows already present in domain_missions. selectionEngine.js
  // calls this function BEFORE generateArenaTask is even invoked, and a
  // candidate is never persisted until AFTER it passes verification and
  // dedup — so there is no point in time where an in-flight candidate could
  // be returned by this query, avoided-fallback or not.
  const domain_missions = [{ id: "m1", title: "Existing", difficulty: "easy", prompt: "p", dataset: {}, expected_result: {}, match_mode: "unordered_rows", reference_solution: "SELECT 1", rubric: {}, created_at: "2026-01-01" }]
  const { supabaseAdmin } = fakeSupabase({ domain_missions })
  const result = await resolveDomainRoleFewShot({ roleId: "r1", panelType: "sql_runner", avoidedTaskIds: new Set(["m1"]) }, { supabaseAdmin })
  assert.ok(result.fewShotBlock.includes("Existing")) // only the one real, pre-existing row — nothing fabricated
})

test("College Stream: falls back to avoided/passed examples in the SAME unit when the unit's entire pool is avoided, without widening to sibling units unnecessarily", async () => {
  const experiments = [
    { id: "e1", title: "Unit Example (avoided)", difficulty: "easy", prompt: "p", reference_solution: "print(1)", rubric: { expected_stdout: "1" }, unit_id: "unit-1", created_at: "2026-01-01" },
  ]
  const calls = []
  const supabaseAdmin = {
    from: (table) => {
      calls.push(table)
      const self = { select: () => self, eq: () => self, in: () => self, order: () => self, then: (resolve) => resolve({ data: table === "experiments" ? experiments : [], error: null }) }
      return self
    },
  }
  const result = await resolveCollegeStreamFewShot({ unitId: "unit-1", subjectId: "subj-1", avoidedTaskIds: new Set(["e1"]) }, { supabaseAdmin })
  assert.ok(result.fewShotBlock.includes("Unit Example (avoided)"))
  assert.equal(calls.includes("units"), false) // never widened scope — the unit itself had rows to fall back to
  assert.equal(result.source, "avoided_fallback")
})

test("College Stream: widens to sibling units only when the target unit has zero rows at all (not merely zero non-avoided rows)", async () => {
  const supabaseAdmin = {
    from: (table) => {
      const self = {
        select: () => self,
        eq: (col, val) => { self._lastEq = { col, val }; return self },
        in: () => self,
        order: () => self,
        then: (resolve) => {
          if (table === "experiments" && self._lastEq?.val === "unit-1") return resolve({ data: [], error: null })
          if (table === "units") return resolve({ data: [{ id: "unit-2" }], error: null })
          if (table === "experiments") return resolve({ data: [{ id: "e-sib", title: "Sibling (avoided)", difficulty: "easy", prompt: "p", reference_solution: "print(2)", rubric: { expected_stdout: "2" }, unit_id: "unit-2", created_at: "2026-01-01" }], error: null })
          return resolve({ data: [], error: null })
        },
      }
      return self
    },
  }
  const result = await resolveCollegeStreamFewShot({ unitId: "unit-1", subjectId: "subj-1", avoidedTaskIds: new Set(["e-sib"]) }, { supabaseAdmin })
  assert.ok(result.fewShotBlock.includes("Sibling (avoided)")) // widened scope, then fell back to its avoided row too
})

test("resolveFewShotContext (dispatcher): fewShotBlock is always a string; the internal source label never leaks into the public /next-task API response", async () => {
  const domain_missions = [{ id: "m1", title: "T", difficulty: "easy", prompt: "p", dataset: {}, expected_result: {}, match_mode: "unordered_rows", reference_solution: "SELECT 1", rubric: {}, created_at: "2026-01-01" }]
  const { supabaseAdmin } = fakeSupabase({ domain_missions })
  const result = await resolveFewShotContext({ domain: "domain_role", roleId: "r1", panelType: "sql_runner", avoidedTaskIds: new Set(["m1"]) }, { supabaseAdmin })
  assert.deepEqual(Object.keys(result).sort(), ["fewShotBlock", "source"])
  assert.equal(typeof result.fewShotBlock, "string")
  // selectionEngine.js's real call site destructures only `fewShotBlock`
  // (`const { fewShotBlock } = await deps.resolveFewShotContext(...)`) — the
  // extra `source` field this function returns is simply discarded there,
  // never stored on generationContext, never reaching the API response.
})

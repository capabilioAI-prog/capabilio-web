import { test } from "node:test"
import assert from "node:assert/strict"
import { mapGeneratedExperimentToInsert, mapGeneratedDomainMissionToInsert, persistGeneratedTask } from "./persistence.js"

/** NO REAL DATABASE WRITE OCCURS ANYWHERE IN THIS FILE — every insert is a fake. */
function fakeSupabase({ insertError = null, insertedId = "row-1" } = {}) {
  const calls = []
  return {
    supabaseAdmin: {
      from: (table) => ({
        insert: (row) => {
          calls.push({ table, row })
          return {
            select: () => ({
              single: async () => (insertError ? { data: null, error: insertError } : { data: { id: insertedId }, error: null }),
            }),
          }
        },
      }),
    },
    calls,
  }
}

const VERIFICATION_WITH_STDOUT = { verification: { details: { expectedStdout: "42" } } }

// ── College Stream: mapGeneratedExperimentToInsert ─────────────────────────

test("mapGeneratedExperimentToInsert: maps to the exact live experiments column set, no invented fields", () => {
  const row = mapGeneratedExperimentToInsert({
    task: { title: " T ", prompt: " P ", referenceSolution: "print(42)" },
    verification: VERIFICATION_WITH_STDOUT,
    difficulty: "easy",
    unitId: "unit-1",
    subjectName: "Data Structures",
    skillGraphNodeId: "node-1",
  })
  assert.deepEqual(Object.keys(row).sort(), [
    "category", "challenge_type", "difficulty", "elo_reward", "estimated_minutes",
    "prompt", "reference_solution", "rubric", "skill_graph_node_id", "source",
    "tier", "time_limit_minutes", "title", "unit_id",
  ].sort())
  assert.equal(row.unit_id, "unit-1")
  assert.equal(row.title, "T")
  assert.equal(row.prompt, "P")
  assert.equal(row.category, "Data Structures")
  assert.equal(row.reference_solution, "print(42)")
  assert.equal(row.rubric.type, "python_stdout_match")
  assert.equal(row.rubric.expected_stdout, "42")
  assert.equal(row.source, "ai_generated")
  assert.equal(row.skill_graph_node_id, "node-1")
})

test("mapGeneratedExperimentToInsert: skill_graph_node_id defaults to null when no competency target is available — never fabricated", () => {
  const row = mapGeneratedExperimentToInsert({
    task: { title: "T", prompt: "P", referenceSolution: "print(1)" },
    verification: VERIFICATION_WITH_STDOUT, difficulty: "easy", unitId: "unit-1", subjectName: "DSA",
  })
  assert.equal(row.skill_graph_node_id, null)
  assert.equal("difficulty_score" in row, false) // intentionally omitted — see file header
})

// ── Domain Role: mapGeneratedDomainMissionToInsert ──────────────────────────

test("mapGeneratedDomainMissionToInsert (sql_runner): maps to the exact live domain_missions column set, starterQuery folded into rubric only", () => {
  const row = mapGeneratedDomainMissionToInsert({
    domain: "domain_role", panelType: "sql_runner", difficulty: "medium", domainRoleId: "role-1",
    task: { title: "T", prompt: "P", dataset: { tableName: "t", columns: ["id"], rows: [[1]] }, starterQuery: "SELECT * FROM t", referenceQuery: "SELECT id FROM t", expected_result: { columns: ["id"], rows: [[1]] }, match_mode: "unordered_rows", requirements: ["a", "b"], acceptanceCriteria: ["c", "d"], company: "Acme", manager: "Jo", sprint: "Week 2" },
    verification: {},
  })
  assert.deepEqual(Object.keys(row).sort(), [
    "company", "dataset", "difficulty", "domain_role_id", "elo_reward", "estimated_minutes",
    "expected_result", "manager", "match_mode", "panel_type", "prompt", "reference_solution",
    "rubric", "skill_graph_node_id", "source", "sprint", "time_limit_minutes", "title",
  ].sort())
  assert.equal(row.domain_role_id, "role-1")
  assert.equal(row.panel_type, "sql_runner")
  assert.equal(row.company, "Acme")
  assert.equal(row.manager, "Jo")
  assert.equal(row.sprint, "Week 2")
  assert.equal(row.reference_solution, "SELECT id FROM t")
  assert.equal(row.rubric.starter_query, "SELECT * FROM t")
  assert.equal("starter_query" in row, false) // never a top-level column — folded into rubric only
  assert.deepEqual(row.dataset, { tableName: "t", columns: ["id"], rows: [[1]] })
})

test("mapGeneratedDomainMissionToInsert (python_runner): starterCode folds into rubric, expected_stdout comes from verification, never a top-level starter_code column", () => {
  const row = mapGeneratedDomainMissionToInsert({
    domain: "domain_role", panelType: "python_runner", difficulty: "easy", domainRoleId: "role-1",
    task: { title: "T", prompt: "P", starterCode: "def f(): pass", referenceSolution: "print(42)", usePackages: false, requirements: ["a", "b"], acceptanceCriteria: ["c", "d"], company: "Acme", manager: "Jo", sprint: "Week 1" },
    verification: VERIFICATION_WITH_STDOUT,
  })
  assert.equal(row.rubric.type, "python_stdout_match")
  assert.equal(row.rubric.starter_code, "def f(): pass")
  assert.equal(row.rubric.expected_stdout, "42")
  assert.equal("starter_code" in row, false)
})

test("mapGeneratedDomainMissionToInsert (node_runner): uses the node stdout-match rubric type, same starter_code folding", () => {
  const row = mapGeneratedDomainMissionToInsert({
    domain: "domain_role", panelType: "node_runner", difficulty: "easy", domainRoleId: "role-1",
    task: { title: "T", prompt: "P", starterCode: "function f() {}", referenceSolution: "console.log(42)", requirements: ["a", "b"], acceptanceCriteria: ["c", "d"], company: "Acme", manager: "Jo", sprint: "Week 1" },
    verification: VERIFICATION_WITH_STDOUT,
  })
  assert.equal(row.rubric.type, "node_stdout_match")
  assert.equal(row.rubric.starter_code, "function f() {}")
})

test("mapGeneratedDomainMissionToInsert (frontend_runner): html/checks/starterCss fold into rubric, never top-level columns", () => {
  const row = mapGeneratedDomainMissionToInsert({
    domain: "domain_role", panelType: "frontend_runner", difficulty: "easy", domainRoleId: "role-1",
    task: { title: "T", prompt: "P", html: "<div></div>", starterCss: ".x{}", referenceCss: ".x{color:red}", checks: [{ description: "d", selector: ".x", property: "color", expectedValue: "red", mediaMaxWidth: null }], requirements: ["a", "b"], acceptanceCriteria: ["c", "d"], company: "Acme", manager: "Jo", sprint: "Week 1" },
    verification: {},
  })
  assert.equal(row.rubric.type, "css_rule_match")
  assert.equal(row.rubric.html, "<div></div>")
  assert.equal(row.rubric.starter_code, ".x{}")
  assert.equal(row.reference_solution, ".x{color:red}")
  assert.equal("html" in row, false)
  assert.equal("checks" in row, false)
})

test("mapGeneratedDomainMissionToInsert: an unrecognized panel_type throws rather than silently mapping garbage", () => {
  assert.throws(() => mapGeneratedDomainMissionToInsert({ panelType: "carrier_pigeon", task: {}, verification: {}, difficulty: "easy", domainRoleId: "role-1" }))
})

test("mapGeneratedDomainMissionToInsert: company/manager/sprint fall back to the same safe defaults the offline scripts use when the AI omits them", () => {
  const row = mapGeneratedDomainMissionToInsert({
    panelType: "sql_runner", difficulty: "easy", domainRoleId: "role-1",
    task: { title: "T", prompt: "P", dataset: {}, starterQuery: "x", referenceQuery: "y", expected_result: {}, match_mode: "unordered_rows", requirements: [], acceptanceCriteria: [] },
    verification: {},
  })
  assert.equal(row.company, "Capabilio Partner Co.")
  assert.equal(row.manager, "Team Lead")
  assert.equal(row.sprint, "Week 1")
})

test("mapGeneratedDomainMissionToInsert: skill_graph_node_id defaults to null when no competency target is available", () => {
  const row = mapGeneratedDomainMissionToInsert({
    panelType: "sql_runner", difficulty: "easy", domainRoleId: "role-1",
    task: { title: "T", prompt: "P", dataset: {}, starterQuery: "x", referenceQuery: "y", expected_result: {}, match_mode: "unordered_rows", requirements: [], acceptanceCriteria: [] },
    verification: {},
  })
  assert.equal(row.skill_graph_node_id, null)
})

// ── persistGeneratedTask ─────────────────────────────────────────────────

test("persistGeneratedTask: on success, inserts the mapped row and returns the real row id", async () => {
  const { supabaseAdmin, calls } = fakeSupabase({ insertedId: "new-exp-1" })
  const result = await persistGeneratedTask({
    domain: "college_stream", panelType: null,
    task: { title: "T", prompt: "P", referenceSolution: "print(1)" },
    verification: VERIFICATION_WITH_STDOUT, difficulty: "easy",
    collegeStreamMeta: { unitId: "unit-1", subjectName: "DSA" },
  }, { supabaseAdmin })
  assert.equal(result.ok, true)
  assert.equal(result.taskId, "new-exp-1")
  assert.equal(calls[0].table, "experiments")
})

test("persistGeneratedTask: a database insert error returns {ok:false}, never throws, never fabricates a task id", async () => {
  const { supabaseAdmin } = fakeSupabase({ insertError: { message: "constraint violation" } })
  const result = await persistGeneratedTask({
    domain: "college_stream", panelType: null,
    task: { title: "T", prompt: "P", referenceSolution: "print(1)" },
    verification: VERIFICATION_WITH_STDOUT, difficulty: "easy",
    collegeStreamMeta: { unitId: "unit-1", subjectName: "DSA" },
  }, { supabaseAdmin })
  assert.equal(result.ok, false)
  assert.match(result.error, /constraint violation/)
})

test("persistGeneratedTask: an unrecognized panel_type returns {ok:false} instead of throwing up through the caller", async () => {
  const { supabaseAdmin } = fakeSupabase()
  const result = await persistGeneratedTask({ domain: "domain_role", panelType: "carrier_pigeon", task: {}, verification: {}, difficulty: "easy", domainRoleId: "role-1" }, { supabaseAdmin })
  assert.equal(result.ok, false)
})

test("persistGeneratedTask: passes skillGraphNodeId through to the mapped row when a competency target is supplied", async () => {
  const { supabaseAdmin } = fakeSupabase()
  const result = await persistGeneratedTask({
    domain: "college_stream", panelType: null,
    task: { title: "T", prompt: "P", referenceSolution: "print(1)" },
    verification: VERIFICATION_WITH_STDOUT, difficulty: "easy",
    collegeStreamMeta: { unitId: "unit-1", subjectName: "DSA" },
    skillGraphNodeId: "node-42",
  }, { supabaseAdmin })
  assert.equal(result.row.skill_graph_node_id, "node-42")
})

// ── D-3 fresh-audit reinforcement: no raw provider metadata, workstation compatibility ──

test("no mapper ever persists provider/model metadata into the task row — that belongs only in task_generation_events", () => {
  const expRow = mapGeneratedExperimentToInsert({
    task: { title: "T", prompt: "P", referenceSolution: "print(1)" },
    verification: VERIFICATION_WITH_STDOUT, difficulty: "easy", unitId: "unit-1", subjectName: "DSA",
  })
  const sqlRow = mapGeneratedDomainMissionToInsert({
    panelType: "sql_runner", difficulty: "easy", domainRoleId: "role-1",
    task: { title: "T", prompt: "P", dataset: {}, starterQuery: "x", referenceQuery: "y", expected_result: {}, match_mode: "unordered_rows", requirements: [], acceptanceCriteria: [] },
    verification: {},
  })
  for (const row of [expRow, sqlRow]) {
    for (const forbiddenKey of ["provider", "model", "model_tier", "promptId", "prompt_id", "requestId"]) {
      assert.equal(forbiddenKey in row, false, `${forbiddenKey} must never appear in a task row`)
    }
  }
})

// Field lists lifted directly from the real routes' own .select(...) calls
// (routes/arenaCollegeStream.js's experiment-detail/grading selects, and
// routes/arenaDomainRole.js's mission-detail select at line ~527) — a
// generated row must carry every one of these so the existing workstation
// loads it with zero special-case frontend logic, per Checkpoint D-3's
// "workstation compatibility is mandatory" requirement.
const COLLEGE_STREAM_WORKSTATION_FIELDS = ["id", "title", "difficulty", "prompt", "elo_reward", "time_limit_minutes", "unit_id", "tier", "challenge_type", "category", "rubric"]
const DOMAIN_ROLE_WORKSTATION_FIELDS = ["id", "title", "prompt", "difficulty", "elo_reward", "time_limit_minutes", "panel_type", "domain_role_id", "dataset", "company", "manager", "sprint", "estimated_minutes", "rubric"]

test("workstation compatibility: a persisted College Stream row carries every field the real experiment-detail/grading routes select", async () => {
  const { supabaseAdmin } = fakeSupabase({ insertedId: "exp-1" })
  const result = await persistGeneratedTask({
    domain: "college_stream", panelType: null,
    task: { title: "T", prompt: "P", referenceSolution: "print(1)" },
    verification: VERIFICATION_WITH_STDOUT, difficulty: "easy",
    collegeStreamMeta: { unitId: "unit-1", subjectName: "DSA" },
  }, { supabaseAdmin })
  const persistedRow = { id: result.taskId, ...result.row } // id comes back from the insert's .select("id"), not the mapped row itself
  for (const field of COLLEGE_STREAM_WORKSTATION_FIELDS) {
    assert.ok(field in persistedRow, `persisted experiment row is missing "${field}", which routes/arenaCollegeStream.js selects for the workstation`)
  }
})

test("workstation compatibility: a persisted Domain Role SQL row carries every field the real mission-detail route selects", async () => {
  const { supabaseAdmin } = fakeSupabase({ insertedId: "mission-1" })
  const result = await persistGeneratedTask({
    domain: "domain_role", panelType: "sql_runner", domainRoleId: "role-1",
    task: { title: "T", prompt: "P", dataset: { tableName: "t", columns: ["id"], rows: [[1]] }, starterQuery: "x", referenceQuery: "SELECT id FROM t", expected_result: { columns: ["id"], rows: [[1]] }, match_mode: "unordered_rows", requirements: ["a", "b"], acceptanceCriteria: ["c", "d"], company: "Acme", manager: "Jo", sprint: "Week 1" },
    verification: {}, difficulty: "easy",
  }, { supabaseAdmin })
  const persistedRow = { id: result.taskId, ...result.row }
  for (const field of DOMAIN_ROLE_WORKSTATION_FIELDS) {
    assert.ok(field in persistedRow, `persisted domain_mission row is missing "${field}", which routes/arenaDomainRole.js selects for the workstation`)
  }
})

test("Domain Role generation never attempts a starter_query or starter_code top-level insert, for any panel type", () => {
  const rows = [
    mapGeneratedDomainMissionToInsert({ panelType: "sql_runner", difficulty: "easy", domainRoleId: "r1", verification: {}, task: { title: "T", prompt: "P", dataset: {}, starterQuery: "x", referenceQuery: "y", expected_result: {}, match_mode: "unordered_rows", requirements: [], acceptanceCriteria: [] } }),
    mapGeneratedDomainMissionToInsert({ panelType: "python_runner", difficulty: "easy", domainRoleId: "r1", verification: VERIFICATION_WITH_STDOUT, task: { title: "T", prompt: "P", starterCode: "x", referenceSolution: "print(1)", usePackages: false, requirements: [], acceptanceCriteria: [] } }),
    mapGeneratedDomainMissionToInsert({ panelType: "node_runner", difficulty: "easy", domainRoleId: "r1", verification: VERIFICATION_WITH_STDOUT, task: { title: "T", prompt: "P", starterCode: "x", referenceSolution: "console.log(1)", requirements: [], acceptanceCriteria: [] } }),
    mapGeneratedDomainMissionToInsert({ panelType: "frontend_runner", difficulty: "easy", domainRoleId: "r1", verification: {}, task: { title: "T", prompt: "P", html: "<div></div>", starterCss: "x", referenceCss: ".x{}", checks: [{ description: "d", selector: ".x", property: "color", expectedValue: "red", mediaMaxWidth: null }], requirements: [], acceptanceCriteria: [] } }),
  ]
  for (const row of rows) {
    assert.equal("starter_query" in row, false)
    assert.equal("starter_code" in row, false)
  }
})

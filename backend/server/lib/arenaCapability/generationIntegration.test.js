/**
 * generationIntegration.test.js — Arena Capability Engine, Checkpoint E.
 * ---------------------------------------------------------------------------
 * A genuine composition test, not a chain of isolated mocks: this file
 * wires the REAL selectBestTask/contextResolution/generateArenaTask/
 * promptResolver/verifyGeneratedTask/checkDuplicate/recordFingerprint/
 * persistence functions together through one shared dependency object, and
 * fakes only the two true I/O boundaries no automated test should cross:
 *   - the AI network call (executePrompt) — no real provider call,
 *   - the database (supabaseAdmin) — an in-memory fake, no real Supabase write.
 * Verification runs for REAL: `runPython` actually spawns a real python3
 * subprocess (same as production), and `runAgainstDataset`/`compareResults`
 * actually run a real in-memory sql.js database (same as production) — both
 * are pure/local, no network, safe to execute in CI. This is what proves
 * the actual composition works, not just that each piece individually does.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { selectBestTask } from "./selectionEngine.js"
import { resolveCollegeStreamGenerationContext } from "./contextResolution.js"
import { generateArenaTask } from "./taskGeneration.js"
import { resolveGenerationPromptId } from "./promptResolver.js"
import { verifyGeneratedTask } from "./verification.js"
import { checkDuplicate, recordFingerprint } from "./dedup.js"
import { persistGeneratedTask } from "./persistence.js"
import { getExclusions } from "./taskHistory.js"
import { loadCapabilityState } from "./profileService.js"
import { resolveFewShotContext } from "./fewShot.js"
import { logger } from "../logger.js"
import { runPython, scanForDangerousPatterns as scanPythonDangerousPatterns } from "../collegeStream/pythonSandbox.js"
import { runNode, scanForDangerousPatterns as scanNodeDangerousPatterns } from "../collegeStream/nodeSandbox.js"
import { runAgainstDataset, compareResults } from "../domainRole/sqlSandbox.js"
import { checkCssRules } from "../domainRole/cssRuleChecker.js"
// Deliberate, one-off cross-boundary import (Checkpoint E, requirement E6):
// arenaCapabilityContract.js is a plain, framework-free module (no Vite
// import.meta.env, no Supabase client — confirmed in its own file header),
// so it's safe to run under this backend test runner. Importing the REAL
// frontend gate function here, rather than re-implementing its logic,
// proves the actual frontend contract accepts these REAL backend response
// shapes — not just that a copy of its logic would.
import { isOpenableCapabilityTask } from "../../../../frontend/src/lib/arenaCapabilityContract.js"

/**
 * A faithful-enough in-memory PostgREST-shaped fake: real filtering via
 * accumulated .eq()/.in(), real inserts that append to the table and are
 * visible to later queries in the SAME test (so a "reload" is genuine).
 * NO REAL DATABASE IS EVER TOUCHED — this is a plain JS object.
 */
function makeFakeDb(seed) {
  const db = {}
  for (const [table, rows] of Object.entries(seed)) db[table] = rows.map((r) => ({ ...r }))
  let idCounter = 0

  function from(table) {
    if (!db[table]) db[table] = []
    const filters = []
    let limitN = null
    const builder = {
      select: () => builder,
      eq: (col, val) => { filters.push((r) => r[col] === val); return builder },
      in: (col, vals) => { filters.push((r) => vals.includes(r[col])); return builder },
      gte: (col, val) => { filters.push((r) => r[col] >= val); return builder },
      order: () => builder,
      limit: (n) => { limitN = n; return builder },
      async maybeSingle() {
        const rows = db[table].filter((r) => filters.every((f) => f(r)))
        return { data: rows[0] ?? null, error: null }
      },
      insert: (row) => {
        const rowsToInsert = (Array.isArray(row) ? row : [row]).map((r) => ({
          id: r.id || `${table}-${++idCounter}`,
          created_at: new Date().toISOString(),
          generated_at: new Date().toISOString(),
          ...r,
        }))
        db[table].push(...rowsToInsert)
        return {
          select: () => ({ single: async () => ({ data: rowsToInsert[0], error: null }) }),
          then: (resolve) => resolve({ data: rowsToInsert, error: null }),
        }
      },
      then: (resolve) => {
        let rows = db[table].filter((r) => filters.every((f) => f(r)))
        if (limitN != null) rows = rows.slice(0, limitN)
        return resolve({ data: rows, error: null })
      },
    }
    return builder
  }
  return { supabaseAdmin: { from }, db }
}

function collegeStreamSeed(overrides = {}) {
  return {
    streams: [{ id: "stream-1", name: "CSE", slug: "cse" }],
    semesters: [{ id: "sem-1", stream_id: "stream-1" }],
    semester_subjects: [{ semester_id: "sem-1", subject_id: "subj-1" }],
    subjects: [{ id: "subj-1", name: "Data Structures & Algorithms" }],
    units: [{ id: "unit-1", title: "Arrays & Strings", subject_id: "subj-1" }],
    experiments: [],
    skill_graph_nodes: [],
    memory_states: [],
    college_submissions: [],
    task_content_fingerprints: [],
    task_generation_events: [],
    ...overrides,
  }
}

function domainRoleSeed(overrides = {}) {
  return {
    domain_roles: [{ id: "data_engineer", label: "Data Engineer", primary_panel_type: "sql_runner" }],
    domain_missions: [],
    skill_graph_nodes: [],
    memory_states: [],
    domain_submissions: [],
    task_content_fingerprints: [],
    task_generation_events: [],
    ...overrides,
  }
}

/** Real generation + verification + dedup + persistence, fake AI + fake DB. */
function realDeps({ supabaseAdmin, executePrompt }) {
  return {
    supabaseAdmin,
    logger,
    getExclusions, loadCapabilityState,
    resolveCollegeStreamGenerationContext,
    resolveFewShotContext,
    generateArenaTask, resolveGenerationPromptId, executePrompt,
    verifyGeneratedTask,
    runPython, scanPythonDangerousPatterns,
    runNode, scanNodeDangerousPatterns,
    runAgainstDataset, compareResults,
    checkCssRules,
    checkDuplicate, recordFingerprint,
    persistGeneratedTask,
  }
}

const REAL_COLLEGE_STREAM_TASK = { title: "Add Two Numbers", prompt: "Print the sum of 2 and 2.", referenceSolution: "print(2 + 2)" }
async function collegeStreamExecutePrompt(promptId) {
  if (promptId !== "collegeStream.experimentGeneration") throw new Error(`unexpected promptId ${promptId}`)
  return { data: { ...REAL_COLLEGE_STREAM_TASK }, provider: "groq", model: "test-fast-model" }
}

const REAL_SQL_TASK = {
  title: "Fix the Revenue Query", prompt: "The finance dashboard undercounts revenue — find and fix it.",
  dataset: { tableName: "orders", columns: ["id", "amount"], rows: [[1, 100], [2, 200]] },
  starterQuery: "SELECT amount FROM orders LIMIT 1", referenceQuery: "SELECT SUM(amount) as total FROM orders",
  expected_result: { columns: ["total"], rows: [[300]] }, match_mode: "unordered_rows",
  requirements: ["Return the correct total"], acceptanceCriteria: ["Query returns 300"],
  company: "Acme Analytics", manager: "Jordan Lee", sprint: "Sprint 4",
}
async function sqlExecutePrompt(promptId) {
  if (promptId !== "domainRole.sqlMissionGeneration") throw new Error(`unexpected promptId ${promptId}`)
  return { data: { ...REAL_SQL_TASK }, provider: "groq", model: "test-fast-model" }
}

const REAL_PYTHON_TASK = {
  title: "Fix the Aggregation Bug", prompt: "The reporting job undercounts — find and fix it.",
  starterCode: "print(6 + 7)", referenceSolution: "print(6 * 7)", usePackages: false,
  requirements: ["Return the correct product"], acceptanceCriteria: ["Prints 42"],
  company: "Acme Analytics", manager: "Jordan Lee", sprint: "Sprint 4",
}
async function pythonExecutePrompt(promptId) {
  if (promptId !== "domainRole.pythonMissionGeneration") throw new Error(`unexpected promptId ${promptId}`)
  return { data: { ...REAL_PYTHON_TASK }, provider: "groq", model: "test-fast-model" }
}

const REAL_NODE_TASK = {
  title: "Fix the Total Calculation", prompt: "The checkout total is wrong — find and fix it.",
  starterCode: "console.log(6 + 7)", referenceSolution: "console.log(6 * 7)",
  requirements: ["Return the correct product"], acceptanceCriteria: ["Prints 42"],
  company: "Acme Analytics", manager: "Jordan Lee", sprint: "Sprint 4",
}
async function nodeExecutePrompt(promptId) {
  if (promptId !== "domainRole.nodeMissionGeneration") throw new Error(`unexpected promptId ${promptId}`)
  return { data: { ...REAL_NODE_TASK }, provider: "groq", model: "test-fast-model" }
}

const REAL_FRONTEND_TASK = {
  title: "Fix the Nav Layout", prompt: "The nav bar doesn't lay out horizontally — find and fix it.",
  html: '<nav class="nav"><a>Home</a><a>About</a></nav>', starterCss: ".nav { display: block; }",
  referenceCss: ".nav { display: flex; }",
  checks: [{ description: "nav is a flex container", selector: ".nav", property: "display", expectedValue: "flex", mediaMaxWidth: null }],
  requirements: ["nav must lay out horizontally"], acceptanceCriteria: ["display:flex on .nav"],
  company: "Acme Analytics", manager: "Jordan Lee", sprint: "Sprint 4",
}
async function frontendExecutePrompt(promptId) {
  if (promptId !== "domainRole.frontendMissionGeneration") throw new Error(`unexpected promptId ${promptId}`)
  return { data: { ...REAL_FRONTEND_TASK }, provider: "groq", model: "test-fast-model" }
}

// ── E2: full real composition, College Stream ──────────────────────────────

test("E2-college. real composition: no existing task -> real context resolution -> real generation (fake AI) -> REAL python3 verification -> real dedup -> real persistence -> generated response", async () => {
  const { supabaseAdmin, db } = makeFakeDb(collegeStreamSeed())
  const deps = realDeps({ supabaseAdmin, executePrompt: collegeStreamExecutePrompt })

  const result = await selectBestTask({ userId: "u1", domain: "college_stream", key: "cse" }, deps)

  assert.equal(result.taskSource, "generated")
  assert.equal(result.task.title, "Add Two Numbers")
  assert.equal(result.task.panelType, null)
  assert.equal(db.experiments.length, 1) // really persisted, not just returned in-memory
  assert.equal(db.experiments[0].unit_id, "unit-1") // the real unit contextResolution.js resolved, not guessed
  assert.equal(db.experiments[0].reference_solution, "print(2 + 2)")
  assert.equal(db.experiments[0].rubric.expected_stdout, "4") // the REAL python3 subprocess actually ran print(2 + 2) and produced this
  assert.equal(db.task_content_fingerprints.length, 1) // real fingerprint recorded, keyed to the real persisted id
  assert.equal(db.task_content_fingerprints[0].task_id, result.task.id)
  assert.equal(db.task_generation_events.length, 1)
  assert.equal(db.task_generation_events[0].outcome, "generated")
  assert.equal(db.task_generation_events[0].task_id, result.task.id)
  assert.equal(db.task_generation_events[0].provider, "groq")
})

test("E2-college-reload. the persisted row alone (no in-memory task object) contains everything the real experiment-detail route needs", async () => {
  const { supabaseAdmin, db } = makeFakeDb(collegeStreamSeed())
  const deps = realDeps({ supabaseAdmin, executePrompt: collegeStreamExecutePrompt })
  const result = await selectBestTask({ userId: "u1", domain: "college_stream", key: "cse" }, deps)

  // Simulate a later, independent reload by id — exactly what
  // routes/arenaCollegeStream.js's GET /experiments/:id does.
  const reloaded = db.experiments.find((e) => e.id === result.task.id)
  assert.ok(reloaded)
  for (const field of ["title", "prompt", "difficulty", "elo_reward", "time_limit_minutes", "unit_id", "tier", "challenge_type", "category", "rubric", "reference_solution"]) {
    assert.ok(field in reloaded, `reloaded experiment missing "${field}"`)
  }
})

// ── E2: full real composition, Domain Role SQL ──────────────────────────────

test("E2-sql. real composition: no existing mission -> real generation (fake AI) -> REAL sql.js verification -> real dedup -> real persistence -> generated response", async () => {
  const { supabaseAdmin, db } = makeFakeDb(domainRoleSeed())
  const deps = realDeps({ supabaseAdmin, executePrompt: sqlExecutePrompt })

  const result = await selectBestTask({ userId: "u1", domain: "domain_role", key: "data_engineer" }, deps)

  assert.equal(result.taskSource, "generated")
  assert.equal(result.task.panelType, "sql_runner")
  assert.equal(db.domain_missions.length, 1)
  assert.equal(db.domain_missions[0].panel_type, "sql_runner")
  assert.deepEqual(db.domain_missions[0].expected_result, { columns: ["total"], rows: [[300]] })
  assert.equal(db.domain_missions[0].rubric.starter_query, "SELECT amount FROM orders LIMIT 1") // folded into rubric, no top-level column
  assert.equal("starter_query" in db.domain_missions[0], false)
  assert.equal(db.task_content_fingerprints.length, 1)
  assert.equal(db.task_generation_events[0].outcome, "generated")
})

test("E2-python. real composition: no existing mission -> real generation (fake AI) -> REAL python3 verification -> real persistence -> generated response, opens the Python workstation", async () => {
  const { supabaseAdmin, db } = makeFakeDb(domainRoleSeed({ domain_roles: [{ id: "ml_engineer", label: "ML Engineer", primary_panel_type: "python_runner" }] }))
  const deps = realDeps({ supabaseAdmin, executePrompt: pythonExecutePrompt })

  const result = await selectBestTask({ userId: "u1", domain: "domain_role", key: "ml_engineer" }, deps)

  assert.equal(result.taskSource, "generated")
  assert.equal(result.task.panelType, "python_runner") // PANEL_REGISTRY key -> PythonWorkspace.jsx
  assert.equal(db.domain_missions.length, 1)
  assert.equal(db.domain_missions[0].rubric.expected_stdout, "42") // REAL python3 actually ran `print(6 * 7)`
  assert.equal(db.domain_missions[0].rubric.starter_code, "print(6 + 7)") // seeds PythonEditor's initial code, per ArenaCollegeStream.jsx's openDomainMission
  assert.equal("starter_code" in db.domain_missions[0], false) // never a top-level column
})

test("E2-node. real composition: no existing mission -> real generation (fake AI) -> REAL node verification -> real persistence -> generated response, opens the Node workstation", async () => {
  const { supabaseAdmin, db } = makeFakeDb(domainRoleSeed({ domain_roles: [{ id: "backend_engineer", label: "Backend Engineer", primary_panel_type: "node_runner" }] }))
  const deps = realDeps({ supabaseAdmin, executePrompt: nodeExecutePrompt })

  const result = await selectBestTask({ userId: "u1", domain: "domain_role", key: "backend_engineer" }, deps)

  assert.equal(result.taskSource, "generated")
  assert.equal(result.task.panelType, "node_runner") // PANEL_REGISTRY key -> NodeWorkspace.jsx
  assert.equal(db.domain_missions.length, 1)
  assert.equal(db.domain_missions[0].rubric.expected_stdout, "42") // REAL node actually ran `console.log(6 * 7)`
  assert.equal(db.domain_missions[0].rubric.starter_code, "console.log(6 + 7)")
})

test("E2-frontend. real composition: no existing mission -> real generation (fake AI) -> REAL cssRuleChecker verification -> real persistence -> generated response, opens the Frontend workstation", async () => {
  const { supabaseAdmin, db } = makeFakeDb(domainRoleSeed({ domain_roles: [{ id: "frontend_engineer", label: "Frontend Engineer", primary_panel_type: "frontend_runner" }] }))
  const deps = realDeps({ supabaseAdmin, executePrompt: frontendExecutePrompt })

  const result = await selectBestTask({ userId: "u1", domain: "domain_role", key: "frontend_engineer" }, deps)

  assert.equal(result.taskSource, "generated")
  assert.equal(result.task.panelType, "frontend_runner") // PANEL_REGISTRY key -> FrontendWorkspace.jsx
  assert.equal(db.domain_missions.length, 1)
  // The REAL css parser (the `css` npm package, via checkCssRules) actually
  // parsed ".nav { display: flex; }" and confirmed it satisfies the check —
  // verification.js would have rejected this task if it hadn't.
  assert.equal(db.domain_missions[0].reference_solution, ".nav { display: flex; }")
  assert.equal(db.domain_missions[0].rubric.html, '<nav class="nav"><a>Home</a><a>About</a></nav>') // rendered read-only in FrontendWorkspace.jsx's preview
  assert.equal(db.domain_missions[0].rubric.starter_code, ".nav { display: block; }")
  assert.equal("html" in db.domain_missions[0], false) // never a top-level column
  assert.equal("checks" in db.domain_missions[0], false) // grading criteria — never leaked as a top-level column either
})

// ── E1: existing-task path, real composition (proves AI is genuinely never touched) ──

test("E1. an existing suitable task is served through the real composition without ever invoking the AI boundary", async () => {
  const seed = collegeStreamSeed({
    experiments: [{ id: "e1", title: "Existing Task", prompt: "p", difficulty: "easy", difficulty_score: null, elo_reward: 10, time_limit_minutes: 30, challenge_type: null, skill_graph_node_id: null, created_at: "2026-01-01", unit_id: "unit-1" }],
  })
  const { supabaseAdmin, db } = makeFakeDb(seed)
  let aiCalled = false
  const deps = realDeps({ supabaseAdmin, executePrompt: async () => { aiCalled = true; throw new Error("should never be called") } })

  const result = await selectBestTask({ userId: "u1", domain: "college_stream", key: "cse" }, deps)

  assert.equal(result.taskSource, "existing_verified")
  assert.equal(result.task.id, "e1")
  assert.equal(aiCalled, false)
  assert.equal(db.experiments.length, 1) // no new row created
  assert.equal(db.task_generation_events[0].outcome, "served_existing")
})

// ── E3: regeneration and bounded-both-fail, real composition ───────────────

test("E3-regen. real composition: attempt 1's reference solution fails real python3 execution, attempt 2 succeeds -> regenerated", async () => {
  const { supabaseAdmin, db } = makeFakeDb(collegeStreamSeed())
  let call = 0
  const deps = realDeps({
    supabaseAdmin,
    executePrompt: async () => {
      call++
      if (call === 1) return { data: { title: "Broken", prompt: "p", referenceSolution: "raise SystemExit(1)" }, provider: "groq", model: "m" } // really exits non-zero in the real sandbox
      return { data: { ...REAL_COLLEGE_STREAM_TASK }, provider: "groq", model: "m" }
    },
  })

  const result = await selectBestTask({ userId: "u1", domain: "college_stream", key: "cse" }, deps)

  assert.equal(call, 2) // exactly two attempts, real execution decided the first was bad
  assert.equal(result.taskSource, "regenerated")
  assert.equal(db.experiments.length, 1) // only the successful candidate was ever persisted
  assert.equal(db.experiments[0].reference_solution, "print(2 + 2)")
})

test("E3-both-fail. real composition: both attempts produce a referenceSolution that really fails execution -> honest no_suitable_task, nothing persisted or fingerprinted", async () => {
  const { supabaseAdmin, db } = makeFakeDb(collegeStreamSeed())
  const deps = realDeps({
    supabaseAdmin,
    executePrompt: async () => ({ data: { title: "Always Broken", prompt: "p", referenceSolution: "raise SystemExit(1)" }, provider: "groq", model: "m" }),
  })

  const result = await selectBestTask({ userId: "u1", domain: "college_stream", key: "cse" }, deps)

  assert.equal(result.taskSource, "no_suitable_task")
  assert.equal(result.task, null)
  assert.equal(db.experiments.length, 0)
  assert.equal(db.task_content_fingerprints.length, 0)
  assert.equal(db.task_generation_events.length, 0) // no fabricated success/failure event either
})

// ── E4: provider failure, real composition ──────────────────────────────────

test("E4. real composition: the AI boundary itself throws (simulated provider failure) on every attempt -> bounded, honest no_suitable_task, never fake content", async () => {
  const { supabaseAdmin, db } = makeFakeDb(collegeStreamSeed())
  let calls = 0
  const deps = realDeps({
    supabaseAdmin,
    executePrompt: async () => { calls++; throw new Error("ECONNRESET: provider unreachable") },
  })

  const result = await selectBestTask({ userId: "u1", domain: "college_stream", key: "cse" }, deps)

  assert.equal(calls, 2) // bounded — not an infinite loop
  assert.equal(result.taskSource, "no_suitable_task")
  assert.equal(result.task, null)
  assert.equal(db.experiments.length, 0)
  assert.equal(JSON.stringify(result).includes("ECONNRESET"), false) // no raw provider error text leaks into the response
})

// ── E5: no-repeat validation, real composition ──────────────────────────────

test("E5-fingerprint. real composition: a duplicate candidate (identical content already fingerprinted) is rejected before persistence, next attempt tried", async () => {
  const seed = collegeStreamSeed()
  // Pre-seed a fingerprint matching what the fake AI will produce, simulating
  // "this exact content was already generated and persisted previously."
  const { normalized, hash } = (await import("./dedup.js")).computeFingerprint(REAL_COLLEGE_STREAM_TASK)
  seed.task_content_fingerprints = [{ id: "fp-1", task_type: "experiment", task_id: "existing-task-1", normalized_hash: hash }]
  const { supabaseAdmin, db } = makeFakeDb(seed)
  let call = 0
  const deps = realDeps({
    supabaseAdmin,
    executePrompt: async () => {
      call++
      if (call === 1) return { data: { ...REAL_COLLEGE_STREAM_TASK }, provider: "groq", model: "m" } // exact duplicate of the pre-seeded fingerprint
      return { data: { title: "Multiply Two Numbers", prompt: "Print the product of 3 and 4.", referenceSolution: "print(3 * 4)" }, provider: "groq", model: "m" }
    },
  })

  const result = await selectBestTask({ userId: "u1", domain: "college_stream", key: "cse" }, deps)

  assert.equal(call, 2)
  assert.equal(result.taskSource, "regenerated") // first rejected as duplicate, second (genuinely different) content succeeds
  assert.equal(db.experiments.length, 1)
  assert.equal(db.experiments[0].reference_solution, "print(3 * 4)")
})

test("E5-history. a task the student already passed is never re-served, even when it's the only existing row — real composition falls through to generation instead", async () => {
  const seed = collegeStreamSeed({
    experiments: [{ id: "e1", title: "Already Passed", prompt: "p", difficulty: "easy", difficulty_score: null, elo_reward: 10, time_limit_minutes: 30, challenge_type: null, skill_graph_node_id: null, created_at: "2026-01-01", unit_id: "unit-1" }],
    college_submissions: [{ id: "sub-1", user_id: "u1", experiment_id: "e1", passed: true }],
  })
  const { supabaseAdmin, db } = makeFakeDb(seed)
  const deps = realDeps({ supabaseAdmin, executePrompt: collegeStreamExecutePrompt })

  const result = await selectBestTask({ userId: "u1", domain: "college_stream", key: "cse" }, deps)

  assert.notEqual(result.task.id, "e1") // the passed task is never re-served
  assert.equal(result.taskSource, "generated")
  assert.equal(db.experiments.length, 2) // the old passed one, plus the newly generated one
})

// ── E6: frontend auto-open contract, against REAL backend responses ────────
// Real selectBestTask output (from the tests above) fed through the REAL
// frontend gate (imported, not reimplemented) — proves the actual contract,
// not an assumed one. The routing decision itself (which opener to call) is
// a one-line `res.domain === "college_stream"` check in
// ArenaCollegeStream.jsx with no component-test harness in this repo to
// exercise directly (confirmed: no React Testing Library/jsdom setup
// exists) — asserted here as a plain value check on the real response
// instead, which is what that one line actually branches on.
const KNOWN_WORKSTATION_PANEL_TYPES = ["sql_runner", "python_runner", "node_runner", "frontend_runner"]

test("E6-college. a real generated College Stream response passes the real frontend gate and routes to openExperiment (domain === college_stream, panelType null)", async () => {
  const { supabaseAdmin } = makeFakeDb(collegeStreamSeed())
  const deps = realDeps({ supabaseAdmin, executePrompt: collegeStreamExecutePrompt })
  const result = await selectBestTask({ userId: "u1", domain: "college_stream", key: "cse" }, deps)

  assert.equal(isOpenableCapabilityTask(result), true)
  assert.equal(result.domain, "college_stream") // ArenaCollegeStream.jsx routes this to openExperiment({id: result.task.id})
  assert.equal(result.task.panelType, null) // College Stream never fabricates a panelType
})

test("E6-sql. a real generated Domain Role SQL response passes the real frontend gate and routes to openDomainMission with a PANEL_REGISTRY-valid panelType", async () => {
  const { supabaseAdmin } = makeFakeDb(domainRoleSeed())
  const deps = realDeps({ supabaseAdmin, executePrompt: sqlExecutePrompt })
  const result = await selectBestTask({ userId: "u1", domain: "domain_role", key: "data_engineer" }, deps)

  assert.equal(isOpenableCapabilityTask(result), true)
  assert.equal(result.domain, "domain_role") // ArenaCollegeStream.jsx routes this to openDomainMission({id: result.task.id})
  assert.ok(KNOWN_WORKSTATION_PANEL_TYPES.includes(result.task.panelType))
})

test("E6-existing. a real existing-task response passes the real frontend gate identically to a generated one — no source-based branching needed", async () => {
  const seed = collegeStreamSeed({
    experiments: [{ id: "e1", title: "Existing", prompt: "p", difficulty: "easy", difficulty_score: null, elo_reward: 10, time_limit_minutes: 30, challenge_type: null, skill_graph_node_id: null, created_at: "2026-01-01", unit_id: "unit-1" }],
  })
  const { supabaseAdmin } = makeFakeDb(seed)
  const deps = realDeps({ supabaseAdmin, executePrompt: async () => { throw new Error("must not be called") } })
  const result = await selectBestTask({ userId: "u1", domain: "college_stream", key: "cse" }, deps)

  assert.equal(result.taskSource, "existing_verified")
  assert.equal(isOpenableCapabilityTask(result), true)
})

test("E6-no-task. a real honest no_suitable_task response correctly fails the real frontend gate — the UI shows selectionReason, never opens a workstation", async () => {
  const { supabaseAdmin } = makeFakeDb(collegeStreamSeed())
  const deps = realDeps({ supabaseAdmin, executePrompt: async () => { throw new Error("provider down") } })
  const result = await selectBestTask({ userId: "u1", domain: "college_stream", key: "cse" }, deps)

  assert.equal(result.taskSource, "no_suitable_task")
  assert.equal(isOpenableCapabilityTask(result), false)
  assert.equal(typeof result.selectionReason, "string")
})

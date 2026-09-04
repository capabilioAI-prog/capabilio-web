import { test } from "node:test"
import assert from "node:assert/strict"
import { selectBestTask, pickGenerationDifficulty } from "./selectionEngine.js"

/**
 * Minimal generic fake: each table name maps to either a single row
 * (maybeSingle) or an array (list queries), keyed by TABLE_DATA. Good enough
 * to exercise selectionEngine's own orchestration logic — getExclusions and
 * loadCapabilityState are injected directly as functions instead (see
 * arenaIngestion.js's defaultDeps precedent), so this fake never needs to
 * simulate memory_states/submissions queries itself.
 */
function fakeSupabase(TABLE_DATA, { onInsert } = {}) {
  const chain = (table) => {
    const self = {
      select: () => self,
      eq: () => self,
      in: () => self,
      order: () => self,
      maybeSingle: async () => ({ data: TABLE_DATA[table] ?? null, error: null }),
      insert: (row) => {
        onInsert?.(table, row)
        return {
          select: () => ({
            single: async () => ({ data: { id: "event-1", generated_at: "2026-09-02T00:00:00Z" }, error: null }),
          }),
        }
      },
      then: (resolve) => resolve({ data: TABLE_DATA[table] ?? [], error: null }),
    }
    return self
  }
  return { supabaseAdmin: { from: chain } }
}

const STREAM = { id: "stream-1", name: "CSE", slug: "cse" }
const ROLE = { id: "data_engineer", label: "Data Engineer", primary_panel_type: "sql_runner" }

function baseTableData(overrides = {}) {
  return {
    streams: STREAM,
    semesters: [{ id: "sem-1" }],
    semester_subjects: [{ subject_id: "sub-1" }],
    subjects: [{ id: "sub-1" }],
    units: [{ id: "unit-1" }],
    experiments: [
      { id: "e1", title: "Task A", prompt: "p", difficulty: "easy", difficulty_score: null, elo_reward: 10, time_limit_minutes: 30, challenge_type: null, skill_graph_node_id: "comp-1", created_at: "2026-01-01" },
      { id: "e2", title: "Task B", prompt: "p", difficulty: "medium", difficulty_score: null, elo_reward: 20, time_limit_minutes: 30, challenge_type: null, skill_graph_node_id: null, created_at: "2026-01-02" },
    ],
    domain_roles: ROLE,
    domain_missions: [],
    ...overrides,
  }
}

test("selectBestTask: rejects an unknown domain before any query", async () => {
  await assert.rejects(
    () => selectBestTask({ userId: "u1", domain: "nonsense", key: "cse" }),
    (err) => err.statusCode === 400
  )
})

test("selectBestTask: 404s when the stream/role doesn't exist", async () => {
  const deps = {
    ...fakeSupabase({ streams: null }),
    getExclusions: async () => ({ passedIds: new Set() }),
    loadCapabilityState: async () => ({ competencies: [], hasData: false }),
  }
  await assert.rejects(
    () => selectBestTask({ userId: "u1", domain: "college_stream", key: "ghost" }, deps),
    (err) => err.statusCode === 404
  )
})

test("selectBestTask: passed tasks are excluded from selection", async () => {
  let inserted = null
  const deps = {
    ...fakeSupabase(baseTableData(), { onInsert: (table, row) => { inserted = { table, row } } }),
    getExclusions: async () => ({ passedIds: new Set(["e1"]) }), // e1 already passed
    loadCapabilityState: async () => ({ competencies: [], hasData: false }),
  }
  const result = await selectBestTask({ userId: "u1", domain: "college_stream", key: "cse" }, deps)
  assert.equal(result.task.id, "e2") // not e1 — e1 was excluded
  assert.equal(result.taskSource, "existing_verified")
  assert.deepEqual(result.avoidedTaskIds, ["e1"])
  assert.equal(inserted.table, "task_generation_events")
  assert.equal(inserted.row.outcome, "served_existing")
  assert.equal(inserted.row.task_id, "e2")
})

test("selectBestTask: no_suitable_task when every task has been passed and generation is also unavailable (unresolved-failed is a separate, untested-here case handled entirely by taskHistory's own exclusion contract)", async () => {
  const deps = {
    ...fakeSupabase(baseTableData()),
    getExclusions: async () => ({ passedIds: new Set(["e1", "e2"]) }),
    loadCapabilityState: async () => ({ competencies: [], hasData: false }),
    resolveCollegeStreamGenerationContext: async () => ({ ok: false, reason: "no_generation_context" }),
  }
  const result = await selectBestTask({ userId: "u1", domain: "college_stream", key: "cse" }, deps)
  assert.equal(result.taskSource, "no_suitable_task")
  assert.equal(result.task, null)
  assert.match(result.selectionReason, /already been passed/)
})

test("selectBestTask: a failed-but-not-passed task is never excluded (getExclusions only ever returns passed rows — this test documents the contract at the orchestration level)", async () => {
  const deps = {
    ...fakeSupabase(baseTableData()),
    getExclusions: async () => ({ passedIds: new Set() }), // e1 was attempted+failed, never appears here
    loadCapabilityState: async () => ({ competencies: [], hasData: false }),
  }
  const result = await selectBestTask({ userId: "u1", domain: "college_stream", key: "cse" }, deps)
  assert.notEqual(result.task, null)
  assert.ok(["e1", "e2"].includes(result.task.id))
})

test("selectBestTask: zero-competency-tag graceful degradation — no fabricated targetedCompetencies, curriculum-order fallback", async () => {
  const deps = {
    ...fakeSupabase(baseTableData()),
    getExclusions: async () => ({ passedIds: new Set() }),
    loadCapabilityState: async () => ({ competencies: [], hasData: false }), // nothing tagged/reinforced yet
  }
  const result = await selectBestTask({ userId: "u1", domain: "college_stream", key: "cse" }, deps)
  assert.deepEqual(result.targetedCompetencies, [])
  assert.match(result.selectionReason, /no capability evidence recorded yet/)
})

test("selectBestTask: ranks the lower-confidence competency's task first when evidence exists", async () => {
  const data = baseTableData({
    experiments: [
      { id: "e1", title: "High confidence", prompt: "p", difficulty: "easy", difficulty_score: null, elo_reward: 10, time_limit_minutes: 30, challenge_type: null, skill_graph_node_id: "comp-high", created_at: "2026-01-01" },
      { id: "e2", title: "Low confidence", prompt: "p", difficulty: "easy", difficulty_score: null, elo_reward: 10, time_limit_minutes: 30, challenge_type: null, skill_graph_node_id: "comp-low", created_at: "2026-01-02" },
    ],
  })
  const deps = {
    ...fakeSupabase(data),
    getExclusions: async () => ({ passedIds: new Set() }),
    loadCapabilityState: async () => ({
      competencies: [
        { skillGraphNodeId: "comp-high", label: "Strong topic", confidence: 0.9, lastReinforcedAt: null },
        { skillGraphNodeId: "comp-low", label: "Weak topic", confidence: 0.1, lastReinforcedAt: null },
      ],
      hasData: true,
    }),
  }
  const result = await selectBestTask({ userId: "u1", domain: "college_stream", key: "cse" }, deps)
  assert.equal(result.task.id, "e2") // the lower-confidence ("weak topic") task, not the higher-confidence one
  assert.match(result.selectionReason, /Weak topic/)
  assert.equal(result.targetedCompetencies[0].label, "Weak topic")
})

// ── Fresher-safe difficulty tie-break (Arena learning-loop audit, 2026-09-04) ──
// Reproduces, as a fast local test, the exact bug found live in production:
// every currently-seeded domain_role tags 100% of its own tasks to ONE
// shared competency node, so confidence never differentiates between them —
// the tie-break used to be raw creation order, which could (and did) serve
// a brand-new, zero-evidence student a "medium" or "hard" task first.

test("selectBestTask: confidence tied (shared competency node) — a low-ELO student is served the EASIEST eligible task first, not creation order", async () => {
  const data = baseTableData({
    // Deliberately out of easy-first creation order — medium was created
    // first, exactly like the real "data" role in production.
    experiments: [
      { id: "e-medium", title: "Medium task", prompt: "p", difficulty: "medium", difficulty_score: null, elo_reward: 10, time_limit_minutes: 30, challenge_type: null, skill_graph_node_id: "shared-node", created_at: "2026-01-01" },
      { id: "e-easy", title: "Easy task", prompt: "p", difficulty: "easy", difficulty_score: null, elo_reward: 10, time_limit_minutes: 30, challenge_type: null, skill_graph_node_id: "shared-node", created_at: "2026-01-02" },
      { id: "e-hard", title: "Hard task", prompt: "p", difficulty: "hard", difficulty_score: null, elo_reward: 10, time_limit_minutes: 30, challenge_type: null, skill_graph_node_id: "shared-node", created_at: "2026-01-03" },
    ],
    profiles: { elo_rating: 450 }, // Rookie tier
  })
  const deps = {
    ...fakeSupabase(data),
    getExclusions: async () => ({ passedIds: new Set() }),
    loadCapabilityState: async () => ({ competencies: [], hasData: false }), // no evidence yet — every currently-seeded role's actual state
  }
  const result = await selectBestTask({ userId: "u1", domain: "college_stream", key: "cse" }, deps)
  assert.equal(result.task.id, "e-easy", "a brand-new Rookie-tier student must get the easy task first, not whichever was created first")
})

test("selectBestTask: confidence tied — after the easy task is passed, the next pick prefers the NEXT-closest difficulty (medium), not the farthest (hard)", async () => {
  const data = baseTableData({
    experiments: [
      { id: "e-medium", title: "Medium task", prompt: "p", difficulty: "medium", difficulty_score: null, elo_reward: 10, time_limit_minutes: 30, challenge_type: null, skill_graph_node_id: "shared-node", created_at: "2026-01-01" },
      { id: "e-hard", title: "Hard task", prompt: "p", difficulty: "hard", difficulty_score: null, elo_reward: 10, time_limit_minutes: 30, challenge_type: null, skill_graph_node_id: "shared-node", created_at: "2026-01-03" },
    ],
    profiles: { elo_rating: 450 },
  })
  const deps = {
    ...fakeSupabase(data),
    getExclusions: async () => ({ passedIds: new Set(["e-easy"]) }),
    loadCapabilityState: async () => ({ competencies: [], hasData: false }),
  }
  const result = await selectBestTask({ userId: "u1", domain: "college_stream", key: "cse" }, deps)
  assert.equal(result.task.id, "e-medium", "progression should be gradual — never skip straight from easy to hard when a medium option exists")
})

test("selectBestTask: a strong ELO tier with demonstrated confidence in the SPECIFIC competency can be served the hard task over an easier one", async () => {
  const data = baseTableData({
    experiments: [
      { id: "e-easy", title: "Easy task", prompt: "p", difficulty: "easy", difficulty_score: null, elo_reward: 10, time_limit_minutes: 30, challenge_type: null, skill_graph_node_id: "shared-node", created_at: "2026-01-01" },
      { id: "e-hard", title: "Hard task", prompt: "p", difficulty: "hard", difficulty_score: null, elo_reward: 10, time_limit_minutes: 30, challenge_type: null, skill_graph_node_id: "shared-node", created_at: "2026-01-02" },
    ],
    profiles: { elo_rating: 1600 }, // Elite tier
  })
  const deps = {
    ...fakeSupabase(data),
    getExclusions: async () => ({ passedIds: new Set() }),
    // Confidence tied between the two candidate tasks (both tag the same
    // node) — genuinely differing confidence is already covered by the
    // "ranks the lower-confidence competency's task first" test above and
    // must keep winning over this tie-break; this test only exercises the
    // Elite + strong-evidence tie-break path.
    loadCapabilityState: async () => ({
      competencies: [{ skillGraphNodeId: "shared-node", label: "Strong topic", confidence: 0.9, lastReinforcedAt: null }],
      hasData: true,
    }),
  }
  const result = await selectBestTask({ userId: "u1", domain: "college_stream", key: "cse" }, deps)
  assert.equal(result.task.id, "e-hard", "an Elite-tier student with strong demonstrated confidence in this exact competency should be challenged, not kept on easy tasks forever")
})

test("selectBestTask: genuinely differing confidence still wins over the difficulty tie-break (the real gap signal is never overridden)", async () => {
  const data = baseTableData({
    experiments: [
      // The LOW-confidence competency's task is "hard" and the HIGH-
      // confidence competency's task is "easy" — a naive difficulty-first
      // rule would pick the easy one; the correct behavior is still to
      // target the genuine skill gap first.
      { id: "e-easy-strong", title: "Easy, already strong", prompt: "p", difficulty: "easy", difficulty_score: null, elo_reward: 10, time_limit_minutes: 30, challenge_type: null, skill_graph_node_id: "comp-strong", created_at: "2026-01-01" },
      { id: "e-hard-weak", title: "Hard, still weak", prompt: "p", difficulty: "hard", difficulty_score: null, elo_reward: 10, time_limit_minutes: 30, challenge_type: null, skill_graph_node_id: "comp-weak", created_at: "2026-01-02" },
    ],
    profiles: { elo_rating: 450 },
  })
  const deps = {
    ...fakeSupabase(data),
    getExclusions: async () => ({ passedIds: new Set() }),
    loadCapabilityState: async () => ({
      competencies: [
        { skillGraphNodeId: "comp-strong", label: "Strong topic", confidence: 0.9, lastReinforcedAt: null },
        { skillGraphNodeId: "comp-weak", label: "Weak topic", confidence: 0.1, lastReinforcedAt: null },
      ],
      hasData: true,
    }),
  }
  const result = await selectBestTask({ userId: "u1", domain: "college_stream", key: "cse" }, deps)
  assert.equal(result.task.id, "e-hard-weak", "the real skill gap must still be targeted even though it means a harder task for a low-ELO student")
})

test("selectBestTask: domain_role branch reads domain_missions, not experiments", async () => {
  const deps = {
    ...fakeSupabase({
      domain_roles: ROLE,
      domain_missions: [{ id: "m1", title: "SQL Task", prompt: "p", difficulty: "easy", difficulty_score: null, elo_reward: 10, time_limit_minutes: 30, panel_type: "sql_runner", skill_graph_node_id: null, created_at: "2026-01-01" }],
    }),
    getExclusions: async () => ({ passedIds: new Set() }),
    loadCapabilityState: async () => ({ competencies: [], hasData: false }),
  }
  const result = await selectBestTask({ userId: "u1", domain: "domain_role", key: "data_engineer" }, deps)
  assert.equal(result.task.id, "m1")
  assert.equal(result.task.panelType, "sql_runner")
  assert.equal(result.domain, "domain_role")
})

test("selectBestTask: workstation-routing metadata is domain-correct — college_stream never fabricates a panelType", async () => {
  // College Stream doesn't use PANEL_REGISTRY (it has its own inline
  // textarea path) — panelType must be null/absent for it, not guessed,
  // so the frontend never tries to route a College Stream task into a
  // Domain Role workstation component.
  const deps = {
    ...fakeSupabase(baseTableData()),
    getExclusions: async () => ({ passedIds: new Set() }),
    loadCapabilityState: async () => ({ competencies: [], hasData: false }),
  }
  const result = await selectBestTask({ userId: "u1", domain: "college_stream", key: "cse" }, deps)
  assert.equal(result.task.panelType, null)
})

test("selectBestTask: workstation-routing metadata is domain-correct — domain_role always carries a real panelType the frontend's PANEL_REGISTRY understands", async () => {
  const deps = {
    ...fakeSupabase({
      domain_roles: ROLE,
      domain_missions: [{ id: "m1", title: "Node Task", prompt: "p", difficulty: "easy", difficulty_score: null, elo_reward: 10, time_limit_minutes: 30, panel_type: "node_runner", skill_graph_node_id: null, created_at: "2026-01-01" }],
    }),
    getExclusions: async () => ({ passedIds: new Set() }),
    loadCapabilityState: async () => ({ competencies: [], hasData: false }),
  }
  const result = await selectBestTask({ userId: "u1", domain: "domain_role", key: "data_engineer" }, deps)
  // Real PANEL_REGISTRY keys (frontend/.../workspaces/registry.js) —
  // asserting against this exact set catches a drift between the two
  // without importing frontend code into a backend test.
  const KNOWN_PANEL_TYPES = ["sql_runner", "python_runner", "node_runner", "frontend_runner"]
  assert.ok(KNOWN_PANEL_TYPES.includes(result.task.panelType), `panelType "${result.task.panelType}" must be a real, routable PANEL_REGISTRY key`)
})

test("selectBestTask: a provenance-write failure never blocks serving the task", async () => {
  const data = baseTableData()
  const supabaseAdmin = {
    from: (table) => {
      if (table === "task_generation_events") {
        return { insert: () => { throw new Error("db hiccup") } }
      }
      return fakeSupabase(data).supabaseAdmin.from(table)
    },
  }
  const deps = {
    supabaseAdmin,
    logger: fakeLogger().logger,
    getExclusions: async () => ({ passedIds: new Set() }),
    loadCapabilityState: async () => ({ competencies: [], hasData: false }),
  }
  const result = await selectBestTask({ userId: "u1", domain: "college_stream", key: "cse" }, deps)
  assert.notEqual(result.task, null)
  assert.equal(result.provenance, null) // write failed, but the task was still served
})

// ── Checkpoint D-2: generation fallback wiring ──────────────────────────────
//
// NO REAL AI PROVIDER CALL AND NO REAL DATABASE WRITE OCCURS ANYWHERE IN THIS
// SECTION — generateArenaTask/verifyGeneratedTask/checkDuplicate/
// recordFingerprint/persistGeneratedTask/resolveCollegeStreamGenerationContext
// are all injected fakes; supabaseAdmin is the same in-memory fakeSupabase()
// used throughout this file.

const EMPTY_ROLE_DATA = { domain_roles: ROLE, domain_missions: [] } // zero missions -> eligible.length is always 0, forcing the generation path

/** Fake logger that records every call for assertions, matching the real
 *  logger.js's two methods (`warn`/`error`) actually used in selectionEngine.js. */
function fakeLogger() {
  const logCalls = []
  return {
    logCalls,
    logger: {
      info: (message, context) => logCalls.push({ level: "info", message, context }),
      warn: (message, context) => logCalls.push({ level: "warn", message, context }),
      error: (message, context) => logCalls.push({ level: "error", message, context }),
    },
  }
}

function genDeps(overrides = {}) {
  let generateCalls = 0
  const calls = { generate: 0, verify: 0, duplicate: 0, persist: 0, fingerprint: 0 }
  const { logCalls, logger: fakeLog } = fakeLogger()
  return {
    calls,
    logCalls,
    deps: {
      ...fakeSupabase(EMPTY_ROLE_DATA),
      logger: fakeLog,
      getExclusions: async () => ({ passedIds: new Set() }),
      loadCapabilityState: async () => ({ competencies: [], hasData: false }),
      generateArenaTask: async (ctx) => {
        calls.generate++
        generateCalls++
        return overrides.generate ? overrides.generate(generateCalls, ctx) : { ok: true, promptId: "domainRole.sqlMissionGeneration", domain: ctx.domain, panelType: ctx.panelType, task: { title: `Generated ${generateCalls}`, prompt: "Fix the query", referenceQuery: "SELECT 1" }, metadata: { provider: "groq", model: "m1" } }
      },
      verifyGeneratedTask: async (args) => {
        calls.verify++
        return overrides.verify ? overrides.verify(args) : { ok: true, verified: true, reason: null, detail: null, verification: { method: "domain_role_sql_comparison", summary: "ok", details: { actualRowCount: 1 } } }
      },
      checkDuplicate: async (args) => {
        calls.duplicate++
        return overrides.duplicate ? overrides.duplicate(args) : { isDuplicate: false, reason: null, hash: "h", normalized: "n", matchedTaskId: null }
      },
      persistGeneratedTask: async (args) => {
        calls.persist++
        return overrides.persist ? overrides.persist(args) : { ok: true, taskId: "gen-task-1", table: "domain_missions", row: { time_limit_minutes: 8 } }
      },
      recordFingerprint: async (args) => {
        calls.fingerprint++
        return overrides.fingerprint ? overrides.fingerprint(args) : { written: true, reason: null, hash: "h", normalized: "n", matchedTaskId: null }
      },
      resolveCollegeStreamGenerationContext: overrides.resolveContext || (async () => ({ ok: false, reason: "no_generation_context" })),
      resolveFewShotContext: overrides.resolveFewShotContext || (async () => ({ fewShotBlock: "" })),
    },
  }
}

test("D2-A. an existing suitable task is served without ever invoking generation", async () => {
  const { calls, deps } = genDeps()
  const data = { domain_roles: ROLE, domain_missions: [{ id: "m1", title: "Existing", prompt: "p", difficulty: "easy", difficulty_score: null, elo_reward: 10, time_limit_minutes: 30, panel_type: "sql_runner", skill_graph_node_id: null, created_at: "2026-01-01" }] }
  const result = await selectBestTask({ userId: "u1", domain: "domain_role", key: "data_engineer" }, { ...deps, ...fakeSupabase(data) })
  assert.equal(result.taskSource, "existing_verified")
  assert.equal(calls.generate, 0)
})

test("D2-B. no existing task (College Stream) resolves a real generation context and reaches generateArenaTask", async () => {
  let receivedContext = null
  const { calls, deps } = genDeps({
    resolveContext: async () => ({ ok: true, collegeStream: { subjectName: "Data Structures", unitTitle: "Linked Lists" }, meta: { streamId: "s1", subjectId: "sub-1", unitId: "unit-1", coverageCount: 0 } }),
    generate: (n, ctx) => { receivedContext = ctx; return { ok: true, promptId: "collegeStream.experimentGeneration", domain: "college_stream", panelType: null, task: { title: "Gen", prompt: "p", referenceSolution: "print(1)" }, metadata: { provider: "groq", model: "m" } } },
  })
  const data = { ...baseTableData(), experiments: [] }
  const result = await selectBestTask({ userId: "u1", domain: "college_stream", key: "cse" }, { ...deps, ...fakeSupabase(data) })
  assert.equal(calls.generate, 1)
  assert.deepEqual(receivedContext.collegeStream, { subjectName: "Data Structures", unitTitle: "Linked Lists" })
  assert.equal(result.taskSource, "generated")
})

test("F. the fewShotBlock resolveFewShotContext returns actually reaches generateArenaTask's context — for both College Stream and Domain Role", async () => {
  let receivedContextCollege = null
  const { deps: collegeDeps } = genDeps({
    resolveContext: async () => ({ ok: true, collegeStream: { subjectName: "DSA", unitTitle: "Arrays" }, meta: { streamId: "s1", subjectId: "sub-1", unitId: "unit-1", coverageCount: 0 } }),
    resolveFewShotContext: async () => ({ fewShotBlock: "Example 1 (easy):\n  title: Sum Two Numbers\n  prompt: ..." }),
    generate: (n, ctx) => { receivedContextCollege = ctx; return { ok: true, promptId: "collegeStream.experimentGeneration", domain: ctx.domain, panelType: ctx.panelType, task: { title: "Gen", prompt: "p", referenceSolution: "print(1)" }, metadata: { provider: "groq", model: "m" } } },
  })
  await selectBestTask({ userId: "u1", domain: "college_stream", key: "cse" }, { ...collegeDeps, ...fakeSupabase({ ...baseTableData(), experiments: [] }) })
  assert.equal(receivedContextCollege.fewShotBlock, "Example 1 (easy):\n  title: Sum Two Numbers\n  prompt: ...")

  let receivedContextRole = null
  const { deps: roleDeps } = genDeps({
    resolveFewShotContext: async () => ({ fewShotBlock: "Example 1 (easy):\n  title: Fix the Query\n  prompt: ..." }),
    generate: (n, ctx) => { receivedContextRole = ctx; return { ok: true, promptId: "domainRole.sqlMissionGeneration", domain: ctx.domain, panelType: ctx.panelType, task: { title: "T", prompt: "Fix the query", referenceQuery: "SELECT 1" }, metadata: { provider: "groq", model: "m1" } } },
  })
  await selectBestTask({ userId: "u1", domain: "domain_role", key: "data_engineer" }, roleDeps)
  assert.equal(receivedContextRole.fewShotBlock, "Example 1 (easy):\n  title: Fix the Query\n  prompt: ...")
})

test("F. resolveFewShotContext is called with the avoided (passed) task IDs so few-shot examples exclude them too", async () => {
  let receivedArgs = null
  const { deps } = genDeps({
    resolveFewShotContext: async (args) => { receivedArgs = args; return { fewShotBlock: "" } },
  })
  const depsWithHistory = { ...deps, getExclusions: async () => ({ passedIds: new Set(["already-passed-1"]) }) }
  await selectBestTask({ userId: "u1", domain: "domain_role", key: "data_engineer" }, depsWithHistory)
  assert.ok(receivedArgs.avoidedTaskIds.has("already-passed-1"))
  assert.equal(receivedArgs.roleId, "data_engineer")
  assert.equal(receivedArgs.panelType, "sql_runner")
})

test("F. fewShot.js's internal `source` field never reaches the public /next-task API response, even when a fake deliberately returns one — selectionEngine.js destructures only fewShotBlock", async () => {
  const { deps } = genDeps({
    resolveFewShotContext: async () => ({ fewShotBlock: "Example 1 (easy): ...", source: "avoided_fallback" }),
  })
  const result = await selectBestTask({ userId: "u1", domain: "domain_role", key: "data_engineer" }, deps)
  assert.equal(result.taskSource, "generated")
  assert.equal(JSON.stringify(result).includes("avoided_fallback"), false)
  assert.equal(JSON.stringify(result).includes("source"), false)
})

test("D2-C. a missing College Stream generation context never calls the AI provider and falls through to no_suitable_task", async () => {
  const { calls, deps } = genDeps({ resolveContext: async () => ({ ok: false, reason: "no_generation_context", detail: "stream has no linked subjects" }) })
  const data = { ...baseTableData(), experiments: [] }
  const result = await selectBestTask({ userId: "u1", domain: "college_stream", key: "cse" }, { ...deps, ...fakeSupabase(data) })
  assert.equal(calls.generate, 0)
  assert.equal(result.taskSource, "no_suitable_task")
  assert.equal(result.task, null)
})

test("D2-D. first generation attempt succeeds: verify and duplicate-check both run, generated result returned with correct outcome semantics", async () => {
  const { calls, deps } = genDeps()
  const result = await selectBestTask({ userId: "u1", domain: "domain_role", key: "data_engineer" }, deps)
  assert.equal(calls.generate, 1)
  assert.equal(calls.verify, 1)
  assert.equal(calls.duplicate, 1)
  assert.equal(calls.persist, 1)
  assert.equal(calls.fingerprint, 1)
  assert.equal(result.taskSource, "generated")
  assert.equal(result.task.id, "gen-task-1")
  assert.equal(result.task.title, "Generated 1")
  assert.equal(result.provenance.outcome, "generated")
})

// ── Checkpoint D-3: persistence field mapping refinements ──────────────────

test("D3-A. a persistence failure discards the attempt — never returned as generated, never fingerprinted — and a second attempt is tried", async () => {
  const { calls, deps } = genDeps({
    persist: () => ({ ok: false, error: "constraint violation" }),
  })
  const result = await selectBestTask({ userId: "u1", domain: "domain_role", key: "data_engineer" }, deps)
  assert.equal(calls.generate, 2) // both bounded attempts tried
  assert.equal(calls.fingerprint, 0) // never fingerprinted — persistence never succeeded
  assert.equal(result.taskSource, "no_suitable_task")
  assert.equal(result.task, null)
})

test("D3-B. persistence throwing (not just returning ok:false) is treated the same as an ordinary persistence failure — never crashes the request", async () => {
  const { calls, deps } = genDeps({
    persist: () => { throw new Error("unexpected db error") },
  })
  const result = await selectBestTask({ userId: "u1", domain: "domain_role", key: "data_engineer" }, deps)
  assert.equal(calls.generate, 2)
  assert.equal(calls.fingerprint, 0)
  assert.equal(result.taskSource, "no_suitable_task")
})

test("D3-C. the competency target identified for generation is passed through to persistGeneratedTask as skillGraphNodeId", async () => {
  let receivedSkillGraphNodeId = "not set"
  const { deps } = genDeps({
    persist: (args) => { receivedSkillGraphNodeId = args.skillGraphNodeId; return { ok: true, taskId: "gen-task-1", table: "domain_missions", row: { time_limit_minutes: 8 } } },
  })
  const depsWithCompetency = {
    ...deps,
    loadCapabilityState: async () => ({ competencies: [{ skillGraphNodeId: "node-weak", label: "Weak topic", confidence: 0.1, lastReinforcedAt: null }], hasData: true }),
  }
  await selectBestTask({ userId: "u1", domain: "domain_role", key: "data_engineer" }, depsWithCompetency)
  assert.equal(receivedSkillGraphNodeId, "node-weak")
})

test("D3-D. no competency evidence yet — skillGraphNodeId is passed through as null, never fabricated", async () => {
  let receivedSkillGraphNodeId = "not set"
  const { deps } = genDeps({
    persist: (args) => { receivedSkillGraphNodeId = args.skillGraphNodeId; return { ok: true, taskId: "gen-task-1", table: "domain_missions", row: { time_limit_minutes: 8 } } },
  })
  await selectBestTask({ userId: "u1", domain: "domain_role", key: "data_engineer" }, deps) // genDeps' default loadCapabilityState returns competencies: []
  assert.equal(receivedSkillGraphNodeId, null)
})

test("D3-E. a fingerprint recording failure does not cause an invalid success response — the already-persisted, already-verified task is still served as generated", async () => {
  const { calls, deps } = genDeps({
    fingerprint: () => { throw new Error("fingerprint table unavailable") },
  })
  const result = await selectBestTask({ userId: "u1", domain: "domain_role", key: "data_engineer" }, deps)
  assert.equal(calls.persist, 1) // persistence succeeded once — never retried just because fingerprinting failed afterward
  assert.equal(result.taskSource, "generated")
  assert.equal(result.task.id, "gen-task-1")
})

test("D3-F. task_generation_events records the correct outcome for every provenance path, and never overwrites historical_backfill rows (this code path never targets or updates task_generation_events rows — it only ever inserts new ones)", async () => {
  const insertedRows = []
  const { deps } = genDeps()
  const supabase = fakeSupabase(EMPTY_ROLE_DATA, { onInsert: (table, row) => { if (table === "task_generation_events") insertedRows.push(row) } })
  await selectBestTask({ userId: "u1", domain: "domain_role", key: "data_engineer" }, { ...deps, ...supabase })
  assert.equal(insertedRows.length, 1)
  assert.equal(insertedRows[0].outcome, "generated")
  // This orchestration path only ever calls .insert() on task_generation_events —
  // never .update()/.delete() — so a prior historical_backfill row for a
  // different task_id/task_type is structurally unreachable from here.
})

test("D3-G. task_generation_events.task_id references the exact real id persistGeneratedTask returned, not a temporary or guessed value", async () => {
  let insertedTaskId = null
  const { deps } = genDeps({
    persist: () => ({ ok: true, taskId: "real-persisted-id-99", table: "domain_missions", row: { time_limit_minutes: 8 } }),
  })
  const supabase = fakeSupabase(EMPTY_ROLE_DATA, { onInsert: (table, row) => { if (table === "task_generation_events") insertedTaskId = row.task_id } })
  const result = await selectBestTask({ userId: "u1", domain: "domain_role", key: "data_engineer" }, { ...deps, ...supabase })
  assert.equal(result.task.id, "real-persisted-id-99")
  assert.equal(insertedTaskId, "real-persisted-id-99")
})

test("D3-H. provider metadata is preserved on the provenance event when generateArenaTask actually returns it", async () => {
  let insertedProvider = "not set"
  const { deps } = genDeps({
    generate: (n, ctx) => ({ ok: true, promptId: "domainRole.sqlMissionGeneration", domain: ctx.domain, panelType: ctx.panelType, task: { title: "T", prompt: "Fix the query", referenceQuery: "SELECT 1" }, metadata: { provider: "groq", model: "some-real-model" } }),
  })
  const supabase = fakeSupabase(EMPTY_ROLE_DATA, { onInsert: (table, row) => { if (table === "task_generation_events") insertedProvider = row.provider } })
  await selectBestTask({ userId: "u1", domain: "domain_role", key: "data_engineer" }, { ...deps, ...supabase })
  assert.equal(insertedProvider, "groq")
})

test("D3-I. provider metadata is never fabricated when generateArenaTask doesn't return it — recorded as null, not guessed", async () => {
  let insertedProvider = "not set"
  const { deps } = genDeps({
    generate: (n, ctx) => ({ ok: true, promptId: "domainRole.sqlMissionGeneration", domain: ctx.domain, panelType: ctx.panelType, task: { title: "T", prompt: "Fix the query", referenceQuery: "SELECT 1" }, metadata: {} }), // no provider field at all
  })
  const supabase = fakeSupabase(EMPTY_ROLE_DATA, { onInsert: (table, row) => { if (table === "task_generation_events") insertedProvider = row.provider } })
  await selectBestTask({ userId: "u1", domain: "domain_role", key: "data_engineer" }, { ...deps, ...supabase })
  assert.equal(insertedProvider, null)
})

test("D2-E. first attempt fails, second succeeds: exactly two generation calls total, result is regenerated", async () => {
  const { calls, deps } = genDeps({
    generate: (n, ctx) => n === 1
      ? { ok: false, promptId: "domainRole.sqlMissionGeneration", domain: ctx.domain, panelType: ctx.panelType, reason: "provider_error", detail: "transient failure" }
      : { ok: true, promptId: "domainRole.sqlMissionGeneration", domain: ctx.domain, panelType: ctx.panelType, task: { title: `Generated ${n}`, prompt: "Fix the query", referenceQuery: "SELECT 1" }, metadata: { provider: "groq", model: "m1" } },
  })
  const result = await selectBestTask({ userId: "u1", domain: "domain_role", key: "data_engineer" }, deps)
  assert.equal(calls.generate, 2)
  assert.equal(result.taskSource, "regenerated")
  assert.equal(result.task.title, "Generated 2")
})

test("D2-F. a verification failure discards the attempt — no failed task is ever returned — and a second attempt is tried", async () => {
  const { calls, deps } = genDeps({
    verify: () => ({ ok: false, verified: false, reason: "verification_failed", detail: "claimed result doesn't match" }),
  })
  const result = await selectBestTask({ userId: "u1", domain: "domain_role", key: "data_engineer" }, deps)
  assert.equal(calls.generate, 2) // both bounded attempts tried
  assert.equal(calls.persist, 0) // never persisted — verification never passed
  assert.equal(result.taskSource, "no_suitable_task")
  assert.equal(result.task, null)
})

test("D2-G. a duplicate/fingerprint rejection discards the attempt — duplicate content is never returned — and a second attempt is tried", async () => {
  const { calls, deps } = genDeps({
    duplicate: () => ({ isDuplicate: true, reason: "exact_fingerprint_match", hash: "h", normalized: "n", matchedTaskId: "existing-1" }),
  })
  const result = await selectBestTask({ userId: "u1", domain: "domain_role", key: "data_engineer" }, deps)
  assert.equal(calls.generate, 2)
  assert.equal(calls.persist, 0)
  assert.equal(result.taskSource, "no_suitable_task")
})

test("D2-H. both attempts fail and no safe fallback exists: honest no_suitable_task, never labeled fallback", async () => {
  const { calls, deps } = genDeps({ generate: () => ({ ok: false, reason: "provider_error", detail: "down" }) })
  const result = await selectBestTask({ userId: "u1", domain: "domain_role", key: "data_engineer" }, deps)
  assert.equal(calls.generate, 2)
  assert.equal(result.taskSource, "no_suitable_task")
  assert.equal(result.task, null)
})

test("D2-H2. pickFallbackTask itself: serves the first safe candidate when one is available, proving the fallback mechanism (see selectionEngine.js's pickFallbackTask doc comment for why the live pool is empty today)", async () => {
  const { pickFallbackTask } = await import("./selectionEngine.js")
  const candidate = { id: "safe-1", title: "Safe fallback", prompt: "p", difficulty: "easy", panel_type: "sql_runner", time_limit_minutes: 20 }
  assert.equal(pickFallbackTask([candidate]), candidate)
  assert.equal(pickFallbackTask([]), null)
})

test("D2-I. a provider failure on every attempt is bounded (never an infinite loop) and never leaks a raw provider payload into the response", async () => {
  const rawPayload = { some: "raw provider internals", apiKey: "sk-should-never-appear" }
  const { calls, deps } = genDeps({ generate: () => ({ ok: false, reason: "provider_error", detail: "AI generation failed", raw: rawPayload }) })
  const result = await selectBestTask({ userId: "u1", domain: "domain_role", key: "data_engineer" }, deps)
  assert.equal(calls.generate, 2) // bounded — not a loop
  const serialized = JSON.stringify(result)
  assert.equal(serialized.includes("sk-should-never-appear"), false)
  assert.equal(serialized.includes("raw provider internals"), false)
})

test("D2-J. the College Stream query path uses semester_subjects and never queries subjects.semester_id", async () => {
  const eqCalls = []
  const data = baseTableData()
  const supabaseAdmin = {
    from: (table) => {
      const self = {
        select: () => self,
        eq: (col, val) => { eqCalls.push({ table, col, val }); return self },
        in: () => self,
        order: () => self,
        maybeSingle: async () => ({ data: data[table] ?? null, error: null }),
        then: (resolve) => resolve({ data: data[table] ?? [], error: null }),
      }
      return self
    },
  }
  const deps = {
    supabaseAdmin,
    logger: fakeLogger().logger,
    getExclusions: async () => ({ passedIds: new Set() }),
    loadCapabilityState: async () => ({ competencies: [], hasData: false }),
  }
  await selectBestTask({ userId: "u1", domain: "college_stream", key: "cse" }, deps)
  assert.ok(eqCalls.some((c) => c.table === "semesters" && c.col === "stream_id")) // semesters looked up by stream_id
  assert.equal(eqCalls.some((c) => c.table === "subjects" && c.col === "semester_id"), false) // the stale relationship is never queried
})

test("D2-K. event outcome semantics: served_existing, generated, regenerated, and fallback are each recorded with the matching outcome", async () => {
  // served_existing — already covered by the earlier "passed tasks are excluded" test (asserts inserted.row.outcome === "served_existing").
  const { deps: generatedDeps } = genDeps()
  let insertedOutcome = null
  const generatedSupabase = fakeSupabase(EMPTY_ROLE_DATA, { onInsert: (table, row) => { if (table === "task_generation_events") insertedOutcome = row.outcome } })
  const generatedResult = await selectBestTask({ userId: "u1", domain: "domain_role", key: "data_engineer" }, { ...generatedDeps, ...generatedSupabase })
  assert.equal(generatedResult.taskSource, "generated")
  assert.equal(insertedOutcome, "generated")

  const { deps: regeneratedDeps } = genDeps({
    generate: (n, ctx) => n === 1
      ? { ok: false, reason: "provider_error", detail: "fail once" }
      : { ok: true, promptId: "domainRole.sqlMissionGeneration", domain: ctx.domain, panelType: ctx.panelType, task: { title: "T", prompt: "Fix the query", referenceQuery: "SELECT 1" }, metadata: { provider: "groq", model: "m1" } },
  })
  insertedOutcome = null
  const regeneratedSupabase = fakeSupabase(EMPTY_ROLE_DATA, { onInsert: (table, row) => { if (table === "task_generation_events") insertedOutcome = row.outcome } })
  const regeneratedResult = await selectBestTask({ userId: "u1", domain: "domain_role", key: "data_engineer" }, { ...regeneratedDeps, ...regeneratedSupabase })
  assert.equal(regeneratedResult.taskSource, "regenerated")
  assert.equal(insertedOutcome, "regenerated")
})

// ── Checkpoint E: workstation panel-routing verification for every ──────────
// generated task category. The exact set the frontend's PANEL_REGISTRY
// (frontend/src/pages/arenaCollegeStream/workspaces/registry.js) supports —
// asserting against this literal list catches drift between the two without
// importing frontend code into a backend test (same discipline the existing
// "workstation-routing metadata is domain-correct" test above already uses).
const KNOWN_WORKSTATION_PANEL_TYPES = ["sql_runner", "python_runner", "node_runner", "frontend_runner"]

for (const panelType of KNOWN_WORKSTATION_PANEL_TYPES) {
  test(`E-panel-routing (${panelType}): a generated task for this panel type returns a response the existing workstation can open unchanged`, async () => {
    const role = { id: "role-1", label: "Role", primary_panel_type: panelType }
    const { deps } = genDeps({
      generate: (n, ctx) => ({ ok: true, promptId: "x", domain: ctx.domain, panelType: ctx.panelType, task: { title: "T", prompt: "P", referenceQuery: "SELECT 1" }, metadata: { provider: "groq", model: "m1" } }),
    })
    const supabase = fakeSupabase({ domain_roles: role, domain_missions: [] })
    const result = await selectBestTask({ userId: "u1", domain: "domain_role", key: "role-1" }, { ...deps, ...supabase })
    assert.equal(result.taskSource, "generated")
    // Exactly the shape openDomainMission()/PANEL_REGISTRY[mission.panel_type]
    // needs: a real id (for the detail-reload fetch) and a panelType that
    // resolves to a real registered workspace component — never a
    // generated-only field, never a special-cased shape.
    assert.equal(typeof result.task.id, "string")
    assert.equal(result.task.panelType, panelType)
    assert.ok(KNOWN_WORKSTATION_PANEL_TYPES.includes(result.task.panelType))
  })
}

test("E-panel-routing: an unsupported/unregistered panel type is never served as a generated task — selectionEngine correctly treats generateArenaTask's real rejection contract as a failed attempt", async () => {
  const role = { id: "role-1", label: "Role", primary_panel_type: "carrier_pigeon" }
  // generateArenaTask's real, already-unit-tested behavior for an unknown
  // panel type (taskGeneration.test.js #6b: "rejected without calling the
  // AI boundary at all") is {ok:false, reason:"unsupported_domain_or_panel_type"}
  // — simulated here (rather than re-proving promptResolver's own logic) to
  // verify THIS file's handling of that contract: the attempt is discarded,
  // never persisted, never fingerprinted, never served.
  const { calls, deps } = genDeps({
    generate: (n, ctx) => ({ ok: false, promptId: null, domain: ctx.domain, panelType: ctx.panelType, reason: "unsupported_domain_or_panel_type", detail: `no generation prompt registered for domain_role panel_type "${ctx.panelType}"` }),
  })
  const supabase = fakeSupabase({ domain_roles: role, domain_missions: [] })
  const result = await selectBestTask({ userId: "u1", domain: "domain_role", key: "role-1" }, { ...deps, ...supabase })
  assert.equal(calls.generate, 2) // both bounded attempts tried and both correctly rejected
  assert.equal(calls.persist, 0)
  assert.equal(result.taskSource, "no_suitable_task")
  assert.equal(result.task, null)
})

// ── Checkpoint E: immediate-open vs. persisted-reload data equivalence ──────
// The generation pipeline returns the task inline in the API response, but
// the frontend's openExperiment/openDomainMission always re-fetch full
// detail by id (see ArenaCollegeStream.jsx) — so "immediate open" and
// "reloaded open" are structurally the SAME code path, not two. This test
// proves the one field that path depends on (a real, persisted id) is
// always present and real, never a temporary/in-memory-only value.
test("E-reload. the id returned for a generated task is the real persisted database id, not a temporary in-memory value — safe for a later detail-route reload", async () => {
  const { deps } = genDeps({
    persist: () => ({ ok: true, taskId: "real-db-row-42", table: "domain_missions", row: { time_limit_minutes: 8 } }),
  })
  const result = await selectBestTask({ userId: "u1", domain: "domain_role", key: "data_engineer" }, deps)
  assert.equal(result.task.id, "real-db-row-42") // exactly what persistGeneratedTask's real insert().select("id") would return
})

// ── Checkpoint G-1: sanitized internal rejection observability ─────────────
// NO API/RESPONSE SHAPE CHANGE — every test below also asserts the returned
// `result` is byte-identical in shape to the equivalent pre-G-1 rejection
// tests (D2-F/D2-G/etc.); logging is a pure side channel via deps.logger.

test("G1-generation. a generation rejection logs a sanitized diagnostic with the exact required fields, once per rejected attempt", async () => {
  const { logCalls, deps } = genDeps({
    generate: () => ({ ok: false, promptId: "domainRole.sqlMissionGeneration", reason: "provider_error", detail: "AI generation failed" }),
  })
  const result = await selectBestTask({ userId: "u1", domain: "domain_role", key: "data_engineer" }, deps)
  const rejections = logCalls.filter((c) => c.context?.stage === "generation_rejected")
  assert.equal(rejections.length, 2) // both bounded attempts rejected
  assert.equal(rejections[0].level, "warn")
  assert.deepEqual(Object.keys(rejections[0].context).sort(), ["attemptNumber", "detail", "promptId", "reason", "stage"])
  assert.equal(rejections[0].context.reason, "provider_error")
  assert.equal(rejections[0].context.detail, "AI generation failed")
  assert.equal(rejections[0].context.promptId, "domainRole.sqlMissionGeneration")
  assert.equal(rejections[0].context.attemptNumber, 1)
  assert.equal(rejections[1].context.attemptNumber, 2)
  assert.equal(result.taskSource, "no_suitable_task") // unchanged rejection behavior
})

test("G1-verification. a verification rejection logs a sanitized diagnostic with the exact required fields, never the full generated task", async () => {
  const { logCalls, deps } = genDeps({
    verify: () => ({ ok: false, verified: false, reason: "verification_failed", detail: "claimed result doesn't match", verification: null, task: { title: "should never appear", prompt: "should never appear", referenceQuery: "SELECT secret" } }),
  })
  const result = await selectBestTask({ userId: "u1", domain: "domain_role", key: "data_engineer" }, deps)
  const rejections = logCalls.filter((c) => c.context?.stage === "verification_rejected")
  assert.equal(rejections.length, 2)
  assert.deepEqual(Object.keys(rejections[0].context).sort(), ["attemptNumber", "detail", "reason", "stage"])
  assert.equal(rejections[0].context.reason, "verification_failed")
  assert.equal(rejections[0].context.detail, "claimed result doesn't match")
  assert.equal("task" in rejections[0].context, false)
  assert.equal(JSON.stringify(rejections).includes("should never appear"), false)
  assert.equal(JSON.stringify(rejections).includes("SELECT secret"), false)
  assert.equal(result.taskSource, "no_suitable_task")
})

test("G1-duplicate. a duplicate rejection logs a sanitized diagnostic with the exact required fields, never the normalized generated text", async () => {
  const { logCalls, deps } = genDeps({
    duplicate: () => ({ isDuplicate: true, reason: "near_duplicate_prompt", hash: "abc123hash", normalized: "this is the full normalized generated title and prompt text that must never be logged", matchedTaskId: "existing-task-9" }),
  })
  const result = await selectBestTask({ userId: "u1", domain: "domain_role", key: "data_engineer" }, deps)
  const rejections = logCalls.filter((c) => c.context?.stage === "duplicate_rejected")
  assert.equal(rejections.length, 2)
  assert.deepEqual(Object.keys(rejections[0].context).sort(), ["attemptNumber", "hash", "matchedTaskId", "reason", "stage"])
  assert.equal(rejections[0].context.reason, "near_duplicate_prompt")
  assert.equal(rejections[0].context.matchedTaskId, "existing-task-9")
  assert.equal(rejections[0].context.hash, "abc123hash")
  assert.equal("normalized" in rejections[0].context, false)
  assert.equal(JSON.stringify(rejections).includes("full normalized generated title"), false)
  assert.equal(result.taskSource, "no_suitable_task")
})

test("G1-success. no rejection diagnostics are logged at all when the first attempt succeeds", async () => {
  const { logCalls, deps } = genDeps()
  const result = await selectBestTask({ userId: "u1", domain: "domain_role", key: "data_engineer" }, deps)
  assert.equal(result.taskSource, "generated")
  assert.equal(logCalls.filter((c) => ["generation_rejected", "verification_rejected", "duplicate_rejected"].includes(c.context?.stage)).length, 0)
})

test("G1-no-leak. G-1 logging changes no observable field of the API response — response shape is identical to the pre-G-1 rejection contract", async () => {
  const { deps } = genDeps({
    verify: () => ({ ok: false, verified: false, reason: "verification_failed", detail: "x" }),
  })
  const result = await selectBestTask({ userId: "u1", domain: "domain_role", key: "data_engineer" }, deps)
  assert.deepEqual(Object.keys(result).sort(), ["avoidedTaskIds", "difficulty", "domain", "provenance", "role", "selectionReason", "task", "taskSource", "targetedCompetencies"].sort())
  assert.equal(JSON.stringify(result).includes("stage"), false)
  assert.equal(JSON.stringify(result).includes("verification_rejected"), false)
})

// ── pickGenerationDifficulty (Fix 5, 2026-09-04) — pure, no DI needed ───────

test("pickGenerationDifficulty: a low-ELO / new user (Rookie) always gets easy, never intimidating", () => {
  assert.equal(pickGenerationDifficulty({ eloRating: 400, competencyConfidence: null }), "easy")
  assert.equal(pickGenerationDifficulty({ eloRating: 400, competencyConfidence: 0.95 }), "easy",
    "even with strong confidence, a Rookie should not be jumped past easy")
})

test("pickGenerationDifficulty: mid-tier (Practitioner/Expert) only reaches medium once there's real demonstrated confidence in THIS competency", () => {
  assert.equal(pickGenerationDifficulty({ eloRating: 900, competencyConfidence: null }), "easy")
  assert.equal(pickGenerationDifficulty({ eloRating: 900, competencyConfidence: 0.5 }), "easy")
  assert.equal(pickGenerationDifficulty({ eloRating: 900, competencyConfidence: 0.8 }), "medium")
})

test("pickGenerationDifficulty: high-ELO (Master/Elite) never jumps straight to hard without strong specific-skill evidence", () => {
  assert.equal(pickGenerationDifficulty({ eloRating: 1600, competencyConfidence: null }), "medium",
    "a high overall rating alone must not unlock hard — that requires evidence for the targeted skill specifically")
  assert.equal(pickGenerationDifficulty({ eloRating: 1600, competencyConfidence: 0.5 }), "medium")
  assert.equal(pickGenerationDifficulty({ eloRating: 1600, competencyConfidence: 0.9 }), "hard")
})

test("pickGenerationDifficulty: never returns 'expert' — that stays reserved for hand-authored content, not AI generation", () => {
  const results = [
    pickGenerationDifficulty({ eloRating: 2000, competencyConfidence: 1 }),
    pickGenerationDifficulty({ eloRating: 9999, competencyConfidence: 0.99 }),
  ]
  assert.ok(results.every(d => d !== "expert"))
})

test("pickGenerationDifficulty: a missing/undefined ELO defaults conservatively to Rookie behavior (easy) — matches the prior hardcoded default when no profile data is available", () => {
  assert.equal(pickGenerationDifficulty({ eloRating: undefined, competencyConfidence: null }), "easy")
})

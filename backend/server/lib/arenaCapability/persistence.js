/**
 * persistence.js — Arena Capability Engine, Phase 3, Checkpoint D-3.
 * ---------------------------------------------------------------------------
 * The explicit, schema-safe mapping seam selectionEngine.js calls after a
 * generated task has passed verification and duplicate checking. Each
 * mapper below is a small, individually named, individually testable pure
 * function that lists every inserted field by hand — never `{ ...task }` or
 * any other broad spread of the AI's Zod-validated output. Only a caller-
 * built, already-allowlisted object (`task`/`verification` field references
 * picked one at a time) ever reaches an insert.
 *
 * Every field mapped below — and every constant (ELO_REWARD_BY_DIFFICULTY,
 * TIME_LIMIT_BY_DIFFICULTY, the rubric shapes, tier/challenge_type/category,
 * `source: "ai_generated"`) — was cross-checked against BOTH the already-
 * live offline insert code (scripts/generate{CollegeStreamContent,
 * DomainRoleMissions,Python,Node,Frontend}DomainMissions.mjs) AND the real
 * evaluator/serving code that reads these rows back (Checkpoint D-3 read-
 * only inspection):
 *   - experiments.rubric: lib/collegeStream/pythonSandbox.js's
 *     evaluatePythonStdout() reads rubric.expected_stdout/timeout_ms/
 *     usePackages directly — confirmed by reading that function.
 *   - domain_missions.rubric: lib/domainRole/executeMission.js reads
 *     rubric.timeout_ms/usePackages/checks; lib/domainRole/evaluateMission.js
 *     reads rubric.expected_stdout; routes/arenaDomainRole.js's mission
 *     serializer reads rubric.starter_code/starter_query/html — confirmed by
 *     reading each. `starterQuery`/`starterCode`/`html`/`checks` have NO
 *     dedicated top-level column (confirmed live via a direct schema
 *     query this checkpoint) — folding them into the `rubric` jsonb column
 *     is not a workaround, it's the same place the real evaluator/serializer
 *     already looks for them.
 *   - domain_missions.expected_result/match_mode/dataset: read as top-level
 *     columns directly by evaluateMission.js's evaluateSqlExactMatch — never
 *     nested in rubric for SQL.
 *   - `company`/`manager`/`sprint` on domain_missions ARE real top-level
 *     columns (unlike starter_query/starter_code) — confirmed via the live
 *     schema query below.
 *   - `skill_graph_node_id` and `difficulty_score` exist as real columns on
 *     BOTH tables (confirmed live) but no existing insert path (offline
 *     scripts included) ever populates `difficulty_score` — it's filled by
 *     a separate future scoring pass, not fabricated here from the coarse
 *     easy/medium/hard label. `skill_graph_node_id` IS populated below when
 *     the caller has a real competency target on hand (selectionEngine
 *     already computes one for ranking) — more accurate than today's
 *     existing-content path, which only gets tagged later by a separate
 *     backfill script (scripts/backfillTaskCompetencies.mjs).
 *
 * Live schema confirmed this checkpoint (read-only query against the
 * `capabilio` Supabase project):
 *   experiments:      category, challenge_type, created_at, difficulty,
 *     difficulty_score, elo_reward, estimated_minutes, id, prompt,
 *     reference_solution, rubric, skill_graph_node_id, source, tier,
 *     time_limit_minutes, title, unit_id
 *   domain_missions:  company, created_at, dataset, difficulty,
 *     difficulty_score, domain_role_id, elo_reward, estimated_minutes,
 *     expected_result, id, manager, match_mode, panel_type, prompt,
 *     reference_solution, rubric, skill_graph_node_id, source, sprint,
 *     time_limit_minutes, title
 * No starter_query/starter_code/html/checks/company(on experiments) column
 * exists on either table — every mapper below sticks to exactly this list.
 */
import { supabaseAdmin } from "../supabase.js"

export const defaultDeps = { supabaseAdmin }

const ELO_REWARD_BY_DIFFICULTY = { easy: 5, medium: 8, hard: 12 }
const TIME_LIMIT_BY_DIFFICULTY = { easy: 8, medium: 12, hard: 15 }

// Student-facing grading timeout baked into the persisted rubric — distinct
// from the (longer) generation-time verification timeout in verification.js,
// exactly as the offline scripts already separate the two.
const COLLEGE_STREAM_RUBRIC_TIMEOUT_MS = 3000 // scripts/generateCollegeStreamContent.mjs literal
const DOMAIN_ROLE_PYTHON_RUBRIC_TIMEOUT_MS = 15000 // scripts/generatePythonDomainMissions.mjs PYTHON_TIMEOUT_MS
const DOMAIN_ROLE_NODE_RUBRIC_TIMEOUT_MS = 5000 // scripts/generateNodeDomainMissions.mjs NODE_TIMEOUT_MS

function safeCompanyField(value, fallback) {
  return String(value || "").slice(0, 100) || fallback
}

/**
 * College Stream: maps a generated+verified experiment task to the exact
 * `experiments` insert payload. Pure — no I/O.
 *
 * @param {{ task: {title, prompt, referenceSolution}, verification: {verification:{details:{expectedStdout}}},
 *   difficulty: "easy"|"medium"|"hard", unitId: string, subjectName: string, skillGraphNodeId?: string|null }} args
 * @returns {object} an `experiments` row, allowlisted field-by-field
 */
export function mapGeneratedExperimentToInsert({ task, verification, difficulty, unitId, subjectName, skillGraphNodeId = null }) {
  return {
    unit_id: unitId,
    title: task.title.trim(),
    prompt: task.prompt.trim(),
    difficulty,
    rubric: {
      type: "python_stdout_match",
      timeout_ms: COLLEGE_STREAM_RUBRIC_TIMEOUT_MS,
      expected_stdout: verification.verification.details.expectedStdout,
    },
    reference_solution: task.referenceSolution,
    elo_reward: ELO_REWARD_BY_DIFFICULTY[difficulty],
    time_limit_minutes: TIME_LIMIT_BY_DIFFICULTY[difficulty],
    estimated_minutes: TIME_LIMIT_BY_DIFFICULTY[difficulty],
    tier: "foundation",
    challenge_type: "coding",
    category: subjectName,
    source: "ai_generated",
    skill_graph_node_id: skillGraphNodeId,
    // difficulty_score intentionally omitted — see file header.
  }
}

function mapSqlMissionToInsert({ task, difficulty, domainRoleId, skillGraphNodeId }) {
  return {
    domain_role_id: domainRoleId,
    panel_type: "sql_runner",
    title: task.title.trim(),
    prompt: task.prompt.trim(),
    difficulty,
    elo_reward: ELO_REWARD_BY_DIFFICULTY[difficulty],
    time_limit_minutes: TIME_LIMIT_BY_DIFFICULTY[difficulty],
    estimated_minutes: TIME_LIMIT_BY_DIFFICULTY[difficulty],
    company: safeCompanyField(task.company, "Capabilio Partner Co."),
    manager: safeCompanyField(task.manager, "Team Lead"),
    sprint: safeCompanyField(task.sprint, "Week 1"),
    dataset: task.dataset,
    expected_result: task.expected_result,
    match_mode: task.match_mode,
    rubric: { starter_query: task.starterQuery, requirements: task.requirements, acceptance_criteria: task.acceptanceCriteria },
    reference_solution: task.referenceQuery,
    source: "ai_generated",
    skill_graph_node_id: skillGraphNodeId,
  }
}

function mapPythonMissionToInsert({ task, verification, difficulty, domainRoleId, skillGraphNodeId }) {
  return {
    domain_role_id: domainRoleId,
    panel_type: "python_runner",
    title: task.title.trim(),
    prompt: task.prompt.trim(),
    difficulty,
    elo_reward: ELO_REWARD_BY_DIFFICULTY[difficulty],
    time_limit_minutes: TIME_LIMIT_BY_DIFFICULTY[difficulty],
    estimated_minutes: TIME_LIMIT_BY_DIFFICULTY[difficulty],
    company: safeCompanyField(task.company, "Capabilio Partner Co."),
    manager: safeCompanyField(task.manager, "Team Lead"),
    sprint: safeCompanyField(task.sprint, "Week 1"),
    rubric: {
      type: "python_stdout_match",
      timeout_ms: DOMAIN_ROLE_PYTHON_RUBRIC_TIMEOUT_MS,
      usePackages: task.usePackages,
      expected_stdout: verification.verification.details.expectedStdout,
      starter_code: task.starterCode,
      requirements: task.requirements,
      acceptance_criteria: task.acceptanceCriteria,
    },
    reference_solution: task.referenceSolution,
    source: "ai_generated",
    skill_graph_node_id: skillGraphNodeId,
  }
}

function mapNodeMissionToInsert({ task, verification, difficulty, domainRoleId, skillGraphNodeId }) {
  return {
    domain_role_id: domainRoleId,
    panel_type: "node_runner",
    title: task.title.trim(),
    prompt: task.prompt.trim(),
    difficulty,
    elo_reward: ELO_REWARD_BY_DIFFICULTY[difficulty],
    time_limit_minutes: TIME_LIMIT_BY_DIFFICULTY[difficulty],
    estimated_minutes: TIME_LIMIT_BY_DIFFICULTY[difficulty],
    company: safeCompanyField(task.company, "Capabilio Partner Co."),
    manager: safeCompanyField(task.manager, "Team Lead"),
    sprint: safeCompanyField(task.sprint, "Week 1"),
    rubric: {
      type: "node_stdout_match",
      timeout_ms: DOMAIN_ROLE_NODE_RUBRIC_TIMEOUT_MS,
      expected_stdout: verification.verification.details.expectedStdout,
      starter_code: task.starterCode,
      requirements: task.requirements,
      acceptance_criteria: task.acceptanceCriteria,
    },
    reference_solution: task.referenceSolution,
    source: "ai_generated",
    skill_graph_node_id: skillGraphNodeId,
  }
}

function mapFrontendMissionToInsert({ task, difficulty, domainRoleId, skillGraphNodeId }) {
  return {
    domain_role_id: domainRoleId,
    panel_type: "frontend_runner",
    title: task.title.trim(),
    prompt: task.prompt.trim(),
    difficulty,
    elo_reward: ELO_REWARD_BY_DIFFICULTY[difficulty],
    time_limit_minutes: TIME_LIMIT_BY_DIFFICULTY[difficulty],
    estimated_minutes: TIME_LIMIT_BY_DIFFICULTY[difficulty],
    company: safeCompanyField(task.company, "Capabilio Partner Co."),
    manager: safeCompanyField(task.manager, "Team Lead"),
    sprint: safeCompanyField(task.sprint, "Week 1"),
    rubric: {
      type: "css_rule_match",
      html: task.html,
      checks: task.checks,
      starter_code: task.starterCss,
      requirements: task.requirements,
      acceptance_criteria: task.acceptanceCriteria,
    },
    reference_solution: task.referenceCss,
    source: "ai_generated",
    skill_graph_node_id: skillGraphNodeId,
  }
}

const DOMAIN_MISSION_MAPPER_BY_PANEL_TYPE = {
  sql_runner: mapSqlMissionToInsert,
  python_runner: mapPythonMissionToInsert,
  node_runner: mapNodeMissionToInsert,
  frontend_runner: mapFrontendMissionToInsert,
}

/**
 * Domain Role: maps a generated+verified mission task to the exact
 * `domain_missions` insert payload for the given panel type. Pure — no I/O.
 *
 * @param {{ task: object, verification: object, difficulty: "easy"|"medium"|"hard",
 *   panelType: string, domainRoleId: string, skillGraphNodeId?: string|null }} args
 * @returns {object} a `domain_missions` row, allowlisted field-by-field
 */
export function mapGeneratedDomainMissionToInsert({ task, verification, difficulty, panelType, domainRoleId, skillGraphNodeId = null }) {
  const mapper = DOMAIN_MISSION_MAPPER_BY_PANEL_TYPE[panelType]
  if (!mapper) {
    throw new Error(`persistence.mapGeneratedDomainMissionToInsert: no schema-safe mapping registered for domain_role panel_type "${panelType}"`)
  }
  return mapper({ task, verification, difficulty, domainRoleId, skillGraphNodeId })
}

/**
 * Inserts the mapped row. Never throws for an ordinary mapping/insert
 * failure — returns {ok:false} so the caller (selectionEngine's bounded
 * retry loop) treats it the same as a failed generation/verification/dedup
 * attempt: the attempt is discarded, never returned as generated, never
 * fingerprinted.
 *
 * @returns {Promise<{ok:true, taskId:string, table:string, row:object} | {ok:false, error:string}>}
 */
export async function persistGeneratedTask({ domain, panelType, task, verification, difficulty, collegeStreamMeta, domainRoleId, skillGraphNodeId = null }, deps = defaultDeps) {
  let table, row
  try {
    if (domain === "college_stream") {
      table = "experiments"
      row = mapGeneratedExperimentToInsert({ task, verification, difficulty, unitId: collegeStreamMeta.unitId, subjectName: collegeStreamMeta.subjectName, skillGraphNodeId })
    } else {
      table = "domain_missions"
      row = mapGeneratedDomainMissionToInsert({ task, verification, difficulty, panelType, domainRoleId, skillGraphNodeId })
    }
  } catch (err) {
    return { ok: false, error: err.message }
  }

  const { data, error } = await deps.supabaseAdmin.from(table).insert(row).select("id").single()
  if (error) return { ok: false, error: error.message }

  return { ok: true, taskId: data.id, table, row }
}

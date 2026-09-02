/**
 * fewShot.js — Arena Capability Engine, Phase 3, Checkpoint F.
 * ---------------------------------------------------------------------------
 * Resolves `fewShotBlock` for a live generation request — the one variable
 * every registered generation prompt already declares and interpolates
 * verbatim (see lib/ai/prompts/{collegeStream,domainRole}.js's own
 * `buildMessages`), but which selectionEngine.js has never populated since
 * Checkpoint D-2 (confirmed by grep — zero occurrences before this file).
 * taskGeneration.js's own ArenaGenerationContext typedef already predicted
 * the consequence: "empty string is structurally valid but yields generic
 * content." Two independent live smoke tests this checkpoint (Domain Role
 * Frontend, Domain Role SQL) support this as the most likely cause of an
 * observed near-duplicate rejection pattern.
 *
 * Existing production-proven pattern reused, not invented: the College
 * Stream offline script (scripts/generateCollegeStreamContent.mjs) already
 * does a LIVE fetch of real shipped experiments for its few-shot block
 * ("real, live CSE experiments — style/shape examples only"). Every Domain
 * Role offline script instead uses a static hardcoded example, because at
 * bulk-seed time no role-specific missions existed yet to draw from. At
 * RUNTIME, real role/panel-scoped missions already exist (this is precisely
 * why generation is even needed — the pool ran out for THIS student, not
 * that the role has zero content) — so the live-fetch pattern is the
 * correct one to extend to Domain Role too, scoped to the exact role and
 * panel type, which the offline scripts had no need to do.
 *
 * Examples are STYLE/FORMAT guidance only — every prompt says "matching the
 * style of these real, already-shipped examples", never "avoid repeating
 * this content". Anti-duplication remains entirely the job of dedup.js's
 * post-generation checkDuplicate, unchanged by this file.
 *
 * STRUCTURAL DEADLOCK FIX: generation only fires when 100% of a scope's
 * existing tasks are already avoided/passed (selectBestTask's Path 2
 * precondition) — so a first version of this file that excluded avoided
 * tasks from the few-shot pool too was guaranteed to see an empty pool
 * exactly when generation was needed (confirmed live: a real, organically-
 * fully-cleared "frontend" role produced an empty fewShotBlock even after
 * this file shipped). Fixed with an explicit two-stage rule, applied at
 * each scope level before ever widening scope:
 *   1. Prefer non-avoided tasks in the exact same scope.
 *   2. If none exist, fall back to avoided/passed tasks from that SAME
 *      scope as style-only examples — they are still real, still
 *      evaluator-compatible, shipped content; only the SERVING eligibility
 *      rule (selectionEngine.js's `eligible`/`passedIds`, entirely separate
 *      from this file) continues to exclude them from ever being handed
 *      back to a student. This file has no bearing on what gets served.
 */
import { supabaseAdmin } from "../supabase.js"
import { wordOverlapRatio } from "./dedup.js"

export const defaultDeps = { supabaseAdmin }

const MAX_EXAMPLES = 2 // small, bounded — matches the offline scripts' own scale (1-3 examples)
const NEAR_DUPLICATE_EXAMPLE_THRESHOLD = 0.75 // reuses dedup.js's own established threshold, not a new one

/** Greedy diversity filter: walk candidates in their given (deterministic)
 *  order, keep one only if its prompt isn't a near-duplicate of one already
 *  kept. Reuses dedup.js's existing wordOverlapRatio — no new algorithm. */
function pickDiverseExamples(candidates, max) {
  const chosen = []
  for (const c of candidates) {
    if (chosen.length >= max) break
    const isNearDupOfChosen = chosen.some((k) => wordOverlapRatio(k.prompt, c.prompt) >= NEAR_DUPLICATE_EXAMPLE_THRESHOLD)
    if (!isNearDupOfChosen) chosen.push(c)
  }
  return chosen
}

/**
 * The two-stage rule, applied once per scope level: prefer non-avoided rows
 * from `scopedRows`; only when that pool is empty (but the scope itself
 * genuinely has rows) fall back to the avoided ones as style-only examples.
 * Returns `{chosen: [], source: "none"}` (never throws) when `scopedRows`
 * itself is empty — the caller decides whether to widen scope in that case.
 *
 * `source` is purely internal bookkeeping (which stage actually supplied
 * the examples) — never exposed through the public API. selectionEngine.js
 * destructures only `fewShotBlock` from resolveFewShotContext's result, so
 * this field flows no further than a caller who explicitly asks for it
 * (e.g. a read-only preflight check).
 *
 * @returns {{ chosen: object[], source: "non_avoided"|"avoided_fallback"|"none" }}
 */
function selectFewShotExamples(scopedRows, avoidedTaskIds) {
  if (!scopedRows.length) return { chosen: [], source: "none" }
  const nonAvoided = scopedRows.filter((r) => !avoidedTaskIds.has(r.id))
  if (nonAvoided.length) return { chosen: pickDiverseExamples(nonAvoided, MAX_EXAMPLES), source: "non_avoided" }
  // Fallback: same-scope avoided/passed tasks, style-only — never re-queried,
  // just a different subset of the exact same already-scoped result set.
  return { chosen: pickDiverseExamples(scopedRows, MAX_EXAMPLES), source: "avoided_fallback" }
}

function formatCollegeStreamBlock(examples) {
  return examples
    .map((e, i) => `Example ${i + 1} (${e.difficulty}):
  title: ${e.title}
  prompt: ${e.prompt}
  reference_solution:
${e.reference_solution}
  expected_stdout: ${e.rubric?.expected_stdout ?? ""}`)
    .join("\n\n")
}

function formatSqlBlock(examples) {
  return examples
    .map((e, i) => `Example ${i + 1} (${e.difficulty}):
  title: ${e.title}
  prompt: ${e.prompt}
  dataset: ${JSON.stringify(e.dataset)}
  referenceQuery: ${e.reference_solution}
  expected_result: ${JSON.stringify(e.expected_result)}
  match_mode: ${e.match_mode}`)
    .join("\n\n")
}

function formatStdoutMatchBlock(examples) {
  // Shared shape for python_runner/node_runner — both mappers persist
  // rubric.starter_code + rubric.expected_stdout identically.
  return examples
    .map((e, i) => `Example ${i + 1} (${e.difficulty}):
  title: ${e.title}
  prompt: ${e.prompt}
  starterCode (BUGGY — this is what ships in the editor):
${e.rubric?.starter_code ?? ""}
  expected_stdout after the fix: ${e.rubric?.expected_stdout ?? ""}`)
    .join("\n\n")
}

function formatFrontendBlock(examples) {
  return examples
    .map((e, i) => `Example ${i + 1} (${e.difficulty}):
  title: ${e.title}
  prompt: ${e.prompt}
  html: ${e.rubric?.html ?? ""}
  starterCss (BROKEN — this is what ships in the editor): ${e.rubric?.starter_code ?? ""}
  referenceCss (the fix): ${e.reference_solution}`)
    .join("\n\n")
}

const DOMAIN_MISSION_FORMATTER_BY_PANEL_TYPE = {
  sql_runner: formatSqlBlock,
  python_runner: formatStdoutMatchBlock,
  node_runner: formatStdoutMatchBlock,
  frontend_runner: formatFrontendBlock,
}

/**
 * College Stream: prefers examples from the resolved unit itself (the
 * exact context generation is targeting); falls back to sibling units of
 * the same resolved subject if the unit has none yet; returns an empty
 * block if the subject genuinely has no examples anywhere. Never queries
 * outside the resolved subject — never a cross-subject/cross-stream example.
 * At each scope level, prefers non-avoided examples but falls back to
 * avoided/passed ones from that SAME scope (never a wider one) as
 * style-only examples if that level has rows but none are eligible.
 *
 * @param {{ unitId: string, subjectId: string, avoidedTaskIds?: Set<string> }} args
 */
export async function resolveCollegeStreamFewShot({ unitId, subjectId, avoidedTaskIds = new Set() }, deps = defaultDeps) {
  const FIELDS = "id, title, difficulty, prompt, reference_solution, rubric, unit_id, created_at"

  const { data: unitExamples, error: unitErr } = await deps.supabaseAdmin
    .from("experiments").select(FIELDS).eq("unit_id", unitId).order("created_at")
  if (unitErr) throw unitErr

  let { chosen, source } = selectFewShotExamples(unitExamples || [], avoidedTaskIds)

  if (!chosen.length) {
    const { data: siblingUnits, error: siblingErr } = await deps.supabaseAdmin
      .from("units").select("id").eq("subject_id", subjectId)
    if (siblingErr) throw siblingErr
    const siblingUnitIds = (siblingUnits || []).map((u) => u.id)
    if (siblingUnitIds.length) {
      const { data: subjectExamples, error: subjErr } = await deps.supabaseAdmin
        .from("experiments").select(FIELDS).in("unit_id", siblingUnitIds).order("created_at")
      if (subjErr) throw subjErr
      ;({ chosen, source } = selectFewShotExamples(subjectExamples || [], avoidedTaskIds))
    }
  }

  if (!chosen.length) return { fewShotBlock: "", source: "none" }
  return { fewShotBlock: formatCollegeStreamBlock(chosen), source }
}

/**
 * Domain Role: examples are strictly scoped to the exact role AND exact
 * panel type generation is targeting — never a sibling role, never a
 * different panel type, even within the same role. Returns an empty block
 * if this role/panel-type combination genuinely has no examples yet.
 * Prefers non-avoided examples but falls back to avoided/passed ones from
 * this SAME role+panelType scope as style-only examples if the scope has
 * rows but none are eligible (the structural-deadlock fix — see file
 * header: generation is only ever attempted once 100% of a role's missions
 * are already avoided, so requiring non-avoided examples here always
 * produced an empty pool exactly when generation needed them most).
 *
 * @param {{ roleId: string, panelType: string, avoidedTaskIds?: Set<string> }} args
 */
export async function resolveDomainRoleFewShot({ roleId, panelType, avoidedTaskIds = new Set() }, deps = defaultDeps) {
  const formatter = DOMAIN_MISSION_FORMATTER_BY_PANEL_TYPE[panelType]
  if (!formatter) return { fewShotBlock: "", source: "none" } // no registered format for this panel type — safe, empty, never guessed

  const FIELDS = "id, title, difficulty, prompt, dataset, expected_result, match_mode, reference_solution, rubric, created_at"
  const { data, error } = await deps.supabaseAdmin
    .from("domain_missions").select(FIELDS).eq("domain_role_id", roleId).eq("panel_type", panelType).order("created_at")
  if (error) throw error

  const { chosen, source } = selectFewShotExamples(data || [], avoidedTaskIds)
  if (!chosen.length) return { fewShotBlock: "", source: "none" }
  return { fewShotBlock: formatter(chosen), source }
}

/**
 * Single entry point selectionEngine.js calls — dispatches by domain.
 * Never throws for ordinary "no examples exist" — only for a genuine
 * database error, matching every sibling module's convention
 * (contextResolution.js, taskHistory.js, profileService.js).
 *
 * @param {{ domain: "college_stream"|"domain_role", panelType?: string|null,
 *   unitId?: string, subjectId?: string, roleId?: string, avoidedTaskIds?: Set<string> }} args
 * @returns {Promise<{ fewShotBlock: string, source: "non_avoided"|"avoided_fallback"|"none" }>}
 *   `source` is internal-only bookkeeping — selectionEngine.js's real call
 *   site destructures only `fewShotBlock`, so it never reaches the public
 *   API response.
 */
export async function resolveFewShotContext({ domain, panelType, unitId, subjectId, roleId, avoidedTaskIds = new Set() }, deps = defaultDeps) {
  if (domain === "college_stream") {
    return resolveCollegeStreamFewShot({ unitId, subjectId, avoidedTaskIds }, deps)
  }
  return resolveDomainRoleFewShot({ roleId, panelType, avoidedTaskIds }, deps)
}

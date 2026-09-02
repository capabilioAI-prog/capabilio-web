/**
 * contextResolution.js — Arena Capability Engine, Phase 3, Checkpoint D-1.
 * ---------------------------------------------------------------------------
 * Resolves the concrete { subjectName, unitTitle } context
 * taskGeneration.js's `collegeStream.experimentGeneration` variable builder
 * requires (see taskGeneration.js's VARIABLE_BUILDERS — it returns `null`,
 * a hard "missing_context" failure, without it). Competency tagging is
 * coarse (one node per whole stream, per backfillTaskCompetencies.mjs), so
 * there is no finer-grained signal to pick a subject/unit from — this
 * module exists specifically to fill that gap deterministically, never by
 * guessing.
 *
 * CORRECTED RELATIONSHIP (verified against live schema + the actual
 * production route before writing this file, not assumed): subjects are
 * NOT owned 1:1 by a semester via `subjects.semester_id` — that column
 * exists but is stale/unreliable (confirmed both live and by
 * backend/server/routes/arenaCollegeStream.js's own comment: "subjects can
 * be shared across multiple semesters... subjects.semester_id only ever
 * reflected one arbitrary owner"). The authoritative relationship is the
 * `semester_subjects` join table, exactly as that route's own
 * `getSubjectsForSemesters`/`getStreamExperimentIds` helpers already use.
 * Those helpers are private to that route file (not exported), so the same
 * join is replicated here rather than modifying that unrelated file.
 *
 * KNOWN GAP FLAGGED, NOT FIXED HERE: `selectionEngine.js`'s
 * `loadCollegeStreamTasks` (Phase 2) queries `subjects.semester_id`
 * directly — the same stale relationship this file deliberately avoids.
 * That is a latent, pre-existing correctness gap in already-shipped
 * Phase 2 code, out of scope for this checkpoint (selectionEngine.js is
 * explicitly not to be touched here) — see the Checkpoint D-1 report.
 *
 * `units.subject_id` and `experiments.unit_id` ARE plain, reliable direct
 * foreign keys (confirmed live — zero null values in either column) —
 * only the subject<->semester link needed the join-table correction.
 */
import { supabaseAdmin } from "../supabase.js"

export const defaultDeps = { supabaseAdmin }

/** Deterministic tie-break: coverage_count ASC, then subject id ASC, then
 *  unit id ASC — exact ordering, so identical DB state always produces the
 *  same pick. UUIDs sort lexicographically, which is stable but arbitrary;
 *  "stable" here means reproducible, not semantically meaningful, exactly
 *  as asked for. */
function compareCandidates(a, b) {
  if (a.coverageCount !== b.coverageCount) return a.coverageCount - b.coverageCount
  if (a.subject.id !== b.subject.id) return a.subject.id < b.subject.id ? -1 : 1
  return a.unit.id < b.unit.id ? -1 : 1
}

/**
 * @param {{ streamSlug: string, exclusions?: Set<string> }} args
 *   `exclusions` (optional): experiment ids the requesting student has
 *   already passed — used ONLY as a soft pre-filter (prefer units that
 *   aren't fully exhausted for this student), never as a sort key, per the
 *   "do not over-engineer / minimum safe version" instruction. Omitting it
 *   entirely still produces a correct, deterministic result.
 * @param {typeof defaultDeps} deps
 * @returns {Promise<
 *   {ok:true, collegeStream:{subjectName:string, unitTitle:string}, meta:{streamId,subjectId,unitId,coverageCount}}
 *   | {ok:false, reason:"no_generation_context", detail:string}
 * >}
 */
export async function resolveCollegeStreamGenerationContext({ streamSlug, exclusions = new Set() }, deps = defaultDeps) {
  if (!streamSlug) {
    return { ok: false, reason: "no_generation_context", detail: "streamSlug is required" }
  }

  const { data: stream, error: streamErr } = await deps.supabaseAdmin
    .from("streams").select("id, name, slug").eq("slug", streamSlug).maybeSingle()
  if (streamErr) throw streamErr
  if (!stream) return { ok: false, reason: "no_generation_context", detail: `stream "${streamSlug}" not found` }

  const { data: semesters, error: semErr } = await deps.supabaseAdmin
    .from("semesters").select("id").eq("stream_id", stream.id)
  if (semErr) throw semErr
  if (!semesters?.length) return { ok: false, reason: "no_generation_context", detail: "stream has no semesters" }

  // Authoritative subject<->semester relationship — see file header.
  const semesterIds = semesters.map((s) => s.id)
  const { data: links, error: linkErr } = await deps.supabaseAdmin
    .from("semester_subjects").select("subject_id").in("semester_id", semesterIds)
  if (linkErr) throw linkErr
  if (!links?.length) return { ok: false, reason: "no_generation_context", detail: "stream has no linked subjects" }

  const subjectIds = [...new Set(links.map((l) => l.subject_id))]
  const { data: subjects, error: subErr } = await deps.supabaseAdmin
    .from("subjects").select("id, name").in("id", subjectIds)
  if (subErr) throw subErr
  if (!subjects?.length) return { ok: false, reason: "no_generation_context", detail: "linked subjects could not be resolved" }

  const { data: units, error: unitErr } = await deps.supabaseAdmin
    .from("units").select("id, title, subject_id").in("subject_id", subjectIds)
  if (unitErr) throw unitErr
  if (!units?.length) return { ok: false, reason: "no_generation_context", detail: "stream's subjects have no units" }

  const { data: experiments, error: expErr } = await deps.supabaseAdmin
    .from("experiments").select("id, unit_id").in("unit_id", units.map((u) => u.id))
  if (expErr) throw expErr

  const experimentsByUnit = new Map() // unit_id -> experiment ids
  for (const e of experiments || []) {
    if (!experimentsByUnit.has(e.unit_id)) experimentsByUnit.set(e.unit_id, [])
    experimentsByUnit.get(e.unit_id).push(e.id)
  }

  const subjectById = new Map(subjects.map((s) => [s.id, s]))
  const candidates = units
    .map((unit) => {
      const subject = subjectById.get(unit.subject_id)
      if (!subject) return null // a unit whose subject wasn't in this stream's link set — cannot happen given the query above, guarded anyway
      const unitExperimentIds = experimentsByUnit.get(unit.id) || []
      return {
        unit, subject,
        coverageCount: unitExperimentIds.length,
        isExhaustedForStudent: unitExperimentIds.length > 0 && unitExperimentIds.every((id) => exclusions.has(id)),
      }
    })
    .filter(Boolean)

  if (!candidates.length) {
    return { ok: false, reason: "no_generation_context", detail: "no valid subject/unit candidates in this stream" }
  }

  // Soft pre-filter only (never a sort key) — prefer units with at least
  // one not-yet-passed experiment, or no experiments at all (fresh
  // territory); fall back to the full candidate list if every unit is
  // fully exhausted for this student, rather than failing outright.
  const notExhausted = candidates.filter((c) => !c.isExhaustedForStudent)
  const pool = notExhausted.length ? notExhausted : candidates

  const [chosen] = pool.sort(compareCandidates)

  return {
    ok: true,
    collegeStream: { subjectName: chosen.subject.name, unitTitle: chosen.unit.title },
    meta: { streamId: stream.id, subjectId: chosen.subject.id, unitId: chosen.unit.id, coverageCount: chosen.coverageCount },
  }
}

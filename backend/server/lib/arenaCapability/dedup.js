/**
 * dedup.js — Arena Capability Engine, Phase 3, Checkpoint C.
 * ---------------------------------------------------------------------------
 * Consolidates the normalization + near-duplicate logic already copy-pasted
 * identically across all 5 offline generator scripts
 * (scripts/generate{CollegeStreamContent,DomainRoleMissions,Python
 * DomainMissions,NodeDomainMissions,FrontendDomainMissions}.mjs — verified
 * by reading each; `normalizeForDedup`/`wordOverlapRatio`/0.75 threshold are
 * byte-for-byte identical in every one) into one shared module, per the
 * Phase 1 design report's own flagged consolidation item. Not a new
 * algorithm — the exact existing one.
 *
 * The hash function itself (crypto sha256 hex of normalized content) has no
 * prior dedup-specific precedent (the offline scripts never hashed — they
 * do an O(n) word-overlap scan against every existing row in memory, which
 * doesn't work against a DB table looked up at request time). The SAME
 * `crypto.createHash("sha256").update(x).digest("hex")` pattern already
 * exists elsewhere in this codebase for exactly this "stable content
 * fingerprint" purpose — see lib/mentorMarketplace/idempotency.js,
 * lib/verification/auditLog.js — reused here, not invented.
 */
import crypto from "crypto"
import { supabaseAdmin } from "../supabase.js"

export const defaultDeps = { supabaseAdmin }

export const NEAR_DUPLICATE_THRESHOLD = 0.75 // matches every existing offline generator script exactly

/** Identical to every offline script's normalizeForDedup(text). */
export function normalizeForDedup(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim()
}

/** Identical to every offline script's wordOverlapRatio(a, b). */
export function wordOverlapRatio(a, b) {
  const wa = new Set(normalizeForDedup(a).split(" ").filter(Boolean))
  const wb = new Set(normalizeForDedup(b).split(" ").filter(Boolean))
  if (wa.size === 0 || wb.size === 0) return 0
  let shared = 0
  for (const w of wa) if (wb.has(w)) shared++
  return shared / Math.min(wa.size, wb.size)
}

// Which fields carry user-visible semantic content, per task shape — never
// provider, model, timestamp, requestId, or any other provenance/metadata
// field. title+prompt exist on every generation schema
// (Experiment/Mission/Sql/Python/Node/FrontendMissionSchema all declare
// both) and are exactly what a student reads to understand the task, so
// they're what "materially different tasks" actually means here. html/css/
// dataset are layout/fixture details, not the semantic ask itself, and are
// deliberately excluded — two tickets with the same ask but different
// realistic company names or dataset rows should still collapse.
function semanticContentOf(task) {
  return `${task?.title || ""}\n${task?.prompt || ""}`
}

/**
 * Deterministic, stable across whitespace/case/punctuation differences
 * (via normalizeForDedup), never includes volatile metadata.
 * @returns {{ normalized: string, hash: string }}
 */
export function computeFingerprint(task) {
  const normalized = normalizeForDedup(semanticContentOf(task))
  const hash = crypto.createHash("sha256").update(normalized).digest("hex")
  return { normalized, hash }
}

/**
 * Exact-duplicate lookup against task_content_fingerprints.
 * Read-only. Does not write anything.
 */
export async function findFingerprintByHash({ taskType, normalizedHash }, deps = defaultDeps) {
  const { data, error } = await deps.supabaseAdmin
    .from("task_content_fingerprints")
    .select("id, task_id, task_type, normalized_hash")
    .eq("task_type", taskType)
    .eq("normalized_hash", normalizedHash)
    .maybeSingle()
  if (error) throw error
  return data || null
}

/**
 * Full duplicate check: exact hash match against task_content_fingerprints,
 * plus (optionally) near-duplicate word-overlap against a caller-supplied
 * list of "relevant existing tasks" — this module does NOT decide what's
 * relevant (that would make it a second recommendation engine); the caller
 * (Checkpoint D's selectionEngine, which already has the eligible task list
 * in hand) supplies `compareAgainst`.
 *
 * @param {{ taskType: "experiment"|"domain_mission", task: {title,prompt,...}, compareAgainst?: Array<{id,title,prompt}> }} args
 * @returns {Promise<{ isDuplicate: boolean, reason: string|null, hash: string, normalized: string, matchedTaskId: string|null }>}
 */
export async function checkDuplicate({ taskType, task, compareAgainst = [] }, deps = defaultDeps) {
  const { normalized, hash } = computeFingerprint(task)

  const exactMatch = await findFingerprintByHash({ taskType, normalizedHash: hash }, deps)
  if (exactMatch) {
    return { isDuplicate: true, reason: "exact_fingerprint_match", hash, normalized, matchedTaskId: exactMatch.task_id }
  }

  for (const existing of compareAgainst) {
    if (normalizeForDedup(existing.title) === normalizeForDedup(task.title)) {
      return { isDuplicate: true, reason: "duplicate_title", hash, normalized, matchedTaskId: existing.id }
    }
    if (wordOverlapRatio(existing.prompt, task.prompt) >= NEAR_DUPLICATE_THRESHOLD) {
      return { isDuplicate: true, reason: "near_duplicate_prompt", hash, normalized, matchedTaskId: existing.id }
    }
  }

  return { isDuplicate: false, reason: null, hash, normalized, matchedTaskId: null }
}

/**
 * Writes a fingerprint row — ONLY for a task that has already passed
 * verification and duplicate checking. Callers must not call this for a
 * failed/invalid/duplicate candidate; this function does not re-verify
 * anything itself (single responsibility — see selectionEngine's
 * Checkpoint D orchestration for the actual ordering guarantee).
 *
 * CONCURRENCY: task_content_fingerprints has UNIQUE(task_type, task_id) —
 * confirmed live — which prevents a second fingerprint row for the SAME
 * task_id, but there is NO unique constraint on normalized_hash itself, so
 * two different task_ids racing to insert the same hash concurrently is NOT
 * prevented by the schema today. This function re-checks by hash
 * immediately before inserting to shrink that window, but this is a
 * best-effort mitigation, not a guarantee — a genuine concurrent duplicate
 * insert (two students independently generating near-identical content for
 * the same competency within milliseconds of each other) can still land
 * two fingerprint rows with the same hash. Documented, not silently
 * assumed solved. A real fix would require a `unique(normalized_hash)`
 * constraint or a partial index — a schema change explicitly out of scope
 * for Checkpoint C.
 */
export async function recordFingerprint({ taskType, taskId, task }, deps = defaultDeps) {
  const { normalized, hash } = computeFingerprint(task)

  const recheck = await findFingerprintByHash({ taskType, normalizedHash: hash }, deps)
  if (recheck) {
    return { written: false, reason: "exact_fingerprint_match", hash, normalized, matchedTaskId: recheck.task_id }
  }

  const { error } = await deps.supabaseAdmin
    .from("task_content_fingerprints")
    .insert({ task_type: taskType, task_id: taskId, normalized_hash: hash })
  if (error) {
    // A concurrent insert for the SAME task_id would violate the real
    // unique(task_type, task_id) constraint (Postgres code 23505) — that
    // case is expected and safe (someone else's fingerprint already exists
    // for this exact task), not a failure to surface upward as an error.
    if (error.code === "23505") {
      return { written: false, reason: "concurrent_insert_same_task", hash, normalized, matchedTaskId: taskId }
    }
    throw error
  }

  return { written: true, reason: null, hash, normalized, matchedTaskId: null }
}

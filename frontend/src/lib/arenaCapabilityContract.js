/**
 * arenaCapabilityContract.js — Arena Capability Engine, Checkpoint E.
 * ---------------------------------------------------------------------------
 * Pure, framework-free helpers for the GET /api/arena/capability/next-task
 * response contract — no Vite `import.meta.env`, no Supabase client, so
 * (like api/schemaVersion.js) this can be unit-tested under plain
 * `node --test`, unlike api.js itself.
 *
 * The response's `task` is a real, persisted, already-verified row
 * regardless of `taskSource` ("existing_verified" | "generated" |
 * "regenerated" | "fallback" are all equally real; only
 * "no_suitable_task" has `task: null`). Checkpoint E found that the caller
 * (ArenaCollegeStream.jsx's goToCapabilityNextTask) used to gate on
 * `taskSource === "existing_verified"` only, which silently discarded every
 * real generated/regenerated/fallback task as "no suitable task available" —
 * exactly the kind of frontend/backend contract gap this checkpoint exists
 * to close. The fix is this single source-agnostic predicate, used instead
 * of any taskSource comparison.
 */
export function isOpenableCapabilityTask(res) {
  return !!res?.task
}

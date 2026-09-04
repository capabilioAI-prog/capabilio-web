/**
 * skillGraphSync.js — the bridge between memory_states (the real evidence
 * ledger reinforce() writes to) and profiles.skill_graph (the JSON blob
 * Aura's radar/Portfolio/StudentHome all actually read).
 * ---------------------------------------------------------------------------
 * Root cause this closes (Arena evidence/proficiency fix, 2026-09-04):
 * memoryEngine.reinforce() already existed and was already the correct,
 * evidence-weighted model, but nothing ever propagated its result into
 * profiles.skill_graph — so a reinforced skill_graph_node and the user-facing
 * Radar/Strengths/Weak Areas view could drift apart indefinitely. Rather than
 * rewrite Aura.jsx/Portfolio.jsx/StudentHome.jsx to read a new data source
 * (a much larger, riskier change touching actively-rendered dashboard code),
 * profiles.skill_graph becomes a MATERIALIZED PROJECTION of memory_states,
 * kept in sync here after every reinforcement event, from any source.
 *
 * HONESTY CONTRACT (same discipline as profileService.js's loadCapabilityState):
 *   - Never invents a skill_graph entry. Only updates an entry whose label
 *     already exists in profiles.skill_graph AND has a matching
 *     skill_graph_nodes row with a real, non-null memory_states.confidence.
 *   - An untouched skill (no memory_states row yet) is left exactly as-is —
 *     its onboarding-derived value is not silently overwritten with a
 *     fabricated default.
 *   - Only writes profiles when something actually changed (skill_graph
 *     values, or the derived strengths/weak_areas ranking) — "recompute
 *     strengths and weak areas ... when the ranking genuinely changes", not
 *     on every call.
 *
 * Strengths/weak-areas derivation deliberately reuses the exact top-3/
 * bottom-3-by-value pattern Aura.jsx's own AIInterviewPanel.evaluateInterview
 * already uses when it updates skillGraph/strengths/weakAreas after a mock
 * interview (frontend/src/pages/Aura.jsx) — not a new algorithm, so the two
 * evidence sources (Arena, interview) agree on what "your strengths" means.
 */
import { supabaseAdmin } from "../supabase.js"
import { loadCapabilityState } from "../arenaCapability/profileService.js"

export const defaultDeps = { supabaseAdmin, loadCapabilityState }

const TOP_N = 3

/**
 * Pure — given the current skill_graph array and a Map<label, confidence 0-1>
 * of nodes that actually have evidence, returns a NEW array with only the
 * matching entries' value updated (unrelated entries untouched, no
 * duplicates ever added), plus whether anything actually changed.
 */
export function applyConfidenceToSkillGraph(skillGraph, confidenceByLabel) {
  let changed = false
  const next = (skillGraph || []).map(entry => {
    const label = entry.label || entry.skill
    if (!label || !confidenceByLabel.has(label)) return entry
    const newValue = Math.round(confidenceByLabel.get(label) * 100)
    const currentValue = entry.value ?? entry.score ?? entry.percentage ?? 0
    if (newValue === currentValue) return entry
    changed = true
    return { ...entry, value: newValue, score: newValue }
  })
  return { skillGraph: next, changed }
}

/** Pure — same top-3/bottom-3-by-value derivation Aura's interview flow
 *  already uses. Returns plain label arrays, matching that existing shape. */
export function deriveStrengthsAndWeakAreas(skillGraph) {
  const sorted = [...(skillGraph || [])]
    .filter(s => (s.value ?? s.score) != null)
    .sort((a, b) => (b.value ?? b.score) - (a.value ?? a.score))
  const strengths = sorted.slice(0, TOP_N).map(s => s.label || s.skill).filter(Boolean)
  const weakAreas = sorted.slice(-TOP_N).reverse().map(s => s.label || s.skill).filter(Boolean)
  return { strengths, weakAreas }
}

/** Pure — shallow array-of-strings equality, order-sensitive (ranking order
 *  IS the signal — "top strength" moving to "second strength" is a genuine
 *  ranking change worth writing, even if the same 3 labels are involved). */
function sameOrder(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
  return a.every((v, i) => v === b[i])
}

/**
 * syncSkillGraphFromMemoryStates — call after any reinforce() for this user,
 * for the domainKey the reinforced node belongs to. Best-effort: never
 * throws (matches recordArenaHistory/bumpProfileElo's established
 * "secondary display record, non-fatal on failure" convention in
 * arenaDomainRole.js/arenaCollegeStream.js) — callers should await it but
 * never let its failure roll back the reinforcement that already succeeded.
 */
export async function syncSkillGraphFromMemoryStates({ userId, domainKey }, deps = defaultDeps) {
  try {
    if (!userId || !domainKey) return { ok: false, reason: "missing_userId_or_domainKey" }

    const { competencies, hasData } = await deps.loadCapabilityState({ userId, domainKey })
    if (!hasData) return { ok: true, skipped: "no_reinforced_competencies_yet" }

    const { data: profile, error: profileErr } = await deps.supabaseAdmin
      .from("profiles").select("skill_graph, strengths, weak_areas").eq("id", userId).maybeSingle()
    if (profileErr) throw profileErr
    if (!profile?.skill_graph?.length) return { ok: true, skipped: "no_skill_graph_on_profile" }

    const confidenceByLabel = new Map(
      competencies.filter(c => c.confidence != null).map(c => [c.label, c.confidence])
    )
    if (confidenceByLabel.size === 0) return { ok: true, skipped: "no_confidence_values_yet" }

    const { skillGraph: nextSkillGraph, changed: graphChanged } =
      applyConfidenceToSkillGraph(profile.skill_graph, confidenceByLabel)
    if (!graphChanged) return { ok: true, skipped: "no_value_change" }

    const { strengths: nextStrengths, weakAreas: nextWeakAreas } = deriveStrengthsAndWeakAreas(nextSkillGraph)
    const patch = { skill_graph: nextSkillGraph, updated_at: new Date().toISOString() }
    // Only touch strengths/weak_areas when the ranking genuinely changed —
    // never replace a richer, resume/quiz-derived description with a plain
    // label unless the ordering actually moved.
    if (nextStrengths.length && !sameOrder(nextStrengths, profile.strengths)) patch.strengths = nextStrengths
    if (nextWeakAreas.length && !sameOrder(nextWeakAreas, profile.weak_areas)) patch.weak_areas = nextWeakAreas

    const { error: updateErr } = await deps.supabaseAdmin.from("profiles").update(patch).eq("id", userId)
    if (updateErr) throw updateErr

    return { ok: true, updatedFields: Object.keys(patch) }
  } catch (err) {
    console.error("[skillGraphSync] syncSkillGraphFromMemoryStates failed (reinforcement itself unaffected):", err.message)
    return { ok: false, error: err.message }
  }
}

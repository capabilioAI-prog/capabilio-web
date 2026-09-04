/**
 * memoryEngine.js — Skill Studio V2 memory / decay / spaced-repetition engine
 * ---------------------------------------------------------------------------
 * See docs/skill-studio-v2-production-spec-2026-07-29.md §6.
 *
 * Decay is computed LAZILY (on read), not by a cron writing every row every
 * day: confidence_now = confidence_at_last_review * exp(-Δdays / halfLife).
 * halfLife is derived from ease_factor so a skill reviewed many times decays
 * slower — same spirit as SM-2 spaced repetition, deliberately simplified.
 *
 * Reinforcement is source-weighted (Arena > quiz > practice > module) per
 * Principle #3 — Arena outranks scaffolded practice. All deltas are bounded;
 * this file NEVER touches ELO (see eloBridge.js docblock) — it only ever
 * writes memory_states/decay_events/user_skills.confidence, which is a
 * completely separate, non-ELO field.
 */
import { supabaseAdmin } from "../supabase.js"

const MEMORY = "memory_states"
const DECAY_EVENTS = "decay_events"

// Reinforcement strength by source — mirrors the trust hierarchy: Arena
// (unassisted, adversarial) > quiz pass > practice completion > module read.
export const REINFORCE_STRENGTH = {
  arena: 0.35,
  quiz: 0.18,
  interview: 0.14,
  practice: 0.10,
  module: 0.05,
}

const MIN_HALF_LIFE_DAYS = 3
const MAX_HALF_LIFE_DAYS = 45
const BANDS = [
  { min: 0.75, name: "high" },
  { min: 0.45, name: "medium" },
  { min: 0, name: "low" },
]

export function bandFor(confidence) {
  return BANDS.find(b => confidence >= b.min)?.name || "low"
}

/** ease_factor (SM-2-style, starts at 2.5) -> a decay half-life in days.
 *  Higher ease (more successful reviews) = slower decay. Pure/testable. */
export function halfLifeFromEase(easeFactor = 2.5) {
  const days = (easeFactor - 1.3) * 10 + MIN_HALF_LIFE_DAYS
  return Math.max(MIN_HALF_LIFE_DAYS, Math.min(MAX_HALF_LIFE_DAYS, days))
}

/** Pure decay math — confidence at `now` given the state at last reinforcement. */
export function computeDecayedConfidence({ confidence, lastReinforcedAt, easeFactor = 2.5 }, now = new Date()) {
  if (!lastReinforcedAt) return confidence
  const deltaDays = Math.max(0, (now.getTime() - new Date(lastReinforcedAt).getTime()) / 86400000)
  if (deltaDays <= 0) return confidence
  const halfLife = halfLifeFromEase(easeFactor)
  const decayed = confidence * Math.exp(-deltaDays / halfLife)
  return Math.max(0, Math.min(1, decayed))
}

export async function getOrCreateMemoryState(userId, skillGraphNodeId) {
  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from(MEMORY).select("*").eq("user_id", userId).eq("skill_graph_node_id", skillGraphNodeId).maybeSingle()
  if (fetchErr) throw fetchErr
  if (existing) return existing
  const { data, error } = await supabaseAdmin
    .from(MEMORY)
    .insert({ user_id: userId, skill_graph_node_id: skillGraphNodeId, confidence: 0.5 })
    .select().single()
  if (error) throw error
  return data
}

/** Read-time decayed view of a memory state, band-transition-checked and
 *  materialized into decay_events only when the band actually changes (so
 *  the UI has discrete, explainable transitions, not a silently sliding number). */
export async function readDecayedState(userId, skillGraphNodeId) {
  const state = await getOrCreateMemoryState(userId, skillGraphNodeId)
  const decayed = computeDecayedConfidence(state, new Date())
  const priorBand = bandFor(state.confidence)
  const currentBand = bandFor(decayed)
  if (currentBand !== priorBand) {
    await supabaseAdmin.from(DECAY_EVENTS).insert({
      memory_state_id: state.id, from_band: priorBand, to_band: currentBand,
    })
    await supabaseAdmin.from(MEMORY).update({ confidence: decayed, updated_at: new Date().toISOString() }).eq("id", state.id)
  }
  return { ...state, confidence: decayed, band: currentBand }
}

// Evidence-quality bounds for the optional strengthMultiplier (Arena, 2026-09-04)
// — see arenaReinforcement.js's computeEvidenceMultiplier for how Arena
// derives a value in this range from score+difficulty. Clamped here too
// (defense in depth) so no caller, present or future, can bypass the "one
// perfect task can't jump a skill from near-zero to expert" requirement by
// passing an unbounded multiplier.
const MIN_STRENGTH_MULTIPLIER = 0.5
const MAX_STRENGTH_MULTIPLIER = 1.4

/** Pure — extracted so the actual arithmetic is unit-testable without a
 *  database (reinforce() itself is not DI'd; see this file's test). */
export function computeReinforcementDelta({ source, correct, strengthMultiplier = 1 }) {
  const strength = REINFORCE_STRENGTH[source] ?? REINFORCE_STRENGTH.module
  const mult = Math.max(MIN_STRENGTH_MULTIPLIER, Math.min(MAX_STRENGTH_MULTIPLIER, strengthMultiplier ?? 1))
  return correct ? strength * mult : -strength * 0.6 * mult
}

/**
 * reinforce — bounded, source-weighted confidence update. Mirrors the
 * "±15-per-skill cap philosophy" already established on user_skills
 * confidence feedback elsewhere in the codebase (see eloEngine.js's own
 * comments) — no single event can jump confidence more than ~0.35 (Arena's
 * own weight, the highest tier) in one call, times at most 1.4x for an
 * exceptionally strong piece of evidence.
 *
 * strengthMultiplier (optional, default 1 — every existing Skill Studio quiz/
 * interview/practice caller is unaffected) additively scales that per-source
 * strength for callers with a real evidence-quality signal to weight by
 * (Arena: score + task difficulty). Bounded to
 * [MIN_STRENGTH_MULTIPLIER, MAX_STRENGTH_MULTIPLIER] regardless of what a
 * caller passes.
 */
export async function reinforce({ userId, skillGraphNodeId, source, correct = true, strengthMultiplier = 1 }) {
  const state = await getOrCreateMemoryState(userId, skillGraphNodeId)
  const decayedNow = computeDecayedConfidence(state, new Date())
  const delta = computeReinforcementDelta({ source, correct, strengthMultiplier })
  const newConfidence = Math.max(0, Math.min(1, decayedNow + delta))
  const newEase = correct
    ? Math.min(3.2, (state.ease_factor ?? 2.5) + 0.08)
    : Math.max(1.3, (state.ease_factor ?? 2.5) - 0.15)
  const nextReviewDays = Math.max(1, Math.round(halfLifeFromEase(newEase) * 0.6))
  const nextReviewDueAt = new Date(Date.now() + nextReviewDays * 86400000).toISOString()

  const { data, error } = await supabaseAdmin
    .from(MEMORY)
    .update({
      confidence: newConfidence,
      ease_factor: newEase,
      review_count: (state.review_count ?? 0) + 1,
      last_reinforced_at: new Date().toISOString(),
      next_review_due_at: nextReviewDueAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", state.id)
    .select().single()
  if (error) throw error
  return data
}

/**
 * submitRevisionReview — recovery formula: restores confidence TOWARD (not
 * to) the pre-decay value, recovery_rate 0.7. Full recovery still requires
 * demonstrated performance elsewhere (quiz/practice/Arena), not one lucky review.
 */
export async function submitRevisionReview({ userId, skillGraphNodeId, correct }) {
  const state = await getOrCreateMemoryState(userId, skillGraphNodeId)
  const decayedNow = computeDecayedConfidence(state, new Date())
  if (!correct) return reinforce({ userId, skillGraphNodeId, source: "practice", correct: false })
  const recoveryRate = 0.7
  const target = state.confidence // pre-decay stored value
  const recovered = decayedNow + recoveryRate * (target - decayedNow)
  const newEase = Math.min(3.2, (state.ease_factor ?? 2.5) + 0.05)
  const nextReviewDays = Math.max(1, Math.round(halfLifeFromEase(newEase) * 0.6))
  const { data, error } = await supabaseAdmin
    .from(MEMORY)
    .update({
      confidence: Math.max(0, Math.min(1, recovered)),
      ease_factor: newEase,
      review_count: (state.review_count ?? 0) + 1,
      last_reinforced_at: new Date().toISOString(),
      next_review_due_at: new Date(Date.now() + nextReviewDays * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", state.id)
    .select().single()
  if (error) throw error
  return data
}

export async function getDueReviews(userId, limit = 5) {
  const { data, error } = await supabaseAdmin
    .from(MEMORY)
    .select("*, skill_graph_nodes(label, slug, domain_key)")
    .eq("user_id", userId)
    .lte("next_review_due_at", new Date().toISOString())
    .order("next_review_due_at", { ascending: true })
    .limit(limit)
  if (error) throw error
  return data || []
}

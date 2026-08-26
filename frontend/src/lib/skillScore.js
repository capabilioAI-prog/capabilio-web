/**
 * skillScore.js — confidence-aware skill percentage.
 *
 * Raw `correct / total * 100` overstates confidence at low sample counts —
 * 1/1 correct renders as a "100% mastered" skill after a single MCQ. This
 * shrinks the raw rate toward a neutral 50% prior, weighted by a fixed
 * "phantom question" count, so a skill only approaches its true percentage
 * as more questions accumulate for it.
 *
 * Bayesian average over a Wilson interval: this value is persisted as a
 * single scalar into skillGraph entries (no separate sample-size field is
 * stored downstream), so the adjustment has to happen once, here, at the
 * point where raw counts are still available — a min-sample display gate
 * applied later couldn't reconstruct the original counts.
 */
const PRIOR_MEAN = 0.5
const PRIOR_WEIGHT = 3 // ~3 "phantom" questions at the neutral prior

export function confidenceAdjustedScore(correct, total) {
  if (!total || total <= 0) return 0
  const raw = Math.max(0, Math.min(total, correct))
  const adjusted = (raw + PRIOR_WEIGHT * PRIOR_MEAN) / (total + PRIOR_WEIGHT)
  return Math.round(adjusted * 100)
}

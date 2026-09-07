/**
 * arena/simulations/experimentAnalysisRoom.js — the Data Science
 * "Experiment Analysis Room" micro-simulation. A set of control/treatment
 * A/B experiments evaluated with the standard two-proportion z-test —
 * exact statistical arithmetic (pooled standard error, z-score, 95%
 * confidence interval), not a group-by aggregation. Distinct object set
 * (control/treatment groups, z-score, confidence interval) and
 * interaction (choose which experiment/metric to inspect, read the
 * significance verdict) from data_investigation_studio's filter/group
 * table or any other registered simulation.
 */

export const SIMULATION_TYPE = "experiment_analysis_room"

function round(v, decimals = 4) {
  const f = 10 ** decimals
  return Math.round(v * f) / f
}

const Z_95 = 1.96

/**
 * @param {{controlN, controlConversions, treatmentN, treatmentConversions}} params
 * @returns the standard two-proportion z-test: rates, pooled standard
 *   error, z-score, a 95% confidence interval on the difference, and the
 *   significance verdict at alpha=0.05.
 */
export function twoProportionZTest({ controlN, controlConversions, treatmentN, treatmentConversions }) {
  const controlRate = controlConversions / controlN
  const treatmentRate = treatmentConversions / treatmentN
  const diff = treatmentRate - controlRate
  const pooledRate = (controlConversions + treatmentConversions) / (controlN + treatmentN)
  const standardError = Math.sqrt(pooledRate * (1 - pooledRate) * (1 / controlN + 1 / treatmentN))
  const zScore = standardError > 0 ? diff / standardError : 0
  const marginOfError = Z_95 * standardError
  return {
    controlRate: round(controlRate), treatmentRate: round(treatmentRate), diff: round(diff),
    zScore: round(zScore),
    confidenceIntervalLower: round(diff - marginOfError), confidenceIntervalUpper: round(diff + marginOfError),
    significantAt95: Math.abs(zScore) > Z_95,
  }
}

/**
 * @param {object} recipe — hidden, server-only (verification_definition.simulation).
 *   { experiments: [{id, label, controlN, controlConversions, treatmentN, treatmentConversions}] }
 * @returns {object} PUBLIC simulation state: the raw group counts (given,
 *   public — real experiment data) plus the full z-test result for every
 *   listed experiment.
 */
export function generateExperimentAnalysisState(recipe) {
  const { experiments } = recipe
  const results = experiments.map((exp) => ({
    id: exp.id, label: exp.label,
    controlN: exp.controlN, controlConversions: exp.controlConversions,
    treatmentN: exp.treatmentN, treatmentConversions: exp.treatmentConversions,
    ...twoProportionZTest(exp),
  }))
  return {
    simulationType: SIMULATION_TYPE,
    results,
  }
}

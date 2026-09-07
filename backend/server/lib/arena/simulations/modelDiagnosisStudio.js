/**
 * arena/simulations/modelDiagnosisStudio.js — the AI/ML "Model Diagnosis
 * Studio" micro-simulation. A fixed set of labeled test-set prediction
 * scores, evaluated at several candidate decision thresholds — exact
 * confusion-matrix/precision/recall/F1 arithmetic, not a physics-style
 * curve. Distinct object set (labeled scores, confusion matrix,
 * threshold candidates, misclassified examples) and interaction (select
 * a threshold, inspect the resulting errors) from every non-ML
 * registered simulation.
 */

export const SIMULATION_TYPE = "model_diagnosis_studio"

function round(v, decimals = 4) {
  const f = 10 ** decimals
  return Math.round(v * f) / f
}

/**
 * @param {{id, trueLabel: 0|1, score: number}[]} labeledScores
 * @param {number} threshold
 * @returns confusion counts, precision/recall/F1/accuracy, and the list
 *   of misclassified examples at this threshold.
 */
export function computeConfusionMatrix(labeledScores, threshold) {
  let tp = 0, fp = 0, tn = 0, fn = 0
  const errors = []
  for (const ex of labeledScores) {
    const predicted = ex.score >= threshold ? 1 : 0
    if (predicted === 1 && ex.trueLabel === 1) tp++
    else if (predicted === 1 && ex.trueLabel === 0) { fp++; errors.push({ ...ex, predicted }) }
    else if (predicted === 0 && ex.trueLabel === 0) tn++
    else { fn++; errors.push({ ...ex, predicted }) }
  }
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0
  const accuracy = labeledScores.length > 0 ? (tp + tn) / labeledScores.length : 0
  return {
    threshold, tp, fp, tn, fn,
    precision: round(precision), recall: round(recall), f1: round(f1), accuracy: round(accuracy),
    errors,
  }
}

/**
 * @param {object} recipe — hidden, server-only (verification_definition.simulation).
 *   { labeledScores: [{id, trueLabel, score}], thresholdOptions: number[] }
 * @returns {object} PUBLIC simulation state: the full labeled score set
 *   (given, public — a real dataset, not a hidden answer) and the
 *   confusion matrix/metrics at every candidate threshold.
 */
export function generateModelDiagnosisState(recipe) {
  const { labeledScores, thresholdOptions } = recipe
  const byThreshold = thresholdOptions.map((t) => computeConfusionMatrix(labeledScores, t))
  return {
    simulationType: SIMULATION_TYPE,
    labeledScores,
    byThreshold,
  }
}

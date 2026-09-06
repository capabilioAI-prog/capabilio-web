/**
 * arena/simulations/compressionLab.js — the Mechanical "Materials Lab"
 * micro-simulation (spec §9-10A, §42). A deterministic stress-strain trace
 * for a compression test: a linear elastic region up to yield, a softer
 * plastic region up to ultimate stress, then post-ultimate softening. A
 * closed-form piecewise model, not a physics engine, per spec §6.
 */

export const SIMULATION_TYPE = "compression_lab"

function round2(v) { return Math.round(v * 100) / 100 }

/**
 * @param {object} recipe — hidden, server-only (verification_definition.simulation).
 *   { steps?, maxStrainPct, elasticModulusMPa, yieldStrainPct,
 *     ultimateStrainPct, ultimateStressMPa, specimenLabel? }
 * @returns {object} PUBLIC simulation state — the rendered curve. The
 *   yield/ultimate strain thresholds ARE part of the public state: in a
 *   real compression test these are exactly what the trace itself reveals
 *   once run, not a hidden answer (the hidden answer is the classification
 *   against the mission's acceptance spec, stored separately in the
 *   challenge's verification rules).
 */
export function generateCompressionState(recipe) {
  const steps = recipe.steps ?? 40
  const maxStrainPct = recipe.maxStrainPct ?? 3
  const E = recipe.elasticModulusMPa ?? 20000
  const yieldStrainPct = recipe.yieldStrainPct ?? 0.6
  const ultimateStrainPct = recipe.ultimateStrainPct ?? 1.8
  const ultimateStressMPa = recipe.ultimateStressMPa ?? 145

  const yieldStressMPa = E * (yieldStrainPct / 100)
  const points = []

  for (let i = 0; i <= steps; i++) {
    const strainPct = (maxStrainPct * i) / steps
    let stressMPa
    if (strainPct <= yieldStrainPct) {
      stressMPa = E * (strainPct / 100)
    } else if (strainPct <= ultimateStrainPct) {
      const frac = (strainPct - yieldStrainPct) / (ultimateStrainPct - yieldStrainPct)
      stressMPa = yieldStressMPa + frac * (ultimateStressMPa - yieldStressMPa)
    } else {
      const softenSpan = Math.max(0.001, maxStrainPct - ultimateStrainPct)
      const frac = Math.min(1, (strainPct - ultimateStrainPct) / softenSpan)
      stressMPa = ultimateStressMPa * (1 - 0.3 * frac)
    }
    points.push({ strainPct: round2(strainPct), stressMPa: round2(stressMPa) })
  }

  return {
    simulationType: SIMULATION_TYPE,
    specimenLabel: recipe.specimenLabel || "Specimen A",
    yieldStrainPct,
    ultimateStrainPct,
    points,
  }
}

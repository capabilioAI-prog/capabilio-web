/**
 * arena/simulations/beamLab.js — the Civil "Structures Lab" micro-
 * simulation: a simply-supported beam under a single point load.
 * Closed-form Euler-Bernoulli beam formulas (Roark's/Timoshenko), not a
 * physics engine, per spec §6/§37. Span, section, material, and the
 * design load ARE legitimate public bench parameters — a real structural
 * engineer is GIVEN these, not expected to guess them; the "answer" this
 * mission verifies is the student's computed response and classification,
 * not a hidden recipe.
 */

export const SIMULATION_TYPE = "beam_lab"

function round(v, decimals = 3) {
  const f = 10 ** decimals
  return Math.round(v * f) / f
}

export function computeMomentOfInertiaMm4(sectionWidthMm, sectionHeightMm) {
  return (sectionWidthMm * sectionHeightMm ** 3) / 12
}

/** Support reactions for a simply-supported beam with one point load. */
export function computeReactions({ spanMm, loadN, loadPositionMm }) {
  const b = spanMm - loadPositionMm
  return {
    reactionLeftN: (loadN * b) / spanMm,
    reactionRightN: (loadN * loadPositionMm) / spanMm,
  }
}

/** Bending moment at position x (0..spanMm) along the beam. */
export function computeMomentAt(xMm, { spanMm, loadN, loadPositionMm }) {
  const { reactionLeftN } = computeReactions({ spanMm, loadN, loadPositionMm })
  if (xMm <= loadPositionMm) return reactionLeftN * xMm
  return reactionLeftN * xMm - loadN * (xMm - loadPositionMm)
}

/** Deflection at position x for a simply-supported beam with a single
 *  point load at `loadPositionMm` (standard closed-form solution). */
export function computeDeflectionAt(xMm, { spanMm, loadN, loadPositionMm, modulusMPa, momentOfInertiaMm4 }) {
  const a = loadPositionMm, L = spanMm, b = L - a, P = loadN, E = modulusMPa, I = momentOfInertiaMm4
  const denom = 6 * L * E * I
  if (xMm <= a) {
    return (P * b * xMm * (L ** 2 - b ** 2 - xMm ** 2)) / denom
  }
  return (P * a * (L - xMm) * (2 * L * xMm - a ** 2 - xMm ** 2)) / denom
}

/** The beam's full response for a given load magnitude (position and
 *  geometry fixed by the challenge). Used both to compute the exact
 *  values verification checks and to sweep the deflection curve. */
export function computeBeamResponse({ spanMm, loadN, loadPositionMm, modulusMPa, sectionWidthMm, sectionHeightMm }) {
  const momentOfInertiaMm4 = computeMomentOfInertiaMm4(sectionWidthMm, sectionHeightMm)
  const maxMomentNmm = computeMomentAt(loadPositionMm, { spanMm, loadN, loadPositionMm })
  const deflectionAtLoadMm = computeDeflectionAt(loadPositionMm, { spanMm, loadN, loadPositionMm, modulusMPa, momentOfInertiaMm4 })
  const maxStressMPa = (maxMomentNmm * (sectionHeightMm / 2)) / momentOfInertiaMm4
  return { momentOfInertiaMm4, maxMomentNmm, deflectionAtLoadMm, maxStressMPa }
}

/**
 * @param {object} recipe — { spanMm, loadN, loadPositionMm, modulusMPa,
 *   sectionWidthMm, sectionHeightMm, allowableStressMPa, allowableDeflectionMm, steps? }
 * @returns {object} PUBLIC simulation state: beam geometry + a deflection/
 *   moment sweep across the span for the response graph. All fields are
 *   legitimate given engineering parameters — nothing here is a hidden answer.
 */
export function generateBeamState(recipe) {
  const steps = recipe.steps ?? 40
  const { spanMm, loadN, loadPositionMm, modulusMPa, sectionWidthMm, sectionHeightMm, allowableStressMPa, allowableDeflectionMm } = recipe
  const momentOfInertiaMm4 = computeMomentOfInertiaMm4(sectionWidthMm, sectionHeightMm)
  const points = []
  for (let i = 0; i <= steps; i++) {
    const xMm = (spanMm * i) / steps
    points.push({
      xMm: round(xMm, 1),
      deflectionMm: round(computeDeflectionAt(xMm, { spanMm, loadN, loadPositionMm, modulusMPa, momentOfInertiaMm4 }), 4),
      momentNmm: round(computeMomentAt(xMm, { spanMm, loadN, loadPositionMm })),
    })
  }
  return {
    simulationType: SIMULATION_TYPE,
    spanMm, loadN, loadPositionMm, sectionWidthMm, sectionHeightMm, modulusMPa,
    allowableStressMPa, allowableDeflectionMm,
    points,
  }
}

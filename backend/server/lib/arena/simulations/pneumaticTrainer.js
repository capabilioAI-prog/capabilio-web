/**
 * arena/simulations/pneumaticTrainer.js — the Mechanical "Pneumatic
 * Trainer" micro-simulation. A double-acting cylinder driven by a
 * directional control valve sequence (extend/retract/hold), with a
 * possible flow-restriction fault in one direction — a simple, exact
 * stepwise kinematic + chamber-pressure model, not a stress-strain
 * curve. Distinct object set (compressor supply, valve sequence,
 * cylinder chambers) and interaction (step through the valve sequence,
 * inspect position/pressure) from vibration_rig's spectrum or any other
 * registered simulation.
 */

export const SIMULATION_TYPE = "pneumatic_trainer"

function round(v, decimals = 2) {
  const f = 10 ** decimals
  return Math.round(v * f) / f
}
function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)) }

/**
 * Replays the valve sequence one step (1 second) at a time. Energizing
 * "extend" pressurizes the extend chamber to supply and exhausts the
 * retract chamber to 0 (and vice versa) — a "hold" (center-closed) valve
 * traps whatever chamber pressures were already present, real directional-
 * control-valve behavior, not just a position slider.
 */
export function simulatePneumatic(recipe) {
  const { strokeMm, extendFlowRateMmS, retractFlowRateMmS, supplyPressureBar, valveSequence, faultDirection, faultSeverity = 0 } = recipe
  const actualExtendRate = faultDirection === "extend" ? extendFlowRateMmS * (1 - faultSeverity) : extendFlowRateMmS
  const actualRetractRate = faultDirection === "retract" ? retractFlowRateMmS * (1 - faultSeverity) : retractFlowRateMmS

  let position = 0, extendBar = 0, retractBar = 0
  const trace = []

  for (const s of valveSequence) {
    const velocity = s.state === "extend" ? actualExtendRate : s.state === "retract" ? -actualRetractRate : 0
    position = clamp(position + velocity * 1, 0, strokeMm)

    if (s.state === "extend") { extendBar = supplyPressureBar; retractBar = 0 }
    else if (s.state === "retract") { extendBar = 0; retractBar = supplyPressureBar }
    // "hold" leaves extendBar/retractBar unchanged (trapped pressure)

    trace.push({ step: s.step, valveState: s.state, positionMm: round(position), extendChamberBar: round(extendBar), retractChamberBar: round(retractBar) })
  }

  return trace
}

/**
 * @param {object} recipe — hidden, server-only (verification_definition.simulation).
 *   { strokeMm, extendFlowRateMmS, retractFlowRateMmS, supplyPressureBar,
 *     valveSequence: [{step, state:"extend"|"retract"|"hold"}], faultDirection?, faultSeverity? }
 * @returns {object} PUBLIC simulation state: the nominal rated flow rates
 *   (given, public) and the observed step-by-step trace. The fault
 *   direction/severity are never exposed directly — only their
 *   consequence on the observed trace.
 */
export function generatePneumaticTrainerState(recipe) {
  const { strokeMm, extendFlowRateMmS, retractFlowRateMmS, supplyPressureBar } = recipe
  const trace = simulatePneumatic(recipe)
  return {
    simulationType: SIMULATION_TYPE,
    nominal: { strokeMm, extendFlowRateMmS, retractFlowRateMmS, supplyPressureBar },
    trace,
  }
}

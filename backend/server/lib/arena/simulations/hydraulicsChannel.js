/**
 * arena/simulations/hydraulicsChannel.js — the Civil "Hydraulics Channel"
 * micro-simulation. A sluice gate discharging from an upstream head into
 * an open channel — the standard free-flow sluice-gate discharge
 * equation (Q = Cd·a·b·sqrt(2gH)), not a structural or geodetic model.
 * Distinct object set (channel, gate opening, head, discharge) and
 * interaction (open/close the gate to different settings, read flow
 * rate/velocity) from surveying_station's traverse or any other
 * registered simulation.
 */

export const SIMULATION_TYPE = "hydraulics_channel"

const G = 9.81

function round(v, decimals = 4) {
  const f = 10 ** decimals
  return Math.round(v * f) / f
}

/**
 * @param {{ channelWidthM, upstreamHeadM, gateOpeningM, dischargeCoeff }} params
 * @returns {{ flowRateM3S, velocityAtGateMS }} standard free-flow
 *   sluice-gate discharge: Q = Cd·a·b·sqrt(2gH), V = Q/(a·b).
 */
export function computeGateFlow({ channelWidthM, upstreamHeadM, gateOpeningM, dischargeCoeff = 0.61 }) {
  const flowRateM3S = dischargeCoeff * gateOpeningM * channelWidthM * Math.sqrt(2 * G * upstreamHeadM)
  const velocityAtGateMS = flowRateM3S / (gateOpeningM * channelWidthM)
  return { flowRateM3S: round(flowRateM3S), velocityAtGateMS: round(velocityAtGateMS) }
}

/**
 * @param {object} recipe — hidden, server-only (verification_definition.simulation).
 *   { channelWidthM, upstreamHeadM, dischargeCoeff?, gateSettings: [{label, gateOpeningM}] }
 * @returns {object} PUBLIC simulation state: the channel's given
 *   dimensions/head plus the flow response at every gate setting the
 *   student can select — a real computation from given data, same
 *   honesty contract as rlc_lab's resonance sweep.
 */
export function generateHydraulicsChannelState(recipe) {
  const { channelWidthM, upstreamHeadM, dischargeCoeff, gateSettings } = recipe
  const responses = gateSettings.map((setting) => ({
    label: setting.label, gateOpeningM: setting.gateOpeningM,
    ...computeGateFlow({ channelWidthM, upstreamHeadM, gateOpeningM: setting.gateOpeningM, dischargeCoeff }),
  }))
  return {
    simulationType: SIMULATION_TYPE,
    channelWidthM, upstreamHeadM, dischargeCoeff: dischargeCoeff ?? 0.61,
    responses,
  }
}

/**
 * arena/simulations/surveyingStation.js — the Civil "Surveying Station"
 * micro-simulation. A closed traverse of bearing/distance legs, plotted
 * as cumulative site coordinates — standard surveying trigonometry
 * (bearing measured clockwise from North), not a stress-strain or beam
 * model. Distinct object set (survey legs, plotted points, misclosure)
 * and interaction (sight/aim each leg in sequence, read the site plot)
 * from beam_lab's load bench or any other registered simulation.
 */

export const SIMULATION_TYPE = "surveying_station"

function round(v, decimals = 4) {
  const f = 10 ** decimals
  const r = Math.round(v * f) / f
  return r === 0 ? 0 : r // normalize -0 to 0
}

/** Plots a closed traverse starting at (0,0): each leg's bearing (degrees
 *  clockwise from North) and distance advance the running position by
 *  standard surveying trig (x = distance*sin(bearing), y = distance*cos(bearing)). */
export function computeTraverse(legs) {
  let x = 0, y = 0
  const points = [{ id: "start", xM: 0, yM: 0 }]
  for (const leg of legs) {
    const bearingRad = (leg.bearingDeg * Math.PI) / 180
    x += leg.distanceM * Math.sin(bearingRad)
    y += leg.distanceM * Math.cos(bearingRad)
    points.push({ id: leg.id, xM: round(x), yM: round(y) })
  }
  const misclosure = { dxM: round(x), dyM: round(y) }
  const linearClosingErrorM = round(Math.sqrt(x ** 2 + y ** 2))
  return { points, misclosure, linearClosingErrorM }
}

/**
 * @param {object} recipe — hidden, server-only (verification_definition.simulation).
 *   { legs: [{id, label, bearingDeg, distanceM}] } — a closed traverse
 *   intended to return to its starting point.
 * @returns {object} PUBLIC simulation state: the sighted legs (given,
 *   public — exactly what a real instrument reads off) plus the plotted
 *   site points. The linear closing error is a computation the mission
 *   asks the student to perform from these public readings, same
 *   honesty contract as rlc_lab's resonance frequency.
 */
export function generateSurveyingStationState(recipe) {
  const { legs } = recipe
  const { points } = computeTraverse(legs)
  return {
    simulationType: SIMULATION_TYPE,
    legs,
    points,
  }
}

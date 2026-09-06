/**
 * simulations/rlcMath.js — pure, JSX-free RLC circuit math shared by
 * RlcLab.jsx. Deliberately duplicates backend/server/lib/arena/simulations/
 * rlcLab.js's formulas rather than importing across the frontend/backend
 * boundary: R, L, C, and source voltage are public bench components (spec
 * §36 — nothing here is a hidden answer), so computing the same public
 * physics live on the frontend as the student drags the frequency slider
 * is safe and gives instant feedback without a round trip. The backend
 * copy remains the one that actually grades a submission.
 */

/** The circuit's operating point at one frequency. */
export function computeOperatingPoint({ resistanceOhms, inductanceH, capacitanceF, sourceVoltageV, frequencyHz }) {
  const omega = 2 * Math.PI * frequencyHz
  const reactanceLOhms = omega * inductanceH
  const reactanceCOhms = capacitanceF > 0 && frequencyHz > 0 ? 1 / (omega * capacitanceF) : Infinity
  const netReactanceOhms = reactanceLOhms - reactanceCOhms
  const impedanceOhms = Math.sqrt(resistanceOhms ** 2 + netReactanceOhms ** 2)
  const currentA = impedanceOhms > 0 ? sourceVoltageV / impedanceOhms : 0
  const phaseDeg = (Math.atan2(netReactanceOhms, resistanceOhms) * 180) / Math.PI
  return { frequencyHz, reactanceLOhms, reactanceCOhms, impedanceOhms, currentA, phaseDeg }
}

/** Maps a frequency-response sweep (points with {frequencyHz, [field]})
 *  into an SVG polyline within a width×height viewbox. */
export function sweepToPolyline(points, { width, height, field, freqMinHz, freqMaxHz, maxValue }) {
  if (points.length < 2) return ""
  return points
    .map((p) => {
      const x = ((p.frequencyHz - freqMinHz) / (freqMaxHz - freqMinHz)) * width
      const y = height - (p[field] / maxValue) * height
      return `${x.toFixed(2)},${Math.max(0, Math.min(height, y)).toFixed(2)}`
    })
    .join(" ")
}

/** x-position (in a width-wide viewbox) for a given frequency, used to
 *  place the live marker dot on the response graph. */
export function frequencyToX(frequencyHz, { width, freqMinHz, freqMaxHz }) {
  return ((frequencyHz - freqMinHz) / (freqMaxHz - freqMinHz)) * width
}

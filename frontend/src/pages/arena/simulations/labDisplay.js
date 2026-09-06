/**
 * simulations/labDisplay.js — pure, JSX-free display-transform helpers
 * shared by WaveformLab.jsx and CompressionLab.jsx. Kept out of those
 * component files (same reasoning as workstationDefaults.js) so node:test
 * can exercise them directly; JSX files can't be parsed by node:test.
 *
 * These transforms only affect INSPECTION of a fixed, already-generated
 * trace (oscilloscope timebase/averaging, a load scrubber) — never the
 * underlying signal/curve itself, which is fixed server-side per spec
 * §21 ("simulation state must not be controlled by the client").
 */

/** Oscilloscope "timebase" control: shows only the first `windowPct`% of
 *  the captured trace (zooming in reveals more per-cycle detail). */
export function windowSamples(samples, windowPct) {
  const pct = Math.min(100, Math.max(1, windowPct))
  const count = Math.max(2, Math.round((samples.length * pct) / 100))
  return samples.slice(0, count)
}

/** Oscilloscope "averaging" control: a centered moving average that
 *  smooths noise without shifting the trace in time. windowSize of 1 (or
 *  less) is a no-op passthrough. */
export function movingAverage(samples, windowSize) {
  const w = Math.max(1, Math.round(windowSize))
  if (w <= 1) return samples.slice()
  const half = Math.floor(w / 2)
  return samples.map((_, i) => {
    const lo = Math.max(0, i - half)
    const hi = Math.min(samples.length - 1, i + half)
    let sum = 0
    for (let j = lo; j <= hi; j++) sum += samples[j]
    return sum / (hi - lo + 1)
  })
}

/** Maps a sample array to SVG polyline "x,y " point-string coordinates
 *  inside a width×height viewbox, vertically centered, scaled by `gain`. */
export function samplesToPolyline(samples, { width, height, gain = 1, maxAbs = 1.4 }) {
  if (samples.length < 2) return ""
  const midY = height / 2
  const scale = (height / 2 / maxAbs) * gain
  return samples
    .map((v, i) => {
      const x = (i / (samples.length - 1)) * width
      const y = midY - v * scale
      return `${x.toFixed(2)},${Math.max(0, Math.min(height, y)).toFixed(2)}`
    })
    .join(" ")
}

/** Compression-lab "load" scrubber: reveals the recorded stress-strain
 *  trace up to `loadPct`% of the captured points, simulating running the
 *  test up to that load. Always includes at least the first point. */
export function visiblePoints(points, loadPct) {
  const pct = Math.min(100, Math.max(0, loadPct))
  const count = Math.max(1, Math.round((points.length * pct) / 100))
  return points.slice(0, count)
}

/** Maps stress-strain points to an SVG polyline within a width×height
 *  viewbox (strain on x up to maxStrainPct, stress on y up to maxStressMPa,
 *  origin bottom-left as a real stress-strain chart is drawn). */
export function pointsToPolyline(points, { width, height, maxStrainPct, maxStressMPa }) {
  if (points.length < 2) return ""
  return points
    .map((p) => {
      const x = (p.strainPct / maxStrainPct) * width
      const y = height - (p.stressMPa / maxStressMPa) * height
      return `${x.toFixed(2)},${Math.max(0, Math.min(height, y)).toFixed(2)}`
    })
    .join(" ")
}

/**
 * simulations/beamMath.js — pure, JSX-free beam formulas shared by
 * BeamLab.jsx. Deliberately duplicates backend/server/lib/arena/
 * simulations/beamLab.js's formulas — span/section/material/load are
 * public bench parameters (spec §36), so recomputing the same public
 * mechanics live on the frontend as the student scales the load is safe.
 */

export function computeMomentOfInertiaMm4(sectionWidthMm, sectionHeightMm) {
  return (sectionWidthMm * sectionHeightMm ** 3) / 12
}

export function computeMomentAt(xMm, { spanMm, loadN, loadPositionMm }) {
  const b = spanMm - loadPositionMm
  const reactionLeftN = (loadN * b) / spanMm
  if (xMm <= loadPositionMm) return reactionLeftN * xMm
  return reactionLeftN * xMm - loadN * (xMm - loadPositionMm)
}

export function computeDeflectionAt(xMm, { spanMm, loadN, loadPositionMm, modulusMPa, momentOfInertiaMm4 }) {
  const a = loadPositionMm, L = spanMm, b = L - a, P = loadN, E = modulusMPa, I = momentOfInertiaMm4
  const denom = 6 * L * E * I
  if (xMm <= a) return (P * b * xMm * (L ** 2 - b ** 2 - xMm ** 2)) / denom
  return (P * a * (L - xMm) * (2 * L * xMm - a ** 2 - xMm ** 2)) / denom
}

/** Maps a deflection sweep to an SVG polyline (x = position along span,
 *  y = deflection, exaggerated by `scale` for visibility and flipped
 *  downward since deflection is drawn hanging below the beam line). */
export function deflectionToPolyline(points, { width, height, spanMm, maxDeflectionMm, baselineY }) {
  if (points.length < 2) return ""
  return points
    .map((p) => {
      const x = (p.xMm / spanMm) * width
      const y = baselineY + (p.deflectionMm / maxDeflectionMm) * (height - baselineY)
      return `${x.toFixed(2)},${Math.max(0, Math.min(height, y)).toFixed(2)}`
    })
    .join(" ")
}

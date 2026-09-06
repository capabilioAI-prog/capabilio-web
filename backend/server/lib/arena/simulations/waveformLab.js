/**
 * arena/simulations/waveformLab.js — the ECE "Signal Lab" micro-simulation
 * (spec §7-8A, §41). A deterministic two-channel oscilloscope capture: a
 * clean reference signal (CH1) and a sensor/measured signal (CH2) that may
 * carry one injected real-world anomaly. No physics engine — a signal
 * equation plus a small anomaly-injector table, per spec §6.
 *
 * Determinism is the whole contract: the same recipe must produce byte-
 * identical sample arrays every time (verified in waveformLab.test.js),
 * because a mission's evidence and a student's re-render on refresh must
 * agree. The `seed` field drives a tiny local PRNG — never Math.random.
 */

export const SIMULATION_TYPE = "waveform_lab"

/** Deterministic PRNG (mulberry32) — same seed => same sequence forever. */
function seededRng(seed) {
  let a = seed >>> 0 || 1
  return function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function round(v) { return Math.round(v * 10000) / 10000 }

// Each injector takes the clean sample value and returns the distorted
// value. `rng` is a per-generation PRNG instance so noise/dropout are
// reproducible for a given seed but still look irregular, not periodic.
const ANOMALY_INJECTORS = {
  amplitude_clipping: (v, severity) => Math.max(-severity, Math.min(severity, v)),
  added_noise: (v, severity, rng) => v + (rng() - 0.5) * 2 * severity,
  dc_offset: (v, severity) => v + severity,
  dropout: (v, severity, rng) => (rng() < severity ? 0 : v),
  harmonic_distortion: (v, severity, rng, i, freqHz, dt) =>
    v + severity * Math.sin(2 * Math.PI * (freqHz * 3) * (i * dt)),
}

function sine(t, frequencyHz, amplitude, phaseRad = 0) {
  return amplitude * Math.sin(2 * Math.PI * frequencyHz * t + phaseRad)
}

/**
 * @param {object} recipe — hidden, server-only (lives in the challenge's
 *   verification_definition.simulation, never sent to the client raw).
 *   { sampleCount, durationMs, seed,
 *     channel1: { label?, frequencyHz, amplitude },
 *     channel2: { label?, frequencyHz, amplitude, phaseOffsetDeg?,
 *                 anomaly?: { type, severity } } }
 * @returns {object} the PUBLIC simulation state — only rendered sample
 *   arrays, never the anomaly type/severity/seed. This is what
 *   routes/arena.js attaches to the student-facing challenge payload.
 */
export function generateWaveformState(recipe) {
  const sampleCount = recipe.sampleCount ?? 400
  const durationMs = recipe.durationMs ?? 20
  const dt = (durationMs / 1000) / sampleCount
  const rng = seededRng(recipe.seed ?? 1)

  const ch1cfg = recipe.channel1 || {}
  const ch2cfg = recipe.channel2 || {}
  const injector = ch2cfg.anomaly ? ANOMALY_INJECTORS[ch2cfg.anomaly.type] : null
  const severity = ch2cfg.anomaly?.severity ?? 0.5
  const phaseRad = ((ch2cfg.phaseOffsetDeg || 0) * Math.PI) / 180

  const t = new Array(sampleCount)
  const ch1 = new Array(sampleCount)
  const ch2 = new Array(sampleCount)

  for (let i = 0; i < sampleCount; i++) {
    const time = i * dt
    t[i] = round(time * 1000) // ms, for axis labeling
    ch1[i] = round(sine(time, ch1cfg.frequencyHz ?? 500, ch1cfg.amplitude ?? 1))
    let v2 = sine(time, ch2cfg.frequencyHz ?? ch1cfg.frequencyHz ?? 500, ch2cfg.amplitude ?? 1, phaseRad)
    if (injector) v2 = injector(v2, severity, rng, i, ch2cfg.frequencyHz ?? 500, dt)
    ch2[i] = round(v2)
  }

  return {
    simulationType: SIMULATION_TYPE,
    sampleCount,
    durationMs,
    sampleRateHz: Math.round(sampleCount / (durationMs / 1000)),
    t,
    channel1: { label: ch1cfg.label || "Reference (CH1)", samples: ch1 },
    channel2: { label: ch2cfg.label || "Sensor Output (CH2)", samples: ch2 },
  }
}

import { test } from "node:test"
import assert from "node:assert/strict"
import { generateWaveformState } from "./waveformLab.js"

const CLEAN_RECIPE = {
  sampleCount: 100, durationMs: 20, seed: 7,
  channel1: { frequencyHz: 500, amplitude: 1 },
  channel2: { frequencyHz: 500, amplitude: 1 },
}

test("is deterministic — the same recipe produces byte-identical output every time", () => {
  const a = generateWaveformState(CLEAN_RECIPE)
  const b = generateWaveformState(CLEAN_RECIPE)
  assert.deepEqual(a, b)
})

test("with no anomaly, channel2 matches channel1 exactly (same signal)", () => {
  const state = generateWaveformState(CLEAN_RECIPE)
  assert.deepEqual(state.channel2.samples, state.channel1.samples)
})

test("amplitude_clipping caps channel2 samples at the configured severity, channel1 stays unclipped", () => {
  const recipe = {
    ...CLEAN_RECIPE,
    channel2: { frequencyHz: 500, amplitude: 1, anomaly: { type: "amplitude_clipping", severity: 0.5 } },
  }
  const state = generateWaveformState(recipe)
  for (const v of state.channel2.samples) assert.ok(v <= 0.5 && v >= -0.5)
  assert.ok(state.channel1.samples.some((v) => Math.abs(v) > 0.5), "channel1 (reference) must still show the full, unclipped amplitude")
})

test("dc_offset shifts every channel2 sample by the configured severity relative to an unshifted equivalent", () => {
  const withOffset = generateWaveformState({ ...CLEAN_RECIPE, channel2: { frequencyHz: 500, amplitude: 1, anomaly: { type: "dc_offset", severity: 0.3 } } })
  const withoutOffset = generateWaveformState(CLEAN_RECIPE)
  for (let i = 0; i < withOffset.channel2.samples.length; i++) {
    assert.ok(Math.abs((withOffset.channel2.samples[i] - withoutOffset.channel2.samples[i]) - 0.3) < 1e-6)
  }
})

test("never exposes the recipe's anomaly type, severity, or seed in the returned public state", () => {
  const state = generateWaveformState({ ...CLEAN_RECIPE, channel2: { frequencyHz: 500, amplitude: 1, anomaly: { type: "added_noise", severity: 0.4 } } })
  // Structural check (not substring search on the serialized JSON, which
  // is flaky — a rounded sample value can coincidentally contain "0.4"):
  // the returned shape only ever has these keys, so there is no field an
  // anomaly type/severity/seed could hide in.
  assert.deepEqual(new Set(Object.keys(state)), new Set(["simulationType", "sampleCount", "durationMs", "sampleRateHz", "t", "channel1", "channel2"]))
  assert.deepEqual(new Set(Object.keys(state.channel1)), new Set(["label", "samples"]))
  assert.deepEqual(new Set(Object.keys(state.channel2)), new Set(["label", "samples"]))
})

test("respects sampleCount and reports a consistent sampleRateHz", () => {
  const state = generateWaveformState({ ...CLEAN_RECIPE, sampleCount: 200, durationMs: 40 })
  assert.equal(state.channel1.samples.length, 200)
  assert.equal(state.channel2.samples.length, 200)
  assert.equal(state.sampleRateHz, 5000)
})

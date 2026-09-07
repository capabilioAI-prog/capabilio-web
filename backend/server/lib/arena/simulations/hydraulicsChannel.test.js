import { test } from "node:test"
import assert from "node:assert/strict"
import { computeGateFlow, generateHydraulicsChannelState } from "./hydraulicsChannel.js"

test("flow rate matches the standard sluice-gate discharge equation Q = Cd*a*b*sqrt(2gH)", () => {
  const { flowRateM3S } = computeGateFlow({ channelWidthM: 2, upstreamHeadM: 3, gateOpeningM: 0.5, dischargeCoeff: 0.61 })
  const expected = 0.61 * 0.5 * 2 * Math.sqrt(2 * 9.81 * 3)
  assert.ok(Math.abs(flowRateM3S - expected) < 0.001)
})

test("doubling the gate opening exactly doubles the flow rate but leaves velocity unchanged", () => {
  const half = computeGateFlow({ channelWidthM: 2, upstreamHeadM: 3, gateOpeningM: 0.5 })
  const full = computeGateFlow({ channelWidthM: 2, upstreamHeadM: 3, gateOpeningM: 1.0 })
  assert.ok(Math.abs(full.flowRateM3S - half.flowRateM3S * 2) < 0.001)
  assert.equal(full.velocityAtGateMS, half.velocityAtGateMS)
})

test("a higher upstream head increases both flow rate and velocity for the same gate opening", () => {
  const lowHead = computeGateFlow({ channelWidthM: 2, upstreamHeadM: 1, gateOpeningM: 0.5 })
  const highHead = computeGateFlow({ channelWidthM: 2, upstreamHeadM: 4, gateOpeningM: 0.5 })
  assert.ok(highHead.flowRateM3S > lowHead.flowRateM3S)
  assert.ok(highHead.velocityAtGateMS > lowHead.velocityAtGateMS)
})

test("generateHydraulicsChannelState computes a response per listed gate setting and exposes the given channel dimensions", () => {
  const state = generateHydraulicsChannelState({
    channelWidthM: 2, upstreamHeadM: 3,
    gateSettings: [{ label: "25% open", gateOpeningM: 0.25 }, { label: "50% open", gateOpeningM: 0.5 }],
  })
  assert.equal(state.simulationType, "hydraulics_channel")
  assert.equal(state.responses.length, 2)
  assert.equal(state.channelWidthM, 2)
})

test("is deterministic", () => {
  const recipe = { channelWidthM: 2, upstreamHeadM: 3, gateSettings: [{ label: "50%", gateOpeningM: 0.5 }] }
  assert.deepEqual(generateHydraulicsChannelState(recipe), generateHydraulicsChannelState(recipe))
})

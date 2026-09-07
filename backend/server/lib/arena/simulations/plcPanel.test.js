import { test } from "node:test"
import assert from "node:assert/strict"
import { simulatePlc, generatePlcPanelState } from "./plcPanel.js"

const SEAL_IN = {
  rules: [{ actuatorId: "conveyor", type: "latch", setWhen: ["start"], resetWhen: ["stop"] }],
  inputSequence: [
    { step: 1, inputs: { start: true, stop: false } },
    { step: 2, inputs: { start: false, stop: false } },
    { step: 3, inputs: { start: false, stop: true } },
    { step: 4, inputs: { start: false, stop: false } },
  ],
}

test("a latch rule stays ON after the set input returns to false (real seal-in memory, not stateless recomputation)", () => {
  const perStep = simulatePlc(SEAL_IN)
  assert.deepEqual(perStep.map((s) => s.actuators.conveyor), [true, true, false, false])
})

test("a latch rule turns OFF the instant reset fires, even if set is also asserted that step", () => {
  const perStep = simulatePlc({
    rules: [{ actuatorId: "m", type: "latch", setWhen: ["start"], resetWhen: ["stop"] }],
    inputSequence: [{ step: 1, inputs: { start: true, stop: true } }],
  })
  assert.equal(perStep[0].actuators.m, false) // reset wins over set
})

test("a combinational rule with allOf requires every listed sensor true, recomputed fresh each step (no memory)", () => {
  const perStep = simulatePlc({
    rules: [{ actuatorId: "clamp", type: "combinational", allOf: ["partDetected", "limitSwitch"] }],
    inputSequence: [
      { step: 1, inputs: { partDetected: true, limitSwitch: false } },
      { step: 2, inputs: { partDetected: true, limitSwitch: true } },
      { step: 3, inputs: { partDetected: false, limitSwitch: true } },
    ],
  })
  assert.deepEqual(perStep.map((s) => s.actuators.clamp), [false, true, false])
})

test("a combinational rule with noneOf acts as an interlock — asserting a blocked sensor forces the actuator off immediately", () => {
  const perStep = simulatePlc({
    rules: [{ actuatorId: "alarm", type: "combinational", anyOf: ["overTemp", "overCurrent"], noneOf: ["estop"] }],
    inputSequence: [
      { step: 1, inputs: { overTemp: true, estop: false } },
      { step: 2, inputs: { overTemp: true, estop: true } },
    ],
  })
  assert.deepEqual(perStep.map((s) => s.actuators.alarm), [true, false])
})

test("multiple independent rules evaluate side by side without interfering", () => {
  const perStep = simulatePlc({
    rules: [
      { actuatorId: "conveyor", type: "latch", setWhen: ["start"], resetWhen: ["stop"] },
      { actuatorId: "alarm", type: "combinational", anyOf: ["estop"] },
    ],
    inputSequence: [{ step: 1, inputs: { start: true, stop: false, estop: true } }],
  })
  assert.equal(perStep[0].actuators.conveyor, true)
  assert.equal(perStep[0].actuators.alarm, true)
})

test("generatePlcPanelState exposes the full timeline and is deterministic", () => {
  const recipe = { sensorLabels: ["start", "stop"], actuatorLabels: [{ id: "conveyor", label: "Conveyor Motor" }], ...SEAL_IN }
  const a = generatePlcPanelState(recipe)
  const b = generatePlcPanelState(recipe)
  assert.deepEqual(a, b)
  assert.equal(a.stepCount, 4)
})

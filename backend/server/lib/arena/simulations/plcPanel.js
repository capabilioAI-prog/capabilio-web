/**
 * arena/simulations/plcPanel.js — the EEE "PLC / Industrial Automation
 * Panel" micro-simulation. A small set of actuator rules (combinational,
 * or latching start/stop "seal-in" circuits — the canonical relay-logic
 * teaching example) replayed over a fixed input event sequence — exact
 * boolean/state-machine evaluation, not a physics-style curve. Distinct
 * object set (sensors, actuators, a stateful input timeline) and
 * interaction (step through the sequence, inspect machine state) from
 * digital_logic_bench's stateless truth table or any other registered
 * simulation.
 */

export const SIMULATION_TYPE = "plc_panel"

function evalCombinational(rule, inputsAtStep) {
  const allOfOk = (rule.allOf || []).every((name) => !!inputsAtStep[name])
  const anyOfOk = (rule.anyOf || []).length === 0 || (rule.anyOf || []).some((name) => !!inputsAtStep[name])
  const noneOfOk = (rule.noneOf || []).every((name) => !inputsAtStep[name])
  return allOfOk && anyOfOk && noneOfOk
}

/**
 * Replays every actuator rule across the input sequence. A "latch" rule
 * models a start/stop seal-in circuit: once set, the actuator stays ON
 * until a reset condition fires, regardless of the set condition's later
 * state — real stateful behavior, not a per-step recomputation.
 */
export function simulatePlc({ rules, inputSequence }) {
  let actuatorState = {}
  const perStep = []

  for (const step of inputSequence) {
    const newState = {}
    for (const rule of rules) {
      if (rule.type === "latch") {
        const prev = actuatorState[rule.actuatorId] || false
        const setNow = (rule.setWhen || []).some((name) => !!step.inputs[name])
        const resetNow = (rule.resetWhen || []).some((name) => !!step.inputs[name])
        newState[rule.actuatorId] = (prev || setNow) && !resetNow
      } else {
        newState[rule.actuatorId] = evalCombinational(rule, step.inputs)
      }
    }
    actuatorState = newState
    perStep.push({ step: step.step, inputs: { ...step.inputs }, actuators: { ...actuatorState } })
  }

  return perStep
}

/**
 * @param {object} recipe — hidden, server-only (verification_definition.simulation).
 *   { sensorLabels: string[], actuatorLabels: {id,label}[],
 *     rules: [{actuatorId, type:"latch"|"combinational", setWhen?, resetWhen?, allOf?, anyOf?, noneOf?}],
 *     inputSequence: [{step, inputs: {sensorName: bool}}] }
 * @returns {object} PUBLIC simulation state: the panel's sensor/actuator
 *   labels and the full per-step timeline. The rule logic itself and the
 *   input sequence ARE the given bench setup (public, same as
 *   distributed_systems_lab's outage timeline) — the mission is to trace
 *   the resulting machine state, not to uncover a secret.
 */
export function generatePlcPanelState(recipe) {
  const { sensorLabels, actuatorLabels, inputSequence } = recipe
  const perStep = simulatePlc(recipe)
  return {
    simulationType: SIMULATION_TYPE,
    sensorLabels, actuatorLabels,
    stepCount: inputSequence.length,
    perStep,
  }
}

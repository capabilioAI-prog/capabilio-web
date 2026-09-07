/**
 * arena/simulations/digitalLogicBench.js — the ECE "Digital Logic Bench"
 * micro-simulation. A small fixed gate netlist evaluated over every input
 * combination — exact boolean evaluation, not a physics-style curve.
 * Distinct object set (gates, wires, switches) and interaction (toggle a
 * switch combination, probe every wire's value) from waveform_lab's
 * oscilloscope capture or any other registered simulation.
 */

export const SIMULATION_TYPE = "digital_logic_bench"

const GATE_FN = {
  AND: (a, b) => a && b,
  OR: (a, b) => a || b,
  NOT: (a) => !a,
  XOR: (a, b) => a !== b,
  NAND: (a, b) => !(a && b),
  NOR: (a, b) => !(a || b),
}

/** Evaluates every gate in listed order (the recipe author is
 *  responsible for listing gates in dependency order — a small, fixed
 *  netlist, not a general topological sort) for one input assignment,
 *  returning every wire's value including primary inputs. */
function evaluateNetlist(inputLabels, gates, inputBits) {
  const wireValues = {}
  inputLabels.forEach((label, i) => { wireValues[label] = !!inputBits[i] })
  for (const gate of gates) {
    const args = gate.inputs.map((w) => wireValues[w])
    wireValues[gate.output] = GATE_FN[gate.type](...args)
  }
  return wireValues
}

/** Every 2^n input combination as an array of booleans, MSB-first over `inputLabels`. */
function allCombinations(n) {
  const combos = []
  for (let i = 0; i < 2 ** n; i++) {
    combos.push(Array.from({ length: n }, (_, bit) => !!((i >> (n - 1 - bit)) & 1)))
  }
  return combos
}

/**
 * @param {object} recipe — hidden, server-only (verification_definition.simulation).
 *   { inputLabels: string[], gates: [{id,label,type,inputs:[wireRef],output:wireId}], outputWire }
 * @returns {object} PUBLIC simulation state: the netlist (for the diagram)
 *   plus the full truth table — every wire's value at every input
 *   combination. Nothing is hidden: the netlist IS the bench, exactly as
 *   built (possibly with a deliberate wiring mistake) — the mission is to
 *   compare its actual behavior against a stated design spec, not to
 *   uncover a secret.
 */
export function generateDigitalLogicState(recipe) {
  const { inputLabels, gates, outputWire } = recipe
  const combos = allCombinations(inputLabels.length)
  const truthTable = combos.map((bits) => {
    const wireValues = evaluateNetlist(inputLabels, gates, bits)
    return { inputs: Object.fromEntries(inputLabels.map((l, i) => [l, bits[i]])), wireValues, output: wireValues[outputWire] }
  })
  return {
    simulationType: SIMULATION_TYPE,
    inputLabels, gates, outputWire,
    truthTable,
  }
}

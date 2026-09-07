import { test } from "node:test"
import assert from "node:assert/strict"
import { generateDigitalLogicState } from "./digitalLogicBench.js"

test("a correctly-wired AND gate matches the AND truth table exactly", () => {
  const state = generateDigitalLogicState({
    inputLabels: ["A", "B"],
    gates: [{ id: "G1", label: "G1", type: "AND", inputs: ["A", "B"], output: "Y" }],
    outputWire: "Y",
  })
  assert.equal(state.truthTable.length, 4)
  assert.deepEqual(state.truthTable.map((r) => r.output), [false, false, false, true])
})

test("a miswired OR gate in place of AND diverges from the AND spec at exactly two combinations", () => {
  const state = generateDigitalLogicState({
    inputLabels: ["A", "B"],
    gates: [{ id: "G1", label: "G1", type: "OR", inputs: ["A", "B"], output: "Y" }],
    outputWire: "Y",
  })
  const andSpec = [false, false, false, true]
  const actual = state.truthTable.map((r) => r.output)
  const divergent = actual.filter((v, i) => v !== andSpec[i])
  assert.equal(divergent.length, 2)
})

test("a multi-gate netlist evaluates gates in listed order, feeding one gate's output into the next", () => {
  // Y = NOT(A AND B) — a 2-gate netlist (AND then NOT), i.e. NAND built from parts.
  const state = generateDigitalLogicState({
    inputLabels: ["A", "B"],
    gates: [
      { id: "G1", label: "AND", type: "AND", inputs: ["A", "B"], output: "W1" },
      { id: "G2", label: "NOT", type: "NOT", inputs: ["W1"], output: "Y" },
    ],
    outputWire: "Y",
  })
  assert.deepEqual(state.truthTable.map((r) => r.output), [true, true, true, false])
})

test("truth table covers all 2^n combinations for a 3-input netlist", () => {
  const state = generateDigitalLogicState({
    inputLabels: ["A", "B", "C"],
    gates: [
      { id: "G1", label: "AND", type: "AND", inputs: ["A", "B"], output: "W1" },
      { id: "G2", label: "OR", type: "OR", inputs: ["W1", "C"], output: "Y" },
    ],
    outputWire: "Y",
  })
  assert.equal(state.truthTable.length, 8)
})

test("exposes every named wire's value per row, not just the final output (a genuine probe target)", () => {
  const state = generateDigitalLogicState({
    inputLabels: ["A", "B"],
    gates: [{ id: "G1", label: "NAND", type: "NAND", inputs: ["A", "B"], output: "Y" }],
    outputWire: "Y",
  })
  assert.deepEqual(Object.keys(state.truthTable[0].wireValues).sort(), ["A", "B", "Y"])
})

test("is deterministic", () => {
  const recipe = { inputLabels: ["A", "B"], gates: [{ id: "G1", label: "XOR", type: "XOR", inputs: ["A", "B"], output: "Y" }], outputWire: "Y" }
  assert.deepEqual(generateDigitalLogicState(recipe), generateDigitalLogicState(recipe))
})

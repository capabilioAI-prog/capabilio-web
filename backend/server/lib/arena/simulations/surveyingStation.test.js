import { test } from "node:test"
import assert from "node:assert/strict"
import { computeTraverse, generateSurveyingStationState } from "./surveyingStation.js"

const PERFECT_SQUARE = [
  { id: "A", bearingDeg: 0, distanceM: 100 }, { id: "B", bearingDeg: 90, distanceM: 100 },
  { id: "C", bearingDeg: 180, distanceM: 100 }, { id: "D", bearingDeg: 270, distanceM: 100 },
]

test("a perfectly closed square traverse returns exactly to the starting point (zero closing error)", () => {
  const { linearClosingErrorM, points } = computeTraverse(PERFECT_SQUARE)
  assert.equal(linearClosingErrorM, 0)
  assert.deepEqual(points.at(-1), { id: "D", xM: 0, yM: 0 })
})

test("a shortened leg produces a linear closing error equal to the shortfall", () => {
  const shortened = [{ id: "A", bearingDeg: 0, distanceM: 100 }, { id: "B", bearingDeg: 90, distanceM: 100 }, { id: "C", bearingDeg: 180, distanceM: 98 }, { id: "D", bearingDeg: 270, distanceM: 100 }]
  const { linearClosingErrorM } = computeTraverse(shortened)
  assert.equal(linearClosingErrorM, 2)
})

test("a due-north leg (bearing 0) advances only the y-coordinate", () => {
  const { points } = computeTraverse([{ id: "A", bearingDeg: 0, distanceM: 50 }])
  assert.equal(points[1].xM, 0)
  assert.equal(points[1].yM, 50)
})

test("a due-east leg (bearing 90) advances only the x-coordinate", () => {
  const { points } = computeTraverse([{ id: "A", bearingDeg: 90, distanceM: 50 }])
  assert.equal(points[1].xM, 50)
  assert.equal(points[1].yM, 0)
})

test("generateSurveyingStationState exposes the sighted legs and plotted points without pre-computing the closing error", () => {
  const state = generateSurveyingStationState({ legs: PERFECT_SQUARE })
  assert.equal(state.simulationType, "surveying_station")
  assert.deepEqual(state.legs, PERFECT_SQUARE)
  assert.equal(state.points.length, 5) // start + 4 legs
  assert.equal(state.linearClosingErrorM, undefined)
})

test("is deterministic", () => {
  const recipe = { legs: PERFECT_SQUARE }
  assert.deepEqual(generateSurveyingStationState(recipe), generateSurveyingStationState(recipe))
})

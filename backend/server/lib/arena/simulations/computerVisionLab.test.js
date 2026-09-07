import { test } from "node:test"
import assert from "node:assert/strict"
import { computeIoU, generateComputerVisionState } from "./computerVisionLab.js"

test("identical boxes have IoU of exactly 1", () => {
  assert.equal(computeIoU({ x: 0, y: 0, w: 10, h: 10 }, { x: 0, y: 0, w: 10, h: 10 }), 1)
})

test("non-overlapping boxes have IoU of exactly 0", () => {
  assert.equal(computeIoU({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 20, w: 10, h: 10 }), 0)
})

test("a box shifted by half its width overlapping a same-size box gives IoU = 1/3", () => {
  assert.equal(computeIoU({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 0, w: 10, h: 10 }), 0.3333)
})

test("a missing prediction (null) always has IoU 0, never throws", () => {
  assert.equal(computeIoU({ x: 0, y: 0, w: 10, h: 10 }, null), 0)
})

test("generateComputerVisionState classifies each image against every candidate IoU threshold", () => {
  const state = generateComputerVisionState({
    images: [
      { id: 1, label: "Cat", imageWidth: 100, imageHeight: 100, groundTruthBox: { x: 10, y: 10, w: 30, h: 30 }, predictedBox: { x: 10, y: 10, w: 30, h: 30 } },
      { id: 2, label: "Dog", imageWidth: 100, imageHeight: 100, groundTruthBox: { x: 10, y: 10, w: 30, h: 30 }, predictedBox: { x: 60, y: 60, w: 30, h: 30 } },
      { id: 3, label: "Bird", imageWidth: 100, imageHeight: 100, groundTruthBox: { x: 10, y: 10, w: 30, h: 30 }, predictedBox: null },
    ],
    iouThresholdOptions: [0.5],
  })
  const [cat, dog, bird] = state.perImage
  assert.equal(cat.classifications[0].result, "correct_detection")
  assert.equal(dog.classifications[0].result, "false_positive")
  assert.equal(bird.classifications[0].result, "miss")
})

test("a lower IoU threshold can turn a false positive into a correct detection for the same box pair", () => {
  const state = generateComputerVisionState({
    images: [{ id: 1, label: "X", imageWidth: 100, imageHeight: 100, groundTruthBox: { x: 0, y: 0, w: 10, h: 10 }, predictedBox: { x: 5, y: 0, w: 10, h: 10 } }],
    iouThresholdOptions: [0.2, 0.5],
  })
  const [img] = state.perImage
  assert.equal(img.classifications[0].result, "correct_detection") // 0.333 >= 0.2
  assert.equal(img.classifications[1].result, "false_positive") // 0.333 < 0.5
})

test("is deterministic", () => {
  const recipe = { images: [{ id: 1, label: "X", imageWidth: 100, imageHeight: 100, groundTruthBox: { x: 0, y: 0, w: 10, h: 10 }, predictedBox: { x: 0, y: 0, w: 10, h: 10 } }], iouThresholdOptions: [0.5] }
  assert.deepEqual(generateComputerVisionState(recipe), generateComputerVisionState(recipe))
})

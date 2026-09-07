/**
 * arena/simulations/computerVisionLab.js — the AI/ML "Computer Vision
 * Lab" micro-simulation. A fixed set of images, each with a ground-truth
 * bounding box and a model-predicted bounding box, evaluated by
 * Intersection-over-Union — exact 2D box geometry, not a probability-
 * threshold classifier (that's model_diagnosis_studio's domain). Distinct
 * object set (images, bounding boxes, IoU) and interaction (inspect each
 * image's overlaid boxes, apply an IoU threshold) from every other
 * registered simulation.
 */

export const SIMULATION_TYPE = "computer_vision_lab"

function round(v, decimals = 4) {
  const f = 10 ** decimals
  return Math.round(v * f) / f
}

/** Standard Intersection-over-Union for two axis-aligned boxes {x,y,w,h}. */
export function computeIoU(boxA, boxB) {
  if (!boxA || !boxB) return 0
  const x1 = Math.max(boxA.x, boxB.x), y1 = Math.max(boxA.y, boxB.y)
  const interW = Math.max(0, Math.min(boxA.x + boxA.w, boxB.x + boxB.w) - x1)
  const interH = Math.max(0, Math.min(boxA.y + boxA.h, boxB.y + boxB.h) - y1)
  const interArea = interW * interH
  const unionArea = boxA.w * boxA.h + boxB.w * boxB.h - interArea
  return unionArea > 0 ? round(interArea / unionArea) : 0
}

/**
 * @param {object} recipe — hidden, server-only (verification_definition.simulation).
 *   { images: [{id, label, imageWidth, imageHeight, groundTruthBox, predictedBox: box|null}],
 *     iouThresholdOptions: number[] }
 * @returns {object} PUBLIC simulation state: every image's ground-truth
 *   and predicted boxes (given, public — a real annotated set) plus each
 *   image's IoU and its detection classification at every candidate
 *   threshold.
 */
export function generateComputerVisionState(recipe) {
  const { images, iouThresholdOptions } = recipe
  const perImage = images.map((img) => {
    const iou = computeIoU(img.groundTruthBox, img.predictedBox)
    const classifications = iouThresholdOptions.map((t) => ({
      threshold: t,
      result: !img.predictedBox ? "miss" : iou >= t ? "correct_detection" : "false_positive",
    }))
    return { id: img.id, label: img.label, imageWidth: img.imageWidth, imageHeight: img.imageHeight, groundTruthBox: img.groundTruthBox, predictedBox: img.predictedBox, iou, classifications }
  })
  return {
    simulationType: SIMULATION_TYPE,
    perImage,
  }
}

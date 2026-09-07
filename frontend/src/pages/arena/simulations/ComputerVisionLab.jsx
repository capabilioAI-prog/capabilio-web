import { useState } from "react"
import { A } from "../tokens"
import { BenchHeader, Chip } from "./uiKit.jsx"

const RESULT_COLOR = { correct_detection: A.emerald, false_positive: A.rose, miss: A.amber }
const RESULT_LABEL = { correct_detection: "Correct detection", false_positive: "False positive", miss: "Missed detection" }

/**
 * ComputerVisionLab — the AI/ML "Computer Vision Lab" micro-simulation.
 * Ground-truth and predicted bounding boxes overlaid on each image
 * canvas, classified by IoU against a selectable threshold — a 2D
 * image/box overlay, not a tabular confusion matrix.
 */
export default function ComputerVisionLab({ simulation }) {
  const thresholds = simulation?.perImage?.[0]?.classifications.map((c) => c.threshold) || []
  const [thresholdIndex, setThresholdIndex] = useState(0)

  if (!simulation) {
    return <div style={{ padding: 20, color: A.ink3, fontSize: 13 }}>Simulation unavailable — try reloading this mission.</div>
  }

  return (
    <div style={{ borderRadius: A.radiusSm, border: `1px solid ${A.border}`, overflow: "hidden", background: A.card }}>
      <BenchHeader label="Computer Vision Lab" color="#6D28D9" background="#F3EEFB" />

      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          IoU Threshold
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {thresholds.map((t, i) => (
            <Chip key={i} label={`≥ ${t}`} active={i === thresholdIndex} onClick={() => setThresholdIndex(i)} tone="#6D28D9" />
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          {simulation.perImage.map((img) => {
            const cls = img.classifications[thresholdIndex]
            const scaleX = 200 / img.imageWidth, scaleY = 150 / img.imageHeight
            return (
              <div key={img.id} style={{ width: 200 }}>
                <svg viewBox="0 0 200 150" width="200" height="150" style={{ display: "block", background: "#22222A", borderRadius: 8 }} role="img" aria-label={`${img.label} with bounding boxes`}>
                  <rect x={img.groundTruthBox.x * scaleX} y={img.groundTruthBox.y * scaleY} width={img.groundTruthBox.w * scaleX} height={img.groundTruthBox.h * scaleY} fill="none" stroke="#22C55E" strokeWidth="2" />
                  {img.predictedBox && (
                    <rect x={img.predictedBox.x * scaleX} y={img.predictedBox.y * scaleY} width={img.predictedBox.w * scaleX} height={img.predictedBox.h * scaleY} fill="none" stroke="#60A5FA" strokeDasharray="4 3" strokeWidth="2" />
                  )}
                </svg>
                <div style={{ marginTop: 6, fontSize: 11.5, fontWeight: 700, color: A.ink }}>{img.label} — IoU {img.iou}</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: RESULT_COLOR[cls.result] }}>{RESULT_LABEL[cls.result]}</div>
              </div>
            )
          })}
        </div>
        <div style={{ fontSize: 10.5, color: A.ink3, marginTop: 10 }}>
          <span style={{ color: "#22C55E" }}>■</span> ground truth &nbsp; <span style={{ color: "#60A5FA" }}>┅</span> prediction
        </div>
      </div>
    </div>
  )
}

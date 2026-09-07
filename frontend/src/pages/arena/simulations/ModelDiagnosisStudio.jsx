import { useState } from "react"
import { A } from "../tokens"
import { BenchHeader, Chip, Readout } from "./uiKit.jsx"

/**
 * ModelDiagnosisStudio — the AI/ML "Model Diagnosis Studio" micro-
 * simulation. A confusion-matrix grid plus a misclassified-example list
 * at the student-selected decision threshold — a metrics/errors
 * dashboard, not an image canvas (that's computer_vision_lab).
 */
export default function ModelDiagnosisStudio({ simulation }) {
  const [thresholdIndex, setThresholdIndex] = useState(0)

  if (!simulation) {
    return <div style={{ padding: 20, color: A.ink3, fontSize: 13 }}>Simulation unavailable — try reloading this mission.</div>
  }

  const m = simulation.byThreshold[thresholdIndex]

  return (
    <div style={{ borderRadius: A.radiusSm, border: `1px solid ${A.border}`, overflow: "hidden", background: A.card }}>
      <BenchHeader label="Model Diagnosis Studio" color="#6D28D9" background="#F3EEFB" />

      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          Decision Threshold
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {simulation.byThreshold.map((t, i) => (
            <Chip key={i} label={t.threshold.toFixed(2)} active={i === thresholdIndex} onClick={() => setThresholdIndex(i)} tone="#6D28D9" />
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Confusion Matrix</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 70px)", gap: 6 }}>
              <Cell label="TP" value={m.tp} color={A.emerald} bg={A.emerald2} />
              <Cell label="FP" value={m.fp} color={A.rose} bg={A.rose2} />
              <Cell label="FN" value={m.fn} color={A.rose} bg={A.rose2} />
              <Cell label="TN" value={m.tn} color={A.emerald} bg={A.emerald2} />
            </div>
          </div>

          <div style={{ flex: "1 1 200px", minWidth: 180 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Metrics</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Readout label="Precision" value={m.precision} />
              <Readout label="Recall" value={m.recall} />
              <Readout label="F1" value={m.f1} />
              <Readout label="Accuracy" value={m.accuracy} />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Misclassified Examples ({m.errors.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {m.errors.map((e) => (
              <div key={e.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, fontFamily: A.mono, padding: "5px 10px", background: A.rose2, borderRadius: 6 }}>
                <span>#{e.id} · score {e.score}</span>
                <span>true={e.trueLabel} predicted={e.predicted}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Cell({ label, value, color, bg }) {
  return (
    <div style={{ padding: "10px 0", textAlign: "center", background: bg, borderRadius: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: A.ink3 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color, fontFamily: A.mono }}>{value}</div>
    </div>
  )
}

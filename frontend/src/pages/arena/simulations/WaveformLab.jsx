import { useState, useId } from "react"
import { A } from "../tokens"
import { windowSamples, movingAverage, samplesToPolyline } from "./labDisplay.js"

const WIDTH = 640
const TRACE_HEIGHT = 110

/**
 * WaveformLab — the ECE "Signal Lab" micro-simulation (spec §7-8A). A
 * dual-channel oscilloscope: CH1 is the clean reference, CH2 is the
 * sensor/measured signal, which the mission's fixed (hidden) recipe may
 * have injected one real-world anomaly into. The controls here only
 * change how the student INSPECTS the fixed trace (timebase, averaging,
 * gain) — never the trace itself (spec §21).
 */
export default function WaveformLab({ simulation }) {
  const [timebasePct, setTimebasePct] = useState(100)
  const [averaging, setAveraging] = useState(1)
  const [gain, setGain] = useState(1)
  const summaryId = useId()

  if (!simulation) {
    return <div style={{ padding: 20, color: A.ink3, fontSize: 13 }}>Simulation unavailable — try reloading this mission.</div>
  }

  const ch1 = movingAverage(windowSamples(simulation.channel1.samples, timebasePct), averaging)
  const ch2 = movingAverage(windowSamples(simulation.channel2.samples, timebasePct), averaging)

  return (
    <div style={{ borderRadius: A.radiusSm, border: `1px solid ${A.border}`, overflow: "hidden", background: "#12121C" }}>
      <div style={{ padding: "10px 16px", fontSize: 10.5, fontWeight: 800, color: "#F5A15C", textTransform: "uppercase", letterSpacing: "0.08em", background: "#1B1B29" }}>
        Oscilloscope · {simulation.sampleRateHz.toLocaleString()} Sa/s
      </div>
      <div style={{ padding: 16 }}>
        <ScopeTrace label={simulation.channel1.label} samples={ch1} gain={gain} color="#5EEAD4" />
        <div style={{ height: 10 }} />
        <ScopeTrace label={simulation.channel2.label} samples={ch2} gain={gain} color="#FDBA74" />
      </div>
      <div style={{ padding: "14px 16px 18px", borderTop: "1px solid #26263A", display: "flex", flexWrap: "wrap", gap: 20 }}>
        <ScopeControl label="Timebase" value={timebasePct} min={10} max={100} step={5} suffix="%" onChange={setTimebasePct} />
        <ScopeControl label="Averaging" value={averaging} min={1} max={9} step={2} suffix="×" onChange={setAveraging} />
        <ScopeControl label="Gain" value={gain} min={0.5} max={2} step={0.1} suffix="×" onChange={setGain} />
      </div>
      <p id={summaryId} style={{ margin: 0, padding: "0 16px 14px", fontSize: 11.5, color: "#8A8AA0" }}>
        Showing {timebasePct}% of the capture window, {averaging}-sample averaging, {gain.toFixed(1)}× gain.
      </p>
    </div>
  )
}

function ScopeTrace({ label, samples, gain, color }) {
  const points = samplesToPolyline(samples, { width: WIDTH, height: TRACE_HEIGHT, gain })
  return (
    <div>
      <div style={{ fontSize: 11, fontFamily: A.mono, color: "#8A8AA0", marginBottom: 4 }}>{label}</div>
      <svg viewBox={`0 0 ${WIDTH} ${TRACE_HEIGHT}`} width="100%" height={TRACE_HEIGHT} style={{ display: "block", background: "#0B0B12", borderRadius: 6 }} role="img" aria-label={`${label} waveform trace`}>
        <line x1="0" y1={TRACE_HEIGHT / 2} x2={WIDTH} y2={TRACE_HEIGHT / 2} stroke="#26263A" strokeWidth="1" />
        <polyline points={points} fill="none" stroke={color} strokeWidth="1.6" />
      </svg>
    </div>
  )
}

function ScopeControl({ label, value, min, max, step, suffix, onChange }) {
  const id = useId()
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 140 }}>
      <label htmlFor={id} style={{ fontSize: 11, fontWeight: 700, color: "#C7C7D6", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          id={id} type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ flex: 1 }}
        />
        {/* Accessible non-slider alternative (spec §49) — full keyboard/AT operability. */}
        <input
          type="number" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={`${label} (numeric)`}
          style={{ width: 52, padding: "4px 6px", borderRadius: 6, border: "1px solid #26263A", background: "#12121C", color: "#F5F5F7", fontSize: 12, fontFamily: A.mono }}
        />
        <span style={{ fontSize: 11, color: "#8A8AA0" }}>{suffix}</span>
      </div>
    </div>
  )
}

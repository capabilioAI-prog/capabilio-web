import { useState, useId, useMemo } from "react"
import { A } from "../tokens"
import { computeOperatingPoint, sweepToPolyline, stockLevelToX } from "./operationsMath.js"

const GRAPH_W = 560
const GRAPH_H = 160

/**
 * OperationsLab — the MBA "Business Lab" micro-simulation. A stock-level
 * decision under a given demand range and unit costs (a closed-form
 * newsvendor cost model). Moving the stock-level control has real
 * consequences: service level, expected stockout/overstock, and weekly
 * cost all recompute deterministically — a business simulation, not a
 * highlighted multiple-choice option (spec §19).
 */
export default function OperationsLab({ simulation }) {
  const [stockLevelUnits, setStockLevelUnits] = useState(null)

  const stock = stockLevelUnits ?? (simulation ? Math.round((simulation.demandLowUnits + simulation.demandHighUnits) / 2) : 0)
  const point = useMemo(() => (simulation ? computeOperatingPoint({ ...simulation, stockLevelUnits: stock }) : null), [simulation, stock])

  if (!simulation || !point) {
    return <div style={{ padding: 20, color: A.ink3, fontSize: 13 }}>Simulation unavailable — try reloading this mission.</div>
  }

  const maxCost = Math.max(...simulation.points.map((p) => p.totalCostWeekly)) * 1.15
  const costPoly = sweepToPolyline(simulation.points, { width: GRAPH_W, height: GRAPH_H, field: "totalCostWeekly", demandLowUnits: simulation.demandLowUnits, demandHighUnits: simulation.demandHighUnits, maxValue: maxCost })
  const markerX = stockLevelToX(stock, { width: GRAPH_W, demandLowUnits: simulation.demandLowUnits, demandHighUnits: simulation.demandHighUnits })
  const markerY = GRAPH_H - (point.totalCostWeekly / maxCost) * GRAPH_H
  const budgetY = simulation.maxWeeklyCostBudget != null ? GRAPH_H - (simulation.maxWeeklyCostBudget / maxCost) * GRAPH_H : null

  return (
    <div style={{ borderRadius: A.radiusSm, border: `1px solid ${A.border}`, overflow: "hidden", background: A.card }}>
      <div style={{ padding: "10px 16px", fontSize: 10.5, fontWeight: 800, color: "#6D28D9", textTransform: "uppercase", letterSpacing: "0.08em", background: "#F3EEFB" }}>
        Operations Control Room
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, padding: 16 }}>
        <Panel title="Demand Model">
          <Readout label="Weekly Demand" value={`${simulation.demandLowUnits}–${simulation.demandHighUnits} units`} />
          <Readout label="Holding Cost" value={`$${simulation.unitHoldingCost} / unit / wk`} />
          <Readout label="Stockout Cost" value={`$${simulation.unitStockoutCost} / unit`} />
          {simulation.targetServiceLevelPct != null && <Readout label="Target Service" value={`${simulation.targetServiceLevelPct}%`} />}
        </Panel>

        <Panel title="This Week's Metrics">
          <Readout label="Service Level" value={`${point.serviceLevelPct.toFixed(1)}%`} />
          <Readout label="Expected Stockout" value={`${point.expectedStockoutUnits.toFixed(1)} units`} />
          <Readout label="Expected Overstock" value={`${point.expectedOverstockUnits.toFixed(1)} units`} />
          <Readout label="Weekly Cost" value={`$${point.totalCostWeekly.toFixed(0)}`} />
        </Panel>
      </div>

      <div style={{ padding: "0 16px 16px" }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          Weekly Cost vs Stock Level
        </div>
        <svg viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`} width="100%" height={GRAPH_H} style={{ display: "block", background: A.paper, borderRadius: 8 }} role="img" aria-label="Weekly cost versus stock level graph">
          {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" y1={GRAPH_H * f} x2={GRAPH_W} y2={GRAPH_H * f} stroke={A.border} strokeWidth="1" />)}
          {budgetY != null && <line x1="0" y1={budgetY} x2={GRAPH_W} y2={budgetY} stroke={A.rose} strokeWidth="1.2" strokeDasharray="4,4" opacity={0.6} />}
          <polyline points={costPoly} fill="none" stroke="#6D28D9" strokeWidth="2.2" />
          <line x1={markerX} y1="0" x2={markerX} y2={GRAPH_H} stroke="#6D28D9" strokeWidth="1" strokeDasharray="3,3" opacity={0.5} />
          <circle cx={markerX} cy={markerY} r="4.5" fill="#6D28D9" />
        </svg>
        {simulation.maxWeeklyCostBudget != null && (
          <div style={{ fontSize: 11, color: A.rose, marginTop: 4 }}>Cost budget: ${simulation.maxWeeklyCostBudget}/week (dashed line)</div>
        )}
        <StockControl value={stock} min={simulation.demandLowUnits} max={simulation.demandHighUnits} onChange={setStockLevelUnits} />
      </div>
    </div>
  )
}

function Panel({ title, children }) {
  return (
    <div style={{ flex: "1 1 200px", minWidth: 180 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  )
}

function Readout({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontFamily: A.mono, padding: "6px 10px", background: A.paper, borderRadius: 8, gap: 8 }}>
      <span style={{ color: A.ink3 }}>{label}</span>
      <span style={{ fontWeight: 800, color: A.ink, textAlign: "right" }}>{value}</span>
    </div>
  )
}

function StockControl({ value, min, max, onChange }) {
  const id = useId()
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
      <label htmlFor={id} style={{ fontSize: 11, fontWeight: 700, color: A.ink3, textTransform: "uppercase", letterSpacing: "0.06em", minWidth: 90 }}>
        Stock Level
      </label>
      <input id={id} type="range" min={min} max={max} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ flex: 1 }} />
      <input
        type="number" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Stock level (numeric units)"
        style={{ width: 72, padding: "4px 6px", borderRadius: 6, border: `1px solid ${A.border}`, fontSize: 12, fontFamily: A.mono }}
      />
      <span style={{ fontSize: 11, color: A.ink3 }}>units</span>
    </div>
  )
}

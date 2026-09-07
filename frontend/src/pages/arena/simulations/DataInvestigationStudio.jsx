import { useState } from "react"
import { A } from "../tokens"
import { BenchHeader, Chip } from "./uiKit.jsx"

/**
 * DataInvestigationStudio — the Data Science "Data Investigation Studio"
 * micro-simulation. A raw dataset with a filter toggle and a group-by
 * column selector, showing the resulting aggregate table — a filter/
 * group workbench, not a SQL editor or a statistical test.
 */
export default function DataInvestigationStudio({ simulation }) {
  const [filterOn, setFilterOn] = useState(false)
  const [groupBy, setGroupBy] = useState(simulation?.groupByOptions?.[0])

  if (!simulation) {
    return <div style={{ padding: 20, color: A.ink3, fontSize: 13 }}>Simulation unavailable — try reloading this mission.</div>
  }

  const table = (filterOn ? simulation.tables.filterOn : simulation.tables.filterOff)[groupBy]

  return (
    <div style={{ borderRadius: A.radiusSm, border: `1px solid ${A.border}`, overflow: "hidden", background: A.card }}>
      <BenchHeader label="Data Investigation Studio" color="#0F766E" background="#EAF6F0" />

      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Filter</div>
            <Chip label={simulation.excludeFilterLabel} active={filterOn} onClick={() => setFilterOn((v) => !v)} tone="#0F766E" />
          </div>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Group By</div>
            <div style={{ display: "flex", gap: 6 }}>
              {simulation.groupByOptions.map((col) => (
                <Chip key={col} label={col} active={col === groupBy} onClick={() => setGroupBy(col)} tone="#0F766E" />
              ))}
            </div>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12.5 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${A.border}` }}>
                <th style={{ textAlign: "left", padding: "6px 10px", color: A.ink3 }}>{groupBy}</th>
                <th style={{ textAlign: "right", padding: "6px 10px", color: A.ink3 }}>Count</th>
                <th style={{ textAlign: "right", padding: "6px 10px", color: A.ink3 }}>Sum</th>
                <th style={{ textAlign: "right", padding: "6px 10px", color: A.ink3 }}>Avg</th>
              </tr>
            </thead>
            <tbody>
              {table.map((row) => (
                <tr key={row.group} style={{ borderBottom: `1px solid ${A.border}` }}>
                  <td style={{ padding: "6px 10px", fontWeight: 700 }}>{row.group}</td>
                  <td style={{ padding: "6px 10px", textAlign: "right", fontFamily: A.mono }}>{row.count}</td>
                  <td style={{ padding: "6px 10px", textAlign: "right", fontFamily: A.mono }}>{row.sum}</td>
                  <td style={{ padding: "6px 10px", textAlign: "right", fontFamily: A.mono, fontWeight: 800, color: "#0F766E" }}>{row.avg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

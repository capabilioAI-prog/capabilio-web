import { useState } from "react"
import { A } from "../tokens"
import { BenchHeader, Chip } from "./uiKit.jsx"

const TS_FIELDS = [{ key: "createdAt", label: "Created" }, { key: "modifiedAt", label: "Modified" }, { key: "accessedAt", label: "Accessed" }]

/**
 * DigitalForensicsLab — the Cybersecurity "Digital Forensics Lab" micro-
 * simulation. A recovered-artifact table sortable by any timestamp field,
 * with a hash index highlighting content reused under different
 * filenames — file/hash correlation, not a live event stream (that's
 * soc_incident_room's domain).
 */
export default function DigitalForensicsLab({ simulation }) {
  const [sortField, setSortField] = useState("createdAt")

  if (!simulation) {
    return <div style={{ padding: 20, color: A.ink3, fontSize: 13 }}>Simulation unavailable — try reloading this mission.</div>
  }

  const sorted = simulation.artifacts.slice().sort((a, b) => a[sortField] - b[sortField])
  const duplicateHashes = new Set(simulation.hashIndex.filter((h) => h.artifactCount > 1).map((h) => h.hash))

  return (
    <div style={{ borderRadius: A.radiusSm, border: `1px solid ${A.border}`, overflow: "hidden", background: A.card }}>
      <BenchHeader label="Digital Forensics Lab" color="#BE123C" background="#FEF2F2" />

      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          Sort timeline by
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {TS_FIELDS.map((f) => (
            <Chip key={f.key} label={f.label} active={sortField === f.key} onClick={() => setSortField(f.key)} tone="#BE123C" />
          ))}
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${A.border}` }}>
                <th style={{ textAlign: "left", padding: "6px 8px", color: A.ink3 }}>File</th>
                <th style={{ textAlign: "left", padding: "6px 8px", color: A.ink3 }}>Path</th>
                <th style={{ textAlign: "right", padding: "6px 8px", color: A.ink3 }}>{TS_FIELDS.find((f) => f.key === sortField).label}</th>
                <th style={{ textAlign: "center", padding: "6px 8px", color: A.ink3 }}>Deleted</th>
                <th style={{ textAlign: "right", padding: "6px 8px", color: A.ink3 }}>Hash</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((a) => (
                <tr key={a.id} style={{ borderBottom: `1px solid ${A.border}`, background: duplicateHashes.has(a.hash) ? "#FEF2F2" : "transparent" }}>
                  <td style={{ padding: "6px 8px", fontWeight: 700 }}>{a.filename}</td>
                  <td style={{ padding: "6px 8px", color: A.ink3, fontFamily: A.mono, fontSize: 11 }}>{a.path}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: A.mono }}>{a[sortField]}</td>
                  <td style={{ padding: "6px 8px", textAlign: "center" }}>{a.isDeleted ? "✓" : ""}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: A.mono, fontWeight: duplicateHashes.has(a.hash) ? 800 : 400, color: duplicateHashes.has(a.hash) ? "#BE123C" : A.ink3 }}>
                    {a.hash}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

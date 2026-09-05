import { A, reportLabelFor } from "./tokens"

/**
 * MissionContext — turns the raw `scenario` string into visual context
 * (spec §19) via typographic framing, never by inventing structured
 * fields the backend didn't provide. `reportLabel` varies by stream
 * (BUG REPORT for CSE/MCA, SITE REPORT for Civil, CASE BRIEF for MBA,
 * etc.) — purely a display concern (tokens.js), zero backend involvement.
 */
export default function MissionContext({ streamSlug, scenario, missionText }) {
  const label = reportLabelFor(streamSlug)

  return (
    <div style={{
      background: A.paper, border: `1px solid ${A.border}`, borderRadius: A.radiusSm,
      overflow: "hidden", marginBottom: 20,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
        borderBottom: `1px solid ${A.border}`, background: A.card,
      }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: A.amber, display: "inline-block" }} />
        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.1em", color: A.ink3, textTransform: "uppercase" }}>{label}</span>
      </div>
      <div style={{ padding: "16px 18px", fontFamily: A.mono, fontSize: 13, color: A.ink2, lineHeight: 1.65 }}>
        {scenario}
      </div>
      {missionText && (
        <div style={{ padding: "14px 18px", borderTop: `1px dashed ${A.borderStrong}`, display: "flex", gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: A.indigo, textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0, paddingTop: 1 }}>Objective</span>
          <span style={{ fontSize: 13.5, color: A.ink, fontWeight: 600, lineHeight: 1.5 }}>{missionText}</span>
        </div>
      )}
    </div>
  )
}

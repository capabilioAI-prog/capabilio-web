import { useState } from "react"
import { A } from "./tokens"
import WeekProgress from "./WeekProgress"
import MissionGrid from "./MissionGrid"

/** ArenaWeekDashboard — the persisted-allocation view (spec §10, §32-33).
 *  Never re-spins, never shows the wheel/scratch mechanic again on its
 *  own — those only ever run once, right after a real spin. A student
 *  who already has an allocation lands here directly on every load. */
export default function ArenaWeekDashboard({ streamName, allocation, onOpenMission }) {
  const [showRecap, setShowRecap] = useState(false)

  // Defensive: this component only ever makes sense with a real
  // allocation (spec §32-33 assumes one already exists here) — a caller
  // bug that reaches this without one should degrade, not crash the page.
  if (!allocation) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "60px 20px", textAlign: "center", color: A.ink3, fontSize: 13 }}>
        Couldn&apos;t load this week&apos;s missions. Please refresh.
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px 60px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 12.5, color: A.ink3 }}>
          {streamName} · Common Challenges
        </div>
        <button
          onClick={() => setShowRecap(true)}
          style={{ fontSize: 11.5, fontWeight: 700, color: A.indigo, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
        >
          View this week&apos;s reveal
        </button>
      </div>

      <WeekProgress missions={allocation.missions} />
      <MissionGrid missions={allocation.missions} onOpenMission={onOpenMission} />

      {showRecap && (
        <RecapModal
          spinResult={allocation.spinResult}
          streamName={streamName}
          onClose={() => setShowRecap(false)}
        />
      )}
    </div>
  )
}

/** A compact, non-interactive recap of the week's reveal (spec §32) — no
 *  wheel, no scratch mechanic, no way to trigger another spin. Purely a
 *  read-back of the allocation that already exists. */
function RecapModal({ spinResult, streamName, onClose }) {
  return (
    <div
      role="dialog" aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, background: "rgba(24,24,34,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 500 }}
    >
      <div style={{ background: A.card, borderRadius: A.radius, padding: "32px 28px", maxWidth: 320, textAlign: "center", boxShadow: A.shadowLift }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: A.muted, textTransform: "uppercase", marginBottom: 10 }}>This Week</div>
        <div style={{ fontSize: 56, fontWeight: 900, color: A.indigoDeep, lineHeight: 1 }}>{spinResult}</div>
        <div style={{ fontSize: 13, fontWeight: 800, color: A.ink3, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Missions</div>
        <div style={{ fontSize: 12.5, color: A.ink3, marginBottom: 20 }}>{streamName}</div>
        <button
          onClick={onClose}
          style={{ padding: "10px 22px", borderRadius: 10, border: "none", background: A.indigo, color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}
        >
          Close
        </button>
      </div>
    </div>
  )
}

import { A, DIFFICULTY_META, familyFor } from "./tokens"

/** MissionHeader — compact, sticky, navigation + at-a-glance info only
 *  (spec §22). No fake countdown timer — estimated_minutes is shown as a
 *  plain estimate, never a ticking clock, since nothing here is actually
 *  server-time-limited (spec §23). */
export default function MissionHeader({ mission, challenge, onClose }) {
  const family = familyFor(challenge.challenge_type)
  const diff = DIFFICULTY_META[challenge.difficulty] || DIFFICULTY_META.easy

  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 10, background: A.card, borderBottom: `1px solid ${A.border}`,
      padding: "14px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
    }}>
      <button
        onClick={onClose}
        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: A.ink3, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, padding: 0 }}
      >
        ← Arena
      </button>
      <div style={{ width: 1, height: 20, background: A.border }} />
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: family.accent, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Mission {String(mission.position).padStart(2, "0")}
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, color: A.ink }}>{challenge.title}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Pill color={family.accent} bg={family.bg}>{challenge.competency_area}</Pill>
        <Pill color={diff.color} bg={diff.bg}>{diff.label}</Pill>
        <span style={{ fontSize: 12, color: A.ink3, whiteSpace: "nowrap" }}>Estimated time · {challenge.estimated_minutes} min</span>
        <span style={{ fontSize: 13, fontWeight: 900, color: family.accent }}>+{challenge.points} PTS</span>
      </div>
    </div>
  )
}

function Pill({ color, bg, children }) {
  return (
    <span style={{ fontSize: 10.5, fontWeight: 800, color, background: bg, padding: "3px 10px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.03em" }}>
      {children}
    </span>
  )
}

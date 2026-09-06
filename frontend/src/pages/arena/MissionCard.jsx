import { motion } from "framer-motion"
import { A, DIFFICULTY_META, WORKSTATION_LABEL, familyFor } from "./tokens"

const STATUS_META = {
  assigned:    { label: "Not started", color: A.ink3 },
  in_progress: { label: "In progress", color: A.amber },
  completed:   { label: "Completed",   color: A.emerald },
  failed:      { label: "Try again",   color: A.rose },
}

/** MissionCard — a mission, not a database record (spec §11). Color/glyph
 *  come from the challenge_type family (tokens.js), never a fabricated
 *  illustration — every field shown is a real backend value. */
export default function MissionCard({ mission, onOpen }) {
  const c = mission.arena_challenges || {}
  const family = familyFor(c.challenge_type)
  const diff = DIFFICULTY_META[c.difficulty] || DIFFICULTY_META.easy
  const status = STATUS_META[mission.status] || STATUS_META.assigned
  const completed = mission.status === "completed"
  const canOpen = !completed

  return (
    <motion.button
      className="arena-mission-card"
      onClick={() => canOpen && onOpen(mission.id)}
      disabled={!canOpen}
      whileHover={canOpen ? { y: -3 } : {}}
      whileTap={canOpen ? { y: -1 } : {}}
      transition={{ duration: 0.15 }}
      style={{
        textAlign: "left", padding: "22px 24px", borderRadius: 20, border: "none",
        background: family.bg, cursor: canOpen ? "pointer" : "default", fontFamily: "inherit",
        display: "flex", flexDirection: "column", gap: 14, position: "relative", overflow: "hidden",
        opacity: completed ? 0.7 : 1, width: "100%", boxSizing: "border-box", minHeight: 176,
      }}
    >
      <style>{`.arena-mission-card:hover .arena-mission-arrow { transform: translateX(3px); }`}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: A.mono, fontSize: 14, fontWeight: 800, color: family.accent, lineHeight: 1 }}>&gt;_</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: family.accent, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {diff.label}
          </span>
        </div>
        <div style={{
          fontSize: 12.5, fontWeight: 800, color: family.accent, background: "rgba(255,255,255,0.85)",
          padding: "4px 12px", borderRadius: 999, whiteSpace: "nowrap",
        }}>
          +{c.points} Pts
        </div>
      </div>

      <div>
        <div style={{ fontSize: 19, fontWeight: 800, color: A.ink, lineHeight: 1.3, marginBottom: 6 }}>{c.title}</div>
        <div style={{ fontSize: 12.5, color: "rgba(24,24,34,0.6)", lineHeight: 1.5 }}>
          {c.competency_area} · {WORKSTATION_LABEL[c.workstation_type] || c.workstation_type}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {completed ? (
          <span style={{ fontSize: 13, fontWeight: 800, color: status.color, display: "flex", alignItems: "center", gap: 5 }}>
            ✓ {status.label}
          </span>
        ) : (
          <span style={{ fontSize: 13.5, fontWeight: 800, color: mission.status === "failed" ? A.rose : family.accent, display: "flex", alignItems: "center", gap: 5 }}>
            {mission.status === "failed" ? "Try Again" : "Solve Task"}
            <span className="arena-mission-arrow" style={{ display: "inline-block", transition: "transform 0.15s ease" }}>→</span>
          </span>
        )}
      </div>
    </motion.button>
  )
}

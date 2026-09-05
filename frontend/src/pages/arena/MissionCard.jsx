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
        textAlign: "left", padding: "20px 22px", borderRadius: A.radius, border: `1px solid ${A.border}`,
        background: family.bg, cursor: canOpen ? "pointer" : "default", fontFamily: "inherit",
        display: "flex", flexDirection: "column", gap: 12, position: "relative", overflow: "hidden",
        opacity: completed ? 0.75 : 1, width: "100%", boxSizing: "border-box",
      }}
    >
      <style>{`.arena-mission-card:hover .arena-mission-arrow { transform: translateX(3px); }`}</style>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{
          fontFamily: A.mono, fontSize: 12, fontWeight: 700, color: family.accent,
          background: "rgba(255,255,255,0.6)", padding: "3px 9px", borderRadius: 999,
        }}>
          {String(mission.position).padStart(2, "0")}
        </div>
        <div style={{ fontSize: 13, fontWeight: 900, color: family.accent }}>+{c.points} PTS</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ fontSize: 16, color: family.accent, lineHeight: 1 }}>{family.glyph}</span>
        <span style={{ fontSize: 10.5, fontWeight: 800, color: family.accent, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {c.competency_area} · {WORKSTATION_LABEL[c.workstation_type] || c.workstation_type}
        </span>
      </div>

      <div style={{ fontSize: 17, fontWeight: 800, color: A.ink, lineHeight: 1.3 }}>{c.title}</div>

      {c.mission && (
        <div style={{ fontSize: 12.5, color: A.ink3, lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {c.mission}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
        <span style={{ fontSize: 11.5, color: A.ink3 }}>⏱ {c.estimated_minutes} min</span>
        <span style={{
          fontSize: 10.5, fontWeight: 800, padding: "2px 8px", borderRadius: 999,
          color: diff.color, background: diff.bg, textTransform: "uppercase", letterSpacing: "0.04em",
        }}>
          {diff.label}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4, paddingTop: 12, borderTop: `1px solid rgba(0,0,0,0.06)` }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: status.color }}>{status.label}</span>
        {canOpen && (
          <span style={{ fontSize: 12.5, fontWeight: 800, color: family.accent, display: "flex", alignItems: "center", gap: 4 }}>
            Enter Mission
            <span className="arena-mission-arrow" style={{ display: "inline-block", transition: "transform 0.15s ease" }}>→</span>
          </span>
        )}
      </div>
    </motion.button>
  )
}

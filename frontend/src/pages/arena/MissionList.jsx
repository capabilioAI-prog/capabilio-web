import { A, DIFFICULTY_COLOR, WORKSTATION_LABEL } from "./tokens"

const STATUS_LABEL = {
  assigned: "Not started", in_progress: "In progress", completed: "Completed", failed: "Try again",
}
const STATUS_COLOR = { assigned: A.muted, in_progress: A.amber, completed: A.emerald, failed: A.rose }

export default function MissionList({ spinResult, missions, onOpenMission }) {
  const completed = missions.filter((m) => m.status === "completed").length

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: A.ink }}>{spinResult} Missions This Week</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: A.ink3 }}>{completed} / {missions.length} completed</div>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: A.border, overflow: "hidden", marginBottom: 24 }}>
        <div style={{ height: "100%", width: `${missions.length ? (completed / missions.length) * 100 : 0}%`, background: A.emerald, borderRadius: 999, transition: "width 0.4s ease" }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {missions.map((m) => {
          const c = m.arena_challenges || {}
          const canOpen = m.status !== "completed"
          return (
            <button
              key={m.id}
              onClick={() => canOpen && onOpenMission(m.id)}
              disabled={!canOpen}
              style={{
                textAlign: "left", padding: "16px 18px", borderRadius: A.radius, border: `1px solid ${A.border}`,
                background: A.card, cursor: canOpen ? "pointer" : "default", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 14, boxShadow: A.shadow,
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                background: `${DIFFICULTY_COLOR[c.difficulty] || A.indigo}18`, color: DIFFICULTY_COLOR[c.difficulty] || A.indigo, fontSize: 12, fontWeight: 800,
              }}>
                {m.position}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: A.ink, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</div>
                <div style={{ fontSize: 11.5, color: A.ink3, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span>{c.competency_area}</span>
                  <span>·</span>
                  <span>{WORKSTATION_LABEL[c.workstation_type] || c.workstation_type}</span>
                  <span>·</span>
                  <span style={{ textTransform: "capitalize" }}>{c.difficulty}</span>
                  <span>·</span>
                  <span>{c.estimated_minutes} min</span>
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: A.ink }}>{m.points_awarded > 0 ? `+${m.points_awarded}` : c.points} pts</div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: STATUS_COLOR[m.status], marginTop: 2 }}>{STATUS_LABEL[m.status]}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

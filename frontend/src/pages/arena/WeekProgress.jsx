import { A } from "./tokens"

/** WeekProgress — a segmented rail (spec §15), one dot per mission, not a
 *  generic percentage bar. Purely a reflection of server-persisted
 *  mission statuses. */
export default function WeekProgress({ missions }) {
  const completed = missions.filter((m) => m.status === "completed").length
  const total = missions.length

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", color: A.muted, textTransform: "uppercase" }}>
          This Week in Arena
        </div>
        <div style={{ fontSize: 12.5, color: A.ink3, fontWeight: 700 }}>
          {completed} / {total} completed
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {missions.map((m, i) => {
          const done = m.status === "completed"
          const active = m.status === "in_progress" || m.status === "failed"
          return (
            <div
              key={m.id}
              title={`Mission ${i + 1}: ${m.status}`}
              style={{
                width: 22, height: 8, borderRadius: 999,
                background: done ? A.emerald : active ? A.amber : A.border,
                transition: "background 0.25s",
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

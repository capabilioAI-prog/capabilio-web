import { useState, useEffect } from "react"
import { arenaApi } from "../../lib/api"
import { A, familyFor } from "./tokens"

/** ArenaHistory — past weekly runs (spec §30). Clicking a week opens a
 *  READ-ONLY view of that week's actual persisted allocation (GET
 *  /arena/history/:weekStart) — never a re-spin, never editable. */
export default function ArenaHistory() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [openWeek, setOpenWeek] = useState(null)

  useEffect(() => {
    arenaApi.getHistory().then(setData).catch((e) => setError(e.message))
  }, [])

  if (error) return <div style={{ padding: 24, color: A.rose, fontSize: 13 }}>{error}</div>
  if (!data) return <div style={{ padding: 24, color: A.ink3, fontSize: 13 }}>Loading history…</div>

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px 60px" }}>
      {data.rank?.myStream && (
        <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: A.radiusSm, background: A.indigo2, fontSize: 13, color: A.ink2 }}>
          You&apos;re ranked <strong>#{data.rank.myStream.rank}</strong> of {data.rank.myStream.total} in your stream, with <strong>{data.rank.myStream.points}</strong> verified points.
        </div>
      )}

      {data.history.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: A.ink3, fontSize: 13, background: A.paper, borderRadius: A.radius }}>
          No past weeks yet — this week is your first.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.history.map((w) => (
            <button
              key={w.weekStart}
              onClick={() => setOpenWeek(w.weekStart)}
              style={{
                textAlign: "left", padding: "16px 18px", borderRadius: A.radiusSm, border: `1px solid ${A.border}`,
                background: A.card, cursor: "pointer", fontFamily: "inherit", width: "100%", boxSizing: "border-box",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: A.ink }}>Week of {formatWeek(w.weekStart)}</div>
                <div style={{ fontSize: 14, fontWeight: 900, color: A.indigo }}>+{w.points} pts</div>
              </div>
              <div style={{ fontSize: 12, color: A.ink3, marginBottom: 10 }}>
                {w.stream?.name || "—"} · {w.missionsCompleted} of {w.missionsAssigned} completed
              </div>
              <div style={{ display: "flex", gap: 5 }}>
                {Array.from({ length: w.missionsAssigned }).map((_, i) => (
                  <span key={i} style={{ width: 18, height: 6, borderRadius: 999, background: i < w.missionsCompleted ? A.emerald : A.border }} />
                ))}
              </div>
            </button>
          ))}
        </div>
      )}

      {openWeek && <WeekDetailModal weekStart={openWeek} onClose={() => setOpenWeek(null)} />}
    </div>
  )
}

function formatWeek(weekStart) {
  try {
    return new Date(`${weekStart}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
  } catch {
    return weekStart
  }
}

function WeekDetailModal({ weekStart, onClose }) {
  const [allocation, setAllocation] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    arenaApi.getHistoryWeek(weekStart).then((res) => setAllocation(res.allocation)).catch((e) => setError(e.message))
  }, [weekStart])

  return (
    <div
      role="dialog" aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, background: "rgba(24,24,34,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 500 }}
    >
      <div style={{ background: A.card, borderRadius: A.radius, padding: "24px 24px 28px", maxWidth: 480, width: "100%", maxHeight: "80vh", overflowY: "auto", boxShadow: A.shadowLift }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: A.ink }}>Week of {formatWeek(weekStart)}</div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", fontSize: 18, color: A.muted, cursor: "pointer" }}>×</button>
        </div>

        {error && <div style={{ color: A.rose, fontSize: 13 }}>{error}</div>}
        {!allocation && !error && <div style={{ color: A.ink3, fontSize: 13 }}>Loading…</div>}

        {allocation && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {allocation.missions.map((m) => {
              const c = m.arena_challenges || {}
              const family = familyFor(c.challenge_type)
              const done = m.status === "completed"
              return (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: family.bg }}>
                  <span style={{ fontSize: 14, color: family.accent }}>{family.glyph}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: A.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</div>
                    <div style={{ fontSize: 10.5, color: A.ink3 }}>{c.competency_area}</div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: done ? A.emerald : A.ink3, textAlign: "right", flexShrink: 0 }}>
                    {done ? `+${m.points_awarded} pts` : "Not completed"}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

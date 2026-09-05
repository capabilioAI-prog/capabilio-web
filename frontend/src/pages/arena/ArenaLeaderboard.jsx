import { useState, useEffect } from "react"
import { arenaApi } from "../../lib/api"
import { A } from "./tokens"

/** ArenaLeaderboard — real, verified-points-only data (spec §29). Top 3
 *  get a distinct podium treatment; the leaderboard never dominates the
 *  Active Week experience — it's a separate tab, not layered on top. */
export default function ArenaLeaderboard() {
  const [data, setData] = useState(null)
  const [tab, setTab] = useState("myStream")
  const [error, setError] = useState(null)

  useEffect(() => {
    arenaApi.getLeaderboard().then(setData).catch((e) => setError(e.message))
  }, [])

  if (error) return <div style={{ padding: 24, color: A.rose, fontSize: 13 }}>{error}</div>
  if (!data) return <div style={{ padding: 24, color: A.ink3, fontSize: 13 }}>Loading leaderboard…</div>

  const rows = tab === "myStream" ? data.myStream : data.global
  const podium = rows.slice(0, 3)
  const rest = rows.slice(3)

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px 60px" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[["myStream", "My Stream"], ["global", "Global"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: "8px 16px", borderRadius: 999, border: `1px solid ${tab === key ? A.indigo : A.border}`,
            background: tab === key ? A.indigo2 : A.card, color: tab === key ? A.indigo : A.ink3,
            fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}>{label}</button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: A.ink3, fontSize: 13, background: A.paper, borderRadius: A.radius }}>
          No verified completions yet — be the first.
        </div>
      ) : (
        <>
          {podium.length > 0 && <Podium entries={podium} />}
          {rest.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: podium.length > 0 ? 20 : 0 }}>
              {rest.map((r) => (
                <div key={r.studentId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, border: `1px solid ${A.border}`, background: A.card }}>
                  <div style={{ width: 28, fontSize: 12.5, fontWeight: 800, color: A.ink3 }}>#{r.rank}</div>
                  <div style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: A.ink }}>{r.displayName}</div>
                  <div style={{ fontSize: 11.5, color: A.ink3, marginRight: 10 }}>{r.completedMissions} missions</div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: A.indigo }}>{r.points} pts</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

const PODIUM_STYLE = {
  1: { order: 2, height: 128, color: A.gold, bg: "#FBF3DE" },
  2: { order: 1, height: 104, color: "#8B8B96", bg: "#F1F1F3" },
  3: { order: 3, height: 88,  color: "#B5713E", bg: "#F7ECE0" },
}

function Podium({ entries }) {
  // entries[0] is always rank 1 (server-sorted) — map by array index to a rank, not by trusting a client-side re-sort.
  const byRank = entries.map((e, i) => ({ ...e, rank: e.rank ?? i + 1 }))
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 14 }}>
      {byRank.map((r) => {
        const style = PODIUM_STYLE[r.rank] || PODIUM_STYLE[3]
        return (
          <div key={r.studentId} style={{ order: style.order, display: "flex", flexDirection: "column", alignItems: "center", width: 130 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: A.ink, marginBottom: 2, textAlign: "center" }}>{r.displayName}</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: style.color, marginBottom: 8 }}>{r.points} pts</div>
            <div style={{
              width: "100%", height: style.height, borderRadius: "14px 14px 0 0", background: style.bg,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", paddingTop: 12,
              border: `1px solid ${style.color}33`, borderBottom: "none",
            }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: style.color }}>#{r.rank}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

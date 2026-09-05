import { useState, useEffect } from "react"
import { arenaApi } from "../../lib/api"
import { A } from "./tokens"

export default function Leaderboard() {
  const [data, setData] = useState(null)
  const [tab, setTab] = useState("myStream")
  const [error, setError] = useState(null)

  useEffect(() => {
    arenaApi.getLeaderboard().then(setData).catch((e) => setError(e.message))
  }, [])

  if (error) return <div style={{ padding: 24, color: A.rose, fontSize: 13 }}>{error}</div>
  if (!data) return <div style={{ padding: 24, color: A.ink3, fontSize: 13 }}>Loading leaderboard…</div>

  const rows = tab === "myStream" ? data.myStream : data.global

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[["myStream", "My Stream"], ["global", "Global"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: "8px 16px", borderRadius: 999, border: `1px solid ${tab === key ? A.indigo : A.border}`,
            background: tab === key ? A.indigo2 : A.card, color: tab === key ? A.indigo : A.ink3,
            fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}>{label}</button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: 24, textAlign: "center", color: A.ink3, fontSize: 13 }}>No verified completions yet — be the first.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {rows.map((r) => (
            <div key={r.studentId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, border: `1px solid ${A.border}`, background: A.card }}>
              <div style={{ width: 26, fontSize: 12.5, fontWeight: 800, color: r.rank <= 3 ? A.amber : A.ink3 }}>#{r.rank}</div>
              <div style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: A.ink }}>{r.displayName}</div>
              <div style={{ fontSize: 11.5, color: A.ink3, marginRight: 10 }}>{r.completedMissions} missions</div>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: A.indigo }}>{r.points} pts</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

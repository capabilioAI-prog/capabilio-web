import { useState, useEffect } from "react"
import { arenaApi } from "../../lib/api"
import { A } from "./tokens"

export default function History() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    arenaApi.getHistory().then(setData).catch((e) => setError(e.message))
  }, [])

  if (error) return <div style={{ padding: 24, color: A.rose, fontSize: 13 }}>{error}</div>
  if (!data) return <div style={{ padding: 24, color: A.ink3, fontSize: 13 }}>Loading history…</div>

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px" }}>
      {data.rank?.myStream && (
        <div style={{ marginBottom: 18, padding: "12px 16px", borderRadius: 12, background: A.indigo2, fontSize: 13, color: A.ink2 }}>
          You&apos;re ranked <strong>#{data.rank.myStream.rank}</strong> of {data.rank.myStream.total} in your stream, with <strong>{data.rank.myStream.points}</strong> verified points.
        </div>
      )}

      {data.history.length === 0 ? (
        <div style={{ padding: 24, textAlign: "center", color: A.ink3, fontSize: 13 }}>No past weeks yet — this week is your first.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.history.map((w) => (
            <div key={w.weekStart} style={{ padding: "14px 16px", borderRadius: 12, border: `1px solid ${A.border}`, background: A.card }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: A.ink }}>Week of {w.weekStart}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: A.indigo }}>{w.points} pts</div>
              </div>
              <div style={{ fontSize: 11.5, color: A.ink3 }}>
                {w.stream?.name || "—"} · {w.missionsCompleted} / {w.missionsAssigned} completed · spin result {w.spinResult}
              </div>
              <div style={{ margin: "8px 0 0", height: 4, borderRadius: 999, background: A.border, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${w.missionsAssigned ? (w.missionsCompleted / w.missionsAssigned) * 100 : 0}%`, background: A.emerald }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

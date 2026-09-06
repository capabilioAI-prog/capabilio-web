import { useState, useEffect } from "react"
import { arenaApi } from "../../lib/api"
import { A } from "./tokens"

/** Short badge codes for a student's authoritative stream — real backend
 *  data (leaderboard.js attaches { slug, name } per student), never
 *  fabricated. Falls back to the stream's own slug, uppercased, for any
 *  stream not in this list rather than hiding the badge. */
const STREAM_CODE = {
  cse: "CSE", it: "IT", "ai-ml": "AI/ML", "ai-ds": "AI/DS",
  "cyber-security": "CYBER", ece: "ECE", eee: "EEE", mechanical: "MECH",
  civil: "CIVIL",
}
function streamCode(stream) {
  if (!stream) return null
  return STREAM_CODE[stream.slug] || stream.slug.toUpperCase()
}

// A restrained, fixed palette for initials-avatars — deterministic by
// studentId (same student always gets the same color), not random.
const AVATAR_COLORS = [
  { bg: "#EEF0FF", text: "#3730A3" }, { bg: "#EAF6F0", text: "#0F766E" },
  { bg: "#FDF1E7", text: "#B45309" }, { bg: "#F3EEFB", text: "#6D28D9" },
  { bg: "#EEF6FB", text: "#0369A1" }, { bg: "#FBEFF0", text: "#BE123C" },
]
function avatarColorFor(id) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}
function initialsFor(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase()
}

function Avatar({ entry, size = 44, ringColor }) {
  const colors = avatarColorFor(entry.studentId)
  return (
    <div
      aria-hidden="true"
      style={{
        width: size, height: size, borderRadius: "50%", background: colors.bg, color: colors.text,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.36, fontWeight: 800, flexShrink: 0,
        border: ringColor ? `3px solid ${ringColor}` : `1px solid ${A.border}`,
        boxSizing: "border-box",
      }}
    >
      {initialsFor(entry.displayName)}
    </div>
  )
}

function StreamTag({ stream }) {
  const code = streamCode(stream)
  if (!code) return null
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, color: A.ink3, background: A.paper, border: `1px solid ${A.border}`,
      padding: "2px 8px", borderRadius: 999, letterSpacing: "0.03em",
    }}>
      {code}
    </span>
  )
}

/** ArenaLeaderboard — real, verified-points-only data. Top 3 get a
 *  distinct podium treatment (avatar + rank badge + stream + points);
 *  the ranked list below shows tasks completed and a real streak
 *  (consecutive weeks with a verified completion, computed server-side —
 *  never a fabricated number). */
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
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px 60px" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: podium.length > 0 ? 40 : 0 }}>
              {rest.map((r) => (
                <div key={r.studentId} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 14, border: `1px solid ${A.border}`, background: A.card }}>
                  <div style={{ width: 26, fontSize: 12.5, fontWeight: 800, color: A.ink3 }}>#{r.rank}</div>
                  <Avatar entry={r} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: A.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.displayName}</span>
                      <StreamTag stream={r.stream} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11.5, color: A.ink3 }}>
                      <span>◎ {r.completedMissions} {r.completedMissions === 1 ? "Task" : "Tasks"}</span>
                      {r.streak > 0 && <span style={{ color: A.amber, fontWeight: 700 }}>🔥 {r.streak} Streak</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: A.indigo, whiteSpace: "nowrap" }}>{r.points} pts</div>
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
  1: { order: 2, ring: A.gold, size: 76, badgeBg: A.gold, elevate: true },
  2: { order: 1, ring: "#8B8B96", size: 60, badgeBg: "#8B8B96", elevate: false },
  3: { order: 3, ring: "#B5713E", size: 60, badgeBg: "#B5713E", elevate: false },
}

function Podium({ entries }) {
  // entries[0] is always rank 1 (server-sorted) — map by array index to a rank, not by trusting a client-side re-sort.
  const byRank = entries.map((e, i) => ({ ...e, rank: e.rank ?? i + 1 }))
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 28 }}>
      {byRank.map((r) => {
        const style = PODIUM_STYLE[r.rank] || PODIUM_STYLE[3]
        return (
          <div key={r.studentId} style={{ order: style.order, display: "flex", flexDirection: "column", alignItems: "center", width: 140, paddingBottom: style.elevate ? 16 : 0 }}>
            {style.elevate && <div style={{ fontSize: 18, marginBottom: 6 }} aria-hidden="true">✨</div>}
            <div style={{ position: "relative", marginBottom: 10 }}>
              <Avatar entry={r} size={style.size} ringColor={style.ring} />
              <div style={{
                position: "absolute", bottom: -4, right: -4, width: 22, height: 22, borderRadius: "50%",
                background: style.badgeBg, color: "#fff", fontSize: 11, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${A.cream}`,
              }}>
                {r.rank}
              </div>
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: A.ink, marginBottom: 4, textAlign: "center" }}>{r.displayName}</div>
            <div style={{ marginBottom: 6 }}><StreamTag stream={r.stream} /></div>
            <div style={{ fontSize: style.elevate ? 22 : 18, fontWeight: 900, color: A.indigo }}>{r.points} pts</div>
          </div>
        )
      })}
    </div>
  )
}

// ─── GithubCodeDnaCard ────────────────────────────────────────────────────────
// The shared "GitHub & Code DNA" status presentation used in Settings and
// Career & Vault — see the design report's "canonical identity" requirement:
// every surface reads the same underlying connection, never a separately-
// computed idea of "is GitHub connected." (Portfolio.jsx has its own
// existing, bespoke "GitHub Verification" section with different styling —
// this component isn't used there; its headline numbers were added directly
// into that existing section instead, to avoid two competing designs on the
// same page.)
//
// Always fetches its own data (GET /api/github/connection) — there is no
// public/pre-fetched mode, since both current callers are the signed-in
// owner's own authenticated view.
//
// `variant`: "full" (Settings — connect/disconnect actions, verification
// flow) | "compact" (Career & Vault — status + link out, never a dashboard).
// Both variants carry the "Refresh GitHub Evidence" action — there is no
// background scheduler; POST /api/github/refresh (user-initiated only) is
// the sole rescan trigger besides the initial connect. A normal page load
// always shows the last saved result and never re-hits GitHub.
import { useEffect, useState } from "react"
import { githubApi } from "../lib/api"

const T = {
  ink: "#1A1714", ink2: "#475569", ink3: "#A8A29E", ink4: "#6B6560",
  indigo: "#6366F1", indigo3: "rgba(99,102,241,0.12)",
  green: "#10B981", green2: "rgba(16,185,129,0.12)",
  amber: "#F59E0B", amber2: "rgba(245,158,11,0.12)",
  red: "#F43F5E", border: "rgba(0,0,0,0.08)", shadow: "0 2px 8px rgba(0,0,0,0.06)",
  bg: "#fff",
}

const CONFIDENCE_LABEL = { high: "High confidence", moderate: "Moderate confidence", low: "Low confidence" }

function timeAgo(iso) {
  if (!iso) return null
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
function timeUntil(iso) {
  if (!iso) return null
  const mins = Math.ceil((new Date(iso).getTime() - Date.now()) / 60000)
  if (mins <= 0) return null
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export default function GithubCodeDnaCard({ variant = "full", onConnectClick }) {
  const [conn, setConn] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshMessage, setRefreshMessage] = useState(null) // { tone: 'error'|'info', text }

  function load() {
    return githubApi.connection()
      .then(setConn)
      .catch(() => setConn({ connected: false }))
  }

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [])

  // Local "requesting" state covers the gap before the atomic backend claim
  // resolves — the real concurrency guard is server-side (tryStartManualScan),
  // this just stops an eager double-click from firing a second request.
  const [requesting, setRequesting] = useState(false)
  const isScanning = requesting || conn?.scanStatus === "scanning"
  const cooldownLeft = !isScanning ? timeUntil(conn?.refreshAvailableAt) : null
  const canRefresh = !!conn?.connected && !isScanning && !cooldownLeft

  async function handleRefresh() {
    if (!canRefresh) return
    setRequesting(true)
    setRefreshMessage(null)
    try {
      const result = await githubApi.refresh()
      if (result?.refreshed === false) {
        setRefreshMessage({ tone: "error", text: "That refresh didn't complete — showing your last successful analysis instead." })
      } else {
        setRefreshMessage(null)
      }
    } catch (e) {
      setRefreshMessage({ tone: "error", text: e.message || "That refresh didn't complete — showing your last successful analysis instead." })
    } finally {
      await load()
      setRequesting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 16, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, fontSize: 12, color: T.ink4 }}>
        Loading GitHub status…
      </div>
    )
  }

  const isConnected = !!(conn?.connected)
  const username = conn?.username
  const score = conn?.codeDnaScore
  const confidence = conn?.confidenceLevel
  const repos = conn?.repositoriesAnalyzed
  const verified = conn?.verificationState === "verified"

  if (!isConnected) {
    return (
      <div style={{ padding: 16, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: T.shadow }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 4 }}>🐙 GitHub</div>
        <div style={{ fontSize: 12, color: T.ink3, marginBottom: variant === "full" ? 12 : 0 }}>
          Connect your GitHub profile to generate your Code DNA.
        </div>
        {variant === "full" && onConnectClick && (
          <button onClick={onConnectClick} style={{ padding: "8px 16px", background: T.indigo, border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            Connect GitHub
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: 16, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: T.shadow }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: variant === "compact" ? 8 : 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, display: "flex", alignItems: "center", gap: 6 }}>
            🐙 GitHub {username && <span style={{ color: T.ink3, fontWeight: 500 }}>@{username}</span>}
            {verified && <span style={{ padding: "1px 7px", background: T.green2, color: T.green, borderRadius: 20, fontSize: 10, fontWeight: 800 }}>Verified</span>}
          </div>
        </div>
        {typeof score === "number" && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.indigo, lineHeight: 1 }}>{score}</div>
            <div style={{ fontSize: 9, color: T.ink4, fontWeight: 700, textTransform: "uppercase" }}>Code DNA</div>
          </div>
        )}
      </div>

      {variant !== "compact" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 12, fontSize: 12, color: T.ink3 }}>
          {confidence && <span>Verification: <strong style={{ color: T.ink2 }}>{CONFIDENCE_LABEL[confidence] || confidence}</strong></span>}
          {typeof repos === "number" && <span>Repositories analyzed: <strong style={{ color: T.ink2 }}>{repos}</strong></span>}
        </div>
      )}

      {variant === "full" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 8, fontSize: 11, color: T.ink4 }}>
          {conn.lastScannedAt && <span>Last analyzed: {timeAgo(conn.lastScannedAt)}</span>}
          {isScanning && <span style={{ color: T.amber, fontWeight: 700 }}>Analyzing your coding history…</span>}
        </div>
      )}

      {variant === "compact" && (
        <div style={{ fontSize: 11, color: T.ink4, marginBottom: 10 }}>
          {isScanning ? <span style={{ color: T.amber, fontWeight: 700 }}>Analyzing…</span> : conn.lastScannedAt ? `Updated ${timeAgo(conn.lastScannedAt)}` : null}
        </div>
      )}

      {conn.lastScanFailed && !isScanning && !refreshMessage && (
        <div style={{ fontSize: 11, color: T.red, marginBottom: 10 }}>
          Your last refresh didn&apos;t complete — showing your previous successful analysis.
        </div>
      )}
      {refreshMessage && (
        <div style={{ fontSize: 11, color: refreshMessage.tone === "error" ? T.red : T.ink4, marginBottom: 10 }}>
          {refreshMessage.text}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <a href="#code-dna" onClick={e => { e.preventDefault(); document.dispatchEvent(new CustomEvent("capabilio:navigate-tab", { detail: "fingerprint" })) }}
          style={{ fontSize: 12, fontWeight: 700, color: T.indigo, textDecoration: "none" }}>
          View Code DNA →
        </a>
        {(conn.profileUrl || username) && (
          <a href={conn.profileUrl || `https://github.com/${username}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 700, color: T.ink3, textDecoration: "none" }}>
            View GitHub ↗
          </a>
        )}
        <button
          onClick={handleRefresh}
          disabled={!canRefresh}
          title={cooldownLeft ? `You can refresh again in ${cooldownLeft}` : undefined}
          style={{
            marginLeft: "auto", padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
            border: `1px solid ${canRefresh ? T.indigo : T.border}`,
            background: canRefresh ? T.indigo3 : "transparent",
            color: canRefresh ? T.indigo : T.ink3,
            cursor: canRefresh ? "pointer" : "default",
          }}
        >
          {isScanning ? "Refreshing…" : cooldownLeft ? `Refresh in ${cooldownLeft}` : "Refresh GitHub Evidence"}
        </button>
      </div>
    </div>
  )
}

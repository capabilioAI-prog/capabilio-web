import { useState, useEffect, useCallback } from "react"
import { arenaApi } from "../../lib/api"
import { A } from "./tokens"
import StreamPicker from "./StreamPicker"
import ArenaWeeklyReveal from "./ArenaWeeklyReveal"
import ArenaWeekDashboard from "./ArenaWeekDashboard"
import MissionWorkspace from "./MissionWorkspace"
import ArenaLeaderboard from "./ArenaLeaderboard"
import ArenaHistory from "./ArenaHistory"

const TABS = [["active", "Active Week"], ["leaderboard", "Leaderboard"], ["history", "History"]]

/**
 * Arena — the one canonical Student Path Arena (spec §46). Single route,
 * single component hierarchy. This component is a strict CONSUMER of
 * backend truth (spec §41): it never decides a stream, a spin result, a
 * mission count, or a verification outcome on its own — every one of
 * those comes from a GET/POST response and is simply rendered.
 *
 * View logic is intentionally simple: no allocation yet -> reveal
 * sequence; allocation already exists -> straight to the dashboard, every
 * single time (refresh, relogin, second load) — spec §32-33 (no re-spin,
 * no re-reveal, ever, once an allocation exists for the current week).
 */
export default function Arena() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stream, setStream] = useState(null)
  const [streamOptions, setStreamOptions] = useState([])
  const [allocation, setAllocation] = useState(null)
  const [wheelOutcomes, setWheelOutcomes] = useState(null)
  const [activeMissionId, setActiveMissionId] = useState(null)
  const [tab, setTab] = useState("active")
  // Separate from `allocation` itself: whether the reveal sequence
  // (wheel + scratch) has finished. A returning user whose allocation
  // already existed on load starts here at "dashboard" directly (spec
  // §32) — a student who just spun stays on "reveal" (even though
  // `allocation` is already populated by then) until they click "Enter
  // Arena" on the scratch card, so the wheel/scratch animation is never
  // skipped by allocation data simply becoming available.
  const [viewMode, setViewMode] = useState("dashboard")

  const loadEverything = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [streamRes, configRes] = await Promise.all([arenaApi.getStream(), arenaApi.getConfig()])
      setWheelOutcomes(configRes.wheelOutcomes)
      if (!streamRes.resolved) {
        setStream(null); setStreamOptions(streamRes.streams || [])
        setAllocation(null)
        return
      }
      setStream(streamRes.stream)
      const allocRes = await arenaApi.getAllocation()
      setAllocation(allocRes.allocation)
      // On a fresh page load: an allocation already existing means this
      // student already spun this week (possibly in an earlier session)
      // — go straight to the dashboard, never re-show the wheel/scratch
      // mechanic. No allocation yet means the reveal sequence is next.
      setViewMode(allocRes.allocation ? "dashboard" : "reveal")
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadEverything() }, [loadEverything])

  async function handleSelectStream(streamId) {
    const res = await arenaApi.setStream(streamId)
    setStream(res.stream)
    setStreamOptions([])
    const allocRes = await arenaApi.getAllocation()
    setAllocation(allocRes.allocation)
    setViewMode(allocRes.allocation ? "dashboard" : "reveal")
  }

  // Returns the server's authoritative spin result to ArenaWeeklyReveal —
  // the wheel/scratch mechanic only ever visualizes what this call
  // already decided (spec §3). Deliberately does NOT flip viewMode here:
  // the reveal component stays mounted through its own wheel+scratch
  // sequence; viewMode only becomes "dashboard" once the student clicks
  // "Enter Arena" (handleRevealDone).
  async function handleSpin() {
    const res = await arenaApi.spin()
    setAllocation({ allocationId: res.allocationId, streamId: res.streamId, spinResult: res.spinResult, spinAt: new Date().toISOString(), missions: res.missions })
    return res
  }

  function handleRevealDone() {
    setViewMode("dashboard")
  }

  function handleMissionResult() {
    arenaApi.getAllocation().then((res) => setAllocation(res.allocation)).catch(() => {})
  }

  function handleContinueToNext(finishedMissionId) {
    const missions = allocation?.missions || []
    const idx = missions.findIndex((m) => m.id === finishedMissionId)
    const next = missions.slice(idx + 1).find((m) => m.status !== "completed")
    setActiveMissionId(next ? next.id : null)
    handleMissionResult()
  }

  if (loading) {
    return <div style={{ padding: "60px 20px", textAlign: "center", color: A.ink3, fontSize: 13 }}>Loading Arena…</div>
  }

  return (
    <div style={{ background: A.cream, minHeight: "100%" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: A.ink, letterSpacing: "-0.01em" }}>Arena</div>
          {stream && viewMode === "dashboard" && (
            <nav style={{ display: "flex", gap: 4, background: A.paper, padding: 4, borderRadius: 999 }}>
              {TABS.map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  aria-current={tab === key ? "page" : undefined}
                  style={{
                    padding: "7px 16px", borderRadius: 999, border: "none",
                    background: tab === key ? A.card : "transparent",
                    color: tab === key ? A.indigoDeep : A.ink3,
                    fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    boxShadow: tab === key ? A.shadow : "none", transition: "all 0.15s",
                  }}
                >
                  {label}
                </button>
              ))}
            </nav>
          )}
        </div>
      </div>

      {error && (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "12px 20px 0" }}>
          <div style={{ padding: "10px 14px", borderRadius: 10, background: A.rose2, color: A.rose, fontSize: 12.5 }}>{error}</div>
        </div>
      )}

      {!stream ? (
        <StreamPicker streams={streamOptions} onSelect={handleSelectStream} />
      ) : viewMode === "reveal" ? (
        <ArenaWeeklyReveal
          outcomes={wheelOutcomes || [5, 6, 7, 8, 9, 10, 11, 12]}
          streamName={stream.name}
          onSpin={handleSpin}
          onDone={handleRevealDone}
        />
      ) : tab === "leaderboard" ? (
        <ArenaLeaderboard />
      ) : tab === "history" ? (
        <ArenaHistory />
      ) : allocation ? (
        <ArenaWeekDashboard streamName={stream.name} allocation={allocation} onOpenMission={setActiveMissionId} />
      ) : (
        // A transient failure fetching the allocation (e.g. after the
        // stream itself resolved fine) must never render the dashboard
        // with a null allocation — ArenaWeekDashboard reads
        // allocation.missions unconditionally and would crash the whole
        // page. Degrade to a message instead of a white-screen error.
        <div style={{ padding: "60px 20px", textAlign: "center", color: A.ink3, fontSize: 13 }}>
          {error || "Couldn't load this week's missions. Please refresh."}
        </div>
      )}

      {activeMissionId && (
        <MissionWorkspace
          missionId={activeMissionId}
          streamSlug={stream?.slug}
          onClose={() => setActiveMissionId(null)}
          onResult={handleMissionResult}
          onContinueToNext={handleContinueToNext}
        />
      )}
    </div>
  )
}

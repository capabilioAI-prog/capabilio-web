import { useState, useEffect, useCallback } from "react"
import { arenaApi } from "../../lib/api"
import { A } from "./tokens"
import StreamPicker from "./StreamPicker"
import SpinWheel from "./SpinWheel"
import MissionList from "./MissionList"
import MissionWorkstation from "./MissionWorkstation"
import Leaderboard from "./Leaderboard"
import History from "./History"

/**
 * Arena — the one canonical Student Path Arena (spec §46). Single route,
 * single component hierarchy: no ArenaOld/ArenaV2/DomainRoleArena
 * siblings. View flow strictly follows the server's own state — this
 * component never decides on its own that a spin "should" happen; it
 * only ever reflects GET /arena/stream and GET /arena/allocation.
 */
export default function Arena() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stream, setStream] = useState(null)
  const [streamOptions, setStreamOptions] = useState([])
  const [allocation, setAllocation] = useState(null)
  const [spinning, setSpinning] = useState(false)
  const [activeMissionId, setActiveMissionId] = useState(null)
  const [tab, setTab] = useState("active") // active | leaderboard | history

  const loadStreamAndAllocation = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const streamRes = await arenaApi.getStream()
      if (!streamRes.resolved) {
        setStream(null); setStreamOptions(streamRes.streams || [])
        setAllocation(null)
        return
      }
      setStream(streamRes.stream)
      const allocRes = await arenaApi.getAllocation()
      setAllocation(allocRes.allocation)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadStreamAndAllocation() }, [loadStreamAndAllocation])

  async function handleSelectStream(streamId) {
    const res = await arenaApi.setStream(streamId)
    setStream(res.stream)
    setStreamOptions([])
    const allocRes = await arenaApi.getAllocation()
    setAllocation(allocRes.allocation)
  }

  async function handleSpin() {
    setSpinning(true); setError(null)
    try {
      const res = await arenaApi.spin()
      setAllocation({ allocationId: res.allocationId, streamId: res.streamId, spinResult: res.spinResult, spinAt: new Date().toISOString(), missions: res.missions })
    } catch (e) {
      setError(e.message)
    } finally {
      setSpinning(false)
    }
  }

  function handleMissionResult() {
    // Re-fetch so status/points reflect the server's authoritative result.
    arenaApi.getAllocation().then((res) => setAllocation(res.allocation)).catch(() => {})
  }

  if (loading) {
    return <div style={{ padding: "60px 20px", textAlign: "center", color: A.ink3, fontSize: 13 }}>Loading Arena…</div>
  }

  return (
    <div style={{ background: A.cream, minHeight: "100%" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: A.ink }}>Arena</div>
            {stream && <div style={{ fontSize: 12.5, color: A.ink3, marginTop: 2 }}>{stream.name} · Common Challenges</div>}
          </div>
          {stream && allocation && (
            <div style={{ display: "flex", gap: 6 }}>
              {[["active", "Active Week"], ["leaderboard", "Leaderboard"], ["history", "History"]].map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)} style={{
                  padding: "7px 14px", borderRadius: 999, border: `1px solid ${tab === key ? A.indigo : A.border}`,
                  background: tab === key ? A.indigo2 : "transparent", color: tab === key ? A.indigo : A.ink3,
                  fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                }}>{label}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 20px" }}><div style={{ padding: "10px 14px", borderRadius: 10, background: A.rose2, color: A.rose, fontSize: 12.5 }}>{error}</div></div>}

      {!stream ? (
        <StreamPicker streams={streamOptions} onSelect={handleSelectStream} />
      ) : tab === "leaderboard" ? (
        <Leaderboard />
      ) : tab === "history" ? (
        <History />
      ) : !allocation ? (
        <SpinWheel streamName={stream.name} onSpin={handleSpin} spinning={spinning} />
      ) : (
        <MissionList spinResult={allocation.spinResult} missions={allocation.missions} onOpenMission={setActiveMissionId} />
      )}

      {activeMissionId && (
        <MissionWorkstation
          missionId={activeMissionId}
          onClose={() => setActiveMissionId(null)}
          onResult={handleMissionResult}
        />
      )}
    </div>
  )
}

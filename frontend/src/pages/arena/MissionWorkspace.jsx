import { useState, useEffect, useCallback } from "react"
import { arenaApi } from "../../lib/api"
import { A } from "./tokens"
import MissionHeader from "./MissionHeader"
import MissionContext from "./MissionContext"
import Workstation, { getInitialResponse } from "./Workstation"
import EvidencePanel from "./EvidencePanel"
import SubmissionResult from "./SubmissionResult"

/**
 * MissionWorkspace — the immersive per-mission experience (spec §17-27),
 * replacing the old plain "paragraphs + textarea + Submit" modal.
 * Workstation-first layout: context is compact and above the fold, the
 * actual work surface gets the primary visual area (spec §21).
 */
export default function MissionWorkspace({ missionId, streamSlug, onClose, onResult, onContinueToNext }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mission, setMission] = useState(null)
  const [challenge, setChallenge] = useState(null)
  const [response, setResponse] = useState({})
  const [pendingSubmission, setPendingSubmission] = useState(null) // Promise, or null when editing

  const load = useCallback(() => {
    let cancelled = false
    setLoading(true); setError(null)
    arenaApi.getMission(missionId)
      .then(({ mission, challenge }) => {
        if (cancelled) return
        setMission(mission); setChallenge(challenge)
        setResponse(getInitialResponse(challenge))
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [missionId])

  useEffect(() => load(), [load])

  function handleSubmit() {
    const promise = arenaApi.submitMission(missionId, response).then((res) => {
      onResult?.(res)
      return res
    })
    setPendingSubmission(promise)
  }

  function handleRetry() {
    setPendingSubmission(null) // back to editing — the student's input is preserved in `response`
  }

  async function handleContinue() {
    onContinueToNext?.(missionId)
  }

  if (loading) {
    return (
      <Overlay onClose={onClose}>
        <div style={{ padding: 60, textAlign: "center", color: A.ink3 }}>Loading mission…</div>
      </Overlay>
    )
  }
  if (error || !challenge) {
    return (
      <Overlay onClose={onClose}>
        <div style={{ padding: 60, textAlign: "center", color: A.rose }}>{error || "Mission not found."}</div>
      </Overlay>
    )
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: A.cream, zIndex: 400, overflowY: "auto" }}>
      <MissionHeader mission={mission} challenge={challenge} onClose={onClose} />

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 20px 80px" }}>
        <MissionContext streamSlug={streamSlug} scenario={challenge.scenario} missionText={challenge.mission} />

        {pendingSubmission ? (
          <SubmissionResult
            pending={pendingSubmission}
            onRetry={handleRetry}
            onContinue={handleContinue}
            onReturnToArena={onClose}
          />
        ) : (
          <>
            <Workstation challenge={challenge} value={response} onChange={setResponse} />
            <EvidencePanel challenge={challenge} />
            <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={handleSubmit}
                style={{
                  padding: "13px 28px", borderRadius: 12, border: "none", background: A.indigo, color: "#fff",
                  fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: A.shadow,
                }}
              >
                Submit Solution
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Overlay({ children, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: A.cream, zIndex: 400 }}>
      <div style={{ padding: "14px 20px" }}>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: A.ink3, fontFamily: "inherit" }}>← Arena</button>
      </div>
      {children}
    </div>
  )
}

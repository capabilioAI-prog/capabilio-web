import { useState, useEffect } from "react"
import { arenaApi } from "../../lib/api"
import { A, WORKSTATION_LABEL } from "./tokens"

const STARTER_BY_WORKSTATION = {
  coding: (inputs) => inputs?.starterCode || "// write your solution, then check the instructions for the expected output\n",
  sql: () => "-- write your SQL query\nSELECT ",
}

/** Renders the right response input for a challenge's workstation_type
 *  (spec §30-32). Never renders the answer key — verification_definition
 *  is stripped server-side before this component ever sees the challenge. */
export default function MissionWorkstation({ missionId, onClose, onResult }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [challenge, setChallenge] = useState(null)
  const [code, setCode] = useState("")
  const [sql, setSql] = useState("")
  const [numericValue, setNumericValue] = useState("")
  const [answer, setAnswer] = useState("")
  const [explanation, setExplanation] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(null)
    arenaApi.getMission(missionId)
      .then(({ challenge }) => {
        if (cancelled) return
        setChallenge(challenge)
        if (challenge.workstation_type === "coding") setCode(STARTER_BY_WORKSTATION.coding(challenge.inputs))
        if (challenge.workstation_type === "sql") setSql(STARTER_BY_WORKSTATION.sql())
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [missionId])

  function buildResponse() {
    switch (challenge.workstation_type) {
      case "coding": return { code, language: "javascript" }
      case "sql": return { sql }
      case "calculation": return { value: Number(numericValue) }
      default: return { answers: { answer, explanation } }
    }
  }

  async function handleSubmit() {
    setSubmitting(true); setError(null)
    try {
      const res = await arenaApi.submitMission(missionId, buildResponse())
      setResult(res)
      onResult?.(res)
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Overlay onClose={onClose}><div style={{ padding: 40, textAlign: "center", color: A.ink3 }}>Loading mission…</div></Overlay>
  if (error && !challenge) return <Overlay onClose={onClose}><div style={{ padding: 40, textAlign: "center", color: A.rose }}>{error}</div></Overlay>

  return (
    <Overlay onClose={onClose}>
      <div style={{ padding: "24px 28px 28px" }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: A.indigo, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
          {challenge.competency_area} · {WORKSTATION_LABEL[challenge.workstation_type] || challenge.workstation_type}
        </div>
        <div style={{ fontSize: 19, fontWeight: 800, color: A.ink, marginBottom: 14 }}>{challenge.title}</div>

        <Section label="Scenario">{challenge.scenario}</Section>
        <Section label="Mission">{challenge.mission}</Section>
        <Section label="Instructions">{challenge.instructions}</Section>

        {!result && (
          <div style={{ marginTop: 20 }}>
            <ResponseInput
              workstationType={challenge.workstation_type}
              code={code} setCode={setCode}
              sql={sql} setSql={setSql}
              numericValue={numericValue} setNumericValue={setNumericValue}
              answer={answer} setAnswer={setAnswer}
              explanation={explanation} setExplanation={setExplanation}
            />
            {error && <div style={{ color: A.rose, fontSize: 12.5, marginTop: 10 }}>{error}</div>}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                marginTop: 16, padding: "11px 22px", borderRadius: 10, border: "none", background: A.indigo, color: "#fff",
                fontSize: 13, fontWeight: 800, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1, fontFamily: "inherit",
              }}
            >
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>
        )}

        {result && (
          <div style={{
            marginTop: 20, padding: "16px 18px", borderRadius: 12,
            background: result.passed ? A.emerald2 : A.rose2, border: `1px solid ${result.passed ? A.emerald : A.rose}30`,
          }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: result.passed ? A.emerald : A.rose, marginBottom: 6 }}>
              {result.passed ? `Passed — +${result.pointsAwarded} points` : "Not quite — try again"}
            </div>
            {result.explanation && <div style={{ fontSize: 13, color: A.ink2, lineHeight: 1.6 }}>{result.explanation}</div>}
            <button onClick={onClose} style={{ marginTop: 14, padding: "9px 18px", borderRadius: 9, border: `1px solid ${A.border}`, background: A.card, color: A.ink2, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Back to missions
            </button>
          </div>
        )}
      </div>
    </Overlay>
  )
}

function Overlay({ children, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,20,30,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "5vh 16px", zIndex: 500, overflowY: "auto" }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ width: "100%", maxWidth: 640, background: A.card, borderRadius: 20, boxShadow: A.shadow, position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", fontSize: 18, color: A.muted, cursor: "pointer" }}>×</button>
        {children}
      </div>
    </div>
  )
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13.5, color: A.ink2, lineHeight: 1.6 }}>{children}</div>
    </div>
  )
}

function ResponseInput({ workstationType, code, setCode, sql, setSql, numericValue, setNumericValue, answer, setAnswer, explanation, setExplanation }) {
  const textAreaStyle = {
    width: "100%", minHeight: 140, padding: 12, borderRadius: 10, border: `1px solid ${A.border}`,
    fontFamily: "'DM Mono', 'SF Mono', monospace", fontSize: 12.5, color: A.ink, resize: "vertical", boxSizing: "border-box",
  }
  if (workstationType === "coding") return <textarea style={textAreaStyle} value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} />
  if (workstationType === "sql") return <textarea style={textAreaStyle} value={sql} onChange={(e) => setSql(e.target.value)} spellCheck={false} />
  if (workstationType === "calculation") {
    return (
      <input
        type="number" value={numericValue} onChange={(e) => setNumericValue(e.target.value)}
        placeholder="Your numeric answer"
        style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: `1px solid ${A.border}`, fontSize: 14, boxSizing: "border-box", fontFamily: "inherit" }}
      />
    )
  }
  // structured_response / decision / log_investigation
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input
        type="text" value={answer} onChange={(e) => setAnswer(e.target.value)}
        placeholder="Short answer (e.g. the exact option named in the instructions)"
        style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: `1px solid ${A.border}`, fontSize: 13.5, boxSizing: "border-box", fontFamily: "inherit" }}
      />
      <textarea
        value={explanation} onChange={(e) => setExplanation(e.target.value)}
        placeholder="Explain your reasoning (used for challenges that grade a written explanation)"
        style={{ width: "100%", minHeight: 90, padding: 12, borderRadius: 10, border: `1px solid ${A.border}`, fontSize: 13, color: A.ink, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }}
      />
    </div>
  )
}

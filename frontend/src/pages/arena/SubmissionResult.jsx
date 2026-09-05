import { useState, useEffect } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { A } from "./tokens"

const CHECKLIST = ["Submission received", "Evaluator running", "Evidence being recorded"]

/**
 * SubmissionResult — "VERIFYING → VERIFIED/NOT YET" (spec §25-27). The
 * checklist animates only while the real submitMission() network request
 * (passed in as `pending`, a Promise) is actually in flight — it never
 * fakes completion before the server responds; if the request is slow,
 * the checklist simply keeps showing "checking" longer.
 */
export default function SubmissionResult({ pending, onRetry, onContinue, onReturnToArena }) {
  const [checkedCount, setCheckedCount] = useState(0)
  const [result, setResult] = useState(null) // null while pending, else the server response
  const [failed, setFailed] = useState(false)
  const reduce = useReducedMotion()

  useEffect(() => {
    let cancelled = false
    // Advance the checklist on a fixed cadence, but NEVER past what has
    // actually completed — capped at CHECKLIST.length-1 until the real
    // response arrives, so the last item only ever appears once evidence
    // has genuinely been recorded server-side.
    const ticker = setInterval(() => {
      setCheckedCount((c) => Math.min(c + 1, CHECKLIST.length - 1))
    }, reduce ? 150 : 500)

    pending
      .then((res) => { if (!cancelled) { setResult(res); setCheckedCount(CHECKLIST.length) } })
      .catch(() => { if (!cancelled) setFailed(true) })

    return () => { cancelled = true; clearInterval(ticker) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (failed) {
    return (
      <ResultShell tone="rose">
        <div style={{ fontSize: 18, fontWeight: 800, color: A.rose, marginBottom: 8 }}>Couldn&apos;t verify right now</div>
        <div style={{ fontSize: 13, color: A.ink3, marginBottom: 20 }}>Something went wrong reaching the verifier. Your work wasn&apos;t lost — try again.</div>
        <PrimaryButton onClick={onRetry}>Try Again</PrimaryButton>
      </ResultShell>
    )
  }

  if (!result) {
    return (
      <ResultShell tone="indigo">
        <div style={{ fontSize: 16, fontWeight: 800, color: A.indigoDeep, marginBottom: 16, letterSpacing: "0.02em" }}>VERIFYING YOUR WORK</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start", margin: "0 auto", width: "fit-content" }}>
          {CHECKLIST.map((item, i) => (
            <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: i < checkedCount ? A.ink : A.muted }}>
              <CheckOrSpinner done={i < checkedCount} active={i === checkedCount} reduce={reduce} />
              {item}
            </div>
          ))}
        </div>
      </ResultShell>
    )
  }

  if (result.passed) {
    return (
      <ResultShell tone="emerald">
        <AnimatePresence>
          <motion.div initial={reduce ? false : { scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.35 }}>
            <div style={{ fontSize: 34, marginBottom: 6 }}>✓</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: A.ink, marginBottom: 4 }}>Mission Complete</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: A.emerald, marginBottom: 4 }}>Verified</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: A.emerald, margin: "8px 0" }}>+{result.pointsAwarded} pts</div>
            <div style={{ fontSize: 13, color: A.ink3, marginBottom: 22 }}>Evidence added to your capability record.</div>
            {result.explanation && (
              <div style={{ textAlign: "left", background: A.emerald2, borderRadius: 12, padding: "12px 16px", fontSize: 13, color: A.ink2, lineHeight: 1.6, marginBottom: 22 }}>
                {result.explanation}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <PrimaryButton onClick={onContinue}>Continue to Next Mission</PrimaryButton>
              <SecondaryButton onClick={onReturnToArena}>Return to Arena</SecondaryButton>
            </div>
          </motion.div>
        </AnimatePresence>
      </ResultShell>
    )
  }

  return (
    <ResultShell tone="amber">
      <div style={{ fontSize: 18, fontWeight: 800, color: A.ink, marginBottom: 6 }}>Not yet verified</div>
      <div style={{ fontSize: 13, color: A.ink3, marginBottom: 20, maxWidth: 340, margin: "0 auto 20px" }}>
        {result.hint || "Your submission didn't pass verification."}
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <PrimaryButton onClick={onRetry}>Try Again</PrimaryButton>
        <SecondaryButton onClick={onReturnToArena}>Return to Arena</SecondaryButton>
      </div>
    </ResultShell>
  )
}

function ResultShell({ tone, children }) {
  const bg = { indigo: A.indigo2, emerald: A.emerald2, amber: A.amber2, rose: A.rose2 }[tone]
  return (
    <div style={{ background: bg, borderRadius: A.radius, padding: "36px 24px", textAlign: "center" }}>
      {children}
    </div>
  )
}

function CheckOrSpinner({ done, active, reduce }) {
  if (done) return <span style={{ color: A.emerald, fontWeight: 900 }}>✓</span>
  if (active) {
    return (
      <motion.span
        style={{ width: 12, height: 12, borderRadius: "50%", border: `2px solid ${A.indigo}`, borderTopColor: "transparent", display: "inline-block" }}
        animate={reduce ? {} : { rotate: 360 }}
        transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
      />
    )
  }
  return <span style={{ width: 12, height: 12, borderRadius: "50%", border: `2px solid ${A.border}`, display: "inline-block" }} />
}

function PrimaryButton({ onClick, children }) {
  return (
    <button onClick={onClick} style={{ padding: "11px 22px", borderRadius: 10, border: "none", background: A.indigo, color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
      {children}
    </button>
  )
}
function SecondaryButton({ onClick, children }) {
  return (
    <button onClick={onClick} style={{ padding: "11px 22px", borderRadius: 10, border: `1px solid ${A.border}`, background: A.card, color: A.ink2, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
      {children}
    </button>
  )
}

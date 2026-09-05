import { useState } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { A } from "./tokens"
import ArenaWheel from "./ArenaWheel"
import ScratchReveal from "./ScratchReveal"

/**
 * ArenaWeeklyReveal — the arrival experience for a student who has not
 * yet spun this week (spec §5-9). Owns the local reveal sequence only;
 * the actual weekly allocation is fetched/created by the parent via
 * `onSpin`, which must return the server's authoritative
 * { spinResult, ... } — this component never invents that number.
 *
 * phase: idle -> requesting -> anticipating -> landing -> settled -> scratch -> done
 */
export default function ArenaWeeklyReveal({ outcomes, streamName, onSpin, onDone }) {
  const [phase, setPhase] = useState("idle")
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const reduce = useReducedMotion()

  async function handleSpinClick() {
    if (phase !== "idle") return
    setError(null)
    setPhase("requesting")
    setPhase("anticipating")
    try {
      const res = await onSpin()
      setResult(res.spinResult)
      setPhase("landing")
    } catch (e) {
      setError(e.message)
      setPhase("idle")
    }
  }

  function handleWheelSettled() {
    setPhase("scratch")
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "36px 20px 60px", textAlign: "center" }}>
      <AnimatePresence mode="wait">
        {phase !== "scratch" ? (
          <motion.div
            key="wheel-stage"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? {} : { opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: A.indigo, textTransform: "uppercase", marginBottom: 10 }}>
              Arena · Weekly Stream Challenges
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: A.ink, marginBottom: 8, letterSpacing: "-0.01em" }}>
              Your weekly proof starts here.
            </div>
            {streamName && (
              <div style={{
                display: "inline-block", padding: "6px 16px", borderRadius: 999, background: A.indigo2,
                color: A.indigoDeep, fontSize: 12.5, fontWeight: 700, marginBottom: 32,
              }}>
                {streamName}
              </div>
            )}

            <ArenaWheel outcomes={outcomes} phase={phase === "idle" || phase === "requesting" ? "idle" : phase} resultValue={result} onSettled={handleWheelSettled} />

            <div style={{ marginTop: 28 }}>
              <button
                onClick={handleSpinClick}
                disabled={phase !== "idle"}
                style={{
                  padding: "14px 34px", borderRadius: 12, border: "none",
                  background: phase === "idle" ? A.indigo : A.borderStrong,
                  color: phase === "idle" ? "#fff" : A.muted,
                  fontSize: 14, fontWeight: 800, letterSpacing: "0.02em",
                  cursor: phase === "idle" ? "pointer" : "not-allowed",
                  fontFamily: "inherit", boxShadow: phase === "idle" ? A.shadow : "none",
                  transition: "background 0.2s",
                }}
              >
                {phase === "idle" ? "Spin the Week" : "Spinning…"}
              </button>
            </div>

            {error && (
              <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 10, background: A.rose2, color: A.rose, fontSize: 12.5 }}>
                {error}
              </div>
            )}

            <div style={{ marginTop: 30, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {outcomes.map((n) => (
                <span key={n} style={{
                  width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11.5, fontWeight: 800, color: A.ink3, background: A.paper, border: `1px solid ${A.border}`,
                }}>
                  {n}
                </span>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: A.muted }}>
              This week is waiting for you.
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="scratch-stage"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: A.indigo, textTransform: "uppercase", marginBottom: 18 }}>
              Weekly Reveal
            </div>
            <ScratchReveal result={result} streamName={streamName} onEnterArena={onDone} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

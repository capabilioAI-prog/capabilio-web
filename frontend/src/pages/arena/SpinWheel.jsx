import { useState } from "react"
import { A } from "./tokens"

/**
 * SpinWheel — pure UI. The animation is decoration; the actual mission
 * count comes back from POST /arena/spin (spec §8) and is only revealed
 * once the backend has answered, never guessed/animated-then-corrected.
 */
export default function SpinWheel({ streamName, onSpin, spinning }) {
  const [clicked, setClicked] = useState(false)

  async function handleClick() {
    if (spinning || clicked) return
    setClicked(true)
    try {
      await onSpin()
    } finally {
      setClicked(false)
    }
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "48px 24px", textAlign: "center",
    }}>
      <div style={{
        width: 180, height: 180, borderRadius: "50%", marginBottom: 28,
        background: `conic-gradient(${A.indigo} 0deg 90deg, ${A.emerald} 90deg 180deg, ${A.amber} 180deg 270deg, ${A.rose} 270deg 360deg)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: A.shadow,
        animation: spinning || clicked ? "arena-wheel-spin 1.1s cubic-bezier(0.2,0.8,0.3,1)" : "none",
      }}>
        <style>{`@keyframes arena-wheel-spin { from { transform: rotate(0deg) } to { transform: rotate(1080deg) } }`}</style>
        <div style={{ width: 96, height: 96, borderRadius: "50%", background: A.card, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: A.ink2 }}>
          {spinning || clicked ? "..." : "SPIN"}
        </div>
      </div>

      <div style={{ fontSize: 20, fontWeight: 800, color: A.ink, marginBottom: 6 }}>Weekly Common Challenges</div>
      <div style={{ fontSize: 14, color: A.ink3, marginBottom: 24, maxWidth: 360 }}>
        Your weekly challenge count is waiting — spin once to see how many {streamName} missions you get this week.
      </div>

      <button
        onClick={handleClick}
        disabled={spinning || clicked}
        style={{
          padding: "12px 28px", borderRadius: 12, border: "none", background: A.indigo, color: "#fff",
          fontSize: 14, fontWeight: 800, cursor: spinning || clicked ? "not-allowed" : "pointer",
          opacity: spinning || clicked ? 0.7 : 1, fontFamily: "inherit",
        }}
      >
        {spinning || clicked ? "Spinning…" : "Spin the Wheel"}
      </button>
    </div>
  )
}

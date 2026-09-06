import { useRef, useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { A } from "./tokens"

const REVEAL_THRESHOLD = 0.4 // spec: 35-45%
const SAMPLE_STEP = 6 // downsample grid for the reveal-percentage check — cheap enough to run on every stroke

/**
 * ScratchReveal — reveals an ALREADY-DECIDED result. This component never
 * generates or alters the number; `result`/`streamName` are passed in
 * from the server's own response. Scratching only removes an opaque
 * coating sitting on top of the real content underneath — styled as an
 * engineering access-card seal, not a lottery-ticket surface.
 */
export default function ScratchReveal({ result, streamName, onEnterArena }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [revealed, setRevealed] = useState(false)
  const [scratching, setScratching] = useState(false)
  const [progress, setProgress] = useState(0)
  const reduce = useReducedMotion()
  const dimsRef = useRef({ w: 320, h: 240 })

  const paintCoating = useCallback((ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, w, h)
    grad.addColorStop(0, A.indigoDeep)
    grad.addColorStop(1, A.indigo)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // Deterministic diagonal tick pattern — an engineered security-surface
    // motif, not grey scratch-lottery noise.
    ctx.strokeStyle = "rgba(255,255,255,0.07)"
    ctx.lineWidth = 1
    const spacing = 13
    for (let d = -h; d < w; d += spacing) {
      ctx.beginPath()
      ctx.moveTo(d, 0)
      ctx.lineTo(d + h, h)
      ctx.stroke()
    }

    // A seal-ring medallion, like an access-card emblem
    ctx.strokeStyle = "rgba(255,255,255,0.32)"
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.arc(w / 2, h / 2 - 4, Math.min(w, h) * 0.33, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(w / 2, h / 2 - 4, Math.min(w, h) * 0.33 - 6, 0, Math.PI * 2)
    ctx.strokeStyle = "rgba(255,255,255,0.16)"
    ctx.stroke()

    ctx.textAlign = "center"
    ctx.fillStyle = "rgba(255,255,255,0.96)"
    ctx.font = `800 12px ${A.font}`
    ctx.fillText("CAPABILIO ARENA", w / 2, h / 2 - 38)
    ctx.font = `700 10.5px ${A.font}`
    ctx.fillStyle = "rgba(255,255,255,0.68)"
    ctx.letterSpacing = "0.14em"
    ctx.fillText("WEEKLY REVEAL", w / 2, h / 2 - 18)
    ctx.font = `800 20px ${A.font}`
    ctx.fillStyle = "rgba(255,255,255,0.5)"
    ctx.fillText("• • •", w / 2, h / 2 + 12)
    ctx.font = `600 10.5px ${A.font}`
    ctx.fillStyle = "rgba(255,255,255,0.58)"
    ctx.fillText("Scratch to reveal your Arena run", w / 2, h / 2 + 46)
  }, [])

  useEffect(() => {
    if (reduce) { setRevealed(true); return } // reduced motion: skip the drag mechanic, show the already-decided result immediately
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = containerRef.current.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const w = Math.round(rect.width), h = Math.round(rect.height)
    dimsRef.current = { w, h }
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    const ctx = canvas.getContext("2d")
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    paintCoating(ctx, w, h)
  }, [reduce, paintCoating])

  function checkRevealPercent() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    const dpr = window.devicePixelRatio || 1
    const { w, h } = dimsRef.current
    const data = ctx.getImageData(0, 0, Math.round(w * dpr), Math.round(h * dpr)).data
    let clear = 0, total = 0
    const step = SAMPLE_STEP * dpr
    for (let y = 0; y < h * dpr; y += step) {
      for (let x = 0; x < w * dpr; x += step) {
        total++
        const alpha = data[(Math.floor(y) * Math.round(w * dpr) + Math.floor(x)) * 4 + 3]
        if (alpha < 40) clear++
      }
    }
    if (total === 0) return
    const pct = clear / total
    setProgress(Math.min(100, Math.round(pct * 100)))
    if (pct >= REVEAL_THRESHOLD) finishReveal()
  }

  function scratchAt(clientX, clientY) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    const ctx = canvas.getContext("2d")
    ctx.globalCompositeOperation = "destination-out"
    ctx.beginPath()
    ctx.arc(x, y, 26, 0, Math.PI * 2)
    ctx.fill()
    checkRevealPercent()
  }

  function finishReveal() {
    setProgress(100)
    setRevealed(true)
  }

  function handlePointerDown(e) {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setScratching(true)
    scratchAt(e.clientX, e.clientY)
  }
  function handlePointerMove(e) {
    if (!scratching) return
    scratchAt(e.clientX, e.clientY)
  }
  function handlePointerUp() {
    setScratching(false)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div
        ref={containerRef}
        style={{
          position: "relative", width: "min(340px, 88vw)", height: 240,
          borderRadius: 22, overflow: "hidden", boxShadow: A.shadowLift, background: A.card,
          border: `1px solid ${A.borderStrong}`,
        }}
      >
        {/* Access-card "lanyard" notch — a small die-cut detail so this
            reads as a physical artifact, not a generic rectangle. */}
        <div aria-hidden="true" style={{
          position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)",
          width: 46, height: 18, borderRadius: "0 0 12px 12px", background: A.cream,
          border: `1px solid ${A.borderStrong}`, borderTop: "none", zIndex: 3,
        }} />

        {/* Real, already-decided content — sits underneath the coating */}
        <AnimatePresence mode="wait">
          {!revealed ? (
            <motion.div
              key="hidden"
              style={{
                position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 4, padding: 20, textAlign: "center",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: A.muted, textTransform: "uppercase" }}>Your Week</div>
              <div style={{ fontSize: 64, fontWeight: 900, color: A.indigoDeep, lineHeight: 1 }}>{result}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: A.ink3, letterSpacing: "0.06em", textTransform: "uppercase" }}>Missions</div>
            </motion.div>
          ) : (
            <motion.div
              key="revealed"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              style={{
                position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 3, padding: 20, textAlign: "center",
              }}
            >
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.14em", color: A.indigo, textTransform: "uppercase" }}>Your Arena Run</div>
              <motion.div
                initial={reduce ? false : { scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, ease: [0.2, 0.9, 0.3, 1] }}
                style={{ fontSize: 68, fontWeight: 900, color: A.indigoDeep, lineHeight: 1 }}
              >
                {result}
              </motion.div>
              <div style={{ fontSize: 13, fontWeight: 800, color: A.ink3, letterSpacing: "0.06em", textTransform: "uppercase" }}>Missions Unlocked</div>
              <div style={{ fontSize: 12.5, color: A.ink3, marginTop: 8 }}>{streamName}</div>
              <div style={{ fontSize: 11, color: A.muted }}>Common Challenges</div>
            </motion.div>
          )}
        </AnimatePresence>

        {!revealed && (
          <>
            <canvas
              ref={canvasRef}
              style={{ position: "absolute", inset: 0, touchAction: "none", cursor: "pointer" }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              role="img"
              aria-label="Scratch surface hiding your weekly mission count. Use the Reveal now button if you cannot scratch."
            />
            {/* Progress indication — a thin bar, not a percentage badge that
                could read as gamified/lottery. */}
            <div aria-hidden="true" style={{ position: "absolute", left: 16, right: 16, bottom: 12, height: 3, borderRadius: 999, background: "rgba(255,255,255,0.22)", overflow: "hidden" }}>
              <div style={{ width: `${progress}%`, height: "100%", background: "rgba(255,255,255,0.85)", transition: "width 0.15s ease-out" }} />
            </div>
          </>
        )}
      </div>

      {!revealed ? (
        <button
          onClick={finishReveal}
          style={{
            padding: "9px 18px", borderRadius: 999, border: `1px solid ${A.border}`, background: A.card,
            color: A.ink3, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          Reveal now
        </button>
      ) : (
        <button
          onClick={onEnterArena}
          autoFocus
          style={{
            padding: "13px 30px", borderRadius: 12, border: "none", background: A.indigo, color: "#fff",
            fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: A.shadow,
          }}
        >
          Enter Arena
        </button>
      )}
    </div>
  )
}

import { useRef, useState, useEffect, useCallback } from "react"
import { useReducedMotion } from "framer-motion"
import { A } from "./tokens"

const REVEAL_THRESHOLD = 0.4 // spec §7: 35-45%
const SAMPLE_STEP = 6 // downsample grid for the reveal-percentage check — cheap enough to run on every stroke

/**
 * ScratchReveal — reveals an ALREADY-DECIDED result (spec §7, §9). This
 * component never generates or alters the number; `result`/`streamName`
 * are passed in from the server's own response. Scratching only removes
 * an opaque canvas coating sitting on top of the real content underneath.
 */
export default function ScratchReveal({ result, streamName, onEnterArena }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [revealed, setRevealed] = useState(false)
  const [scratching, setScratching] = useState(false)
  const reduce = useReducedMotion()
  const dimsRef = useRef({ w: 320, h: 220 })

  const paintCoating = useCallback((ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, w, h)
    grad.addColorStop(0, A.indigo)
    grad.addColorStop(1, A.indigoDeep)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
    ctx.textAlign = "center"
    ctx.fillStyle = "rgba(255,255,255,0.92)"
    ctx.font = `800 13px ${A.font}`
    ctx.fillText("CAPABILIO ARENA", w / 2, h / 2 - 34)
    ctx.font = `600 11px ${A.font}`
    ctx.fillStyle = "rgba(255,255,255,0.65)"
    ctx.fillText("WEEKLY REVEAL", w / 2, h / 2 - 14)
    ctx.font = `800 26px ${A.font}`
    ctx.fillStyle = "rgba(255,255,255,0.85)"
    ctx.fillText("? ? ? ?", w / 2, h / 2 + 26)
    ctx.font = `600 11px ${A.font}`
    ctx.fillStyle = "rgba(255,255,255,0.55)"
    ctx.fillText("scratch to reveal", w / 2, h / 2 + 52)
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
    if (total > 0 && clear / total >= REVEAL_THRESHOLD) finishReveal()
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
          position: "relative", width: "min(340px, 88vw)", height: 220,
          borderRadius: A.radius, overflow: "hidden", boxShadow: A.shadowLift, background: A.card,
        }}
      >
        {/* Real, already-decided content — sits underneath the coating */}
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 4, padding: 20, textAlign: "center",
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: A.muted, textTransform: "uppercase" }}>Your Week</div>
          <div style={{ fontSize: 64, fontWeight: 900, color: A.indigoDeep, lineHeight: 1 }}>{result}</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: A.ink3, letterSpacing: "0.06em", textTransform: "uppercase" }}>Missions</div>
          <div style={{ fontSize: 12.5, color: A.ink3, marginTop: 6 }}>{streamName}</div>
        </div>

        {!revealed && (
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

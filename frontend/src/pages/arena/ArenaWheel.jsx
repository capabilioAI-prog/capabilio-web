import { useRef, useState, useEffect } from "react"
import { motion, useMotionValue, animate, useReducedMotion } from "framer-motion"
import { A } from "./tokens"
import { computeTargetRotation, outcomeAtRotation, wedgeBounds } from "./wheelMath"

const SIZE = 260
const CENTER = SIZE / 2
const RADIUS = SIZE / 2 - 6

function polarPoint(angleDeg, radius) {
  // angle measured clockwise from top (12 o'clock), matching wheelMath's convention
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return [CENTER + radius * Math.cos(rad), CENTER + radius * Math.sin(rad)]
}

function wedgePath(startAngle, endAngle) {
  const [x1, y1] = polarPoint(startAngle, RADIUS)
  const [x2, y2] = polarPoint(endAngle, RADIUS)
  return `M ${CENTER} ${CENTER} L ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 0 1 ${x2} ${y2} Z`
}

/**
 * ArenaWheel — purely a renderer of an authoritative result (spec §3).
 * It never computes an outcome itself. `phase` drives behavior:
 *   idle          — at rest, nothing has been requested yet
 *   anticipating  — spin requested, backend hasn't answered yet: a
 *                   continuous, indeterminate rotation (never implies a
 *                   specific outcome, since none is known yet)
 *   landing       — backend answered; animate from the current angle to
 *                   the exact resting angle for `resultValue`
 *   settled       — animation complete, resting on `resultValue`
 */
export default function ArenaWheel({ outcomes, phase, resultValue, onSettled }) {
  const rotation = useMotionValue(0)
  const [displayRotation, setDisplayRotation] = useState(0)
  const anticipationControls = useRef(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    const unsub = rotation.on("change", (v) => setDisplayRotation(v))
    return unsub
  }, [rotation])

  useEffect(() => {
    if (phase === "anticipating") {
      anticipationControls.current?.stop()
      anticipationControls.current = animate(rotation, rotation.get() + 360, {
        duration: reduce ? 0.6 : 0.9,
        ease: "linear",
        repeat: Infinity,
      })
    }
    if (phase === "landing" && resultValue != null) {
      anticipationControls.current?.stop()
      const targetIndex = outcomes.indexOf(resultValue)
      const target = computeTargetRotation(rotation.get(), targetIndex === -1 ? 0 : targetIndex, outcomes.length, reduce ? 1 : 5)
      animate(rotation, target, {
        duration: reduce ? 0.5 : 3.2,
        ease: reduce ? "easeOut" : [0.12, 0.62, 0.18, 1], // pronounced deceleration — "anticipation then settle"
        onComplete: () => onSettled?.(),
      })
    }
    return () => {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, resultValue])

  const count = outcomes.length
  const restingOutcome = phase === "settled" ? outcomeAtRotation(displayRotation, outcomes) : null

  return (
    <div style={{ position: "relative", width: SIZE, height: SIZE + 22, margin: "0 auto" }}>
      {/* Pointer — fixed, does not rotate with the wheel */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          width: 0, height: 0, zIndex: 3,
          borderLeft: "10px solid transparent", borderRight: "10px solid transparent",
          borderTop: `16px solid ${A.indigoDeep}`,
          filter: "drop-shadow(0 2px 3px rgba(24,24,34,0.25))",
        }}
      />
      <motion.svg
        width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ rotate: rotation, display: "block", marginTop: 16 }}
        role="img"
        aria-label={phase === "settled" && restingOutcome != null ? `Wheel result: ${restingOutcome} missions` : "Weekly mission-count wheel"}
      >
        <circle cx={CENTER} cy={CENTER} r={RADIUS + 3} fill={A.card} stroke={A.borderStrong} strokeWidth="1.5" />
        {outcomes.map((value, i) => {
          // wedgeBounds is the SAME function computeTargetRotation's
          // landing math is built on (wheelMath.js) — drawing the wedge
          // any other way (e.g. [i*angle, (i+1)*angle) instead of
          // centered) would make the wheel visually land on the wrong
          // segment after spinning, which happened once already here.
          const { start, mid, end } = wedgeBounds(i, count)
          const [lx, ly] = polarPoint(mid, RADIUS * 0.66)
          const alt = i % 2 === 0
          return (
            <g key={value}>
              <path d={wedgePath(start, end)} fill={alt ? A.indigo2 : A.cream} stroke={A.card} strokeWidth="2" />
              <text
                x={lx} y={ly}
                textAnchor="middle" dominantBaseline="middle"
                transform={`rotate(${mid}, ${lx}, ${ly})`}
                fontFamily={A.font} fontWeight="800" fontSize="22" fill={A.indigoDeep}
              >
                {value}
              </text>
            </g>
          )
        })}
      </motion.svg>
      {/* Center hub — fixed, sits on top, gives the wheel physical depth */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute", top: 16 + CENTER - 22, left: CENTER - 22, width: 44, height: 44, borderRadius: "50%",
          background: `radial-gradient(circle at 35% 30%, ${A.indigo}, ${A.indigoDeep})`,
          boxShadow: "0 3px 8px rgba(24,24,34,0.3), inset 0 1px 1px rgba(255,255,255,0.25)",
          border: `2px solid ${A.card}`, zIndex: 2,
        }}
      />
      {/* Screen-reader-only textual result, updated only once settled */}
      <div aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>
        {phase === "settled" && resultValue != null ? `Your week: ${resultValue} missions.` : ""}
      </div>
    </div>
  )
}

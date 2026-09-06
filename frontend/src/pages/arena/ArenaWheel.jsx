import { useRef, useState, useEffect } from "react"
import { motion, useMotionValue, animate, useReducedMotion } from "framer-motion"
import { A, WHEEL_SEGMENT_COLORS } from "./tokens"
import { computeTargetRotation, outcomeAtRotation, wedgeBounds, SPIN_DURATION_SECONDS, SETTLE_BOUNCE_SECONDS } from "./wheelMath"

const SIZE = 260
const CENTER = SIZE / 2
const OUTER_RADIUS = SIZE / 2 - 4
const RING_RADIUS = OUTER_RADIUS - 8
const HUB_RADIUS = 24

function polarPoint(angleDeg, radius) {
  // angle measured clockwise from top (12 o'clock), matching wheelMath's convention
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return [CENTER + radius * Math.cos(rad), CENTER + radius * Math.sin(rad)]
}

function wedgePath(startAngle, endAngle, radius) {
  const [x1, y1] = polarPoint(startAngle, radius)
  const [x2, y2] = polarPoint(endAngle, radius)
  return `M ${CENTER} ${CENTER} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`
}

// A short arc segment used to draw the "preparing" indicator ring — an
// activity cue that lives OUTSIDE the wheel disk and never rotates the
// disk itself, so waiting on the server never implies a fake outcome.
function arcPath(startAngle, endAngle, radius) {
  const [x1, y1] = polarPoint(startAngle, radius)
  const [x2, y2] = polarPoint(endAngle, radius)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`
}

/**
 * ArenaWheel — purely a renderer of an authoritative result (spec §3).
 * It never computes an outcome itself. `phase` drives behavior:
 *   idle        — at rest, nothing has been requested yet
 *   preparing   — spin requested, backend hasn't answered yet: a thin
 *                 activity arc pulses around the rim; the disk itself
 *                 stays perfectly still (never implies an outcome, and
 *                 never counts against the 5s visible-spin budget)
 *   landing     — backend answered; animate from the current angle to
 *                 the exact resting angle for `resultValue`, capped at
 *                 SPIN_DURATION_SECONDS + a small settle bounce
 *   settled     — animation complete, resting on `resultValue`, winning
 *                 wedge highlighted
 */
export default function ArenaWheel({ outcomes, phase, resultValue, onSettled }) {
  const rotation = useMotionValue(0)
  const scale = useMotionValue(1)
  const [displayRotation, setDisplayRotation] = useState(0)
  const [prepAngle, setPrepAngle] = useState(0)
  const prepControls = useRef(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    const unsub = rotation.on("change", (v) => setDisplayRotation(v))
    return unsub
  }, [rotation])

  useEffect(() => {
    if (phase === "preparing") {
      prepControls.current?.stop()
      // Drives only the activity arc's rotation motion value below — the
      // wheel disk (`rotation`) is untouched during preparing.
      prepControls.current = animate(0, 360, {
        duration: reduce ? 1.2 : 1.1,
        ease: "linear",
        repeat: Infinity,
        onUpdate: (v) => setPrepAngle(v),
      })
    } else {
      prepControls.current?.stop()
    }

    if (phase === "landing" && resultValue != null) {
      const targetIndex = outcomes.indexOf(resultValue)
      const target = computeTargetRotation(rotation.get(), targetIndex === -1 ? 0 : targetIndex, outcomes.length, reduce ? 1 : 4)
      const mainDuration = reduce ? 0.5 : SPIN_DURATION_SECONDS
      animate(scale, [1, 1.02, 1.02, 1], { duration: mainDuration, times: [0, 0.15, 0.85, 1], ease: "easeInOut" })
      animate(rotation, target, {
        duration: mainDuration,
        ease: reduce ? "easeOut" : [0.16, 0.6, 0.15, 1], // sharp acceleration, long controlled deceleration
        onComplete: () => {
          if (reduce) { onSettled?.(); return }
          // Micro-settle: a tiny overshoot-and-back so the stop reads as
          // physical rather than a hard clip (spec: "final 1-2 degree
          // settle effect"). Still well inside the 5s total budget.
          animate(rotation, target + 2.2, {
            duration: SETTLE_BOUNCE_SECONDS * 0.55, ease: "easeOut",
            onComplete: () => animate(rotation, target, { duration: SETTLE_BOUNCE_SECONDS * 0.45, ease: "easeIn", onComplete: () => onSettled?.() }),
          })
        },
      })
    }
    return () => {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, resultValue])

  const count = outcomes.length
  const restingOutcome = phase === "settled" ? outcomeAtRotation(displayRotation, outcomes) : null
  const restingIndex = restingOutcome != null ? outcomes.indexOf(restingOutcome) : -1

  return (
    <div
      style={{ position: "relative", width: SIZE, height: SIZE + 22, margin: "0 auto" }}
      role="img"
      aria-label={phase === "settled" && resultValue != null ? `Wheel result: ${resultValue} missions` : "Weekly mission-count wheel"}
    >
      {/* Pointer — fixed, does not rotate with the wheel. A small wobble
          during landing reads as mechanical tension, not decoration. */}
      <div
        aria-hidden="true"
        className={phase === "landing" ? "arena-wheel-pointer-wobble" : undefined}
        style={{
          position: "absolute", top: 2, left: "50%", transform: "translateX(-50%)",
          width: 0, height: 0, zIndex: 4,
          borderLeft: "9px solid transparent", borderRight: "9px solid transparent",
          borderTop: `15px solid ${A.indigoDeep}`,
          filter: "drop-shadow(0 2px 3px rgba(24,24,34,0.3))",
        }}
      />

      <motion.div style={{ scale, marginTop: 16, filter: "drop-shadow(0 10px 18px rgba(24,24,34,0.14))" }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ display: "block", overflow: "visible" }} aria-hidden="true">
          {/* Outer bezel ring — physical depth, sits still */}
          <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS} fill={A.card} stroke={A.borderStrong} strokeWidth="1.5" />

          {/* Preparing-state activity arc — orbits the rim, disk stays still */}
          {phase === "preparing" && (
            <path
              d={arcPath(prepAngle, prepAngle + 70, OUTER_RADIUS + 1)}
              fill="none" stroke={A.indigo} strokeWidth="2.5" strokeLinecap="round" opacity={0.85}
            />
          )}

          {/* The rotating disk */}
          <motion.g style={{ rotate: rotation, transformOrigin: `${CENTER}px ${CENTER}px` }}>
            {outcomes.map((value, i) => {
              const { start, mid, end } = wedgeBounds(i, count)
              const [lx, ly] = polarPoint(mid, RING_RADIUS * 0.64)
              const palette = WHEEL_SEGMENT_COLORS[i % WHEEL_SEGMENT_COLORS.length]
              const isWinner = phase === "settled" && i === restingIndex
              return (
                <g key={value}>
                  <path d={wedgePath(start, end, RING_RADIUS)} fill={palette.bg} stroke={A.card} strokeWidth="2.5" />
                  {isWinner && (
                    <path
                      d={wedgePath(start, end, RING_RADIUS)}
                      fill="none" stroke={A.indigo} strokeWidth="3"
                      style={{ filter: `drop-shadow(0 0 6px ${A.indigo}99)` }}
                    />
                  )}
                  <text
                    x={lx} y={ly}
                    textAnchor="middle" dominantBaseline="middle"
                    transform={`rotate(${mid}, ${lx}, ${ly})`}
                    fontFamily={A.font} fontWeight="800" fontSize={isWinner ? "25" : "21"}
                    fill={isWinner ? A.indigo : palette.text}
                    style={{ transition: "font-size 0.2s" }}
                  >
                    {value}
                  </text>
                </g>
              )
            })}
            {/* Inner ring — separates segments from the hub, adds depth */}
            <circle cx={CENTER} cy={CENTER} r={HUB_RADIUS + 6} fill="none" stroke={A.card} strokeWidth="3" />
          </motion.g>

          {/* Highlight ring around the whole rim once settled */}
          {phase === "settled" && (
            <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS - 1} fill="none" stroke={A.indigo} strokeWidth="1.5" opacity={0.5} />
          )}
        </svg>
      </motion.div>

      {/* Center hub — fixed, sits on top, gives the wheel physical depth */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute", top: 16 + CENTER - HUB_RADIUS, left: CENTER - HUB_RADIUS, width: HUB_RADIUS * 2, height: HUB_RADIUS * 2, borderRadius: "50%",
          background: `radial-gradient(circle at 35% 30%, ${A.indigo}, ${A.indigoDeep})`,
          boxShadow: "0 3px 8px rgba(24,24,34,0.32), inset 0 1px 1px rgba(255,255,255,0.28)",
          border: `2px solid ${A.card}`, zIndex: 2,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <div aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.55)" }} />
      </div>

      {/* Screen-reader-only textual result, updated only once settled */}
      <div aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>
        {phase === "settled" && resultValue != null ? `Your week: ${resultValue} missions.` : ""}
        {phase === "preparing" ? "Preparing your weekly run…" : ""}
      </div>

      <style>{`
        @keyframes arena-wheel-pointer-wobble {
          0%, 100% { transform: translateX(-50%) rotate(0deg); }
          25% { transform: translateX(-50%) rotate(-4deg); }
          75% { transform: translateX(-50%) rotate(4deg); }
        }
        .arena-wheel-pointer-wobble { animation: arena-wheel-pointer-wobble 0.22s ease-in-out infinite; transform-origin: top center; }
        @media (prefers-reduced-motion: reduce) {
          .arena-wheel-pointer-wobble { animation: none; }
        }
      `}</style>
    </div>
  )
}

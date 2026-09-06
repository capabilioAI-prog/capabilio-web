import { Suspense } from "react"
import { A } from "./tokens"
import { SIMULATION_COMPONENTS } from "./simulations/registry.js"

/**
 * SimulationShell — resolves a challenge's simulation_type to its micro-lab
 * component (spec §5, §35) and fills the primary work surface with it
 * (spec §24: the simulation, not a text block, is 80% of the viewport).
 * Renders nothing for a challenge with no simulation_type — plain coding/
 * SQL/decision missions are unaffected.
 */
export default function SimulationShell({ challenge }) {
  if (!challenge.simulation_type) return null
  const Sim = SIMULATION_COMPONENTS[challenge.simulation_type]
  if (!Sim) return null

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
        Virtual Lab
      </div>
      <Suspense fallback={<div style={{ height: 280, background: A.card, borderRadius: A.radiusSm, border: `1px solid ${A.border}` }} />}>
        <Sim simulation={challenge.simulation} inputs={challenge.inputs} />
      </Suspense>
    </div>
  )
}

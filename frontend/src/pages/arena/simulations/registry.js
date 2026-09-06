// arena/simulations/registry.js — frontend half of the simulation
// registry (spec §35). Maps a challenge's simulation_type to the React
// component that renders it. Lazy-loaded per type (spec §48) so Arena's
// initial bundle never pays for a micro-lab the student isn't currently
// running.
import { lazy } from "react"

export const SIMULATION_COMPONENTS = {
  waveform_lab: lazy(() => import("./WaveformLab.jsx")),
  compression_lab: lazy(() => import("./CompressionLab.jsx")),
  rlc_lab: lazy(() => import("./RlcLab.jsx")),
}

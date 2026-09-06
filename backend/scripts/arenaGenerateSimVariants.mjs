/**
 * scripts/arenaGenerateSimVariants.mjs — procedurally builds additional
 * simulation-recipe variants for the non-IT simulation-required streams
 * (ece, eee, mechanical, civil), so each stream's eligible pool covers
 * every wheel outcome (5-12) without ever falling back to AI generation
 * (which can never produce a valid simulation_type — Arena product rule:
 * AI must not invent numbers presented as physical truth).
 *
 * Every value is computed by the SAME deterministic engineering formulas
 * already used to grade a submission (imported straight from the
 * simulation modules, never re-derived here) — this script only varies
 * realistic bench parameters (specimen material, geometry, component
 * values) the way a real lab varies test specimens between sessions.
 * Every candidate still goes through the full validateChallengeContent
 * pipeline before insertChallenge — nothing here is special-cased.
 *
 * Usage:
 *   node backend/scripts/arenaGenerateSimVariants.mjs            (dry run)
 *   node backend/scripts/arenaGenerateSimVariants.mjs --execute   (writes)
 */
import dotenv from "dotenv"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"
const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, "../../.env") })

import { supabaseAdmin } from "../server/lib/supabase.js"
import { validateChallengeContent } from "../server/lib/arena/contentValidation.js"
import { insertChallenge } from "../server/lib/arena/challengeRepository.js"
import { computeBeamResponse } from "../server/lib/arena/simulations/beamLab.js"
import { computeResonanceHz } from "../server/lib/arena/simulations/rlcLab.js"

const EXECUTE = process.argv.includes("--execute")

function round(v, d = 2) { const f = 10 ** d; return Math.round(v * f) / f }
function article(label) { return /^[aeiou]/i.test(label) ? "an" : "a" }

// ─── Civil: beam_lab variants ───────────────────────────────────────────
const BEAM_SPECIMENS = [
  { label: "Glulam Roof Purlin", material: "glulam timber", modulusMPa: 13000 },
  { label: "Box-Section Steel Girder", material: "structural steel", modulusMPa: 200000 },
  { label: "GFRP Footbridge Panel", material: "GFRP composite", modulusMPa: 25000 },
  { label: "Cast-Iron Support Bracket", material: "cast iron", modulusMPa: 100000 },
  { label: "Precast Concrete Lintel", material: "precast concrete", modulusMPa: 27000 },
  { label: "Aluminum Ladder Rung", material: "aluminum alloy", modulusMPa: 69000 },
  { label: "Laminated Veneer Rafter", material: "LVL timber", modulusMPa: 12500 },
  { label: "Reinforced Masonry Lintel", material: "reinforced masonry", modulusMPa: 17000 },
]
const BEAM_OUTCOMES = ["safe", "unsafe_stress", "unsafe_deflection"]

function buildBeamVariant(i) {
  const specimen = BEAM_SPECIMENS[i % BEAM_SPECIMENS.length]
  const outcome = BEAM_OUTCOMES[i % BEAM_OUTCOMES.length]
  const spanMm = 2000 + (i * 350) % 3000
  const loadPositionMm = spanMm / 2
  const sectionWidthMm = 60 + (i * 7) % 60
  const sectionHeightMm = 120 + (i * 11) % 130
  const loadN = 5000 + (i * 2500) % 30000

  const { maxStressMPa, deflectionAtLoadMm } = computeBeamResponse({
    spanMm, loadN, loadPositionMm, modulusMPa: specimen.modulusMPa, sectionWidthMm, sectionHeightMm,
  })

  let allowableStressMPa, allowableDeflectionMm, classification
  if (outcome === "safe") {
    allowableStressMPa = round(maxStressMPa * 1.4)
    allowableDeflectionMm = round(deflectionAtLoadMm * 1.4)
    classification = "Safe — within both stress and deflection limits"
  } else if (outcome === "unsafe_stress") {
    allowableStressMPa = round(maxStressMPa * 0.7)
    allowableDeflectionMm = round(deflectionAtLoadMm * 1.5)
    classification = "Unsafe — bending stress exceeds allowable"
  } else {
    allowableStressMPa = round(maxStressMPa * 1.5)
    allowableDeflectionMm = round(deflectionAtLoadMm * 0.6)
    classification = "Unsafe — deflection exceeds allowable limit"
  }

  return {
    stream: "civil",
    competency_area: "Structural Reasoning",
    skill: "Beam Deflection & Bending Stress",
    challenge_type: "diagnosis",
    title: `Classify ${article(specimen.label)} ${specimen.label} Under Point Load (Bench ${i + 1})`,
    scenario: `A ${specimen.material} beam (${specimen.label.toLowerCase()}) spans between two supports on a site and must carry a point load without exceeding the structural spec.`,
    mission: "Load the beam to its design condition, read the resulting bending stress and deflection, and classify whether it meets the acceptance spec.",
    learning_objective: "Apply simply-supported beam bending-stress and deflection formulas to classify structural adequacy against allowable limits.",
    difficulty: "medium",
    estimated_minutes: 10,
    instructions: "Use the load control to scale the beam up to its full design load, read the resulting bending stress and deflection off the bench, then submit your classification.",
    inputs: {
      responseFields: [
        { key: "maxBendingStressMPa", label: "Maximum bending stress", type: "number", unit: "MPa", step: "0.1" },
        { key: "maxDeflectionMm", label: "Maximum deflection", type: "number", unit: "mm", step: "0.01" },
        { key: "classification", label: "Does the beam meet the acceptance spec?", type: "select", options: [
          "Safe — within both stress and deflection limits",
          "Unsafe — bending stress exceeds allowable",
          "Unsafe — deflection exceeds allowable limit",
        ] },
      ],
    },
    expected_output: {},
    workstation_type: "structured_response",
    verification_type: "rule_based",
    simulation_type: "beam_lab",
    verification_definition: {
      simulation: { spanMm, loadN, loadPositionMm, modulusMPa: specimen.modulusMPa, sectionWidthMm, sectionHeightMm, allowableStressMPa, allowableDeflectionMm },
      rules: [
        { field: "maxBendingStressMPa", numeric: { expected: round(maxStressMPa), tolerance: Math.max(1, round(maxStressMPa * 0.05)) } },
        { field: "maxDeflectionMm", numeric: { expected: round(deflectionAtLoadMm, 3), tolerance: Math.max(0.3, round(deflectionAtLoadMm * 0.08, 3)) } },
        { field: "classification", equals: classification },
      ],
    },
    points: 20,
    explanation: `At full design load, this ${specimen.material} beam reaches a bending stress of about ${round(maxStressMPa, 1)} MPa and a deflection of about ${round(deflectionAtLoadMm, 2)} mm against an allowable of ${allowableStressMPa} MPa / ${allowableDeflectionMm} mm.`,
    tags: ["civil", "structures", "beam", "deflection", "bending-stress"],
  }
}

// ─── EEE: rlc_lab variants ───────────────────────────────────────────────
const RLC_BENCHES = [
  { label: "Motor-Filter Test Bench", context: "the filter network ahead of a motor drive" },
  { label: "Substation Feeder Bench", context: "a substation feeder's series compensation network" },
  { label: "Relay Coil Test Bench", context: "a relay coil's snubber network" },
  { label: "Transformer Tap Bench", context: "a transformer tap-changer's damping network" },
  { label: "Capacitor Bank Bench", context: "a power-factor correction capacitor bank" },
  { label: "Ignition Coil Bench", context: "an ignition coil's discharge network" },
  { label: "Servo Drive Filter Bench", context: "a servo drive's input EMI filter" },
  { label: "Induction Heater Bench", context: "an induction heater's tank circuit" },
]

function buildRlcVariant(i) {
  const bench = RLC_BENCHES[i % RLC_BENCHES.length]
  const inductanceH = round(0.02 + (i * 0.037) % 0.25, 4)
  const capacitanceF = round((2 + (i * 3.7) % 18) * 1e-6, 8)
  const resistanceOhms = 8 + (i * 3) % 20
  const sourceVoltageV = 12 + (i * 4) % 24

  const f0 = computeResonanceHz(inductanceH, capacitanceF)
  const freqMinHz = Math.max(1, round(f0 * 0.3, 0))
  const freqMaxHz = round(f0 * 1.7, 0)

  return {
    stream: "eee",
    competency_area: "Circuit Analysis",
    skill: "Series RLC Resonance",
    challenge_type: "investigation",
    title: `Find the Resonance Condition on ${article(bench.label)} ${bench.label} (Bench ${i + 1})`,
    scenario: `A bench models ${bench.context}, wired as a series R-L-C circuit driven by a variable-frequency source, with a voltmeter and ammeter across the components.`,
    mission: "Sweep the source frequency and find the operating condition where the circuit approaches resonance.",
    learning_objective: "Recognize the resonance condition in a series RLC circuit — current peaks and the circuit becomes purely resistive when inductive and capacitive reactance cancel.",
    difficulty: "medium",
    estimated_minutes: 10,
    instructions: "Use the frequency control to sweep the test bench and observe the current, impedance, and phase readouts, then submit your finding.",
    inputs: {
      responseFields: [
        { key: "resonanceFrequencyHz", label: "Resonance frequency", type: "number", unit: "Hz", step: "1" },
        { key: "behavior", label: "What happens to the current at that frequency?", type: "select", options: ["Current reaches its maximum value", "Current reaches its minimum value", "Voltage across R drops to zero", "Circuit becomes purely inductive"] },
        { key: "conclusion", label: "What can you conclude about the circuit at that frequency?", type: "select", options: ["The circuit is purely resistive at this frequency", "The circuit is purely capacitive at this frequency", "The circuit is purely inductive at this frequency", "No current flows at this frequency"] },
      ],
    },
    expected_output: {},
    workstation_type: "structured_response",
    verification_type: "rule_based",
    simulation_type: "rlc_lab",
    verification_definition: {
      simulation: { resistanceOhms, inductanceH, capacitanceF, sourceVoltageV, freqMinHz, freqMaxHz, sweepSteps: 90 },
      rules: [
        { field: "resonanceFrequencyHz", numeric: { expected: round(f0, 2), tolerance: Math.max(5, round(f0 * 0.04, 2)) } },
        { field: "behavior", equals: "Current reaches its maximum value" },
        { field: "conclusion", equals: "The circuit is purely resistive at this frequency" },
      ],
    },
    points: 20,
    explanation: `At resonance, inductive reactance equals capacitive reactance, so they cancel — impedance drops to just R, current peaks, and the circuit is purely resistive. For this bench (L=${round(inductanceH * 1000, 1)}mH, C=${round(capacitanceF * 1e6, 2)}µF), that occurs near f0 ≈ ${round(f0, 1)} Hz.`,
    tags: ["eee", "circuits", "rlc", "resonance", "investigation"],
  }
}

// ─── Mechanical: compression_lab variants ───────────────────────────────
const COMPRESSION_SPECIMENS = [
  { label: "Cast Iron Block", elasticModulusMPa: 100000 },
  { label: "PVC Pipe Section", elasticModulusMPa: 3000 },
  { label: "Epoxy Composite Plug", elasticModulusMPa: 8000 },
  { label: "Rubber Isolation Mount", elasticModulusMPa: 50 },
  { label: "Ceramic Tile Sample", elasticModulusMPa: 70000 },
  { label: "Brass Bushing", elasticModulusMPa: 100000 },
  { label: "Titanium Alloy Pin", elasticModulusMPa: 110000 },
  { label: "Nylon Gear Blank", elasticModulusMPa: 2800 },
]
const COMPRESSION_OUTCOMES = ["pass", "fail_yield", "fail_fracture"]

function buildCompressionVariant(i) {
  const specimen = COMPRESSION_SPECIMENS[i % COMPRESSION_SPECIMENS.length]
  const outcome = COMPRESSION_OUTCOMES[i % COMPRESSION_OUTCOMES.length]
  const acceptanceStrainPct = round(0.8 + (i * 0.15) % 1.2, 2)

  let yieldStrainPct, ultimateStrainPct, ultimateStressMPa, maxStrainPct, classification
  if (outcome === "pass") {
    yieldStrainPct = round(acceptanceStrainPct * 1.5, 2)
    ultimateStrainPct = round(yieldStrainPct * 1.8, 2)
    classification = "Passes — stays within elastic limit past spec load"
  } else if (outcome === "fail_yield") {
    yieldStrainPct = round(acceptanceStrainPct * 0.5, 2)
    ultimateStrainPct = round(acceptanceStrainPct * 1.6, 2)
    classification = "Fails — yields before spec load"
  } else {
    yieldStrainPct = round(acceptanceStrainPct * 0.4, 2)
    ultimateStrainPct = round(acceptanceStrainPct * 0.7, 2)
    classification = "Fails — fractures before spec load"
  }
  ultimateStressMPa = round(specimen.elasticModulusMPa * (yieldStrainPct / 100) * 1.3, 1)
  maxStrainPct = round(ultimateStrainPct * 1.6, 2)

  return {
    stream: "mechanical",
    competency_area: "Materials",
    skill: "Compression Test Interpretation",
    challenge_type: "diagnosis",
    title: `Verify ${article(specimen.label)} ${specimen.label} Against Acceptance Spec (Bench ${i + 1})`,
    scenario: `A batch-acceptance compression test was run on ${article(specimen.label)} ${specimen.label.toLowerCase()} and the stress-strain trace was captured for review against the acceptance spec.`,
    mission: "Step through the recorded test, identify where yielding begins, and decide whether the specimen meets the acceptance spec.",
    learning_objective: "Read a stress-strain curve and classify specimen behavior against a yield-based acceptance threshold.",
    difficulty: "medium",
    estimated_minutes: 9,
    instructions: "Use the load control to step through the captured test up to full load, compare where the curve leaves its elastic slope against the spec threshold line, then submit your classification.",
    inputs: {
      acceptanceStrainPct,
      responseFields: [
        { key: "diagnosis", label: "Does the specimen pass the acceptance spec?", type: "select", options: ["Passes — stays within elastic limit past spec load", "Fails — yields before spec load", "Fails — fractures before spec load"] },
      ],
    },
    expected_output: {},
    workstation_type: "structured_response",
    verification_type: "rule_based",
    simulation_type: "compression_lab",
    verification_definition: {
      simulation: { steps: 40, maxStrainPct, elasticModulusMPa: specimen.elasticModulusMPa, yieldStrainPct, ultimateStrainPct, ultimateStressMPa, specimenLabel: specimen.label },
      rules: [{ field: "diagnosis", equals: classification }],
    },
    points: 15,
    explanation: `The trace's elastic slope departs at about ${yieldStrainPct}% strain against a ${acceptanceStrainPct}% spec threshold, giving: ${classification.toLowerCase()}.`,
    tags: ["mechanical", "materials", "compression", "diagnosis", "stress-strain"],
  }
}

// ─── ECE: waveform_lab variants ──────────────────────────────────────────
const WAVEFORM_SENSORS = [
  { label: "Accelerometer", anomaly: "amplitude_clipping", diagnosis: "Amplitude clipping", cause: "Amplitude" },
  { label: "Thermocouple", anomaly: "dc_offset", diagnosis: "DC offset drift", cause: "Amplitude" },
  { label: "Strain Gauge", anomaly: "added_noise", diagnosis: "Random noise", cause: "Amplitude" },
  { label: "Hall Sensor", anomaly: "dropout", diagnosis: "Signal dropout", cause: "Sampling rate" },
  { label: "Pressure Transducer", anomaly: "amplitude_clipping", diagnosis: "Amplitude clipping", cause: "Amplitude" },
  { label: "Photodiode", anomaly: "dc_offset", diagnosis: "DC offset drift", cause: "Amplitude" },
  { label: "Tachometer", anomaly: "added_noise", diagnosis: "Random noise", cause: "Amplitude" },
  { label: "Humidity Sensor", anomaly: "dropout", diagnosis: "Signal dropout", cause: "Sampling rate" },
]

function buildWaveformVariant(i) {
  const sensor = WAVEFORM_SENSORS[i % WAVEFORM_SENSORS.length]
  const frequencyHz = 200 + (i * 73) % 500
  const severity = round(0.3 + (i * 0.09) % 0.4, 2)
  const seed = 100 + i * 17

  return {
    stream: "ece",
    competency_area: "Signals",
    skill: "Waveform Diagnosis",
    challenge_type: "diagnosis",
    title: `Diagnose the ${sensor.label} Output (Bench ${i + 1})`,
    scenario: `A ${sensor.label.toLowerCase()}'s output was captured on a dual-channel scope alongside a clean reference signal of the same frequency for comparison.`,
    mission: "Inspect both channels on the scope and determine what is wrong with the sensor's output.",
    learning_objective: "Recognize a specific waveform anomaly and identify the affected signal parameter.",
    difficulty: "easy",
    estimated_minutes: 8,
    instructions: "Use the oscilloscope's timebase, averaging, and gain controls to inspect CH2 (sensor output) against CH1 (reference), then submit your diagnosis.",
    inputs: {
      responseFields: [
        { key: "diagnosis", label: "What is wrong with CH2?", type: "select", options: ["Amplitude clipping", "Random noise", "DC offset drift", "Signal dropout"] },
        { key: "cause", label: "Which signal parameter is responsible?", type: "select", options: ["Amplitude", "Frequency", "Phase", "Sampling rate"] },
      ],
    },
    expected_output: {},
    workstation_type: "structured_response",
    verification_type: "rule_based",
    simulation_type: "waveform_lab",
    verification_definition: {
      simulation: {
        sampleCount: 400, durationMs: 20, seed,
        channel1: { label: "Reference (CH1)", frequencyHz, amplitude: 1 },
        channel2: { label: "Sensor Output (CH2)", frequencyHz, amplitude: 1, anomaly: { type: sensor.anomaly, severity } },
      },
      rules: [
        { field: "diagnosis", equals: sensor.diagnosis },
        { field: "cause", equals: sensor.cause },
      ],
    },
    points: 15,
    explanation: `CH2 shows the signature of ${sensor.diagnosis.toLowerCase()} relative to CH1's clean reference — the affected parameter is ${sensor.cause.toLowerCase()}.`,
    tags: ["ece", "signals", "waveform", "diagnosis", "oscilloscope"],
  }
}

async function run() {
  const targetHost = (() => {
    try { return new URL(process.env.SUPABASE_URL || "").host || "(SUPABASE_URL not set)" }
    catch { return "(SUPABASE_URL not set or invalid)" }
  })()
  console.log(`[arena-sim-variants] Target Supabase project: ${targetHost}`)
  console.log(`[arena-sim-variants] Mode: ${EXECUTE ? "*** EXECUTE — THIS WILL WRITE ***" : "DRY RUN"}\n`)

  const candidates = []
  for (let i = 0; i < 8; i++) candidates.push(buildBeamVariant(i))
  for (let i = 0; i < 8; i++) candidates.push(buildRlcVariant(i))
  for (let i = 0; i < 8; i++) candidates.push(buildCompressionVariant(i))
  for (let i = 0; i < 8; i++) candidates.push(buildWaveformVariant(i))

  const { data: streams, error: streamsErr } = await supabaseAdmin.from("streams").select("id, slug")
  if (streamsErr) throw streamsErr
  const streamIdBySlug = new Map(streams.map((s) => [s.slug, s.id]))

  let accepted = 0, rejected = 0, alreadyExists = 0
  for (const entry of candidates) {
    const { stream: streamSlug, ...content } = entry
    const streamId = streamIdBySlug.get(streamSlug)
    const validation = await validateChallengeContent(content, { streamId, streamSlug })
    if (!validation.ok) {
      if (validation.stage === "duplicate") { console.log(`  [EXISTS] "${content.title}" (${streamSlug})`); alreadyExists++ }
      else { console.log(`  [REJECT] "${content.title}" (${streamSlug}) — ${validation.stage}: ${validation.reason}`); rejected++ }
      continue
    }
    if (EXECUTE) {
      const persisted = await insertChallenge(validation.content, { streamId, fingerprint: validation.fingerprint, source: "seed" })
      console.log(`  [INSERTED] "${persisted.title}" (${streamSlug})`)
    } else {
      console.log(`  [WOULD INSERT] "${content.title}" (${streamSlug})`)
    }
    accepted++
  }

  console.log(`\n[arena-sim-variants] ${EXECUTE ? "Done." : "Dry run complete."} Accepted: ${accepted}. Already existed: ${alreadyExists}. Rejected: ${rejected}.`)
}

run().then(() => process.exit(0)).catch((err) => {
  console.error("[arena-sim-variants] Failed:", err)
  process.exit(1)
})

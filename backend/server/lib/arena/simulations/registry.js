/**
 * arena/simulations/registry.js — the canonical Arena simulation registry.
 * A challenge's `simulation_type` must resolve here; AI generation and
 * seed content are both validated against this same list
 * (contentValidation.js) — nothing can invent an unsupported
 * simulation_type. Add a new micro-lab by adding one entry here plus its
 * generator module; nothing else in the validation/route layer changes.
 *
 * Arena Final Stream Reset: each of the 9 Common Challenge streams (cse,
 * ece, eee, mechanical, civil, ai-ml, ai-ds, cyber-security, it) has at
 * least two genuinely distinct simulation worlds — different metaphor,
 * objects, interaction primitive, and output, never a shared "universal
 * slider + graph" template. MBA/MCA carry no entries here — the registry
 * has no notion of either stream.
 */
import { SIMULATION_TYPE as WAVEFORM_LAB, generateWaveformState } from "./waveformLab.js"
import { SIMULATION_TYPE as COMPRESSION_LAB, generateCompressionState } from "./compressionLab.js"
import { SIMULATION_TYPE as RLC_LAB, generateRlcState } from "./rlcLab.js"
import { SIMULATION_TYPE as BEAM_LAB, generateBeamState } from "./beamLab.js"
import { SIMULATION_TYPE as NETWORK_OPS_LAB, generateNetworkOpsState } from "./networkOpsLab.js"
import { SIMULATION_TYPE as CPU_ARCHITECTURE_LAB, generateCpuArchitectureState } from "./cpuArchitectureLab.js"
import { SIMULATION_TYPE as DISTRIBUTED_SYSTEMS_LAB, generateDistributedSystemsState } from "./distributedSystemsLab.js"
import { SIMULATION_TYPE as DIGITAL_LOGIC_BENCH, generateDigitalLogicState } from "./digitalLogicBench.js"
import { SIMULATION_TYPE as CIRCUIT_BENCH, generateCircuitBenchState } from "./circuitBench.js"
import { SIMULATION_TYPE as MOTOR_TEST_BENCH, generateMotorTestBenchState } from "./motorTestBench.js"
import { SIMULATION_TYPE as PLC_PANEL, generatePlcPanelState } from "./plcPanel.js"
import { SIMULATION_TYPE as VIBRATION_RIG, generateVibrationRigState } from "./vibrationRig.js"
import { SIMULATION_TYPE as PNEUMATIC_TRAINER, generatePneumaticTrainerState } from "./pneumaticTrainer.js"
import { SIMULATION_TYPE as SURVEYING_STATION, generateSurveyingStationState } from "./surveyingStation.js"
import { SIMULATION_TYPE as HYDRAULICS_CHANNEL, generateHydraulicsChannelState } from "./hydraulicsChannel.js"
import { SIMULATION_TYPE as MODEL_DIAGNOSIS_STUDIO, generateModelDiagnosisState } from "./modelDiagnosisStudio.js"
import { SIMULATION_TYPE as COMPUTER_VISION_LAB, generateComputerVisionState } from "./computerVisionLab.js"
import { SIMULATION_TYPE as DATA_INVESTIGATION_STUDIO, generateDataInvestigationState } from "./dataInvestigationStudio.js"
import { SIMULATION_TYPE as EXPERIMENT_ANALYSIS_ROOM, generateExperimentAnalysisState } from "./experimentAnalysisRoom.js"
import { SIMULATION_TYPE as SOC_INCIDENT_ROOM, generateSocIncidentState } from "./socIncidentRoom.js"
import { SIMULATION_TYPE as DIGITAL_FORENSICS_LAB, generateDigitalForensicsState } from "./digitalForensicsLab.js"
import { SIMULATION_TYPE as NETWORK_OPERATIONS_CENTER, generateNocState } from "./networkOperationsCenter.js"
import { SIMULATION_TYPE as SYSTEM_ADMIN_LAB, generateSystemAdminState } from "./systemAdminLab.js"

export const SIMULATION_REGISTRY = {
  // ─── ECE — Electronics & Communication ─────────────────────────────
  [WAVEFORM_LAB]: {
    id: WAVEFORM_LAB,
    name: "Signal Lab",
    supportedStreams: ["ece"],
    supportedChallengeTypes: ["diagnosis", "investigation"],
    generate: generateWaveformState,
    // Every generator here defaults missing recipe fields defensively (so
    // a malformed AI response degrades to SOME trace rather than a 500)
    // — which means "does it throw" alone can't detect a meaningless
    // config. requiredConfigKeys is the separate, explicit floor
    // contentValidation.js checks: an authored config missing these isn't
    // a real dual-channel scope, whatever the generator falls back to.
    requiredConfigKeys: ["channel1", "channel2"],
  },
  [DIGITAL_LOGIC_BENCH]: {
    id: DIGITAL_LOGIC_BENCH,
    name: "Digital Logic Bench",
    supportedStreams: ["ece"],
    supportedChallengeTypes: ["diagnosis", "investigation"],
    generate: generateDigitalLogicState,
    requiredConfigKeys: ["inputLabels", "gates", "outputWire"],
  },
  [CIRCUIT_BENCH]: {
    id: CIRCUIT_BENCH,
    name: "Electronics Circuit Bench",
    supportedStreams: ["ece"],
    supportedChallengeTypes: ["diagnosis", "investigation"],
    generate: generateCircuitBenchState,
    requiredConfigKeys: ["sourceVoltageV", "nominal", "actual"],
  },

  // ─── EEE — Electrical & Electronics ─────────────────────────────────
  [RLC_LAB]: {
    id: RLC_LAB,
    name: "Electrical Circuit Lab",
    supportedStreams: ["eee"],
    supportedChallengeTypes: ["investigation", "diagnosis", "calculation"],
    generate: generateRlcState,
    requiredConfigKeys: ["resistanceOhms", "inductanceH", "capacitanceF", "sourceVoltageV", "freqMinHz", "freqMaxHz"],
  },
  [MOTOR_TEST_BENCH]: {
    id: MOTOR_TEST_BENCH,
    name: "Motor Test Bench",
    supportedStreams: ["eee"],
    supportedChallengeTypes: ["diagnosis", "investigation"],
    generate: generateMotorTestBenchState,
    requiredConfigKeys: ["rated", "loadLevelsPct"],
  },
  [PLC_PANEL]: {
    id: PLC_PANEL,
    name: "PLC / Industrial Automation Panel",
    supportedStreams: ["eee"],
    supportedChallengeTypes: ["diagnosis", "investigation"],
    generate: generatePlcPanelState,
    requiredConfigKeys: ["sensorLabels", "actuatorLabels", "rules", "inputSequence"],
  },

  // ─── Mechanical Engineering ──────────────────────────────────────────
  [COMPRESSION_LAB]: {
    id: COMPRESSION_LAB,
    name: "Materials Lab",
    supportedStreams: ["mechanical"],
    supportedChallengeTypes: ["diagnosis", "investigation", "decision_making"],
    generate: generateCompressionState,
    requiredConfigKeys: ["elasticModulusMPa", "yieldStrainPct", "ultimateStrainPct", "ultimateStressMPa"],
  },
  [VIBRATION_RIG]: {
    id: VIBRATION_RIG,
    name: "Machine Vibration Rig",
    supportedStreams: ["mechanical"],
    supportedChallengeTypes: ["diagnosis", "investigation"],
    generate: generateVibrationRigState,
    requiredConfigKeys: ["conditions"],
  },
  [PNEUMATIC_TRAINER]: {
    id: PNEUMATIC_TRAINER,
    name: "Pneumatic Trainer",
    supportedStreams: ["mechanical"],
    supportedChallengeTypes: ["diagnosis", "investigation"],
    generate: generatePneumaticTrainerState,
    requiredConfigKeys: ["strokeMm", "extendFlowRateMmS", "retractFlowRateMmS", "supplyPressureBar", "valveSequence"],
  },

  // ─── Civil Engineering ───────────────────────────────────────────────
  [BEAM_LAB]: {
    id: BEAM_LAB,
    name: "Structures Lab",
    supportedStreams: ["civil"],
    supportedChallengeTypes: ["diagnosis", "investigation", "calculation"],
    generate: generateBeamState,
    requiredConfigKeys: ["spanMm", "loadN", "loadPositionMm", "modulusMPa", "sectionWidthMm", "sectionHeightMm"],
  },
  [SURVEYING_STATION]: {
    id: SURVEYING_STATION,
    name: "Surveying Station",
    supportedStreams: ["civil"],
    supportedChallengeTypes: ["investigation", "calculation"],
    generate: generateSurveyingStationState,
    requiredConfigKeys: ["legs"],
  },
  [HYDRAULICS_CHANNEL]: {
    id: HYDRAULICS_CHANNEL,
    name: "Hydraulics Channel",
    supportedStreams: ["civil"],
    supportedChallengeTypes: ["investigation", "calculation"],
    generate: generateHydraulicsChannelState,
    requiredConfigKeys: ["channelWidthM", "upstreamHeadM", "gateSettings"],
  },

  // ─── CSE — Computer Science Engineering ─────────────────────────────
  [NETWORK_OPS_LAB]: {
    id: NETWORK_OPS_LAB,
    name: "Network Operations Lab",
    supportedStreams: ["cse"],
    supportedChallengeTypes: ["diagnosis", "investigation"],
    generate: generateNetworkOpsState,
    requiredConfigKeys: ["nodes", "links", "faultLinkId"],
  },
  [CPU_ARCHITECTURE_LAB]: {
    id: CPU_ARCHITECTURE_LAB,
    name: "CPU / Architecture Lab",
    supportedStreams: ["cse"],
    supportedChallengeTypes: ["diagnosis", "investigation", "calculation"],
    generate: generateCpuArchitectureState,
    requiredConfigKeys: ["instructions", "cache"],
  },
  [DISTRIBUTED_SYSTEMS_LAB]: {
    id: DISTRIBUTED_SYSTEMS_LAB,
    name: "Distributed Systems Lab",
    supportedStreams: ["cse"],
    supportedChallengeTypes: ["diagnosis", "investigation"],
    generate: generateDistributedSystemsState,
    requiredConfigKeys: ["nodes", "leaderId", "writes", "downWindows"],
  },

  // ─── AI & Machine Learning ───────────────────────────────────────────
  [MODEL_DIAGNOSIS_STUDIO]: {
    id: MODEL_DIAGNOSIS_STUDIO,
    name: "Model Diagnosis Studio",
    supportedStreams: ["ai-ml"],
    supportedChallengeTypes: ["investigation", "diagnosis", "decision_making"],
    generate: generateModelDiagnosisState,
    requiredConfigKeys: ["labeledScores", "thresholdOptions"],
  },
  [COMPUTER_VISION_LAB]: {
    id: COMPUTER_VISION_LAB,
    name: "Computer Vision Lab",
    supportedStreams: ["ai-ml"],
    supportedChallengeTypes: ["investigation", "diagnosis"],
    generate: generateComputerVisionState,
    requiredConfigKeys: ["images", "iouThresholdOptions"],
  },

  // ─── AI & Data Science ───────────────────────────────────────────────
  [DATA_INVESTIGATION_STUDIO]: {
    id: DATA_INVESTIGATION_STUDIO,
    name: "Data Investigation Studio",
    supportedStreams: ["ai-ds"],
    supportedChallengeTypes: ["investigation", "data_interpretation"],
    generate: generateDataInvestigationState,
    requiredConfigKeys: ["rows", "excludeFilter", "groupByOptions", "aggregateColumn"],
  },
  [EXPERIMENT_ANALYSIS_ROOM]: {
    id: EXPERIMENT_ANALYSIS_ROOM,
    name: "Experiment Analysis Room",
    supportedStreams: ["ai-ds"],
    supportedChallengeTypes: ["investigation", "decision_making", "data_interpretation"],
    generate: generateExperimentAnalysisState,
    requiredConfigKeys: ["experiments"],
  },

  // ─── Cyber Security ──────────────────────────────────────────────────
  [SOC_INCIDENT_ROOM]: {
    id: SOC_INCIDENT_ROOM,
    name: "SOC Incident Room",
    supportedStreams: ["cyber-security"],
    supportedChallengeTypes: ["investigation", "diagnosis"],
    generate: generateSocIncidentState,
    requiredConfigKeys: ["events"],
  },
  [DIGITAL_FORENSICS_LAB]: {
    id: DIGITAL_FORENSICS_LAB,
    name: "Digital Forensics Lab",
    supportedStreams: ["cyber-security"],
    supportedChallengeTypes: ["investigation", "diagnosis"],
    generate: generateDigitalForensicsState,
    requiredConfigKeys: ["artifacts"],
  },

  // ─── Information Technology ──────────────────────────────────────────
  [NETWORK_OPERATIONS_CENTER]: {
    id: NETWORK_OPERATIONS_CENTER,
    name: "Network Operations Center",
    supportedStreams: ["it"],
    supportedChallengeTypes: ["diagnosis", "investigation", "decision_making"],
    generate: generateNocState,
    requiredConfigKeys: ["services"],
  },
  [SYSTEM_ADMIN_LAB]: {
    id: SYSTEM_ADMIN_LAB,
    name: "System Admin Lab",
    supportedStreams: ["it"],
    supportedChallengeTypes: ["diagnosis", "investigation"],
    generate: generateSystemAdminState,
    requiredConfigKeys: ["processes", "totalMemoryMB", "metrics"],
  },
}

// Roadmap — further simulation families this registry can still grow
// into: EEE power_electronics_bench; Mechanical manufacturing_cell,
// measurement_bench; Civil concrete_test_lab, soil_test_bench; IT
// cloud_infrastructure_lab. Not registered yet — an unimplemented entry
// here would let content validation accept a simulation_type with no
// working generator, breaking the UI it renders into. Add each only
// alongside its own generator module, same as every entry above.

export const SIMULATION_TYPES = Object.keys(SIMULATION_REGISTRY)

export function isKnownSimulationType(simulationType) {
  return Object.prototype.hasOwnProperty.call(SIMULATION_REGISTRY, simulationType)
}

/** Full compatibility check used by contentValidation.js: an unsupported
 *  type, or a supported type used outside its declared stream/
 *  challenge_type, is rejected before persistence. */
export function validateSimulationCompatibility(simulationType, { streamSlug, challengeType }) {
  if (!simulationType) return { ok: true }
  const sim = SIMULATION_REGISTRY[simulationType]
  if (!sim) return { ok: false, reason: `simulation_type "${simulationType}" is not in the supported simulation registry` }
  if (!sim.supportedStreams.includes(streamSlug)) {
    return { ok: false, reason: `simulation_type "${simulationType}" is not supported for stream "${streamSlug}" (supports: ${sim.supportedStreams.join(", ")})` }
  }
  if (!sim.supportedChallengeTypes.includes(challengeType)) {
    return { ok: false, reason: `simulation_type "${simulationType}" does not support challenge_type "${challengeType}" (supports: ${sim.supportedChallengeTypes.join(", ")})` }
  }
  return { ok: true }
}

/** Checks a candidate simulation_config actually declares the fields that
 *  make this simulation type meaningful (reject "a renderer exists but
 *  the challenge has no meaningful interaction configuration").
 *  Deliberately separate from getSimulationState — the generators default
 *  missing fields defensively, so "does it throw" can't catch this. */
export function validateSimulationConfigShape(simulationType, config) {
  const sim = SIMULATION_REGISTRY[simulationType]
  if (!sim) return { ok: false, reason: `simulation_type "${simulationType}" is not in the supported simulation registry` }
  const missing = (sim.requiredConfigKeys || []).filter((key) => config?.[key] === undefined)
  if (missing.length > 0) {
    return { ok: false, reason: `simulation_config for "${simulationType}" is missing required key(s): ${missing.join(", ")} — not a meaningful interactive configuration` }
  }
  return { ok: true }
}

/** Returns every registered simulation_type supported for a given
 *  stream — used by generation.js to enforce world diversity (prefer a
 *  world not recently used) and by contentValidation.js roadmap checks. */
export function simulationTypesForStream(streamSlug) {
  return SIMULATION_TYPES.filter((t) => SIMULATION_REGISTRY[t].supportedStreams.includes(streamSlug))
}

/** Computes the PUBLIC simulation state from a challenge's hidden recipe.
 *  Called once per mission fetch (routes/arena.js) — deterministic, so a
 *  refresh always reproduces the identical trace. Returns null for an
 *  unknown type/missing recipe rather than throwing, since a malformed
 *  challenge should degrade to "no simulation shown", not a 500 for the
 *  student. */
export function getSimulationState(simulationType, recipe) {
  const sim = SIMULATION_REGISTRY[simulationType]
  if (!sim || !recipe) return null
  try {
    return sim.generate(recipe)
  } catch {
    return null
  }
}

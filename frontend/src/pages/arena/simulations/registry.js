// arena/simulations/registry.js — frontend half of the simulation
// registry. Maps a challenge's simulation_type to the React component
// that renders it. Lazy-loaded per type so Arena's initial bundle never
// pays for a micro-lab the student isn't currently running.
import { lazy } from "react"

export const SIMULATION_COMPONENTS = {
  // ECE
  waveform_lab: lazy(() => import("./WaveformLab.jsx")),
  digital_logic_bench: lazy(() => import("./DigitalLogicBench.jsx")),
  circuit_bench: lazy(() => import("./CircuitBench.jsx")),
  // EEE
  rlc_lab: lazy(() => import("./RlcLab.jsx")),
  motor_test_bench: lazy(() => import("./MotorTestBench.jsx")),
  plc_panel: lazy(() => import("./PlcPanel.jsx")),
  // Mechanical
  compression_lab: lazy(() => import("./CompressionLab.jsx")),
  vibration_rig: lazy(() => import("./VibrationRig.jsx")),
  pneumatic_trainer: lazy(() => import("./PneumaticTrainer.jsx")),
  // Civil
  beam_lab: lazy(() => import("./BeamLab.jsx")),
  surveying_station: lazy(() => import("./SurveyingStation.jsx")),
  hydraulics_channel: lazy(() => import("./HydraulicsChannel.jsx")),
  // CSE
  network_ops_lab: lazy(() => import("./NetworkOpsLab.jsx")),
  cpu_architecture_lab: lazy(() => import("./CpuArchitectureLab.jsx")),
  distributed_systems_lab: lazy(() => import("./DistributedSystemsLab.jsx")),
  // AI/ML
  model_diagnosis_studio: lazy(() => import("./ModelDiagnosisStudio.jsx")),
  computer_vision_lab: lazy(() => import("./ComputerVisionLab.jsx")),
  // AI & Data Science
  data_investigation_studio: lazy(() => import("./DataInvestigationStudio.jsx")),
  experiment_analysis_room: lazy(() => import("./ExperimentAnalysisRoom.jsx")),
  // Cyber Security
  soc_incident_room: lazy(() => import("./SocIncidentRoom.jsx")),
  digital_forensics_lab: lazy(() => import("./DigitalForensicsLab.jsx")),
  // IT
  network_operations_center: lazy(() => import("./NetworkOperationsCenter.jsx")),
  system_admin_lab: lazy(() => import("./SystemAdminLab.jsx")),
}

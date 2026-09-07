-- Arena Final Stream Reset — Part B: adds the 17 new simulation_type
-- values to the CHECK constraint so each of the 9 Common Challenge
-- streams has at least 2 genuinely distinct simulation worlds.
-- 'operations_lab' stays in the allowlist even though MBA is removed —
-- a retired historical row still carries it, and a CHECK constraint
-- applies regardless of status.

BEGIN;

ALTER TABLE public.arena_challenges
  DROP CONSTRAINT IF EXISTS arena_challenges_simulation_type_check;

ALTER TABLE public.arena_challenges
  ADD CONSTRAINT arena_challenges_simulation_type_check
  CHECK (simulation_type IS NULL OR simulation_type IN (
    'waveform_lab', 'digital_logic_bench', 'circuit_bench',
    'rlc_lab', 'motor_test_bench', 'plc_panel',
    'compression_lab', 'vibration_rig', 'pneumatic_trainer',
    'beam_lab', 'surveying_station', 'hydraulics_channel',
    'network_ops_lab', 'cpu_architecture_lab', 'distributed_systems_lab',
    'model_diagnosis_studio', 'computer_vision_lab',
    'data_investigation_studio', 'experiment_analysis_room',
    'soc_incident_room', 'digital_forensics_lab',
    'network_operations_center', 'system_admin_lab',
    'operations_lab'
  ));

COMMIT;

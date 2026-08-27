export type MissionDifficulty = 'entry' | 'mid' | 'senior' | 'lead';
export type MissionStatus = 'draft' | 'published' | 'archived';
export type SubmissionStatus = 'in_progress' | 'submitted' | 'evaluated' | 'failed';

export interface MissionCompany {
  name: string;
  industry: string;
  size: 'startup' | 'scaleup' | 'enterprise';
  description: string;
}

export interface MissionManager {
  name: string;
  title: string;
  department: string;
}

export interface MissionRequirement {
  id: string;
  description: string;
  isRequired: boolean;
  weight: number;
}

export interface MissionEvaluationCriterion {
  id: string;
  name: string;
  description: string;
  weight: number;
  evaluationType: 'deterministic' | 'ai_assisted' | 'artifact';
}

export interface Mission {
  id: string;
  roleId: string;
  roleName: string;
  title: string;
  slug: string;
  difficulty: MissionDifficulty;
  estimatedMinutes: number;
  status: MissionStatus;
  company: MissionCompany;
  manager: MissionManager;
  department: string;
  sprint: string;
  businessContext: string;
  problemStatement: string;
  requirements: MissionRequirement[];
  acceptanceCriteria: string[];
  evaluationCriteria: MissionEvaluationCriterion[];
  availableTools: string[];
  expectedDeliverable: string;
  referenceDocumentation: string | null;
  skillIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MissionWithSkills extends Mission {
  skills: Array<{ skillId: string; skillName: string; weight: number }>;
}

export interface Submission {
  id: string;
  userId: string;
  missionId: string;
  mission: Mission;
  workspaceSnapshot: Record<string, unknown>; // workspace state
  files: Record<string, string>; // filename -> content
  notes: string | null;
  status: SubmissionStatus;
  startedAt: Date;
  submittedAt: Date | null;
  timeSpentMinutes: number | null;
}
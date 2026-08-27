export type SkillCategory =
  | 'technical'
  | 'analytical'
  | 'communication'
  | 'leadership'
  | 'domain'
  | 'tooling';

export type MeasurementMethod =
  | 'code_execution'
  | 'test_cases'
  | 'artifact_review'
  | 'peer_review'
  | 'ai_assessment'
  | 'portfolio_evidence';

export interface Skill {
  id: string;
  name: string;
  slug: string;
  category: SkillCategory;
  description: string;
  measurementMethod: MeasurementMethod;
  parentSkillId: string | null; // for skill hierarchy
  createdAt: Date;
}

export interface RoleSkill {
  id: string;
  roleId: string;
  skillId: string;
  weight: number; // 0-100, importance to role
  isCore: boolean;
}

export interface UserSkill {
  id: string;
  userId: string;
  skillId: string;
  skill: Skill;
  eloScore: number; // starts at 1000
  evidenceCount: number;
  lastDemonstratedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SkillEvidence {
  id: string;
  userSkillId: string;
  submissionId: string;
  eloDelta: number;
  sourceType: 'mission_completion' | 'peer_review' | 'certification' | 'project';
  notes: string | null;
  createdAt: Date;
}

export interface SkillNode {
  skill: Skill;
  userSkill: UserSkill | null;
  children: SkillNode[];
  isUnlocked: boolean;
}

export interface SkillGraph {
  roleId: string;
  roleName: string;
  nodes: SkillNode[];
  totalSkills: number;
  demonstratedSkills: number;
}
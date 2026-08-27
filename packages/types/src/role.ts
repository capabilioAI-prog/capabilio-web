export type Discipline =
  | 'software_engineering'
  | 'data_science'
  | 'machine_learning'
  | 'product_management'
  | 'design'
  | 'cybersecurity'
  | 'devops'
  | 'business_analysis'
  | 'mba'
  | 'mechanical_engineering'
  | 'civil_engineering'
  | 'electronics'
  | 'finance'
  | 'marketing'
  | 'hr'
  | 'legal';

export type RoleLevel = 'intern' | 'junior' | 'mid' | 'senior' | 'lead' | 'principal';

export interface Role {
  id: string;
  disciplineId: string;
  name: string;
  slug: string;
  level: RoleLevel;
  description: string;
  iconName: string | null;
  color: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface RoleKnowledge {
  id: string;
  roleId: string;
  responsibilities: string[];
  tools: string[];
  software: string[];
  workflows: string[];
  deliverables: string[];
  evaluationMethods: string[];
  portfolioEvidenceTypes: string[];
}

export interface RoleDiscipline {
  id: string;
  name: string;
  slug: Discipline;
  description: string;
  iconName: string | null;
}
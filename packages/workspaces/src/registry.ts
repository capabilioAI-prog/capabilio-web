import type { WorkspaceConfig, WorkspaceType } from '@capabilio/types';
import {
  softwareEngineerWorkspace,
  frontendDeveloperWorkspace,
  backendDeveloperWorkspace,
  fullStackDeveloperWorkspace,
  dbaWorkspace,
  mlAiEngineerWorkspace,
  cybersecurityAnalystWorkspace,
  devopsEngineerWorkspace,
  dataAnalystWorkspace,
  qaEngineerWorkspace,
  civilEngineerWorkspace,
  mechanicalEngineerWorkspace,
  electronicsEngineerWorkspace,
  electricalEngineerWorkspace,
  businessProductWorkspace,
} from './configs/all-workstations';

// Complete data-driven registry mapping role slugs to specialized workspace configs
const WORKSPACE_REGISTRY: Record<string, WorkspaceConfig> = {
  // Software
  'software-engineer': softwareEngineerWorkspace,
  'software-engineering': softwareEngineerWorkspace,
  'frontend-developer': frontendDeveloperWorkspace,
  'frontend-engineer': frontendDeveloperWorkspace,
  'backend-developer': backendDeveloperWorkspace,
  'backend-engineer': backendDeveloperWorkspace,
  'full-stack-developer': fullStackDeveloperWorkspace,
  'fullstack-developer': fullStackDeveloperWorkspace,
  'devops-engineer': devopsEngineerWorkspace,
  'cloud-engineer': devopsEngineerWorkspace,
  'qa-engineer': qaEngineerWorkspace,
  'mobile-developer': softwareEngineerWorkspace,

  // Data / AI
  'database-administrator': dbaWorkspace,
  'dba': dbaWorkspace,
  'ml-ai-engineer': mlAiEngineerWorkspace,
  'machine-learning-engineer': mlAiEngineerWorkspace,
  'ai-engineer': mlAiEngineerWorkspace,
  'data-analyst': dataAnalystWorkspace,
  'data-scientist': mlAiEngineerWorkspace,
  'data-engineer': backendDeveloperWorkspace,

  // Cybersecurity
  'cybersecurity-analyst': cybersecurityAnalystWorkspace,
  'soc-analyst': cybersecurityAnalystWorkspace,
  'security-analyst': cybersecurityAnalystWorkspace,
  'penetration-tester': cybersecurityAnalystWorkspace,
  'cloud-security': cybersecurityAnalystWorkspace,

  // Engineering
  'civil-engineer': civilEngineerWorkspace,
  'structural-engineer': civilEngineerWorkspace,
  'mechanical-engineer': mechanicalEngineerWorkspace,
  'cad-engineer': mechanicalEngineerWorkspace,
  'electronics-engineer': electronicsEngineerWorkspace,
  'ece': electronicsEngineerWorkspace,
  'embedded-engineer': electronicsEngineerWorkspace,
  'electrical-engineer': electricalEngineerWorkspace,
  'eee': electricalEngineerWorkspace,

  // Business
  'business-analyst': businessProductWorkspace,
  'product-manager': businessProductWorkspace,
  'product-analyst': businessProductWorkspace,
  'mba': businessProductWorkspace,
  'finance-analyst': dataAnalystWorkspace,
  'marketing-analyst': dataAnalystWorkspace,
};

export function getWorkspaceConfig(roleSlug: string): WorkspaceConfig {
  const normalized = roleSlug.toLowerCase().replace(/_/g, '-');
  const config = WORKSPACE_REGISTRY[normalized] || softwareEngineerWorkspace;
  return config;
}

export function hasWorkspace(roleSlug: string): boolean {
  const normalized = roleSlug.toLowerCase().replace(/_/g, '-');
  return normalized in WORKSPACE_REGISTRY;
}

export function getAllWorkspaceTypes(): WorkspaceType[] {
  return [...new Set(Object.values(WORKSPACE_REGISTRY).map(w => w.type))];
}

export * from './configs/all-workstations';

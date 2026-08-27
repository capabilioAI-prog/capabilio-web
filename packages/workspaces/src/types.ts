import type { WorkspaceConfig, WorkspaceType } from '@capabilio/types';

export interface WorkspaceRegistry {
  [roleSlug: string]: WorkspaceConfig;
}

export type { WorkspaceConfig, WorkspaceType };

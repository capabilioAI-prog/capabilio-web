export type WorkspaceType =
  // Software
  | 'software_engineer'
  | 'software_engineer_frontend'
  | 'software_engineer_backend'
  | 'software_engineer_fullstack'
  | 'mobile_developer'
  | 'qa_engineer'
  | 'devops_engineer'
  | 'cloud_engineer'
  // Data / AI
  | 'data_analyst'
  | 'data_scientist'
  | 'ml_engineer'
  | 'database_administrator'
  | 'data_engineer'
  // Cybersecurity
  | 'soc_analyst'
  | 'cybersecurity_analyst'
  | 'penetration_tester'
  | 'cloud_security'
  | 'grc_compliance'
  // Engineering
  | 'electronics_engineer'
  | 'embedded_systems'
  | 'electrical_engineer'
  | 'mechanical_engineer'
  | 'civil_engineer'
  | 'cad_engineer'
  // Business
  | 'business_analyst'
  | 'product_analyst'
  | 'product_manager'
  | 'mba_business'
  | 'project_manager'
  | 'finance_analyst'
  | 'marketing_analyst';

export type PanelType =
  | 'code_editor'
  | 'file_tree'
  | 'terminal'
  | 'browser_preview'
  | 'console'
  | 'problems'
  | 'git_diff'
  | 'api_client'
  | 'database_explorer'
  | 'server_logs'
  | 'notebook'
  | 'chart'
  | 'design_reference'
  | 'document_editor'
  | 'dataset_viewer'
  | 'security_alerts'
  | 'incident_timeline'
  | 'cad_viewer'
  | 'calculation_sheet'
  | 'metrics_dashboard';

export interface PanelConfig {
  id: string;
  type: PanelType;
  title: string;
  position: 'left' | 'center' | 'right' | 'bottom';
  defaultWidth?: number; // percentage
  defaultHeight?: number; // percentage
  isResizable: boolean;
  isCloseable: boolean;
  props?: Record<string, unknown>;
}

export interface WorkspaceConfig {
  type: WorkspaceType;
  name: string;
  description: string;
  panels: PanelConfig[];
  supportedLanguages: string[];
  defaultLanguage: string;
  features: WorkspaceFeature[];
}

export type WorkspaceFeature =
  | 'code_execution'
  | 'test_runner'
  | 'git'
  | 'terminal'
  | 'browser_preview'
  | 'api_testing'
  | 'database'
  | 'notebook'
  | 'design_reference';

export interface WorkspaceState {
  type: WorkspaceType;
  files: Record<string, WorkspaceFile>;
  activeFile: string | null;
  terminalHistory: string[];
  consoleOutput: ConsoleEntry[];
  testResults: TestResult[] | null;
}  

export interface WorkspaceFile {
  name: string;
  path: string;
  content: string;
  language: string;
  isReadonly: boolean;
  isDirty: boolean;
}

export interface ConsoleEntry {
  id: string;
  type: 'log' | 'warn' | 'error' | 'info' | 'output';
  message: string;
  timestamp: Date;
}

export interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  error: string | null;
  expected: string | null;
  received: string | null;
}
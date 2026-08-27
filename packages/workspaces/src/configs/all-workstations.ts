import type { WorkspaceConfig } from '@capabilio/types';

// 1. Software Engineer (Full IDE)
export const softwareEngineerWorkspace: WorkspaceConfig = {
  type: 'software_engineer',
  name: 'Software Engineering Workstation',
  description: 'Production engineering workstation with multi-file repository explorer, Monaco code editor, build terminal, and test matrix.',
  supportedLanguages: ['typescript', 'javascript', 'python', 'json', 'yaml', 'sql'],
  defaultLanguage: 'typescript',
  features: ['code_execution', 'test_runner', 'terminal', 'git'],
  panels: [
    { id: 'file-tree', type: 'file_tree', title: 'Repository', position: 'left', defaultWidth: 20, isResizable: true, isCloseable: false },
    { id: 'code-editor', type: 'code_editor', title: 'Editor', position: 'center', defaultWidth: 50, isResizable: true, isCloseable: false },
    { id: 'terminal', type: 'terminal', title: 'Terminal / Output', position: 'bottom', defaultHeight: 35, isResizable: true, isCloseable: false },
    { id: 'problems', type: 'problems', title: 'Test Matrix', position: 'bottom', defaultHeight: 35, isResizable: true, isCloseable: true },
  ],
};

// 2. Frontend Developer
export const frontendDeveloperWorkspace: WorkspaceConfig = {
  type: 'software_engineer_frontend',
  name: 'Frontend Development Workstation',
  description: 'Component architecture environment with live browser preview, DOM console, accessibility inspector, and responsive viewport.',
  supportedLanguages: ['typescript', 'javascript', 'html', 'css', 'json'],
  defaultLanguage: 'typescript',
  features: ['code_execution', 'test_runner', 'browser_preview', 'terminal'],
  panels: [
    { id: 'file-tree', type: 'file_tree', title: 'Components & Styles', position: 'left', defaultWidth: 18, isResizable: true, isCloseable: false },
    { id: 'code-editor', type: 'code_editor', title: 'JSX / CSS Editor', position: 'center', defaultWidth: 42, isResizable: true, isCloseable: false },
    { id: 'browser-preview', type: 'browser_preview', title: 'Live Browser Viewport', position: 'right', defaultWidth: 40, isResizable: true, isCloseable: false },
    { id: 'console', type: 'console', title: 'Console & a11y', position: 'bottom', defaultHeight: 30, isResizable: true, isCloseable: true },
  ],
};

// 3. Backend Developer
export const backendDeveloperWorkspace: WorkspaceConfig = {
  type: 'software_engineer_backend',
  name: 'Backend API & Microservices Workstation',
  description: 'Server engineering environment with API route handler editor, request/response tester, middleware logs, and database client.',
  supportedLanguages: ['typescript', 'javascript', 'sql', 'json'],
  defaultLanguage: 'typescript',
  features: ['code_execution', 'test_runner', 'api_testing', 'database', 'terminal'],
  panels: [
    { id: 'file-tree', type: 'file_tree', title: 'API Routes & Middleware', position: 'left', defaultWidth: 20, isResizable: true, isCloseable: false },
    { id: 'code-editor', type: 'code_editor', title: 'Route Handler Editor', position: 'center', defaultWidth: 45, isResizable: true, isCloseable: false },
    { id: 'api-client', type: 'api_client', title: 'HTTP Request Tester', position: 'right', defaultWidth: 35, isResizable: true, isCloseable: false },
    { id: 'server-logs', type: 'server_logs', title: 'Server Telemetry Logs', position: 'bottom', defaultHeight: 30, isResizable: true, isCloseable: false },
  ],
};

// 4. Full Stack Developer
export const fullStackDeveloperWorkspace: WorkspaceConfig = {
  type: 'software_engineer_fullstack',
  name: 'Full Stack Workstation',
  description: 'End-to-end full stack environment integrating frontend components, backend endpoints, relational schema, and E2E assertions.',
  supportedLanguages: ['typescript', 'javascript', 'sql', 'html', 'css', 'json'],
  defaultLanguage: 'typescript',
  features: ['code_execution', 'test_runner', 'browser_preview', 'api_testing', 'database', 'terminal'],
  panels: [
    { id: 'file-tree', type: 'file_tree', title: 'Full Stack Repository', position: 'left', defaultWidth: 20, isResizable: true, isCloseable: false },
    { id: 'code-editor', type: 'code_editor', title: 'Editor', position: 'center', defaultWidth: 45, isResizable: true, isCloseable: false },
    { id: 'browser-preview', type: 'browser_preview', title: 'App Preview', position: 'right', defaultWidth: 35, isResizable: true, isCloseable: false },
    { id: 'terminal', type: 'terminal', title: 'E2E & Test Runner', position: 'bottom', defaultHeight: 30, isResizable: true, isCloseable: false },
  ],
};

// 5. Database Administrator (DBA)
export const dbaWorkspace: WorkspaceConfig = {
  type: 'database_administrator',
  name: 'Database Administration Workstation',
  description: 'Relational database workstation with SQL query runner, schema browser, index inspector, execution plan analyzer, and performance benchmarks.',
  supportedLanguages: ['sql', 'json'],
  defaultLanguage: 'sql',
  features: ['database', 'code_execution', 'test_runner'],
  panels: [
    { id: 'database-explorer', type: 'database_explorer', title: 'Schema & Indexes', position: 'left', defaultWidth: 22, isResizable: true, isCloseable: false },
    { id: 'code-editor', type: 'code_editor', title: 'SQL Query Editor', position: 'center', defaultWidth: 48, isResizable: true, isCloseable: false },
    { id: 'chart', type: 'chart', title: 'EXPLAIN & Index Cost Analysis', position: 'right', defaultWidth: 30, isResizable: true, isCloseable: false },
    { id: 'console', type: 'console', title: 'Query Results & Metrics', position: 'bottom', defaultHeight: 35, isResizable: true, isCloseable: false },
  ],
};

// 6. ML / AI Engineer
export const mlAiEngineerWorkspace: WorkspaceConfig = {
  type: 'ml_engineer',
  name: 'ML / AI Engineering Workstation',
  description: 'Machine learning workspace with Python script editor, dataset inspector, train/test split evaluator, confusion matrix visualizer, and metric tuning.',
  supportedLanguages: ['python', 'json'],
  defaultLanguage: 'python',
  features: ['code_execution', 'test_runner', 'notebook'],
  panels: [
    { id: 'dataset-viewer', type: 'dataset_viewer', title: 'Dataset & Feature Schema', position: 'left', defaultWidth: 22, isResizable: true, isCloseable: false },
    { id: 'code-editor', type: 'code_editor', title: 'Python Pipeline Editor', position: 'center', defaultWidth: 48, isResizable: true, isCloseable: false },
    { id: 'metrics-dashboard', type: 'metrics_dashboard', title: 'Evaluation Metrics (F1/AUC)', position: 'right', defaultWidth: 30, isResizable: true, isCloseable: false },
    { id: 'terminal', type: 'terminal', title: 'Training & Execution Logs', position: 'bottom', defaultHeight: 35, isResizable: true, isCloseable: false },
  ],
};

// 7. Cybersecurity & SOC Analyst
export const cybersecurityAnalystWorkspace: WorkspaceConfig = {
  type: 'cybersecurity_analyst',
  name: 'SOC & Cybersecurity Workstation',
  description: 'Security operations workstation with authentication log stream, IOC extractor, threat timeline correlator, and incident containment manager.',
  supportedLanguages: ['python', 'json', 'yaml'],
  defaultLanguage: 'json',
  features: ['code_execution', 'test_runner', 'terminal'],
  panels: [
    { id: 'security-alerts', type: 'security_alerts', title: 'SIEM Alerts & Telemetry', position: 'left', defaultWidth: 24, isResizable: true, isCloseable: false },
    { id: 'code-editor', type: 'code_editor', title: 'Investigation & Scripting', position: 'center', defaultWidth: 46, isResizable: true, isCloseable: false },
    { id: 'incident-timeline', type: 'incident_timeline', title: 'IOC Correlation & Timeline', position: 'right', defaultWidth: 30, isResizable: true, isCloseable: false },
    { id: 'terminal', type: 'terminal', title: 'SOC Investigation Logs', position: 'bottom', defaultHeight: 35, isResizable: true, isCloseable: false },
  ],
};

// 8. DevOps Engineer
export const devopsEngineerWorkspace: WorkspaceConfig = {
  type: 'devops_engineer',
  name: 'DevOps & Cloud Infrastructure Workstation',
  description: 'Containerization and CI/CD workstation with multi-stage Dockerfile editor, GitHub Actions workflow linter, shell terminal, and probe checks.',
  supportedLanguages: ['yaml', 'dockerfile', 'bash', 'json'],
  defaultLanguage: 'yaml',
  features: ['code_execution', 'test_runner', 'terminal'],
  panels: [
    { id: 'file-tree', type: 'file_tree', title: 'Infrastructure & Workflows', position: 'left', defaultWidth: 20, isResizable: true, isCloseable: false },
    { id: 'code-editor', type: 'code_editor', title: 'Dockerfile / CI/CD Editor', position: 'center', defaultWidth: 50, isResizable: true, isCloseable: false },
    { id: 'terminal', type: 'terminal', title: 'Container Build & Test Console', position: 'bottom', defaultHeight: 40, isResizable: true, isCloseable: false },
  ],
};

// 9. Data Analyst
export const dataAnalystWorkspace: WorkspaceConfig = {
  type: 'data_analyst',
  name: 'Data Analytics & BI Workstation',
  description: 'Analytics workspace with dataset explorer, SQL query builder, KPI calculation sheets, and interactive business charts.',
  supportedLanguages: ['sql', 'python', 'json'],
  defaultLanguage: 'sql',
  features: ['database', 'code_execution', 'test_runner'],
  panels: [
    { id: 'dataset-viewer', type: 'dataset_viewer', title: 'Data Warehouse Tables', position: 'left', defaultWidth: 22, isResizable: true, isCloseable: false },
    { id: 'code-editor', type: 'code_editor', title: 'SQL & Transformation Editor', position: 'center', defaultWidth: 48, isResizable: true, isCloseable: false },
    { id: 'chart', type: 'chart', title: 'Interactive Trend Chart', position: 'right', defaultWidth: 30, isResizable: true, isCloseable: false },
    { id: 'console', type: 'console', title: 'KPI & Query Results', position: 'bottom', defaultHeight: 35, isResizable: true, isCloseable: false },
  ],
};

// 10. QA & Test Engineer
export const qaEngineerWorkspace: WorkspaceConfig = {
  type: 'qa_engineer',
  name: 'QA & Test Engineering Workstation',
  description: 'Quality assurance workstation with automated test suite authoring, test case assertion trees, mock runner, and bug reproducers.',
  supportedLanguages: ['typescript', 'javascript', 'json'],
  defaultLanguage: 'typescript',
  features: ['code_execution', 'test_runner', 'terminal'],
  panels: [
    { id: 'file-tree', type: 'file_tree', title: 'Test Suites & Mocks', position: 'left', defaultWidth: 20, isResizable: true, isCloseable: false },
    { id: 'code-editor', type: 'code_editor', title: 'Test Assertion Editor', position: 'center', defaultWidth: 50, isResizable: true, isCloseable: false },
    { id: 'problems', type: 'problems', title: 'Test Matrix & Coverage', position: 'bottom', defaultHeight: 40, isResizable: true, isCloseable: false },
  ],
};

// 11. Civil Engineer
export const civilEngineerWorkspace: WorkspaceConfig = {
  type: 'civil_engineer',
  name: 'Civil Engineering Workstation',
  description: 'Practical civil engineering workstation with drawing viewer, BOQ & quantity estimation sheets, concrete mix calculators, and safety standards.',
  supportedLanguages: ['json', 'markdown'],
  defaultLanguage: 'json',
  features: ['code_execution', 'test_runner'],
  panels: [
    { id: 'cad-viewer', type: 'cad_viewer', title: 'Structural Drawing & Specs', position: 'left', defaultWidth: 30, isResizable: true, isCloseable: false },
    { id: 'code-editor', type: 'code_editor', title: 'Quantity & BOQ Formula Editor', position: 'center', defaultWidth: 40, isResizable: true, isCloseable: false },
    { id: 'calculation-sheet', type: 'calculation_sheet', title: 'Calculations & IS Standards', position: 'right', defaultWidth: 30, isResizable: true, isCloseable: false },
    { id: 'console', type: 'console', title: 'Structural Output & Verification', position: 'bottom', defaultHeight: 30, isResizable: true, isCloseable: false },
  ],
};

// 12. Mechanical Engineer
export const mechanicalEngineerWorkspace: WorkspaceConfig = {
  type: 'mechanical_engineer',
  name: 'Mechanical & Manufacturing Workstation',
  description: 'Mechanical engineering workstation with GD&T tolerance inspector, material property lookup, thermal calculation sheet, and manufacturing planner.',
  supportedLanguages: ['json', 'markdown'],
  defaultLanguage: 'json',
  features: ['code_execution', 'test_runner'],
  panels: [
    { id: 'cad-viewer', type: 'cad_viewer', title: 'Part Drawing & GD&T Callouts', position: 'left', defaultWidth: 30, isResizable: true, isCloseable: false },
    { id: 'code-editor', type: 'code_editor', title: 'Tolerance & Stress Formula Editor', position: 'center', defaultWidth: 40, isResizable: true, isCloseable: false },
    { id: 'calculation-sheet', type: 'calculation_sheet', title: 'Material & Factor of Safety', position: 'right', defaultWidth: 30, isResizable: true, isCloseable: false },
    { id: 'console', type: 'console', title: 'Mechanical Verification Console', position: 'bottom', defaultHeight: 30, isResizable: true, isCloseable: false },
  ],
};

// 13. ECE & Electronics Engineer
export const electronicsEngineerWorkspace: WorkspaceConfig = {
  type: 'electronics_engineer',
  name: 'ECE & Electronics Workstation',
  description: 'Electronics workstation with circuit schematic viewer, digital logic truth tables, sensor timing diagrams, and embedded firmware editor.',
  supportedLanguages: ['c', 'cpp', 'python', 'json'],
  defaultLanguage: 'c',
  features: ['code_execution', 'test_runner', 'terminal'],
  panels: [
    { id: 'cad-viewer', type: 'cad_viewer', title: 'Schematic & Pinout View', position: 'left', defaultWidth: 30, isResizable: true, isCloseable: false },
    { id: 'code-editor', type: 'code_editor', title: 'Embedded C / Firmware Editor', position: 'center', defaultWidth: 40, isResizable: true, isCloseable: false },
    { id: 'chart', type: 'chart', title: 'Logic Waveform & Voltage Probe', position: 'right', defaultWidth: 30, isResizable: true, isCloseable: false },
    { id: 'terminal', type: 'terminal', title: 'Serial Monitor & Test Runner', position: 'bottom', defaultHeight: 30, isResizable: true, isCloseable: false },
  ],
};

// 14. EEE & Electrical Engineer
export const electricalEngineerWorkspace: WorkspaceConfig = {
  type: 'electrical_engineer',
  name: 'Electrical Engineering Workstation',
  description: 'Electrical engineering workstation with single-line diagrams, motor load calculation sheets, transformer efficiency analyzers, and safety protection.',
  supportedLanguages: ['json', 'markdown'],
  defaultLanguage: 'json',
  features: ['code_execution', 'test_runner'],
  panels: [
    { id: 'cad-viewer', type: 'cad_viewer', title: 'Single-Line Diagram (SLD)', position: 'left', defaultWidth: 30, isResizable: true, isCloseable: false },
    { id: 'code-editor', type: 'code_editor', title: 'Power & Load Formula Editor', position: 'center', defaultWidth: 40, isResizable: true, isCloseable: false },
    { id: 'calculation-sheet', type: 'calculation_sheet', title: 'Protection & IEEE Standards', position: 'right', defaultWidth: 30, isResizable: true, isCloseable: false },
    { id: 'console', type: 'console', title: 'Electrical Calculation Output', position: 'bottom', defaultHeight: 30, isResizable: true, isCloseable: false },
  ],
};

// 15. Business & Product Operations (MBA / Product Manager)
export const businessProductWorkspace: WorkspaceConfig = {
  type: 'mba_business',
  name: 'Business & Product Operations Workstation',
  description: 'Strategy workstation with market data sheets, unit economics financial modelers, competitor matrix, and structured PRD/BRD document editors.',
  supportedLanguages: ['markdown', 'json'],
  defaultLanguage: 'markdown',
  features: ['code_execution', 'test_runner'],
  panels: [
    { id: 'dataset-viewer', type: 'dataset_viewer', title: 'Market & Customer Data', position: 'left', defaultWidth: 25, isResizable: true, isCloseable: false },
    { id: 'code-editor', type: 'code_editor', title: 'PRD / Business Case Editor', position: 'center', defaultWidth: 45, isResizable: true, isCloseable: false },
    { id: 'chart', type: 'chart', title: 'Unit Economics & ROI Chart', position: 'right', defaultWidth: 30, isResizable: true, isCloseable: false },
    { id: 'console', type: 'console', title: 'Rubric & Financial Audit', position: 'bottom', defaultHeight: 30, isResizable: true, isCloseable: false },
  ],
};

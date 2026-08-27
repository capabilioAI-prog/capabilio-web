export interface SeedRoleDefinition {
  disciplineSlug: string;
  name: string;
  slug: string;
  level: 'intern' | 'junior' | 'mid' | 'senior' | 'lead' | 'principal';
  description: string;
  iconName: string;
  color: string;
  responsibilities: string[];
  tools: string[];
  software: string[];
  workflows: string[];
  deliverables: string[];
  evaluationMethods: string[];
  portfolioEvidenceTypes: string[];
  skills: Array<{
    name: string;
    slug: string;
    category: 'technical' | 'analytical' | 'communication' | 'leadership' | 'domain' | 'tooling';
    description: string;
    measurementMethod: 'code_execution' | 'test_cases' | 'artifact_review' | 'peer_review' | 'ai_assessment' | 'portfolio_evidence';
    weight: number;
    isCore: boolean;
  }>;
}

export const allRolesData: SeedRoleDefinition[] = [
  // 1. Software Engineer
  {
    disciplineSlug: 'software_engineering',
    name: 'Software Engineer',
    slug: 'software-engineer',
    level: 'mid',
    description: 'Build, maintain, and debug reliable software systems, write unit and integration test suites, and resolve production regressions.',
    iconName: 'Code2',
    color: '#FF5701',
    responsibilities: [
      'Write clean, typed, maintainable TypeScript and Node.js code',
      'Investigate and fix production regressions and silent logical errors',
      'Author automated unit tests and integration test suites',
      'Design modular system components and APIs',
      'Document root-cause analyses in engineering post-mortems'
    ],
    tools: ['Git', 'VS Code', 'Node.js', 'Jest/Vitest', 'TypeScript Compiler'],
    software: ['Next.js', 'PostgreSQL', 'Docker', 'REST APIs'],
    workflows: ['Sprint Planning', 'Code Review', 'CI/CD Pipeline', 'Incident Triage'],
    deliverables: ['Production Patches', 'Unit Test Matrices', 'Post-Mortem Notes'],
    evaluationMethods: ['Deterministic test suites', 'Code quality review', 'Runtime execution'],
    portfolioEvidenceTypes: ['Verified code patches', 'Test coverage reports', 'Engineering memos'],
    skills: [
      { name: 'TypeScript', slug: 'typescript', category: 'technical', description: 'Static typing, generics, interfaces, and strict compiler flags.', measurementMethod: 'code_execution', weight: 90, isCore: true },
      { name: 'React', slug: 'react', category: 'technical', description: 'Component lifecycle, hooks, state machines, and memoization.', measurementMethod: 'code_execution', weight: 85, isCore: true },
      { name: 'Production Debugging', slug: 'debugging', category: 'analytical', description: 'Tracing runtime state errors, boolean regressions, and silent failures.', measurementMethod: 'test_cases', weight: 95, isCore: true },
      { name: 'Unit & Integration Testing', slug: 'testing', category: 'technical', description: 'Writing deterministic test assertions and mocking dependencies.', measurementMethod: 'test_cases', weight: 85, isCore: true },
      { name: 'SQL & Data Modeling', slug: 'sql', category: 'technical', description: 'Writing efficient queries, joins, and data normalization.', measurementMethod: 'code_execution', weight: 75, isCore: false },
      { name: 'REST APIs & Endpoints', slug: 'rest-apis', category: 'technical', description: 'Designing HTTP verbs, status codes, and JSON response contracts.', measurementMethod: 'test_cases', weight: 80, isCore: true },
      { name: 'Git & Version Control', slug: 'git', category: 'tooling', description: 'Branch management, commit hygiene, and conflict resolution.', measurementMethod: 'portfolio_evidence', weight: 70, isCore: false },
      { name: 'Technical Communication', slug: 'tech-communication', category: 'communication', description: 'Documenting engineering root causes and post-mortems.', measurementMethod: 'ai_assessment', weight: 75, isCore: false },
    ]
  },

  // 2. Frontend Developer
  {
    disciplineSlug: 'software_engineering',
    name: 'Frontend Developer',
    slug: 'frontend-developer',
    level: 'junior',
    description: 'Develop responsive, accessible, high-performance web user interfaces using modern React, Tailwind CSS, and component architectures.',
    iconName: 'Layout',
    color: '#2563EB',
    responsibilities: [
      'Implement responsive layouts that adapt across mobile, tablet, and desktop',
      'Build accessible (a11y) UI components matching WCAG 2.1 AA standards',
      'Manage client-side state, form validation, and async data fetching',
      'Optimize Web Vitals (LCP, CLS, INP) and render performance'
    ],
    tools: ['React', 'Tailwind CSS', 'Chrome DevTools', 'Figma', 'Vitest'],
    software: ['Next.js', 'Vite', 'Radix UI', 'CSS Grid & Flexbox'],
    workflows: ['Design Hand-off', 'Component Driven Development', 'Responsive Testing'],
    deliverables: ['UI Component Libraries', 'Responsive Layouts', 'A11y Audits'],
    evaluationMethods: ['DOM state verification', 'Responsive layout assertions', 'A11y tests'],
    portfolioEvidenceTypes: ['Component storybooks', 'Lighthouse audit reports', 'Live UI previews'],
    skills: [
      { name: 'HTML5 & CSS Grid', slug: 'html-css', category: 'technical', description: 'Semantic HTML markup and modern responsive CSS layout systems.', measurementMethod: 'code_execution', weight: 90, isCore: true },
      { name: 'React Component Architecture', slug: 'react-components', category: 'technical', description: 'Composable functional components, custom hooks, and memoization.', measurementMethod: 'test_cases', weight: 95, isCore: true },
      { name: 'Tailwind CSS', slug: 'tailwind-css', category: 'technical', description: 'Utility-first responsive design tokens and dark mode support.', measurementMethod: 'code_execution', weight: 85, isCore: true },
      { name: 'Web Accessibility (a11y)', slug: 'accessibility', category: 'domain', description: 'ARIA attributes, keyboard navigation, focus management, and contrast.', measurementMethod: 'test_cases', weight: 80, isCore: true },
      { name: 'Client State Management', slug: 'client-state', category: 'technical', description: 'Managing local state, context, and asynchronous server caches.', measurementMethod: 'test_cases', weight: 75, isCore: false },
      { name: 'Frontend Testing', slug: 'frontend-testing', category: 'technical', description: 'Testing React components with Testing Library and Vitest.', measurementMethod: 'test_cases', weight: 70, isCore: false },
    ]
  },

  // 3. Backend Developer
  {
    disciplineSlug: 'software_engineering',
    name: 'Backend Developer',
    slug: 'backend-developer',
    level: 'mid',
    description: 'Design and build secure, scalable backend services, RESTful APIs, database layers, and authentication systems.',
    iconName: 'Server',
    color: '#16A34A',
    responsibilities: [
      'Design and implement secure RESTful API endpoints and middleware',
      'Implement authentication, JWT validation, and RBAC authorization',
      'Structure relational database schemas, transactions, and migrations',
      'Apply rate limiting, caching, and request validation protections'
    ],
    tools: ['Node.js', 'PostgreSQL', 'Redis', 'Postman', 'Docker'],
    software: ['Express/Fastify', 'Drizzle ORM / Prisma', 'JWT', 'Zod'],
    workflows: ['API Contract First', 'Database Migrations', 'Security Auditing'],
    deliverables: ['API Endpoints', 'Middleware Layers', 'Database Migrations'],
    evaluationMethods: ['HTTP request validation', 'Database transaction tests', 'Auth assertions'],
    portfolioEvidenceTypes: ['OpenAPI specifications', 'Load test reports', 'API middleware logs'],
    skills: [
      { name: 'Node.js & Runtime APIs', slug: 'nodejs', category: 'technical', description: 'Asynchronous event loops, streams, and server architecture.', measurementMethod: 'code_execution', weight: 90, isCore: true },
      { name: 'REST API & Middleware Architecture', slug: 'backend-rest', category: 'technical', description: 'HTTP routing, interceptors, error handling, and rate limiters.', measurementMethod: 'test_cases', weight: 95, isCore: true },
      { name: 'Authentication & JWT Security', slug: 'auth-security', category: 'technical', description: 'Token validation, password hashing, and session management.', measurementMethod: 'test_cases', weight: 90, isCore: true },
      { name: 'PostgreSQL Database Integration', slug: 'postgres-db', category: 'technical', description: 'Writing queries, schema migrations, and indexing strategies.', measurementMethod: 'code_execution', weight: 85, isCore: true },
      { name: 'Input Validation & Zod', slug: 'input-validation', category: 'technical', description: 'Strict request payload validation and sanitization.', measurementMethod: 'test_cases', weight: 80, isCore: false },
      { name: 'API Error Handling & Logging', slug: 'logging', category: 'domain', description: 'Structured JSON logging, error boundaries, and telemetry.', measurementMethod: 'test_cases', weight: 70, isCore: false },
    ]
  },

  // 4. Full Stack Developer
  {
    disciplineSlug: 'software_engineering',
    name: 'Full Stack Developer',
    slug: 'full-stack-developer',
    level: 'mid',
    description: 'Work across the complete modern stack from interactive frontend user experiences to scalable backend APIs and database persistence.',
    iconName: 'Layers',
    color: '#9333EA',
    responsibilities: [
      'Build end-to-end features integrating frontend React and backend APIs',
      'Design relational schemas and persist validated client data',
      'Implement authentication states across client cookies and server sessions',
      'Author end-to-end integration tests verifying cross-stack workflows'
    ],
    tools: ['Next.js App Router', 'TypeScript', 'PostgreSQL', 'Tailwind', 'Docker'],
    software: ['React', 'Node.js', 'Drizzle ORM', 'Server Actions'],
    workflows: ['Full Stack Feature Delivery', 'End-to-End Testing', 'CI/CD'],
    deliverables: ['Full Stack Feature Modules', 'Database Migrations', 'E2E Suites'],
    evaluationMethods: ['End-to-end test execution', 'API contract validation', 'UI state assertions'],
    portfolioEvidenceTypes: ['Full stack PRs', 'Integration test suites', 'Deployment links'],
    skills: [
      { name: 'Full Stack TypeScript', slug: 'fs-typescript', category: 'technical', description: 'End-to-end type safety between client and server data contracts.', measurementMethod: 'code_execution', weight: 95, isCore: true },
      { name: 'Next.js App Router & Server Actions', slug: 'nextjs-fs', category: 'technical', description: 'Server components, client interactivity, and server actions.', measurementMethod: 'test_cases', weight: 90, isCore: true },
      { name: 'PostgreSQL Data Persistence', slug: 'postgres-fs', category: 'technical', description: 'Relational data modeling, foreign keys, and Drizzle queries.', measurementMethod: 'code_execution', weight: 85, isCore: true },
      { name: 'Full Stack Form Pipelines', slug: 'form-pipelines', category: 'technical', description: 'Client validation, server verification, and error state mapping.', measurementMethod: 'test_cases', weight: 90, isCore: true },
      { name: 'Authentication Integration', slug: 'auth-fs', category: 'technical', description: 'Securing routes, session tokens, and protected server endpoints.', measurementMethod: 'test_cases', weight: 80, isCore: false },
      { name: 'End-to-End Testing', slug: 'e2e-testing', category: 'technical', description: 'Verifying complete user workflows across the frontend and backend.', measurementMethod: 'test_cases', weight: 75, isCore: false },
    ]
  },

  // 5. Database Administrator (DBA)
  {
    disciplineSlug: 'data_science',
    name: 'Database Administrator',
    slug: 'database-administrator',
    level: 'mid',
    description: 'Administer, optimize, and secure high-volume database infrastructure, diagnose slow queries, implement indexes, and ensure high availability.',
    iconName: 'Database',
    color: '#0891B2',
    responsibilities: [
      'Analyze query execution plans (EXPLAIN ANALYZE) and eliminate sequential scans',
      'Design and build composite, partial, and expression B-Tree/GIN indexes',
      'Diagnose table locks, deadlocks, and transaction isolation issues',
      'Configure connection pooling, backups, and point-in-time recovery'
    ],
    tools: ['PostgreSQL', 'pgAdmin / psql', 'PgBouncer', 'EXPLAIN ANALYZE', 'pg_stat_statements'],
    software: ['PostgreSQL 16', 'MySQL', 'Redis', 'WAL Archiving'],
    workflows: ['Query Performance Tuning', 'Index Optimization', 'Zero-Downtime Migration'],
    deliverables: ['Index Optimization Scripts', 'Query Execution Plan Audits', 'Disaster Recovery Runbooks'],
    evaluationMethods: ['Query execution benchmarks', 'Index hit ratio tests', 'Lock diagnosis assertions'],
    portfolioEvidenceTypes: ['EXPLAIN plan comparisons', 'Performance benchmark logs', 'SQL migration scripts'],
    skills: [
      { name: 'SQL Query Optimization', slug: 'query-optimization', category: 'technical', description: 'Eliminating slow table scans and optimizing complex JOINs.', measurementMethod: 'code_execution', weight: 95, isCore: true },
      { name: 'Index Architecture (B-Tree/GIN)', slug: 'indexing-architecture', category: 'technical', description: 'Designing composite, multi-column, and partial indexes.', measurementMethod: 'test_cases', weight: 95, isCore: true },
      { name: 'Execution Plan Analysis (EXPLAIN)', slug: 'explain-analyze', category: 'analytical', description: 'Interpreting cost, actual time, loops, and buffer hits.', measurementMethod: 'test_cases', weight: 90, isCore: true },
      { name: 'Schema Normalization & Constraints', slug: 'schema-design', category: 'technical', description: 'Designing 3NF schemas, foreign keys, and CHECK constraints.', measurementMethod: 'code_execution', weight: 85, isCore: true },
      { name: 'Transaction Concurrency & Locks', slug: 'concurrency-locks', category: 'domain', description: 'Managing row locks, table locks, and MVCC behavior.', measurementMethod: 'test_cases', weight: 80, isCore: false },
      { name: 'Backup & Point-in-Time Recovery', slug: 'backup-recovery', category: 'domain', description: 'WAL streaming, pg_dump, and replication management.', measurementMethod: 'artifact_review', weight: 70, isCore: false },
    ]
  },

  // 6. ML / AI Engineer
  {
    disciplineSlug: 'machine_learning',
    name: 'ML / AI Engineer',
    slug: 'ml-ai-engineer',
    level: 'mid',
    description: 'Design, train, evaluate, and deploy production machine learning models, preprocess complex datasets, and build intelligent AI pipelines.',
    iconName: 'Brain',
    color: '#D97706',
    responsibilities: [
      'Clean, normalize, and preprocess tabular and unstructured datasets',
      'Perform feature engineering, encoding, and missing value imputation',
      'Train supervised/unsupervised models using Scikit-Learn and PyTorch',
      'Evaluate model metrics (Precision, Recall, F1-Score, ROC-AUC) and optimize decision thresholds'
    ],
    tools: ['Python', 'Pandas', 'NumPy', 'Scikit-Learn', 'Jupyter Notebooks'],
    software: ['PyTorch', 'Hugging Face', 'FastAPI', 'MLflow'],
    workflows: ['EDA & Preprocessing', 'Model Training & Hyperparameter Tuning', 'Metric Evaluation'],
    deliverables: ['Trained ML Pipelines', 'Evaluation Confusion Matrices', 'Inference Endpoints'],
    evaluationMethods: ['Metric threshold validation (F1/AUC)', 'Data preprocessing assertions', 'Inference accuracy tests'],
    portfolioEvidenceTypes: ['Model evaluation reports', 'Jupyter notebook artifacts', 'Feature importance charts'],
    skills: [
      { name: 'Python Data Engineering (Pandas/NumPy)', slug: 'python-data', category: 'technical', description: 'Vectorized operations, data cleaning, and feature transformations.', measurementMethod: 'code_execution', weight: 95, isCore: true },
      { name: 'Feature Engineering & Preprocessing', slug: 'feature-engineering', category: 'technical', description: 'One-hot encoding, standard scaling, and outlier handling.', measurementMethod: 'test_cases', weight: 90, isCore: true },
      { name: 'Model Training & Scikit-Learn', slug: 'scikit-learn', category: 'technical', description: 'Training classification and regression estimators.', measurementMethod: 'test_cases', weight: 90, isCore: true },
      { name: 'Evaluation Metrics (F1, Precision, Recall)', slug: 'ml-metrics', category: 'analytical', description: 'Optimizing confusion matrices, F1 scores, and threshold tuning.', measurementMethod: 'test_cases', weight: 95, isCore: true },
      { name: 'Model Inference & Deployment', slug: 'ml-inference', category: 'technical', description: 'Exporting model artifacts and serving predictions via REST APIs.', measurementMethod: 'code_execution', weight: 80, isCore: false },
      { name: 'LLM & RAG Pipelines', slug: 'llm-rag', category: 'technical', description: 'Vector embeddings, chunking strategies, and prompt orchestration.', measurementMethod: 'test_cases', weight: 75, isCore: false },
    ]
  },

  // 7. Cybersecurity Analyst
  {
    disciplineSlug: 'cybersecurity',
    name: 'Cybersecurity Analyst',
    slug: 'cybersecurity-analyst',
    level: 'junior',
    description: 'Monitor, triage, and investigate security alerts in SOC environments, detect Indicators of Compromise (IOCs), and contain threats.',
    iconName: 'Shield',
    color: '#DC2626',
    responsibilities: [
      'Analyze authentication logs, access logs, and SIEM security telemetry',
      'Identify brute-force attacks, credential stuffing, and injection payloads',
      'Correlate IP addresses, user agents, and timestamps to build incident timelines',
      'Draft incident containment recommendations and security post-mortems'
    ],
    tools: ['SIEM (Splunk/Elastic)', 'Wireshark', 'Suricata', 'Linux CLI', 'Log Parsers'],
    software: ['OWASP Top 10', 'MITRE ATT&CK', 'NIST Incident Response Framework'],
    workflows: ['Alert Triage', 'IOC Correlation', 'Threat Containment', 'Incident Documentation'],
    deliverables: ['Incident Investigation Reports', 'Threat Timeline Logs', 'Remediation Runbooks'],
    evaluationMethods: ['IOC extraction accuracy', 'Threat detection test matrix', 'Incident timeline review'],
    portfolioEvidenceTypes: ['Incident post-mortems', 'Log analysis scripts', 'MITRE ATT&CK mapping reports'],
    skills: [
      { name: 'SOC Log Analysis & Triage', slug: 'log-analysis', category: 'analytical', description: 'Parsing auth logs, web server logs, and detecting anomalies.', measurementMethod: 'test_cases', weight: 95, isCore: true },
      { name: 'IOC Detection & Correlation', slug: 'ioc-detection', category: 'analytical', description: 'Identifying malicious IP addresses, hashes, and payload patterns.', measurementMethod: 'test_cases', weight: 90, isCore: true },
      { name: 'Incident Response & Containment', slug: 'incident-response', category: 'domain', description: 'Applying account locking, IP blocking, and session revocation.', measurementMethod: 'test_cases', weight: 85, isCore: true },
      { name: 'OWASP Top 10 & Threat Vectors', slug: 'owasp-top10', category: 'domain', description: 'Identifying SQL injection, XSS, and broken access controls.', measurementMethod: 'test_cases', weight: 85, isCore: true },
      { name: 'Network Protocol Telemetry', slug: 'network-security', category: 'technical', description: 'Analyzing HTTP status codes, user agents, and packet headers.', measurementMethod: 'test_cases', weight: 75, isCore: false },
      { name: 'Security Incident Documentation', slug: 'security-reporting', category: 'communication', description: 'Writing clear security incident memos and mitigation timelines.', measurementMethod: 'ai_assessment', weight: 75, isCore: false },
    ]
  },

  // 8. DevOps Engineer
  {
    disciplineSlug: 'software_engineering',
    name: 'DevOps Engineer',
    slug: 'devops-engineer',
    level: 'mid',
    description: 'Automate build, test, and release pipelines, containerize applications with Docker, manage cloud infrastructure, and monitor uptime.',
    iconName: 'Terminal',
    color: '#059669',
    responsibilities: [
      'Author and debug multi-stage Dockerfiles for optimized container images',
      'Construct CI/CD automation pipelines using GitHub Actions and test matrices',
      'Diagnose deployment failures, environment variable drift, and port bindings',
      'Implement health check probes, container logging, and infrastructure monitoring'
    ],
    tools: ['Docker', 'GitHub Actions', 'Linux Shell', 'Kubernetes', 'Terraform'],
    software: ['Alpine Linux', 'Nginx', 'Prometheus', 'Grafana'],
    workflows: ['Automated Build & Test Matrix', 'Containerization', 'Continuous Deployment'],
    deliverables: ['Optimized Dockerfiles', 'GitHub Actions Workflows', 'Deployment Runbooks'],
    evaluationMethods: ['Container build assertions', 'CI/CD YAML linting', 'Pipeline execution tests'],
    portfolioEvidenceTypes: ['Dockerfile build benchmarks', 'GitHub Actions workflow runs', 'CI/CD pipeline logs'],
    skills: [
      { name: 'Docker & Containerization', slug: 'docker-containers', category: 'technical', description: 'Writing multi-stage Dockerfiles and optimizing image layers.', measurementMethod: 'code_execution', weight: 95, isCore: true },
      { name: 'CI/CD Pipelines (GitHub Actions)', slug: 'cicd-pipelines', category: 'technical', description: 'Authoring workflow YAML, test jobs, and deployment triggers.', measurementMethod: 'test_cases', weight: 90, isCore: true },
      { name: 'Linux Shell & System Administration', slug: 'linux-shell', category: 'technical', description: 'Bash scripting, file permissions, and environment management.', measurementMethod: 'code_execution', weight: 85, isCore: true },
      { name: 'Deployment Troubleshooting', slug: 'deploy-troubleshooting', category: 'analytical', description: 'Diagnosing build failures, missing env vars, and crash loops.', measurementMethod: 'test_cases', weight: 90, isCore: true },
      { name: 'Infrastructure as Code & Config', slug: 'iac-config', category: 'technical', description: 'Declarative configuration management and container specs.', measurementMethod: 'test_cases', weight: 75, isCore: false },
      { name: 'Observability & Health Probes', slug: 'observability', category: 'domain', description: 'Configuring liveness probes, structured logs, and metrics.', measurementMethod: 'test_cases', weight: 70, isCore: false },
    ]
  },

  // 9. Data Analyst
  {
    disciplineSlug: 'data_science',
    name: 'Data Analyst',
    slug: 'data-analyst',
    level: 'junior',
    description: 'Transform raw data into business intelligence using SQL, statistical aggregations, KPI dashboards, and data visualization.',
    iconName: 'BarChart3',
    color: '#0284C7',
    responsibilities: [
      'Write SQL queries with multi-table JOINs, GROUP BY aggregations, and window functions',
      'Calculate key business metrics including CAC, LTV, churn rate, and cohort retention',
      'Identify data anomalies, missing values, and data cleansing requirements',
      'Present findings in structured analytical memos and executive dashboards'
    ],
    tools: ['SQL', 'PostgreSQL', 'Excel / Sheets', 'Tableau / PowerBI', 'Python Pandas'],
    software: ['Metabase', 'dbt', 'BigQuery', 'PostgreSQL 16'],
    workflows: ['Ad-Hoc Querying', 'Cohort Analysis', 'Dashboard Maintenance', 'Data Validation'],
    deliverables: ['SQL Analysis Queries', 'KPI Summary Reports', 'Cohort Retention Matrices'],
    evaluationMethods: ['Query output accuracy', 'Aggregation correctness', 'Analytical reasoning'],
    portfolioEvidenceTypes: ['SQL analysis scripts', 'Executive summary memos', 'Data visualization reports'],
    skills: [
      { name: 'SQL Querying & Aggregations', slug: 'sql-aggregations', category: 'technical', description: 'Multi-table JOINs, GROUP BY, HAVING, and window functions.', measurementMethod: 'code_execution', weight: 95, isCore: true },
      { name: 'Business KPI Calculation', slug: 'kpi-calculation', category: 'analytical', description: 'Computing churn, retention, ARPU, and revenue cohorts.', measurementMethod: 'test_cases', weight: 90, isCore: true },
      { name: 'Data Cleansing & Validation', slug: 'data-cleaning', category: 'technical', description: 'Handling nulls, type conversions, and deduplication.', measurementMethod: 'code_execution', weight: 85, isCore: true },
      { name: 'Data Storytelling & Reporting', slug: 'data-storytelling', category: 'communication', description: 'Translating data insights into actionable business decisions.', measurementMethod: 'ai_assessment', weight: 80, isCore: false },
    ]
  },

  // 10. QA & Test Engineer
  {
    disciplineSlug: 'software_engineering',
    name: 'QA / Test Engineer',
    slug: 'qa-engineer',
    level: 'junior',
    description: 'Ensure software reliability through automated test matrices, boundary value analysis, regression suites, and bug reproducers.',
    iconName: 'CheckSquare',
    color: '#10B981',
    responsibilities: [
      'Write deterministic unit and integration test assertions with Jest / Vitest',
      'Perform boundary value analysis and identify unhandled edge cases',
      'Author detailed reproducible bug reports with stack traces and payloads',
      'Validate API responses against OpenAPI contracts and schema definitions'
    ],
    tools: ['Vitest / Jest', 'Postman', 'Playwright', 'Chrome DevTools', 'Git'],
    software: ['TypeScript', 'Node.js', 'REST APIs', 'JSON Schema'],
    workflows: ['Test Case Design', 'Bug Triage & Reproduction', 'Regression Verification'],
    deliverables: ['Automated Test Suites', 'Bug Triage Reports', 'Edge Case Matrices'],
    evaluationMethods: ['Assertion coverage', 'Edge-case detection', 'Bug reproduction accuracy'],
    portfolioEvidenceTypes: ['Automated test files', 'Bug reproduction logs', 'Test coverage reports'],
    skills: [
      { name: 'Automated Test Authoring', slug: 'test-authoring', category: 'technical', description: 'Writing unit and integration test assertions with Vitest.', measurementMethod: 'code_execution', weight: 95, isCore: true },
      { name: 'Boundary Value & Edge Case Analysis', slug: 'edge-case-analysis', category: 'analytical', description: 'Testing nulls, empty arrays, extremes, and type coercion.', measurementMethod: 'test_cases', weight: 90, isCore: true },
      { name: 'Bug Investigation & Reproduction', slug: 'bug-reproduction', category: 'analytical', description: 'Isolating root causes and creating minimal reproducible examples.', measurementMethod: 'test_cases', weight: 85, isCore: true },
      { name: 'API Contract Testing', slug: 'contract-testing', category: 'technical', description: 'Asserting JSON schemas, status codes, and headers.', measurementMethod: 'test_cases', weight: 80, isCore: false },
    ]
  },

  // 11. Civil Engineer
  {
    disciplineSlug: 'civil_engineering',
    name: 'Civil Engineer',
    slug: 'civil-engineer',
    level: 'junior',
    description: 'Perform structural calculations, quantity estimation (BOQ), concrete mix design, structural drawing interpretation, and site safety audits.',
    iconName: 'Building',
    color: '#E11D48',
    responsibilities: [
      'Calculate concrete, steel reinforcement, and masonry quantities from architectural drawings',
      'Prepare Bill of Quantities (BOQ) with material cost estimation formulas',
      'Perform concrete mix design calculations (M20, M25, M30) as per IS/ACI standards',
      'Interpret structural detailing drawings and verify cover and spacing tolerances'
    ],
    tools: ['AutoCAD Viewer', 'Excel / Sheets', 'IS 456 / ACI Standards', 'BOQ Calculator'],
    software: ['Structural Detailing Sheets', 'Concrete Mix Designer', 'Survey Tools'],
    workflows: ['Quantity Takeoff', 'Mix Proportioning', 'Site Inspection', 'BOQ Preparation'],
    deliverables: ['Quantity Takeoff Sheets', 'Concrete Mix Reports', 'BOQ Estimation Documents'],
    evaluationMethods: ['Quantity calculation accuracy', 'Formula correctness', 'Standards compliance'],
    portfolioEvidenceTypes: ['BOQ estimation files', 'Structural calculation reports', 'Site inspection notes'],
    skills: [
      { name: 'Quantity Estimation & BOQ', slug: 'civil-boq', category: 'technical', description: 'Calculating concrete volume, shuttering area, and rebar tonnage.', measurementMethod: 'code_execution', weight: 95, isCore: true },
      { name: 'Concrete Mix Design', slug: 'concrete-mix', category: 'technical', description: 'Water-cement ratio, aggregate proportions as per IS 10262 / ACI.', measurementMethod: 'test_cases', weight: 90, isCore: true },
      { name: 'Structural Drawing Interpretation', slug: 'drawing-interpretation', category: 'analytical', description: 'Reading rebar detailing, beam cross-sections, and column schedules.', measurementMethod: 'test_cases', weight: 85, isCore: true },
      { name: 'Building Standards & Safety', slug: 'civil-standards', category: 'domain', description: 'Applying IS 456, ACI 318, and OSHA site safety codes.', measurementMethod: 'artifact_review', weight: 80, isCore: false },
    ]
  },

  // 12. Mechanical Engineer
  {
    disciplineSlug: 'mechanical_engineering',
    name: 'Mechanical Engineer',
    slug: 'mechanical-engineer',
    level: 'junior',
    description: 'Interpret engineering drawings, calculate GD&T tolerances, perform stress/thermal calculations, and select materials for manufacturing.',
    iconName: 'Wrench',
    color: '#EA580C',
    responsibilities: [
      'Calculate tolerance stack-ups and fits (H7/g6, clearance, transition, interference)',
      'Interpret Geometric Dimensioning and Tolerancing (GD&T) datum frames and symbols',
      'Calculate bending stresses, factor of safety, and torque requirements',
      'Select engineering materials (AISI 1045, 6061-T6, POM) based on mechanical properties'
    ],
    tools: ['CAD Drawing Viewer', 'GD&T Calculator', 'Material Property Database', 'ISO/ASME Standards'],
    software: ['SolidWorks Drawings', 'Tolerance Analyzer', 'Engineering Formula Sheet'],
    workflows: ['Tolerance Stack Analysis', 'Material Selection', 'Design for Manufacturing (DFM)'],
    deliverables: ['Tolerance Stack Calculations', 'Material Selection Reports', 'DFM Checklists'],
    evaluationMethods: ['Tolerance limit calculation accuracy', 'Stress formula verification', 'Material selection reasoning'],
    portfolioEvidenceTypes: ['GD&T analysis sheets', 'Stress calculation notes', 'Manufacturing process sheets'],
    skills: [
      { name: 'GD&T & Tolerance Stack-Up', slug: 'gdt-tolerances', category: 'technical', description: 'Limits, fits, feature control frames, and datum references.', measurementMethod: 'code_execution', weight: 95, isCore: true },
      { name: 'Stress & Factor of Safety Calculation', slug: 'stress-calculations', category: 'technical', description: 'Von Mises stress, bending moments, and safety margins.', measurementMethod: 'test_cases', weight: 90, isCore: true },
      { name: 'Material Selection & Properties', slug: 'material-selection', category: 'analytical', description: 'Yield strength, hardness, thermal expansion, and machinability.', measurementMethod: 'test_cases', weight: 85, isCore: true },
      { name: 'Manufacturing Process Selection', slug: 'manufacturing-processes', category: 'domain', description: 'CNC milling, turning, sheet metal, and injection molding rules.', measurementMethod: 'artifact_review', weight: 80, isCore: false },
    ]
  },

  // 13. ECE / Electronics Engineer
  {
    disciplineSlug: 'electronics_engineering',
    name: 'ECE / Electronics Engineer',
    slug: 'electronics-engineer',
    level: 'junior',
    description: 'Design and analyze analog/digital circuits, verify microcontroller interfaces, debug firmware in C, and measure sensor timing signals.',
    iconName: 'Cpu',
    color: '#8B5CF6',
    responsibilities: [
      'Perform Ohm’s law, Kirchhoff’s laws, and voltage divider calculations',
      'Design digital logic truth tables, Karnaugh maps, and timing diagrams',
      'Write and debug embedded C firmware for GPIO, ADC, PWM, and UART communication',
      'Calculate resistor values for pull-ups, LED current limiting, and RC filter cutoffs'
    ],
    tools: ['Circuit Schematic Viewer', 'Embedded C Compiler', 'Logic Waveform Analyzer', 'Ohm Calculator'],
    software: ['KiCad / Eagle Viewer', 'Serial Monitor', 'Microcontroller Specs (ATmega/STM32)'],
    workflows: ['Circuit Calculation', 'Embedded Firmware Debugging', 'Sensor Protocol Verification'],
    deliverables: ['Circuit Calculation Sheets', 'Embedded C Firmware Patches', 'Logic Truth Tables'],
    evaluationMethods: ['Circuit math accuracy', 'Embedded C execution tests', 'Protocol timing assertions'],
    portfolioEvidenceTypes: ['Embedded C code files', 'Circuit analysis sheets', 'Sensor interface logs'],
    skills: [
      { name: 'Analog Circuit Calculations', slug: 'analog-circuits', category: 'technical', description: 'Voltage dividers, RC filter cutoff frequencies, and power dissipation.', measurementMethod: 'code_execution', weight: 95, isCore: true },
      { name: 'Digital Logic & Truth Tables', slug: 'digital-logic', category: 'technical', description: 'Boolean algebra, logic gate arrays, and timing state diagrams.', measurementMethod: 'test_cases', weight: 90, isCore: true },
      { name: 'Embedded C & Microcontroller APIs', slug: 'embedded-c', category: 'technical', description: 'GPIO bitwise masking, ADC conversions, and timer interrupts.', measurementMethod: 'code_execution', weight: 90, isCore: true },
      { name: 'Serial Communication Protocols', slug: 'serial-protocols', category: 'technical', description: 'UART baud rates, I2C addressing, and SPI clock polarity.', measurementMethod: 'test_cases', weight: 80, isCore: false },
    ]
  },

  // 14. EEE / Electrical Engineer
  {
    disciplineSlug: 'electronics_engineering',
    name: 'EEE / Electrical Engineer',
    slug: 'electrical-engineer',
    level: 'junior',
    description: 'Calculate AC/DC power requirements, transformer efficiency, motor full-load currents, and electrical protection breaker sizing.',
    iconName: 'Zap',
    color: '#F59E0B',
    responsibilities: [
      'Calculate 3-phase real power (kW), reactive power (kVAR), and apparent power (kVA)',
      'Size circuit breakers, fuses, and cable cross-sections as per NEC / IEEE standards',
      'Calculate transformer turns ratio, copper/iron losses, and voltage regulation',
      'Compute motor full-load amps, starting torque, and power factor correction capacitors'
    ],
    tools: ['Single-Line Diagram Viewer', 'Power Triangle Calculator', 'NEC Cable Table', 'Motor Sizing Sheet'],
    software: ['Electrical Load Analyzer', 'Transformer Loss Calculator', 'IEEE Protection Codes'],
    workflows: ['Load Schedule Calculation', 'Cable & Breaker Sizing', 'Power Factor Correction'],
    deliverables: ['Electrical Load Schedules', 'Breaker Sizing Calculations', 'Transformer Efficiency Reports'],
    evaluationMethods: ['Power equation accuracy', 'Code compliance checks', 'Protection sizing formulas'],
    portfolioEvidenceTypes: ['Load schedule calculations', 'Cable sizing calculations', 'Single-line diagram markups'],
    skills: [
      { name: '3-Phase Power Calculations', slug: 'three-phase-power', category: 'technical', description: 'Real, reactive, apparent power, and power factor correction.', measurementMethod: 'code_execution', weight: 95, isCore: true },
      { name: 'Cable & Circuit Breaker Sizing', slug: 'breaker-sizing', category: 'technical', description: 'Ampacity derating, voltage drop, and short circuit ratings.', measurementMethod: 'test_cases', weight: 90, isCore: true },
      { name: 'Transformer & Motor Analysis', slug: 'transformer-motor', category: 'technical', description: 'Efficiency, losses, starting currents, and slip calculation.', measurementMethod: 'code_execution', weight: 85, isCore: true },
      { name: 'Electrical Safety & NEC Codes', slug: 'electrical-safety', category: 'domain', description: 'Earthing/grounding, fault clearance, and insulation classes.', measurementMethod: 'artifact_review', weight: 80, isCore: false },
    ]
  },

  // 15. Product Manager & Business Operations (MBA)
  {
    disciplineSlug: 'mba',
    name: 'Product Manager',
    slug: 'product-manager',
    level: 'junior',
    description: 'Define product requirements (PRD), calculate unit economics (CAC/LTV), prioritize feature roadmaps with RICE scoring, and analyze user retention.',
    iconName: 'Lightbulb',
    color: '#6366F1',
    responsibilities: [
      'Author structured Product Requirement Documents (PRDs) with user stories and acceptance criteria',
      'Prioritize product backlog features using the RICE framework (Reach, Impact, Confidence, Effort)',
      'Calculate SaaS unit economics including Gross Margin, Payback Period, and LTV:CAC ratios',
      'Synthesize user feedback and telemetry into actionable product sprint tickets'
    ],
    tools: ['PRD Document Editor', 'RICE Scoring Sheet', 'Unit Economics Modeler', 'Figma Viewer'],
    software: ['Jira / Linear', 'Mixpanel / PostHog', 'Spreadsheets', 'Notion'],
    workflows: ['Feature Scoping', 'RICE Prioritization', 'Unit Economics Modeling', 'Sprint Kickoff'],
    deliverables: ['Product Requirement Documents', 'RICE Priority Scorecards', 'Unit Economics Analyses'],
    evaluationMethods: ['PRD completeness rubric', 'Unit economic math accuracy', 'Prioritization logic'],
    portfolioEvidenceTypes: ['Product requirement specs', 'Business case models', 'Feature launch memos'],
    skills: [
      { name: 'PRD & User Story Authoring', slug: 'prd-authoring', category: 'technical', description: 'Writing clear user stories, functional specs, and acceptance criteria.', measurementMethod: 'artifact_review', weight: 95, isCore: true },
      { name: 'RICE Feature Prioritization', slug: 'rice-prioritization', category: 'analytical', description: 'Scoring features by Reach, Impact, Confidence, and Effort.', measurementMethod: 'test_cases', weight: 90, isCore: true },
      { name: 'Unit Economics & SaaS Metrics', slug: 'unit-economics', category: 'analytical', description: 'Calculating CAC, LTV, Gross Margin, and Net Retention.', measurementMethod: 'code_execution', weight: 90, isCore: true },
      { name: 'Competitor & Market Analysis', slug: 'market-analysis', category: 'domain', description: 'Structuring competitive matrices and feature gap analyses.', measurementMethod: 'artifact_review', weight: 80, isCore: false },
    ]
  }
];

import { Discipline } from '@capabilio/types';

export interface ScenarioFamilyConfig {
  id: string;
  name: string;
  category: string;
  description: string;
  typicalObjectives: string[];
  skillsTested: string[];
  sampleBusinessContext: string;
}

export interface ArenaRoleDefinition {
  id: string;
  slug: string;
  title: string;
  discipline: Discipline;
  workstationType: 'analytics_workstation' | 'database_operations_workstation';
  environmentName: string;
  skills: Array<{ name: string; slug: string; weight: number; isCore: boolean }>;
  tools: string[];
  scenarioFamilies: ScenarioFamilyConfig[];
  difficultyLevels: Array<{
    level: 'entry' | 'junior' | 'mid' | 'senior';
    label: string;
    eloRange: [number, number];
    complexityDescription: string;
  }>;
}

export const ARENA_ROLE_REGISTRY: Record<string, ArenaRoleDefinition> = {
  data_analyst: {
    id: 'data_analyst',
    slug: 'data-analyst',
    title: 'Data Analyst',
    discipline: 'data_science',
    workstationType: 'analytics_workstation',
    environmentName: 'Capabilio Analytics Workstation',
    skills: [
      { name: 'SQL', slug: 'sql', weight: 85, isCore: true },
      { name: 'Data Cleaning', slug: 'data-cleaning', weight: 80, isCore: true },
      { name: 'Python / Pandas', slug: 'python-pandas', weight: 75, isCore: true },
      { name: 'Statistics', slug: 'statistics', weight: 70, isCore: false },
      { name: 'Data Visualization', slug: 'data-visualization', weight: 80, isCore: true },
      { name: 'Business Analysis', slug: 'business-analysis', weight: 85, isCore: true },
    ],
    tools: [
      'SQL Editor',
      'Dataset Explorer',
      'CSV Preview',
      'Python / Pandas',
      'Query Results',
      'Data Profiling',
      'Charts / Visualization',
      'Business Metrics',
      'Submission Panel',
      'AI Senior Data Mentor',
    ],
    difficultyLevels: [
      { level: 'entry', label: 'Entry-Level / Fresher', eloRange: [400, 440], complexityDescription: 'Single-table queries, basic joins, group by, data filtering, and high-level metric summaries.' },
      { level: 'junior', label: 'Junior Analyst', eloRange: [440, 480], complexityDescription: 'Multi-table joins, subqueries, null handling, cohort partitioning, and structured recommendations.' },
      { level: 'mid', label: 'Mid-Level Analyst', eloRange: [480, 540], complexityDescription: 'Window functions, funnel attribution, statistical significance, and metric anomaly decomposition.' },
      { level: 'senior', label: 'Senior Lead Analyst', eloRange: [540, 650], complexityDescription: 'Complex multi-step ETL pipelines, predictive segmentation, and executive trade-off modeling.' },
    ],
    scenarioFamilies: [
      {
        id: 'customer_churn',
        name: 'Customer Churn Investigation',
        category: 'Retention & Growth',
        description: 'Diagnose sudden customer attrition, isolate affected customer cohorts, and evaluate renewal trends.',
        typicalObjectives: [
          'Inspect transaction and user activity logs',
          'Identify missing data or billing status anomalies',
          'Calculate cohort retention rates across plan tiers',
          'Isolate primary churn drivers and present executive recommendations',
        ],
        skillsTested: ['SQL', 'Data Cleaning', 'Business Analysis', 'Data Visualization'],
        sampleBusinessContext: 'RetailPulse observed an unexpected 18% churn increase in Q3 following a pricing transition. Leadership needs to determine if attrition is isolated to specific tenure cohorts or plan tiers.',
      },
      {
        id: 'sales_performance',
        name: 'Sales Performance Analysis',
        category: 'Revenue Operations',
        description: 'Analyze quarterly sales rep performance, discount anomalies, and pipeline velocity across regions.',
        typicalObjectives: [
          'Aggregate quarterly revenue by sales region and product category',
          'Analyze discount variance impact on gross margins',
          'Identify top and underperforming sales territories',
          'Deliver an executive summary with recommended discount thresholds',
        ],
        skillsTested: ['SQL', 'Business Analysis', 'Statistics', 'Data Visualization'],
        sampleBusinessContext: 'GlobalMart recorded flat regional revenue despite a 25% increase in marketing spend. Investigate discount overuse and conversion lag.',
      },
      {
        id: 'marketing_campaign',
        name: 'Marketing Campaign ROI & Attribution',
        category: 'Growth & Acquisition',
        description: 'Calculate customer acquisition cost (CAC), return on ad spend (ROAS), and multi-touch channel attribution.',
        typicalObjectives: [
          'Join marketing spend tables with conversion event logs',
          'Calculate CAC and ROAS across paid search, social, and referral channels',
          'Identify low-performing ad sets with high cost-per-acquisition',
          'Propose budget reallocation based on empirical efficiency curves',
        ],
        skillsTested: ['SQL', 'Python / Pandas', 'Business Analysis', 'Data Visualization'],
        sampleBusinessContext: 'A fintech scaleup spent $140,000 on digital acquisition in July. The CMO requires channel-by-channel payback analysis to allocate next quarter’s growth budget.',
      },
      {
        id: 'conversion_funnel',
        name: 'Conversion Funnel Analysis',
        category: 'Product Analytics',
        description: 'Trace step-by-step user onboarding dropoffs from signup to activation and paid conversion.',
        typicalObjectives: [
          'Map event sequence across 5 key onboarding milestones',
          'Compute step-by-step dropoff percentages',
          'Segment funnel efficiency by device type and geography',
          'Identify the highest-leverage UX friction point',
        ],
        skillsTested: ['SQL', 'Data Cleaning', 'Business Analysis'],
        sampleBusinessContext: 'SaaSFlow noticed a 42% dropoff between user registration and workspace creation. Isolate whether authentication timeout or form validation is the culprit.',
      },
    ],
  },

  database_administrator: {
    id: 'database_administrator',
    slug: 'database-administrator',
    title: 'Database Administrator',
    discipline: 'devops',
    workstationType: 'database_operations_workstation',
    environmentName: 'Capabilio Database Operations Workstation',
    skills: [
      { name: 'SQL', slug: 'sql', weight: 80, isCore: true },
      { name: 'Database Design', slug: 'database-design', weight: 75, isCore: true },
      { name: 'Query Optimization', slug: 'query-optimization', weight: 90, isCore: true },
      { name: 'Indexing', slug: 'indexing', weight: 85, isCore: true },
      { name: 'Performance Tuning', slug: 'performance-tuning', weight: 85, isCore: true },
      { name: 'Backup & Recovery', slug: 'backup-recovery', weight: 70, isCore: false },
      { name: 'Security / Permissions', slug: 'security-permissions', weight: 65, isCore: false },
      { name: 'Troubleshooting', slug: 'troubleshooting', weight: 85, isCore: true },
    ],
    tools: [
      'SQL Console',
      'Schema Explorer',
      'Table Inspector',
      'Query Analyzer',
      'Index Inspector',
      'Database Logs',
      'Performance Metrics',
      'Execution Plan (EXPLAIN ANALYZE)',
      'Transaction / Lock Manager',
      'Backup & Recovery Simulator',
      'AI Senior DBA Mentor',
      'Submission Panel',
    ],
    difficultyLevels: [
      { level: 'entry', label: 'Entry-Level / Fresher DBA', eloRange: [400, 440], complexityDescription: 'Sequential scan diagnosis, simple B-Tree index creation, table column inspection, and query latency measurement.' },
      { level: 'junior', label: 'Junior DBA', eloRange: [440, 480], complexityDescription: 'Composite indexing, non-blocking CONCURRENT index creation, table vacuuming, and EXPLAIN ANALYZE buffer inspection.' },
      { level: 'mid', label: 'Mid-Level DBA', eloRange: [480, 540], complexityDescription: 'Lock contention diagnosis, dead tuple bloat remediation, connection pool tuning, and partial indexes.' },
      { level: 'senior', label: 'Senior Lead DBA', eloRange: [540, 650], complexityDescription: 'Replication lag troubleshooting, failover orchestration, WAL point-in-time recovery, and partition management.' },
    ],
    scenarioFamilies: [
      {
        id: 'slow_query',
        name: 'Slow Query & Sequential Scan Investigation',
        category: 'Performance',
        description: 'Diagnose high-latency queries scanning millions of unindexed rows and causing database CPU spikes.',
        typicalObjectives: [
          'Run EXPLAIN (ANALYZE, BUFFERS) on the degraded production query',
          'Identify sequential scans and high buffer hit costs',
          'Formulate and test a targeted B-Tree or composite index',
          'Verify execution latency drops below 200ms without blocking table locks',
        ],
        skillsTested: ['SQL', 'Query Optimization', 'Indexing', 'Troubleshooting'],
        sampleBusinessContext: 'Production checkout query latency jumped from 450ms to 12.4s during peak traffic, pegging Postgres CPU at 94%. Diagnose and fix without causing table lock downtime.',
      },
      {
        id: 'index_optimization',
        name: 'Index Optimization & Table Bloat Remediation',
        category: 'Storage & Efficiency',
        description: 'Audit redundant or unused indexes, recover table bloat, and build targeted partial indexes.',
        typicalObjectives: [
          'Inspect index usage statistics (`pg_stat_user_indexes`)',
          'Identify duplicate and unused indexes consuming disk I/O',
          'Implement targeted partial index with WHERE filter',
          'Execute vacuum analysis to reclaim dead tuple storage',
        ],
        skillsTested: ['Indexing', 'Database Design', 'Performance Tuning'],
        sampleBusinessContext: 'The events table reached 45GB with 8 overlapping indexes slowing write throughput. Reclaim disk space and optimize query paths.',
      },
      {
        id: 'deadlock_investigation',
        name: 'Deadlock & Transaction Lock Contention',
        category: 'Concurrency',
        description: 'Triage transaction lock timeouts and circular wait deadlocks across concurrent worker processes.',
        typicalObjectives: [
          'Examine lock contention logs and blocking PID trees',
          'Identify conflicting row-level UPDATE lock orders',
          'Restructure transaction order to enforce deterministic row locking',
          'Verify zero deadlock exceptions under concurrent test load',
        ],
        skillsTested: ['Troubleshooting', 'Database Design', 'SQL'],
        sampleBusinessContext: 'Order processing microservices are throwing `deadlock detected (SQLSTATE 40P01)` under 50 req/sec bursts. Isolate the conflicting row lock sequences.',
      },
      {
        id: 'backup_verification',
        name: 'Backup Verification & Point-in-Time Recovery',
        category: 'Disaster Recovery',
        description: 'Simulate point-in-time recovery (PITR) from WAL archives after accidental table truncation.',
        typicalObjectives: [
          'Inspect WAL archive timeline and LSN checkpoints',
          'Configure recovery target time right before the dropped table timestamp',
          'Verify data integrity and restore consistency',
        ],
        skillsTested: ['Backup & Recovery', 'Troubleshooting', 'Security / Permissions'],
        sampleBusinessContext: 'A bad deployment script dropped the `merchant_configs` table at 14:02:11 UTC. Restore the database state to 14:02:00 UTC with zero record loss.',
      },
    ],
  },
};

export function getArenaRoleConfig(roleSlugOrId: string): ArenaRoleDefinition | null {
  const normalized = roleSlugOrId.toLowerCase().replace(/[-\s]/g, '_');
  if (normalized === 'data_analyst' || normalized === 'data-analyst') {
    return ARENA_ROLE_REGISTRY.data_analyst || null;
  }
  if (normalized === 'database_administrator' || normalized === 'database-administrator' || normalized === 'dba') {
    return ARENA_ROLE_REGISTRY.database_administrator || null;
  }
  return null;
}

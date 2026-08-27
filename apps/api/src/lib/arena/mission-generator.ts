import crypto from 'crypto';
import { ARENA_ROLE_REGISTRY, ArenaRoleDefinition } from './role-registry';

export interface GeneratedMissionData {
  id: string;
  fingerprint: string;
  roleId: string;
  roleSlug: string;
  roleTitle: string;
  difficulty: 'entry' | 'junior' | 'mid' | 'senior';
  title: string;
  scenarioFamily: string;
  estimatedMinutes: number;
  company: {
    name: string;
    industry: string;
    size: string;
    description: string;
  };
  manager: {
    name: string;
    title: string;
    department: string;
  };
  sprint: string;
  businessContext: string;
  problemStatement: string;
  objectives: string[];
  acceptanceCriteria: string[];
  evaluationCriteria: Array<{
    id: string;
    name: string;
    description: string;
    weight: number;
    evaluationType: 'deterministic' | 'ai_assisted' | 'artifact';
  }>;
  availableTools: string[];
  skills: Array<{ name: string; slug: string; weight: number }>;
  datasets: Array<{
    tableName: string;
    rowCount: number;
    columns: Array<{ name: string; type: string; description: string; isPrimaryKey?: boolean; isForeignKey?: boolean }>;
    previewRows: Array<Record<string, any>>;
  }>;
  starterFiles: Record<string, string>;
  expectedOutputCriteria: {
    targetQueryPatterns: string[];
    requiredColumns: string[];
    minRowsExpected?: number;
    expectedMetricValues?: Record<string, number | string>;
    requiredIndexes?: string[];
  };
  tutorHints: Array<{
    level: 1 | 2 | 3 | 4 | 5;
    label: string;
    text: string;
  }>;
}

export interface UserMissionHistoryItem {
  id: string;
  fingerprint: string;
  scenarioFamily: string;
  title: string;
  status: string;
  score?: number;
  eloDelta?: number;
  passed?: boolean;
}

/**
 * Computes semantic SHA-256 fingerprint for duplicate detection
 */
export function computeMissionFingerprint(
  roleSlug: string,
  scenarioFamily: string,
  normalizedTitle: string,
  datasetHash: string,
  objectiveHash: string
): string {
  const payload = `${roleSlug.toLowerCase()}|${scenarioFamily.toLowerCase()}|${normalizedTitle.trim().toLowerCase()}|${datasetHash}|${objectiveHash}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Data Analyst scenario templates generator with variations
 */
function buildDataAnalystScenario(
  variantIndex: number,
  targetSkill: string,
  difficulty: 'entry' | 'junior' | 'mid' | 'senior'
): GeneratedMissionData {
  const VARIANTS = [
    {
      family: 'customer_churn',
      company: { name: 'RetailPulse', industry: 'E-Commerce & Omnichannel Retail', size: 'Scaleup (250 employees)', description: 'RetailPulse provides omnichannel order management and member loyalty programs.' },
      manager: { name: 'Priya Sharma', title: 'VP of Product Analytics', department: 'Growth & Business Intelligence' },
      sprint: 'Sprint 24 — Retention Analytics',
      title: 'Diagnose 18% Customer Churn Spike via Cohort Retention Matrix',
      businessContext: 'RetailPulse observed an unexpected 18% drop in active customer retention during Q3 following an updated subscription pricing rollout. The executive team needs a granular breakdown of which tenure cohorts and plan tiers were most impacted.',
      problemStatement: 'Inspect the customer activity warehouse, identify any data quality anomalies, calculate weekly cohort retention rates, and isolate the root cause driving churn.',
      objectives: [
        'Inspect the `users` and `orders` tables for data anomalies (e.g. null billing tiers or negative order values).',
        'Write an SQL query to calculate weekly cohort retention rates grouped by `signup_week` and `plan_tier`.',
        'Compare Week 1 vs Week 4 retention dropoffs across Free, Pro, and Enterprise tiers.',
        'Deliver a structured analysis recommending targeted onboarding remediation.',
      ],
      acceptanceCriteria: [
        'Query groups by signup cohort week using `DATE_TRUNC` or date formatting.',
        'Calculates active retention percentage accurately without duplicate customer counting.',
        'Identifies that Pro Tier experienced a 46% cliff at Week 3 due to onboarding friction.',
        'Explains actionable business trade-offs in the final recommendation.',
      ],
      datasets: [
        {
          tableName: 'users',
          rowCount: 500,
          columns: [
            { name: 'user_id', type: 'VARCHAR(36)', description: 'Unique user identifier', isPrimaryKey: true },
            { name: 'email', type: 'VARCHAR(255)', description: 'User contact email' },
            { name: 'plan_tier', type: 'VARCHAR(50)', description: 'Subscription tier (free, pro, enterprise)' },
            { name: 'created_at', type: 'TIMESTAMP', description: 'Account registration timestamp' },
            { name: 'status', type: 'VARCHAR(20)', description: 'Current status (active, churned, paused)' },
          ],
          previewRows: [
            { user_id: 'usr_101', email: 'aarav@retail.io', plan_tier: 'pro', created_at: '2026-07-01 10:14:00', status: 'churned' },
            { user_id: 'usr_102', email: 'meera@store.net', plan_tier: 'free', created_at: '2026-07-01 11:20:00', status: 'active' },
            { user_id: 'usr_103', email: 'rohit@techcorp.in', plan_tier: 'enterprise', created_at: '2026-07-02 09:30:00', status: 'active' },
            { user_id: 'usr_104', email: 'ananya@brands.co', plan_tier: 'pro', created_at: '2026-07-03 14:45:00', status: 'churned' },
            { user_id: 'usr_105', email: 'vikram@shopline.com', plan_tier: 'pro', created_at: '2026-07-04 16:10:00', status: 'churned' },
          ],
        },
        {
          tableName: 'orders',
          rowCount: 1250,
          columns: [
            { name: 'order_id', type: 'VARCHAR(36)', description: 'Unique order identifier', isPrimaryKey: true },
            { name: 'user_id', type: 'VARCHAR(36)', description: 'Associated customer ID', isForeignKey: true },
            { name: 'order_amount', type: 'DECIMAL(10,2)', description: 'Transaction amount in INR' },
            { name: 'order_date', type: 'TIMESTAMP', description: 'Timestamp of completed transaction' },
            { name: 'payment_status', type: 'VARCHAR(30)', description: 'Status (paid, refunded, failed)' },
          ],
          previewRows: [
            { order_id: 'ord_901', user_id: 'usr_101', order_amount: 1499.00, order_date: '2026-07-05 12:00:00', payment_status: 'paid' },
            { order_id: 'ord_902', user_id: 'usr_103', order_amount: 12500.00, order_date: '2026-07-08 15:30:00', payment_status: 'paid' },
            { order_id: 'ord_903', user_id: 'usr_104', order_amount: 1499.00, order_date: '2026-07-10 18:20:00', payment_status: 'paid' },
            { order_id: 'ord_904', user_id: 'usr_102', order_amount: 0.00, order_date: '2026-07-12 09:15:00', payment_status: 'paid' },
          ],
        },
      ],
      starterFiles: {
        'analysis.sql': `-- Capabilio Data Analyst Workstation
-- Ticket #DATA-701: Customer Churn & Cohort Retention Analysis
-- Write your SQL query below to compute weekly cohort retention:

SELECT 
    DATE_TRUNC('week', u.created_at) AS cohort_week,
    u.plan_tier,
    COUNT(DISTINCT u.user_id) AS total_users,
    COUNT(DISTINCT o.user_id) AS active_ordering_users
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id
GROUP BY 1, 2
ORDER BY 1, 2;
`,
        'executive_summary.md': `# Customer Churn Investigation: Findings & Recommendations

## 1. Problem Overview
State the observed churn pattern across customer tiers.

## 2. Key Data Insights
Provide concrete numbers derived from your SQL analysis.

## 3. Recommended Actions
What should the product and growth teams execute this sprint?
`,
      },
      targetQueryPatterns: ['COUNT(DISTINCT', 'GROUP BY', 'JOIN'],
      requiredColumns: ['cohort_week', 'plan_tier'],
      tutorHints: [
        { level: 1, label: 'Guiding Question', text: 'Before jumping into aggregations, how can you ensure each user is only counted once per cohort week to avoid inflated denominator counts?' },
        { level: 2, label: 'Conceptual Hint', text: 'When joining `users` and `orders`, a single user can have multiple orders in the same week. Use `COUNT(DISTINCT u.user_id)` rather than `COUNT(*)` to prevent duplication.' },
        { level: 3, label: 'Specific Clause Hint', text: 'Use `DATE_TRUNC(\'week\', created_at)` to group user signup dates into weekly buckets, then calculate retention percentage as `ROUND(active_users * 100.0 / total_users, 2)`.' },
        { level: 4, label: 'Query Pattern', text: 'Common CTE pattern:\nWITH cohorts AS (\n  SELECT user_id, plan_tier, DATE_TRUNC(\'week\', created_at) AS cohort_week FROM users\n)\nSELECT c.cohort_week, c.plan_tier, COUNT(DISTINCT c.user_id) FROM cohorts c ...' },
        { level: 5, label: 'Architectural Explanation', text: 'To calculate week-over-week retention, partition the order activity by the date difference `(order_date - created_at)` and compute retention ratios for Week 0, Week 1, Week 2, and Week 3.' },
      ],
    },
    {
      family: 'join_deduplication',
      company: { name: 'DataFlow Systems', industry: 'Enterprise SaaS & Cloud Data', size: 'Mid-Market (450 employees)', description: 'DataFlow Systems provides continuous ETL and telemetry pipelines for fintech platforms.' },
      manager: { name: 'Ananya Roy', title: 'Director of Data Reliability', department: 'Data Platform & Analytics' },
      sprint: 'Sprint 25 — Pipeline Deduplication & Aggregation Integrity',
      title: 'Prevent Customer Duplication in a Production Retention Pipeline',
      businessContext: 'A mission-critical subscription retention pipeline is reporting duplicate subscriber counts and inflated renewal rates due to 1-to-many relationship fan-out between `subscriptions` and `invoice_events`. The VP of Finance requires an immediate query audit and aggregation deduplication.',
      problemStatement: 'Audit the subscription and invoice event tables, eliminate duplicate customer row multiplications caused by multiple monthly billing events, ensure `COUNT(DISTINCT user_id)` is strictly applied across all cohort groupings, and calculate the true active retention rate.',
      objectives: [
        'Inspect the `subscriptions` and `invoice_events` tables for one-to-many cardinality expansion.',
        'Write an SQL query using `COUNT(DISTINCT s.user_id)` to prevent multi-invoice row duplication.',
        'Calculate true cohort retention percentages by subscription tier and billing cycle.',
        'Deliver a technical root cause summary explaining why row duplication distorted financial metrics.',
      ],
      acceptanceCriteria: [
        'Query uses `COUNT(DISTINCT s.user_id)` to deduplicate subscriber counts across multiple invoice records.',
        'Correctly calculates true active retention rate without duplicate row inflation.',
        'Groups results deterministically by cohort signup date and plan tier.',
        'Explains the difference between total invoice transaction volume and unique active subscribers.',
      ],
      datasets: [
        {
          tableName: 'subscriptions',
          rowCount: 600,
          columns: [
            { name: 'subscription_id', type: 'VARCHAR(36)', description: 'Unique subscription ID', isPrimaryKey: true },
            { name: 'user_id', type: 'VARCHAR(36)', description: 'Customer identifier', isForeignKey: true },
            { name: 'plan_tier', type: 'VARCHAR(50)', description: 'Plan (starter, pro, enterprise)' },
            { name: 'created_at', type: 'TIMESTAMP', description: 'Subscription creation timestamp' },
            { name: 'status', type: 'VARCHAR(20)', description: 'Status (active, churned, paused)' },
          ],
          previewRows: [
            { subscription_id: 'sub_101', user_id: 'usr_101', plan_tier: 'pro', created_at: '2026-07-01 10:00:00', status: 'active' },
            { subscription_id: 'sub_102', user_id: 'usr_102', plan_tier: 'starter', created_at: '2026-07-01 11:30:00', status: 'active' },
            { subscription_id: 'sub_103', user_id: 'usr_103', plan_tier: 'pro', created_at: '2026-07-02 09:15:00', status: 'churned' },
          ],
        },
        {
          tableName: 'invoice_events',
          rowCount: 1800,
          columns: [
            { name: 'invoice_id', type: 'VARCHAR(36)', description: 'Invoice ID', isPrimaryKey: true },
            { name: 'subscription_id', type: 'VARCHAR(36)', description: 'Associated subscription ID', isForeignKey: true },
            { name: 'amount', type: 'DECIMAL(10,2)', description: 'Invoice amount' },
            { name: 'invoice_date', type: 'TIMESTAMP', description: 'Billing timestamp' },
            { name: 'status', type: 'VARCHAR(20)', description: 'Payment status (paid, failed)' },
          ],
          previewRows: [
            { invoice_id: 'inv_01', subscription_id: 'sub_101', amount: 2499.00, invoice_date: '2026-07-05 12:00:00', status: 'paid' },
            { invoice_id: 'inv_02', subscription_id: 'sub_101', amount: 2499.00, invoice_date: '2026-07-12 12:00:00', status: 'paid' },
            { invoice_id: 'inv_03', subscription_id: 'sub_101', amount: 2499.00, invoice_date: '2026-07-19 12:00:00', status: 'paid' },
            { invoice_id: 'inv_04', subscription_id: 'sub_102', amount: 499.00, invoice_date: '2026-07-08 14:00:00', status: 'paid' },
          ],
        },
      ],
      starterFiles: {
        'deduplicate_pipeline.sql': `-- Capabilio Data Analyst Remediation Workstation\n-- Ticket #DATA-812: Prevent Customer Duplication in Production Retention Pipeline\n\nSELECT \n    DATE_TRUNC('week', s.created_at) AS cohort_week,\n    s.plan_tier,\n    COUNT(DISTINCT s.user_id) AS verified_unique_subscribers,\n    COUNT(i.invoice_id) AS total_invoice_events\nFROM subscriptions s\nLEFT JOIN invoice_events i ON s.subscription_id = i.subscription_id\nGROUP BY 1, 2\nORDER BY 1, 2;\n`,
        'deduplication_audit.md': `# Pipeline Deduplication & Retention Audit\n\n## 1. Cardinality Analysis\nExplain how multiple invoice events per subscription cause row multiplication during LEFT JOIN.\n\n## 2. Retention Impact\nQuantify the difference between raw row counts and COUNT(DISTINCT user_id).\n\n## 3. Preventive Engineering\nWhat SQL assertions or warehouse constraints should be added to prevent future duplication?\n`,
      },
      targetQueryPatterns: ['COUNT(DISTINCT', 'GROUP BY', 'JOIN'],
      requiredColumns: ['cohort_week', 'plan_tier'],
      tutorHints: [
        { level: 1, label: 'Guiding Question', text: 'When joining subscriptions to invoice_events, how many rows are created for a subscriber who has 4 invoices?' },
        { level: 2, label: 'Conceptual Hint', text: 'A subscriber with 4 invoices generates 4 joined rows. If you count rows or use COUNT(s.user_id), that subscriber is counted 4 times. Use COUNT(DISTINCT s.user_id).' },
        { level: 3, label: 'Specific Clause Hint', text: 'Group your query by DATE_TRUNC(\'week\', s.created_at) and s.plan_tier, using COUNT(DISTINCT s.user_id) for unique customer counts.' },
        { level: 4, label: 'Query Pattern', text: 'SELECT DATE_TRUNC(\'week\', s.created_at) AS cohort_week, s.plan_tier, COUNT(DISTINCT s.user_id) AS subscribers FROM subscriptions s LEFT JOIN invoice_events i ON s.subscription_id = i.subscription_id GROUP BY 1, 2;' },
        { level: 5, label: 'Architectural Explanation', text: 'To avoid join duplication entirely in large production warehouses, aggregate invoice metrics in a subquery or CTE before joining back to the unique subscriber dimensional table.' },
      ],
    },
    {
      family: 'sales_performance',
      company: { name: 'GlobalMart Direct', industry: 'B2B Wholesale & Logistics', size: 'Enterprise (1,200 employees)', description: 'GlobalMart connects regional suppliers to consumer retail chains across Asia.' },
      manager: { name: 'Devendra Kulkarni', title: 'Director of Commercial Analytics', department: 'Revenue Operations' },
      sprint: 'Sprint 18 — Margin Optimization',
      title: 'Analyze Discount Variance & Sales Rep Margin Erosion',
      businessContext: 'GlobalMart sales revenue increased by 14% this quarter, but gross margins fell by 22%. Leadership suspects sales representatives in the North and West regions are granting excessive discounts to hit quota.',
      problemStatement: 'Analyze transaction line items across sales regions, calculate margin percentages by discount bracket, identify reps exceeding discount thresholds, and formulate recommended governance rules.',
      objectives: [
        'Query the `sales_orders` and `sales_reps` tables to calculate average discount and gross margin by region.',
        'Segment orders into discount brackets (0-5%, 5-15%, 15-25%, >25%).',
        'Isolate which sales reps generated negative-margin deals.',
        'Recommend a discount approval threshold policy supported by data.',
      ],
      acceptanceCriteria: [
        'Correctly calculates Gross Margin % = `(Revenue - Cost) / Revenue * 100`.',
        'Identifies sales reps discounting > 25% on low-margin inventory.',
        'Produces clear regional revenue vs margin comparison chart data.',
      ],
      datasets: [
        {
          tableName: 'sales_orders',
          rowCount: 450,
          columns: [
            { name: 'order_id', type: 'VARCHAR(36)', description: 'Order ID', isPrimaryKey: true },
            { name: 'rep_id', type: 'VARCHAR(36)', description: 'Sales rep ID', isForeignKey: true },
            { name: 'region', type: 'VARCHAR(50)', description: 'Region (North, South, East, West)' },
            { name: 'gross_revenue', type: 'DECIMAL(12,2)', description: 'List revenue in INR' },
            { name: 'discount_pct', type: 'DECIMAL(5,2)', description: 'Discount percentage granted' },
            { name: 'cogs', type: 'DECIMAL(12,2)', description: 'Cost of goods sold' },
          ],
          previewRows: [
            { order_id: 'SO_501', rep_id: 'REP_12', region: 'North', gross_revenue: 850000.00, discount_pct: 28.50, cogs: 680000.00 },
            { order_id: 'SO_502', rep_id: 'REP_08', region: 'South', gross_revenue: 340000.00, discount_pct: 4.00, cogs: 220000.00 },
            { order_id: 'SO_503', rep_id: 'REP_12', region: 'North', gross_revenue: 1200000.00, discount_pct: 32.00, cogs: 980000.00 },
            { order_id: 'SO_504', rep_id: 'REP_19', region: 'West', gross_revenue: 450000.00, discount_pct: 18.00, cogs: 390000.00 },
          ],
        },
      ],
      starterFiles: {
        'discount_analysis.sql': `-- Sales Rep Margin & Discount Variance
SELECT 
    region,
    COUNT(order_id) AS total_deals,
    ROUND(AVG(discount_pct), 2) AS avg_discount_pct,
    ROUND(SUM(gross_revenue * (1 - discount_pct/100) - cogs) / SUM(gross_revenue * (1 - discount_pct/100)) * 100, 2) AS net_margin_pct
FROM sales_orders
GROUP BY region
ORDER BY net_margin_pct ASC;
`,
      },
      targetQueryPatterns: ['AVG(discount_pct)', 'GROUP BY region'],
      requiredColumns: ['region', 'avg_discount_pct'],
      tutorHints: [
        { level: 1, label: 'Guiding Question', text: 'When calculating net margin, are you applying the discount percentage to the gross revenue before subtracting the cost of goods sold (COGS)?' },
        { level: 2, label: 'Conceptual Hint', text: 'Net revenue equals `gross_revenue * (1 - discount_pct / 100)`. Gross margin is `(Net Revenue - COGS) / Net Revenue * 100`.' },
        { level: 3, label: 'Specific Clause Hint', text: 'Filter for high-risk deals with `WHERE discount_pct > 20` to pinpoint the specific transactions causing negative net margins.' },
        { level: 4, label: 'Query Pattern', text: 'Use CASE statements to bucket discounts:\nCASE WHEN discount_pct < 5 THEN \'Standard (0-5%)\' WHEN discount_pct < 15 THEN \'Moderate (5-15%)\' ELSE \'Aggressive (>15%)\' END AS discount_tier' },
        { level: 5, label: 'Architectural Explanation', text: 'Aggregate by both `rep_id` and `discount_tier` to uncover whether margin erosion is localized to individual reps or widespread across the region.' },
      ],
    },
    {
      family: 'marketing_campaign',
      company: { name: 'FinEdge Mobile', industry: 'Fintech & Digital Banking', size: 'Scaleup (400 employees)', description: 'FinEdge delivers instant micro-investments and UPI credit accounts.' },
      manager: { name: 'Rohan Mehta', title: 'Head of Growth Marketing', department: 'Acquisition & Performance' },
      sprint: 'Sprint 31 — Paid Acquisition Audit',
      title: 'Audit Multi-Channel CAC & Ad Spend Efficiency Curve',
      businessContext: 'FinEdge expanded digital marketing across 4 channels (Meta Ads, Google Search, Influencer Affiliates, and Referral Programs). Management requires empirical CAC and 60-day LTV calculations to optimize next quarter’s ₹1.8Cr acquisition budget.',
      problemStatement: 'Join campaign cost logs with customer conversion events, calculate CAC per paid customer, analyze payback velocity, and identify wasteful ad sets.',
      objectives: [
        'Calculate Customer Acquisition Cost (CAC) for each acquisition channel.',
        'Compute 60-day cumulative revenue per channel to determine return on ad spend (ROAS).',
        'Identify channels with CAC exceeding the ₹1,200 LTV ceiling.',
        'Deliver a data-backed budget reallocation recommendation.',
      ],
      acceptanceCriteria: [
        'Correctly computes CAC = `Total Channel Ad Spend / Total Converted Customers`.',
        'Identifies paid search as highest ROAS (3.4x) and unverified influencer campaigns as lowest (0.6x).',
      ],
      datasets: [
        {
          tableName: 'campaign_spend',
          rowCount: 40,
          columns: [
            { name: 'channel', type: 'VARCHAR(50)', description: 'Marketing channel', isPrimaryKey: true },
            { name: 'ad_spend', type: 'DECIMAL(12,2)', description: 'Total ad spend in INR' },
            { name: 'impressions', type: 'INTEGER', description: 'Total impressions delivered' },
            { name: 'clicks', type: 'INTEGER', description: 'Total ad clicks' },
          ],
          previewRows: [
            { channel: 'Google Search', ad_spend: 650000.00, impressions: 420000, clicks: 31000 },
            { channel: 'Meta Ads', ad_spend: 850000.00, impressions: 1800000, clicks: 45000 },
            { channel: 'Influencer Affiliates', ad_spend: 400000.00, impressions: 900000, clicks: 12000 },
            { channel: 'Referral Program', ad_spend: 200000.00, impressions: 150000, clicks: 28000 },
          ],
        },
      ],
      starterFiles: {
        'cac_roas_analysis.sql': `-- Multi-Channel CAC & Payback Efficiency
SELECT 
    channel,
    ad_spend,
    clicks,
    ROUND(ad_spend / clicks, 2) AS cost_per_click
FROM campaign_spend
ORDER BY ad_spend DESC;
`,
      },
      targetQueryPatterns: ['ad_spend', 'ORDER BY'],
      requiredColumns: ['channel', 'cost_per_click'],
      tutorHints: [
        { level: 1, label: 'Guiding Question', text: 'What is the relationship between Cost Per Click (CPC) and final Customer Acquisition Cost (CAC)?' },
        { level: 2, label: 'Conceptual Hint', text: 'CAC considers only users who successfully converted into paying accounts, not all raw clicks.' },
        { level: 3, label: 'Specific Clause Hint', text: 'Join `campaign_spend` with customer conversion counts using `LEFT JOIN` on `channel`.' },
        { level: 4, label: 'Query Pattern', text: 'SELECT cs.channel, cs.ad_spend / COUNT(DISTINCT u.user_id) AS cac FROM campaign_spend cs JOIN users u ON cs.channel = u.acquisition_channel GROUP BY 1, 2' },
        { level: 5, label: 'Architectural Explanation', text: 'Evaluate channel payback periods by calculating ratio of CAC to average 60-day revenue contribution.' },
      ],
    },
  ];

  const variant = VARIANTS[variantIndex % VARIANTS.length]!;
  const id = `da_mission_${Date.now()}_${variantIndex}`;
  const datasetHash = crypto.createHash('md5').update(JSON.stringify(variant.datasets)).digest('hex').slice(0, 8);
  const objHash = crypto.createHash('md5').update(JSON.stringify(variant.objectives)).digest('hex').slice(0, 8);
  const fingerprint = computeMissionFingerprint('data_analyst', variant.family, variant.title, datasetHash, objHash);

  return {
    id,
    fingerprint,
    roleId: 'data_analyst',
    roleSlug: 'data-analyst',
    roleTitle: 'Data Analyst',
    difficulty,
    title: variant.title,
    scenarioFamily: variant.family,
    estimatedMinutes: difficulty === 'entry' ? 30 : difficulty === 'junior' ? 45 : 60,
    company: variant.company,
    manager: variant.manager,
    sprint: variant.sprint,
    businessContext: variant.businessContext,
    problemStatement: variant.problemStatement,
    objectives: variant.objectives,
    acceptanceCriteria: variant.acceptanceCriteria,
    evaluationCriteria: [
      { id: 'tech_sql', name: 'SQL & Query Accuracy', description: 'Correct aggregations, grouping, and zero duplicate counting', weight: 35, evaluationType: 'deterministic' },
      { id: 'data_cleaning', name: 'Data Cleaning & Validation', description: 'Handling nulls, anomaly detection, and filter accuracy', weight: 25, evaluationType: 'deterministic' },
      { id: 'business_reasoning', name: 'Business Reasoning', description: 'Actionable executive conclusions supported by data evidence', weight: 25, evaluationType: 'ai_assisted' },
      { id: 'clarity', name: 'Structure & Visual Summary', description: 'Clear presentation of findings and metric comparisons', weight: 15, evaluationType: 'artifact' },
    ],
    availableTools: (ARENA_ROLE_REGISTRY.data_analyst || ARENA_ROLE_REGISTRY['data_analyst'])!.tools,
    skills: [
      { name: 'SQL', slug: 'sql', weight: 85 },
      { name: 'Data Cleaning', slug: 'data-cleaning', weight: 80 },
      { name: 'Business Analysis', slug: 'business-analysis', weight: 85 },
      { name: 'Data Visualization', slug: 'data-visualization', weight: 75 },
    ],
    datasets: variant.datasets,
    starterFiles: variant.starterFiles as unknown as Record<string, string>,
    expectedOutputCriteria: {
      targetQueryPatterns: variant.targetQueryPatterns,
      requiredColumns: variant.requiredColumns,
    },
    tutorHints: variant.tutorHints as Array<{ level: 1 | 2 | 3 | 4 | 5; label: string; text: string }>,
  };
}

/**
 * Database Administrator scenario templates generator with variations
 */
function buildDbaScenario(
  variantIndex: number,
  targetSkill: string,
  difficulty: 'entry' | 'junior' | 'mid' | 'senior'
): GeneratedMissionData {
  const VARIANTS = [
    {
      family: 'slow_query',
      company: { name: 'CloudScale Logistics', industry: 'Cloud Infrastructure & Fleet Telemetry', size: 'Enterprise (850 employees)', description: 'CloudScale powers real-time vehicle telemetry and shipment tracking across 12 countries.' },
      manager: { name: 'Sanjay Deshmukh', title: 'Lead Database Infrastructure Engineer', department: 'Site Reliability & Core Platform' },
      sprint: 'Sprint 42 — Production Latency Remediation',
      title: 'Optimize Degraded Production Query Scanning 1.8M Rows (12.4s → 200ms)',
      businessContext: 'The shipment audit dashboard query has degraded from 350ms to 12.4 seconds during morning delivery bursts, spiking database CPU utilization to 94%. Application microservices are experiencing connection queue saturation.',
      problemStatement: 'Investigate the database execution plan with EXPLAIN (ANALYZE, BUFFERS), identify the sequential scan bottlenecks, create a non-blocking composite index, and verify query latency drops under 250ms.',
      objectives: [
        'Run `EXPLAIN (ANALYZE, BUFFERS)` on the unoptimized query against the `shipment_events` table.',
        'Identify sequential table scans and buffer read overhead (Cost 0..84,291.00).',
        'Formulate and execute a targeted composite index: `(tenant_id, status, created_at DESC)`.',
        'Verify query execution plan converts to an Index-Only Scan with sub-100ms response time.',
      ],
      acceptanceCriteria: [
        'Diagnoses the sequential scan on `tenant_id` and `created_at` correctly.',
        'Uses `CREATE INDEX CONCURRENTLY` or targeted composite indexing to prevent production table locks.',
        'Reduces execution latency from 12.4s to below 250ms.',
      ],
      datasets: [
        {
          tableName: 'shipment_events',
          rowCount: 1840000,
          columns: [
            { name: 'event_id', type: 'UUID', description: 'Event identifier', isPrimaryKey: true },
            { name: 'tenant_id', type: 'VARCHAR(36)', description: 'Tenant enterprise ID' },
            { name: 'shipment_id', type: 'VARCHAR(36)', description: 'Tracked package shipment ID' },
            { name: 'status', type: 'VARCHAR(30)', description: 'Event status (in_transit, delivered, exception)' },
            { name: 'payload_bytes', type: 'INTEGER', description: 'Telemetry size in bytes' },
            { name: 'created_at', type: 'TIMESTAMP', description: 'Event timestamp' },
          ],
          previewRows: [
            { event_id: 'evt_a01', tenant_id: 'TNT_CORP_99', shipment_id: 'SHP_77102', status: 'in_transit', payload_bytes: 512, created_at: '2026-08-21 08:30:14' },
            { event_id: 'evt_a02', tenant_id: 'TNT_CORP_99', shipment_id: 'SHP_77103', status: 'delivered', payload_bytes: 480, created_at: '2026-08-21 08:31:02' },
            { event_id: 'evt_a03', tenant_id: 'TNT_RETAIL_12', shipment_id: 'SHP_88204', status: 'in_transit', payload_bytes: 620, created_at: '2026-08-21 08:32:45' },
          ],
        },
      ],
      starterFiles: {
        'slow_query_explain.sql': `-- Unoptimized Production Query:
EXPLAIN (ANALYZE, BUFFERS)
SELECT event_id, shipment_id, status, created_at
FROM shipment_events
WHERE tenant_id = 'TNT_CORP_99'
  AND status = 'in_transit'
ORDER BY created_at DESC
LIMIT 50;
`,
        'index_remediation.sql': `-- Write your index remediation and vacuum commands below:
-- Goal: Eliminate sequential scans and reduce execution cost

CREATE INDEX CONCURRENTLY idx_shipment_tenant_status_created 
ON shipment_events (tenant_id, status, created_at DESC);

ANALYZE shipment_events;
`,
      },
      targetQueryPatterns: ['CREATE INDEX', 'tenant_id', 'created_at'],
      requiredColumns: ['tenant_id', 'status', 'created_at'],
      tutorHints: [
        { level: 1, label: 'Guiding Question', text: 'Look at the EXPLAIN output. Is Postgres using an index or performing a `Seq Scan on shipment_events`?' },
        { level: 2, label: 'Conceptual Hint', text: 'When a query filters by `tenant_id = ?` and `status = ?` and orders by `created_at DESC`, a single-column index on `created_at` alone will still require filtering all other rows.' },
        { level: 3, label: 'Specific Clause Hint', text: 'Build a composite B-Tree index covering `(tenant_id, status, created_at DESC)` in that exact leading column order.' },
        { level: 4, label: 'Query Pattern', text: 'In production PostgreSQL, always specify `CREATE INDEX CONCURRENTLY` to avoid blocking writes during index build.' },
        { level: 5, label: 'Architectural Explanation', text: 'After creating the index, run `ANALYZE shipment_events;` to refresh the query planner\'s distribution statistics so it switches from Seq Scan to Index Scan immediately.' },
      ],
    },
    {
      family: 'deadlock_investigation',
      company: { name: 'FinPay Core', industry: 'Banking & Real-time Settlement', size: 'Scaleup (350 employees)', description: 'FinPay processes 4 million instant wallet transfers daily.' },
      manager: { name: 'Aakash Verma', title: 'Principal Database Architect', department: 'Core Banking Reliability' },
      sprint: 'Sprint 28 — Concurrency & Locking',
      title: 'Triage Transaction Deadlocks (SQLSTATE 40P01) in High-Frequency Wallet Transfers',
      businessContext: 'High-frequency peer-to-peer transfers are experiencing intermittent `deadlock detected (SQLSTATE 40P01)` errors under concurrent bursts. Two worker threads are acquiring row locks on user balances in opposite order.',
      problemStatement: 'Analyze the lock graph telemetry, identify the cyclic wait condition between Account A and Account B, rewrite the transfer stored procedure to enforce deterministic lock ordering, and verify zero deadlocks.',
      objectives: [
        'Inspect the `pg_locks` and PostgreSQL deadlock log dump.',
        'Identify why Thread 1 (Locking A then B) and Thread 2 (Locking B then A) enter circular wait.',
        'Implement deterministic ordering: always lock `LEAST(acc_a, acc_b)` first, followed by `GREATEST(acc_a, acc_b)`.',
        'Verify zero deadlock exceptions under concurrent test execution harness.',
      ],
      acceptanceCriteria: [
        'Correctly identifies cyclic lock dependency.',
        'Restructures transfer transaction to acquire row locks deterministically by account ID.',
      ],
      datasets: [
        {
          tableName: 'wallet_accounts',
          rowCount: 250,
          columns: [
            { name: 'account_id', type: 'VARCHAR(36)', description: 'Account ID', isPrimaryKey: true },
            { name: 'user_id', type: 'VARCHAR(36)', description: 'User ID' },
            { name: 'balance_inr', type: 'DECIMAL(12,2)', description: 'Current balance' },
            { name: 'last_updated', type: 'TIMESTAMP', description: 'Last balance modification' },
          ],
          previewRows: [
            { account_id: 'ACC_001', user_id: 'usr_101', balance_inr: 50000.00, last_updated: '2026-08-21 09:00:00' },
            { account_id: 'ACC_002', user_id: 'usr_102', balance_inr: 32000.00, last_updated: '2026-08-21 09:00:00' },
          ],
        },
      ],
      starterFiles: {
        'deadlock_trace.sql': `-- Deadlock Triage & Deterministic Lock Ordering
-- Enforce deterministic lock acquisition to eliminate cyclic wait:

BEGIN;
  -- Lock accounts in strict numerical order
  SELECT account_id FROM wallet_accounts 
  WHERE account_id IN ('ACC_001', 'ACC_002')
  ORDER BY account_id
  FOR UPDATE;

  -- Execute transfers safely
  UPDATE wallet_accounts SET balance_inr = balance_inr - 500 WHERE account_id = 'ACC_001';
  UPDATE wallet_accounts SET balance_inr = balance_inr + 500 WHERE account_id = 'ACC_002';
COMMIT;
`,
      },
      targetQueryPatterns: ['FOR UPDATE', 'ORDER BY account_id'],
      requiredColumns: ['account_id', 'balance_inr'],
      tutorHints: [
        { level: 1, label: 'Guiding Question', text: 'What happens when two concurrent transactions attempt to lock the same two rows in reverse order?' },
        { level: 2, label: 'Conceptual Hint', text: 'A deadlock occurs when Transaction 1 holds a lock on Row A and waits for Row B, while Transaction 2 holds Row B and waits for Row A.' },
        { level: 3, label: 'Specific Clause Hint', text: 'Enforce a global ordering convention: always acquire row-level locks on accounts sorted by `account_id` ascending.' },
        { level: 4, label: 'Query Pattern', text: 'Use `SELECT ... FOR UPDATE` with `ORDER BY account_id` so all threads lock resources in identical sequence.' },
        { level: 5, label: 'Architectural Explanation', text: 'By enforcing strict global lock hierarchy, circular wait conditions become mathematically impossible.' },
      ],
    },
  ];

  const variant = VARIANTS[variantIndex % VARIANTS.length]!;
  const id = `dba_mission_${Date.now()}_${variantIndex}`;
  const datasetHash = crypto.createHash('md5').update(JSON.stringify(variant.datasets)).digest('hex').slice(0, 8);
  const objHash = crypto.createHash('md5').update(JSON.stringify(variant.objectives)).digest('hex').slice(0, 8);
  const fingerprint = computeMissionFingerprint('database_administrator', variant.family, variant.title, datasetHash, objHash);

  return {
    id,
    fingerprint,
    roleId: 'database_administrator',
    roleSlug: 'database-administrator',
    roleTitle: 'Database Administrator',
    difficulty,
    title: variant.title,
    scenarioFamily: variant.family,
    estimatedMinutes: difficulty === 'entry' ? 30 : difficulty === 'junior' ? 45 : 60,
    company: variant.company,
    manager: variant.manager,
    sprint: variant.sprint,
    businessContext: variant.businessContext,
    problemStatement: variant.problemStatement,
    objectives: variant.objectives,
    acceptanceCriteria: variant.acceptanceCriteria,
    evaluationCriteria: [
      { id: 'query_opt', name: 'Query & Index Optimization', description: 'Eliminating sequential scans and selecting optimal index types', weight: 40, evaluationType: 'deterministic' },
      { id: 'troubleshooting', name: 'Diagnostic Accuracy', description: 'Interpreting EXPLAIN plans, buffer hits, and locking telemetry', weight: 30, evaluationType: 'deterministic' },
      { id: 'operational_safety', name: 'Operational Safety', description: 'Non-blocking DDL execution and transaction rollback protection', weight: 20, evaluationType: 'ai_assisted' },
      { id: 'clarity', name: 'RCA & Postmortem Documentation', description: 'Clear technical explanation of root cause and prevention', weight: 10, evaluationType: 'artifact' },
    ],
    availableTools: (ARENA_ROLE_REGISTRY.database_administrator || ARENA_ROLE_REGISTRY['database_administrator'])!.tools,
    skills: [
      { name: 'SQL', slug: 'sql', weight: 80 },
      { name: 'Query Optimization', slug: 'query-optimization', weight: 90 },
      { name: 'Indexing', slug: 'indexing', weight: 85 },
      { name: 'Troubleshooting', slug: 'troubleshooting', weight: 85 },
    ],
    datasets: variant.datasets,
    starterFiles: variant.starterFiles as unknown as Record<string, string>,
    expectedOutputCriteria: {
      targetQueryPatterns: variant.targetQueryPatterns,
      requiredColumns: variant.requiredColumns,
    },
    tutorHints: variant.tutorHints as Array<{ level: 1 | 2 | 3 | 4 | 5; label: string; text: string }>,
  };
}

/**
 * Main adaptive generator with duplicate protection and weakness targeting
 */
export async function generateAdaptiveMission(params: {
  userId: string;
  roleSlug: string;
  currentElo: number;
  skillProfile?: Record<string, number>;
  history: UserMissionHistoryItem[];
  preferredDifficulty?: 'entry' | 'junior' | 'mid' | 'senior';
}): Promise<GeneratedMissionData> {
  const { roleSlug, currentElo, history, preferredDifficulty } = params;

  // Determine role config
  const roleConfig = (ARENA_ROLE_REGISTRY[roleSlug.replace(/[-\s]/g, '_')] || ARENA_ROLE_REGISTRY.data_analyst)!;

  // Determine appropriate difficulty level based on ELO & performance
  let difficulty: 'entry' | 'junior' | 'mid' | 'senior' = preferredDifficulty || 'entry';
  if (!preferredDifficulty) {
    if (currentElo < 440) difficulty = 'entry';
    else if (currentElo < 490) difficulty = 'junior';
    else if (currentElo < 540) difficulty = 'mid';
    else difficulty = 'senior';
  }

  // Find user's weakest skill from history or skill profile
  let targetSkill = 'SQL';
  if (params.skillProfile) {
    const sortedSkills = Object.entries(params.skillProfile).sort((a, b) => a[1] - b[1]);
    if (sortedSkills.length > 0 && sortedSkills[0]) {
      targetSkill = sortedSkills[0][0];
    }
  }

  // Generate candidate missions until a semantically unique one is found
  const existingFingerprints = new Set(history.map(h => h.fingerprint));
  const existingTitles = new Set(history.map(h => h.title.toLowerCase().trim()));

  let mission: GeneratedMissionData | null = null;
  let attempt = 0;
  const maxAttempts = 12;

  while (attempt < maxAttempts) {
    let candidate: GeneratedMissionData;
    if (roleConfig.id === 'database_administrator') {
      candidate = buildDbaScenario(attempt + history.length, targetSkill, difficulty);
    } else {
      candidate = buildDataAnalystScenario(attempt + history.length, targetSkill, difficulty);
    }

    // Check if fingerprint or title already exists in user history
    if (!existingFingerprints.has(candidate.fingerprint) && !existingTitles.has(candidate.title.toLowerCase().trim())) {
      mission = candidate;
      break;
    }
    attempt++;
  }

  // If candidate was found, return it
  if (mission) {
    return mission;
  }

  // Fallback unique generator with timestamp salting to guarantee zero duplicate
  const saltedIndex = history.length + 100;
  if (roleConfig.id === 'database_administrator') {
    return buildDbaScenario(saltedIndex, targetSkill, difficulty);
  } else {
    return buildDataAnalystScenario(saltedIndex, targetSkill, difficulty);
  }
}

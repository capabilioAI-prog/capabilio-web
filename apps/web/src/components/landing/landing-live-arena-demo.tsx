"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  TrendingDown, 
  Terminal as TerminalIcon, 
  FileCode2, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  Code2, 
  Cpu, 
  Check, 
  AlertTriangle, 
  Lightbulb,
  Database,
  Layers,
  Search,
  ShieldAlert,
  BarChart3,
  Globe,
  Sliders,
  Laptop,
  Server
} from 'lucide-react';

export interface ArenaRoleScenario {
  id: string;
  name: string;
  category: string;
  environmentName: string;
  ticketId: string;
  tools: string[];
  title: string;
  scenario: string;
  acceptanceCriteria: string[];
  fileLabel: string;
  solutionA: {
    label: string;
    description: string;
    codeSnippet: string;
    testLogs: string[];
    score: number;
    eloDelta: number;
    eloBefore: number;
    eloAfter: number;
    skillDelta: string;
    readinessDelta: string;
    verdict: string;
    mentorFeedback: string;
  };
  solutionB: {
    label: string;
    description: string;
    codeSnippet: string;
    testLogs: string[];
    score: number;
    eloDelta: number;
    eloBefore: number;
    eloAfter: number;
    skillDelta: string;
    readinessDelta: string;
    verdict: string;
    mentorFeedback: string;
  };
}

export const ARENA_ROLE_SCENARIOS: ArenaRoleScenario[] = [
  {
    id: 'software-engineer',
    name: 'Software Engineer',
    category: 'Engineering',
    environmentName: 'Software Engineering Workstation',
    ticketId: 'Ticket #ENG-4821',
    tools: ['Code Editor', 'Git', 'Terminal', 'API Tester', 'Test Runner', 'Logs', 'Issue Tracker'],
    title: 'Fix Production Checkout Endpoint HTTP 500 Intermittent Failures',
    scenario: 'Production monitoring detected HTTP 500 crashes for approximately 8% of users during checkout validation. Investigate the middleware error boundary, handle null metadata safely, and enforce defensive cryptographic verification.',
    acceptanceCriteria: [
      'Reject malformed tokens with HTTP 400 MALFORMED_TOKEN',
      'Cryptographically verify session signatures with secret',
      'Prevent uncaught exceptions on null metadata fields'
    ],
    fileLabel: 'apps/api/src/middleware/checkout-auth.ts',
    solutionA: {
      label: 'Solution A (Defensive Fix)',
      description: 'Full signature validation, null-safety guards, and structured error responses.',
      codeSnippet: `// apps/api/src/middleware/checkout-auth.ts
export function verifyCheckoutSession(token: string, secret: string) {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'MALFORMED_TOKEN' };
  }
  try {
    const payload = jwt.verify(token, secret);
    if (payload.exp < Date.now() / 1000) {
      return { valid: false, error: 'TOKEN_EXPIRED' };
    }
    // Guard against null metadata on guest checkouts
    const metadata = payload.metadata || {};
    return { valid: true, user: payload, checkoutTier: metadata.tier || 'standard' };
  } catch (err) {
    return { valid: false, error: 'INVALID_SIGNATURE' };
  }
}`,
      testLogs: [
        '[SANDBOX] Sandbox initialized (Node.js 20 runtime, Piston engine)',
        '✓ PASS test_valid_checkout_token_signature (14ms)',
        '✓ PASS test_expired_token_rejection (8ms)',
        '✓ PASS test_guest_checkout_null_metadata_resilience (11ms)',
        '✓ PASS test_malformed_token_header_guards (9ms)',
        '✓ PASS test_role_boundary_enforcement (12ms)',
        '--------------------------------------------------',
        'SUITE PASSED: 5/5 tests passed (100% assertions satisfied)',
        'EVALUATION: Capability demonstrated.'
      ],
      score: 92,
      eloDelta: 18,
      eloBefore: 428,
      eloAfter: 446,
      skillDelta: 'Debugging: 74 → 82 • APIs & REST: 75 → 81',
      readinessDelta: '31% → 35%',
      verdict: 'Capability demonstrated.',
      mentorFeedback: 'Exceptional work. You implemented defensive token verification and null-safe metadata extraction, eliminating the 8% production checkout crash rate.'
    },
    solutionB: {
      label: 'Solution B (Flawed Patch)',
      description: 'Shallow decode without secret verification and unhandled null metadata.',
      codeSnippet: `// apps/api/src/middleware/checkout-auth.ts
export function verifyCheckoutSession(token: string, secret: string) {
  // Bug 1: Decodes without verifying cryptographic HMAC signature
  const payload = jwt.decode(token);
  if (!payload) return { valid: false };
  // Bug 2: Unsafe direct property access crashes when metadata is null
  return { valid: true, user: payload, checkoutTier: payload.metadata.tier };
}`,
      testLogs: [
        '[SANDBOX] Sandbox initialized (Node.js 20 runtime, Piston engine)',
        '✓ PASS test_valid_checkout_token_signature (12ms)',
        '✕ FAIL test_tampered_signature_detection (15ms)',
        '   Error: Expected INVALID_SIGNATURE, received valid=true (Signature not verified)',
        '✕ FAIL test_guest_checkout_null_metadata_resilience (9ms)',
        '   TypeError: Cannot read properties of undefined (reading \'tier\')',
        '✕ FAIL test_expired_token_rejection (10ms)',
        '   Error: Expired token was incorrectly accepted',
        '--------------------------------------------------',
        'SUITE FAILED: 1/4 passed, 3 failed (25% accuracy)',
        'EVALUATION: Performance below the current capability baseline.'
      ],
      score: 38,
      eloDelta: -14,
      eloBefore: 428,
      eloAfter: 414,
      skillDelta: 'Debugging: 74 → 69 • Testing: 65 → 61',
      readinessDelta: '31% → 28%',
      verdict: 'Performance below the current capability baseline.',
      mentorFeedback: 'Your patch used jwt.decode without signature verification, introducing a security flaw, and threw unhandled TypeError on guest checkouts.'
    }
  },
  {
    id: 'frontend-developer',
    name: 'Frontend Developer',
    category: 'Engineering',
    environmentName: 'Frontend Engineering Workstation',
    ticketId: 'Ticket #FE-2910',
    tools: ['Browser Preview', 'React/Next.js Editor', 'DevTools', 'Console', 'Network Panel', 'Component Inspector'],
    title: 'Fix Multi-Step Form Validation Regression & Keyboard Navigation',
    scenario: 'Users report that dynamic form fields do not validate synchronously, and keyboard Tab focus escapes the modal boundary violating WCAG 2.1 AA accessibility standards.',
    acceptanceCriteria: [
      'Synchronous Zod schema validation with clear field errors',
      'Accessible focus trap inside modal dialog',
      'Zero layout shift (CLS < 0.05)'
    ],
    fileLabel: 'apps/web/src/components/forms/registration-modal.tsx',
    solutionA: {
      label: 'Solution A (Accessible & Memoized)',
      description: 'Zod field validation, focus-trap ref integration, and zero re-render cascade.',
      codeSnippet: `// apps/web/src/components/forms/registration-modal.tsx
export function RegistrationModal({ isOpen, onClose }: ModalProps) {
  const modalRef = useFocusTrap(isOpen);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = useCallback((name: string, value: string) => {
    const res = formSchema.shape[name].safeParse(value);
    setErrors(prev => ({ ...prev, [name]: res.success ? '' : res.error.errors[0].message }));
  }, []);

  return (
    <dialog ref={modalRef} aria-modal="true" aria-labelledby="modal-title" className="modal-dialog">
      <h2 id="modal-title">Complete Profile</h2>
      {/* Accessible fields & live errors */}
    </dialog>
  );
}`,
      testLogs: [
        '[TEST] Executing Playwright headless browser test suite...',
        '✓ PASS test_keyboard_tab_focus_trap_invariants (18ms)',
        '✓ PASS test_synchronous_field_error_aria_live (12ms)',
        '✓ PASS test_cumulative_layout_shift_zero (15ms)',
        '--------------------------------------------------',
        'SUITE PASSED: 3/3 tests passed (100% assertions satisfied)',
        'EVALUATION: Capability demonstrated.'
      ],
      score: 95,
      eloDelta: 16,
      eloBefore: 425,
      eloAfter: 441,
      skillDelta: 'React Architecture: 78 → 84 • Web a11y: 65 → 74',
      readinessDelta: '30% → 34%',
      verdict: 'Capability demonstrated.',
      mentorFeedback: 'Excellent implementation of focus management and live ARIA attributes. Form responsiveness and accessibility benchmarks met.'
    },
    solutionB: {
      label: 'Solution B (Uncontrolled State Bug)',
      description: 'Uncontrolled inputs with focus leaks and async validation race condition.',
      codeSnippet: `// apps/web/src/components/forms/registration-modal.tsx
export function RegistrationModal({ isOpen, onClose }: ModalProps) {
  // Bug 1: No focus trap allows Tab navigation into background DOM
  // Bug 2: Async debounce causes stale closure on rapid keystrokes
  const handleChange = (e: any) => {
    setTimeout(() => { validate(e.target.value); }, 500);
  };
  return <div className="modal"><h2>Complete Profile</h2></div>;
}`,
      testLogs: [
        '[TEST] Executing Playwright headless browser test suite...',
        '✕ FAIL test_keyboard_tab_focus_trap_invariants (20ms)',
        '   Error: Focus escaped modal dialog to background nav button',
        '✕ FAIL test_synchronous_field_error_aria_live (14ms)',
        '   Error: Stale closure caused validation error to drop on fast typing',
        '--------------------------------------------------',
        'SUITE FAILED: 0/2 passed, 2 failed',
        'EVALUATION: Performance below the current capability baseline.'
      ],
      score: 42,
      eloDelta: -12,
      eloBefore: 425,
      eloAfter: 413,
      skillDelta: 'React Architecture: 78 → 72 • State Management: 72 → 66',
      readinessDelta: '30% → 27%',
      verdict: 'Performance below the current capability baseline.',
      mentorFeedback: 'Async timeout caused state races and focus was not trapped inside modal container.'
    }
  },
  {
    id: 'backend-developer',
    name: 'Backend Developer',
    category: 'Engineering',
    environmentName: 'Backend Engineering Workstation',
    ticketId: 'Ticket #BE-1984',
    tools: ['API Client', 'Code Editor', 'Terminal', 'Logs', 'Database Console', 'Test Runner'],
    title: 'Implement Distributed Rate Limiter with Redis Sliding Window',
    scenario: 'High-frequency scrapers are saturating public APIs. Implement an atomic sliding-window rate limiter using Redis Lua scripting to avoid race conditions across horizontally scaled nodes.',
    acceptanceCriteria: [
      'Sliding window algorithm (60 req / 60 sec)',
      'Atomic Redis Lua script execution',
      'Return standard HTTP 429 and Retry-After header'
    ],
    fileLabel: 'apps/api/src/lib/rate-limiter.ts',
    solutionA: {
      label: 'Solution A (Atomic Sliding Window)',
      description: 'Atomic Redis ZSET Lua script tracking timestamped request tokens.',
      codeSnippet: `// apps/api/src/lib/rate-limiter.ts
const SLIDING_WINDOW_LUA = \`
  local key = KEYS[1]
  local now = tonumber(ARGV[1])
  local window = tonumber(ARGV[2])
  local limit = tonumber(ARGV[3])
  local clearBefore = now - window
  redis.call('ZREMRANGEBYSCORE', key, 0, clearBefore)
  local currentReqs = redis.call('ZCARD', key)
  if currentReqs < limit then
    redis.call('ZADD', key, now, now)
    redis.call('EXPIRE', key, window)
    return {1, limit - currentReqs - 1}
  else
    return {0, 0}
  end
\`;`,
      testLogs: [
        '[SANDBOX] Executing concurrency race condition harness (50 threads)...',
        '✓ PASS test_single_ip_under_threshold (14ms)',
        '✓ PASS test_concurrency_burst_exact_boundary (22ms)',
        '✓ PASS test_sliding_window_sliding_recovery (18ms)',
        '✓ PASS test_http_429_retry_after_header (10ms)',
        '--------------------------------------------------',
        'SUITE PASSED: 4/4 tests passed (Zero race conditions)',
        'EVALUATION: Capability demonstrated.'
      ],
      score: 96,
      eloDelta: 19,
      eloBefore: 432,
      eloAfter: 451,
      skillDelta: 'Microservices: 65 → 74 • Redis Caching: 68 → 78',
      readinessDelta: '33% → 38%',
      verdict: 'Capability demonstrated.',
      mentorFeedback: 'Masterful use of atomic Redis Lua scripts. Concurrency stress tests passed with 0 token leakage.'
    },
    solutionB: {
      label: 'Solution B (Non-Atomic Memory Map)',
      description: 'Naive in-memory counter with check-then-act race conditions.',
      codeSnippet: `// apps/api/src/lib/rate-limiter.ts
const memoryMap = new Map();
export async function checkRateLimit(ip: string) {
  // Bug 1: In-memory counter fails across multiple server instances
  // Bug 2: Non-atomic get/set creates race condition during bursts
  const count = memoryMap.get(ip) || 0;
  if (count >= 60) return { allowed: false };
  memoryMap.set(ip, count + 1);
  return { allowed: true };
}`,
      testLogs: [
        '[SANDBOX] Executing concurrency race condition harness (50 threads)...',
        '✓ PASS test_single_ip_under_threshold (11ms)',
        '✕ FAIL test_concurrency_burst_exact_boundary (25ms)',
        '   Error: Accepted 88 requests under 60-req limit (Race condition in memory map)',
        '✕ FAIL test_cluster_node_synchronization (18ms)',
        '   Error: Counter state not shared between worker processes',
        '--------------------------------------------------',
        'SUITE FAILED: 1/3 passed, 2 failed',
        'EVALUATION: Performance below the current capability baseline.'
      ],
      score: 40,
      eloDelta: -15,
      eloBefore: 432,
      eloAfter: 417,
      skillDelta: 'Microservices: 65 → 59 • Redis Caching: 68 → 61',
      readinessDelta: '33% → 29%',
      verdict: 'Performance below the current capability baseline.',
      mentorFeedback: 'In-memory state cannot scale across clustered nodes and suffered from check-then-act race conditions.'
    }
  },
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    category: 'Analytics',
    environmentName: 'Analytics Workstation',
    ticketId: 'Ticket #DATA-8104',
    tools: ['SQL Editor', 'Python/Pandas', 'Dataset Viewer', 'Notebook', 'Charts', 'Data Profiling', 'Business Metrics'],
    title: 'Diagnose 18% Quarterly Churn Spike via Cohort Retention Analysis',
    scenario: 'Executive leadership flagged an unexpected 18% customer churn increase in Q3. Query the 2.4M-row user event warehouse, compute weekly cohort retention matrices, and isolate the exact customer segment driving attrition.',
    acceptanceCriteria: [
      'Windowed SQL cohort retention query by signup week',
      'Segment churn by plan tier (Free vs Pro vs Enterprise)',
      'Actionable cohort breakdown visualization'
    ],
    fileLabel: 'queries/q3_churn_cohort_analysis.sql',
    solutionA: {
      label: 'Solution A (Cohort Segmentation)',
      description: 'Windowed SQL cohort matrix identifying self-serve Pro onboarding dropoff.',
      codeSnippet: `-- queries/q3_churn_cohort_analysis.sql
WITH user_cohorts AS (
  SELECT user_id, plan_tier, DATE_TRUNC('week', created_at) AS cohort_week
  FROM users
),
activity_weeks AS (
  SELECT e.user_id, c.plan_tier, c.cohort_week,
         DATE_PART('week', e.event_timestamp) - DATE_PART('week', c.cohort_week) AS week_number
  FROM user_events e
  JOIN user_cohorts c ON e.user_id = c.user_id
  WHERE e.event_timestamp >= '2026-07-01'
)
SELECT cohort_week, plan_tier, week_number, COUNT(DISTINCT user_id) AS active_users,
       ROUND(COUNT(DISTINCT user_id)::numeric / MAX(COUNT(DISTINCT user_id)) OVER(PARTITION BY cohort_week, plan_tier) * 100, 2) AS retention_pct
FROM activity_weeks
GROUP BY 1, 2, 3 ORDER BY 1, 2, 3;`,
      testLogs: [
        '[WAREHOUSE] Executing analytics query on Postgres Warehouse (2,419,021 rows)...',
        '✓ PASS test_cohort_window_granularity (42ms)',
        '✓ PASS test_plan_tier_segmentation_isolation (38ms)',
        '✓ PASS test_churn_driver_identification: Pro Tier Week 3 Dropoff Isolated (46% vs 14% benchmark)',
        '--------------------------------------------------',
        'ANALYTICS VERIFIED: Root cause isolated to Pro tier Week 3 onboarding cliff',
        'EVALUATION: Capability demonstrated.'
      ],
      score: 94,
      eloDelta: 20,
      eloBefore: 420,
      eloAfter: 440,
      skillDelta: 'SQL Aggregations: 78 → 86 • Python & Pandas: 74 → 80',
      readinessDelta: '29% → 34%',
      verdict: 'Capability demonstrated.',
      mentorFeedback: 'Superb cohort decomposition. You correctly pinpointed the Pro-tier week-3 onboarding cliff rather than reporting generic high-level averages.'
    },
    solutionB: {
      label: 'Solution B (Generic Averages)',
      description: 'Global average churn aggregation hiding tier-specific onboarding anomalies.',
      codeSnippet: `-- queries/q3_churn_cohort_analysis.sql
-- Bug: Simple average churn hides the specific cohort anomaly
SELECT plan_tier, AVG(is_active::int) * 100 AS avg_active_pct
FROM users
GROUP BY plan_tier;`,
      testLogs: [
        '[WAREHOUSE] Executing analytics query on Postgres Warehouse...',
        '✓ PASS test_query_syntax (12ms)',
        '✕ FAIL test_cohort_window_granularity (24ms)',
        '   Error: Missing time-based cohort partitioning by signup date',
        '✕ FAIL test_churn_driver_identification (20ms)',
        '   Error: High-level average failed to isolate the week-3 dropoff',
        '--------------------------------------------------',
        'ANALYTICS FAILED: Analysis insufficient for executive decision making',
        'EVALUATION: Performance below the current capability baseline.'
      ],
      score: 44,
      eloDelta: -12,
      eloBefore: 420,
      eloAfter: 408,
      skillDelta: 'SQL Aggregations: 78 → 72 • Business Metrics: 70 → 64',
      readinessDelta: '29% → 26%',
      verdict: 'Performance below the current capability baseline.',
      mentorFeedback: 'A static average obscured the cohort timeline. Next time, use windowed date-truncation cohorts.'
    }
  },
  {
    id: 'database-administrator',
    name: 'Database Administrator',
    category: 'Infrastructure',
    environmentName: 'Database Operations Workstation',
    ticketId: 'Ticket #DBA-3301',
    tools: ['SQL Console', 'Schema Browser', 'Query Analyzer', 'Logs', 'Index Inspector', 'Performance Metrics'],
    title: 'Optimize Slow Production Query Scanning 1.8M Rows (12s → 200ms)',
    scenario: 'The checkout audit dashboard query is causing database CPU spikes of 94% and taking 12.4 seconds per invocation due to unindexed sequential scans and bad join order.',
    acceptanceCriteria: [
      'EXPLAIN ANALYZE diagnosis of sequential scans',
      'Composite B-Tree index on `(tenant_id, status, created_at DESC)`',
      'Query execution latency reduced below 250ms'
    ],
    fileLabel: 'migrations/20260821_optimize_audit_index.sql',
    solutionA: {
      label: 'Solution A (Covering Composite Index)',
      description: 'Composite B-tree index eliminating sequential scan with index-only query.',
      codeSnippet: `-- migrations/20260821_optimize_audit_index.sql
-- 1. Create targeted composite index with index-only condition
CREATE INDEX CONCURRENTLY idx_audit_tenant_status_created 
ON audit_logs (tenant_id, status, created_at DESC)
INCLUDE (total_amount, user_id);

-- 2. Analyze table to refresh optimizer histogram stats
ANALYZE audit_logs;`,
      testLogs: [
        '[POSTGRES ENGINE] Running EXPLAIN (ANALYZE, BUFFERS)...',
        'BEFORE: Seq Scan on audit_logs (Cost: 0..84291.00, Time: 12421.40ms, Buffers: 42100)',
        'AFTER: Index Only Scan using idx_audit_tenant_status_created (Cost: 0..4.20, Time: 18.2ms)',
        '✓ PASS test_query_execution_time_under_250ms (18.2ms vs 12,421ms)',
        '✓ PASS test_zero_sequential_scans',
        '--------------------------------------------------',
        'OPTIMIZATION VERIFIED: 99.8% latency reduction (12.4s → 18.2ms)',
        'EVALUATION: Capability demonstrated.'
      ],
      score: 97,
      eloDelta: 18,
      eloBefore: 426,
      eloAfter: 444,
      skillDelta: 'B-Tree Indexing: 75 → 85 • Query Tuning: 78 → 86',
      readinessDelta: '32% → 37%',
      verdict: 'Capability demonstrated.',
      mentorFeedback: 'Phenomenal database engineering. Using CREATE INDEX CONCURRENTLY avoided table locks in production, reducing query time from 12s to 18ms.'
    },
    solutionB: {
      label: 'Solution B (Unindexed Regex Filter)',
      description: 'Added unindexed column filter and blocking table lock.',
      codeSnippet: `-- migrations/20260821_optimize_audit_index.sql
-- Bug 1: Non-concurrent index creates exclusive table lock
-- Bug 2: Indexing on wrong column order prevents index usage
CREATE INDEX idx_audit_created ON audit_logs (created_at);`,
      testLogs: [
        '[POSTGRES ENGINE] Running EXPLAIN (ANALYZE, BUFFERS)...',
        'AFTER: Bitmap Heap Scan on audit_logs (Time: 8,410.2ms - Seq scan still required for tenant_id)',
        '✕ FAIL test_query_execution_time_under_250ms (8,410ms exceeded 250ms limit)',
        '✕ FAIL test_non_blocking_ddl_execution (Exclusive Lock Detected)',
        '--------------------------------------------------',
        'OPTIMIZATION FAILED: Query still scans 900k rows',
        'EVALUATION: Performance below the current capability baseline.'
      ],
      score: 36,
      eloDelta: -16,
      eloBefore: 426,
      eloAfter: 410,
      skillDelta: 'B-Tree Indexing: 75 → 68 • Query Tuning: 78 → 71',
      readinessDelta: '32% → 28%',
      verdict: 'Performance below the current capability baseline.',
      mentorFeedback: 'The index on created_at alone could not be used by the optimizer due to the leading tenant_id filter predicate.'
    }
  },
  {
    id: 'cybersecurity-analyst',
    name: 'Cybersecurity Analyst',
    category: 'Security',
    environmentName: 'SOC Investigation Workstation',
    ticketId: 'Ticket #SOC-9902',
    tools: ['SIEM Log Viewer', 'Alert Queue', 'Network Events', 'Endpoint Events', 'IOC Search', 'Incident Timeline'],
    title: 'Triage Credential Stuffing & Impossible Travel Anomaly',
    scenario: 'A high-severity alert triggered: 14 failed logins followed by a successful authentication from a foreign IP within 4 minutes. Trace authentication logs, identify IOC hashes, determine breach blast radius, and execute token revocation.',
    acceptanceCriteria: [
      'Correlate IP, User-Agent, and session token hashes in SIEM',
      'Identify compromised account and lateral movement',
      'Revoke active refresh tokens and mandate password reset'
    ],
    fileLabel: 'investigations/incident_report_soc9902.json',
    solutionA: {
      label: 'Solution A (Thorough IOC Containment)',
      description: 'Correlated SIEM logs, pinpointed stolen session cookie, and revoked tokens.',
      codeSnippet: `// investigations/incident_report_soc9902.json
{
  "incident_id": "SOC-9902",
  "threat_type": "Credential Stuffing & Session Hijacking",
  "severity": "CRITICAL",
  "iocs": {
    "malicious_ip": "185.220.101.44 (Tor Exit Node)",
    "session_hash": "sha256:8f9104c8a2...",
    "affected_user": "admin.infra@enterprise.org"
  },
  "containment_actions": [
    "REVOKE_ALL_ACTIVE_SESSIONS",
    "FORCE_PASSWORD_AND_MFA_RESET",
    "BLOCK_TOR_EXIT_IPS_AT_WAF"
  ]
}`,
      testLogs: [
        '[SIEM] Executing SOC Incident Response rubric verification...',
        '✓ PASS test_ioc_correlation_accuracy (100% telemetry matched)',
        '✓ PASS test_root_cause_identification (Tor Exit node credential stuffing verified)',
        '✓ PASS test_containment_action_coverage (Active session revoked, WAF block rule deployed)',
        '--------------------------------------------------',
        'INCIDENT CONTAINED: Zero data exfiltration detected',
        'EVALUATION: Capability demonstrated.'
      ],
      score: 98,
      eloDelta: 24,
      eloBefore: 422,
      eloAfter: 446,
      skillDelta: 'SIEM Log Analysis: 78 → 88 • Incident Response: 72 → 84',
      readinessDelta: '30% → 36%',
      verdict: 'Capability demonstrated.',
      mentorFeedback: 'Exemplary SOC analysis. You linked the failed login bursts to Tor exit routing, correctly contained the session token, and initiated WAF egress blocking.'
    },
    solutionB: {
      label: 'Solution B (Superficial Triaging)',
      description: 'Marked alert as low severity without investigating subsequent session activity.',
      codeSnippet: `// investigations/incident_report_soc9902.json
{
  "incident_id": "SOC-9902",
  "threat_type": "Benign User Travel",
  "severity": "LOW",
  "containment_actions": ["NONE_REQUIRED"]
}`,
      testLogs: [
        '[SIEM] Executing SOC Incident Response rubric verification...',
        '✕ FAIL test_threat_type_identification (Missed 14 brute-force login attempts)',
        '✕ FAIL test_containment_action_coverage (Compromised session was left active in production)',
        '--------------------------------------------------',
        'INCIDENT UNRESOLVED: Active threat actor retained production access',
        'EVALUATION: Performance below the current capability baseline.'
      ],
      score: 25,
      eloDelta: -18,
      eloBefore: 422,
      eloAfter: 404,
      skillDelta: 'Threat Hunting: 75 → 66 • Incident Response: 72 → 62',
      readinessDelta: '30% → 25%',
      verdict: 'Performance below the current capability baseline.',
      mentorFeedback: 'Critical security oversight: closing the ticket as benign allowed the compromised credentials to remain active in production.'
    }
  },
  {
    id: 'ml-engineer',
    name: 'ML / AI Engineer',
    category: 'AI & ML',
    environmentName: 'Machine Learning Workstation',
    ticketId: 'Ticket #ML-5521',
    tools: ['Jupyter Notebook', 'Dataset Viewer', 'Python Editor', 'Training Console', 'Metrics', 'Experiment Tracker'],
    title: 'Tune Fraud Classification Recall Without Degrading Precision',
    scenario: 'Fraudulent transactions make up only 0.4% of total dataset volume. Standard binary cross-entropy produces 99.6% accuracy but misses 62% of real fraud. Apply Focal Loss and stratified PR-AUC threshold tuning.',
    acceptanceCriteria: [
      'Implement Focal Loss with gamma=2.0 class weight',
      'Optimize classification threshold on Precision-Recall curve',
      'Achieve Recall > 88% while keeping Precision > 80%'
    ],
    fileLabel: 'models/fraud_detector_focal.py',
    solutionA: {
      label: 'Solution A (Focal Loss & PR Threshold)',
      description: 'Focal loss addressing hard negatives with optimal F2 thresholding.',
      codeSnippet: `// models/fraud_detector_focal.py
import torch
import torch.nn as nn

class BinaryFocalLoss(nn.Module):
    def __init__(self, alpha=0.25, gamma=2.0):
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma

    def forward(self, inputs, targets):
        bce = nn.functional.binary_cross_entropy_with_logits(inputs, targets, reduction='none')
        p_t = torch.exp(-bce)
        loss = self.alpha * ((1 - p_t) ** self.gamma) * bce
        return loss.mean()`,
      testLogs: [
        '[PYTORCH EVAL] Evaluating model checkpoint on 200,000 test transactions...',
        'Baseline BCE: Accuracy 99.6%, Recall 38.2%, Precision 89.1%',
        'Focal Loss (gamma=2.0): Accuracy 99.4%, Recall 91.4%, Precision 84.8%',
        '✓ PASS test_recall_target_threshold (91.4% > 88%)',
        '✓ PASS test_precision_target_threshold (84.8% > 80%)',
        '✓ PASS test_zero_target_leakage',
        '--------------------------------------------------',
        'MODEL APPROVED FOR CANARY INFERENCE SERVING',
        'EVALUATION: Capability demonstrated.'
      ],
      score: 96,
      eloDelta: 22,
      eloBefore: 435,
      eloAfter: 457,
      skillDelta: 'PyTorch: 72 → 82 • Model Evaluation: 75 → 85',
      readinessDelta: '34% → 39%',
      verdict: 'Capability demonstrated.',
      mentorFeedback: 'Terrific ML modeling. Focal Loss down-weighted easy negative examples, allowing the model to focus on hard fraud patterns.'
    },
    solutionB: {
      label: 'Solution B (Naive Random Oversampling)',
      description: 'Random duplication before train-test split causing severe target leakage.',
      codeSnippet: `// models/fraud_detector_focal.py
# Bug: Oversampling BEFORE train/test split leaks identical test rows into training
oversampled_df = pd.concat([df, fraud_df.sample(frac=10, replace=True)])
X_train, X_test, y_train, y_test = train_test_split(oversampled_df, test_size=0.2)`,
      testLogs: [
        '[PYTORCH EVAL] Evaluating model checkpoint...',
        '✕ FAIL test_zero_target_leakage (14,200 identical rows found across train and test split)',
        '✕ FAIL test_out_of_distribution_generalization (Real world recall crashed to 22%)',
        '--------------------------------------------------',
        'MODEL REJECTED: Severe data leakage detected',
        'EVALUATION: Performance below the current capability baseline.'
      ],
      score: 35,
      eloDelta: -15,
      eloBefore: 435,
      eloAfter: 420,
      skillDelta: 'Model Evaluation: 75 → 67 • Feature Engineering: 76 → 70',
      readinessDelta: '34% → 30%',
      verdict: 'Performance below the current capability baseline.',
      mentorFeedback: 'Oversampling before the train-test split caused synthetic 100% memorization on test data that failed in real production inference.'
    }
  },
  {
    id: 'devops-engineer',
    name: 'DevOps Engineer',
    category: 'Infrastructure',
    environmentName: 'Cloud / DevOps Operations Workstation',
    ticketId: 'Ticket #OPS-6044',
    tools: ['Terminal', 'Git', 'CI/CD Pipeline', 'Container Logs', 'Deployment Console', 'Monitoring', 'Infrastructure Config'],
    title: 'Fix Kubernetes CrashLoopBackOff & Canary 503 Outage',
    scenario: 'Canary pod rollouts for the billing service are crashing with CrashLoopBackOff due to a missing readiness probe graceful connection drain timeout.',
    acceptanceCriteria: [
      'Configure readiness and liveness HTTP probes',
      'Add preStop lifecycle hook with sleep 15s connection drain',
      'Zero dropped HTTP 503 connections during rolling update'
    ],
    fileLabel: 'k8s/billing-service-deployment.yaml',
    solutionA: {
      label: 'Solution A (Graceful Termination Probe)',
      description: 'preStop sleep 15s hook with tuned readiness probe and zero-downtime rolling update.',
      codeSnippet: `// k8s/billing-service-deployment.yaml
spec:
  containers:
  - name: billing-service
    image: registry.capabilio.ai/billing:v2.4.1
    lifecycle:
      preStop:
        exec:
          command: ["/bin/sh", "-c", "sleep 15"]
    readinessProbe:
      httpGet:
        path: /healthz
        port: 8080
      initialDelaySeconds: 5
      periodSeconds: 3
    terminationGracePeriodSeconds: 30`,
      testLogs: [
        '[K8S CLUSTER] Simulating rolling update with continuous 1,000 req/sec load...',
        '✓ PASS test_rolling_update_zero_dropped_packets (0 errors / 50,000 requests)',
        '✓ PASS test_readiness_probe_traffic_routing_timing (5s delay satisfied)',
        '✓ PASS test_prestop_lifecycle_graceful_drain (15s drain executed)',
        '--------------------------------------------------',
        'ROLLOUT SUCCEEDED: 100% traffic continuity maintained',
        'EVALUATION: Capability demonstrated.'
      ],
      score: 95,
      eloDelta: 18,
      eloBefore: 430,
      eloAfter: 448,
      skillDelta: 'Docker & Containers: 80 → 86 • Kubernetes: 68 → 78',
      readinessDelta: '32% → 37%',
      verdict: 'Capability demonstrated.',
      mentorFeedback: 'Flawless Kubernetes deployment configuration. The preStop lifecycle hook prevented upstream ingress proxies from routing to terminating pods.'
    },
    solutionB: {
      label: 'Solution B (Immediate Pod Termination)',
      description: 'Zero termination grace period causing instant SIGKILL and severed HTTP connections.',
      codeSnippet: `// k8s/billing-service-deployment.yaml
spec:
  containers:
  - name: billing-service
    # Bug: terminationGracePeriodSeconds 0 sends immediate SIGKILL
    terminationGracePeriodSeconds: 0`,
      testLogs: [
        '[K8S CLUSTER] Simulating rolling update with continuous 1,000 req/sec load...',
        '✕ FAIL test_rolling_update_zero_dropped_packets (2,840 HTTP 502/503 errors detected)',
        '✕ FAIL test_graceful_connection_drain (In-flight database transactions aborted)',
        '--------------------------------------------------',
        'ROLLOUT FAILED: Production outage during canary replacement',
        'EVALUATION: Performance below the current capability baseline.'
      ],
      score: 38,
      eloDelta: -14,
      eloBefore: 430,
      eloAfter: 416,
      skillDelta: 'Kubernetes: 68 → 61 • Linux Sysadmin: 82 → 76',
      readinessDelta: '32% → 28%',
      verdict: 'Performance below the current capability baseline.',
      mentorFeedback: 'Setting terminationGracePeriodSeconds to 0 immediately killed active in-flight transactions without allowing connections to drain.'
    }
  }
];

export function LandingLiveArenaDemo() {
  const [selectedRoleId, setSelectedRoleId] = useState('software-engineer');
  const [selectedSolution, setSelectedSolution] = useState<'correct' | 'flawed'>('correct');
  const [isRunning, setIsRunning] = useState(false);
  const [testOutput, setTestOutput] = useState<string[]>([]);
  const [evaluationState, setEvaluationState] = useState<'idle' | 'running' | 'evaluated'>('idle');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const currentScenario = ARENA_ROLE_SCENARIOS.find(s => s.id === selectedRoleId) || ARENA_ROLE_SCENARIOS[0]!;
  const activeSolution = selectedSolution === 'correct' ? currentScenario.solutionA : currentScenario.solutionB;

  const handleRoleChange = (roleId: string) => {
    setSelectedRoleId(roleId);
    setSelectedSolution('correct');
    setIsRunning(false);
    setEvaluationState('idle');
    setIsSubmitted(false);
    setTestOutput([]);
  };

  const handleRunTests = () => {
    setIsRunning(true);
    setEvaluationState('running');
    setTestOutput(['[INIT] Spawning isolated Capabilio sandbox container...', `[RUN] Initializing ${currentScenario.environmentName}...`]);

    setTimeout(() => {
      setTestOutput(activeSolution.testLogs);
      setEvaluationState('evaluated');
      setIsRunning(false);
    }, 1000);
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
  };

  const handleReset = () => {
    setIsRunning(false);
    setEvaluationState('idle');
    setIsSubmitted(false);
    setTestOutput([]);
  };

  return (
    <section id="arena-demo" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-border bg-gradient-to-b from-background via-card/50 to-background relative overflow-hidden">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/60 text-xs font-mono text-brand font-semibold">
            <Cpu className="w-3.5 h-3.5" />
            <span>ROLE-CENTRIC ARENA WORKSTATION SIMULATOR</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
            Don&apos;t practice coding. Practice the job.
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed font-sans">
            Every career discipline operates in its own dedicated workstation with real tools, authentic sprint tickets, and deterministic scoring. Experience both positive and negative ELO calibrations.
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="flex items-center justify-start sm:justify-center overflow-x-auto gap-2 py-2 no-scrollbar">
          {ARENA_ROLE_SCENARIOS.map((role) => {
            const isSelected = role.id === currentScenario.id;
            return (
              <button
                key={role.id}
                onClick={() => handleRoleChange(role.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-mono whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-brand text-white font-bold shadow-md shadow-brand/20 scale-[1.02]'
                    : 'bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border'
                }`}
              >
                <span>{role.name}</span>
              </button>
            );
          })}
        </div>

        {/* Workstation Container */}
        <div className="rounded-3xl border-2 border-border bg-card shadow-2xl overflow-hidden text-left">
          
          {/* Workstation Top Bar */}
          <div className="bg-muted/80 border-b border-border px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <span className="font-bold text-foreground uppercase">{currentScenario.environmentName}</span>
              <span className="text-muted-foreground hidden sm:inline">• {currentScenario.ticketId}</span>
            </div>

            {/* Solution Selector */}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Select Solution:</span>
              <button
                onClick={() => { setSelectedSolution('correct'); handleReset(); }}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  selectedSolution === 'correct' 
                    ? 'bg-emerald-500 text-white font-bold' 
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {currentScenario.solutionA.label}
              </button>
              <button
                onClick={() => { setSelectedSolution('flawed'); handleReset(); }}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  selectedSolution === 'flawed' 
                    ? 'bg-red-500 text-white font-bold' 
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {currentScenario.solutionB.label}
              </button>
            </div>
          </div>

          {/* Active Tools Navigation Bar */}
          <div className="bg-muted/40 border-b border-border px-5 py-2 flex items-center gap-2 overflow-x-auto text-[11px] font-mono text-muted-foreground no-scrollbar">
            <span className="font-bold text-foreground uppercase mr-2 flex items-center gap-1">
              <Sliders className="w-3 h-3 text-brand" />
              <span>Active Tools:</span>
            </span>
            {currentScenario.tools.map((t, idx) => (
              <span key={idx} className="px-2 py-0.5 rounded bg-muted border border-border/80 whitespace-nowrap">
                {t}
              </span>
            ))}
          </div>

          {/* Workstation Body Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border">
            
            {/* Left: Task Brief & Objectives (4 cols) */}
            <div className="lg:col-span-4 p-5 sm:p-6 space-y-4 bg-muted/20 text-xs font-sans">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-brand font-bold">
                  Sprint Mission Brief
                </span>
                <h3 className="font-bold text-sm text-foreground">
                  {currentScenario.title}
                </h3>
              </div>

              <p className="text-muted-foreground leading-relaxed">
                {currentScenario.scenario}
              </p>

              <div className="space-y-2 pt-2 border-t border-border">
                <span className="text-[10px] font-mono uppercase text-muted-foreground font-bold">
                  Acceptance Criteria
                </span>
                <div className="space-y-1.5 font-mono text-[11px]">
                  {currentScenario.acceptanceCriteria.map((crit, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-foreground">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{crit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border space-y-1 text-2xs font-mono">
                <div className="text-muted-foreground">ROLE CALIBRATION BENCHMARK</div>
                <div className="text-foreground font-bold">{currentScenario.name} · Level Junior &rarr; Mid</div>
              </div>
            </div>

            {/* Right: Code/Artifact Editor + Terminal (8 cols) */}
            <div className="lg:col-span-8 flex flex-col justify-between bg-card">
              
              {/* File Title Bar */}
              <div className="bg-muted/40 border-b border-border px-4 py-2 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 text-foreground font-semibold">
                  <FileCode2 className="w-4 h-4 text-brand" />
                  <span>{currentScenario.fileLabel}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {selectedSolution === 'correct' ? 'Branch: fix/defensive-impl' : 'Branch: bug/flawed-patch'}
                </span>
              </div>

              {/* Code Snippet Viewer */}
              <div className="p-4 sm:p-5 font-mono text-xs overflow-x-auto bg-[#0D1117] text-[#E6EDF3] leading-relaxed border-b border-border">
                <pre className="selection:bg-brand selection:text-white">
                  <code>{activeSolution.codeSnippet}</code>
                </pre>
              </div>

              {/* Controls Bar */}
              <div className="p-4 bg-muted/40 border-b border-border flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRunTests}
                    disabled={isRunning}
                    className="px-4 py-2 rounded-xl bg-foreground hover:bg-foreground/90 text-background font-bold flex items-center gap-2 shadow-xs transition-all disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isRunning ? 'Running Assertions...' : 'Run Deterministic Tests'}</span>
                  </button>

                  <button
                    onClick={handleReset}
                    className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Reset Simulator"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={evaluationState !== 'evaluated' || isSubmitted}
                  className="px-5 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold flex items-center gap-2 shadow-xs transition-all disabled:opacity-40"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isSubmitted ? 'Work Evaluated' : 'Submit to Arena'}</span>
                </button>
              </div>

              {/* Terminal Output Area */}
              <div className="p-4 sm:p-5 bg-graphite-950 font-mono text-xs text-graphite-200 min-h-[140px] space-y-1 overflow-x-auto">
                <div className="flex items-center justify-between text-2xs text-graphite-400 border-b border-graphite-800 pb-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <TerminalIcon className="w-3.5 h-3.5 text-brand" />
                    <span>SANDBOX TEST RUNNER TERMINAL</span>
                  </div>
                  <span>Deterministic Engine</span>
                </div>

                {testOutput.length === 0 ? (
                  <div className="text-graphite-500 italic py-4 text-center">
                    Click &quot;Run Deterministic Tests&quot; to execute test assertions in the isolated sandbox.
                  </div>
                ) : (
                  testOutput.map((line, idx) => (
                    <div 
                      key={idx} 
                      className={`leading-relaxed ${
                        line.includes('✓ PASS') ? 'text-emerald-400 font-bold' :
                        line.includes('✕ FAIL') ? 'text-red-400 font-bold' :
                        line.includes('SUITE PASSED') ? 'text-emerald-300 font-extrabold bg-emerald-500/10 p-1 rounded' :
                        line.includes('SUITE FAILED') ? 'text-red-300 font-extrabold bg-red-500/10 p-1 rounded' :
                        'text-graphite-300'
                      }`}
                    >
                      {line}
                    </div>
                  ))
                )}
              </div>

              {/* Dynamic Post-Submission Evaluation Panel */}
              {isSubmitted && (
                <div className={`border-t-2 ${selectedSolution === 'correct' ? 'border-brand/50' : 'border-red-500/50'} bg-card p-5 sm:p-6 space-y-4 animate-fade-in`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {selectedSolution === 'correct' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <span className="font-mono font-bold text-sm text-foreground">
                        ARENA EVALUATION: {selectedSolution === 'correct' ? `SCORE ${activeSolution.score} / 100` : `SCORE ${activeSolution.score} / 100`}
                      </span>
                    </div>

                    <div className={`flex items-center gap-2 font-mono text-xs font-bold px-3 py-1 rounded-md ${
                      selectedSolution === 'correct' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
                    }`}>
                      <span>{activeSolution.verdict}</span>
                    </div>
                  </div>

                  {/* ELO & Telemetry Delta Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
                    <div className="p-3 rounded-xl bg-muted/40 border border-border">
                      <div className="text-[10px] text-muted-foreground uppercase">Previous ELO</div>
                      <div className="text-lg font-bold text-foreground">{activeSolution.eloBefore}</div>
                    </div>

                    <div className={`p-3 rounded-xl border ${
                      selectedSolution === 'correct' 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' 
                        : 'bg-red-500/10 border-red-500/30 text-red-600'
                    }`}>
                      <div className="text-[10px] uppercase font-bold">
                        {selectedSolution === 'correct' ? 'ELO GAIN' : 'ELO DECREASE'}
                      </div>
                      <div className="text-xl font-black flex items-center justify-center gap-1">
                        {selectedSolution === 'correct' ? (
                          <>
                            <TrendingUp className="w-4 h-4" />
                            <span>+{activeSolution.eloDelta} ELO ({activeSolution.eloAfter})</span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="w-4 h-4" />
                            <span>{activeSolution.eloDelta} ELO ({activeSolution.eloAfter})</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/40 border border-border">
                      <div className="text-[10px] text-muted-foreground uppercase">Skill Impact</div>
                      <div className="text-2xs font-bold text-foreground pt-0.5">
                        {activeSolution.skillDelta}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/40 border border-border">
                      <div className="text-[10px] text-muted-foreground uppercase">Job Readiness</div>
                      <div className={`text-lg font-bold ${selectedSolution === 'correct' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {activeSolution.readinessDelta}
                      </div>
                    </div>
                  </div>

                  {/* Warning on Negative ELO */}
                  {selectedSolution === 'flawed' && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-mono flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>⚠️ Skill regression detected. Performance below the current capability baseline.</span>
                    </div>
                  )}

                  {/* AI Mentor Feedback Box */}
                  <div className="p-4 rounded-2xl bg-muted/30 border border-border flex items-start gap-3 text-xs">
                    <Lightbulb className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-bold text-foreground font-mono">
                        AI STAFF MENTOR SYNTHESIS
                      </div>
                      <p className="text-muted-foreground leading-relaxed font-sans">
                        {activeSolution.mentorFeedback}
                      </p>
                    </div>
                  </div>

                </div>
              )}

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}

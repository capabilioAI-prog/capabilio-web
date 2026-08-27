'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Swords, 
  Terminal, 
  Code2, 
  Database, 
  ShieldCheck, 
  Layers, 
  CheckCircle2, 
  ArrowRight, 
  Play, 
  Sparkles,
  Search,
  Activity,
  Cpu
} from 'lucide-react';

interface RoleWorkstationData {
  id: string;
  name: string;
  category: string;
  sprint: string;
  team: string;
  ticket: string;
  priority: string;
  environment: string;
  repo: string;
  description: string;
  panels: string[];
  sampleCode: string;
  toolset: string[];
}

const ROLE_WORKSTATIONS: RoleWorkstationData[] = [
  {
    id: 'swe',
    name: 'Software Engineer',
    category: 'Software Engineering',
    team: 'Payments Engineering',
    sprint: 'Checkout Reliability',
    ticket: 'BUG #1842: Checkout fails when discount coupon expires',
    priority: 'P2 - High',
    environment: 'Staging / Sandbox',
    repo: 'checkout-service',
    description: 'Investigate the unhandled promise rejection in the payment calculation service when a coupon passes expiration time during concurrent user sessions.',
    panels: ['Monaco Code Editor', 'Live Terminal', 'Jest Assertion Runner', 'Git Diff Inspector'],
    sampleCode: `// packages/checkout/src/discount.ts
export function calculateOrderTotal(subtotal: number, coupon?: Coupon): number {
  if (!coupon) return subtotal;
  if (coupon.isExpired(new Date())) {
    throw new Error('COUPON_EXPIRED'); // Fixed: Return graceful fallback
  }
  return Math.max(0, subtotal - coupon.discountAmount);
}`,
    toolset: ['TypeScript', 'Node.js', 'Jest', 'Git', 'AI Staff Mentor']
  },
  {
    id: 'da',
    name: 'Data Analyst',
    category: 'Data & Analytics',
    team: 'Merchant Growth Squad',
    sprint: 'Q3 Revenue Diagnostic',
    ticket: 'ANALYSIS #309: Investigate 14% revenue drop in Southeast region',
    priority: 'P1 - Urgent',
    environment: 'PostgreSQL Analytics Warehouse',
    repo: 'merchant-bi-warehouse',
    description: 'Write SQL queries to isolate transaction drop-offs across regional payment gateways and determine if checkout latency caused merchant churn.',
    panels: ['SQL Query Studio', 'Dataset Explorer', 'Result Data Table', 'Cohort Graph'],
    sampleCode: `SELECT 
  merchant_region,
  DATE_TRUNC('day', transaction_time) AS tx_date,
  COUNT(*) FILTER (WHERE status = 'FAILED') AS failed_tx,
  ROUND(AVG(latency_ms), 2) AS avg_gateway_latency
FROM merchant_transactions
WHERE transaction_time >= NOW() - INTERVAL '30 days'
GROUP BY 1, 2
HAVING AVG(latency_ms) > 1500
ORDER BY tx_date DESC;`,
    toolset: ['SQL', 'PostgreSQL', 'Pandas', 'Data Viz', 'Cohort Analysis']
  },
  {
    id: 'cyber',
    name: 'Cybersecurity Analyst',
    category: 'Cybersecurity & SecOps',
    team: 'SOC Operations',
    sprint: 'Incident Containment',
    ticket: 'ALERT #592: SSH Brute-Force Spike on Auth Gateway',
    priority: 'P1 - Critical',
    environment: 'SIEM Log Analyzer',
    repo: 'secops-gateway-auth',
    description: 'Inspect Linux authentication logs in /var/log/auth.log, extract attacker IP addresses, check threat intelligence hashes, and deploy firewall drop rules.',
    panels: ['SIEM Log Stream', 'IOC Threat Hunter', 'Firewall Rule Console', 'Incident Memo'],
    sampleCode: `// /var/log/auth.log Log Triage Parser
const attackerIps = logs
  .filter(log => log.includes('Failed password for root'))
  .map(log => extractIpAddress(log))
  .reduce((acc, ip) => ({ ...acc, [ip]: (acc[ip] || 0) + 1 }), {});

// Detected IP: 198.51.100.42 (487 attempts / 2 min)
// Action: Isolated via iptables drop rule`,
    toolset: ['SIEM', 'Linux Logs', 'IOC Correlation', 'Incident Triage', 'Network Security']
  },
  {
    id: 'frontend',
    name: 'Frontend Developer',
    category: 'Frontend & UI',
    team: 'Design Systems & Web',
    sprint: 'Cart Accessibility & Performance',
    ticket: 'BUG #2104: Shopping cart modal traps focus on mobile devices',
    priority: 'P2 - Medium',
    environment: 'Next.js Browser Preview',
    repo: 'client-storefront-web',
    description: 'Fix modal focus trapping, eliminate unnecessary cart re-renders with useMemo, and verify WCAG 2.1 AA keyboard navigation standards.',
    panels: ['React Component Tree', 'Live DOM Preview', 'a11y Inspector', 'Console Output'],
    sampleCode: `// components/cart/CartDrawer.tsx
export function CartDrawer({ isOpen, onClose }: Props) {
  const drawerRef = useFocusTrap(isOpen);
  return (
    <div role="dialog" aria-modal="true" aria-label="Your Cart" ref={drawerRef}>
      <button onClick={onClose} aria-label="Close cart">✕</button>
      {/* Accessible cart items */}
    </div>
  );
}`,
    toolset: ['React', 'Next.js', 'Tailwind CSS', 'a11y ARIA', 'DevTools']
  },
  {
    id: 'dba',
    name: 'Database Administrator',
    category: 'Database Systems',
    team: 'Infrastructure & DB Squad',
    sprint: 'High-Traffic Query Optimization',
    ticket: 'PERF #884: Order history query causes 100% CPU lock',
    priority: 'P1 - High',
    environment: 'PostgreSQL 16 Engine',
    repo: 'db-cluster-primary',
    description: 'Run EXPLAIN ANALYZE on slow order lookup query, replace sequential scan with a composite B-Tree index, and configure Point-In-Time-Recovery (PITR).',
    panels: ['SQL Execution Plan', 'Index Performance Monitor', 'Lock Inspector', 'WAL Archive'],
    sampleCode: `-- Eliminate Sequential Scan on 10M rows
EXPLAIN ANALYZE 
SELECT * FROM orders 
WHERE customer_id = 42 AND status = 'SHIPPED' 
ORDER BY order_date DESC;

-- Solution: Create composite index
CREATE INDEX idx_orders_customer_status_date 
ON orders (customer_id, status, order_date DESC);`,
    toolset: ['PostgreSQL', 'EXPLAIN ANALYZE', 'B-Tree Indexes', 'PITR Recovery', 'ACID Locks']
  },
  {
    id: 'ml',
    name: 'ML / AI Engineer',
    category: 'Machine Learning',
    team: 'AI Product Intelligence',
    sprint: 'Churn Prediction Model',
    ticket: 'MODEL #412: Improve customer churn recall without degrading precision',
    priority: 'P2 - High',
    environment: 'Python ML Notebook',
    repo: 'ml-churn-pipeline',
    description: 'Preprocess customer behavior telemetry, handle imbalanced class weights with SMOTE, and evaluate model performance using ROC-AUC and F1 curves.',
    panels: ['Jupyter Notebook', 'Feature Importance Matrix', 'ROC-AUC Curve', 'Model Evaluator'],
    sampleCode: `# Train Random Forest with Class Weights
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report

clf = RandomForestClassifier(class_weight='balanced', random_state=42)
clf.fit(X_train_scaled, y_train)

# Achieved: F1-Score: 0.88 | Precision: 0.86 | Recall: 0.91`,
    toolset: ['Python', 'Scikit-Learn', 'Pandas', 'Feature Engineering', 'ROC-AUC']
  }
];

export function LandingArenaWorkstation() {
  const [selectedRoleId, setSelectedRoleId] = useState('swe');
  const role = ROLE_WORKSTATIONS.find(r => r.id === selectedRoleId) || ROLE_WORKSTATIONS[0]!;

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
      
      {/* Header */}
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <span className="text-xs font-mono font-bold uppercase tracking-widest text-brand">
          ROLE-CENTRIC WORKSTATION SIMULATION
        </span>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Don&apos;t practice coding. Practice the job.
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Step into role-specific workspaces designed to feel like your first day on the job. Students don&apos;t just answer trivia—they investigate sprint tickets, write code, pass test assertions, and earn ELO.
        </p>
      </div>

      {/* Role Selection Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto">
        {ROLE_WORKSTATIONS.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedRoleId(r.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedRoleId === r.id
                ? 'bg-brand text-white shadow-md'
                : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {r.name}
          </button>
        ))}
      </div>

      {/* Workstation Visual Container */}
      <div className="rounded-3xl border-2 border-border bg-graphite-950 text-graphite-100 shadow-2xl overflow-hidden text-left animate-fade-in">
        
        {/* Workstation Window Bar */}
        <div className="px-5 py-3.5 bg-graphite-900 border-b border-graphite-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <span className="font-mono text-[11px] text-graphite-400 pl-2">
              capabilio-workstation // {role.category}
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="px-2 py-0.5 rounded bg-brand/20 text-brand font-bold">
              {role.team}
            </span>
            <span className="text-graphite-400">Sprint: {role.sprint}</span>
          </div>
        </div>

        {/* Workstation Body */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Ticket Information Bar */}
          <div className="p-4 rounded-2xl bg-graphite-900/80 border border-graphite-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">
                  {role.priority}
                </span>
                <span className="text-xs font-mono text-graphite-400">
                  Repo: {role.repo} • Env: {role.environment}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                {role.ticket}
              </h3>
              <p className="text-xs text-graphite-300 leading-relaxed max-w-3xl">
                {role.description}
              </p>
            </div>

            <Link
              href="/arena"
              className="px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-1.5 shrink-0"
            >
              <span>Enter the Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Code / Tool Workspace Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Code Snippet */}
            <div className="lg:col-span-8 p-4 rounded-2xl bg-black/60 border border-graphite-800 font-mono text-xs overflow-x-auto space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-graphite-800 text-[10px] text-graphite-400">
                <span>{role.repo} // main</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Test Runner Ready
                </span>
              </div>
              <pre className="text-graphite-200 leading-relaxed">{role.sampleCode}</pre>
            </div>

            {/* Right: Available Tools & Execution Panels */}
            <div className="lg:col-span-4 p-5 rounded-2xl bg-graphite-900/60 border border-graphite-800 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-[10px] font-mono uppercase text-brand font-bold block">
                  ACTIVE WORKSTATION PANELS
                </span>
                <div className="space-y-1.5 text-xs text-graphite-200">
                  {role.panels.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-brand" />
                      <span>{p}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-graphite-800 space-y-2">
                  <span className="text-[10px] font-mono uppercase text-graphite-400 font-bold block">
                    EMBEDDED TOOLS & STACK
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {role.toolset.map(t => (
                      <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded bg-graphite-800 text-graphite-300">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-graphite-800">
                <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand" />
                  <span>AI Staff Mentor Available</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

    </section>
  );
}

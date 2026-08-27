'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  CheckCircle2, 
  TrendingUp, 
  Terminal, 
  Sparkles, 
  Code2, 
  Award, 
  ArrowRight,
  Zap,
  Circle,
  Database,
  Layers,
  BarChart3,
  Cpu,
  Lock,
  GitBranch,
  Compass
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export interface RoleHeroProfile {
  id: string;
  name: string;
  category: string;
  startingElo: number;
  currentElo: number;
  eloDelta: number;
  readiness: number;
  demonstratedSkillsCount: number;
  totalSkillsCount: number;
  evidenceCount: number;
  skills: Array<{ name: string; score: number }>;
  recentProof: Array<{ title: string; status: 'completed' | 'in_progress' }>;
  nextBestAction: string;
}

export const HERO_ROLES: RoleHeroProfile[] = [
  {
    id: 'software-engineer',
    name: 'Software Engineer',
    category: 'Engineering',
    startingElo: 400,
    currentElo: 428,
    eloDelta: 28,
    readiness: 31,
    demonstratedSkillsCount: 12,
    totalSkillsCount: 24,
    evidenceCount: 18,
    skills: [
      { name: 'JavaScript', score: 72 },
      { name: 'TypeScript', score: 68 },
      { name: 'APIs & REST', score: 75 },
      { name: 'Git Workflow', score: 81 },
      { name: 'Debugging', score: 74 },
      { name: 'Testing', score: 65 }
    ],
    recentProof: [
      { title: 'REST API endpoint rate limiting', status: 'completed' },
      { title: 'Auth middleware token regression fix', status: 'completed' },
      { title: 'PostgreSQL connection pool optimization', status: 'in_progress' }
    ],
    nextBestAction: 'Fix authentication middleware regression in Arena'
  },
  {
    id: 'full-stack-developer',
    name: 'Full Stack Developer',
    category: 'Engineering',
    startingElo: 400,
    currentElo: 436,
    eloDelta: 36,
    readiness: 34,
    demonstratedSkillsCount: 14,
    totalSkillsCount: 24,
    evidenceCount: 21,
    skills: [
      { name: 'React / Next.js', score: 76 },
      { name: 'Node.js Backend', score: 70 },
      { name: 'PostgreSQL & ORM', score: 68 },
      { name: 'REST & GraphQL', score: 74 },
      { name: 'Tailwind CSS', score: 80 },
      { name: 'Docker Containers', score: 55 }
    ],
    recentProof: [
      { title: 'Full-stack CRUD with Drizzle ORM', status: 'completed' },
      { title: 'Next.js App Router SSR cache tuning', status: 'completed' },
      { title: 'WebSocket live telemetry sync', status: 'in_progress' }
    ],
    nextBestAction: 'Integrate transactional webhook processor in Arena'
  },
  {
    id: 'frontend-developer',
    name: 'Frontend Developer',
    category: 'Engineering',
    startingElo: 400,
    currentElo: 425,
    eloDelta: 25,
    readiness: 30,
    demonstratedSkillsCount: 11,
    totalSkillsCount: 20,
    evidenceCount: 16,
    skills: [
      { name: 'React.js Architecture', score: 78 },
      { name: 'TypeScript Types', score: 70 },
      { name: 'Responsive Tailwind', score: 85 },
      { name: 'Web Accessibility (a11y)', score: 65 },
      { name: 'State Management', score: 72 },
      { name: 'Core Web Vitals', score: 60 }
    ],
    recentProof: [
      { title: 'Dynamic data-table with server filters', status: 'completed' },
      { title: 'WCAG 2.1 AA keyboard navigation fix', status: 'completed' },
      { title: 'Layout shift & LCP hero optimization', status: 'in_progress' }
    ],
    nextBestAction: 'Build responsive modal drawer with focus traps'
  },
  {
    id: 'backend-developer',
    name: 'Backend Developer',
    category: 'Engineering',
    startingElo: 400,
    currentElo: 432,
    eloDelta: 32,
    readiness: 33,
    demonstratedSkillsCount: 13,
    totalSkillsCount: 22,
    evidenceCount: 19,
    skills: [
      { name: 'Node.js & Express', score: 75 },
      { name: 'PostgreSQL Relational DB', score: 72 },
      { name: 'Microservices & Events', score: 65 },
      { name: 'Redis Cache Strategies', score: 68 },
      { name: 'JWT & OAuth2 Auth', score: 80 },
      { name: 'System Design Basics', score: 62 }
    ],
    recentProof: [
      { title: 'JWT token rotation middleware', status: 'completed' },
      { title: 'Redis caching layer for hot endpoints', status: 'completed' },
      { title: 'Distributed rate limiting with Redis', status: 'in_progress' }
    ],
    nextBestAction: 'Implement sliding-window token bucket in Arena'
  },
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    category: 'Analytics',
    startingElo: 400,
    currentElo: 420,
    eloDelta: 20,
    readiness: 29,
    demonstratedSkillsCount: 10,
    totalSkillsCount: 20,
    evidenceCount: 15,
    skills: [
      { name: 'SQL Aggregations & Joins', score: 78 },
      { name: 'Python & Pandas', score: 74 },
      { name: 'Data Visualization', score: 80 },
      { name: 'Hypothesis Testing', score: 65 },
      { name: 'Business Metrics & KPI', score: 70 },
      { name: 'Dashboard Design', score: 62 }
    ],
    recentProof: [
      { title: 'Cohort retention & churn analysis SQL', status: 'completed' },
      { title: 'Revenue anomaly exploratory data script', status: 'completed' },
      { title: 'Interactive KPI report with breakdown', status: 'in_progress' }
    ],
    nextBestAction: 'Investigate why weekly revenue dropped 12%'
  },
  {
    id: 'database-administrator',
    name: 'Database Administrator',
    category: 'Infrastructure',
    startingElo: 400,
    currentElo: 426,
    eloDelta: 26,
    readiness: 32,
    demonstratedSkillsCount: 12,
    totalSkillsCount: 22,
    evidenceCount: 17,
    skills: [
      { name: 'Advanced SQL Querying', score: 82 },
      { name: 'B-Tree & GIN Indexing', score: 75 },
      { name: 'Query Optimization & EXPLAIN', score: 78 },
      { name: 'Backup & Recovery (WAL)', score: 70 },
      { name: 'PostgreSQL Administration', score: 76 },
      { name: 'Read Replica Setup', score: 60 }
    ],
    recentProof: [
      { title: 'Composite index tuning for slow queries', status: 'completed' },
      { title: 'Dead tuple vacuum & table bloat fix', status: 'completed' },
      { title: 'Point-in-time recovery simulation', status: 'in_progress' }
    ],
    nextBestAction: 'Investigate a production query regression with EXPLAIN ANALYZE'
  },
  {
    id: 'ml-engineer',
    name: 'ML / AI Engineer',
    category: 'AI & ML',
    startingElo: 400,
    currentElo: 435,
    eloDelta: 35,
    readiness: 34,
    demonstratedSkillsCount: 13,
    totalSkillsCount: 24,
    evidenceCount: 20,
    skills: [
      { name: 'Python Numerical Stack', score: 80 },
      { name: 'PyTorch Model Dev', score: 72 },
      { name: 'Model Evaluation Metrics', score: 75 },
      { name: 'RAG & Vector Embeddings', score: 70 },
      { name: 'Feature Engineering', score: 76 },
      { name: 'MLOps Pipeline Deployment', score: 60 }
    ],
    recentProof: [
      { title: 'Vector search cosine similarity index', status: 'completed' },
      { title: 'Imbalanced dataset F1-score optimization', status: 'completed' },
      { title: 'Model latency 8-bit quantization', status: 'in_progress' }
    ],
    nextBestAction: 'Optimize RAG vector chunk retrieval recall'
  },
  {
    id: 'cybersecurity-analyst',
    name: 'Cybersecurity Analyst',
    category: 'Security',
    startingElo: 400,
    currentElo: 422,
    eloDelta: 22,
    readiness: 30,
    demonstratedSkillsCount: 10,
    totalSkillsCount: 20,
    evidenceCount: 15,
    skills: [
      { name: 'Threat Hunting & IOCs', score: 75 },
      { name: 'SIEM Log Analysis', score: 78 },
      { name: 'Network Security & PCAP', score: 70 },
      { name: 'Incident Response Triaging', score: 72 },
      { name: 'Vulnerability Scanning', score: 68 },
      { name: 'IAM & RBAC Audit', score: 65 }
    ],
    recentProof: [
      { title: 'Brute-force SSH attack triaging in SIEM', status: 'completed' },
      { title: 'Firewall egress anomaly containment', status: 'completed' },
      { title: 'Malicious payload reverse-engineer drill', status: 'in_progress' }
    ],
    nextBestAction: 'Triage privilege escalation attempt in audit logs'
  },
  {
    id: 'devops-engineer',
    name: 'DevOps Engineer',
    category: 'Infrastructure',
    startingElo: 400,
    currentElo: 430,
    eloDelta: 30,
    readiness: 32,
    demonstratedSkillsCount: 12,
    totalSkillsCount: 22,
    evidenceCount: 18,
    skills: [
      { name: 'Docker & OCI Containers', score: 80 },
      { name: 'CI/CD Pipeline Automation', score: 76 },
      { name: 'Kubernetes Orchestration', score: 68 },
      { name: 'Linux Sysadmin & Bash', score: 82 },
      { name: 'Terraform & IaC', score: 70 },
      { name: 'Prometheus & Grafana Alerting', score: 72 }
    ],
    recentProof: [
      { title: 'Multi-stage Docker caching pipeline', status: 'completed' },
      { title: 'Kubernetes rolling update rollout YAML', status: 'completed' },
      { title: 'Prometheus synthetic monitor setup', status: 'in_progress' }
    ],
    nextBestAction: 'Fix container crashloop backoff during canary rollout'
  }
];

const DEFAULT_ROLE = HERO_ROLES[0]!;

export function LandingHeroCard() {
  const { isAuthenticated } = useAuth();
  const [selectedRoleId, setSelectedRoleId] = useState('software-engineer');
  const [animatedElo, setAnimatedElo] = useState(400);
  const [animatedReadiness, setAnimatedReadiness] = useState(0);

  const activeRole = HERO_ROLES.find(r => r.id === selectedRoleId) ?? DEFAULT_ROLE;

  // Animate numbers whenever role changes
  useEffect(() => {
    const targetElo = activeRole.currentElo;
    const targetReadiness = activeRole.readiness;

    const eloStep = Math.ceil((targetElo - 400) / 10) || 1;
    const readinessStep = Math.ceil(targetReadiness / 10) || 1;

    setAnimatedElo(400);
    setAnimatedReadiness(0);

    const interval = setInterval(() => {
      setAnimatedElo(prev => {
        if (prev < targetElo) return Math.min(prev + eloStep, targetElo);
        return targetElo;
      });
      setAnimatedReadiness(prev => {
        if (prev < targetReadiness) return Math.min(prev + readinessStep, targetReadiness);
        return targetReadiness;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [selectedRoleId, activeRole]);

  // Center (130, 130), Radius 56 for polygon, Radius 72 for labels
  const CENTER = 130;
  const MAX_R = 56;
  const LABEL_R = 74;

  const radarPoints = activeRole.skills.map((skill, index) => {
    const angle = (Math.PI * 2 / activeRole.skills.length) * index - Math.PI / 2;
    const distance = (skill.score / 100) * MAX_R;
    const x = CENTER + Math.cos(angle) * distance;
    const y = CENTER + Math.sin(angle) * distance;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <div className="w-full max-w-5xl mx-auto rounded-3xl border-2 border-border bg-gradient-to-b from-card via-card to-muted/20 shadow-2xl p-5 sm:p-7 space-y-6 text-left relative overflow-hidden backdrop-blur-xs">
      
      {/* Top Bar: Role Switcher Tabs & Live Verification Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
            LIVING CAREER PROOF CONSOLE
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
            {isAuthenticated ? 'Authenticated Live Profile' : 'Interactive Demo Mode'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono px-2.5 py-1 rounded-md bg-brand/10 text-brand font-bold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>CRYPTOGRAPHICALLY VERIFIED</span>
        </div>
      </div>

      {/* Role Switcher Pill Matrix */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider flex items-center justify-between">
          <span>Select Career Track to Explore Live Telemetry:</span>
          <span className="text-brand font-bold">{activeRole.name} Track</span>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {HERO_ROLES.map((r) => {
            const isSelected = r.id === activeRole.id;
            return (
              <button
                key={r.id}
                onClick={() => setSelectedRoleId(r.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-brand text-white font-bold shadow-md shadow-brand/20 scale-[1.02]'
                    : 'bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60'
                }`}
              >
                <span>{r.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Metric Telemetry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-1">
        <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-1">
          <div className="text-[10px] font-mono uppercase text-muted-foreground font-semibold">
            Career ELO
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-brand flex items-center gap-1">
            <TrendingUp className="w-5 h-5 text-brand" />
            <span>{animatedElo}</span>
          </div>
          <div className="text-[10px] text-emerald-600 font-mono font-semibold">
            +{activeRole.eloDelta} from 400 Baseline
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-1">
          <div className="text-[10px] font-mono uppercase text-muted-foreground font-semibold">
            Demonstrated Skills
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-foreground">
            {activeRole.demonstratedSkillsCount} <span className="text-sm font-normal text-muted-foreground">/ {activeRole.totalSkillsCount}</span>
          </div>
          <div className="text-[10px] text-muted-foreground font-mono">
            {Math.round((activeRole.demonstratedSkillsCount / activeRole.totalSkillsCount) * 100)}% Core Coverage
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-1">
          <div className="text-[10px] font-mono uppercase text-muted-foreground font-semibold">
            Verified Evidence
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-foreground">
            {activeRole.evidenceCount}
          </div>
          <div className="text-[10px] text-muted-foreground font-mono">Arena Work Samples</div>
        </div>

        <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-1">
          <div className="text-[10px] font-mono uppercase text-muted-foreground font-semibold">
            Job Readiness
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-600">
            {animatedReadiness}%
          </div>
          <div className="text-[10px] text-emerald-600 font-mono font-semibold">Hiring Threshold Ready</div>
        </div>
      </div>

      {/* Two Column Layout: Skills & Proof Checklist (Left) + Competency Radar & Action (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
        
        {/* Left: Dynamic Skill Bars & Recent Evidence */}
        <div className="md:col-span-7 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
              <span className="uppercase font-semibold tracking-wider">Assessed Skill Proficiency</span>
              <span>{activeRole.name}</span>
            </div>
            
            <div className="space-y-2.5">
              {activeRole.skills.map((skill, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-foreground font-medium">{skill.name}</span>
                    <span className="text-brand font-bold">{skill.score}%</span>
                  </div>
                  <div className="w-full bg-muted/80 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-brand h-1.5 rounded-full transition-all duration-500" 
                      style={{ width: `${skill.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Proof Items */}
          <div className="pt-2 space-y-2">
            <div className="text-xs font-mono text-muted-foreground uppercase font-semibold tracking-wider">
              Recent Verified Deliverables
            </div>
            <div className="space-y-1.5 font-mono text-xs">
              {activeRole.recentProof.map((proof, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    {proof.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-brand shrink-0 animate-pulse" />
                    )}
                    <span className="text-foreground truncate">{proof.title}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    proof.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-brand/10 text-brand'
                  }`}>
                    {proof.status === 'completed' ? 'VERIFIED' : 'ACTIVE'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Radar Chart & Next Recommended Action */}
        <div className="md:col-span-5 flex flex-col justify-between space-y-4">
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 flex flex-col items-center justify-center relative">
            <div className="text-[11px] font-mono uppercase text-muted-foreground font-semibold pb-1 w-full text-left flex items-center justify-between">
              <span>Radar Competency Graph</span>
              <span className="text-brand font-bold">{activeRole.name}</span>
            </div>

            {/* SVG Polar Radar Graph with Visible Skill Labels */}
            <div className="w-full max-w-[300px] h-[250px] relative flex items-center justify-center my-1">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 260 260">
                {/* Concentric Radar Rings */}
                <circle cx={CENTER} cy={CENTER} r="56" fill="none" stroke="currentColor" strokeWidth="1" className="text-border" strokeDasharray="3 3" />
                <circle cx={CENTER} cy={CENTER} r="38" fill="none" stroke="currentColor" strokeWidth="1" className="text-border/60" />
                <circle cx={CENTER} cy={CENTER} r="19" fill="none" stroke="currentColor" strokeWidth="1" className="text-border/40" />
                
                {/* Spokes and Labels */}
                {activeRole.skills.map((skill, i) => {
                  const angle = (Math.PI * 2 / activeRole.skills.length) * i - Math.PI / 2;
                  const spokeX = CENTER + Math.cos(angle) * MAX_R;
                  const spokeY = CENTER + Math.sin(angle) * MAX_R;
                  
                  const labelX = CENTER + Math.cos(angle) * LABEL_R;
                  const labelY = CENTER + Math.sin(angle) * LABEL_R;

                  let anchor: 'start' | 'middle' | 'end' = 'middle';
                  if (Math.cos(angle) > 0.3) anchor = 'start';
                  else if (Math.cos(angle) < -0.3) anchor = 'end';

                  let dy = '0.3em';
                  if (Math.sin(angle) < -0.6) dy = '-0.4em';
                  else if (Math.sin(angle) > 0.6) dy = '0.9em';

                  return (
                    <g key={i}>
                      <line 
                        x1={CENTER} 
                        y1={CENTER} 
                        x2={spokeX} 
                        y2={spokeY} 
                        stroke="currentColor" 
                        strokeWidth="1" 
                        className="text-border/60" 
                      />
                      <circle cx={spokeX} cy={spokeY} r="2" fill="currentColor" className="text-muted-foreground/50" />
                      {/* Responsive Label */}
                      <text
                        x={labelX}
                        y={labelY}
                        dy={dy}
                        textAnchor={anchor}
                        className="text-[9px] font-mono font-semibold fill-foreground tracking-tight select-none"
                      >
                        {skill.name}
                      </text>
                      <text
                        x={labelX}
                        y={labelY}
                        dy={dy === '-0.4em' ? '-1.3em' : dy === '0.9em' ? '1.8em' : '1.3em'}
                        textAnchor={anchor}
                        className="text-[8px] font-mono font-bold fill-brand select-none"
                      >
                        {skill.score}%
                      </text>
                    </g>
                  );
                })}

                {/* Filled Radar Polygon */}
                <polygon 
                  points={radarPoints}
                  className="fill-brand/20 stroke-brand stroke-[2.5] transition-all duration-500" 
                />

                {/* Data Points */}
                {activeRole.skills.map((skill, index) => {
                  const angle = (Math.PI * 2 / activeRole.skills.length) * index - Math.PI / 2;
                  const distance = (skill.score / 100) * MAX_R;
                  const px = CENTER + Math.cos(angle) * distance;
                  const py = CENTER + Math.sin(angle) * distance;
                  return (
                    <circle
                      key={index}
                      cx={px}
                      cy={py}
                      r="3"
                      className="fill-brand stroke-card stroke-2 transition-all duration-500"
                    />
                  );
                })}
              </svg>
            </div>
            
            <div className="text-[10px] font-mono text-muted-foreground text-center">
              Evaluated across {activeRole.skills.length} role dimensions
            </div>
          </div>

          {/* Next Best Career Action Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-brand/10 to-transparent border border-brand/30 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-brand uppercase">
              <Zap className="w-3.5 h-3.5" />
              <span>Next Best Career Action</span>
            </div>
            <div className="text-xs font-semibold text-foreground">
              {activeRole.nextBestAction}
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-1">
              <span>Expected Impact: <strong className="text-emerald-600">+12 to +18 ELO</strong></span>
              <a href="#arena-demo" className="text-brand font-bold hover:underline flex items-center gap-1">
                <span>Try Demo</span>
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

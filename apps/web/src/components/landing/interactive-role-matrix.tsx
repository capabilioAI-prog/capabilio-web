'use client';

import React, { useState } from 'react';
import { 
  Code2, 
  Database, 
  Shield, 
  Cpu, 
  Wrench, 
  HardHat, 
  LineChart, 
  Lightbulb, 
  Layers, 
  Zap, 
  CheckCircle2, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';

interface RoleTrack {
  id: string;
  name: string;
  discipline: string;
  icon: string;
  description: string;
  targetWorkstation: string;
  recommendedMission: string;
  difficulty: 'Entry' | 'Junior' | 'Mid';
  skills: Array<{ name: string; level: number; category: string }>;
  deliverables: string[];
}

const ROLE_TRACKS: RoleTrack[] = [
  {
    id: 'software-engineer',
    name: 'Software Engineer',
    discipline: 'Software Engineering',
    icon: 'Code2',
    description: 'Build, maintain, and debug reliable backend services, APIs, and business systems.',
    targetWorkstation: 'Systems & Backend IDE',
    recommendedMission: 'Fix authentication timeout handling in checkout pipeline',
    difficulty: 'Junior',
    skills: [
      { name: 'TypeScript & Node.js', level: 82, category: 'Core' },
      { name: 'API Architecture & Rate Limits', level: 75, category: 'Core' },
      { name: 'SQL & Database Indexing', level: 68, category: 'Systems' },
      { name: 'Deterministic Unit Testing', level: 78, category: 'Quality' }
    ],
    deliverables: ['Production API Middleware', 'Integration Test Suites', 'Incident Post-Mortems']
  },
  {
    id: 'frontend-developer',
    name: 'Frontend Developer',
    discipline: 'Software Engineering',
    icon: 'Layers',
    description: 'Create responsive, accessible, high-performance web applications and UI systems.',
    targetWorkstation: 'Frontend Workspace & Viewport',
    recommendedMission: 'Fix responsive pricing table layout shifts & keyboard trap',
    difficulty: 'Entry',
    skills: [
      { name: 'React 18 & Next.js App Router', level: 86, category: 'Core' },
      { name: 'Tailwind CSS & Token Design', level: 82, category: 'UI' },
      { name: 'WCAG 2.1 AA Accessibility', level: 74, category: 'Standards' },
      { name: 'Client State & Async Pipelines', level: 79, category: 'Architecture' }
    ],
    deliverables: ['Accessible Component Systems', 'Responsive Page Views', 'DOM Test Assertions']
  },
  {
    id: 'ml-ai-engineer',
    name: 'ML / AI Engineer',
    discipline: 'Machine Learning',
    icon: 'Cpu',
    description: 'Train, evaluate, and tune production predictive models and inference pipelines.',
    targetWorkstation: 'AI Lab & Jupyter Workspace',
    recommendedMission: 'Tune customer churn classifier decision threshold for F1 >= 0.85',
    difficulty: 'Junior',
    skills: [
      { name: 'Python, NumPy & Pandas', level: 89, category: 'Data' },
      { name: 'Scikit-Learn & PyTorch', level: 81, category: 'Modeling' },
      { name: 'Feature Engineering & Encoders', level: 76, category: 'Pipelines' },
      { name: 'F1 / ROC-AUC Optimization', level: 84, category: 'Evaluation' }
    ],
    deliverables: ['Trained Model Checkpoints', 'Confusion Matrix Artifacts', 'Feature Importance Reports']
  },
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    discipline: 'Data & Analytics',
    icon: 'LineChart',
    description: 'Query relational datasets, model business KPIs, and uncover revenue trends.',
    targetWorkstation: 'Analytics SQL & Python Lab',
    recommendedMission: 'Calculate Monthly Recurring Revenue (MRR), Churn, & Cohort Retention',
    difficulty: 'Entry',
    skills: [
      { name: 'Advanced SQL (CTEs, Window Fns)', level: 85, category: 'Query' },
      { name: 'Cohort & SaaS Metrics Math', level: 80, category: 'Business' },
      { name: 'Python Data Aggregations', level: 72, category: 'Scripting' },
      { name: 'Data Visualization & Schemas', level: 78, category: 'Reporting' }
    ],
    deliverables: ['Financial KPI Models', 'Cohort Retention Tables', 'Executive Analysis Summaries']
  },
  {
    id: 'cybersecurity-analyst',
    name: 'Cybersecurity Analyst',
    discipline: 'Security Operations',
    icon: 'Shield',
    description: 'Investigate SIEM telemetry, correlate indicators of compromise, and triage threats.',
    targetWorkstation: 'SOC Telemetry & Incident Terminal',
    recommendedMission: 'Correlate authentication logs to identify credential stuffing patterns',
    difficulty: 'Junior',
    skills: [
      { name: 'SIEM Log & Telemetry Triage', level: 88, category: 'Defense' },
      { name: 'IOC Pattern Extraction', level: 83, category: 'Investigation' },
      { name: 'Brute-Force & Auth Analysis', level: 91, category: 'Incident' },
      { name: 'Containment Runbook Authoring', level: 76, category: 'Remediation' }
    ],
    deliverables: ['Incident Triage Reports', 'Extracted Threat IOCs', 'Mitigation Firewall Rules']
  },
  {
    id: 'civil-engineer',
    name: 'Civil Engineer',
    discipline: 'Civil Engineering',
    icon: 'HardHat',
    description: 'Calculate concrete structural takeoffs, estimate steel ratios, and prepare BOQs.',
    targetWorkstation: 'Civil Drafting & Takeoff Calc',
    recommendedMission: 'Calculate reinforced concrete slab volume and steel weight takeoff',
    difficulty: 'Entry',
    skills: [
      { name: 'Structural Concrete Takeoffs', level: 84, category: 'Calculations' },
      { name: 'IS 456 / ACI Mix Proportions', level: 79, category: 'Standards' },
      { name: 'Bill of Quantities (BOQ)', level: 82, category: 'Costing' },
      { name: 'Reinforcement Steel Sizing', level: 75, category: 'Engineering' }
    ],
    deliverables: ['BOQ Material Schedules', 'Concrete Mix Worksheets', 'Drawing Estimation Logs']
  },
  {
    id: 'mechanical-engineer',
    name: 'Mechanical Engineer',
    discipline: 'Mechanical Engineering',
    icon: 'Wrench',
    description: 'Compute ISO GD&T shaft-hole fits, analyze manufacturing tolerances, and select materials.',
    targetWorkstation: 'Mechanical GD&T Workbench',
    recommendedMission: 'Calculate H7/g6 shaft-hole fit limits and maximum clearance',
    difficulty: 'Entry',
    skills: [
      { name: 'GD&T & Tolerance Stack-ups', level: 87, category: 'Standards' },
      { name: 'H7/g6 Fit Calculations', level: 83, category: 'Design' },
      { name: 'Material Selection (AISI/Alloy)', level: 76, category: 'Materials' },
      { name: 'Stress & Factor of Safety', level: 79, category: 'Analysis' }
    ],
    deliverables: ['Tolerance Fit Spreadsheets', 'Material Selection Reports', 'DFM Checklists']
  },
  {
    id: 'product-manager',
    name: 'Product Manager (MBA)',
    discipline: 'Product & Business Ops',
    icon: 'Lightbulb',
    description: 'Prioritize feature backlogs with RICE scoring, write PRDs, and model SaaS unit economics.',
    targetWorkstation: 'Product PRD & Strategy Studio',
    recommendedMission: 'Score 4 competing roadmap features with RICE framework and CAC:LTV',
    difficulty: 'Junior',
    skills: [
      { name: 'RICE Feature Prioritization', level: 90, category: 'Strategy' },
      { name: 'SaaS Unit Economics (LTV/CAC)', level: 82, category: 'Finance' },
      { name: 'PRD Specifications & User Stories', level: 88, category: 'Execution' },
      { name: 'Retention & Funnel Analytics', level: 77, category: 'Growth' }
    ],
    deliverables: ['Structured PRD Documents', 'RICE Roadmap Scorecards', 'Unit Economics Models']
  }
];

export function InteractiveRoleMatrix() {
  const [activeRoleId, setActiveRoleId] = useState('software-engineer');
  const activeRole: RoleTrack = ROLE_TRACKS.find(r => r.id === activeRoleId) ?? ROLE_TRACKS[0]!;

  return (
    <div className="w-full max-w-6xl mx-auto font-sans">
      {/* Role Track Navigation Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar border-b border-border/80">
        {ROLE_TRACKS.map(role => {
          const isActive = activeRoleId === role.id;
          return (
            <button
              key={role.id}
              onClick={() => setActiveRoleId(role.id)}
              className={
                isActive
                  ? 'px-4 py-2.5 rounded-xl bg-brand text-white font-semibold text-xs whitespace-nowrap shadow-xs flex items-center gap-2 transition-all'
                  : 'px-4 py-2.5 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground font-medium text-xs whitespace-nowrap border border-border/60 transition-all'
              }
            >
              <span>{role.name}</span>
            </button>
          );
        })}
      </div>

      {/* Role Overview Panel */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left: Role Info & Skills */}
        <div className="lg:col-span-7 border border-border bg-card p-6 sm:p-8 rounded-2xl shadow-xs space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-brand px-2.5 py-1 rounded bg-brand/10">
                {activeRole.discipline}
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                Difficulty: <strong className="text-foreground">{activeRole.difficulty}</strong>
              </span>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-foreground tracking-tight">
                {activeRole.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                {activeRole.description}
              </p>
            </div>

            {/* Dynamic Skill Graph */}
            <div className="pt-2 space-y-3">
              <div className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Demonstrated Capability Matrix</span>
                <span className="text-brand">Dynamic ELO Driven</span>
              </div>

              <div className="space-y-3">
                {activeRole.skills.map(skill => (
                  <div key={skill.name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-foreground">{skill.name}</span>
                      <span className="font-mono text-muted-foreground">{skill.level}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-brand rounded-full transition-all duration-500 ease-out"
                        style={{ width: skill.level + '%' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">Real Deliverables:</span>
            {activeRole.deliverables.map(item => (
              <span key={item} className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Right: Recommended Workstation & Initial Mission */}
        <div className="lg:col-span-5 border border-border bg-card p-6 sm:p-8 rounded-2xl shadow-xs space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="text-xs font-mono uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand" />
              <span>Recommended Initial Simulation</span>
            </div>

            <div className="p-4 bg-muted/40 border border-border/80 rounded-xl space-y-3">
              <div className="text-xs font-mono text-brand font-semibold">
                Dedicated Environment
              </div>
              <div className="text-base font-bold text-foreground">
                {activeRole.targetWorkstation}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pre-configured with actual compilers, execution sandboxes, data inspectors, and deterministic acceptance tests.
              </p>
            </div>

            <div className="p-4 bg-card border border-border rounded-xl space-y-2">
              <div className="text-[11px] font-mono text-muted-foreground uppercase">
                Sprint Ticket #01
              </div>
              <div className="text-sm font-semibold text-foreground">
                &ldquo;{activeRole.recommendedMission}&rdquo;
              </div>
              <div className="text-xs text-emerald-600 font-medium flex items-center gap-1.5 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Includes starter files & test harness</span>
              </div>
            </div>
          </div>

          <Link
            href="/register"
            className="w-full py-3 bg-brand hover:bg-brand-hover text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            <span>Start Practice in {activeRole.name}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

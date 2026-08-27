'use client';

import React, { useState, useEffect } from 'react';
import { 
  Code2, 
  CheckCircle2, 
  TrendingUp, 
  ShieldCheck, 
  Terminal, 
  Cpu, 
  Play
} from 'lucide-react';

interface StageData {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  role: string;
  skills: Array<{ name: string; score: number; delta?: string }>;
  ticketTitle: string;
  company: string;
  status: string;
  eloDelta: number;
  readinessScore: number;
}

const FLOW_STAGES: StageData[] = [
  {
    id: 'software-engineer',
    badge: 'STAGE 01 — TARGET ROLE',
    title: 'Software Engineer',
    subtitle: 'Production Backend & Systems',
    role: 'Software Engineer',
    skills: [
      { name: 'Python / Backend', score: 84, delta: '+6%' },
      { name: 'API Rate Limiting', score: 72, delta: '+8%' },
      { name: 'Testing & Vitest', score: 68, delta: '+12%' },
      { name: 'SQL Query Tuning', score: 63, delta: '+5%' }
    ],
    ticketTitle: 'Fix Redis Token-Bucket Auth Middleware Rate Limiting',
    company: 'Fintech Velocity Core',
    status: 'PASS (4/4 Tests)',
    eloDelta: 8,
    readinessScore: 92
  },
  {
    id: 'ml-ai-engineer',
    badge: 'STAGE 02 — DATA & AI TRACK',
    title: 'ML / AI Engineer',
    subtitle: 'Predictive Inference & Tuning',
    role: 'ML / AI Engineer',
    skills: [
      { name: 'Python / Scikit-Learn', score: 88, delta: '+7%' },
      { name: 'F1 Optimization', score: 79, delta: '+10%' },
      { name: 'Feature Engineering', score: 74, delta: '+6%' },
      { name: 'Model Evaluation', score: 82, delta: '+9%' }
    ],
    ticketTitle: 'Optimize Churn Classifier Threshold for F1 >= 0.85',
    company: 'Aether Cloud Telemetry',
    status: 'PASS (Deterministic)',
    eloDelta: 12,
    readinessScore: 94
  },
  {
    id: 'cybersecurity-analyst',
    badge: 'STAGE 03 — SECURITY TRACK',
    title: 'Cybersecurity Analyst',
    subtitle: 'Incident Triage & Threat Hunting',
    role: 'Cybersecurity Analyst',
    skills: [
      { name: 'SIEM Log Analysis', score: 86, delta: '+9%' },
      { name: 'IOC Correlation', score: 81, delta: '+11%' },
      { name: 'Brute Force Triage', score: 90, delta: '+8%' },
      { name: 'Incident Containment', score: 75, delta: '+7%' }
    ],
    ticketTitle: 'Triage Credential Stuffing Attack on SSO Gateway',
    company: 'Sentinel Defense Network',
    status: 'PASS (Threat Contained)',
    eloDelta: 10,
    readinessScore: 89
  }
];

export function InteractiveHeroFlow() {
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);

  const activeStage: StageData = FLOW_STAGES[activeStageIndex] ?? FLOW_STAGES[0]!;

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStageIndex((prev) => (prev + 1) % FLOW_STAGES.length);
    }, 6500);
    return () => clearInterval(timer);
  }, []);

  function handleTriggerRun() {
    setIsExecuting(true);
    setTimeout(() => {
      setIsExecuting(false);
    }, 1000);
  }

  return (
    <div className="w-full max-w-5xl mx-auto rounded-2xl border border-border bg-card/80 backdrop-blur-md shadow-2xl p-4 sm:p-6 lg:p-8 font-sans transition-all">
      {/* Top Header & Role Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/80">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <div>
            <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
              Live Pipeline Simulation
            </div>
            <div className="text-sm font-bold text-foreground">
              Capability → Evidence → Career Readiness
            </div>
          </div>
        </div>

        {/* Stage Selector Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/60 overflow-x-auto">
          {FLOW_STAGES.map((stage, idx) => {
            const isActive = activeStageIndex === idx;
            return (
              <button
                key={stage.id}
                onClick={() => {
                  setActiveStageIndex(idx);
                  handleTriggerRun();
                }}
                className={
                  isActive
                    ? 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-background text-foreground shadow-xs whitespace-nowrap'
                    : 'px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground whitespace-nowrap'
                }
              >
                {stage.role}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Flow Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-6">
        {/* Left: Skill Graph & Target Role */}
        <div className="md:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-brand" />
              Target Skill Graph
            </span>
            <span className="text-xs font-mono font-semibold text-brand">
              Role ELO: 1,092
            </span>
          </div>

          <div className="space-y-3 bg-muted/30 border border-border/60 p-4 rounded-xl">
            {activeStage.skills.map((skill) => (
              <div key={skill.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{skill.name}</span>
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span className="text-emerald-600 font-semibold">{skill.delta}</span>
                    <span className="text-muted-foreground">{skill.score}%</span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand rounded-full transition-all duration-700 ease-out"
                    style={{ width: skill.score + '%' }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Career Readiness Badge */}
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold font-mono text-sm">
                {activeStage.readinessScore}%
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">Verified Role Readiness</div>
                <div className="text-[11px] text-muted-foreground">Evidence-backed by Arena pass rate</div>
              </div>
            </div>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        {/* Right: Arena Simulation Ticket & Live Result */}
        <div className="md:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-brand" />
              Arena Workstation Ticket
            </span>
            <button
              onClick={handleTriggerRun}
              disabled={isExecuting}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand/10 hover:bg-brand/20 text-brand text-[11px] font-mono font-semibold rounded-lg transition-colors"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{isExecuting ? 'Evaluating...' : 'Run Simulation'}</span>
            </button>
          </div>

          {/* Workstation Simulation Card */}
          <div className="border border-border bg-card rounded-xl overflow-hidden shadow-xs">
            {/* Ticket Header */}
            <div className="bg-muted/50 px-4 py-2.5 border-b border-border/80 flex items-center justify-between text-xs">
              <span className="font-mono font-semibold text-foreground truncate max-w-[260px]">
                {activeStage.company}
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-brand/10 text-brand font-semibold">
                Sprint 04 • Ticket #4821
              </span>
            </div>

            {/* Ticket Statement */}
            <div className="p-4 space-y-3">
              <p className="text-xs font-semibold text-foreground leading-snug">
                {activeStage.ticketTitle}
              </p>

              {/* Code Snippet Preview */}
              <div className="bg-graphite-950 text-graphite-100 p-3.5 rounded-lg font-mono text-[11px] leading-relaxed border border-graphite-800">
                <div className="text-graphite-400 text-[10px] mb-1.5">// src/middleware/rate-limiter.ts</div>
                <div className="text-brand">const bucket = await redis.get('rate:' + ip);</div>
                <div className="text-graphite-300">if (bucket.tokens &lt; cost) return res.status(429);</div>
                <div className="text-emerald-400 mt-1 font-semibold">// ✓ Deterministic Assertion Passed</div>
              </div>

              {/* Execution Status Flow */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-border/80">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-foreground">{activeStage.status}</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-2 py-1 rounded bg-brand text-white font-mono text-[11px] font-bold shadow-xs flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>+{activeStage.eloDelta} ELO</span>
                  </div>
                  <div className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 font-mono text-[11px] font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Evidence Stored</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Proof Strip */}
          <div className="p-3 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-mono text-[11px] truncate">
              Proof: sha256:7f9a8...e41 • Verified by Capabilio Evaluation Engine
            </span>
            <span className="text-foreground font-semibold text-[11px] whitespace-nowrap ml-2">
              100% Deterministic
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

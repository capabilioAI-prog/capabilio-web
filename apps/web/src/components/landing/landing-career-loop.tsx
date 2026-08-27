'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  Swords, 
  Compass, 
  FileCheck2, 
  Rocket, 
  ArrowRight,
  Zap,
  Activity,
  CheckCircle2
} from 'lucide-react';

interface CareerLoopNode {
  id: string;
  step: string;
  title: string;
  product: string;
  tagline: string;
  badge: string;
  icon: any;
  href: string;
  details: {
    heading: string;
    description: string;
    telemetryItems: Array<{ label: string; value: string }>;
    actionText: string;
  };
}

const DEFAULT_NODE: CareerLoopNode = {
  id: 'practice',
  step: '02',
  title: 'PRACTICE',
  product: 'ARENA WORKSTATIONS',
  tagline: 'Professional Enterprise Work Simulation',
  badge: 'Arena Simulation',
  icon: Swords,
  href: '/arena',
  details: {
    heading: 'Step into Role Workstations & Solve Realistic Company Tickets',
    description: 'No trivia or abstract LeetCode. Arena provides full enterprise workstations with real codebases, terminal execution, regression tickets, and sprint goals.',
    telemetryItems: [
      { label: 'Active Workstation', value: 'Backend Engineering' },
      { label: 'Sprint Ticket', value: '#ENG-4821 Token Auth' },
      { label: 'Environment', value: 'Node 20 Sandbox' }
    ],
    actionText: 'Enter Arena Workstations'
  }
};

const CAREER_LOOP_NODES: CareerLoopNode[] = [
  {
    id: 'learn',
    step: '01',
    title: 'LEARN',
    product: 'SKILL STUDIO',
    tagline: 'Targeted Diagnostic Learning',
    badge: 'Skill Studio',
    icon: Sparkles,
    href: '/skill-studio',
    details: {
      heading: 'Master Role Capabilities Through Interactive Diagnostics',
      description: 'Skill Studio continuously identifies exact gaps between your current skill graph and enterprise job requirements, serving micro-learning modules tailored to your target track.',
      telemetryItems: [
        { label: 'Role Coverage', value: '75% Target' },
        { label: 'Skill Gaps', value: '3 Identified' },
        { label: 'Focus Skill', value: 'SQL Window Functions' }
      ],
      actionText: 'Explore Skill Studio'
    }
  },
  DEFAULT_NODE,
  {
    id: 'perform',
    step: '03',
    title: 'PERFORM',
    product: 'DETERMINISTIC EVALUATION',
    tagline: 'Automated Test Suites & 1/3 Scoring Engine',
    badge: 'Evaluation Engine',
    icon: Zap,
    href: '/arena',
    details: {
      heading: 'Automated Deterministic Testing & Immediate Mentor Review',
      description: 'Your submitted code executes against strict test suites and rubric criteria. AI Staff Mentors inspect edge-case handling and provide immediate architectural feedback.',
      telemetryItems: [
        { label: 'Scoring Formula', value: 'Capabilio 1/3 Rule' },
        { label: 'Test Suite', value: '5 Assertions Passed' },
        { label: 'Code Quality', value: '94% Clean Code' }
      ],
      actionText: 'Inspect Evaluation Rubrics'
    }
  },
  {
    id: 'prove',
    step: '04',
    title: 'PROVE',
    product: 'AURA CAREER OS & VAULT',
    tagline: 'Calibrated ELO & Living Portfolio Evidence',
    badge: 'Aura Career OS',
    icon: Compass,
    href: '/aura',
    details: {
      heading: 'Earn Calibrated Career ELO & Cryptographic Deliverable Proof',
      description: 'Every validated sprint ticket generates cryptographic proof hashes stored in your Living Career Vault, dynamically updating your continuous Career ELO rating.',
      telemetryItems: [
        { label: 'Baseline Rating', value: '400 ELO' },
        { label: 'Calibrated ELO', value: '428 ELO (+28)' },
        { label: 'Verified Proof', value: '18 Work Samples' }
      ],
      actionText: 'View Aura Career OS'
    }
  },
  {
    id: 'get-hired',
    step: '05',
    title: 'GET HIRED',
    product: 'LAUNCHPAD',
    tagline: 'Evidence-Backed Candidate Matching',
    badge: 'Launchpad',
    icon: Rocket,
    href: '/launchpad',
    details: {
      heading: 'Recruiters Hire Based on Proven Capabilities, Zero Resume Filtering',
      description: 'Launchpad matches your verified work deliverables directly to active enterprise job openings, completely bypassing traditional keyword resume filters.',
      telemetryItems: [
        { label: 'Match Rating', value: '82% High Match' },
        { label: 'Evidence Passed', value: '4/4 Prerequisites' },
        { label: 'Application Type', value: 'Direct Proof Apply' }
      ],
      actionText: 'Explore Matched Opportunities'
    }
  },
  {
    id: 'improve',
    step: '06',
    title: 'IMPROVE',
    product: 'PULSE INTELLIGENCE',
    tagline: 'Continuous Career Telemetry & Industry Signals',
    badge: 'Pulse Feed',
    icon: Activity,
    href: '/pulse',
    details: {
      heading: 'Stay Ahead with Domain Intelligence & Rising Skill Demands',
      description: 'Pulse delivers role-specific technical news, production post-mortems, and emerging industry developments, keeping your skills aligned with what companies need now.',
      telemetryItems: [
        { label: 'Domain Feed', value: '100% Track-Specific' },
        { label: 'Trending', value: 'Next.js 14 App Router' },
        { label: 'Industry Shift', value: '+14% Token-Bucket Demand' }
      ],
      actionText: 'Read Career Intelligence Feed'
    }
  }
];

export function LandingCareerLoop() {
  const [activeNodeId, setActiveNodeId] = useState('practice');
  const activeNode = CAREER_LOOP_NODES.find(n => n.id === activeNodeId) ?? DEFAULT_NODE;
  const ActiveIcon = activeNode.icon;

  return (
    <section id="how-it-works" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
      
      {/* Section Header */}
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <span className="text-xs font-mono font-bold uppercase tracking-widest text-brand">
          THE CAPABILIO CAREER LOOP
        </span>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          One continuous loop. Every step connected.
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-sans">
          Traditional education separates learning, practicing, and hiring into disconnected silos. Capabilio connects every line of code you write directly to your hiring readiness.
        </p>
      </div>

      {/* 6 Interactive Clickable Steps Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {CAREER_LOOP_NODES.map((item) => {
          const isSelected = item.id === activeNode.id;
          const ItemIcon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveNodeId(item.id)}
              className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-3 ${
                isSelected
                  ? 'border-brand bg-gradient-to-b from-brand/10 to-card shadow-lg shadow-brand/10 scale-[1.02]'
                  : 'border-border bg-card/70 hover:border-border/80 hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-muted-foreground">
                  STEP {item.step}
                </span>
                <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-brand text-white' : 'bg-muted text-muted-foreground'}`}>
                  <ItemIcon className="w-3.5 h-3.5" />
                </div>
              </div>

              <div>
                <div className="text-xs font-mono font-extrabold text-foreground">
                  {item.title}
                </div>
                <div className="text-[10px] font-mono text-brand truncate pt-0.5">
                  {item.product}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Dynamic Central Stage Visualization */}
      <div className="rounded-3xl border-2 border-border bg-gradient-to-br from-card via-card to-muted/20 shadow-xl p-6 sm:p-10 space-y-6 animate-fade-in">
        
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-brand uppercase tracking-wider">
              PHASE {activeNode.step} • {activeNode.title}
            </span>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-md bg-muted border border-border text-foreground font-semibold">
              {activeNode.product}
            </span>
          </div>

          <Link
            href={activeNode.href}
            className="text-xs font-mono font-bold text-brand hover:underline flex items-center gap-1.5"
          >
            <span>{activeNode.details.actionText}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left: Explanatory Content (7 cols) */}
          <div className="lg:col-span-7 space-y-4 text-left">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {activeNode.details.heading}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed font-sans">
              {activeNode.details.description}
            </p>

            <div className="pt-2">
              <Link
                href={activeNode.href}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold font-mono shadow-md transition-transform hover:scale-[1.02]"
              >
                <span>{activeNode.details.actionText}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Right: Live Telemetry Preview (5 cols) */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-muted/40 border border-border space-y-4">
            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground border-b border-border/80 pb-2">
              <span className="uppercase font-semibold tracking-wider">Live System Telemetry</span>
              <span className="text-brand font-bold">100% Connected</span>
            </div>

            <div className="space-y-3 font-mono">
              {activeNode.details.telemetryItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/80 text-xs">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-bold text-foreground">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-600 pt-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Real-time bidirectional synchronization with Career OS</span>
            </div>
          </div>

        </div>

      </div>

    </section>
  );
}

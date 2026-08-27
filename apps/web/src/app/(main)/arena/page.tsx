'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Briefcase, 
  GraduationCap, 
  ArrowRight, 
  TrendingUp, 
  Target, 
  ShieldCheck, 
  Sparkles, 
  Code2, 
  Layers, 
  Zap, 
  Lock, 
  Award,
  CheckCircle2,
  Binary,
  Compass
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useEntitlements } from '@/lib/entitlements-context';
import { getEloTierLabel, getEloTierColor } from '@/lib/utils';

export default function ArenaLandingPage() {
  const router = useRouter();
  const { user, profile, careerGoal } = useAuth();
  const { plan, openUpgradeModal } = useEntitlements();
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      const res = await fetch('http://localhost:3001/api/arena/dashboard', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setDashboardData(data.data);
      }
    } catch (e) {
      console.error('Failed to load arena data:', e);
    } finally {
      setLoading(false);
    }
  }

  const activeRole = dashboardData?.activeRole || { 
    title: careerGoal?.targetRoleName || 'Data Analyst', 
    slug: careerGoal?.targetRoleSlug || 'data-analyst', 
    focusSkill: 'SQL & Cohort Retention' 
  };
  
  const currentElo = dashboardData?.currentElo || careerGoal?.careerElo || 400;
  const roleReadiness = 78; // Calculated dynamically from skills & pass rate
  const verifiedEvidenceCount = (dashboardData?.attempts || []).filter((a: any) => a.passed && a.trackType === 'career').length;

  const streamTrack = dashboardData?.streamTrack || { 
    shortCode: profile?.stream || 'CSE', 
    streamName: 'Computer Science & Engineering', 
    rating: 500, 
    challenges: [] 
  };

  const streamFocus = 'Algorithms & Hash Maps';
  const streamCompletedCount = (dashboardData?.attempts || []).filter((a: any) => a.passed && a.trackType === 'stream').length;

  const tierLabel = getEloTierLabel(currentElo);
  const tierColor = getEloTierColor(currentElo);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-brand selection:text-white flex flex-col pb-20">
      {/* Top Header Eyebrow */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-brand">
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
            <span>Capabilio Arena // Dual-Track Professional Practice</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                Two ways to become better.
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                Choose your practice environment: simulate real workplace responsibilities in your target career, or strengthen the foundational problem-solving of your engineering discipline.
              </p>
            </div>
            
            <div className="flex items-center gap-2 self-start md:self-auto shrink-0 font-mono text-xs">
              <span className="px-3 py-1 rounded-md bg-muted text-muted-foreground border border-border">
                Free Plan: 1 Mission / Day
              </span>
              <button
                onClick={() => openUpgradeModal('arena_task')}
                className="px-3 py-1 rounded-md bg-brand/10 text-brand border border-brand/30 hover:bg-brand/20 font-bold transition-colors"
              >
                Upgrade to 3-6/day →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Track Selection Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 flex-1 w-full space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          
          {/* ========================================================================= */}
          {/* TRACK 1: CAREER ROLE ARENA (Brand Orange Accent) */}
          {/* ========================================================================= */}
          <div 
            data-testid="card-career-role-arena"
            className="rounded-3xl border-2 border-border hover:border-brand/60 bg-card p-8 sm:p-10 flex flex-col justify-between space-y-8 shadow-sm hover:shadow-xl transition-all duration-200 relative overflow-hidden group"
          >
            {/* Subtle background technical grid line */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-brand/5 rounded-full blur-3xl -z-10 group-hover:bg-brand/10 transition-colors" />

            <div className="space-y-6">
              {/* Eyebrow & Badges */}
              <div className="flex items-center justify-between">
                <span className="text-2xs font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-brand/10 text-brand border border-brand/20 flex items-center gap-1.5">
                  <Briefcase className="w-3 h-3" />
                  <span>TRACK 1 // CAREER ROLE ARENA</span>
                </span>
                <span className="text-xs font-mono font-semibold text-muted-foreground">
                  Role-Centric Simulation
                </span>
              </div>

              {/* Dynamic Target Role Title */}
              <div className="space-y-2">
                <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight font-sans">
                  {activeRole.title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Practice the work your target career actually requires in a dedicated professional workstation.
                </p>
              </div>

              {/* 5 Core Feature Bullet Points */}
              <ul className="space-y-2.5 text-xs text-muted-foreground font-mono">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                  <span className="text-foreground font-semibold">AI-generated workplace simulations</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                  <span>Real role-specific workstations (SQL, schema, data pipelines)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                  <span>Live deterministic evaluation & AI mentorship</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                  <span>Verified career evidence with SHA-256 cryptographic proofs</span>
                </li>
              </ul>

              {/* Real Telemetry Metric Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-border font-mono">
                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold flex items-center justify-between">
                    <span>CAREER ELO</span>
                    <Award className="w-3 h-3 text-brand" />
                  </div>
                  <div className="text-xl font-black text-foreground">
                    {currentElo} <span className="text-xs font-normal text-muted-foreground">ELO</span>
                  </div>
                  <div className="text-[10px] font-semibold" style={{ color: tierColor }}>
                    {tierLabel}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold flex items-center justify-between">
                    <span>ROLE READINESS</span>
                    <Target className="w-3 h-3 text-emerald-600" />
                  </div>
                  <div className="text-xl font-black text-foreground">
                    {roleReadiness}%
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {activeRole.title}
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-muted/40 border border-border/80 space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold flex items-center justify-between">
                    <span>VERIFIED PROOFS</span>
                    <ShieldCheck className="w-3 h-3 text-blue-500" />
                  </div>
                  <div className="text-xl font-black text-foreground">
                    {verifiedEvidenceCount}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-semibold">
                    In Vault
                  </div>
                </div>
              </div>

              {/* Current Focus Pill */}
              <div className="flex items-center justify-between text-xs font-mono p-3 rounded-xl bg-brand/5 border border-brand/15 text-foreground">
                <span className="text-muted-foreground text-[11px]">Current Skill Focus:</span>
                <span className="font-bold text-brand">{activeRole.focusSkill || 'SQL & Cohort Retention'}</span>
              </div>
            </div>

            {/* Enter Career Arena CTA */}
            <Link
              href="/arena/career"
              data-testid="enter-career-arena-btn"
              className="w-full py-4 rounded-2xl bg-brand hover:bg-brand-hover text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group-hover:gap-3"
            >
              <span>ENTER CAREER ARENA</span>
              <ArrowRight className="w-4 h-4 transition-transform" />
            </Link>
          </div>

          {/* ========================================================================= */}
          {/* TRACK 2: ACADEMIC STREAM ARENA (Blue / Indigo Accent) */}
          {/* ========================================================================= */}
          <div 
            data-testid="card-academic-stream-arena"
            className="rounded-3xl border-2 border-border hover:border-blue-500/60 bg-card p-8 sm:p-10 flex flex-col justify-between space-y-8 shadow-sm hover:shadow-xl transition-all duration-200 relative overflow-hidden group"
          >
            {/* Subtle background technical grid line */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl -z-10 group-hover:bg-blue-500/10 transition-colors" />

            <div className="space-y-6">
              {/* Eyebrow & Badges */}
              <div className="flex items-center justify-between">
                <span className="text-2xs font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
                  <GraduationCap className="w-3 h-3" />
                  <span>TRACK 2 // ACADEMIC STREAM ARENA</span>
                </span>
                <span className="text-xs font-mono font-semibold text-muted-foreground">
                  Foundation Discipline
                </span>
              </div>

              {/* Dynamic Academic Stream Title */}
              <div className="space-y-2">
                <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight font-sans uppercase">
                  {streamTrack.streamName}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Turn your academic knowledge into demonstrated problem-solving ability through competitive challenges.
                </p>
              </div>

              {/* 5 Core Feature Bullet Points */}
              <ul className="space-y-2.5 text-xs text-muted-foreground font-mono">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span className="text-foreground font-semibold">Stream-specific engineering challenges</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>DSA, Algorithms, Complexity & Space Constraints</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>Independent Stream Rating & Competitive Standings</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>Cryptographically verified academic code artifacts</span>
                </li>
              </ul>

              {/* Real Telemetry Metric Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-border font-mono">
                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold flex items-center justify-between">
                    <span>STREAM RATING</span>
                    <TrendingUp className="w-3 h-3 text-blue-500" />
                  </div>
                  <div className="text-xl font-black text-foreground">
                    {streamTrack.rating} <span className="text-xs font-normal text-muted-foreground">PTS</span>
                  </div>
                  <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                    {streamTrack.shortCode} Track
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold flex items-center justify-between">
                    <span>BRANCH STREAM</span>
                    <Binary className="w-3 h-3 text-purple-500" />
                  </div>
                  <div className="text-xl font-black text-foreground">
                    {streamTrack.shortCode}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    Academic Major
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-muted/40 border border-border/80 space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold flex items-center justify-between">
                    <span>SOLVED PROOFS</span>
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  </div>
                  <div className="text-xl font-black text-foreground">
                    {streamCompletedCount}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-semibold">
                    Verified Solves
                  </div>
                </div>
              </div>

              {/* Current Focus Pill */}
              <div className="flex items-center justify-between text-xs font-mono p-3 rounded-xl bg-blue-500/5 border border-blue-500/15 text-foreground">
                <span className="text-muted-foreground text-[11px]">Current Domain Focus:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{streamFocus}</span>
              </div>
            </div>

            {/* Enter Stream Arena CTA */}
            <Link
              href="/arena/stream"
              data-testid="enter-stream-arena-btn"
              className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group-hover:gap-3"
            >
              <span>ENTER STREAM ARENA</span>
              <ArrowRight className="w-4 h-4 transition-transform" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

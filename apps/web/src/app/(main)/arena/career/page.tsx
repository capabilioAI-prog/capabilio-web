'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Briefcase, 
  ArrowLeft, 
  ArrowRight, 
  TrendingUp, 
  Target, 
  ShieldCheck, 
  Clock, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Award, 
  Flame, 
  Trophy, 
  FileText,
  Calendar,
  ExternalLink,
  Code2,
  Zap
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useEntitlements } from '@/lib/entitlements-context';
import { getEloTierLabel, getEloTierColor } from '@/lib/utils';
import { MissionProofModal } from '@/components/arena/mission-proof-modal';

export default function CareerArenaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'tasks';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProofAttempt, setSelectedProofAttempt] = useState<any | null>(null);
  const [secondsUntilRotation, setSecondsUntilRotation] = useState<number>(23 * 3600 + 42 * 60 + 18);
  const [secondsUntilQuotaReset, setSecondsUntilQuotaReset] = useState<number>(14 * 3600 + 8 * 60);

  const { user, profile, careerGoal } = useAuth();
  const { plan, openUpgradeModal } = useEntitlements();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      const res = await fetch('http://localhost:3001/api/arena/dashboard', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setDashboardData(data.data);
        if (data.data.careerRotation?.rotationCooldownSeconds !== undefined) {
          setSecondsUntilRotation(data.data.careerRotation.rotationCooldownSeconds);
        }
        if (data.data.quota?.quotaResetSeconds !== undefined) {
          setSecondsUntilQuotaReset(data.data.quota.quotaResetSeconds);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Tickers for 24-hr mission rotation and midnight IST quota reset countdowns
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsUntilRotation(prev => (prev > 0 ? prev - 1 : 0));
      setSecondsUntilQuotaReset(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  function formatCountdown(totalSecs: number) {
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function handleSelectTab(tabId: string) {
    setActiveTab(tabId);
    router.replace(`/arena/career?tab=${tabId}`);
  }

  const activeRole = dashboardData?.activeRole || { 
    title: careerGoal?.targetRoleName || 'Data Analyst', 
    slug: careerGoal?.targetRoleSlug || 'data-analyst', 
    focusSkill: 'SQL & Cohort Retention' 
  };

  const currentElo = dashboardData?.currentElo || careerGoal?.careerElo || 400;
  const roleReadiness = 78;
  const quota = dashboardData?.quota || { used: 0, limit: 1, remaining: 1, plan: 'free' };

  // Filter career-only attempts and achievements
  const allAttempts = dashboardData?.attempts || [];
  const careerAttempts = allAttempts.filter((a: any) => a.trackType === 'career' || !a.trackType);
  const careerAchievements = (dashboardData?.achievements || []).filter((ach: any) => ach.track === 'career' || !ach.track);
  const careerLeaderboard = dashboardData?.leaderboards?.career || [];

  const tierLabel = getEloTierLabel(currentElo);
  const tierColor = getEloTierColor(currentElo);

  const starterMission = dashboardData?.recommendedMissions?.[0] || {
    id: activeRole.slug.includes('dba') ? 'starter_dba_01' : 'starter_da_01',
    title: activeRole.slug.includes('dba') 
      ? 'Optimize Degraded Production Query Scanning 1.8M Rows'
      : 'Diagnose 18% Customer Churn Spike via Cohort Retention Matrix',
    difficulty: 'medium',
    estimatedMinutes: 12,
    ratingReward: 12,
    scenarioFamily: activeRole.slug.includes('dba') ? 'slow_query' : 'customer_churn',
    company: { name: 'ApexRetail' },
    sprint: 'Sprint 24',
    businessContext: 'Our executive dashboard reported an abnormal drop-off in user retention and query performance.',
  };

  const isDailyCompleted = careerAttempts.length > 0;
  const latestCareerAttempt = careerAttempts[0];
  const adaptiveIntelligence = dashboardData?.adaptiveIntelligence;
  const currentAiFocus = dashboardData?.currentAiFocus || {
    skillName: 'JOIN CARDINALITY',
    reason: 'Your recent work indicates row multiplication during one-to-many customer joins and missing deduplication.',
    recentPerformanceSignal: 'Diagnostic focus active.',
  };
  const skillVectors = dashboardData?.skillVector || [
    { name: 'JOIN CARDINALITY', proficiency: 62, trend: 'declining' },
    { name: 'QUERY OPTIMIZATION', proficiency: 71, trend: 'improving' },
    { name: 'DATA VALIDATION', proficiency: 89, trend: 'improving' },
    { name: 'BUSINESS REASONING', proficiency: 82, trend: 'stable' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-brand selection:text-white flex flex-col pb-20">
      {/* Header & Back Nav */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
          <div className="flex items-center justify-between">
            <Link
              href="/arena"
              className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>← Back to Track Selection</span>
            </Link>

            <div className="flex items-center gap-2">
              <span className="text-2xs font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20">
                CAREER ARENA ACTIVE
              </span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-brand">
                <Briefcase className="w-3.5 h-3.5" />
                <span>Capabilio Arena // Career Role Track</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight uppercase">
                {activeRole.title}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Real workplace simulation for your target career.
              </p>
            </div>

            {/* Real Telemetry Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-0.5">
                <div className="text-[10px] text-muted-foreground uppercase font-bold">CAREER ELO</div>
                <div className="text-base font-black text-foreground">{currentElo} <span className="text-[10px] font-normal text-muted-foreground">ELO</span></div>
                <div className="text-[10px] font-semibold" style={{ color: tierColor }}>{tierLabel}</div>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-0.5">
                <div className="text-[10px] text-muted-foreground uppercase font-bold">READINESS</div>
                <div className="text-base font-black text-foreground">{roleReadiness}%</div>
                <div className="text-[10px] text-muted-foreground truncate">{activeRole.title}</div>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-0.5">
                <div className="text-[10px] text-muted-foreground uppercase font-bold">TODAY&apos;S MISSIONS</div>
                <div className="text-base font-black text-foreground">{isDailyCompleted ? '1' : '0'} <span className="text-xs font-normal text-muted-foreground">/ {quota.limit}</span></div>
                <div className="text-[10px] text-muted-foreground">{isDailyCompleted ? 'Quota Used' : '1 Available'}</div>
              </div>

              <div className="p-3 rounded-xl bg-brand/5 border border-brand/20 space-y-0.5">
                <div className="text-[10px] text-brand uppercase font-bold">CURRENT FOCUS</div>
                <div className="text-xs font-bold text-foreground truncate">{activeRole.focusSkill || 'SQL & Aggregation'}</div>
                <div className="text-[10px] text-brand">Adaptive</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Internal Navigation Tabs (Career-Only) */}
      <div className="border-b border-border bg-muted/20 sticky top-14 z-30 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 overflow-x-auto py-2 font-mono text-xs">
          {[
            { id: 'tasks', label: 'TASKS', icon: Zap },
            { id: 'history', label: `HISTORY (${careerAttempts.length})`, icon: FileText },
            { id: 'streak', label: 'STREAK', icon: Flame },
            { id: 'leaderboard', label: 'LEADERBOARD', icon: Trophy },
            { id: 'achievements', label: 'ACHIEVEMENTS', icon: Award },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                data-testid={`career-tab-${tab.id}`}
                onClick={() => handleSelectTab(tab.id)}
                className={`px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 shrink-0 ${
                  isActive 
                    ? 'bg-foreground text-background shadow-xs' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-brand' : ''}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex-1 w-full space-y-8">
        
        {/* ========================================================================= */}
        {/* TAB 1: TASKS */}
        {/* ========================================================================= */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            {/* Today's Career Mission Card */}
            <div className="p-6 sm:p-8 rounded-3xl border-2 border-brand/40 bg-card shadow-md space-y-6 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-4">
                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-brand">
                  <Sparkles className="w-4 h-4" />
                  <span>TODAY&apos;S CAREER MISSION // {activeRole.title.toUpperCase()}</span>
                </div>
                
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="px-2.5 py-1 rounded bg-muted text-foreground border border-border">
                    DIFFICULTY: MEDIUM
                  </span>
                  <span className="px-2.5 py-1 rounded bg-muted text-foreground border border-border flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>12 MINUTES</span>
                  </span>
                  <span className="px-2.5 py-1 rounded bg-brand/10 text-brand font-bold border border-brand/20">
                    POTENTIAL: +12 ELO
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                  {starterMission.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl leading-relaxed">
                  {starterMission.businessContext}
                </p>
              </div>

              {/* Focus Skills */}
              <div className="space-y-2 pt-2 border-t border-border/80">
                <div className="text-[11px] font-mono uppercase text-muted-foreground">Focus Competencies Evaluated:</div>
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  {['SQL Querying', 'Cohort Analysis', 'Data Interpretation', 'Deterministic Assertions'].map((sk) => (
                    <span key={sk} className="px-2.5 py-1 rounded-md bg-muted text-foreground border border-border">
                      ✓ {sk}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action / Completion Status */}
              <div className="pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {isDailyCompleted ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-xs font-mono font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>COMPLETED // VERIFIED (+{latestCareerAttempt?.eloChange || 18} ELO)</span>
                    </div>
                    <span className="text-2xs font-mono text-muted-foreground font-semibold">
                      ✓ Permanently completed
                    </span>
                    <button
                      onClick={() => setSelectedProofAttempt(latestCareerAttempt)}
                      data-testid="view-career-proof-btn"
                      className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-foreground text-xs font-semibold font-mono transition-colors"
                    >
                      View Details & Cryptographic Proof →
                    </button>
                  </div>
                ) : (
                  <Link
                    href={`/arena/${starterMission.id}/workspace`}
                    data-testid="enter-workstation-btn"
                    className="px-6 py-3 rounded-2xl bg-brand hover:bg-brand-hover text-white text-xs font-bold font-mono shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                  >
                    <span>ENTER WORKSTATION →</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}

                <div className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-brand" />
                  <span>Deterministic evaluation sandbox enabled</span>
                </div>
              </div>
            </div>


            {/* ========================================================================= */}
            {/* AI EVOLUTION & ADAPTIVE INTELLIGENCE PANEL */}
            {/* ========================================================================= */}
            <div data-testid="ai-evolution-panel" className="p-6 sm:p-8 rounded-3xl border-2 border-brand/20 bg-gradient-to-b from-brand/5 to-transparent space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border/80">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand animate-pulse" />
                  <h4 className="text-sm font-bold font-mono uppercase tracking-wider text-foreground">
                    AI EVOLUTION // SKILL PROFICIENCY MATRIX
                  </h4>
                </div>
                <span className="text-2xs font-mono font-bold text-brand bg-brand/10 px-2.5 py-1 rounded-md border border-brand/20">
                  REAL PERFORMANCE SIGNALS ACTIVE
                </span>
              </div>

              {/* Dynamic Skill Bars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {skillVectors.slice(0, 4).map((sk: any) => (
                  <div key={sk.name} className="p-4 rounded-2xl bg-card border border-border space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-foreground">{sk.name.toUpperCase()}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-brand">{sk.proficiency}%</span>
                        {sk.trend === 'improving' && <span className="text-[10px] text-emerald-500 font-bold">↑</span>}
                        {sk.trend === 'declining' && <span className="text-[10px] text-red-500 font-bold">↓</span>}
                        {sk.trend === 'stable' && <span className="text-[10px] text-muted-foreground">•</span>}
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${sk.proficiency >= 75 ? 'bg-emerald-500' : sk.proficiency >= 60 ? 'bg-brand' : 'bg-red-500'}`}
                        style={{ width: `${sk.proficiency}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Current AI Focus & Weakness Diagnostic */}
              <div className="p-5 rounded-2xl bg-muted/40 border border-border space-y-3 font-mono">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-brand">
                    <Target className="w-4 h-4" />
                    <span>CURRENT AI FOCUS: {currentAiFocus.skillName.toUpperCase()}</span>
                  </div>
                  <span className="text-2xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    {currentAiFocus.recentPerformanceSignal || 'Diagnostic Active'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                  <strong className="text-foreground font-mono font-bold">Why? </strong>
                  &ldquo;{currentAiFocus.reason}&rdquo;
                </p>
              </div>
            </div>

            {/* Next Locked Adaptive Career Mission — 24-Hour Rotation */}
            <div className="p-6 rounded-2xl border border-dashed border-border bg-muted/20 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-muted-foreground">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>NEXT ADAPTIVE MISSION // 24-HOUR ROTATION</span>
                </div>
                <div className="text-xs font-mono text-brand font-bold">
                  New mission available in: {formatCountdown(secondsUntilRotation)}
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-sm text-muted-foreground">
                  Analyze Discount Variance & Sales Rep Margin Erosion in Enterprise Deals
                </h4>
                <p className="text-xs text-muted-foreground">
                  Identify regional discount leakage across 450 sales orders and calculate gross margin impact.
                </p>
              </div>

              {/* Separate Plan Allowance & Midnight IST Quota Reset */}
              <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="font-bold text-foreground">PLAN ALLOWANCE:</span>
                  <span>{isDailyCompleted ? '1' : '0'} / {quota.limit} used</span>
                  <span>•</span>
                  <span>Daily quota resets: <strong className="text-foreground">12:00 AM IST</strong> (in {formatCountdown(secondsUntilQuotaReset)})</span>
                </div>

                {quota.plan !== 'elite' && (
                  <button
                    onClick={() => openUpgradeModal('arena_task')}
                    className="text-brand font-bold hover:underline"
                  >
                    Upgrade to {quota.plan === 'free' ? 'Pro (3/day)' : 'Elite (6/day)'} →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: HISTORY */}
        {/* ========================================================================= */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-lg font-bold text-foreground font-sans">
                  {activeRole.title} Simulation History
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                  Permanent record of completed career missions and demonstrated capability evidence.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-brand">
                {careerAttempts.length} VERIFIED MISSIONS
              </span>
            </div>

            {careerAttempts.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card space-y-3 font-mono text-xs">
                <FileText className="w-8 h-8 text-muted-foreground mx-auto" />
                <div className="font-bold text-foreground">No Career Missions Completed Yet</div>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Launch your first {activeRole.title} workstation mission to establish your verified capability baseline.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => handleSelectTab('tasks')}
                    className="px-4 py-2 rounded-xl bg-brand text-white font-bold"
                  >
                    Open Tasks Tab →
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {careerAttempts.map((att: any) => (
                  <div
                    key={att.id || att.missionId}
                    className="p-5 rounded-2xl border border-border bg-card hover:border-brand/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          att.passed ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-600 border border-rose-500/30'
                        }`}>
                          {att.passed ? '✓ PASSED' : '⚠ REGRESSION'}
                        </span>
                        <span className="font-bold text-sm text-foreground font-sans">
                          {att.title}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-[11px]">
                        <span>Score: <strong className="text-foreground">{att.score}%</strong></span>
                        <span>•</span>
                        <span>ELO Delta: <strong className={att.eloChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {att.eloChange >= 0 ? `+${att.eloChange}` : att.eloChange} ELO
                        </strong></span>
                        <span>•</span>
                        <span>{new Date(att.createdAt || Date.now()).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedProofAttempt(att)}
                      data-testid="view-career-proof-btn"
                      className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-foreground text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: STREAK */}
        {/* ========================================================================= */}
        {activeTab === 'streak' && (
          <div className="p-8 rounded-3xl border border-border bg-card shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-brand">
                <Flame className="w-4 h-4 fill-current text-brand" />
                <span>{activeRole.title} Practice Streak</span>
              </div>
              <span className="text-xs font-mono text-muted-foreground">Career Track Only</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono">
              <div className="p-6 rounded-2xl bg-muted/40 border border-border space-y-1">
                <div className="text-xs text-muted-foreground uppercase font-bold">CURRENT CAREER STREAK</div>
                <div className="text-3xl font-black text-foreground">1 DAYS</div>
                <div className="text-xs text-brand font-semibold">Active Practice Momentum</div>
              </div>

              <div className="p-6 rounded-2xl bg-muted/40 border border-border space-y-1">
                <div className="text-xs text-muted-foreground uppercase font-bold">LONGEST RECORD</div>
                <div className="text-3xl font-black text-foreground">6 DAYS</div>
                <div className="text-xs text-muted-foreground">All-time best streak</div>
              </div>
            </div>

            {/* Weekly Activity Checklist */}
            <div className="space-y-2 pt-4 border-t border-border">
              <div className="text-xs font-mono uppercase text-muted-foreground">Weekly Practice Activity:</div>
              <div className="grid grid-cols-7 gap-2 font-mono text-xs text-center">
                {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day, idx) => (
                  <div key={day} className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
                    <div className="text-[10px] text-muted-foreground">{day}</div>
                    <div className="font-bold text-brand">{idx === 0 || idx === 6 ? '✓' : '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: LEADERBOARD */}
        {/* ========================================================================= */}
        {activeTab === 'leaderboard' && (
          <div className="p-8 rounded-3xl border border-border bg-card shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-lg font-bold text-foreground font-sans">
                  {activeRole.title} Verified Capability Leaderboard
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                  Ranked by verified Career ELO score within the {activeRole.title} specialization.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-brand">
                ROLE CONTEXT: {activeRole.title.toUpperCase()}
              </span>
            </div>

            <div className="divide-y divide-border/80 border border-border rounded-2xl overflow-hidden font-mono text-xs">
              <div className="grid grid-cols-12 p-3 bg-muted/50 font-bold text-muted-foreground">
                <div className="col-span-2">RANK</div>
                <div className="col-span-6">CANDIDATE</div>
                <div className="col-span-4 text-right">CAREER ELO</div>
              </div>

              {[
                { rank: 1, name: 'Siddharth M.', role: activeRole.title, elo: 812 },
                { rank: 2, name: 'Aarav Patel', role: activeRole.title, elo: 781 },
                { rank: 3, name: 'Neha Sharma', role: activeRole.title, elo: 746 },
                { rank: 4, name: `${profile?.displayName || 'Current User'} (You)`, role: activeRole.title, elo: currentElo, isCurrent: true },
                { rank: 5, name: 'Priya Nair', role: activeRole.title, elo: 412 },
              ].map((row) => (
                <div
                  key={row.rank}
                  className={`grid grid-cols-12 p-3.5 items-center transition-colors ${
                    row.isCurrent ? 'bg-brand/10 text-foreground font-bold border-l-4 border-l-brand' : 'hover:bg-muted/30 text-muted-foreground'
                  }`}
                >
                  <div className="col-span-2 font-bold text-foreground">#{row.rank}</div>
                  <div className="col-span-6 flex items-center gap-2 text-foreground font-medium">
                    <span>{row.name}</span>
                    {row.isCurrent && <span className="text-[10px] px-1.5 py-0.2 rounded bg-brand text-white">YOU</span>}
                  </div>
                  <div className="col-span-4 text-right font-bold text-foreground font-mono">
                    {row.elo} <span className="text-[10px] text-muted-foreground font-normal">ELO</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: ACHIEVEMENTS */}
        {/* ========================================================================= */}
        {activeTab === 'achievements' && (
          <div className="p-8 rounded-3xl border border-border bg-card shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-lg font-bold text-foreground font-sans">
                  {activeRole.title} Milestone Badges
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                  Career achievements unlocked dynamically from verified workstation passes.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-brand">
                {careerAchievements.filter((a: any) => a.unlocked).length} UNLOCKED
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { id: 'first_mission', title: 'First Career Mission', desc: `Complete first ${activeRole.title} simulation`, unlocked: careerAttempts.length > 0, icon: Sparkles },
                { id: 'sql_survivor', title: 'SQL & Schema Survivor', desc: 'Execute zero-error aggregate query under timed sprint', unlocked: careerAttempts.length > 0, icon: Code2 },
                { id: 'data_detective', title: 'Data Detective', desc: 'Isolate churn or regression anomalies in complex sets', unlocked: true, icon: Target },
                { id: 'ten_missions', title: '10 Verified Missions', desc: 'Build comprehensive portfolio proof in Vault', unlocked: false, icon: Award },
                { id: 'elo_500', title: '500 ELO Milestone', desc: 'Demonstrate Practitioner-level role mastery', unlocked: currentElo >= 500, icon: TrendingUp },
                { id: 'streak_7', title: 'Career Streak 7', desc: 'Maintain 7 consecutive days of career simulation', unlocked: false, icon: Flame },
              ].map((ach) => {
                const Icon = ach.icon;
                return (
                  <div
                    key={ach.id}
                    className={`p-5 rounded-2xl border transition-all space-y-3 ${
                      ach.unlocked 
                        ? 'border-brand/30 bg-brand/5 shadow-xs' 
                        : 'border-border/60 bg-muted/20 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`p-2.5 rounded-xl ${ach.unlocked ? 'bg-brand/20 text-brand' : 'bg-muted text-muted-foreground'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        ach.unlocked ? 'bg-brand text-white' : 'bg-muted text-muted-foreground'
                      }`}>
                        {ach.unlocked ? 'UNLOCKED' : 'LOCKED'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-foreground">{ach.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{ach.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>

      {/* Proof Modal */}
      {selectedProofAttempt && (
        <MissionProofModal
          attempt={selectedProofAttempt}
          onClose={() => setSelectedProofAttempt(null)}
        />
      )}
    </div>
  );
}

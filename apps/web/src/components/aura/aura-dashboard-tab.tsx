'use client';

import React, { useState } from 'react';
import { useEntitlements } from '@/lib/entitlements-context';
import Link from 'next/link';
import { 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  TrendingUp, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  Flame, 
  Award,
  Lock,
  ExternalLink,
  Target,
  Video,
  Play,
  FileCode,
  Plus,
  RefreshCw,
  Share2,
  FolderLock
} from 'lucide-react';

interface AuraDashboardTabProps {
  overviewData: any;
  onSelectTab: (tab: string) => void;
}

export function AuraDashboardTab({ overviewData, onSelectTab }: AuraDashboardTabProps) {
  const { plan, usage, entitlements, openUpgradeModal } = useEntitlements();
  const [brandingState, setBrandingState] = useState<any>(overviewData?.branding || null);
  const [isEditingScript, setIsEditingScript] = useState(false);
  const [editedScript, setEditedScript] = useState(overviewData?.branding?.scriptText || '');
  const [isGeneratingBranding, setIsGeneratingBranding] = useState(false);
  const [portfolioList, setPortfolioList] = useState<any[]>(overviewData?.portfolio || []);

  const profile = overviewData?.profile || { displayName: 'Venkata Kopuri' };
  const activeRole = overviewData?.activeRole || { name: 'Software Engineer', level: 'student' };
  const nextAction = overviewData?.nextBestAction || {
    title: 'Debug & Optimize Authentication Middleware',
    reason: 'Identified as your highest-impact skill gap (45% proficiency vs 80% target)',
    skillName: 'API Architecture',
    difficulty: 'Junior',
    estimatedMinutes: 20,
    expectedEloImpact: '+8 to +16 ELO',
    arenaUrl: '/arena',
    skillStudioUrl: '/skill-studio',
  };

  const recentEvidence = overviewData?.recentEvidence || [];
  const readiness = overviewData?.readiness || { overall: 35, technical: 40, practical: 25, interview: 75, evidence: 20, consistency: 85 };
  const elo = overviewData?.elo || { current: 1000, history: [] };

  async function handleGenerateBranding() {
    if (plan !== 'elite') {
      openUpgradeModal('personal_branding_video');
      return;
    }
    setIsGeneratingBranding(true);
    try {
      const res = await fetch('http://localhost:3001/api/aura/branding', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success && data.data.branding) {
        setBrandingState(data.data.branding);
        setEditedScript(data.data.branding.scriptText);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingBranding(false);
    }
  }

  return (
    <div className="space-y-10 font-sans">
            {/* Career OS Capacity & Entitlements Telemetry */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
              Career OS Capacity & Intelligence Limits
            </span>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
              plan === 'elite' ? 'bg-purple-500/10 text-purple-600 border border-purple-500/30' :
              plan === 'pro' ? 'bg-brand/10 text-brand border border-brand/30' :
              'bg-muted text-muted-foreground border border-border'
            }`}>
              {plan.toUpperCase()} PLAN
            </span>
          </div>

          <button
            onClick={() => openUpgradeModal()}
            className="text-xs font-mono font-bold text-brand hover:underline flex items-center gap-1"
          >
            <span>{plan === 'free' ? 'Upgrade Plan →' : 'Manage Subscription →'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase font-semibold">Today&apos;s Arena</div>
            <div className="text-lg font-bold text-foreground">
              {usage.arenaTasksToday} <span className="text-xs font-normal text-muted-foreground">/ {usage.arenaLimit} tasks</span>
            </div>
            <div className="text-[9px] text-muted-foreground">Daily reset: 12 AM IST</div>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase font-semibold">AI Interviews</div>
            <div className="text-lg font-bold text-foreground">
              {plan === 'free' ? '0' : usage.aiInterviewsThisMonth} <span className="text-xs font-normal text-muted-foreground">/ {usage.aiInterviewsLimit} mo</span>
            </div>
            <div className="text-[9px] text-muted-foreground">
              {plan === 'free' ? 'Locked in Free' : 'Monthly reset'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase font-semibold">Skill Reports</div>
            <div className="text-lg font-bold text-foreground">
              {plan === 'free' ? '0' : usage.skillReportsThisMonth} <span className="text-xs font-normal text-muted-foreground">/ {usage.skillReportsLimit} mo</span>
            </div>
            <div className="text-[9px] text-muted-foreground">
              {plan === 'free' ? 'Locked in Free' : 'Diagnostic review'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase font-semibold">Personal Branding</div>
            <div className="text-lg font-bold text-brand">
              {plan === 'elite' ? 'INCLUDED' : '₹129'}
            </div>
            <div className="text-[9px] text-muted-foreground">
              {plan === 'elite' ? 'Elite active' : 'Available in Elite'}
            </div>
          </div>
        </div>
      </div>

      {/* 1. Next Best Career Action Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-brand/10 via-card to-card border-2 border-brand/30 shadow-lg space-y-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-brand">
            <Zap className="w-4 h-4 fill-current text-brand" />
            <span>Next Recommended Career Action • {activeRole.name} Track</span>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-brand/10 text-brand font-semibold self-start sm:self-auto">
            Expected Impact: {nextAction.expectedEloImpact}
          </span>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            {nextAction.title}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {nextAction.reason}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-muted-foreground pt-2">
          <span className="flex items-center gap-1.5 text-foreground font-medium">
            <Target className="w-3.5 h-3.5 text-brand" />
            <span>Skill: {nextAction.skillName}</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5 text-foreground font-medium">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Est. Time: {nextAction.estimatedMinutes} mins</span>
          </span>
          <span>•</span>
          <span className="px-2 py-0.5 rounded bg-muted text-foreground border border-border">
            Difficulty: {nextAction.difficulty}
          </span>
        </div>

        <div className="pt-3 border-t border-border/80 flex flex-wrap items-center gap-3">
          <Link
            href={nextAction.arenaUrl}
            className="px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2"
          >
            <span>Practice in Arena</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href={nextAction.skillStudioUrl}
            className="px-5 py-2.5 rounded-xl border border-border hover:bg-muted text-foreground text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <span>Learn in Skill Studio</span>
          </Link>
        </div>
      </div>

      {/* 2. Personal Branding Video Section */}
      <div className="p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-brand">
              <Video className="w-4 h-4" />
              <span>Personal Brand • Continuous Career Identity</span>
            </div>
            <h3 className="text-lg font-bold text-foreground mt-1">
              Tell your {activeRole.name} career story in 45 seconds.
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Synthesized from your real target role, verified Arena accomplishments, and demonstrated skill telemetry.
            </p>
          </div>

          <button
            onClick={handleGenerateBranding}
            disabled={isGeneratingBranding}
            className="px-4 py-2 rounded-xl bg-foreground text-background hover:bg-foreground/90 text-xs font-semibold shadow-xs transition-colors flex items-center gap-2 shrink-0 self-start sm:self-auto disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingBranding ? 'animate-spin' : ''}`} />
            <span>{isGeneratingBranding ? 'Synthesizing...' : 'Regenerate Brand Video'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left: Interactive Video Preview Player Box */}
          <div className="lg:col-span-5 h-56 rounded-2xl bg-gradient-to-br from-graphite-900 via-graphite-950 to-black p-5 text-white flex flex-col justify-between border border-border/40 shadow-inner relative overflow-hidden">
            <div className="flex items-center justify-between z-10">
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-brand/20 text-brand border border-brand/30 font-semibold">
                45-Sec Elevator Pitch
              </span>
              <span className="text-[11px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Ready to Share</span>
              </span>
            </div>

            <div className="space-y-1 z-10 text-center py-2">
              <div className="w-12 h-12 rounded-full bg-brand/20 border border-brand/40 text-brand flex items-center justify-center mx-auto cursor-pointer hover:scale-110 transition-transform shadow-lg">
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </div>
              <div className="font-bold text-sm text-white pt-1">{profile.displayName}</div>
              <div className="text-xs text-graphite-300 font-mono">Target: {activeRole.name}</div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-graphite-400 z-10 pt-2 border-t border-white/10">
              <span>Verified Proof Attached</span>
              <span className="text-brand font-semibold">Capabilio Verified</span>
            </div>
          </div>

          {/* Right: Dynamic Role-Specific Script */}
          <div className="lg:col-span-7 space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground font-mono uppercase">
                  Synthesized Career Narrative
                </span>
                <button
                  onClick={() => setIsEditingScript(!isEditingScript)}
                  className="text-xs text-brand font-semibold hover:underline"
                >
                  {isEditingScript ? 'Done Editing' : 'Edit Script'}
                </button>
              </div>

              {isEditingScript ? (
                <textarea
                  rows={4}
                  value={editedScript}
                  onChange={(e) => setEditedScript(e.target.value)}
                  className="w-full p-3 bg-muted/40 border border-border rounded-xl text-xs text-foreground leading-relaxed focus:border-brand focus:outline-hidden"
                />
              ) : (
                <div className="p-4 bg-muted/30 border border-border/80 rounded-xl text-xs text-foreground leading-relaxed italic">
                  &ldquo;{editedScript || brandingState?.scriptText}&rdquo;
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-mono uppercase text-muted-foreground">Demonstrated Core Competencies Highlighted:</div>
              <div className="flex flex-wrap items-center gap-1.5">
                {(brandingState?.topCapabilities || ['API Architecture', 'Deterministic Testing', 'Database Indexing']).map((cap: string) => (
                  <span key={cap} className="text-xs font-mono px-2.5 py-0.5 rounded-md bg-muted text-foreground border border-border">
                    ✓ {cap}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Living Professional Portfolio Section */}
      <div className="p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-brand">
              <FolderLock className="w-4 h-4" />
              <span>Living Professional Portfolio</span>
            </div>
            <h3 className="text-lg font-bold text-foreground mt-1">
              Verified Work Samples & Simulation Deliverables
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Living evidence automatically linked from your passed Arena sprint tickets and project submissions.
            </p>
          </div>

          <Link
            href="/arena"
            className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Complete Ticket to Add Work</span>
          </Link>
        </div>

        {portfolioList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {portfolioList.map((item: any) => (
              <div
                key={item.id}
                className="p-5 rounded-2xl border border-border bg-muted/20 hover:border-brand/40 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      {item.difficulty || 'Junior'} Sprint
                    </span>
                    <span className="text-xs font-mono text-emerald-600 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{item.score}% Score</span>
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-foreground">
                    {item.title}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {item.description}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-border/80">
                  <div className="flex flex-wrap items-center gap-1">
                    {(item.skills || []).map((sk: any) => (
                      <span key={sk.skillName || sk} className="text-[10px] font-mono px-2 py-0.5 rounded bg-card text-foreground border border-border">
                        {sk.skillName || sk}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    <span className="text-brand font-semibold flex items-center gap-1">
                      <span>Verified Evidence</span>
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-muted/10 space-y-3">
            <FolderLock className="w-8 h-8 text-muted-foreground mx-auto" />
            <div className="font-bold text-sm text-foreground">Your Professional Portfolio Starts Here</div>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Whenever you complete a meaningful {activeRole.name} Arena simulation, you can promote it directly into your verified portfolio with one click.
            </p>
            <div className="pt-2">
              <Link
                href="/arena"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold transition-colors"
              >
                <span>Launch First Workstation Ticket</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* 4. Readiness Breakdown & Momentum Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Job Readiness Breakdown */}
        <div className="lg:col-span-6 p-6 sm:p-7 rounded-2xl border border-border bg-card shadow-2xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h3 className="text-base font-bold text-foreground">
                Job Readiness Index • {activeRole.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Weighted algorithmic model across 5 core competency pillars.
              </p>
            </div>
            <span className="text-xl font-bold font-mono text-brand">
              {readiness.overall}%
            </span>
          </div>

          <div className="space-y-4">
            {[
              { label: 'Technical Foundations', score: readiness.technical, weight: '35% weight' },
              { label: 'Practical Arena Workstations', score: readiness.practical, weight: '25% weight' },
              { label: 'AI Interview Performance', score: readiness.interview, weight: '20% weight' },
              { label: 'Verified Evidence Completeness', score: readiness.evidence, weight: '15% weight' },
              { label: 'Practice Consistency & Streak', score: readiness.consistency, weight: '5% weight' },
            ].map(item => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-mono">{item.weight}</span>
                    <span className="font-mono font-bold text-foreground">{item.score}%</span>
                  </div>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand rounded-full transition-all duration-500"
                    style={{ width: `${item.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <button
              onClick={() => onSelectTab('skill-gaps')}
              className="text-xs font-semibold text-brand hover:underline flex items-center gap-1"
            >
              <span>Inspect Detailed Skill Gaps</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Career ELO Trend & Momentum */}
        <div className="lg:col-span-6 p-6 sm:p-7 rounded-2xl border border-border bg-card shadow-2xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h3 className="text-base font-bold text-foreground">
                Career ELO Progression
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Standardized capability score based on verified mission completions.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-mono text-emerald-600 font-bold">
              <TrendingUp className="w-4 h-4" />
              <span>Current: {elo.current}</span>
            </div>
          </div>

          {elo.history && elo.history.length > 0 ? (
            <div className="space-y-3">
              {elo.history.map((change: any) => (
                <div key={change.id} className="p-3 bg-muted/30 rounded-xl border border-border/60 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-foreground">{change.reason}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">
                      {new Date(change.createdAt).toLocaleDateString()} • {change.difficulty}
                    </div>
                  </div>
                  <span className="font-mono font-bold text-emerald-600 px-2 py-0.5 rounded bg-emerald-500/10">
                    +{change.delta} ELO
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center rounded-xl bg-muted/20 border border-border space-y-2">
              <Award className="w-8 h-8 text-muted-foreground mx-auto" />
              <div className="text-xs font-semibold text-foreground">Baseline Rating: 1,000</div>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                Complete your first Arena sprint ticket to record your initial ELO delta!
              </p>
              <Link
                href="/arena"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline pt-2"
              >
                <span>Launch First Ticket</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

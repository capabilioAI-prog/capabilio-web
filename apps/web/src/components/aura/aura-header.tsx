'use client';

import React, { useState } from 'react';
import { 
  User, 
  Target, 
  ShieldCheck, 
  Award, 
  TrendingUp, 
  Share2, 
  Edit3, 
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Zap,
  GraduationCap,
  Building2,
  BookOpen
} from 'lucide-react';
import { getEloTierLabel, getEloTierColor } from '@/lib/utils';
import { useEntitlements } from '@/lib/entitlements-context';

interface AuraHeaderProps {
  overviewData: any;
  onEditProfile: () => void;
  onSelectTab: (tab: string) => void;
}

export function AuraHeader({ overviewData, onEditProfile, onSelectTab }: AuraHeaderProps) {
  const { plan, usage, openUpgradeModal } = useEntitlements();
  const [copiedShare, setCopiedShare] = useState(false);

  const profile = overviewData?.profile || { 
    displayName: 'Capabilio Candidate', 
    headline: '',
    collegeName: null,
    stream: 'CSE'
  };

  const activeRole = overviewData?.activeRole || { 
    name: 'Data Analyst', 
    slug: 'data-analyst',
    level: 'student' 
  };

  const elo = overviewData?.elo || { 
    current: 400, 
    baseline: 400,
    deltaFromBaseline: 0,
    totalMissions: 0,
    passedMissions: 0,
    passRate: null 
  };

  const readiness = overviewData?.readiness || { overall: 35 };
  const demonstratedSkills = overviewData?.demonstratedSkills || { count: 3, total: 10 };

  const tierLabel = getEloTierLabel(elo.current);
  const tierColor = getEloTierColor(elo.current);

  const careerLevelLabel = activeRole.level === 'student' 
    ? 'Student / Fresher' 
    : activeRole.level === 'entry' 
    ? 'Entry-Level' 
    : `${activeRole.level.charAt(0).toUpperCase() + activeRole.level.slice(1)} Level`;

  function handleShare() {
    navigator.clipboard.writeText(window.location.origin + '/aura');
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  }

  return (
    <div className="w-full bg-card border-b border-border font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Top Eyebrow */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-brand">
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
            <span>Capabilio Aura • Continuous Career Intelligence</span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
              plan === 'elite' ? 'bg-purple-500/10 text-purple-600 border border-purple-500/30' :
              plan === 'pro' ? 'bg-brand/10 text-brand border border-brand/30' :
              'bg-muted text-muted-foreground border border-border'
            }`}>
              CAREER OS {plan.toUpperCase()}
            </span>

            {plan !== 'elite' && (
              <button
                onClick={() => openUpgradeModal()}
                className="text-[11px] font-mono text-brand hover:underline font-bold"
              >
                {plan === 'free' ? 'Upgrade to Pro →' : 'Upgrade to Elite →'}
              </button>
            )}
          </div>
        </div>

        {/* Profile Card Main Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Avatar & User Details */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-brand/10 text-brand flex items-center justify-center font-bold text-2xl font-mono border-2 border-brand/20 shadow-xs shrink-0 relative">
              {profile.displayName ? profile.displayName[0] : 'C'}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-card" title="Online & Telemetry Active" />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                  {profile.displayName}
                </h1>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-brand/10 text-brand font-semibold border border-brand/20">
                  Target: {activeRole.name}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                  Level: {careerLevelLabel}
                </span>
              </div>

              {/* College & Stream Context Bar */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-mono">
                <div className="flex items-center gap-1.5 text-foreground font-semibold">
                  <GraduationCap className="w-3.5 h-3.5 text-brand" />
                  <span>{profile.collegeName || 'College not added'}</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                  <span>{profile.stream || 'General Engineering'}</span>
                </div>
                {profile.department && (
                  <>
                    <span>•</span>
                    <span>{profile.department}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 self-start lg:self-center shrink-0">
            <button
              onClick={onEditProfile}
              data-testid="edit-profile-btn"
              className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-foreground text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile & Target Role</span>
            </button>

            <button
              onClick={handleShare}
              className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-foreground text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copiedShare ? 'Link Copied!' : 'Share Profile'}</span>
            </button>

            <button
              onClick={() => onSelectTab('vault')}
              className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>View Evidence Vault</span>
            </button>
          </div>
        </div>

        {/* 4 Real Telemetry Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-2">
          {/* 1. CAREER ELO */}
          <div className="p-4 rounded-2xl bg-muted/30 border border-border/80 space-y-1.5 font-mono">
            <div className="text-[11px] text-muted-foreground uppercase flex items-center justify-between font-bold">
              <span>CAREER ELO</span>
              <Award className="w-4 h-4 text-brand" />
            </div>
            <div className="text-2xl font-black text-foreground">
              {elo.current}
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center justify-between">
              <span style={{ color: tierColor }} className="font-semibold">{tierLabel}</span>
              <span>{elo.deltaFromBaseline >= 0 ? `+${elo.deltaFromBaseline}` : elo.deltaFromBaseline} from base</span>
            </div>
          </div>

          {/* 2. ROLE READINESS */}
          <div className="p-4 rounded-2xl bg-muted/30 border border-border/80 space-y-1.5 font-mono">
            <div className="text-[11px] text-muted-foreground uppercase flex items-center justify-between font-bold">
              <span>ROLE READINESS</span>
              <Target className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-foreground">
              {readiness.overall}%
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              {activeRole.name}
            </div>
          </div>

          {/* 3. DEMONSTRATED SKILLS */}
          <div className="p-4 rounded-2xl bg-muted/30 border border-border/80 space-y-1.5 font-mono">
            <div className="text-[11px] text-muted-foreground uppercase flex items-center justify-between font-bold">
              <span>DEMONSTRATED SKILLS</span>
              <ShieldCheck className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-black text-foreground">
              {demonstratedSkills.count} <span className="text-sm text-muted-foreground font-normal">/ {demonstratedSkills.total}</span>
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold">
              In Verified Vault
            </div>
          </div>

          {/* 4. ARENA PASS RATE */}
          <div className="p-4 rounded-2xl bg-muted/30 border border-border/80 space-y-1.5 font-mono">
            <div className="text-[11px] text-muted-foreground uppercase flex items-center justify-between font-bold">
              <span>ARENA PASS RATE</span>
              <TrendingUp className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-2xl font-black text-foreground">
              {elo.passRate !== null && elo.passRate !== undefined ? `${elo.passRate}%` : '—'}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              {elo.totalMissions > 0 ? `${elo.passedMissions}/${elo.totalMissions} Evaluated Missions` : 'No evaluated missions yet'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

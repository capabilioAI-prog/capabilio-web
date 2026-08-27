'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Flame, 
  TrendingUp, 
  Building2, 
  Users, 
  Zap, 
  Sparkles, 
  ArrowRight, 
  Plus, 
  Check,
  Compass
} from 'lucide-react';

interface PulseIntelligencePanelProps {
  userDomain: string;
  userRole: string;
  trendingData: any;
  followedTargetIds: string[];
  onToggleFollow: (type: 'user' | 'company' | 'topic', id: string, name: string) => void;
}

export function PulseIntelligencePanel({
  userDomain,
  userRole,
  trendingData,
  followedTargetIds,
  onToggleFollow,
}: PulseIntelligencePanelProps) {
  const followedSet = new Set(followedTargetIds);
  const intel = trendingData?.intelligence || {
    momentum: 'High (+18%)',
    hiringRate: '↑ 14% this month',
    topSkills: ['TypeScript 5.4', 'Next.js 14 App Router', 'Deterministic Testing', 'API Architecture'],
    whatsChanging: [
      'Shift from algorithmic LeetCode toward deterministic work simulations',
      'Growing demand for token-bucket rate limiting in multi-region microservices',
      'Strict TypeScript 5.4 generic constraint enforcement in enterprise backends'
    ],
    companiesToWatch: [
      { name: 'Stripe', hiringRole: 'Staff Systems Engineer', logoBg: 'bg-indigo-500' },
      { name: 'TechFlow Core', hiringRole: 'Full Stack Engineer', logoBg: 'bg-brand' },
      { name: 'Vercel Ecosystem', hiringRole: 'Frontend Platform Lead', logoBg: 'bg-black' }
    ],
    suggestedPeople: [
      { name: 'David K.', headline: 'Staff Software Engineer @ Stripe', role: 'Software Engineer' },
      { name: 'Elena Rostova', headline: 'Tech Lead @ CloudScale Systems', role: 'Full Stack Developer' }
    ]
  };

  return (
    <aside className="w-full space-y-6 font-sans">
      {/* Domain Momentum Card */}
      <div className="p-4 rounded-2xl border border-border bg-card shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-brand font-semibold">
            Track Momentum
          </span>
          <span className="text-xs font-mono font-bold text-emerald-600">
            {intel.hiringRate}
          </span>
        </div>
        <div>
          <div className="text-sm font-bold text-foreground">
            {userRole}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Market Demand: <strong className="text-foreground">{intel.momentum}</strong></span>
          </div>
        </div>
      </div>

      {/* What's Changing Section */}
      <div className="p-4 rounded-2xl border border-border bg-card shadow-2xs space-y-3">
        <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>What&apos;s Changing</span>
        </div>
        <ul className="space-y-2 text-xs text-muted-foreground">
          {intel.whatsChanging.map((item: string, idx: number) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-brand font-bold shrink-0">•</span>
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Skills Gaining Momentum */}
      <div className="p-4 rounded-2xl border border-border bg-card shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
            Skills Gaining Momentum
          </span>
          <span className="text-[10px] font-mono text-brand">Live Index</span>
        </div>
        <div className="space-y-2">
          {intel.topSkills.map((skill: string) => (
            <div key={skill} className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">{skill}</span>
              <Link
                href="/arena"
                className="text-[11px] font-mono text-brand hover:underline flex items-center gap-1"
              >
                <span>Practice</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Companies to Watch */}
      <div className="p-4 rounded-2xl border border-border bg-card shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
            Companies to Watch
          </span>
          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <div className="space-y-2.5">
          {intel.companiesToWatch.map((comp: any) => {
            const isFollowing = followedSet.has(comp.name);
            return (
              <div key={comp.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-md ${comp.logoBg} text-white flex items-center justify-center font-bold text-[10px] font-mono`}>
                    {comp.name[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{comp.name}</div>
                    <div className="text-[10px] text-muted-foreground">{comp.hiringRole}</div>
                  </div>
                </div>
                <button
                  onClick={() => onToggleFollow('company', comp.name, comp.name)}
                  className={
                    isFollowing
                      ? 'p-1 rounded bg-brand/10 text-brand'
                      : 'p-1 rounded bg-muted text-muted-foreground hover:text-foreground'
                  }
                  title={isFollowing ? 'Unfollow' : 'Follow company'}
                >
                  {isFollowing ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* People to Follow */}
      <div className="p-4 rounded-2xl border border-border bg-card shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
            People to Follow
          </span>
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <div className="space-y-2.5">
          {intel.suggestedPeople.map((person: any) => {
            const isFollowing = followedSet.has(person.name);
            return (
              <div key={person.name} className="flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-foreground">{person.name}</div>
                  <div className="text-[10px] text-muted-foreground">{person.headline}</div>
                </div>
                <button
                  onClick={() => onToggleFollow('user', person.name, person.name)}
                  className={
                    isFollowing
                      ? 'p-1 rounded bg-brand/10 text-brand'
                      : 'p-1 rounded bg-muted text-muted-foreground hover:text-foreground'
                  }
                  title={isFollowing ? 'Unfollow' : 'Follow'}
                >
                  {isFollowing ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

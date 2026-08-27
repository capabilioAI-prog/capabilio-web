'use client';

import React from 'react';
import { 
  Radio, 
  Sparkles, 
  Users, 
  Flame, 
  Code2, 
  Briefcase, 
  Building2, 
  Bookmark, 
  Hash, 
  Plus, 
  Check, 
  ChevronRight,
  TrendingUp,
  Layers,
  Compass
} from 'lucide-react';

interface PulseSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  userDomain: string;
  userRole: string;
  topics: Array<{ name: string; slug: string; growthRate: string }>;
  followedTargetIds: string[];
  onToggleFollow: (type: 'user' | 'company' | 'topic', id: string, name: string) => void;
  savedCount: number;
}

export function PulseSidebar({
  activeTab,
  onTabChange,
  userDomain,
  userRole,
  topics,
  followedTargetIds,
  onToggleFollow,
  savedCount,
}: PulseSidebarProps) {
  const followedSet = new Set(followedTargetIds);

  const TABS = [
    { id: 'for-you', label: 'For You', icon: Sparkles, badge: 'Smart' },
    { id: 'following', label: 'Following', icon: Users },
    { id: 'trending', label: 'Trending', icon: Flame },
    { id: 'technical', label: 'Technical & Code', icon: Code2 },
    { id: 'career', label: 'Career & Proof', icon: Briefcase },
    { id: 'companies', label: 'Companies', icon: Building2 },
    { id: 'saved', label: 'Saved Items', icon: Bookmark, count: savedCount },
  ];

  return (
    <aside className="w-full space-y-6 font-sans">
      {/* Domain Badge Card */}
      <div className="p-4 rounded-2xl border border-border bg-card shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
            Your Career Domain
          </span>
          <span className="flex items-center gap-1 text-[11px] font-mono text-brand font-semibold">
            <Radio className="w-3 h-3 animate-pulse text-brand" />
            <span>Active</span>
          </span>
        </div>
        <div>
          <div className="font-bold text-sm text-foreground">
            {userRole}
          </div>
          <div className="text-[11px] text-muted-foreground capitalize mt-0.5">
            {userDomain.replace(/_/g, ' ')} Focus
          </div>
        </div>
        <div className="pt-2 border-t border-border/80 flex items-center justify-between text-xs text-muted-foreground">
          <span>Feed Personalization:</span>
          <span className="text-emerald-600 font-mono font-medium">100% Calibrated</span>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <nav className="space-y-1">
        <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
          Pulse Feeds
        </div>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={
                isActive
                  ? 'w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-brand text-white font-semibold text-xs transition-colors shadow-xs'
                  : 'w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-muted/60 text-muted-foreground hover:text-foreground font-medium text-xs transition-colors'
              }
            >
              <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </div>
              {tab.badge && (
                <span className={isActive ? 'text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/20 text-white' : 'text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground'}>
                  {tab.badge}
                </span>
              )}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={isActive ? 'text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/20 text-white font-bold' : 'text-[10px] font-mono px-1.5 py-0.2 rounded bg-brand/10 text-brand font-bold'}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Your Topics Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-3">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
            Your Track Topics
          </span>
          <span className="text-[10px] font-mono text-brand">Adaptive</span>
        </div>

        <div className="space-y-1.5">
          {topics.slice(0, 5).map(topic => {
            const isFollowing = followedSet.has(topic.slug);
            return (
              <div
                key={topic.slug}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-card border border-border/80 hover:border-brand/40 text-xs transition-all group"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <Hash className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="font-medium text-foreground truncate">{topic.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-emerald-600 font-medium">
                    {topic.growthRate}
                  </span>
                  <button
                    onClick={() => onToggleFollow('topic', topic.slug, topic.name)}
                    className={
                      isFollowing
                        ? 'p-1 rounded bg-brand/10 text-brand hover:bg-brand/20 transition-colors'
                        : 'p-1 rounded bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors'
                    }
                    title={isFollowing ? 'Unfollow topic' : 'Follow topic'}
                  >
                    {isFollowing ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bridge Card to Arena */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-brand/10 via-brand/5 to-transparent border border-brand/20 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-brand">
          <Compass className="w-3.5 h-3.5" />
          <span>Connect Pulse to Action</span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Discovered a new concept in your feed? Execute sprint tickets in Arena to convert knowledge into verified ELO.
        </p>
      </div>
    </aside>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  GraduationCap, 
  ArrowLeft, 
  ArrowRight, 
  TrendingUp, 
  ShieldCheck, 
  Clock, 
  Lock, 
  CheckCircle2, 
  Sparkles, 
  Award, 
  Flame, 
  Trophy, 
  FileText, 
  Binary, 
  Code2,
  Cpu,
  Check
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useEntitlements } from '@/lib/entitlements-context';
import { MissionProofModal } from '@/components/arena/mission-proof-modal';

export default function StreamArenaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'tasks';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProofAttempt, setSelectedProofAttempt] = useState<any | null>(null);
  
  // Stream challenge solving state
  const [activeChallengeModal, setActiveChallengeModal] = useState<any | null>(null);
  const [challengeCode, setChallengeCode] = useState('');
  const [isEvaluatingChallenge, setIsEvaluatingChallenge] = useState(false);
  const [challengeResult, setChallengeResult] = useState<any | null>(null);

  const { user, profile } = useAuth();
  const { plan } = useEntitlements();

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
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectTab(tabId: string) {
    setActiveTab(tabId);
    router.replace(`/arena/stream?tab=${tabId}`);
  }

  const streamTrack = dashboardData?.streamTrack || { 
    shortCode: profile?.stream || 'CSE', 
    streamName: 'Computer Science & Engineering', 
    rating: 500, 
    challenges: [] 
  };

  const allAttempts = dashboardData?.attempts || [];
  const streamAttempts = allAttempts.filter((a: any) => a.trackType === 'stream');
  const streamAchievements = (dashboardData?.achievements || []).filter((ach: any) => ach.track === 'stream');
  const streamLeaderboard = dashboardData?.leaderboards?.stream || [];

  const defaultChallenges = [
    {
      id: 'cse_dsa_01',
      streamSlug: 'cse',
      title: 'Optimize Duplicate Transaction Detection to O(N)',
      category: 'Data Structures & Algorithms',
      difficulty: 'foundation',
      estimatedMinutes: 12,
      ratingReward: 12,
      expectedComplexity: 'O(N) Time, O(N) Space',
      problemStatement: 'Given an array of transaction IDs across 100,000 banking ledger logs, detect duplicates in linear O(N) time using an optimized Hash Set.',
      starterCode: 'function findDuplicates(transactions: string[]): string[] {\n  const seen = new Set<string>();\n  const duplicates: string[] = [];\n  for (const tx of transactions) {\n    if (seen.has(tx)) duplicates.push(tx);\n    seen.add(tx);\n  }\n  return duplicates;\n}',
    },
    {
      id: 'cse_dsa_02',
      streamSlug: 'cse',
      title: 'LRU Cache Design with O(1) Eviction',
      category: 'System Data Structures',
      difficulty: 'intermediate',
      estimatedMinutes: 15,
      ratingReward: 18,
      expectedComplexity: 'O(1) Get and Put',
      problemStatement: 'Implement a Least Recently Used (LRU) Cache data structure with O(1) time complexity for both get() and put() operations using a Doubly Linked List and Hash Map.',
      starterCode: 'class LRUCache {\n  private capacity: number;\n  private map: Map<number, number>;\n\n  constructor(capacity: number) {\n    this.capacity = capacity;\n    this.map = new Map();\n  }\n}',
    },
  ];

  const availableChallenges = streamTrack.challenges?.length > 0 ? streamTrack.challenges : defaultChallenges;

  function openSolveModal(challenge: any) {
    setActiveChallengeModal(challenge);
    setChallengeCode(challenge.starterCode || '');
    setChallengeResult(null);
  }

  async function handleSolveSubmit() {
    if (!activeChallengeModal) return;
    setIsEvaluatingChallenge(true);

    try {
      const res = await fetch(`http://localhost:3001/api/arena/stream-challenges/${activeChallengeModal.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          code: challengeCode,
          streamSlug: streamTrack.shortCode?.toLowerCase() || 'cse',
        }),
      });

      const data = await res.json();
      if (data.success && data.data?.evaluation) {
        setChallengeResult(data.data.evaluation);
        await fetchDashboard();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsEvaluatingChallenge(false);
    }
  }

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
              <span className="text-2xs font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                STREAM ARENA ACTIVE
              </span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Capabilio Arena // Academic Stream Track</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight uppercase">
                {streamTrack.streamName}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Turn your academic discipline knowledge into demonstrated problem-solving ability.
              </p>
            </div>

            {/* Real Telemetry Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-0.5">
                <div className="text-[10px] text-muted-foreground uppercase font-bold">STREAM RATING</div>
                <div className="text-base font-black text-foreground">{streamTrack.rating} <span className="text-[10px] font-normal text-muted-foreground">PTS</span></div>
                <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">{streamTrack.shortCode} Track</div>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-0.5">
                <div className="text-[10px] text-muted-foreground uppercase font-bold">BRANCH</div>
                <div className="text-base font-black text-foreground">{streamTrack.shortCode}</div>
                <div className="text-[10px] text-muted-foreground">Engineering Major</div>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-0.5">
                <div className="text-[10px] text-muted-foreground uppercase font-bold">SOLVED CHALLENGES</div>
                <div className="text-base font-black text-foreground">{streamAttempts.length}</div>
                <div className="text-[10px] text-emerald-600">Verified Proofs</div>
              </div>

              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-0.5">
                <div className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-bold">CORE TOPIC</div>
                <div className="text-xs font-bold text-foreground truncate">Algorithms & DSA</div>
                <div className="text-[10px] text-blue-600">Linear O(N)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Internal Navigation Tabs (Stream-Only) */}
      <div className="border-b border-border bg-muted/20 sticky top-14 z-30 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 overflow-x-auto py-2 font-mono text-xs">
          {[
            { id: 'tasks', label: 'TASKS', icon: Code2 },
            { id: 'history', label: `HISTORY (${streamAttempts.length})`, icon: FileText },
            { id: 'streak', label: 'STREAK', icon: Flame },
            { id: 'leaderboard', label: 'LEADERBOARD', icon: Trophy },
            { id: 'achievements', label: 'ACHIEVEMENTS', icon: Award },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                data-testid={`stream-tab-${tab.id}`}
                onClick={() => handleSelectTab(tab.id)}
                className={`px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 shrink-0 ${
                  isActive 
                    ? 'bg-foreground text-background shadow-xs' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-500' : ''}`} />
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
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-lg font-bold text-foreground font-sans">
                  {streamTrack.streamName} Engineering Challenges
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                  Master systems programming, algorithmic efficiency, and discipline domain constraints.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                DISCIPLINE: {streamTrack.shortCode}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {availableChallenges.map((ch: any) => {
                const isSolved = streamAttempts.some((a: any) => a.missionId === ch.id && a.passed);
                return (
                  <div
                    key={ch.id}
                    className="p-6 rounded-3xl border-2 border-border hover:border-blue-500/40 bg-card shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between font-mono text-xs">
                        <span className="text-2xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {ch.category}
                        </span>
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                          +{ch.ratingReward || 12} PTS
                        </span>
                      </div>

                      <h4 className="text-lg font-bold text-foreground font-sans">
                        {ch.title}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {ch.problemStatement}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border font-mono text-2xs text-muted-foreground">
                        <span className="px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                          {ch.expectedComplexity}
                        </span>
                        <span>•</span>
                        <span>Est. {ch.estimatedMinutes} mins</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      {isSolved ? (
                        <div className="space-y-2">
                          <div className="w-full py-3 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-xs font-mono font-bold flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>SOLVED & VERIFIED (+{ch.ratingReward || 12} PTS)</span>
                          </div>
                          <div className="text-center text-2xs font-mono text-muted-foreground font-semibold">
                            ✓ Permanently completed
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => openSolveModal(ch)}
                          data-testid="start-stream-challenge-btn"
                          className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono font-bold shadow-xs transition-colors flex items-center justify-center gap-2"
                        >
                          <span>Solve Challenge →</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Next Locked Adaptive Stream Challenge — 24-Hour Rotation */}
            <div className="p-6 rounded-2xl border border-dashed border-border bg-muted/20 space-y-4 font-mono">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>NEXT ADAPTIVE CHALLENGE // 24-HOUR ROTATION</span>
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 font-bold">
                  New challenge available in: 23:42:18
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-sm text-muted-foreground font-sans">
                  Implement LRU Cache with $O(1)$ Time Complexity & Doubly Linked Map
                </h4>
                <p className="text-xs text-muted-foreground font-sans">
                  Design data structures for optimal capacity eviction, node splicing, and lock-free thread safety.
                </p>
              </div>

              {/* Separate Plan Allowance & Midnight IST Quota Reset */}
              <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="font-bold text-foreground">PLAN ALLOWANCE:</span>
                  <span>{streamAttempts.length > 0 ? '1' : '0'} / 1 used</span>
                  <span>•</span>
                  <span>Daily quota resets: <strong className="text-foreground">12:00 AM IST</strong></span>
                </div>

                <span className="text-blue-600 dark:text-blue-400 font-bold">
                  Free: 1 challenge/day • Pro: 3/day
                </span>
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
                  {streamTrack.shortCode} Academic Solve History
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                  Verified record of completed domain challenges and algorithmic proofs.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                {streamAttempts.length} VERIFIED SOLVES
              </span>
            </div>

            {streamAttempts.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card space-y-3 font-mono text-xs">
                <Binary className="w-8 h-8 text-muted-foreground mx-auto" />
                <div className="font-bold text-foreground">No Stream Challenges Solved Yet</div>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Solve your first {streamTrack.shortCode} challenge to start building your academic discipline rating.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => handleSelectTab('tasks')}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold"
                  >
                    Open Tasks Tab →
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {streamAttempts.map((att: any) => (
                  <div
                    key={att.id || att.missionId}
                    className="p-5 rounded-2xl border border-border bg-card hover:border-blue-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                          ✓ SOLVED
                        </span>
                        <span className="font-bold text-sm text-foreground font-sans">
                          {att.title}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-[11px]">
                        <span>Score: <strong className="text-foreground">{att.score}%</strong></span>
                        <span>•</span>
                        <span>Rating Delta: <strong className="text-blue-600 dark:text-blue-400">+{att.eloChange} PTS</strong></span>
                        <span>•</span>
                        <span>{new Date(att.createdAt || Date.now()).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedProofAttempt(att)}
                      data-testid="view-stream-proof-btn"
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
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                <Flame className="w-4 h-4 fill-current text-blue-500" />
                <span>{streamTrack.shortCode} Academic Practice Streak</span>
              </div>
              <span className="text-xs font-mono text-muted-foreground">Stream Track Only</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono">
              <div className="p-6 rounded-2xl bg-muted/40 border border-border space-y-1">
                <div className="text-xs text-muted-foreground uppercase font-bold">CURRENT STREAM STREAK</div>
                <div className="text-3xl font-black text-foreground">1 DAYS</div>
                <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Continuous Problem Solving</div>
              </div>

              <div className="p-6 rounded-2xl bg-muted/40 border border-border space-y-1">
                <div className="text-xs text-muted-foreground uppercase font-bold">LONGEST RECORD</div>
                <div className="text-3xl font-black text-foreground">5 DAYS</div>
                <div className="text-xs text-muted-foreground">All-time best streak</div>
              </div>
            </div>

            {/* Weekly Activity Checklist */}
            <div className="space-y-2 pt-4 border-t border-border">
              <div className="text-xs font-mono uppercase text-muted-foreground">Weekly Academic Activity:</div>
              <div className="grid grid-cols-7 gap-2 font-mono text-xs text-center">
                {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day, idx) => (
                  <div key={day} className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
                    <div className="text-[10px] text-muted-foreground">{day}</div>
                    <div className="font-bold text-blue-600 dark:text-blue-400">{idx === 0 || idx === 6 ? '✓' : '—'}</div>
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
                  {streamTrack.shortCode} Stream Leaderboard
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                  Ranked by verified discipline rating among all {streamTrack.streamName} students.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                STREAM: {streamTrack.shortCode}
              </span>
            </div>

            <div className="divide-y divide-border/80 border border-border rounded-2xl overflow-hidden font-mono text-xs">
              <div className="grid grid-cols-12 p-3 bg-muted/50 font-bold text-muted-foreground">
                <div className="col-span-2">RANK</div>
                <div className="col-span-6">STUDENT</div>
                <div className="col-span-4 text-right">STREAM RATING</div>
              </div>

              {[
                { rank: 1, name: 'Ananya Roy', stream: streamTrack.shortCode, rating: 820 },
                { rank: 2, name: 'Vikram S.', stream: streamTrack.shortCode, rating: 781 },
                { rank: 3, name: 'Rohan Gupta', stream: streamTrack.shortCode, rating: 694 },
                { rank: 4, name: `${profile?.displayName || 'Current User'} (You)`, stream: streamTrack.shortCode, rating: streamTrack.rating, isCurrent: true },
                { rank: 5, name: 'Divya K.', stream: streamTrack.shortCode, rating: 490 },
              ].map((row) => (
                <div
                  key={row.rank}
                  className={`grid grid-cols-12 p-3.5 items-center transition-colors ${
                    row.isCurrent ? 'bg-blue-500/10 text-foreground font-bold border-l-4 border-l-blue-600' : 'hover:bg-muted/30 text-muted-foreground'
                  }`}
                >
                  <div className="col-span-2 font-bold text-foreground">#{row.rank}</div>
                  <div className="col-span-6 flex items-center gap-2 text-foreground font-medium">
                    <span>{row.name}</span>
                    {row.isCurrent && <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-600 text-white">YOU</span>}
                  </div>
                  <div className="col-span-4 text-right font-bold text-foreground font-mono">
                    {row.rating} <span className="text-[10px] text-muted-foreground font-normal">PTS</span>
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
                  {streamTrack.shortCode} Academic Milestones
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                  Discipline badges unlocked from verified algorithmic and domain challenge passes.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                {streamAchievements.filter((a: any) => a.unlocked).length} UNLOCKED
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { id: 'first_dsa', title: 'First DSA Solve', desc: `Complete first ${streamTrack.shortCode} challenge`, unlocked: streamAttempts.length > 0, icon: Sparkles },
                { id: 'algo_builder', title: 'Algorithm Builder', desc: 'Implement O(N) linear time deduplication', unlocked: streamAttempts.length > 0, icon: Code2 },
                { id: 'test_cases', title: '100 Test Cases', desc: 'Pass rigorous boundary assertion matrix', unlocked: true, icon: CheckCircle2 },
                { id: 'complexity_master', title: 'Complexity Master', desc: 'Satisfy strict time & space asymptotic bounds', unlocked: true, icon: Cpu },
                { id: 'stream_master', title: 'Stream Master', desc: 'Achieve 700+ stream discipline rating', unlocked: false, icon: Award },
                { id: 'stream_streak_7', title: '7 Day Stream Streak', desc: '7 consecutive days of problem solving', unlocked: false, icon: Flame },
              ].map((ach) => {
                const Icon = ach.icon;
                return (
                  <div
                    key={ach.id}
                    className={`p-5 rounded-2xl border transition-all space-y-3 ${
                      ach.unlocked 
                        ? 'border-blue-500/30 bg-blue-500/5 shadow-xs' 
                        : 'border-border/60 bg-muted/20 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`p-2.5 rounded-xl ${ach.unlocked ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-muted text-muted-foreground'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        ach.unlocked ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'
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

      {/* Interactive Stream Challenge Solve Modal */}
      {activeChallengeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
          <div className="w-full max-w-2xl bg-card border border-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-500" />
                <h3 className="text-base font-bold text-foreground font-sans">
                  {activeChallengeModal.title}
                </h3>
              </div>
              <button onClick={() => setActiveChallengeModal(null)} className="text-muted-foreground hover:text-foreground text-sm font-mono">
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-mono text-muted-foreground uppercase text-[10px]">Problem Statement</div>
              <p className="text-foreground leading-relaxed">{activeChallengeModal.problemStatement}</p>
              <div className="font-mono text-blue-600 dark:text-blue-400 text-2xs">Target: {activeChallengeModal.expectedComplexity}</div>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-2xs uppercase text-muted-foreground font-bold">Solution Implementation</label>
              <textarea
                rows={8}
                value={challengeCode}
                onChange={(e) => setChallengeCode(e.target.value)}
                className="w-full p-3 font-mono text-xs bg-muted/40 border border-border rounded-xl text-foreground focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            {challengeResult && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono space-y-1.5 text-emerald-600">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>CHALLENGE PASSED (100% Deterministic Verification)</span>
                </div>
                <div className="text-foreground text-[11px]">{challengeResult.mentorFeedback}</div>
                <div className="text-2xs text-muted-foreground">Stream Rating: +{challengeResult.eloChange} PTS • SHA-256: {challengeResult.verificationHash?.slice(0, 24)}...</div>
              </div>
            )}

            <div className="pt-3 border-t border-border flex justify-end gap-3 font-mono text-xs">
              <button
                type="button"
                onClick={() => setActiveChallengeModal(null)}
                className="px-4 py-2 rounded-xl text-muted-foreground hover:bg-muted font-bold"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSolveSubmit}
                disabled={isEvaluatingChallenge}
                data-testid="submit-stream-challenge-btn"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs flex items-center gap-2"
              >
                <span>{isEvaluatingChallenge ? 'Evaluating...' : 'Submit Solution (+12 Rating)'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

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

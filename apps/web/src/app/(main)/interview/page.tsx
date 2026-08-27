'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Bot, 
  Sparkles, 
  ArrowRight, 
  Clock, 
  Award, 
  Code2, 
  MessageSquare, 
  BrainCircuit, 
  Layers, 
  ShieldCheck, 
  CheckCircle2, 
  TrendingUp,
  AlertCircle,
  Play
} from 'lucide-react';

interface InterviewHistoryItem {
  id: string;
  roleTitle: string;
  roleSlug: string;
  interviewType: string;
  mode: string;
  status: string;
  score: number;
  readinessScore: number;
  durationMinutes: number;
  verificationHash?: string;
  createdAt: string;
}

export default function InterviewHubPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'technical' | 'scenario' | 'behavioral' | 'mixed'>('technical');
  const [history, setHistory] = useState<InterviewHistoryItem[]>([]);
  const [readiness, setReadiness] = useState(72);
  const [readinessTrend, setReadinessTrend] = useState(8);
  const [careerElo, setCareerElo] = useState(404);
  const [roleTitle, setRoleTitle] = useState('Data Analyst');

  useEffect(() => {
    async function loadData() {
      try {
        const [histRes, dashRes] = await Promise.all([
          fetch('http://localhost:3001/api/interview/history', { credentials: 'include' }),
          fetch('http://localhost:3001/api/arena/dashboard', { credentials: 'include' }),
        ]);

        if (histRes.ok) {
          const hData = await histRes.json();
          if (hData.data) {
            setHistory(hData.data.interviews || []);
            setReadiness(hData.data.interviewReadiness || 72);
            setReadinessTrend(hData.data.readinessTrend || 8);
          }
        }

        if (dashRes.ok) {
          const dData = await dashRes.json();
          if (dData.data) {
            setCareerElo(dData.data.currentElo || 404);
            setRoleTitle(dData.data.activeRole?.title || 'Data Analyst');
          }
        }
      } catch (err) {
        console.error('Error loading interview hub data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleStartInterview = async () => {
    setStarting(true);
    try {
      const res = await fetch('http://localhost:3001/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mode: selectedMode }),
      });

      const data = await res.json();
      if (res.ok && data.data?.interviewId) {
        router.push(`/interview/${data.data.interviewId}`);
      } else {
        alert(data.error?.message || 'Failed to start interview');
        setStarting(false);
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
      setStarting(false);
    }
  };

  const MODES = [
    {
      id: 'technical',
      title: 'Role-Specific Technical',
      badge: 'DEFAULT // RECOMMENDED',
      icon: Code2,
      description: 'Hands-on SQL schema problem solving, live query debugging, and relational cardinality evaluation.',
      duration: '15 Mins',
      evaluates: ['SQL Querying', 'JOIN Cardinality', 'Schema Design', 'Error Handling'],
    },
    {
      id: 'scenario',
      title: 'Workplace Scenario',
      badge: 'APPLIED ENGINEERING',
      icon: BrainCircuit,
      description: 'Production incident triage, data pipeline regressions, and executive metric justification.',
      duration: '15 Mins',
      evaluates: ['Incident Triage', 'Metric Reconciliation', 'Architecture', 'Trade-offs'],
    },
    {
      id: 'behavioral',
      title: 'Behavioral & STAR Format',
      badge: 'LEADERSHIP & CULTURE',
      icon: MessageSquare,
      description: 'Cross-functional stakeholder communication, conflict resolution, and data storytelling.',
      duration: '12 Mins',
      evaluates: ['Communication', 'Stakeholder Alignment', 'Conflict Resolution', 'Ownership'],
    },
    {
      id: 'mixed',
      title: 'Mixed Full-Loop',
      badge: 'COMPREHENSIVE',
      icon: Layers,
      description: 'Complete simulation combining technical live tasks with executive stakeholder presentation.',
      duration: '20 Mins',
      evaluates: ['Technical Depth', 'Live Task Execution', 'Business Reasoning', 'Communication'],
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-brand selection:text-white pb-20">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-brand uppercase tracking-wider">
                <Bot className="w-4 h-4" />
                <span>CAPABILIO AI INTERVIEW // LIVING PROFESSIONAL IDENTITY</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                AI Technical Interview & Verified Career Proof
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl font-mono">
                Interactive role-tailored technical interviews anchored in your verified Arena evidence.
              </p>
            </div>

            {/* Metrics */}
            <div className="flex items-center gap-3">
              <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-1 font-mono text-right">
                <div className="text-[10px] text-muted-foreground uppercase font-bold">CAREER ELO</div>
                <div className="text-xl font-black text-foreground">{careerElo} ELO</div>
              </div>

              <div className="p-4 rounded-2xl bg-brand/10 border border-brand/20 space-y-1 font-mono text-right">
                <div className="text-[10px] text-brand uppercase font-bold">INTERVIEW READINESS</div>
                <div className="text-xl font-black text-brand flex items-center justify-end gap-1.5">
                  <span>{readiness}%</span>
                  <span className="text-xs text-emerald-500 font-bold">↑{readinessTrend}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Mode Selector */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold font-sans text-foreground">
              Select Interview Mode for {roleTitle}
            </h2>
            <span className="text-xs font-mono text-muted-foreground">
              All interviews generate cryptographically verified proof
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {MODES.map((mode) => {
              const Icon = mode.icon;
              const isSelected = selectedMode === mode.id;
              return (
                <div
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id as any)}
                  data-testid={`mode-card-${mode.id}`}
                  className={`p-6 rounded-3xl border-2 transition-all cursor-pointer space-y-4 flex flex-col justify-between ${
                    isSelected 
                      ? 'border-brand bg-brand/5 shadow-md ring-1 ring-brand/20' 
                      : 'border-border bg-card hover:border-border/80'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-2xl ${isSelected ? 'bg-brand text-white' : 'bg-muted text-foreground'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {mode.duration}
                      </span>
                    </div>

                    <div>
                      <div className="text-2xs font-mono font-bold text-brand uppercase tracking-wider">
                        {mode.badge}
                      </div>
                      <h3 className="font-bold text-base text-foreground font-sans mt-0.5">
                        {mode.title}
                      </h3>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {mode.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-border/80 space-y-2">
                    <div className="text-[10px] font-mono text-muted-foreground uppercase">Evaluates:</div>
                    <div className="flex flex-wrap gap-1">
                      {mode.evaluates.map((ev) => (
                        <span key={ev} className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-foreground">
                          {ev}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleStartInterview}
              disabled={starting}
              data-testid="start-interview-btn"
              className="px-8 py-4 rounded-2xl bg-brand hover:bg-brand-hover text-white text-sm font-bold font-mono shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              {starting ? (
                <span>INITIALIZING AI INTERVIEWER...</span>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>START {selectedMode.toUpperCase()} INTERVIEW →</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Previous Verified Interviews */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h3 className="text-lg font-bold font-sans text-foreground">
                Verified Interview History
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                Permanent records, question transcripts, and demonstrated skill evidence.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-brand">
              {history.length} SESSIONS
            </span>
          </div>

          {history.length === 0 ? (
            <div className="p-12 rounded-3xl border border-dashed border-border bg-card text-center space-y-3 font-mono text-xs text-muted-foreground">
              <Bot className="w-8 h-8 mx-auto text-muted-foreground" />
              <div className="font-bold text-foreground">No Completed Interviews Yet</div>
              <p>Launch your first AI Technical Interview to establish your verified interview readiness baseline.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl border border-border bg-card hover:border-brand/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.score >= 70 
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30' 
                          : 'bg-rose-500/10 text-rose-600 border border-rose-500/30'
                      }`}>
                        {item.score >= 70 ? '✓ VERIFIED' : 'IMPROVEMENT REQUIRED'}
                      </span>
                      <span className="font-bold text-sm text-foreground font-sans">
                        {item.roleTitle} {item.mode.toUpperCase()} INTERVIEW
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-[11px]">
                      <span>Score: <strong className="text-foreground">{item.score}/100</strong></span>
                      <span>•</span>
                      <span>Readiness: <strong className="text-foreground">{item.readinessScore}%</strong></span>
                      <span>•</span>
                      <span>Duration: {item.durationMinutes}m</span>
                      <span>•</span>
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <Link
                    href={`/interview/${item.id}/results`}
                    data-testid="view-interview-report-btn"
                    className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-foreground text-xs font-semibold font-mono transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                  >
                    <span>View Transcript & Evidence</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

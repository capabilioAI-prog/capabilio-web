"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useEntitlements } from '@/lib/entitlements-context';
import { 
  Mic2, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Send, 
  ArrowRight, 
  Award, 
  FileText,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Bot,
  User,
  Clock,
  Code2,
  Terminal,
  ShieldCheck,
  AlertTriangle,
  Lightbulb,
  Check
} from 'lucide-react';

interface AuraInterviewTabProps {
  overviewData: any;
}

export function AuraInterviewTab({ overviewData }: AuraInterviewTabProps) {
  const { plan, usage, entitlements, openUpgradeModal, refreshSubscription } = useEntitlements();
  const [interviewState, setInterviewState] = useState<'idle' | 'in_progress' | 'evaluated'>('idle');
  const [interviewType, setInterviewType] = useState<'technical' | 'behavioral' | 'system_design'>('technical');
  const [difficulty, setDifficulty] = useState<'entry' | 'junior' | 'mid' | 'senior'>('junior');
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [result, setResult] = useState<any | null>(null);
  const [pastInterviews, setPastInterviews] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(1200); // 20 mins

  const activeRole = overviewData?.activeRole || { name: 'Software Engineer' };

  useEffect(() => {
    fetchPastInterviews();
  }, []);

  useEffect(() => {
    let timer: any;
    if (interviewState === 'in_progress' && secondsRemaining > 0) {
      timer = setInterval(() => setSecondsRemaining(prev => Math.max(0, prev - 1)), 1000);
    }
    return () => clearInterval(timer);
  }, [interviewState, secondsRemaining]);

  async function fetchPastInterviews() {
    try {
      const res = await fetch('http://localhost:3001/api/aura/interviews', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setPastInterviews(data.data.interviews || []);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleStartInterview() {
    if (plan === 'free' || usage.aiInterviewsThisMonth >= usage.aiInterviewsLimit) {
      openUpgradeModal('ai_interview');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('http://localhost:3001/api/aura/interviews/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ interviewType, difficulty }),
      });
      const data = await res.json();
      if (data.success && data.data.questions) {
        setQuestions(data.data.questions);
        setCurrentIndex(0);
        setAnswers({});
        setCurrentAnswer('');
        setSecondsRemaining(1200);
        setInterviewState('in_progress');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleNextQuestion() {
    if (!currentAnswer.trim()) return;
    const updated = { ...answers, [currentIndex]: currentAnswer.trim() };
    setAnswers(updated);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1);
      setCurrentAnswer(answers[currentIndex + 1] || '');
    } else {
      submitEvaluation(updated);
    }
  }

  async function submitEvaluation(finalAnswers: Record<number, string>) {
    setIsSubmitting(true);
    try {
      const transcript = questions.map((q, idx) => ({
        question: q.question,
        answer: finalAnswers[idx] || 'No answer provided.',
      }));

      const res = await fetch('http://localhost:3001/api/aura/interviews/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          roleId: overviewData?.activeRole?.id,
          interviewType,
          difficulty,
          durationMinutes: 20,
          transcript,
        }),
      });
      const data = await res.json();
      if (data.success && data.data.interview) {
        setResult(data.data.interview);
        setInterviewState('evaluated');
        fetchPastInterviews();
        refreshSubscription();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  }

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 1. In-Progress 3-Panel Workspace View
  if (interviewState === 'in_progress' && questions[currentIndex]) {
    const currentQ = questions[currentIndex];
    const progressPct = Math.round(((currentIndex + 1) / questions.length) * 100);

    return (
      <div className="space-y-6 font-sans text-left">
        {/* Active Session Header */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border flex flex-wrap items-center justify-between gap-3 font-mono text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-foreground uppercase">
              LIVE WORK INTERVIEW // {activeRole.name}
            </span>
            <span className="text-muted-foreground hidden sm:inline">• Stage {currentIndex + 1} of {questions.length}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-brand/10 text-brand font-bold">
              <Clock className="w-3.5 h-3.5" />
              <span>Time: {formatTimer(secondsRemaining)}</span>
            </div>
            <button
              onClick={() => setInterviewState('idle')}
              className="px-3 py-1 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground text-2xs"
            >
              Exit Session
            </button>
          </div>
        </div>

        {/* 3-Panel Workstation Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 rounded-3xl border-2 border-border bg-card shadow-xl overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-border">
          
          {/* Left Panel: AI Interviewer Conversation */}
          <div className="lg:col-span-6 p-6 space-y-5 flex flex-col justify-between bg-muted/10 min-h-[420px]">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-brand pb-2 border-b border-border">
                <Bot className="w-4 h-4" />
                <span>AI TECHNICAL INTERVIEWER</span>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase text-muted-foreground">Current Work Prompt:</span>
                <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug">
                  &ldquo;{currentQ.question}&rdquo;
                </h3>
              </div>

              {currentQ.hints && (
                <div className="p-3 bg-card border border-border/80 rounded-2xl text-xs text-muted-foreground space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-1 text-2xs uppercase tracking-wider font-mono">
                    <Lightbulb className="w-3.5 h-3.5 text-brand" />
                    <span>Key Architectural Considerations:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-2xs">
                    {currentQ.hints.map((h: string, idx: number) => (
                      <li key={idx}>{h}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Response Input */}
            <div className="space-y-2 pt-3 border-t border-border">
              <label className="text-2xs font-mono font-bold uppercase text-muted-foreground">
                Type your technical response:
              </label>
              <textarea
                rows={4}
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="State your technical reasoning, diagnostic steps, algorithms, and failure handling..."
                className="w-full p-3 bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-hidden leading-relaxed font-sans"
              />
              <div className="flex items-center justify-between pt-1">
                <span className="text-2xs font-mono text-muted-foreground">
                  {currentAnswer.trim().length > 30 ? '✓ Ready for evaluation' : 'Explain your approach in detail'}
                </span>
                <button
                  onClick={handleNextQuestion}
                  disabled={isSubmitting || !currentAnswer.trim()}
                  className="px-5 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-40"
                >
                  <span>{currentIndex + 1 === questions.length ? (isSubmitting ? 'Evaluating...' : 'Submit Interview') : 'Next Challenge →'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel: Workstation Editor & Terminal */}
          <div className="lg:col-span-6 flex flex-col justify-between bg-card">
            <div className="bg-muted/40 border-b border-border px-4 py-2 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Code2 className="w-4 h-4 text-brand" />
                <span>workspace/{activeRole.name.toLowerCase().replace(/\s+/g, '-')}-service.ts</span>
              </div>
              <span className="text-[10px] text-muted-foreground">Live Telemetry</span>
            </div>

            <div className="p-4 sm:p-5 font-mono text-xs overflow-x-auto bg-[#0D1117] text-[#E6EDF3] leading-relaxed flex-1">
              <pre>
                <code>{`// Live Technical Work Simulation
// Role: ${activeRole.name} (${difficulty} Level)
// Evaluated Criteria: ${currentQ.expectedCriteria?.join(' • ') || 'Correctness, Concurrency, Error Handling'}

export async function processInterviewTask(context: ExecutionContext) {
  // Candidate provides diagnostic explanation and implementation defense
  const telemetry = await recordDiagnosticPass({
    stage: ${currentIndex + 1},
    criteriaVerified: true
  });
  return telemetry;
}`}</code>
              </pre>
            </div>

            {/* Bottom Progress Telemetry */}
            <div className="p-3 bg-muted/40 border-t border-border px-4 flex items-center justify-between text-2xs font-mono text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>Progress:</span>
                <div className="w-24 bg-muted rounded-full h-1.5 overflow-hidden">
                  <div className="bg-brand h-1.5 rounded-full" style={{ width: `${progressPct}%` }} />
                </div>
                <span>{progressPct}%</span>
              </div>
              <span className="text-foreground font-bold">Evaluating: Diagnostic Reasoning</span>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // 2. Evaluated Results Screen
  if (interviewState === 'evaluated' && result) {
    const isPassed = result.score >= 70;
    const eloDelta = result.eloDelta || (isPassed ? 16 : -12);

    return (
      <div className="max-w-4xl mx-auto space-y-6 font-sans text-left">
        <div className="p-6 sm:p-8 rounded-3xl border-2 border-brand/40 bg-card shadow-2xl space-y-6 animate-fade-in">
          
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                isPassed ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
              }`}>
                {isPassed ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-brand uppercase">
                  AI TECHNICAL WORK INTERVIEW • {isPassed ? 'PASSED' : 'BELOW THRESHOLD'}
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-foreground">
                  {activeRole.name} Live Technical Evaluation
                </h2>
              </div>
            </div>

            <span className="text-xs font-mono text-emerald-600 font-bold bg-emerald-500/10 px-3 py-1 rounded-xl">
              Report Saved to Vault & Portfolio ✓
            </span>
          </div>

          {/* Metric Badges Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border">
              <div className="text-[10px] text-muted-foreground uppercase">Overall Score</div>
              <div className="text-2xl font-extrabold text-foreground mt-0.5">{result.score} / 100</div>
            </div>

            <div className={`p-3.5 rounded-2xl border ${
              isPassed ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-red-500/10 border-red-500/30 text-red-600'
            }`}>
              <div className="text-[10px] uppercase font-bold">Career ELO Delta</div>
              <div className="text-2xl font-black flex items-center justify-center gap-1 mt-0.5">
                {eloDelta > 0 ? (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    <span>+{eloDelta} ELO</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-4 h-4" />
                    <span>{eloDelta} ELO</span>
                  </>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border">
              <div className="text-[10px] text-muted-foreground uppercase">Technical Depth</div>
              <div className="text-base font-bold text-foreground mt-1">{result.technicalDepthScore || result.score}%</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border">
              <div className="text-[10px] text-muted-foreground uppercase">Problem Solving</div>
              <div className="text-base font-bold text-foreground mt-1">{result.problemSolvingScore || result.score}%</div>
            </div>
          </div>

          {/* AI Summary */}
          <div className="p-4 rounded-2xl bg-muted/20 border border-border space-y-1.5 text-xs">
            <span className="font-bold text-foreground font-mono uppercase text-[10px] tracking-wider block">
              AI Staff Interviewer Synthesis
            </span>
            <p className="text-muted-foreground leading-relaxed font-sans">
              {result.summary}
            </p>
          </div>

          {/* Strengths and Weaknesses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
              <span className="font-bold text-emerald-700 font-mono flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>Demonstrated Strengths:</span>
              </span>
              <ul className="space-y-1 text-muted-foreground text-2xs">
                {result.strengths.map((s: string, idx: number) => (
                  <li key={idx}>✓ {s}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
              <span className="font-bold text-amber-700 font-mono flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Identified Growth Areas:</span>
              </span>
              <ul className="space-y-1 text-muted-foreground text-2xs">
                {result.weaknesses.map((w: string, idx: number) => (
                  <li key={idx}>⚠ {w}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-between">
            <button
              onClick={() => setInterviewState('idle')}
              className="px-5 py-2.5 rounded-xl border border-border hover:bg-muted text-foreground text-xs font-semibold"
            >
              Start New Simulation
            </button>
            <Link
              href="/arena"
              className="px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
            >
              <span>Practice in Arena</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>
      </div>
    );
  }

  // 3. Idle Start View
  return (
    <div className="space-y-8 font-sans text-left">
      {/* Monthly Entitlement Status Banner */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs ${
        plan === 'free'
          ? 'bg-brand/5 border-brand/20'
          : usage.aiInterviewsThisMonth >= usage.aiInterviewsLimit
          ? 'bg-amber-500/10 border-amber-500/30'
          : 'bg-muted/40 border-border'
      }`}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand" />
          <span className="font-bold uppercase tracking-wider">
            {plan === 'free'
              ? 'AI Interviews • PRO / ELITE FEATURE'
              : `AI Interviews: ${usage.aiInterviewsThisMonth} / ${usage.aiInterviewsLimit} used this month`}
          </span>
        </div>

        {plan === 'free' ? (
          <button
            onClick={() => openUpgradeModal('ai_interview')}
            className="px-3.5 py-1.5 rounded-xl bg-brand text-white font-bold text-xs shadow-xs hover:bg-brand-hover"
          >
            Unlock with Pro (3/mo) →
          </button>
        ) : usage.aiInterviewsThisMonth >= usage.aiInterviewsLimit ? (
          <button
            onClick={() => openUpgradeModal('ai_interview')}
            className="px-3.5 py-1.5 rounded-xl bg-brand text-white font-bold text-xs shadow-xs hover:bg-brand-hover"
          >
            Get More Sessions (₹49) →
          </button>
        ) : (
          <span className="text-[11px] text-muted-foreground font-sans">
            {usage.aiInterviewsLimit - usage.aiInterviewsThisMonth} session(s) remaining this month
          </span>
        )}
      </div>

      {/* Start Interview Card */}
      <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-brand">
            <Mic2 className="w-4 h-4" />
            <span>AI Role-Specific Work Simulation</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground">
            Role-Specific Technical & Behavioral Live Interviews
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Simulate realistic technical and architecture interview rounds for {activeRole.name}. Receive deterministic rubric scoring, ELO calibrations, and verified evidence saved directly to your Vault and Portfolio.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl text-xs font-sans">
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Interview Format</label>
            <select
              value={interviewType}
              onChange={(e) => setInterviewType(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-muted/30 border border-border rounded-xl text-xs text-foreground focus:border-brand focus:outline-hidden"
            >
              <option value="technical">Technical Architecture & Incident Response</option>
              <option value="system_design">Distributed System Design & Scaling</option>
              <option value="behavioral">Engineering Leadership & Incident RCA</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Target Level</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-muted/30 border border-border rounded-xl text-xs text-foreground focus:border-brand focus:outline-hidden"
            >
              <option value="entry">Entry-Level / Fresher</option>
              <option value="junior">Junior Engineer</option>
              <option value="mid">Mid-Level Engineer</option>
              <option value="senior">Senior / Staff Engineer</option>
            </select>
          </div>
        </div>

        <div className="pt-3 border-t border-border">
          <button
            onClick={handleStartInterview}
            disabled={isSubmitting}
            className="px-6 py-3 rounded-2xl bg-brand hover:bg-brand-hover text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-2"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isSubmitting ? 'Spawning Session...' : 'Enter Live Work Interview'}</span>
          </button>
        </div>
      </div>

      {/* Past Interview History */}
      <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-foreground">
            Interview Evaluation History
          </h3>
          <span className="text-xs font-mono text-muted-foreground font-semibold">
            {pastInterviews.length} Completed
          </span>
        </div>
        {pastInterviews.length > 0 ? (
          <div className="space-y-3">
            {pastInterviews.map((int: any) => {
              const isPassed = (int.score || 0) >= 70;
              return (
                <div key={int.id} className="p-4 bg-muted/30 rounded-2xl border border-border/80 flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <div className="font-bold text-foreground capitalize flex items-center gap-2">
                      <span>{int.interviewType.replace('_', ' ')} Interview ({int.difficulty})</span>
                      {isPassed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground line-clamp-1">
                      {int.summary}
                    </div>
                  </div>
                  <div className="text-right shrink-0 font-mono">
                    <span className={`text-base font-extrabold ${isPassed ? 'text-brand' : 'text-red-600'}`}>
                      {int.score}/100
                    </span>
                    <div className="text-[10px] text-muted-foreground">{new Date(int.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            No interview evaluations on record yet. Start your first session above!
          </p>
        )}
      </div>
    </div>
  );
}

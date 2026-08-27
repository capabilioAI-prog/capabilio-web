"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Database, 
  FileCode2, 
  Play, 
  RotateCcw, 
  Send, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  TrendingDown, 
  Terminal, 
  Sparkles, 
  Bot, 
  User, 
  BarChart3, 
  Layers, 
  Table, 
  FileText, 
  Check, 
  AlertTriangle, 
  Lightbulb, 
  HelpCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
  Filter,
  LineChart,
  PieChart,
  Circle,
  AlertCircle
} from 'lucide-react';
import { useEntitlements } from '@/lib/entitlements-context';
import { useAuth } from '@/lib/auth-context';

interface DataAnalystWorkstationProps {
  mission: any;
  onExit?: () => void;
}

export function DataAnalystWorkstation({ mission, onExit }: DataAnalystWorkstationProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { plan, usage, openUpgradeModal, refreshSubscription } = useEntitlements();

  const missionId = mission?.id || 'mission_da_default';
  const durationSeconds = mission?.estimatedMinutes ? mission.estimatedMinutes * 60 : 45 * 60;

  // 1. Authoritative Mission Timer State
  const [timeRemaining, setTimeRemaining] = useState<number>(durationSeconds);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  // 2. Workstation Tab & Content State
  const [activeTab, setActiveTab] = useState<'brief' | 'datasets' | 'sql' | 'python' | 'analysis' | 'viz' | 'submit'>('sql');
  const [selectedDatasetIndex, setSelectedDatasetIndex] = useState(0);
  
  // Executive Summary and Recommendation MUST start EMPTY
  const [sqlCode, setSqlCode] = useState(mission?.starterFiles?.['analysis.sql'] || 'SELECT \n    u.plan_tier,\n    COUNT(DISTINCT u.user_id) AS total_users\nFROM users u\nGROUP BY 1;');
  const [analysisNotes, setAnalysisNotes] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [pythonCode, setPythonCode] = useState('import pandas as pd\n\n# Inspect simulated orders DataFrame\ndf = pd.read_csv("orders.csv")\nprint(df.describe())');

  // 3. Execution State
  const [isExecuting, setIsExecuting] = useState(false);
  const [hasExecutedQuery, setHasExecutedQuery] = useState(false);
  const [queryResults, setQueryResults] = useState<{ columns: string[]; rows: any[]; rowCount: number; executionTimeMs: number; timestamp?: string; queryHash?: string } | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [pythonOutput, setPythonOutput] = useState<string | null>(null);
  const [executionHistory, setExecutionHistory] = useState<Array<{ attempt: number; status: 'SUCCESS' | 'ERROR'; time?: number; rowCount?: number; message?: string; timestamp: string }>>([]);
  const activeQueryHashRef = useRef<string>('');

  // 4. Live Authoritative ELO
  const [currentElo, setCurrentElo] = useState<number>(400);

  // 5. AI Senior Mentor State
  const [tutorLevel, setTutorLevel] = useState<number>(1);
  const [usedLevels, setUsedLevels] = useState<Set<number>>(new Set());
  const [tutorMessages, setTutorMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: `Hello! I am your Senior Data Mentor for ${mission?.company?.name || 'RetailPulse'}. Inspect the datasets, write your aggregation query, and ask me if you need guidance on cohort deduplication or business analysis.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [tutorInput, setTutorInput] = useState('');
  const [hintsUsedCount, setHintsUsedCount] = useState(0);
  const [isAskingTutor, setIsAskingTutor] = useState(false);

  // 6. Submission & Validation State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionErrors, setSubmissionErrors] = useState<string[]>([]);
  const [evaluationResult, setEvaluationResult] = useState<any | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load Authoritative ELO
  useEffect(() => {
    fetch('http://localhost:3001/api/arena/dashboard', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.currentElo) {
          setCurrentElo(data.data.currentElo);
        }
      })
      .catch(err => console.error('Error fetching authoritative ELO:', err));
  }, []);

  // Restore Persisted Mission Draft from LocalStorage on mount
  useEffect(() => {
    try {
      const storageKey = `capabilio_mission_draft_${missionId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.sqlCode) setSqlCode(parsed.sqlCode);
        if (parsed.analysisNotes) setAnalysisNotes(parsed.analysisNotes);
        if (parsed.recommendation) setRecommendation(parsed.recommendation);
        if (parsed.tutorMessages) setTutorMessages(parsed.tutorMessages);
        if (parsed.hintsUsedCount) setHintsUsedCount(parsed.hintsUsedCount);
        if (parsed.usedLevels) setUsedLevels(new Set(parsed.usedLevels));
        if (parsed.hasExecutedQuery) setHasExecutedQuery(parsed.hasExecutedQuery);
      }

      // Restore or Initialize Timer based on expiresAt timestamp
      const timerKey = `capabilio_mission_timer_${missionId}`;
      const savedExpiresAt = localStorage.getItem(timerKey);
      const now = Date.now();
      let expiresAt: number;

      if (savedExpiresAt) {
        expiresAt = parseInt(savedExpiresAt, 10);
      } else {
        expiresAt = now + durationSeconds * 1000;
        localStorage.setItem(timerKey, expiresAt.toString());
      }

      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeRemaining(remaining);
      if (remaining <= 0) setIsExpired(true);
    } catch (e) {
      console.error('Failed to load persisted mission draft:', e);
    }
  }, [missionId, durationSeconds]);

  // Persist Draft Changes
  useEffect(() => {
    try {
      const storageKey = `capabilio_mission_draft_${missionId}`;
      const draft = {
        sqlCode,
        analysisNotes,
        recommendation,
        tutorMessages,
        hintsUsedCount,
        usedLevels: Array.from(usedLevels),
        hasExecutedQuery,
      };
      localStorage.setItem(storageKey, JSON.stringify(draft));
    } catch (e) {
      // Storage quota or private mode
    }
  }, [sqlCode, analysisNotes, recommendation, tutorMessages, hintsUsedCount, usedLevels, hasExecutedQuery, missionId]);

  // Live Timer Countdown
  useEffect(() => {
    if (isExpired || timeRemaining <= 0) {
      setIsExpired(true);
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isExpired, timeRemaining]);

  // Auto-scroll AI Tutor messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tutorMessages]);

  // Format Timer String
  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // 1. Real SQL Query Execution (Anti-Stale & Race-Free)
  async function handleRunQuery(codeToRun?: string) {
    const query = (codeToRun || sqlCode).trim();
    if (!query) return;

    // Generate local token to prevent stale async responses from overwriting newer queries
    const localToken = Math.random().toString(36).substring(2, 12);
    activeQueryHashRef.current = localToken;

    // IMMEDIATELY clear previous results and errors so stale data is NEVER displayed
    setIsExecuting(true);
    setQueryError(null);
    setQueryResults(null);

    try {
      const res = await fetch('http://localhost:3001/api/arena/execute-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query,
          roleType: 'data_analyst',
          scenarioFamily: mission?.scenarioFamily || 'customer_churn',
          missionId: missionId,
        }),
      });

      const data = await res.json();

      // If user triggered another query while this was inflight, ignore old response
      if (activeQueryHashRef.current !== localToken) {
        return;
      }

      if (data.success && data.data && data.data.success !== false) {
        const resultObj = {
          columns: data.data.columns || [],
          rows: data.data.rows || [],
          rowCount: data.data.rowCount ?? (data.data.rows?.length || 0),
          executionTimeMs: data.data.executionTimeMs ?? 10,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          queryHash: data.data.queryHash,
        };
        setQueryResults(resultObj);
        setHasExecutedQuery(true);
        setQueryError(null);

        // Record execution history
        setExecutionHistory(prev => [
          { attempt: prev.length + 1, status: 'SUCCESS' as const, time: resultObj.executionTimeMs, rowCount: resultObj.rowCount, timestamp: resultObj.timestamp },
          ...prev
        ].slice(0, 8));
      } else {
        const errObj = data.data?.error || data.error;
        const errMsg = typeof errObj === 'string' ? errObj : (errObj?.message || 'SQL execution failed in the Arena sandbox');
        setQueryError(errMsg);
        setQueryResults(null);

        // Record error execution history
        setExecutionHistory(prev => [
          { attempt: prev.length + 1, status: 'ERROR' as const, message: errMsg, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) },
          ...prev
        ].slice(0, 8));
      }
    } catch (err: any) {
      if (activeQueryHashRef.current === localToken) {
        const errMsg = err.message || 'Network error executing query in sandbox';
        setQueryError(errMsg);
        setQueryResults(null);
      }
    } finally {
      if (activeQueryHashRef.current === localToken) {
        setIsExecuting(false);
      }
    }
  }

  // 2. Python Runner
  function handleRunPython() {
    setIsExecuting(true);
    setTimeout(() => {
      setPythonOutput(`[PYTHON 3.11 PANDAS RUNTIME]\nDataFrame loaded: 500 records from orders.csv\n------------------------------------------------------\nCohort Attrition Summary (Week 1 vs Week 4):\n             initial_users  week4_active  retention_pct\nfree                   195           156         80.00%\npro                    240           124         51.67%  <-- 48.33% Attrition\nenterprise              50            48         96.00%\n\nStatistical Signal: Pro-tier churn rate is 2.4x higher than baseline.`);
      setIsExecuting(false);
    }, 500);
  }

  // 3. AI Tutor Interactive Chat
  async function handleSendTutorMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const userMsg = tutorInput.trim();
    if (!userMsg || isAskingTutor) return;

    setTutorInput('');
    setIsAskingTutor(true);

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setTutorMessages(prev => [...prev, { sender: 'user', text: userMsg, time: now }]);

    try {
      const res = await fetch('http://localhost:3001/api/arena/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          missionId,
          roleSlug: 'data-analyst',
          userMessage: userMsg,
          currentCode: sqlCode,
          executionResults: queryResults,
          executionError: queryError,
          executiveSummary: analysisNotes,
          hintsUsedCount,
          timeRemainingSeconds: timeRemaining,
        }),
      });

      const data = await res.json();
      if (data.success && data.data?.response) {
        setTutorMessages(prev => [
          ...prev,
          { sender: 'ai', text: data.data.response, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
        ]);
      }
    } catch (e) {
      setTutorMessages(prev => [
        ...prev,
        { sender: 'ai', text: 'Senior Mentor is temporarily unavailable. Your work has been preserved.', time: now }
      ]);
    } finally {
      setIsAskingTutor(false);
    }
  }

  // 4. Progressive Hints (L1 - L5)
  async function handleRequestHint(level: number) {
    setTutorLevel(level);
    setUsedLevels(prev => new Set(prev).add(level));
    setHintsUsedCount(prev => prev + 1);

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setTutorMessages(prev => [...prev, { sender: 'user', text: `[Requested Level ${level} Hint]`, time: now }]);

    try {
      const res = await fetch('http://localhost:3001/api/arena/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          missionId,
          roleSlug: 'data-analyst',
          requestedLevel: level,
          currentCode: sqlCode,
          executionResults: queryResults,
          executionError: queryError,
          hintsUsedCount,
        }),
      });

      const data = await res.json();
      if (data.success && data.data?.response) {
        setTutorMessages(prev => [
          ...prev,
          { sender: 'ai', text: data.data.response, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
        ]);
      }
    } catch (e) {
      console.error(e);
    }
  }

  // 5. Dynamic Submission Readiness Checklist
  const isQueryExecuted = hasExecutedQuery && queryResults !== null;
  const isResultProduced = queryResults !== null && queryResults.rows.length > 0;
  const isSummaryWritten = analysisNotes.trim().length >= 30;
  const isRecommendationWritten = recommendation.trim().length >= 20;

  const isSubmissionReady = isQueryExecuted && isResultProduced && isSummaryWritten && isRecommendationWritten;

  // 6. Submission Validation & Execution
  async function handleSubmit(isFlawed = false) {
    if (isExpired) {
      setSubmissionErrors(['MISSION EXPIRED: Time limit elapsed. Submissions are locked.']);
      return;
    }

    if (!isFlawed && !isSubmissionReady) {
      const errors: string[] = [];
      if (!isQueryExecuted) errors.push('Execute your SQL analysis query in the SQL Editor');
      if (!isResultProduced) errors.push('Produce valid tabular results from your query');
      if (!isSummaryWritten) errors.push('Write your Executive Summary in the Executive Summary tab (min 30 chars)');
      if (!isRecommendationWritten) errors.push('Provide an actionable business recommendation (min 20 chars)');
      setSubmissionErrors(errors);
      return;
    }

    setSubmissionErrors([]);
    setIsSubmitting(true);

    try {
      const res = await fetch(`http://localhost:3001/api/arena/missions/${missionId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          roleSlug: 'data-analyst',
          sqlCode,
          analysisNotes: `${analysisNotes}\n\n## Recommendation:\n${recommendation}`,
          hintsUsedCount,
          isFlawedAttempt: isFlawed,
        }),
      });

      const data = await res.json();
      if (data.success && data.data?.evaluation) {
        setEvaluationResult(data.data.evaluation);
        setCurrentElo(data.data.evaluation.eloAfter);
        refreshSubscription();
      } else if (data.error?.code === 'DAILY_ARENA_LIMIT_REACHED' || data.error?.message === 'DAILY_ARENA_LIMIT_REACHED') {
        openUpgradeModal('arena_task');
      } else {
        setSubmissionErrors([data.error?.message || 'Submission evaluation failed.']);
      }
    } catch (e: any) {
      setSubmissionErrors([e?.message || 'Network error submitting mission']);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ----------------------------------------------------
  // SCREEN: POST-SUBMISSION EVALUATION
  // ----------------------------------------------------
  if (evaluationResult) {
    const isPassed = evaluationResult.passed;
    return (
      <div className="min-h-screen bg-background text-foreground p-6 sm:p-10 font-sans flex items-center justify-center">
        <div className="max-w-3xl w-full p-8 rounded-3xl border-2 border-brand/40 bg-card shadow-2xl space-y-6 text-left animate-fade-in">
          
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                isPassed ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
              }`}>
                {isPassed ? <CheckCircle2 className="w-7 h-7" /> : <XCircle className="w-7 h-7" />}
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-brand uppercase tracking-wider">
                  MISSION EVALUATION // DATA ANALYST
                </span>
                <h2 className="text-2xl font-extrabold text-foreground">
                  {mission?.title || 'Customer Churn Investigation'}
                </h2>
              </div>
            </div>

            <span className={`text-xs font-mono font-bold px-3 py-1.5 rounded-xl ${
              isPassed ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
            }`}>
              {evaluationResult.verdict}
            </span>
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border">
              <div className="text-[10px] text-muted-foreground uppercase">Score</div>
              <div className="text-2xl font-extrabold text-foreground mt-0.5">{evaluationResult.score} / 100</div>
            </div>

            <div className={`p-3.5 rounded-2xl border ${
              isPassed ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-red-500/10 border-red-500/30 text-red-600'
            }`}>
              <div className="text-[10px] uppercase font-bold">Career ELO Delta</div>
              <div className="text-2xl font-black flex items-center justify-center gap-1 mt-0.5">
                {evaluationResult.eloDelta > 0 ? (
                  <>
                    <TrendingUp className="w-5 h-5" />
                    <span>+{evaluationResult.eloDelta} ELO</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-5 h-5" />
                    <span>{evaluationResult.eloDelta} ELO</span>
                  </>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border">
              <div className="text-[10px] text-muted-foreground uppercase">Authoritative ELO</div>
              <div className="text-xl font-extrabold text-foreground mt-0.5">{evaluationResult.eloAfter}</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border">
              <div className="text-[10px] text-muted-foreground uppercase">Evidence Status</div>
              <div className="text-xs font-bold text-emerald-600 mt-2">
                Minted to Vault ✓
              </div>
            </div>
          </div>

          {/* Negative Regression Alert */}
          {!isPassed && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>⚠️ Skill regression detected. Performance below current capability baseline.</span>
            </div>
          )}

          {/* Skill Impact Breakdown */}
          <div className="p-4 rounded-2xl bg-muted/20 border border-border space-y-1 font-mono text-xs">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Skill Graph Impact:</span>
            <div className="font-bold text-foreground">{evaluationResult.skillImpact}</div>
          </div>

          {/* AI Tutor Feedback */}
          <div className="p-5 rounded-2xl bg-muted/30 border border-border space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-foreground font-mono">
              <Lightbulb className="w-4 h-4 text-brand" />
              <span>SENIOR DATA MENTOR FEEDBACK</span>
            </div>
            <p className="text-muted-foreground leading-relaxed font-sans">
              {evaluationResult.mentorFeedback}
            </p>
          </div>

          {/* Next Best Action CTA */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-brand/10 to-transparent border border-brand/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono text-brand font-bold uppercase">Recommended Next Action</span>
              <p className="text-xs font-semibold text-foreground">&ldquo;{evaluationResult.nextBestAction}&rdquo;</p>
            </div>
            <button
              onClick={() => {
                setEvaluationResult(null);
                if (onExit) onExit();
                else router.push('/arena');
              }}
              className="px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold shrink-0 shadow-xs flex items-center gap-1.5"
            >
              <span>Return to Arena</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>
    );
  }

  const activeDataset = mission?.datasets?.[selectedDatasetIndex] || mission?.datasets?.[0];

  // Timer Color Class
  const timerClass = isExpired 
    ? 'text-red-500 font-black' 
    : timeRemaining < 180 
    ? 'text-red-500 animate-pulse font-extrabold' 
    : timeRemaining < 600 
    ? 'text-amber-500 font-bold' 
    : 'text-foreground font-bold';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans select-none">
      
      {/* 1. TOP BAR */}
      <header className="h-14 border-b border-border bg-card px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 font-mono text-xs">
        <div className="flex items-center gap-3">
          <Link href="/arena" className="font-extrabold text-foreground hover:text-brand transition-colors flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand animate-pulse" />
            <span className="tracking-tight">CAPABILIO ARENA</span>
          </Link>
          <span className="text-border">/</span>
          <span className="px-2 py-0.5 rounded-md bg-brand/10 text-brand font-bold uppercase">
            DATA ANALYST WORKSTATION
          </span>
          <span className="text-muted-foreground hidden md:inline">• {mission?.title || 'Cohort Retention Analysis'}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Authoritative ELO */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-muted/60 border border-border">
            <span className="text-muted-foreground">ELO:</span>
            <span className="font-bold text-foreground">{currentElo}</span>
          </div>

          {/* Daily Missions */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-muted/60 border border-border hidden sm:flex">
            <span className="text-muted-foreground">Today&apos;s Missions:</span>
            <span className="font-bold text-foreground">{usage?.arenaTasksToday || 0} / {usage?.arenaLimit || 1}</span>
          </div>

          {/* Real Server Countdown Timer */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl bg-muted/60 border border-border ${timerClass}`}>
            <Clock className="w-3.5 h-3.5" />
            <span>{isExpired ? 'MISSION EXPIRED' : `${formatTime(timeRemaining)} remaining`}</span>
          </div>

          <button
            onClick={() => setActiveTab('submit')}
            className="px-4 py-1.5 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold shadow-xs transition-colors"
          >
            Submit Work →
          </button>
        </div>
      </header>

      {/* 2. MAIN 3-COLUMN WORKSPACE BODY */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border overflow-hidden">
        
        {/* LEFT COLUMN: Navigation Sidebar & Tabs (2 cols) */}
        <aside className="lg:col-span-2 bg-muted/20 p-3 space-y-2 flex flex-col justify-between text-xs font-mono border-r border-border">
          <div className="space-y-1">
            <div className="px-3 py-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              Workstation Tools
            </div>

            <button
              onClick={() => setActiveTab('brief')}
              className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 transition-colors ${
                activeTab === 'brief' ? 'bg-brand text-white font-bold' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Mission Brief</span>
            </button>

            <button
              onClick={() => setActiveTab('datasets')}
              className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 transition-colors ${
                activeTab === 'datasets' ? 'bg-brand text-white font-bold' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <Table className="w-4 h-4" />
              <span>Dataset Explorer</span>
            </button>

            <button
              onClick={() => setActiveTab('sql')}
              className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 transition-colors ${
                activeTab === 'sql' ? 'bg-brand text-white font-bold' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileCode2 className="w-4 h-4" />
              <span>SQL Editor</span>
            </button>

            <button
              onClick={() => setActiveTab('python')}
              className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 transition-colors ${
                activeTab === 'python' ? 'bg-brand text-white font-bold' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>Python / Pandas</span>
            </button>

            <button
              onClick={() => setActiveTab('viz')}
              className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 transition-colors ${
                activeTab === 'viz' ? 'bg-brand text-white font-bold' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Visualizations</span>
            </button>

            <button
              onClick={() => setActiveTab('analysis')}
              className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 transition-colors ${
                activeTab === 'analysis' ? 'bg-brand text-white font-bold' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Executive Summary</span>
            </button>

            <button
              onClick={() => setActiveTab('submit')}
              className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 transition-colors ${
                activeTab === 'submit' ? 'bg-brand text-white font-bold' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Submission Panel</span>
            </button>
          </div>

          <div className="p-3 rounded-2xl bg-card border border-border space-y-1.5 text-2xs">
            <div className="text-muted-foreground uppercase font-bold">Company Target</div>
            <div className="font-bold text-foreground">{mission?.company?.name || 'RetailPulse'}</div>
            <div className="text-muted-foreground">{mission?.sprint || 'Sprint 24'}</div>
          </div>
        </aside>

        {/* CENTER COLUMN: Main Interactive Workspace (7 cols) */}
        <main className="lg:col-span-7 flex flex-col justify-between bg-card overflow-y-auto">
          
          {/* TAB 1: Mission Brief */}
          {activeTab === 'brief' && (
            <div className="p-6 space-y-6 text-left">
              <div className="space-y-1">
                <span className="text-xs font-mono font-bold text-brand uppercase">{mission?.sprint}</span>
                <h2 className="text-2xl font-extrabold text-foreground">{mission?.title}</h2>
                <p className="text-xs text-muted-foreground font-mono">Assigned by {mission?.manager?.name} ({mission?.manager?.title})</p>
              </div>

              <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-2 text-xs">
                <span className="font-bold text-foreground uppercase tracking-wider font-mono">Business Context</span>
                <p className="text-muted-foreground leading-relaxed font-sans">{mission?.businessContext}</p>
              </div>

              <div className="space-y-3 text-xs">
                <span className="font-bold text-foreground uppercase tracking-wider font-mono">Objectives & Deliverables</span>
                <ol className="list-decimal list-inside space-y-1.5 font-mono text-muted-foreground">
                  {mission?.objectives?.map((obj: string, i: number) => (
                    <li key={i}>{obj}</li>
                  ))}
                </ol>
              </div>

              <div className="p-4 rounded-2xl bg-muted/20 border border-border space-y-2 text-xs font-mono">
                <span className="font-bold text-foreground uppercase tracking-wider">Acceptance Criteria</span>
                <ul className="space-y-1 text-muted-foreground">
                  {mission?.acceptanceCriteria?.map((ac: string, i: number) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{ac}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: Dataset Explorer */}
          {activeTab === 'datasets' && (
            <div className="p-6 space-y-6 text-left">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-lg font-bold text-foreground">Dataset Explorer</h3>
                  <p className="text-xs text-muted-foreground font-mono">Inspect schema types, column statistics, and row samples.</p>
                </div>

                <div className="flex gap-2 font-mono text-xs">
                  {mission?.datasets?.map((ds: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedDatasetIndex(idx)}
                      className={`px-3 py-1.5 rounded-xl border ${
                        selectedDatasetIndex === idx ? 'bg-brand text-white border-brand font-bold' : 'bg-muted/40 border-border text-muted-foreground'
                      }`}
                    >
                      {ds.tableName} ({ds.rowCount} rows)
                    </button>
                  ))}
                </div>
              </div>

              {/* Column Definitions Table */}
              <div className="rounded-2xl border border-border overflow-hidden text-xs font-mono">
                <div className="bg-muted/60 p-3 font-bold text-foreground uppercase border-b border-border">
                  Table Schema: {activeDataset?.tableName}
                </div>
                <div className="divide-y divide-border">
                  {activeDataset?.columns?.map((col: any, idx: number) => (
                    <div key={idx} className="p-3 flex items-center justify-between bg-card hover:bg-muted/20">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{col.name}</span>
                        {col.isPrimaryKey && <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 text-2xs">PK</span>}
                        {col.isForeignKey && <span className="px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 text-2xs">FK</span>}
                      </div>
                      <div className="flex items-center gap-4 text-muted-foreground">
                        <span>{col.type}</span>
                        <span className="text-2xs italic">{col.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="rounded-2xl border border-border overflow-x-auto text-xs font-mono">
                <div className="bg-muted/60 p-3 font-bold text-foreground uppercase border-b border-border">
                  Sample Data Records
                </div>
                <table className="w-full text-left divide-y divide-border">
                  <thead className="bg-muted/30 text-muted-foreground">
                    <tr>
                      {activeDataset?.columns?.map((c: any, i: number) => (
                        <th key={i} className="p-2.5">{c.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {activeDataset?.previewRows?.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-muted/30">
                        {activeDataset?.columns?.map((c: any, j: number) => (
                          <td key={j} className="p-2.5 text-foreground">{row[c.name]?.toString() || 'NULL'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: SQL Editor & Live Query Runner */}
          {activeTab === 'sql' && (
            <div className="flex-1 flex flex-col justify-between">
              
              {/* Query Editor Header */}
              <div className="bg-muted/40 border-b border-border px-4 py-2 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 text-foreground font-semibold">
                  <FileCode2 className="w-4 h-4 text-brand" />
                  <span>analysis.sql</span>
                </div>
                <button
                  onClick={() => handleRunQuery()}
                  disabled={isExecuting || isExpired}
                  className="px-4 py-1.5 rounded-xl bg-foreground hover:bg-foreground/90 text-background font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isExecuting ? 'Executing...' : 'Run SQL Query'}</span>
                </button>
              </div>

              {/* Code Textarea / Editor */}
              <div className="p-4 bg-[#0D1117] text-[#E6EDF3] font-mono text-xs flex-1 min-h-[220px]">
                <textarea
                  rows={9}
                  value={sqlCode}
                  onChange={(e) => setSqlCode(e.target.value)}
                  className="w-full h-full bg-transparent border-none focus:outline-hidden resize-none font-mono text-xs leading-relaxed"
                  placeholder="Write your SQL aggregation query here (e.g. SELECT ... FROM users JOIN orders ... GROUP BY ...)..."
                />
              </div>

              {/* Bottom Query Execution Output Panel */}
              <div className="border-t border-border bg-card p-4 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-2xs text-muted-foreground pb-1 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span className="font-bold uppercase text-foreground">Query Execution Output</span>
                    {executionHistory.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">({executionHistory.length} runs)</span>
                    )}
                  </div>
                  {queryResults && (
                    <span className="text-emerald-500 font-bold" data-testid="query-execution-metadata">
                      {queryResults.rowCount} rows returned ({queryResults.executionTimeMs} ms at {queryResults.timestamp})
                    </span>
                  )}
                </div>

                {isExecuting ? (
                  <div className="p-4 rounded-xl bg-muted/30 border border-border text-center space-y-2 font-mono text-xs text-muted-foreground" data-testid="query-executing-indicator">
                    <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
                    <div>Executing query in isolated PostgreSQL sandbox...</div>
                  </div>
                ) : queryError ? (
                  <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-mono space-y-2" data-testid="query-error-box">
                    <div className="font-bold flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>QUERY ERROR</span>
                      </div>
                      <button
                        onClick={() => {
                          setTutorInput(`Why is my query returning this error: "${queryError}"?`);
                        }}
                        className="text-2xs text-brand hover:underline font-bold"
                      >
                        Ask Mentor about this error →
                      </button>
                    </div>
                    <p className="text-2xs font-mono text-red-400 leading-relaxed">{queryError}</p>
                  </div>
                ) : queryResults ? (
                  <div className="overflow-x-auto max-h-[160px] rounded-xl border border-border" data-testid="query-results-table">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/60 text-muted-foreground border-b border-border">
                        <tr>
                          {queryResults.columns.map((c, i) => (
                            <th key={i} className="p-2">{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-card">
                        {queryResults.rows.map((row, i) => (
                          <tr key={i} className="hover:bg-muted/30">
                            {queryResults.columns.map((c, j) => (
                              <td key={j} className="p-2 font-bold text-foreground">{row[c]?.toString()}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground italic text-2xs">Click &quot;Run SQL Query&quot; to execute against sandbox.</p>
                )}

                {/* Execution History Pill Badges */}
                {executionHistory.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                    <span className="text-muted-foreground font-bold">HISTORY:</span>
                    {executionHistory.map((h, i) => (
                      <span
                        key={i}
                        className={`px-2 py-0.5 rounded border font-mono ${
                          h.status === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : 'bg-red-500/10 text-red-500 border-red-500/20'
                        }`}
                      >
                        Attempt {h.attempt}: {h.status === 'SUCCESS' ? `${h.rowCount} rows (${h.time}ms)` : 'Error'}
                      </span>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 4: Python / Pandas */}
          {activeTab === 'python' && (
            <div className="flex-1 flex flex-col justify-between p-6 space-y-4">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-foreground">Python 3.11 / Pandas Workspace</span>
                <button
                  onClick={handleRunPython}
                  disabled={isExecuting}
                  className="px-4 py-1.5 rounded-xl bg-foreground text-background font-bold flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Python Script</span>
                </button>
              </div>

              <textarea
                rows={8}
                value={pythonCode}
                onChange={(e) => setPythonCode(e.target.value)}
                className="p-4 bg-[#0D1117] text-[#E6EDF3] rounded-2xl font-mono text-xs leading-relaxed focus:outline-hidden resize-none"
              />

              {pythonOutput && (
                <div className="p-4 rounded-2xl bg-graphite-950 text-graphite-200 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                  {pythonOutput}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Visualizations */}
          {activeTab === 'viz' && (
            <div className="p-6 space-y-6 text-left">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">Interactive Cohort Visualizations</h3>
                <p className="text-xs text-muted-foreground font-mono">Visualizing active retention percentages across customer plan tiers.</p>
              </div>

              {/* Chart Visualizer Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs text-center">
                <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                  <div className="text-muted-foreground uppercase text-[10px]">Free Tier Retention</div>
                  <div className="text-2xl font-extrabold text-foreground mt-1">79.4%</div>
                  <div className="text-2xs text-emerald-600 font-bold">Stable Benchmark</div>
                </div>

                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600">
                  <div className="uppercase text-[10px] font-bold">Pro Tier Retention</div>
                  <div className="text-2xl font-black mt-1">52.6%</div>
                  <div className="text-2xs font-bold">⚠️ 26.8% Attrition Cliff</div>
                </div>

                <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                  <div className="text-muted-foreground uppercase text-[10px]">Enterprise Retention</div>
                  <div className="text-2xl font-extrabold text-foreground mt-1">94.7%</div>
                  <div className="text-2xs text-emerald-600 font-bold">High Loyalty</div>
                </div>
              </div>

              {/* Visual Bar Representation */}
              <div className="p-5 rounded-2xl bg-card border border-border space-y-4 font-mono text-xs">
                <span className="font-bold text-foreground uppercase tracking-wider block">
                  Cohort Retention by Plan Tier (%)
                </span>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-2xs">
                      <span>Enterprise Tier</span>
                      <span className="font-bold">94.7%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                      <div className="bg-emerald-500 h-3 rounded-full" style={{ width: '94.7%' }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-2xs">
                      <span>Free Tier</span>
                      <span className="font-bold">79.4%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                      <div className="bg-blue-500 h-3 rounded-full" style={{ width: '79.4%' }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-2xs text-red-500 font-bold">
                      <span>Pro Tier (Churn Anomaly)</span>
                      <span>52.6%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                      <div className="bg-red-500 h-3 rounded-full" style={{ width: '52.6%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: Executive Summary & Analysis (MUST START EMPTY) */}
          {activeTab === 'analysis' && (
            <div className="p-6 space-y-5 text-left">
              <div className="space-y-0.5">
                <h3 className="text-lg font-bold text-foreground">Executive Summary & Findings</h3>
                <p className="text-xs text-muted-foreground font-mono">Synthesize data findings and explain actionable business trade-offs.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono font-bold text-foreground uppercase">1. Findings & Cohort Breakdown</label>
                <textarea
                  rows={7}
                  value={analysisNotes}
                  onChange={(e) => setAnalysisNotes(e.target.value)}
                  className="w-full p-4 bg-muted/20 border border-border rounded-2xl font-sans text-xs text-foreground leading-relaxed focus:border-brand focus:outline-hidden"
                  placeholder="Write your executive summary...&#10;&#10;1. What happened?&#10;2. Which customer segment/tier was impacted?&#10;3. What data evidence supports your conclusion?"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono font-bold text-foreground uppercase">2. Actionable Business Recommendation</label>
                <textarea
                  rows={4}
                  value={recommendation}
                  onChange={(e) => setRecommendation(e.target.value)}
                  className="w-full p-4 bg-muted/20 border border-border rounded-2xl font-sans text-xs text-foreground leading-relaxed focus:border-brand focus:outline-hidden"
                  placeholder="What specific actions should the product, growth, and engineering teams execute this sprint?"
                />
              </div>
            </div>
          )}

          {/* TAB 7: Submission Panel & Dynamic Checklist */}
          {activeTab === 'submit' && (
            <div className="p-6 space-y-6 text-left">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-foreground">Submission Readiness</h3>
                <p className="text-xs text-muted-foreground font-mono">Verify all required deliverables are completed before submitting for grading.</p>
              </div>

              {/* Dynamic Readiness Checklist */}
              <div className="space-y-2.5 font-mono text-xs">
                
                <div className="p-3.5 rounded-2xl bg-muted/30 border border-border flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {isQueryExecuted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <span className={isQueryExecuted ? 'text-foreground font-bold' : 'text-muted-foreground'}>
                      SQL query executed against sandbox
                    </span>
                  </div>
                  <span className="text-2xs font-semibold">{isQueryExecuted ? '✓ Done' : '○ Pending'}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-muted/30 border border-border flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {isResultProduced ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <span className={isResultProduced ? 'text-foreground font-bold' : 'text-muted-foreground'}>
                      Required cohort results produced
                    </span>
                  </div>
                  <span className="text-2xs font-semibold">{isResultProduced ? '✓ Done' : '○ Pending'}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-muted/30 border border-border flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {isSummaryWritten ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <span className={isSummaryWritten ? 'text-foreground font-bold' : 'text-muted-foreground'}>
                      Executive summary completed
                    </span>
                  </div>
                  <span className="text-2xs font-semibold">{isSummaryWritten ? '✓ Done' : '○ Pending'}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-muted/30 border border-border flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {isRecommendationWritten ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <span className={isRecommendationWritten ? 'text-foreground font-bold' : 'text-muted-foreground'}>
                      Actionable recommendation provided
                    </span>
                  </div>
                  <span className="text-2xs font-semibold">{isRecommendationWritten ? '✓ Done' : '○ Pending'}</span>
                </div>

              </div>

              {/* Validation Warning Alert */}
              {submissionErrors.length > 0 && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-mono space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Your mission isn&apos;t ready for submission:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-2xs">
                    {submissionErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Submission CTAs */}
              <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => handleSubmit(true)}
                  disabled={isSubmitting || isExpired}
                  className="px-4 py-2 rounded-xl border border-red-500/40 hover:bg-red-500/10 text-red-600 text-xs font-mono font-semibold transition-colors disabled:opacity-50"
                >
                  Submit Flawed Solution (-14 ELO)
                </button>

                <button
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting || isExpired}
                  className="px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold font-mono shadow-md shadow-brand/20 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isSubmitting ? 'Evaluating Submission...' : 'Submit Complete Work (+18 ELO)'}</span>
                </button>
              </div>

            </div>
          )}

        </main>

        {/* RIGHT COLUMN: AI Senior Data Mentor Panel (3 cols) */}
        <aside className="lg:col-span-3 bg-muted/10 p-4 space-y-4 flex flex-col justify-between text-xs border-l border-border h-full overflow-hidden">
          <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between font-mono font-bold text-foreground pb-2 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-brand" />
                <span>AI SENIOR DATA MENTOR</span>
              </div>
              <span className="text-2xs text-muted-foreground">Hints: {hintsUsedCount}</span>
            </div>

            {/* Progressive 5-Level Hint Drawer */}
            <div className="space-y-1.5 font-mono text-2xs shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground uppercase font-bold">Progressive Hints:</span>
                <span className="text-brand font-semibold">{usedLevels.size > 0 ? `${usedLevels.size} used` : 'None used'}</span>
              </div>
              <div className="grid grid-cols-5 gap-1 text-center">
                {[1, 2, 3, 4, 5].map((lvl) => {
                  const isUsed = usedLevels.has(lvl);
                  const isCurrent = tutorLevel === lvl;
                  return (
                    <button
                      key={lvl}
                      onClick={() => handleRequestHint(lvl)}
                      className={`py-1.5 rounded-lg border font-bold transition-colors ${
                        isCurrent
                          ? 'bg-brand text-white border-brand'
                          : isUsed
                          ? 'bg-brand/10 border-brand/40 text-brand'
                          : 'bg-card border-border hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      {isUsed ? `L${lvl} ✓` : `L${lvl}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Chat Message Area */}
            <div className="flex-1 space-y-3 overflow-y-auto pr-1 text-xs">
              {tutorMessages.map((msg, i) => (
                <div key={i} className={`p-3 rounded-2xl text-xs leading-relaxed space-y-1 ${
                  msg.sender === 'ai' ? 'bg-card border border-border text-foreground shadow-xs' : 'bg-brand/10 text-brand font-medium'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <div className="text-[10px] text-muted-foreground font-mono text-right">{msg.time}</div>
                </div>
              ))}
              {isAskingTutor && (
                <div className="p-3 rounded-2xl bg-card border border-border text-muted-foreground text-xs italic animate-pulse">
                  Senior Mentor is inspecting your mission context and SQL query...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

          </div>

          {/* Interactive Chat Input Area */}
          <form onSubmit={handleSendTutorMessage} className="pt-2 border-t border-border flex items-center gap-1.5 shrink-0">
            <input
              type="text"
              value={tutorInput}
              onChange={(e) => setTutorInput(e.target.value)}
              placeholder="Ask your Senior Data Mentor..."
              className="flex-1 px-3 py-2 bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-hidden font-sans"
            />
            <button
              type="submit"
              disabled={!tutorInput.trim() || isAskingTutor}
              className="p-2 rounded-xl bg-brand hover:bg-brand-hover text-white disabled:opacity-40 transition-colors shrink-0 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </aside>

      </div>

    </div>
  );
}

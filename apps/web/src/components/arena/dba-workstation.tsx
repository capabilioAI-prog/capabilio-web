"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Database, 
  Server, 
  Layers, 
  Sliders, 
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
  FileCode2, 
  Check, 
  AlertTriangle, 
  Lightbulb, 
  Clock, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Activity,
  HardDrive,
  Cpu,
  Lock,
  RefreshCw,
  Search
} from 'lucide-react';
import { useEntitlements } from '@/lib/entitlements-context';

interface DbaWorkstationProps {
  mission: any;
  onExit?: () => void;
}

export function DbaWorkstation({ mission, onExit }: DbaWorkstationProps) {
  const router = useRouter();
  const { plan, usage, openUpgradeModal, refreshSubscription } = useEntitlements();

  const [activeTab, setActiveTab] = useState<'console' | 'schema' | 'indexes' | 'logs' | 'metrics' | 'submit'>('console');
  const [sqlCode, setSqlCode] = useState(mission?.starterFiles?.['index_remediation.sql'] || 'CREATE INDEX CONCURRENTLY idx_shipment_tenant_status_created ON shipment_events (tenant_id, status, created_at DESC);\n\nANALYZE shipment_events;');
  
  // Execution Plan & Engine Telemetry
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionOutput, setExecutionOutput] = useState<{
    executionTimeMs: number;
    rowsReturned?: number;
    bufferHits?: number;
    plan?: string[];
    message?: string;
  } | null>(null);
  const [indexesList, setIndexesList] = useState<Array<{ name: string; columns: string[]; type: string; size: string; status: string }>>([
    { name: 'shipment_events_pkey', columns: ['event_id'], type: 'btree (PK)', size: '38MB', status: 'valid' }
  ]);

  // AI DBA Tutor State (Progressive Levels 1-5)
  const [tutorLevel, setTutorLevel] = useState<number>(1);
  const [tutorMessages, setTutorMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string }>>([
    {
      sender: 'ai',
      text: `Welcome to the Production Database Operations Console. You are diagnosing a 12.4-second sequential scan on the 'shipment_events' table. Run EXPLAIN (ANALYZE, BUFFERS) to verify the scan cost, formulate your composite index, and ask for progressive hints.`,
    }
  ]);
  const [hintsUsedCount, setHintsUsedCount] = useState(0);

  // Submission & Evaluation State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<any | null>(null);

  // Run initial diagnostic EXPLAIN on load
  useEffect(() => {
    handleRunQuery('EXPLAIN (ANALYZE, BUFFERS) SELECT event_id, shipment_id, status, created_at FROM shipment_events WHERE tenant_id = \'TNT_CORP_99\' AND status = \'in_transit\' ORDER BY created_at DESC LIMIT 50;');
  }, []);

  async function handleRunQuery(codeToRun?: string) {
    setIsExecuting(true);
    try {
      const res = await fetch('http://localhost:3001/api/arena/execute-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: codeToRun || sqlCode,
          roleType: 'database_administrator',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setExecutionOutput(data.data);
        if (data.data.indexes) {
          setIndexesList(prev => [...prev, ...data.data.indexes]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsExecuting(false);
    }
  }

  async function handleRequestHint(level: number) {
    setTutorLevel(level);
    setHintsUsedCount(prev => prev + 1);
    try {
      const res = await fetch('http://localhost:3001/api/arena/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          missionId: mission?.id || 'mission_dba',
          roleSlug: 'database-administrator',
          requestedLevel: level,
          currentCode: sqlCode,
        }),
      });
      const data = await res.json();
      if (data.success && data.data.response) {
        setTutorMessages(prev => [
          ...prev,
          { sender: 'user', text: `Requesting Level ${level} Hint: ${data.data.mentorRole}` },
          { sender: 'ai', text: data.data.response }
        ]);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSubmit(isFlawed = false) {
    setIsSubmitting(true);
    try {
      const res = await fetch(`http://localhost:3001/api/arena/missions/${mission?.id || 'dba_mission'}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          roleSlug: 'database-administrator',
          sqlCode,
          hintsUsedCount,
          isFlawedAttempt: isFlawed,
        }),
      });
      const data = await res.json();
      if (data.success && data.data.evaluation) {
        setEvaluationResult(data.data.evaluation);
        refreshSubscription();
      } else if (data.error?.code === 'DAILY_ARENA_LIMIT_REACHED') {
        openUpgradeModal('arena_task');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  }

  // 1. Post-Submission Evaluation Screen
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
                  INCIDENT EVALUATION // DATABASE ADMINISTRATOR
                </span>
                <h2 className="text-2xl font-extrabold text-foreground">
                  {mission?.title || 'Optimize Degraded Production Query'}
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
              <div className="text-[10px] text-muted-foreground uppercase">New ELO Rating</div>
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

          {/* AI DBA Feedback */}
          <div className="p-5 rounded-2xl bg-muted/30 border border-border space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-foreground font-mono">
              <Lightbulb className="w-4 h-4 text-brand" />
              <span>SENIOR DBA MENTOR FEEDBACK</span>
            </div>
            <p className="text-muted-foreground leading-relaxed font-sans">
              {evaluationResult.mentorFeedback}
            </p>
          </div>

          {/* Next Best Action CTA */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-brand/10 to-transparent border border-brand/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono text-brand font-bold uppercase">Recommended Next Best Action</span>
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
              <span>Practice Recommended Mission</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans select-none">
      
      {/* 1. TOP BAR */}
      <header className="h-14 border-b border-border bg-card px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 font-mono text-xs">
        <div className="flex items-center gap-3">
          <Link href="/arena" className="font-extrabold text-foreground hover:text-brand transition-colors flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="tracking-tight">CAPABILIO ARENA</span>
          </Link>
          <span className="text-border">/</span>
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 font-bold uppercase">
            DATABASE OPERATIONS WORKSTATION
          </span>
          <span className="text-muted-foreground hidden md:inline">• {mission?.title || 'Production Index Optimization'}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-muted/60 border border-border">
            <span className="text-muted-foreground">ELO:</span>
            <span className="font-bold text-foreground">400</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-muted/60 border border-border">
            <span className="text-muted-foreground">Today&apos;s Missions:</span>
            <span className="font-bold text-foreground">{usage?.arenaTasksToday || 0} / {usage?.arenaLimit || 1}</span>
          </div>

          <button
            onClick={() => setActiveTab('submit')}
            className="px-4 py-1.5 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold shadow-xs transition-colors"
          >
            Submit Incident Postmortem →
          </button>
        </div>
      </header>

      {/* 2. MAIN 3-COLUMN WORKSPACE BODY */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border overflow-hidden">
        
        {/* LEFT COLUMN: Database Explorer & Tools (2 cols) */}
        <aside className="lg:col-span-2 bg-muted/20 p-3 space-y-2 flex flex-col justify-between text-xs font-mono border-r border-border">
          <div className="space-y-1">
            <div className="px-3 py-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              Database Explorer
            </div>

            <button
              onClick={() => setActiveTab('console')}
              className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 transition-colors ${
                activeTab === 'console' ? 'bg-emerald-600 text-white font-bold' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileCode2 className="w-4 h-4" />
              <span>SQL Console & Explain</span>
            </button>

            <button
              onClick={() => setActiveTab('schema')}
              className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 transition-colors ${
                activeTab === 'schema' ? 'bg-emerald-600 text-white font-bold' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Schema & Tables</span>
            </button>

            <button
              onClick={() => setActiveTab('indexes')}
              className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 transition-colors ${
                activeTab === 'indexes' ? 'bg-emerald-600 text-white font-bold' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Index Inspector</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 transition-colors ${
                activeTab === 'logs' ? 'bg-emerald-600 text-white font-bold' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>Slow Query Logs</span>
            </button>

            <button
              onClick={() => setActiveTab('metrics')}
              className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 transition-colors ${
                activeTab === 'metrics' ? 'bg-emerald-600 text-white font-bold' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Server Telemetry</span>
            </button>

            <button
              onClick={() => setActiveTab('submit')}
              className={`w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 transition-colors ${
                activeTab === 'submit' ? 'bg-emerald-600 text-white font-bold' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Submit Remediation</span>
            </button>
          </div>

          <div className="p-3 rounded-2xl bg-card border border-border space-y-1.5 text-2xs">
            <div className="text-muted-foreground uppercase font-bold">Target Server</div>
            <div className="font-bold text-foreground">pg-primary-cluster (v16.2)</div>
            <div className="text-emerald-600 font-bold">● Operational · 94% CPU</div>
          </div>
        </aside>

        {/* CENTER COLUMN: Main Interactive Workspace (7 cols) */}
        <main className="lg:col-span-7 flex flex-col justify-between bg-card overflow-y-auto">
          
          {/* TAB 1: SQL Console & Execution Plan */}
          {activeTab === 'console' && (
            <div className="flex-1 flex flex-col justify-between">
              
              {/* Console Header */}
              <div className="bg-muted/40 border-b border-border px-4 py-2 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 text-foreground font-semibold">
                  <FileCode2 className="w-4 h-4 text-emerald-600" />
                  <span>index_remediation.sql</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRunQuery('EXPLAIN (ANALYZE, BUFFERS) SELECT event_id, shipment_id, status, created_at FROM shipment_events WHERE tenant_id = \'TNT_CORP_99\' AND status = \'in_transit\' ORDER BY created_at DESC LIMIT 50;')}
                    disabled={isExecuting}
                    className="px-3 py-1.5 rounded-xl border border-border hover:bg-muted font-bold text-2xs"
                  >
                    EXPLAIN ANALYZE
                  </button>
                  <button
                    onClick={() => handleRunQuery()}
                    disabled={isExecuting}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isExecuting ? 'Executing...' : 'Execute DDL / Query'}</span>
                  </button>
                </div>
              </div>

              {/* Code Editor Area */}
              <div className="p-4 bg-[#0D1117] text-[#E6EDF3] font-mono text-xs flex-1 min-h-[220px]">
                <textarea
                  rows={9}
                  value={sqlCode}
                  onChange={(e) => setSqlCode(e.target.value)}
                  className="w-full h-full bg-transparent border-none focus:outline-hidden resize-none font-mono text-xs leading-relaxed"
                  placeholder="Write CREATE INDEX CONCURRENTLY or query tuning SQL..."
                />
              </div>

              {/* Execution Plan & Diagnostic Output Area */}
              <div className="border-t border-border bg-graphite-950 p-4 space-y-3 font-mono text-xs text-graphite-200">
                <div className="flex items-center justify-between text-2xs text-graphite-400 pb-1 border-b border-graphite-800">
                  <span className="font-bold uppercase text-emerald-400">PostgreSQL Execution Plan Telemetry</span>
                  {executionOutput && (
                    <span className="text-graphite-300">
                      Execution Time: <strong className="text-white">{executionOutput.executionTimeMs}ms</strong>
                    </span>
                  )}
                </div>

                {executionOutput?.message && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                    ✓ {executionOutput.message}
                  </div>
                )}

                {executionOutput?.plan ? (
                  <div className="space-y-1 overflow-x-auto max-h-[160px] text-2xs leading-relaxed">
                    {executionOutput.plan.map((line, idx) => (
                      <div 
                        key={idx} 
                        className={
                          line.includes('Seq Scan') ? 'text-red-400 font-bold' :
                          line.includes('Index Only Scan') ? 'text-emerald-400 font-bold' :
                          line.includes('Execution Time: 18') ? 'text-emerald-300 font-extrabold bg-emerald-500/10 p-1 rounded' :
                          'text-graphite-300'
                        }
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-graphite-500 italic text-2xs">Click &quot;EXPLAIN ANALYZE&quot; or &quot;Execute DDL&quot; to inspect query performance.</p>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: Schema & Table Inspector */}
          {activeTab === 'schema' && (
            <div className="p-6 space-y-6 text-left">
              <div className="space-y-0.5">
                <h3 className="text-lg font-bold text-foreground">Table Inspector: shipment_events</h3>
                <p className="text-xs text-muted-foreground font-mono">1.84M Rows · 242MB Table Size · Vacuum State: Clean</p>
              </div>

              <div className="rounded-2xl border border-border overflow-hidden text-xs font-mono">
                <div className="bg-muted/60 p-3 font-bold text-foreground uppercase border-b border-border">
                  Column Structure & Constraints
                </div>
                <div className="divide-y divide-border">
                  {[
                    { name: 'event_id', type: 'UUID (PK)', desc: 'Primary key index' },
                    { name: 'tenant_id', type: 'VARCHAR(36)', desc: 'Enterprise tenant discriminator' },
                    { name: 'shipment_id', type: 'VARCHAR(36)', desc: 'Tracked logistics parcel ID' },
                    { name: 'status', type: 'VARCHAR(30)', desc: 'in_transit, delivered, exception' },
                    { name: 'payload_bytes', type: 'INTEGER', desc: 'Telemetry package size' },
                    { name: 'created_at', type: 'TIMESTAMP WITH TIME ZONE', desc: 'Event ingestion timestamp' },
                  ].map((col, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between bg-card hover:bg-muted/20">
                      <span className="font-bold text-foreground">{col.name}</span>
                      <div className="flex items-center gap-4 text-muted-foreground">
                        <span className="text-brand font-semibold">{col.type}</span>
                        <span className="text-2xs italic">{col.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Index Inspector */}
          {activeTab === 'indexes' && (
            <div className="p-6 space-y-6 text-left font-mono text-xs">
              <div className="space-y-0.5">
                <h3 className="text-lg font-bold text-foreground">Index Inspector & Storage Cost</h3>
                <p className="text-muted-foreground text-2xs">Active indexes on table `shipment_events`</p>
              </div>

              <div className="rounded-2xl border border-border overflow-hidden">
                <table className="w-full text-left divide-y divide-border">
                  <thead className="bg-muted/60 text-muted-foreground">
                    <tr>
                      <th className="p-3">Index Name</th>
                      <th className="p-3">Columns Covered</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Size</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {indexesList.map((idx, i) => (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="p-3 font-bold text-foreground">{idx.name}</td>
                        <td className="p-3 text-muted-foreground">{idx.columns.join(', ')}</td>
                        <td className="p-3">{idx.type}</td>
                        <td className="p-3">{idx.size}</td>
                        <td className="p-3 text-emerald-600 font-bold">✓ {idx.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: Slow Query Logs */}
          {activeTab === 'logs' && (
            <div className="p-6 space-y-4 text-left font-mono text-xs">
              <div className="space-y-0.5">
                <h3 className="text-lg font-bold text-foreground">PostgreSQL Slow Query Log (pg_stat_statements)</h3>
                <p className="text-muted-foreground text-2xs">Top latency queries exceeding 1,000ms threshold</p>
              </div>

              <div className="rounded-2xl bg-graphite-950 p-4 space-y-3 text-2xs text-graphite-300 border border-border">
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>CALLS: 1,420 · MEAN TIME: 12,421.40ms · ROWS: 1.84M</span>
                    <span className="text-red-400">CRITICAL LATENCY</span>
                  </div>
                  <code>SELECT event_id, shipment_id FROM shipment_events WHERE tenant_id = ? AND status = ? ORDER BY created_at DESC LIMIT 50;</code>
                </div>

                <div className="p-3 rounded-xl bg-muted/40 border border-border text-muted-foreground space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>CALLS: 42,000 · MEAN TIME: 4.20ms · ROWS: 1</span>
                    <span className="text-emerald-400">OPTIMIZED (PK SCAN)</span>
                  </div>
                  <code>SELECT * FROM wallet_accounts WHERE account_id = ?;</code>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Server Telemetry */}
          {activeTab === 'metrics' && (
            <div className="p-6 space-y-6 text-left font-mono text-xs">
              <h3 className="text-lg font-bold text-foreground">Cluster Performance Metrics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                  <div className="text-[10px] text-muted-foreground uppercase">CPU Utilization</div>
                  <div className="text-2xl font-black text-amber-500 mt-1">94.2%</div>
                  <div className="text-2xs text-muted-foreground">High Seq Scan Load</div>
                </div>
                <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                  <div className="text-[10px] text-muted-foreground uppercase">Buffer Cache Hit Ratio</div>
                  <div className="text-2xl font-black text-emerald-500 mt-1">99.4%</div>
                  <div className="text-2xs text-emerald-600 font-bold">Healthy RAM Pool</div>
                </div>
                <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                  <div className="text-[10px] text-muted-foreground uppercase">Active Connections</div>
                  <div className="text-2xl font-black text-foreground mt-1">118 / 200</div>
                  <div className="text-2xs text-muted-foreground">PgBouncer Pooled</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: Submission Panel */}
          {activeTab === 'submit' && (
            <div className="p-6 space-y-6 text-left">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-foreground">Submit Incident Postmortem</h3>
                <p className="text-xs text-muted-foreground font-mono">Verify all index remediation commands before submitting.</p>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-4 rounded-2xl bg-muted/30 border border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>DDL Migration Script: index_remediation.sql</span>
                  </div>
                  <span className="text-2xs text-emerald-600 font-bold">Validated</span>
                </div>

                <div className="p-4 rounded-2xl bg-muted/30 border border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand" />
                    <span>Hints Used During Investigation</span>
                  </div>
                  <span className="text-2xs font-bold text-foreground">{hintsUsedCount} Hints</span>
                </div>
              </div>

              {/* Submission CTAs: Passing vs Flawed Simulation */}
              <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => handleSubmit(true)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl border border-red-500/40 hover:bg-red-500/10 text-red-600 text-xs font-mono font-semibold transition-colors"
                >
                  Submit Flawed Solution (-14 ELO)
                </button>

                <button
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold font-mono shadow-md shadow-emerald-600/20 transition-colors flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isSubmitting ? 'Evaluating Remediation...' : 'Submit Validated Optimization (+18 ELO)'}</span>
                </button>
              </div>
            </div>
          )}

        </main>

        {/* RIGHT COLUMN: AI Senior DBA Mentor (3 cols) */}
        <aside className="lg:col-span-3 bg-muted/10 p-4 space-y-4 flex flex-col justify-between text-xs border-l border-border">
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-mono font-bold text-foreground pb-2 border-b border-border">
              <Bot className="w-4 h-4 text-emerald-600" />
              <span>AI SENIOR DBA MENTOR</span>
            </div>

            {/* Progressive 5-Level Hint Drawer */}
            <div className="space-y-1.5 font-mono text-2xs">
              <span className="text-muted-foreground uppercase font-bold">Progressive Assistance Levels:</span>
              <div className="grid grid-cols-5 gap-1 text-center">
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => handleRequestHint(lvl)}
                    className={`py-1.5 rounded-lg border font-bold transition-colors ${
                      tutorLevel === lvl ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-card border-border hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    L{lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation Messages */}
            <div className="space-y-3 overflow-y-auto max-h-[360px] pr-1">
              {tutorMessages.map((msg, i) => (
                <div key={i} className={`p-3 rounded-2xl text-xs leading-relaxed ${
                  msg.sender === 'ai' ? 'bg-card border border-border text-foreground shadow-xs' : 'bg-emerald-500/10 text-emerald-700 font-medium'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-card border border-border space-y-1 text-2xs font-mono text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Hints Consumed:</span>
              <span className="font-bold text-foreground">{hintsUsedCount}</span>
            </div>
            <div className="text-[10px] text-emerald-600">Progressive hints guide query planner mechanics without giving away the script.</div>
          </div>
        </aside>

      </div>

    </div>
  );
}

"use client";

import React from 'react';
import Link from 'next/link';
import { 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  TrendingDown, 
  Terminal, 
  Code2, 
  FileCheck2, 
  ArrowRight,
  Sparkles,
  Zap,
  Check,
  AlertTriangle
} from 'lucide-react';

export interface EvidenceDetailRecord {
  id: string;
  month: string;
  type: string;
  title: string;
  roleName: string;
  status: 'Completed' | 'Verified' | 'Evaluated';
  score: number;
  maxScore: number;
  eloBefore: number;
  eloDelta: number;
  eloAfter: number;
  scenario: string;
  objectives: string[];
  workPerformed: {
    language: string;
    filesChanged: string[];
    codeSnippet: string;
    commandsRun?: string[];
    testResults: string[];
  };
  evaluation: {
    correct: string[];
    incorrect: string[];
  };
  scoreBreakdown: Array<{
    category: string;
    score: number;
    max: number;
  }>;
  skillsAffected: Array<{
    skill: string;
    before: number;
    after: number;
  }>;
  nextBestAction: {
    description: string;
    ctaLabel: string;
    ctaHref: string;
  };
}

interface EvidenceDetailsModalProps {
  evidence: EvidenceDetailRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EvidenceDetailsModal({ evidence, isOpen, onClose }: EvidenceDetailsModalProps) {
  if (!isOpen || !evidence) return null;

  const isPositive = evidence.eloDelta >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto animate-fade-in font-sans">
      <div className="bg-card text-foreground rounded-3xl border-2 border-border shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden relative text-left">
        
        {/* Modal Top Header */}
        <div className="p-5 sm:p-6 border-b border-border bg-muted/40 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              isPositive ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'
            }`}>
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand">
                  TASK PROOF • {evidence.type.toUpperCase()}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                  {evidence.roleName}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-foreground leading-tight">
                {evidence.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Close Proof"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs text-foreground">
          
          {/* Key Metrics Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
            <div className="p-3 rounded-2xl bg-muted/30 border border-border">
              <div className="text-[10px] text-muted-foreground uppercase">Status</div>
              <div className="text-sm font-bold text-foreground flex items-center justify-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>{evidence.status}</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-muted/30 border border-border">
              <div className="text-[10px] text-muted-foreground uppercase">Overall Score</div>
              <div className="text-base font-extrabold text-foreground mt-0.5">
                {evidence.score} <span className="text-xs font-normal text-muted-foreground">/ {evidence.maxScore}</span>
              </div>
            </div>

            <div className={`p-3 rounded-2xl border ${
              isPositive ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-red-500/10 border-red-500/30 text-red-600'
            }`}>
              <div className="text-[10px] uppercase font-bold">ELO Change</div>
              <div className="text-base font-black flex items-center justify-center gap-1 mt-0.5">
                {isPositive ? (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    <span>+{evidence.eloDelta} ELO</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-4 h-4" />
                    <span>{evidence.eloDelta} ELO</span>
                  </>
                )}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-muted/30 border border-border">
              <div className="text-[10px] text-muted-foreground uppercase">Rating Trajectory</div>
              <div className="text-xs font-bold text-foreground mt-1">
                {evidence.eloBefore} &rarr; {evidence.eloAfter}
              </div>
            </div>
          </div>

          {/* Scenario & Objectives */}
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-muted/20 border border-border space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand">
                Scenario
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                &ldquo;{evidence.scenario}&rdquo;
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-muted/20 border border-border space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-foreground">
                Objectives
              </span>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground font-mono text-[11px]">
                {evidence.objectives.map((obj, idx) => (
                  <li key={idx}>{obj}</li>
                ))}
              </ol>
            </div>
          </div>

          {/* Work Performed */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-foreground uppercase flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-brand" />
                <span>Work Performed (Verified Code / Commands)</span>
              </span>
              <span className="text-muted-foreground">Files: {evidence.workPerformed.filesChanged.join(', ')}</span>
            </div>

            <div className="rounded-2xl border border-border overflow-hidden bg-[#0D1117] text-[#E6EDF3] p-4 font-mono text-xs overflow-x-auto leading-relaxed">
              <pre>
                <code>{evidence.workPerformed.codeSnippet}</code>
              </pre>
            </div>

            {/* Test Results Output */}
            <div className="p-3.5 rounded-2xl bg-graphite-950 border border-border font-mono text-2xs space-y-1">
              <div className="text-graphite-400 font-bold uppercase tracking-wider pb-1 border-b border-graphite-800 flex items-center justify-between">
                <span>Deterministic Test Assertions</span>
                <span>Sandbox Verification</span>
              </div>
              {evidence.workPerformed.testResults.map((tr, idx) => (
                <div key={idx} className={tr.includes('✓') ? 'text-emerald-400' : tr.includes('✕') ? 'text-red-400' : 'text-graphite-300'}>
                  {tr}
                </div>
              ))}
            </div>
          </div>

          {/* Evaluation (Correct vs Incorrect) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
              <span className="font-bold text-emerald-700 font-mono flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>Demonstrated Competence:</span>
              </span>
              <ul className="space-y-1 text-muted-foreground text-[11px]">
                {evidence.evaluation.correct.map((c, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 space-y-2">
              <span className="font-bold text-red-700 font-mono flex items-center gap-1.5">
                <X className="w-3.5 h-3.5" />
                <span>Identified Deficiencies:</span>
              </span>
              {evidence.evaluation.incorrect.length === 0 ? (
                <div className="text-muted-foreground text-[11px] italic">No critical errors detected.</div>
              ) : (
                <ul className="space-y-1 text-muted-foreground text-[11px]">
                  {evidence.evaluation.incorrect.map((inc, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-red-600 font-bold">✕</span>
                      <span>{inc}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Score Breakdown & Skills Affected */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Score Breakdown */}
            <div className="p-4 rounded-2xl bg-muted/20 border border-border space-y-2.5">
              <span className="font-bold text-foreground font-mono uppercase text-[10px] tracking-wider block">
                Deterministic Score Breakdown
              </span>
              <div className="space-y-1.5 font-mono text-[11px]">
                {evidence.scoreBreakdown.map((sb, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{sb.category}</span>
                    <span className="font-bold text-foreground">{sb.score}/{sb.max}</span>
                  </div>
                ))}
                <div className="pt-1.5 border-t border-border flex items-center justify-between font-bold">
                  <span>TOTAL SCORE</span>
                  <span className="text-brand">{evidence.score}/{evidence.maxScore}</span>
                </div>
              </div>
            </div>

            {/* Skills Affected */}
            <div className="p-4 rounded-2xl bg-muted/20 border border-border space-y-2.5">
              <span className="font-bold text-foreground font-mono uppercase text-[10px] tracking-wider block">
                Skills Affected & Trajectory
              </span>
              <div className="space-y-2 font-mono text-[11px]">
                {evidence.skillsAffected.map((sa, idx) => {
                  const diff = sa.after - sa.before;
                  return (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{sa.skill}</span>
                      <span className={`font-bold flex items-center gap-1 ${
                        diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-600' : 'text-foreground'
                      }`}>
                        <span>{sa.before} &rarr; {sa.after}</span>
                        <span>({diff > 0 ? `+${diff}` : diff})</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Next Best Action */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-brand/10 via-brand/5 to-transparent border border-brand/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-brand font-mono font-bold text-xs">
                <Zap className="w-3.5 h-3.5" />
                <span>RECOMMENDED NEXT BEST ACTION</span>
              </div>
              <p className="text-xs text-foreground font-medium">
                &ldquo;{evidence.nextBestAction.description}&rdquo;
              </p>
            </div>

            <Link
              href={evidence.nextBestAction.ctaHref}
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <span>{evidence.nextBestAction.ctaLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-muted/40 flex items-center justify-between text-2xs font-mono text-muted-foreground shrink-0">
          <div className="flex items-center gap-1.5 text-brand font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Cryptographically Verified Proof #{evidence.id.slice(0, 8)}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-border hover:bg-muted text-foreground text-xs font-semibold"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

"use client";

import React from 'react';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  AlertTriangle, 
  FileText, 
  Code, 
  Bot, 
  Clock, 
  Layers, 
  Check, 
  Hash
} from 'lucide-react';

interface MissionProofModalProps {
  attempt: any;
  onClose: () => void;
}

export function MissionProofModal({ attempt, onClose }: MissionProofModalProps) {
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  if (!attempt) return null;

  const isPassed = attempt.passed;
  const isStream = attempt.trackType === 'stream';

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-card border-2 border-brand/30 rounded-3xl max-w-3xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden text-left font-sans">
        
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-muted/40 font-mono text-xs">
          <div className="flex items-center gap-2.5">
            <span className={`px-2.5 py-1 rounded-xl font-bold uppercase ${
              isStream ? 'bg-blue-500/10 text-blue-600' : 'bg-brand/10 text-brand'
            }`}>
              {isStream ? 'ACADEMIC STREAM PROOF' : 'CAREER WORK PROOF'}
            </span>
            <span className="text-muted-foreground font-semibold">• {attempt.title}</span>
          </div>

          <button
            type="button" onClick={(e) => { e.stopPropagation(); onClose(); }} data-testid="close-proof-modal" className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* Top Verdict & Score Card */}
          <div className="p-5 rounded-2xl bg-muted/20 border border-border flex flex-wrap items-center justify-between gap-4 font-mono">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                isPassed ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
              }`}>
                {isPassed ? <CheckCircle2 className="w-7 h-7" /> : <XCircle className="w-7 h-7" />}
              </div>
              <div>
                <span className="text-2xs text-muted-foreground uppercase">Evaluation Verdict</span>
                <h3 className="text-base font-extrabold text-foreground">{attempt.title}</h3>
                <span className={`text-2xs px-2 py-0.5 rounded-md font-bold ${
                  isPassed ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
                }`}>
                  {isPassed ? '✓ Verified & Locked' : '⚠ Skill Regression Detected'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground uppercase">Score</div>
                <div className="text-xl font-extrabold text-foreground">{attempt.score} / 100</div>
              </div>
              <div className={`p-2.5 rounded-xl border text-center ${
                isPassed ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-red-500/10 border-red-500/30 text-red-600'
              }`}>
                <div className="text-[10px] uppercase font-bold">{isStream ? 'Rating' : 'ELO'} Delta</div>
                <div className="text-base font-black">
                  {attempt.eloChange > 0 ? `+${attempt.eloChange}` : attempt.eloChange}
                </div>
              </div>
            </div>
          </div>

          {/* Explicit Regression Section for Failed Work */}
          {!isPassed && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-mono space-y-2">
              <div className="font-bold flex items-center gap-1.5 uppercase">
                <AlertTriangle className="w-4 h-4" />
                <span>Performance Audit & Regression Analysis</span>
              </div>
              <div className="space-y-1 text-2xs leading-relaxed text-red-500">
                <p>• <strong>What Went Wrong:</strong> Query or algorithm produced distorted counts or exceeded complexity budget.</p>
                <p>• <strong>Why It Mattered:</strong> Production decisions and SLA requirements rely on verified accuracy.</p>
                <p>• <strong>Skill Regression:</strong> Performance measured below your current career baseline.</p>
                <p>• <strong>How to Improve:</strong> Review progressive hints and practice foundational deduplication in Arena.</p>
              </div>
            </div>
          )}

          {/* User Submitted Code / Work */}
          <div className="space-y-1.5 font-mono text-2xs">
            <span className="font-bold text-foreground uppercase">Submitted Solution / Code</span>
            <div className="p-4 bg-[#0D1117] text-[#E6EDF3] rounded-2xl border border-border overflow-x-auto max-h-[160px]">
              <pre className="text-xs font-mono whitespace-pre-wrap">
                {attempt.deliverables?.sql || attempt.deliverables?.code || 'SELECT * FROM dataset;'}
              </pre>
            </div>
          </div>

          {/* Executive Summary if available */}
          {attempt.deliverables?.summary && (
            <div className="space-y-1.5 font-mono text-2xs">
              <span className="font-bold text-foreground uppercase">Executive Summary</span>
              <div className="p-4 bg-muted/20 border border-border rounded-2xl font-sans text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {attempt.deliverables.summary}
              </div>
            </div>
          )}

          {/* AI Mentor Feedback */}
          <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-1 text-xs">
            <div className="flex items-center gap-2 font-bold text-foreground font-mono text-2xs uppercase">
              <Bot className="w-4 h-4 text-brand" />
              <span>Senior Mentor Evaluator Feedback</span>
            </div>
            <p className="text-muted-foreground font-sans leading-relaxed text-xs">
              {attempt.mentorFeedback || 'Evaluated against automated deterministic and contextual AI rubrics.'}
            </p>
          </div>

          {/* Verification Hash */}
          <div className="p-3 rounded-xl bg-card border border-border flex items-center justify-between font-mono text-2xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-brand" />
              <span>SHA-256 Verification Hash: {attempt.verificationHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}</span>
            </div>
            <span className="text-emerald-600 font-bold">Immutable Vault Record ✓</span>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex justify-end font-mono text-xs">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold transition-colors shadow-xs"
          >
            Close Details
          </button>
        </div>

      </div>
    </div>
  );
}

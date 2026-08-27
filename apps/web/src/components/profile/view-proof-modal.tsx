'use client';

import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Copy, 
  Check, 
  Code2, 
  CheckCircle2, 
  Clock, 
  Award, 
  TrendingUp, 
  FileText 
} from 'lucide-react';

export interface ViewProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  proof: {
    attemptId: string;
    missionTitle: string;
    roleName: string;
    scenario: string;
    objectives: string[];
    workPerformed: string;
    aiScore: number;
    eloBefore: number;
    eloChange: number;
    eloAfter: number;
    skillsDemonstrated: Array<{ skillName: string; weight: number }>;
    aiFeedback: string;
    strengths: string[];
    weaknesses: string[];
    timeSpentMinutes: number;
    hintsUsedCount: number;
    verificationHash: string;
    submittedAt: string | Date;
  } | null;
}

export function ViewProofModal({ isOpen, onClose, proof }: ViewProofModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !proof) return null;

  const handleCopyHash = () => {
    navigator.clipboard.writeText(proof.verificationHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isPassed = proof.aiScore >= 70;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-card border-2 border-border w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden my-8 space-y-0 text-foreground font-sans">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                isPassed ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-600 border border-rose-500/30'
              }`}>
                {isPassed ? '✓ VERIFIED CAREER PROOF' : 'COMPLETED WITH NOTES'}
              </span>
              <span className="text-2xs font-mono text-muted-foreground uppercase">{proof.roleName} TRACK</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-foreground">
              {proof.missionTitle}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Top Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-1">
              <div className="text-[10px] text-muted-foreground uppercase font-bold">SCORE</div>
              <div className="text-xl font-black text-foreground">{proof.aiScore}<span className="text-xs font-normal text-muted-foreground">/100</span></div>
            </div>

            <div className="p-3.5 rounded-2xl bg-brand/10 border border-brand/20 space-y-1">
              <div className="text-[10px] text-brand uppercase font-bold">CAREER ELO DELTA</div>
              <div className="text-xl font-black text-brand">
                {proof.eloChange >= 0 ? `+${proof.eloChange}` : proof.eloChange} ELO
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-1">
              <div className="text-[10px] text-muted-foreground uppercase font-bold">TIME SPENT</div>
              <div className="text-xl font-black text-foreground">{proof.timeSpentMinutes}m</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-1">
              <div className="text-[10px] text-muted-foreground uppercase font-bold">HINTS USED</div>
              <div className="text-xl font-black text-foreground">{proof.hintsUsedCount}</div>
            </div>
          </div>

          {/* Scenario & Objectives */}
          <div className="space-y-2">
            <div className="text-xs font-mono font-bold text-muted-foreground uppercase">SIMULATION SCENARIO</div>
            <p className="text-xs sm:text-sm text-foreground leading-relaxed">
              {proof.scenario}
            </p>
          </div>

          {/* Work Performed (SQL Submission) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
              <span className="font-bold uppercase">WORK PERFORMED (SUBMISSION CODE)</span>
              <span>PostgreSQL SQL Sandbox</span>
            </div>
            <div className="p-4 rounded-2xl bg-muted/60 border border-border font-mono text-xs text-foreground overflow-x-auto whitespace-pre leading-relaxed">
              {proof.workPerformed}
            </div>
          </div>

          {/* AI Feedback & Skills */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-2">
              <div className="text-xs font-mono font-bold text-foreground">AI WORK EVALUATION</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {proof.aiFeedback}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-2 font-mono text-xs">
              <div className="font-bold text-foreground">SKILLS DEMONSTRATED</div>
              <div className="space-y-1.5">
                {proof.skillsDemonstrated.map((sk, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[11px]">
                    <span className="text-foreground font-sans">✓ {sk.skillName}</span>
                    <span className="text-brand font-bold">{sk.weight}% Impact</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cryptographic SHA-256 Proof */}
          <div className="p-4 rounded-2xl border-2 border-brand/30 bg-brand/5 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-brand font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>CRYPTOGRAPHIC VERIFICATION PROOF (SHA-256)</span>
              </div>
              <button
                onClick={handleCopyHash}
                className="flex items-center gap-1 text-xs font-bold text-brand hover:underline"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'COPIED' : 'COPY HASH'}</span>
              </button>
            </div>
            <div className="p-2.5 rounded-xl bg-card border border-border text-[11px] text-muted-foreground break-all">
              {proof.verificationHash}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border flex justify-end bg-muted/10">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-foreground text-background font-mono text-xs font-bold hover:bg-foreground/90 transition-all"
          >
            CLOSE PROOF
          </button>
        </div>
      </div>
    </div>
  );
}

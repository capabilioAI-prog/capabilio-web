'use client';

import React from 'react';
import { 
  FileText, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  Lock, 
  Clock, 
  ExternalLink,
  Award,
  Zap
} from 'lucide-react';
import Link from 'next/link';

export function ResumeVsEvidence() {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-12 font-sans">
      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        {/* Traditional Resume Card */}
        <div className="border border-border/80 bg-card p-6 sm:p-8 rounded-2xl space-y-6 opacity-85">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-foreground">Traditional Resume</h4>
                <div className="text-xs text-muted-foreground font-mono">Self-Reported PDF Claims</div>
              </div>
            </div>
            <span className="text-xs font-mono px-2 py-1 rounded bg-red-500/10 text-red-600 font-semibold">
              Static
            </span>
          </div>

          <div className="space-y-4">
            <div className="p-3 bg-muted/40 rounded-xl border border-border/60 font-mono text-xs text-muted-foreground space-y-1.5">
              <div className="text-foreground font-semibold line-through opacity-70">
                &ldquo;Proficient in React, Microservices, and Distributed Systems&rdquo;
              </div>
              <div className="text-[11px] text-red-500 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                <span>Zero proof of actual code execution or problem solving</span>
              </div>
            </div>

            <ul className="space-y-3 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span><strong>Manual updates:</strong> Outdated the moment it is exported to PDF.</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span><strong>No capability verification:</strong> Recruiter must guess if candidate can do the work.</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span><strong>Ignored by recruiters:</strong> Sits in black-hole ATS keyword filters.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Capabilio Evidence Card */}
        <div className="border-2 border-brand/50 bg-card p-6 sm:p-8 rounded-2xl shadow-xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-brand text-white flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-foreground">Capabilio Verified Proof</h4>
                <div className="text-xs text-brand font-mono font-medium">Deterministic Performance Vault</div>
              </div>
            </div>
            <span className="text-xs font-mono px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 font-semibold">
              Live & Verified
            </span>
          </div>

          <div className="space-y-4">
            <div className="p-3 bg-brand/5 rounded-xl border border-brand/20 font-mono text-xs space-y-1.5">
              <div className="text-foreground font-semibold flex items-center justify-between">
                <span>Verified: Auth Timeout Handling Fixed</span>
                <span className="text-brand font-bold">+8 ELO</span>
              </div>
              <div className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>4/4 unit tests passed • sha256:7f9a8e... • Sprint 42</span>
              </div>
            </div>

            <ul className="space-y-3 text-xs text-foreground font-medium">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Continuously dynamic:</strong> Profile and ELO update with every completed ticket.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Deterministic evidence:</strong> Recruiters inspect real code, test outputs, and notes.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Direct hiring pipeline:</strong> High ELO and readiness match directly to Launchpad jobs.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Sample Verified Evidence Vault Preview */}
      <div className="border border-border bg-muted/20 p-6 sm:p-8 rounded-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-base font-bold text-foreground flex items-center gap-2">
              <Lock className="w-4 h-4 text-brand" />
              <span>Evidence Vault Locker Preview</span>
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Every completed Arena mission deposits cryptographic proof into your Vault.
            </p>
          </div>
          <Link
            href="/register"
            className="text-xs font-semibold text-brand hover:text-brand-hover flex items-center gap-1"
          >
            <span>Claim Your Vault</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Evidence Items Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-card border border-border rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
              <span>Software Engineering</span>
              <span className="text-emerald-600 font-semibold">100/100 Score</span>
            </div>
            <div className="font-semibold text-foreground">
              API Rate Limiting & Auth Middleware
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">
              Proof: sha256:4a8b...9c • +8 ELO
            </div>
          </div>

          <div className="p-4 bg-card border border-border rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
              <span>Cybersecurity Operations</span>
              <span className="text-emerald-600 font-semibold">100/100 Score</span>
            </div>
            <div className="font-semibold text-foreground">
              Credential Stuffing IOC Triage
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">
              Proof: sha256:d12e...3f • +15 ELO
            </div>
          </div>

          <div className="p-4 bg-card border border-border rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
              <span>Machine Learning</span>
              <span className="text-emerald-600 font-semibold">100/100 Score</span>
            </div>
            <div className="font-semibold text-foreground">
              Customer Churn F1 Metric Tuning
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">
              Proof: sha256:f90a...11 • +12 ELO
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

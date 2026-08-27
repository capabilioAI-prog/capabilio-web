'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  X, 
  CheckCircle2, 
  BrainCircuit, 
  ArrowRight, 
  FileCode, 
  Award, 
  ExternalLink, 
  Sparkles,
  Lock,
  Building2,
  Briefcase
} from 'lucide-react';
import { ProofPackage } from '@capabilio/types';

interface ApplyProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: any;
  proofPackage: any;
  matchScore: number;
  onConfirmApply: () => Promise<void>;
}

export function ApplyProofModal({
  isOpen,
  onClose,
  opportunity,
  proofPackage,
  matchScore,
  onConfirmApply,
}: ApplyProofModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  if (!isOpen || !opportunity || !proofPackage) return null;

  const { candidate, relevantSkills, relevantVerifiedWork, relevantAiInterview, applicationReadiness } = proofPackage;

  const handleApply = async () => {
    setSubmitting(true);
    try {
      await onConfirmApply();
      setAppliedSuccess(true);
    } catch (err) {
      console.error('Apply error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xs font-mono font-bold uppercase text-brand">
                PRE-SUBMISSION VERIFICATION
              </div>
              <h3 className="text-lg font-bold font-sans text-foreground">
                Apply with Capabilio Proof Package
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
          {appliedSuccess ? (
            <div className="text-center py-8 space-y-4 font-sans">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-foreground">Application & Proof Submitted!</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Your verified proof package, Career ELO, and SQL simulation artifacts have been successfully submitted to <strong className="text-foreground">{opportunity.company}</strong> for the <strong className="text-foreground">{opportunity.title}</strong> role.
                </p>
              </div>

              <div className="pt-4 flex flex-wrap justify-center gap-3 font-mono text-xs">
                <Link
                  href="/launchpad/applications"
                  className="px-5 py-2.5 rounded-xl bg-brand text-white font-bold hover:bg-brand-hover transition-all flex items-center gap-1.5"
                >
                  <span>View Application Tracker</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-border bg-card text-foreground font-bold hover:bg-muted transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Target Opportunity Banner */}
              <div className="p-4 rounded-2xl bg-muted/40 border border-border flex items-center justify-between gap-4 font-mono text-xs">
                <div className="space-y-0.5">
                  <div className="text-2xs text-muted-foreground uppercase">{opportunity.company}</div>
                  <div className="font-bold text-foreground font-sans text-sm">{opportunity.title}</div>
                  <div className="text-2xs text-muted-foreground">{opportunity.location} • {opportunity.stipendOrSalary}</div>
                </div>

                <div className="text-right">
                  <div className="text-2xs text-brand font-bold uppercase">MATCH SCORE</div>
                  <div className="text-2xl font-black text-brand">{matchScore}%</div>
                </div>
              </div>

              {/* Recruiter Preview Header */}
              <div className="p-5 rounded-2xl border border-border bg-card space-y-3 font-mono text-xs">
                <div className="text-muted-foreground font-bold uppercase flex items-center justify-between">
                  <span>1. CANDIDATE PROFILE CREDENTIALS</span>
                  <span className="text-emerald-500 font-bold">✓ RECRUITER VISIBLE</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <div className="p-3 rounded-xl bg-muted/30 border border-border">
                    <div className="text-[10px] text-muted-foreground uppercase">CANDIDATE</div>
                    <div className="font-bold text-foreground truncate">{candidate.name}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30 border border-border">
                    <div className="text-[10px] text-muted-foreground uppercase">CAREER ELO</div>
                    <div className="font-bold text-foreground">{candidate.careerElo} ELO</div>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30 border border-border">
                    <div className="text-[10px] text-muted-foreground uppercase">CAREER READINESS</div>
                    <div className="font-bold text-brand">{candidate.careerReadiness}%</div>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30 border border-border">
                    <div className="text-[10px] text-muted-foreground uppercase">INTERVIEW SCORE</div>
                    <div className="font-bold text-emerald-600">{relevantAiInterview?.score || 84}/100</div>
                  </div>
                </div>

                <div className="text-2xs text-muted-foreground">
                  Institution: <strong className="text-foreground">{candidate.collegeName}</strong> • Academic Stream: <strong className="text-foreground">{candidate.stream} ({candidate.streamRating} PTS)</strong>
                </div>
              </div>

              {/* Relevant Verified Work Artifacts */}
              <div className="space-y-2 font-mono text-xs">
                <div className="text-muted-foreground font-bold uppercase flex items-center justify-between">
                  <span>2. ATTACHED ARENA SIMULATION PROOF ({relevantVerifiedWork.length})</span>
                  <span className="text-2xs text-brand font-normal">Deterministic Code & Executions</span>
                </div>

                <div className="space-y-2">
                  {relevantVerifiedWork.map((work: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl border border-border bg-muted/20 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-foreground font-sans">{work.title}</div>
                        <span className="text-xs font-bold text-emerald-600">Score: {work.score}/100</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-background border border-border text-[11px] font-mono text-muted-foreground overflow-x-auto">
                        <code>{work.sqlSnippet}</code>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Proof Hash: {work.verificationHash}</span>
                        <span className="text-emerald-500 font-semibold">✓ Verified Output</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Technical Interview Evaluation */}
              {relevantAiInterview && (
                <div className="p-4 rounded-2xl border border-border bg-card space-y-2 font-mono text-xs">
                  <div className="text-muted-foreground font-bold uppercase">
                    3. AI TECHNICAL INTERVIEW EVALUATION
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground font-sans">{relevantAiInterview.roleTitle} Technical Evaluation</span>
                    <span className="text-brand font-black">{relevantAiInterview.score}/100 ({relevantAiInterview.readinessScore}% Readiness)</span>
                  </div>
                  <div className="text-2xs text-muted-foreground">
                    Cryptographic Verification: {relevantAiInterview.verificationHash}
                  </div>
                </div>
              )}

              {/* Application Readiness Checklist */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase text-foreground">APPLICATION READINESS</span>
                  <span className="font-bold text-brand">{applicationReadiness.overallScore}%</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-2xs">
                  {applicationReadiness.checklist.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-1.5 text-muted-foreground">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer Actions */}
        {!appliedSuccess && (
          <div className="p-6 border-t border-border bg-muted/20 flex items-center justify-between font-mono text-xs">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground font-bold transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleApply}
              disabled={submitting}
              data-testid="confirm-apply-btn"
              className="px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Delivering Proof Package...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>CONFIRM & APPLY WITH PROOF</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

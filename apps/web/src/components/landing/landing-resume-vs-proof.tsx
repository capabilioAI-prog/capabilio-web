'use client';

import React from 'react';
import { XCircle, CheckCircle2, ShieldCheck, FileText, Award } from 'lucide-react';

export function LandingResumeVsProof() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border/80 bg-muted/20">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Section Heading */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-brand">
            THE PARADIGM SHIFT
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Your resume tells people what you claim. <br className="hidden sm:inline" />
            Capabilio shows what you can prove.
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Hiring managers spend 6 seconds scanning unverified bullet points. Capabilio gives them cryptographic work samples, deterministic test results, and calibrated skill ELO.
          </p>
        </div>

        {/* Split Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left: Traditional Resume */}
          <div className="p-6 sm:p-8 rounded-3xl border border-red-500/20 bg-card shadow-sm space-y-6 text-left">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-bold text-base text-foreground">TRADITIONAL RESUME</h3>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-red-500/10 text-red-600 font-bold">
                Unverified Claims
              </span>
            </div>

            <div className="space-y-4 font-sans text-xs">
              <div className="p-3.5 rounded-xl bg-muted/30 border border-border/80 flex items-start gap-3">
                <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-foreground">&ldquo;Python & REST APIs — 2 Years Experience&rdquo;</div>
                  <div className="text-2xs text-muted-foreground mt-0.5">Self-reported duration with zero code quality proof or testing metrics.</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/30 border border-border/80 flex items-start gap-3">
                <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-foreground">&ldquo;Machine Learning & AI Expert&rdquo;</div>
                  <div className="text-2xs text-muted-foreground mt-0.5">Generic keyword stuffing without precision, recall, or dataset evaluation proof.</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/30 border border-border/80 flex items-start gap-3">
                <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-foreground">&ldquo;AWS & Database Certified&rdquo;</div>
                  <div className="text-2xs text-muted-foreground mt-0.5">Multiple-choice memorization certificate with no live incident triage evidence.</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/30 border border-border/80 flex items-start gap-3">
                <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-foreground">&ldquo;Proactive Problem Solver & Fast Learner&rdquo;</div>
                  <div className="text-2xs text-muted-foreground mt-0.5">Subjective buzzword that 98% of candidates copy-paste onto PDF resumes.</div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-red-500/5 rounded-xl text-center text-2xs font-mono text-red-600">
              Recruiter trust level: 12% (Requires extensive screening calls)
            </div>
          </div>

          {/* Right: Capabilio Proof */}
          <div className="p-6 sm:p-8 rounded-3xl border-2 border-brand/40 bg-gradient-to-br from-card via-card to-brand/5 shadow-xl space-y-6 text-left">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-brand" />
                <h3 className="font-bold text-base text-foreground">CAPABILIO PROOF</h3>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold">
                100% Deterministic Evidence
              </span>
            </div>

            <div className="space-y-4 font-sans text-xs">
              <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-foreground">Python & Backend APIs</div>
                    <div className="text-2xs text-muted-foreground">Debugged 4 live microservice outages • 100% unit assertions passed</div>
                  </div>
                </div>
                <span className="font-mono font-bold text-xs text-brand">82 ELO</span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-foreground">Machine Learning Pipelines</div>
                    <div className="text-2xs text-muted-foreground">Tuned churn model F1-score from 0.62 to 0.89 on real customer dataset</div>
                  </div>
                </div>
                <span className="font-mono font-bold text-xs text-brand">74 ELO</span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-foreground">PostgreSQL & Cloud Tuning</div>
                    <div className="text-2xs text-muted-foreground">Eliminated table scan with B-Tree functional index (latency dropped 94%)</div>
                  </div>
                </div>
                <span className="font-mono font-bold text-xs text-brand">68 ELO</span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-foreground">Complete Verified Track Record</div>
                    <div className="text-2xs text-muted-foreground">12 tasks • 4 simulations • 2 projects • 1 AI technical interview</div>
                  </div>
                </div>
                <span className="font-mono font-bold text-xs text-emerald-600">Verified</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-500/10 rounded-xl text-center text-2xs font-mono text-emerald-600 font-bold">
              Recruiter trust level: 98% (Instant technical interview bypass)
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}

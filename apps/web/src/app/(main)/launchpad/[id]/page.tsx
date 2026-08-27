'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  Building2, 
  MapPin, 
  Briefcase, 
  ArrowLeft, 
  Bookmark, 
  BookmarkCheck, 
  ShieldCheck, 
  BrainCircuit, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  FileCode, 
  ArrowRight, 
  ExternalLink,
  Calendar,
  DollarSign
} from 'lucide-react';
import { ApplyProofModal } from '@/components/launchpad/apply-proof-modal';
import { ViewProofModal } from '@/components/profile/view-proof-modal';

export default function OpportunityDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [selectedProof, setSelectedProof] = useState<any | null>(null);

  const loadOpportunity = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:3001/api/launchpad/opportunities/${id}`, { credentials: 'include' });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setData(json.data);
      } else {
        setError(json.error?.message || 'Opportunity not found');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading opportunity details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOpportunity();
  }, [id]);

  const handleSaveToggle = async () => {
    if (!data) return;
    const nextSaved = !data.isSaved;
    try {
      await fetch('http://localhost:3001/api/launchpad/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ jobId: id, isSaved: nextSaved }),
      });
      loadOpportunity();
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  const handleConfirmApply = async () => {
    if (!data) return;
    await fetch('http://localhost:3001/api/launchpad/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        jobId: data.opportunity.id,
        company: data.opportunity.company,
        roleTitle: data.opportunity.title,
        salaryRange: data.opportunity.stipendOrSalary,
        matchScore: data.match.matchScore,
      }),
    });
    loadOpportunity();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-3 font-mono text-xs text-muted-foreground">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        <div>Computing Capabilio Match & Proof Package...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center font-sans space-y-4">
        <h2 className="text-xl font-bold text-foreground">Opportunity Unavailable</h2>
        <p className="text-xs text-muted-foreground max-w-sm font-mono">{error}</p>
        <Link
          href="/launchpad"
          className="px-4 py-2 rounded-xl bg-brand text-white font-mono text-xs font-bold"
        >
          Back to Launchpad
        </Link>
      </div>
    );
  }

  const { opportunity, match, proofPackage, isSaved, hasApplied, applicationStatus } = data;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-brand selection:text-white pb-24">
      {/* Header Bar */}
      <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">
          <div className="flex items-center justify-between">
            <Link
              href="/launchpad"
              className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground font-mono text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Opportunities</span>
            </Link>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveToggle}
                data-testid="detail-save-btn"
                className={`px-3.5 py-2 rounded-xl border font-mono text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isSaved
                    ? 'border-brand/30 bg-brand/10 text-brand'
                    : 'border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {isSaved ? (
                  <>
                    <BookmarkCheck className="w-3.5 h-3.5 fill-brand text-brand" />
                    <span>Saved</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>Save Opportunity</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setIsApplyModalOpen(true)}
                data-testid="apply-with-proof-main-btn"
                className="px-5 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white font-mono text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{hasApplied ? 'UPDATE APPLICATION' : 'APPLY WITH PROOF'}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-2">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-2xs font-mono font-bold bg-brand/10 text-brand border border-brand/20">
                  DEMO OPPORTUNITY
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-2xs font-mono font-bold bg-muted text-foreground uppercase">
                  {opportunity.employmentType?.replace(/_/g, ' ')}
                </span>
                {hasApplied && (
                  <span className="px-2.5 py-0.5 rounded-full text-2xs font-mono font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    ✓ APPLIED
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight" data-testid="detail-job-title">
                {opportunity.title}
              </h1>

              <div className="text-sm font-bold text-muted-foreground flex flex-wrap items-center gap-2 font-sans">
                <span className="text-foreground">{opportunity.company}</span>
                <span>•</span>
                <span>{opportunity.location}</span>
                <span>•</span>
                <span className="text-emerald-600">{opportunity.stipendOrSalary}</span>
                <span>•</span>
                <span className="text-muted-foreground font-mono text-xs font-normal">Exp: {opportunity.experienceRequired}</span>
              </div>
            </div>

            {/* Capabilio Match Score Hero Badge */}
            <div className="p-4 rounded-3xl bg-brand/10 border border-brand/20 text-center font-mono shrink-0">
              <div className="text-[10px] text-brand font-bold uppercase">CAPABILIO MATCH</div>
              <div className="text-3xl font-black text-brand" data-testid="detail-match-score">
                {match.matchScore}%
              </div>
              <div className="text-[9px] text-brand/80 font-semibold">Evidence-Backed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Detail Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* Capabilio Match Analysis Section */}
        <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand" />
              <h3 className="font-bold text-base font-sans text-foreground">
                Capabilio Match Analysis
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-brand">
              {match.matchScore}% MATCHING INDEX
            </span>
          </div>

          {/* AI Narrative */}
          <div className="p-4 rounded-2xl bg-muted/30 border border-border text-sm text-foreground font-sans italic leading-relaxed" data-testid="detail-match-summary">
            &ldquo;{match.aiMatchAnalysis.summary}&rdquo;
          </div>

          {/* Matched Skills Breakdown */}
          <div className="space-y-3 font-mono text-xs">
            <div className="text-muted-foreground font-bold uppercase">WHY YOU MATCH</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {match.matchedSkills.map((sk: any, idx: number) => {
                const isStrong = sk.status === 'Strong';
                const isGap = sk.status === 'Gap';

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-border bg-card space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground font-sans text-sm">{sk.name}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isStrong ? 'bg-emerald-500/10 text-emerald-600' : isGap ? 'bg-amber-500/10 text-amber-600' : 'bg-muted text-foreground'
                      }`}>
                        {sk.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-2xs text-muted-foreground">
                      <span>Your Demonstrated: <strong className="text-foreground">{sk.candidateProficiency}%</strong></span>
                      <span>Target: <strong className="text-foreground">{sk.requiredProficiency}%</strong></span>
                    </div>

                    <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isStrong ? 'bg-emerald-500' : isGap ? 'bg-amber-500' : 'bg-brand'}`}
                        style={{ width: `${Math.min(100, (sk.candidateProficiency / sk.requiredProficiency) * 100)}%` }}
                      />
                    </div>

                    <div className="text-[10px] text-muted-foreground">
                      Verified Demonstrations: <strong className="text-foreground">{sk.evidenceCount} work samples</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Skill Gaps & Action Links */}
          {match.skillGaps.length > 0 && (
            <div className="space-y-3 font-mono text-xs pt-2">
              <div className="text-amber-500 font-bold uppercase flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>IDENTIFIED SKILL GAPS & NEXT ACTIONS</span>
              </div>

              <div className="space-y-2.5">
                {match.skillGaps.map((gap: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-foreground font-sans">
                        {gap.name} (Demonstrated: {gap.candidateProficiency}% • Required: {gap.requiredProficiency}%)
                      </div>
                      <p className="text-xs text-muted-foreground font-sans">
                        {gap.recommendation}
                      </p>
                    </div>

                    <Link
                      href={gap.actionUrl}
                      data-testid="improve-skill-gap-btn"
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition-all text-2xs whitespace-nowrap self-start sm:self-center"
                    >
                      <span>IMPROVE THIS SKILL</span>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Opportunity Description & Responsibilities */}
        <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-6">
          <div className="space-y-3">
            <h3 className="font-bold text-lg font-sans text-foreground">Role Description</h3>
            <p className="text-sm text-muted-foreground font-sans leading-relaxed">
              {opportunity.description}
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <h3 className="font-bold text-base font-sans text-foreground">Key Responsibilities</h3>
            <ul className="space-y-2 font-sans text-xs text-muted-foreground list-disc list-inside leading-relaxed">
              {opportunity.responsibilities.map((resp: string, idx: number) => (
                <li key={idx}><span className="text-foreground">{resp}</span></li>
              ))}
            </ul>
          </div>

          <div className="space-y-3 pt-2">
            <h3 className="font-bold text-base font-sans text-foreground">Role Requirements</h3>
            <ul className="space-y-2 font-sans text-xs text-muted-foreground list-disc list-inside leading-relaxed">
              {opportunity.requirements.map((req: string, idx: number) => (
                <li key={idx}><span className="text-foreground">{req}</span></li>
              ))}
            </ul>
          </div>
        </div>

        {/* Verified Proof Package Preview */}
        <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <div className="text-2xs font-mono font-bold text-brand uppercase">ATTACHED CREDENTIAL PROOF</div>
              <h3 className="font-bold text-base font-sans text-foreground">
                Relevant Evidence in Your Proof Package
              </h3>
            </div>
            <button
              onClick={() => setIsApplyModalOpen(true)}
              className="text-xs font-mono font-bold text-brand hover:underline"
            >
              Review Full Package →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {proofPackage.relevantVerifiedWork.map((work: any, idx: number) => (
              <div
                key={idx}
                className="p-5 rounded-2xl border border-border bg-muted/20 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      ✓ ARENA PROOF
                    </span>
                    <span className="text-xs font-mono font-bold text-foreground">Score: {work.score}/100</span>
                  </div>

                  <div className="font-bold text-foreground font-sans text-sm">{work.title}</div>
                  <div className="p-2 rounded-xl bg-background border border-border text-[11px] font-mono text-muted-foreground overflow-x-auto">
                    <code>{work.sqlSnippet}</code>
                  </div>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between font-mono text-[10px] text-muted-foreground">
                  <span>Hash: {work.verificationHash}</span>
                  <button
                    onClick={() => {
                      setSelectedProof(work);
                      setIsProofModalOpen(true);
                    }}
                    data-testid="view-evidence-btn"
                    className="text-brand font-bold hover:underline"
                  >
                    View Proof →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sticky Apply Banner */}
        <div className="p-6 sm:p-8 rounded-3xl bg-foreground text-background flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl">
          <div className="space-y-1">
            <div className="text-xs font-mono font-bold text-brand uppercase">READY TO DEMONSTRATE CAPABILITY?</div>
            <h3 className="text-xl font-bold font-sans">
              Apply to {opportunity.company} with verified Capabilio Proof
            </h3>
            <p className="text-xs opacity-80 font-sans">
              Hiring managers inspect your actual deterministic SQL submissions, SHA-256 hashes, and AI evaluations.
            </p>
          </div>

          <button
            onClick={() => setIsApplyModalOpen(true)}
            data-testid="apply-with-proof-banner-btn"
            className="px-6 py-3.5 rounded-2xl bg-brand hover:bg-brand-hover text-white font-mono text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>APPLY WITH CAPABILIO PROOF</span>
          </button>
        </div>
      </div>

      <ApplyProofModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        opportunity={opportunity}
        proofPackage={proofPackage}
        matchScore={match.matchScore}
        onConfirmApply={handleConfirmApply}
      />

      <ViewProofModal
        isOpen={isProofModalOpen}
        onClose={() => setIsProofModalOpen(false)}
        proof={selectedProof}
      />
    </div>
  );
}

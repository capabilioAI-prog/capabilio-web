'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Briefcase, 
  ArrowLeft, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  ExternalLink, 
  Building2, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { ViewProofModal } from '@/components/profile/view-proof-modal';

export default function ApplicationsTrackerPage() {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedProof, setSelectedProof] = useState<any | null>(null);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:3001/api/launchpad', { credentials: 'include' });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setApplications(json.data.applications || []);
      } else {
        setError(json.error?.message || 'Failed to load applications');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading application tracker');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-3 font-mono text-xs text-muted-foreground">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        <div>Loading Application Pipelines & Proof Deliveries...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-brand selection:text-white pb-24">
      {/* Header Bar */}
      <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-3">
          <div className="flex items-center justify-between">
            <Link
              href="/launchpad"
              className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground font-mono text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Launchpad</span>
            </Link>

            <span className="text-xs font-mono font-bold text-brand">
              {applications.length} ACTIVE APPLICATIONS
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight" data-testid="applications-tracker-title">
            APPLICATION TRACKER
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-sans">
            Track hiring pipeline progress, recruiter proof package deliveries, and assessment stages.
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {applications.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border border-border bg-card space-y-3 font-sans">
            <Briefcase className="w-10 h-10 text-muted-foreground mx-auto" />
            <h3 className="text-base font-bold text-foreground">No applications submitted yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto font-mono">
              Explore opportunities matched to your Career ELO and apply with verified proof.
            </p>
            <Link
              href="/launchpad"
              className="inline-block px-5 py-2.5 rounded-xl bg-brand text-white font-mono text-xs font-bold"
            >
              Explore Opportunities
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => {
              const appliedDate = new Date(app.appliedAt).toLocaleDateString();
              const proof = app.proofPackage;

              return (
                <div
                  key={app.id}
                  className="p-6 sm:p-7 rounded-3xl border border-border bg-card shadow-xs space-y-5"
                  data-testid="application-item"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-2xs font-mono font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 uppercase">
                          {app.status}
                        </span>
                        <span className="text-2xs font-mono text-muted-foreground">
                          Applied on {appliedDate}
                        </span>
                      </div>

                      <h3 className="text-xl font-bold text-foreground font-sans">
                        <Link href={`/launchpad/${app.jobId}`} className="hover:text-brand transition-colors">
                          {app.roleTitle}
                        </Link>
                      </h3>

                      <div className="text-xs text-muted-foreground font-sans flex items-center gap-2">
                        <strong className="text-foreground">{app.company}</strong>
                        <span>•</span>
                        <span>{app.salaryRange || 'Competitive'}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-brand/10 border border-brand/20 text-center font-mono shrink-0">
                      <div className="text-[9px] text-brand font-bold uppercase">MATCH SCORE</div>
                      <div className="text-xl font-black text-brand">{app.matchScore}%</div>
                    </div>
                  </div>

                  {/* Application Timeline Indicator */}
                  <div className="space-y-2 pt-2 border-t border-border font-mono text-xs">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold">PIPELINE TIMELINE</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-2xs font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>1. Applied & Proof Sent</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-muted-foreground text-2xs font-bold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>2. Recruiter Review</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-muted-foreground text-2xs font-bold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>3. Technical Screen</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-muted-foreground text-2xs font-bold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>4. Decision</span>
                      </div>
                    </div>
                  </div>

                  {/* Delivered Proof Package Summary */}
                  {proof?.relevantVerifiedWork && (
                    <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-2 font-mono text-2xs">
                      <div className="text-muted-foreground uppercase font-bold flex items-center justify-between">
                        <span>DELIVERED PROOF PACKAGE</span>
                        <span className="text-brand font-bold">ELO: {proof.candidate?.careerElo || 404}</span>
                      </div>
                      <div className="text-muted-foreground">
                        {proof.relevantVerifiedWork.length} Arena simulation submissions • AI Technical Interview ({proof.relevantAiInterview?.score || 84}/100)
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ViewProofModal
        isOpen={isProofModalOpen}
        onClose={() => setIsProofModalOpen(false)}
        proof={selectedProof}
      />
    </div>
  );
}

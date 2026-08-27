'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Building2, 
  MapPin, 
  Briefcase, 
  Bookmark, 
  BookmarkCheck, 
  ArrowRight, 
  ShieldCheck, 
  BrainCircuit, 
  Clock,
  Sparkles,
  Check,
  AlertCircle
} from 'lucide-react';
import { OpportunityWithMatch } from '@capabilio/types';

interface OpportunityCardProps {
  opportunity: any;
  onSaveToggle?: (jobId: string, isSaved: boolean) => void;
  onApplyClick?: (opportunity: any) => void;
}

export function OpportunityCard({
  opportunity,
  onSaveToggle,
  onApplyClick,
}: OpportunityCardProps) {
  const isHighMatch = opportunity.matchScore >= 80;

  return (
    <div
      className={`p-6 sm:p-7 rounded-3xl border transition-all flex flex-col justify-between space-y-5 bg-card hover:border-brand/40 shadow-xs group ${
        isHighMatch ? 'border-border' : 'border-border'
      }`}
    >
      <div className="space-y-4">
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-muted text-muted-foreground uppercase">
                DEMO OPPORTUNITY
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-muted/60 text-foreground uppercase">
                {opportunity.employmentType?.replace(/_/g, ' ')}
              </span>
              <span className="text-2xs font-mono text-muted-foreground">
                {opportunity.duration}
              </span>
            </div>

            <h3 className="text-lg font-bold text-foreground font-sans group-hover:text-brand transition-colors pt-1">
              <Link href={`/launchpad/${opportunity.id}`} data-testid="opportunity-title-link">
                {opportunity.title}
              </Link>
            </h3>

            <div className="text-xs text-muted-foreground font-sans flex flex-wrap items-center gap-2 pt-0.5">
              <span className="font-bold text-foreground">{opportunity.company}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-muted-foreground" />
                <span>{opportunity.location}</span>
              </span>
              <span>•</span>
              <span className="text-emerald-600 font-bold">{opportunity.stipendOrSalary}</span>
            </div>
          </div>

          {/* Match Score Badge & Save Button */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="p-2.5 rounded-2xl bg-brand/10 border border-brand/20 text-center font-mono">
              <div className="text-[9px] text-brand font-bold uppercase">MATCH</div>
              <div className="text-lg font-black text-brand" data-testid="opportunity-match-score">
                {opportunity.matchScore}%
              </div>
            </div>

            {onSaveToggle && (
              <button
                onClick={() => onSaveToggle(opportunity.id, !opportunity.isSaved)}
                data-testid="save-opportunity-btn"
                title={opportunity.isSaved ? 'Remove from Saved' : 'Save Opportunity'}
                className={`p-2.5 rounded-2xl border transition-all ${
                  opportunity.isSaved
                    ? 'border-brand/30 bg-brand/10 text-brand'
                    : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground'
                }`}
              >
                {opportunity.isSaved ? (
                  <BookmarkCheck className="w-4 h-4 fill-brand text-brand" />
                ) : (
                  <Bookmark className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Description snippet */}
        <p className="text-xs text-muted-foreground font-sans leading-relaxed line-clamp-2">
          {opportunity.description}
        </p>

        {/* Required Skills & Verification Status */}
        <div className="space-y-1.5 font-mono text-2xs">
          <div className="text-muted-foreground uppercase font-bold">REQUIRED SKILLS & EVIDENCE</div>
          <div className="flex flex-wrap gap-1.5">
            {opportunity.requiredSkills.map((sk: any, idx: number) => {
              const matched = opportunity.matchedSkills?.find((m: any) => m.name === sk.name);
              const isStrong = matched?.status === 'Strong';
              const isGap = matched?.status === 'Gap';

              return (
                <span
                  key={idx}
                  className={`px-2.5 py-1 rounded-xl border flex items-center gap-1 font-bold ${
                    isStrong
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                      : isGap
                      ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      : 'bg-muted/40 text-foreground border-border'
                  }`}
                >
                  <span>{sk.name}</span>
                  {isStrong && <span>✓</span>}
                  {isGap && <span className="text-[9px]">◐</span>}
                </span>
              );
            })}
          </div>
        </div>

        {/* Verified Evidence Footer Indicator */}
        <div className="p-3 rounded-2xl bg-muted/30 border border-border flex items-center justify-between font-mono text-2xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-brand" />
            <span>Verified: <strong className="text-foreground">Arena Simulations + AI Technical Interview</strong></span>
          </div>
          <span className="text-emerald-500 font-bold">Ready to Apply</span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-border flex items-center justify-between font-mono text-xs">
        <Link
          href={`/launchpad/${opportunity.id}`}
          className="text-xs text-muted-foreground hover:text-foreground font-bold flex items-center gap-1"
        >
          <span>View Details</span>
          <ArrowRight className="w-3 h-3" />
        </Link>

        {onApplyClick && (
          <button
            onClick={() => onApplyClick(opportunity)}
            data-testid="apply-with-proof-card-btn"
            className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold shadow-xs transition-all flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>APPLY WITH PROOF</span>
          </button>
        )}
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { 
  ShieldCheck, 
  ArrowRight, 
  Star, 
  Sparkles, 
  Video, 
  GraduationCap, 
  BrainCircuit, 
  AlertTriangle,
  FileCode
} from 'lucide-react';
import { PortfolioEvidenceItem } from '@capabilio/types';

interface PortfolioCardProps {
  item: PortfolioEvidenceItem;
  onOpenProof: (item: PortfolioEvidenceItem) => void;
  onToggleFeature?: (item: PortfolioEvidenceItem) => void;
  isEditable?: boolean;
}

export function PortfolioCard({
  item,
  onOpenProof,
  onToggleFeature,
  isEditable = false,
}: PortfolioCardProps) {
  const isRegression = item.verificationStatus === 'regression';

  return (
    <div
      className={`p-6 rounded-3xl border ${
        item.isFeatured ? 'border-brand/50 ring-1 ring-brand/20 bg-card' : 'border-border bg-card'
      } hover:border-brand/40 transition-all flex flex-col justify-between space-y-4 shadow-xs`}
    >
      <div className="space-y-3">
        {/* Top Badges */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {item.type === 'verified_work' && (
              <span className="px-2.5 py-0.5 rounded-full text-2xs font-mono font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>VERIFIED ARENA WORK</span>
              </span>
            )}
            {item.type === 'ai_interview' && (
              <span className="px-2.5 py-0.5 rounded-full text-2xs font-mono font-bold bg-brand/10 text-brand border border-brand/20 flex items-center gap-1">
                <BrainCircuit className="w-3 h-3" />
                <span>AI INTERVIEW</span>
              </span>
            )}
            {item.type === 'academic_work' && (
              <span className="px-2.5 py-0.5 rounded-full text-2xs font-mono font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20 flex items-center gap-1">
                <GraduationCap className="w-3 h-3" />
                <span>ACADEMIC STREAM</span>
              </span>
            )}

            {isRegression && (
              <span className="px-2 py-0.5 rounded-full text-2xs font-mono font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>REGRESSION ATTEMPT</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onToggleFeature && (
              <button
                onClick={() => onToggleFeature(item)}
                title={item.isFeatured ? 'Remove from Featured' : 'Feature on Portfolio'}
                className={`p-1.5 rounded-lg border transition-all ${
                  item.isFeatured
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-500'
                    : 'border-border bg-muted/40 text-muted-foreground hover:text-foreground'
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${item.isFeatured ? 'fill-amber-500' : ''}`} />
              </button>
            )}
            <span className="text-xs font-mono font-bold text-foreground">
              {item.eloChange > 0 ? `+${item.eloChange}` : item.eloChange} ELO
            </span>
          </div>
        </div>

        {/* Title & Role */}
        <div>
          <div className="text-2xs font-mono text-muted-foreground uppercase">{item.roleName}</div>
          <h4 className="font-bold text-base text-foreground font-sans mt-0.5 leading-snug">
            {item.title}
          </h4>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed font-sans line-clamp-3">
          {item.description}
        </p>

        {/* Skills Demonstrated */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {item.skills.slice(0, 4).map((sk, idx) => (
            <span
              key={idx}
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-foreground"
            >
              {sk.name}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-border flex items-center justify-between font-mono text-xs">
        <span className="text-muted-foreground">
          Score: <strong className="text-foreground">{item.score}/100</strong>
        </span>

        <button
          onClick={() => onOpenProof(item)}
          data-testid="portfolio-view-proof-btn"
          className="px-3.5 py-1.5 rounded-xl border border-border hover:bg-muted text-brand font-bold transition-colors flex items-center gap-1"
        >
          <span>VIEW PROOF</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

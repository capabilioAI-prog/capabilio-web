'use client';

import React from 'react';
import Link from 'next/link';
import { BrainCircuit, TrendingUp, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';
import { PortfolioIntelligence } from '@capabilio/types';

interface PortfolioIntelligenceCardProps {
  insights: PortfolioIntelligence;
}

export function PortfolioIntelligenceCard({ insights }: PortfolioIntelligenceCardProps) {
  return (
    <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-brand" />
          <h3 className="text-base font-bold font-sans text-foreground">
            What Your Portfolio Says About You
          </h3>
        </div>
        <span className="text-2xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20">
          AI PORTFOLIO INTELLIGENCE
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
        {/* Strongest Capability */}
        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
          <div className="text-[10px] uppercase font-bold text-emerald-600 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>STRONGEST DEMONSTRATION</span>
          </div>
          <div className="text-lg font-black text-foreground font-sans">
            {insights.strongestCapability.name}
          </div>
          <div className="text-sm font-black text-emerald-600">
            {insights.strongestCapability.proficiency}% Proficiency
          </div>
          <p className="text-2xs text-muted-foreground font-sans">
            Consistent top-tier execution across Arena simulations.
          </p>
        </div>

        {/* Most Improved */}
        <div className="p-4 rounded-2xl bg-brand/5 border border-brand/20 space-y-2">
          <div className="text-[10px] uppercase font-bold text-brand flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>MOST IMPROVED SKILL</span>
          </div>
          <div className="text-lg font-black text-foreground font-sans">
            {insights.mostImprovedSkill.name}
          </div>
          <div className="text-sm font-black text-brand">
            {insights.mostImprovedSkill.delta} Growth
          </div>
          <p className="text-2xs text-muted-foreground font-sans">
            Turned regression into verified capability via targeted remediation.
          </p>
        </div>

        {/* Current Weakness / Gap */}
        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
          <div className="text-[10px] uppercase font-bold text-amber-600 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>CURRENT GAP</span>
          </div>
          <div className="text-lg font-black text-foreground font-sans">
            {insights.currentGap.name}
          </div>
          <div className="text-sm font-black text-amber-600">
            {insights.currentGap.score}% Baseline
          </div>
          <p className="text-2xs text-muted-foreground font-sans">
            Identified opportunity to expand execution capabilities.
          </p>
        </div>
      </div>

      {/* Recommended Next Proof */}
      <div className="p-4 rounded-2xl bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs">
        <div className="space-y-1">
          <div className="text-[10px] text-brand font-bold uppercase">RECOMMENDED NEXT PROOF</div>
          <div className="font-bold text-foreground text-sm font-sans">{insights.nextBestProof.title}</div>
          <p className="text-xs text-muted-foreground font-sans leading-relaxed">{insights.nextBestProof.recommendation}</p>
        </div>

        <Link
          href={insights.nextBestProof.actionUrl}
          className="px-4 py-2 rounded-xl bg-foreground text-background font-bold hover:bg-foreground/90 transition-colors flex items-center gap-1.5 shrink-0 justify-center"
        >
          <span>Start Mission</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

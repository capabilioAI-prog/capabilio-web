'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, CheckCircle2, CircleDot, ArrowRight } from 'lucide-react';
import { PortfolioCompleteness } from '@capabilio/types';

interface PortfolioCompletenessMeterProps {
  completeness: PortfolioCompleteness;
}

export function PortfolioCompletenessMeter({ completeness }: PortfolioCompletenessMeterProps) {
  return (
    <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-brand" />
          <h3 className="text-base font-bold font-sans text-foreground">
            Portfolio Strength & Completeness
          </h3>
        </div>
        <span className="text-xl font-black font-mono text-brand">
          {completeness.score}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2 font-mono text-xs">
        <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand to-brand-hover rounded-full transition-all duration-500"
            style={{ width: `${completeness.score}%` }}
          />
        </div>
      </div>

      {/* Missing Items / Action Plan */}
      <div className="space-y-3 font-mono text-xs">
        <div className="text-muted-foreground font-bold uppercase">
          RECOMMENDED ACTIONS TO REACH 100%
        </div>

        {completeness.missingItems.length === 0 ? (
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Portfolio is completely optimized and recruiter-ready!</span>
          </div>
        ) : (
          <div className="space-y-2">
            {completeness.missingItems.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-muted/30 border border-border flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2 text-foreground font-sans">
                  <CircleDot className="w-3.5 h-3.5 text-brand shrink-0" />
                  <span>{item}</span>
                </div>
                <Link
                  href="/arena/career"
                  className="text-xs text-brand font-bold hover:underline flex items-center gap-0.5 shrink-0"
                >
                  <span>Resolve</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

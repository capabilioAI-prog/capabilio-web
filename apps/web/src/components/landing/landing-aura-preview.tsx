'use client';

import React from 'react';
import Link from 'next/link';
import { Compass, TrendingUp, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export function LandingAuraPreview() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-12">
      
      {/* Header */}
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <span className="text-xs font-mono font-bold uppercase tracking-widest text-brand">
          CONTINUOUS CAREER COMMAND
        </span>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Your career, measured continuously.
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Aura is your living career intelligence system. It quantifies your momentum, tracks verified skill growth, and recommends the exact next action to maximize your hiring velocity.
        </p>
      </div>

      {/* Aura Dashboard Card */}
      <div className="p-6 sm:p-8 rounded-3xl border-2 border-border bg-gradient-to-br from-card via-card to-brand/5 shadow-2xl space-y-6 text-left">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-brand" />
            <h3 className="font-bold text-base text-foreground">Aura Career Command // Telemetry</h3>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-brand/10 text-brand font-bold">
            Target: Software Engineer
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Strengths */}
          <div className="p-5 rounded-2xl bg-muted/40 border border-border/80 space-y-3">
            <span className="text-xs font-mono font-bold uppercase text-emerald-600 block">
              DEMONSTRATED STRENGTHS
            </span>
            <div className="space-y-2 text-xs text-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Python & Async Architecture (88%)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>REST API Contracts & Validation (82%)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Algorithmic Logic & Memory (79%)</span>
              </div>
            </div>
          </div>

          {/* Growth Areas */}
          <div className="p-5 rounded-2xl bg-muted/40 border border-border/80 space-y-3">
            <span className="text-xs font-mono font-bold uppercase text-amber-600 block">
              PRIMARY GROWTH AREAS
            </span>
            <div className="space-y-2 text-xs text-foreground">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Docker & Cloud Deployment (48%)</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Distributed Caching & Redis (52%)</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>End-to-End Test Automation (58%)</span>
              </div>
            </div>
          </div>

          {/* Next Best Action */}
          <div className="p-5 rounded-2xl bg-brand/10 border border-brand/30 space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <span className="text-xs font-mono font-bold uppercase text-brand flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                <span>NEXT BEST CAREER ACTION</span>
              </span>
              <h4 className="text-sm font-bold text-foreground">
                Complete a production debugging mission in Arena.
              </h4>
              <p className="text-2xs text-muted-foreground leading-relaxed">
                Tackling Ticket #1842 will resolve your primary concurrency gap and earn +24 ELO.
              </p>
            </div>

            <Link
              href="/aura"
              className="w-full py-2.5 px-4 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold text-center block transition-colors shadow-xs"
            >
              Explore Aura Command →
            </Link>
          </div>

        </div>
      </div>

    </section>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { Rocket, Radio, Heart, MessageSquare, Bookmark, CheckCircle2, ArrowRight } from 'lucide-react';

export function LandingLaunchpadPulse() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-12">
      
      {/* Header */}
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <span className="text-xs font-mono font-bold uppercase tracking-widest text-brand">
          OPPORTUNITIES & COMMUNITY
        </span>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          When you&apos;re ready, find work that matches your proof.
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Recruiters on Launchpad discover candidates by verified workstation evidence rather than keyword resumes. Stay connected to your career domain on Pulse.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left: Launchpad Card */}
        <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-md space-y-6 text-left flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <Rocket className="w-5 h-5 text-brand" />
                <h3 className="font-bold text-base text-foreground">Launchpad Opportunity</h3>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-600 font-bold">
                72% Verified Match
              </span>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">TechFlow SaaS • Remote • $95k - $125k</div>
              <h4 className="text-base font-bold text-foreground">Junior Software Engineer — Frontend & Core</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Looking for an engineer with proven debugging experience and high test coverage discipline.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/80 text-xs">
              <span className="font-mono text-[10px] uppercase font-bold text-muted-foreground block">
                VERIFIED SKILL REQUIREMENTS
              </span>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Python / Async
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> REST APIs
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Git Workflows
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold">
                  Gap: Cloud Deploy
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/launchpad"
            className="w-full py-2.5 px-4 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold text-center block transition-colors shadow-xs"
          >
            Explore Opportunities →
          </Link>
        </div>

        {/* Right: Pulse Newsfeed */}
        <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-md space-y-6 text-left flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-brand" />
                <h3 className="font-bold text-base text-foreground">Pulse Career Feed</h3>
              </div>
              <span className="text-xs font-mono text-brand font-bold">Software Engineering</span>
            </div>

            <div className="p-4 rounded-2xl bg-muted/30 border border-border/80 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">Alex Chen • Tech Lead</span>
                <span className="text-2xs font-mono text-muted-foreground">Trending Today</span>
              </div>
              <p className="text-xs text-foreground leading-relaxed">
                &ldquo;Why junior engineers should learn to read PostgreSQL EXPLAIN ANALYZE execution plans before jumping into microservice rewrites.&rdquo;
              </p>

              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 border-t border-border/60">
                <span className="flex items-center gap-1 text-brand font-semibold"><Heart className="w-3.5 h-3.5 fill-brand" /> 42</span>
                <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> 8 comments</span>
                <span className="flex items-center gap-1"><Bookmark className="w-3.5 h-3.5" /> Save</span>
              </div>
            </div>
          </div>

          <Link
            href="/pulse"
            className="w-full py-2.5 px-4 rounded-xl border border-border hover:bg-muted text-foreground text-xs font-bold text-center block transition-colors"
          >
            Explore Pulse Feed →
          </Link>
        </div>

      </div>
    </section>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, BarChart3, CheckCircle2, AlertCircle } from 'lucide-react';

const SKILLS_DATA = [
  { name: 'Python Core & Logic', score: 87, status: 'Strong', color: 'bg-emerald-500' },
  { name: 'Data Structures & Algorithms', score: 78, status: 'Strong', color: 'bg-emerald-500' },
  { name: 'RESTful API Architecture', score: 74, status: 'Developing', color: 'bg-blue-500' },
  { name: 'Git & Production Workflows', score: 82, status: 'Strong', color: 'bg-emerald-500' },
  { name: 'Deterministic Unit Testing', score: 61, status: 'Developing', color: 'bg-blue-500' },
  { name: 'Cloud Infrastructure & Deploy', score: 48, status: 'Skill Gap', color: 'bg-amber-500' }
];

export function LandingSkillStudioPreview() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border/80 bg-muted/10">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-brand">
            DIAGNOSTIC LEARNING ARCHITECTURE
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Know exactly what your career requires.
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Skill Studio maps your target role into measurable capabilities. No generic 40-hour lecture marathons—diagnose your exact gaps and practice the missing skills.
          </p>
        </div>

        {/* Skill Graph Container */}
        <div className="p-6 sm:p-8 rounded-3xl border-2 border-border bg-card shadow-xl space-y-6 text-left">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-brand" />
              <h3 className="font-bold text-base text-foreground">Software Engineer • Skill Graph Diagnostic</h3>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold">Strong (&gt;75%)</span>
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 font-bold">Developing</span>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold">Skill Gap (&lt;50%)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SKILLS_DATA.map(skill => (
              <div key={skill.name} className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">{skill.name}</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      skill.status === 'Strong' ? 'bg-emerald-500/10 text-emerald-600' :
                      skill.status === 'Developing' ? 'bg-blue-500/10 text-blue-600' :
                      'bg-amber-500/10 text-amber-600'
                    }`}>
                      {skill.status}
                    </span>
                    <span className="font-bold text-foreground">{skill.score}%</span>
                  </div>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${skill.color} rounded-full`} style={{ width: `${skill.score}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-brand/5 border border-brand/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand" />
                <span>Recommended Next Skill: Cloud Infrastructure & Deploy</span>
              </div>
              <p className="text-2xs text-muted-foreground">
                Mastering Docker containers and CI/CD pipelines will increase your overall Job Readiness by +18%.
              </p>
            </div>

            <Link
              href="/skill-studio"
              className="px-5 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold transition-colors shadow-xs shrink-0 flex items-center gap-1.5"
            >
              <span>Explore Skill Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
}

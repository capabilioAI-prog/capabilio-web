'use client';

import React from 'react';
import { 
  Dna, 
  Code2, 
  CheckCircle2, 
  Zap, 
  FileCode, 
  TrendingUp, 
  Layers,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

interface AuraCodeDnaTabProps {
  overviewData: any;
}

export function AuraCodeDnaTab({ overviewData }: AuraCodeDnaTabProps) {
  const codeDna = overviewData?.codeDna || {
    primaryLanguage: 'TypeScript',
    languageBreakdown: [
      { name: 'TypeScript', percentage: 72 },
      { name: 'Python', percentage: 18 },
      { name: 'SQL', percentage: 10 },
    ],
    strengths: [
      'Deterministic Unit Test Assertions',
      'Clean Async & Promise Pipelines',
      'Strict Type Boundary Checks',
    ],
    areasToImprove: [
      'Boundary Case Regex Tightening',
      'Distributed Error Backoff Logic',
    ],
    codeQualityScore: 92,
    testingHabitScore: 88,
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Code DNA Overview */}
      <div className="p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-2xs space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-brand">
              Engineering Pattern Telemetry
            </span>
            <h2 className="text-xl font-bold text-foreground mt-1">
              Code DNA & Problem-Solving Fingerprint
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Derived directly from automated static analysis and test harnesses across your Arena submissions.
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
            <Dna className="w-5 h-5" />
          </div>
        </div>

        {/* Language Breakdown */}
        <div className="space-y-3">
          <div className="text-xs font-mono font-semibold uppercase text-muted-foreground">
            Programming Languages Utilized
          </div>
          <div className="space-y-2">
            {codeDna.languageBreakdown.map((lang: any) => (
              <div key={lang.name} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-foreground">{lang.name}</span>
                  <span className="font-mono text-muted-foreground">{lang.percentage}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-brand rounded-full" style={{ width: `${lang.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Strengths & Improvement Patterns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl border border-border bg-card shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Demonstrated Coding Strengths</span>
          </h3>
          <ul className="space-y-2 text-xs text-muted-foreground">
            {codeDna.strengths.map((str: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">•</span>
                <span className="leading-relaxed">{str}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-6 rounded-2xl border border-border bg-card shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Targeted Architectural Improvements</span>
          </h3>
          <ul className="space-y-2 text-xs text-muted-foreground">
            {codeDna.areasToImprove.map((imp: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">•</span>
                <span className="leading-relaxed">{imp}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

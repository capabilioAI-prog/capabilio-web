'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Target, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Compass, 
  Mic2,
  Swords
} from 'lucide-react';

interface AuraSkillGapsTabProps {
  overviewData: any;
}

export function AuraSkillGapsTab({ overviewData }: AuraSkillGapsTabProps) {
  const activeRole = overviewData?.activeRole || { name: 'Software Engineer' };
  const skillGraph = overviewData?.skillGraph || [];
  const readiness = overviewData?.readiness || { overall: 35 };

  // Sort into Critical, Important, and Optional
  const criticalGaps = skillGraph.filter((s: any) => s.isCore && s.proficiency < 60);
  const importantGaps = skillGraph.filter((s: any) => s.isCore && s.proficiency >= 60 && s.proficiency < 80);
  const masteredSkills = skillGraph.filter((s: any) => s.proficiency >= 80);

  return (
    <div className="space-y-8 font-sans">
      {/* Target & Readiness Header */}
      <div className="p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-brand">
              Gap Diagnostic Engine
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-1">
              What is missing to become {activeRole.name} Job-Ready?
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Comparing your demonstrated ELO and evidence matrix against {activeRole.name} industry requirements.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-muted/40 border border-border text-center self-start sm:self-auto shrink-0">
            <div className="text-[10px] font-mono uppercase text-muted-foreground">Current Readiness</div>
            <div className="text-2xl font-bold font-mono text-brand">{readiness.overall}%</div>
          </div>
        </div>
      </div>

      {/* Critical Gaps Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <h3 className="font-bold text-sm text-foreground uppercase font-mono tracking-wide">
            Critical Skill Gaps ({criticalGaps.length})
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {criticalGaps.map((gap: any) => (
            <div key={gap.id} className="p-5 rounded-2xl border border-red-500/20 bg-card shadow-2xs space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-red-600 bg-red-500/10 px-2 py-0.5 rounded">
                    Critical Gap • {gap.proficiency}% vs 85% Target
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">{gap.category}</span>
                </div>
                <h4 className="font-bold text-base text-foreground">{gap.name}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  High-weight core requirement for {activeRole.name}. Needs hands-on workstation practice to generate verified test evidence.
                </p>
              </div>

              <div className="pt-3 border-t border-border flex items-center gap-2">
                <Link
                  href="/arena"
                  className="flex-1 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold text-center shadow-xs transition-colors"
                >
                  Practice in Arena
                </Link>
                <Link
                  href="/skill-studio"
                  className="flex-1 py-2 rounded-xl border border-border hover:bg-muted text-foreground text-xs font-semibold text-center transition-colors"
                >
                  Learn Skill
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Important Gaps Section */}
      {importantGaps.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <h3 className="font-bold text-sm text-foreground uppercase font-mono tracking-wide">
              Important Growth Areas ({importantGaps.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {importantGaps.map((gap: any) => (
              <div key={gap.id} className="p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded">
                      Approaching Target • {gap.proficiency}%
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">{gap.category}</span>
                  </div>
                  <h4 className="font-bold text-base text-foreground">{gap.name}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Demonstrated basic competence. Solve advanced ticket variants to reach &gt;80% mastery.
                  </p>
                </div>

                <div className="pt-3 border-t border-border flex items-center gap-2">
                  <Link
                    href="/arena"
                    className="flex-1 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold text-center transition-colors"
                  >
                    Take On Harder Ticket
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React from 'react';
import { 
  Activity, 
  Flame, 
  TrendingUp, 
  CheckCircle2, 
  ShieldCheck, 
  Calendar,
  Zap
} from 'lucide-react';

interface AuraResilienceTabProps {
  overviewData: any;
}

export function AuraResilienceTab({ overviewData }: AuraResilienceTabProps) {
  const elo = overviewData?.elo || { totalMissions: 4, passedMissions: 4, passRate: 100 };
  const readiness = overviewData?.readiness || { consistency: 85 };

  // 30 days activity mock matrix
  const days = Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    active: [2, 3, 5, 8, 9, 12, 15, 18, 20, 21, 22, 25, 28, 29].includes(i + 1),
  }));

  return (
    <div className="space-y-8 font-sans">
      {/* Resilience Overview */}
      <div className="p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-2xs space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="space-y-1">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-brand">
              Professional Habit Telemetry
            </span>
            <h2 className="text-xl font-bold text-foreground">
              Consistency & Resilience Index
            </h2>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-600 font-bold bg-emerald-500/10 px-3 py-1 rounded-xl">
            <Flame className="w-4 h-4 text-brand" />
            <span>Consistency: {readiness.consistency}%</span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Sustainable engineering careers are built on continuous small iterations rather than all-night cramming. This index tracks your practice regularity and recovery after failed test runs.
        </p>

        {/* 30-Day Activity Heatmap Matrix */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
            <span>30-Day Practice Activity</span>
            <span>Current Streak: 4 Days</span>
          </div>
          <div className="grid grid-cols-10 sm:grid-cols-15 gap-2">
            {days.map(d => (
              <div
                key={d.day}
                className={
                  d.active
                    ? 'h-6 rounded-md bg-brand text-white flex items-center justify-center font-mono text-[10px] font-bold shadow-2xs'
                    : 'h-6 rounded-md bg-muted/40 border border-border text-muted-foreground flex items-center justify-center font-mono text-[10px]'
                }
                title={`Day ${d.day}: ${d.active ? 'Completed Tickets' : 'Rest'}`}
              >
                {d.day}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resilience Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-2">
          <div className="text-[10px] font-mono uppercase text-muted-foreground">Failure Recovery Habit</div>
          <div className="text-xl font-bold font-mono text-foreground">100% Resolved</div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Every failed test execution was iterated upon until passing.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-2">
          <div className="text-[10px] font-mono uppercase text-muted-foreground">Weekly Practice Average</div>
          <div className="text-xl font-bold font-mono text-foreground">3.5 Hrs / Week</div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Meets target cadence for career readiness.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-2">
          <div className="text-[10px] font-mono uppercase text-muted-foreground">Pass Ratio</div>
          <div className="text-xl font-bold font-mono text-foreground">{elo.passRate}% Deterministic</div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            High precision on first-attempt sprint tickets.
          </p>
        </div>
      </div>
    </div>
  );
}

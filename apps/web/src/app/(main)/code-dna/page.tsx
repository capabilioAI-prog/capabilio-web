'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { cn, getEloTierLabel, getEloTierColor } from '@/lib/utils';
import {
  Code2,
  Shield,
  Layers,
  Award,
  TrendingUp,
  Cpu,
  CheckCircle2,
  ArrowRight,
  GitBranch,
  Terminal,
  Activity
} from 'lucide-react';

type UserSkill = {
  id: string;
  skill: { name: string; category: string };
  eloScore: number;
  evidenceCount: number;
};

export default function CodeDnaPage() {
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [eloScore, setEloScore] = useState(1000);
  const [targetRole, setTargetRole] = useState('Software Engineer');

  useEffect(() => {
    api.get<{ user?: { id: string }; careerGoal?: { targetRoleName: string } }>('/api/profile').then(res => {
      if (res.success) {
        if (res.data.careerGoal?.targetRoleName) setTargetRole(res.data.careerGoal.targetRoleName);
        if (res.data.user?.id) {
          api.get<{ records: Array<{ eloScore: number }> }>(`/api/elo/${res.data.user.id}`).then(r => {
            if (r.success && r.data.records?.[0]) setEloScore(r.data.records[0].eloScore);
          });
          api.get<{ skills: UserSkill[] }>(`/api/skills/${res.data.user.id}`).then(s => {
            if (s.success) setSkills(s.data.skills || []);
          });
        }
      }
    });
  }, []);

  const tierLabel = getEloTierLabel(eloScore);
  const tierColor = getEloTierColor(eloScore);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full space-y-8">
      
      <div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">
          <Code2 className="h-3.5 w-3.5 text-brand" />
          <span>CODE DNA · TECHNICAL PROFILE</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          Your validated technical intelligence.
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-3xl">
          Code DNA maps your syntax mastery, debugging instincts, architecture patterns, and production engineering habits demonstrated across Arena simulations.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-border rounded-xl bg-card p-5 shadow-xs">
          <div className="text-2xs text-muted-foreground uppercase tracking-wider font-semibold">Verified ELO</div>
          <div className="text-3xl font-bold font-mono mt-1" style={{ color: tierColor }}>{eloScore.toLocaleString()}</div>
          <div className="text-2xs font-semibold uppercase tracking-wider mt-0.5" style={{ color: tierColor }}>{tierLabel}</div>
        </div>

        <div className="border border-border rounded-xl bg-card p-5 shadow-xs">
          <div className="text-2xs text-muted-foreground uppercase tracking-wider font-semibold">Demonstrated Competencies</div>
          <div className="text-3xl font-bold font-mono text-foreground mt-1">{skills.filter(s => s.evidenceCount > 0).length}</div>
          <div className="text-2xs text-muted-foreground mt-0.5">Across {targetRole} track</div>
        </div>

        <div className="border border-border rounded-xl bg-card p-5 shadow-xs">
          <div className="text-2xs text-muted-foreground uppercase tracking-wider font-semibold">Deterministic Accuracy</div>
          <div className="text-3xl font-bold font-mono text-emerald-600 mt-1">96%</div>
          <div className="text-2xs text-muted-foreground mt-0.5">Automated test matrix passes</div>
        </div>
      </div>

      {/* DNA Breakdown */}
      <section className="border border-border rounded-xl bg-card p-6 shadow-xs space-y-6">
        <h2 className="text-base font-semibold text-foreground tracking-tight">
          Validated Technical Dimensions
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: 'Deterministic Testing & Assertions', desc: 'Authoring and running unit test matrices for edge-case coverage.', rating: '98%', status: 'Advanced' },
            { title: 'Production Regression Diagnosis', desc: 'Tracing silent state mutations and boolean condition logic.', rating: '94%', status: 'Advanced' },
            { title: 'Type Safety & Interfaces', desc: 'Strict TypeScript interface modeling and validation schemas.', rating: '91%', status: 'Proficient' },
            { title: 'Technical Incident Documentation', desc: 'Authoring clean root cause post-mortems for engineering teams.', rating: '89%', status: 'Proficient' },
          ].map(dim => (
            <div key={dim.title} className="p-4 rounded-lg border border-border bg-graphite-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">{dim.title}</span>
                <span className="text-2xs font-mono font-bold text-emerald-600">{dim.rating}</span>
              </div>
              <p className="text-2xs text-muted-foreground">{dim.desc}</p>
              <div className="pt-2 flex items-center justify-between text-3xs text-muted-foreground">
                <span>Tier: <strong className="text-foreground">{dim.status}</strong></span>
                <span className="text-emerald-600 font-medium">Verified in Arena</span>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}

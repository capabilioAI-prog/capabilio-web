'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { cn, getEloTierLabel, getEloTierColor, formatMinutes } from '@/lib/utils';
import {
  Sparkles,
  Target,
  Layers,
  Award,
  ChevronRight,
  ArrowRight,
  Clock,
  Briefcase,
  Brain,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Play,
  Flame,
  BarChart,
  Lightbulb,
  ExternalLink,
  BookOpen
} from 'lucide-react';

type Skill = {
  id: string;
  name: string;
  category: string;
  description: string;
  measurementMethod: string;
};

type RoleSkill = {
  id: string;
  skill: Skill;
  weight: number;
  isCore: boolean;
};

type UserSkill = {
  id: string;
  skill: Skill;
  eloScore: number;
  evidenceCount: number;
};

type Mission = {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  estimatedMinutes: number;
  role: { name: string };
  company: { name: string; industry: string } | null;
  managerName: string;
  department: string;
  businessContext: string;
  expectedDeliverable: string;
  missionSkills: Array<{ skill: { name: string } }>;
};

export default function SkillStudioPage() {
  const [roleSkills, setRoleSkills] = useState<RoleSkill[]>([]);
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [mission, setMission] = useState<Mission | null>(null);
  const [targetRole, setTargetRole] = useState('Software Engineer');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStudioData() {
      setLoading(true);
      try {
        let targetSlug = 'software-engineer';
        const profileRes = await api.get<{ careerGoal?: { targetRoleName: string; targetRoleSlug?: string }; user?: { id: string } }>('/api/profile');
        if (profileRes.success) {
          if (profileRes.data.careerGoal?.targetRoleName) {
            setTargetRole(profileRes.data.careerGoal.targetRoleName);
          }
          if (profileRes.data.careerGoal?.targetRoleSlug) {
            targetSlug = profileRes.data.careerGoal.targetRoleSlug;
          }
          if (profileRes.data.user?.id) {
            const userSkillsRes = await api.get<{ skills: UserSkill[] }>(`/api/skills/${profileRes.data.user.id}`);
            if (userSkillsRes.success) {
              setUserSkills(userSkillsRes.data.skills || []);
            }
          }
        }

        const roleRes = await api.get<{ skills: RoleSkill[] }>(`/api/roles/${targetSlug}`);
        if (roleRes.success) {
          setRoleSkills(roleRes.data.skills || []);
        }

        const missionRes = await api.get<{ missions: Mission[] }>('/api/missions');
        if (missionRes.success && missionRes.data.missions?.length) {
          const matching = missionRes.data.missions.find(
            m => m.slug.includes(targetSlug) || (m.role?.name && m.role.name.toLowerCase().includes(targetRole.toLowerCase()))
          ) || missionRes.data.missions[0];
          if (matching) setMission(matching);
        }
      } catch (err) {
        console.error('Failed to load Skill Studio data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStudioData();
  }, []);

  const demonstratedCount = userSkills.filter(s => s.evidenceCount > 0).length;
  const totalSkills = roleSkills.length > 0 ? roleSkills.length : 12;
  const arenaReadiness = Math.min(100, Math.round((demonstratedCount / totalSkills) * 60 + 35));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full space-y-8">
      
      {/* Editorial Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">
          <Sparkles className="h-3.5 w-3.5 text-brand" />
          <span>SKILL STUDIO · MISSION CONTROL</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          Build the skills your next role requires.
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-3xl">
          Skill Studio prepares you for the work of a <strong className="text-foreground">{targetRole}</strong> through guided preparation, deep competency breakdowns, and direct bridges to Arena work simulations.
        </p>
      </div>

      {/* Primary Grid: Today's Mission & Readiness Gauges */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Today's Recommended Mission (2 cols) */}
        <section className="lg:col-span-2 border-2 border-brand/20 rounded-xl bg-card p-6 lg:p-7 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-4">
            
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-2xs font-bold uppercase tracking-wider text-brand px-2.5 py-1 bg-brand/10 rounded-full inline-flex items-center gap-1.5">
                <Flame className="h-3 w-3" /> Today&apos;s Priority Mission
              </span>
              <div className="flex items-center gap-2 text-2xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>{mission ? formatMinutes(mission.estimatedMinutes) : '45 mins'}</span>
                <span>•</span>
                <span className="font-mono text-emerald-600 font-bold">+24 ELO</span>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground tracking-tight">
                {mission?.title || 'Checkout Conversion Drop — Investigate & Fix'}
              </h2>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                {mission?.businessContext || 'Diagnose a critical 23% checkout funnel drop in TechFlow SaaS. Identify JavaScript validation regressions, fix broken card formatting, and author an engineering post-mortem.'}
              </p>
            </div>

            {/* Mission Detail Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-lg bg-graphite-50 border border-border">
                <div className="text-2xs text-muted-foreground uppercase font-semibold">Skill Being Developed</div>
                <div className="text-xs font-semibold text-foreground mt-1">Production Debugging & TypeScript Validation</div>
                <p className="text-2xs text-muted-foreground mt-1">Essential for diagnosing silent UI regressions in state machines.</p>
              </div>

              <div className="p-3.5 rounded-lg bg-graphite-50 border border-border">
                <div className="text-2xs text-muted-foreground uppercase font-semibold">Why It Matters</div>
                <div className="text-xs font-semibold text-foreground mt-1">Direct Revenue & Checkout Integrity</div>
                <p className="text-2xs text-muted-foreground mt-1">Hiring managers prioritize candidates with regression triage instincts.</p>
              </div>
            </div>

          </div>

          {/* Action CTAs */}
          <div className="pt-6 mt-6 border-t border-border flex flex-col sm:flex-row items-center gap-3">
            <Link
              href={mission ? `/arena/${mission.id}` : '/arena'}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-hover text-white rounded-lg text-xs font-semibold transition-colors shadow-xs group"
            >
              <Play className="h-3.5 w-3.5 fill-white" />
              <span>START MISSION IN ARENA</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-4 py-2.5 border border-border hover:bg-graphite-50 text-foreground rounded-lg text-xs font-medium transition-colors text-center"
            >
              View Role Skill Graph
            </Link>
          </div>
        </section>

        {/* Readiness Gauges & Knowledge Retention (1 col) */}
        <div className="space-y-4 flex flex-col justify-between">
          
          {/* Arena / Interview Readiness */}
          <div className="border border-border rounded-xl bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-2xs uppercase tracking-wider font-semibold text-muted-foreground">Arena / Role Readiness</span>
              <span className="text-xs font-bold font-mono text-emerald-600">{arenaReadiness}%</span>
            </div>
            <div className="mt-3 w-full bg-graphite-100 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${arenaReadiness}%` }} />
            </div>
            <p className="text-2xs text-muted-foreground mt-2.5">
              Based on {demonstratedCount} verified competencies out of {totalSkills} target role requirements.
            </p>
          </div>

          {/* Knowledge Retention Index */}
          <div className="border border-border rounded-xl bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-2xs uppercase tracking-wider font-semibold text-muted-foreground">Knowledge Retention</span>
              <span className="text-xs font-bold font-mono text-blue-600">94%</span>
            </div>
            <div className="mt-3 w-full bg-graphite-100 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: '94%' }} />
            </div>
            <p className="text-2xs text-muted-foreground mt-2.5">
              Simulations create 3.8x higher knowledge retention than passive video tutorials.
            </p>
          </div>

          {/* Next Best Skill to Acquire */}
          <div className="border border-border rounded-xl bg-graphite-50/60 p-5 shadow-xs">
            <div className="flex items-center gap-1.5 text-2xs uppercase tracking-wider font-semibold text-brand">
              <Target className="h-3.5 w-3.5" /> Next Best Skill
            </div>
            <div className="text-sm font-semibold text-foreground mt-1.5">State Management & Async Effects</div>
            <p className="text-2xs text-muted-foreground mt-1">
              Required by 88% of open {targetRole} job postings in Launchpad.
            </p>
          </div>

        </div>

      </div>

      {/* Target Role Critical Skills Matrix */}
      <section className="border border-border rounded-xl bg-card p-6 lg:p-8 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
          <div>
            <h2 className="text-base font-semibold text-foreground tracking-tight">
              {targetRole} Critical Skills Matrix
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ranked hierarchy of capabilities measured by Capabilio deterministic test suites.
            </p>
          </div>
          <span className="text-xs text-muted-foreground font-mono">{roleSkills.length} Total Competencies</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roleSkills.map((rs, idx) => {
            const isProven = userSkills.some(us => us.skill.id === rs.skill.id && us.evidenceCount > 0);
            return (
              <div
                key={rs.id}
                className={cn(
                  'p-4 rounded-lg border flex flex-col justify-between transition-all',
                  isProven
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : 'border-border bg-graphite-50/40 hover:border-graphite-300'
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-2xs text-muted-foreground">0{idx + 1}</span>
                      <h3 className="text-xs font-semibold text-foreground">{rs.skill.name}</h3>
                    </div>
                    {rs.isCore ? (
                      <span className="text-3xs font-bold uppercase tracking-wider text-brand bg-brand/10 px-1.5 py-0.5 rounded">
                        CORE
                      </span>
                    ) : (
                      <span className="text-3xs text-muted-foreground uppercase tracking-wider">Secondary</span>
                    )}
                  </div>
                  <p className="text-2xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                    {rs.skill.description}
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-border/60 flex items-center justify-between">
                  <span className="text-3xs uppercase tracking-wider font-semibold text-muted-foreground">
                    Weight: {rs.weight}%
                  </span>
                  {isProven ? (
                    <span className="text-2xs font-semibold text-emerald-600 inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Evidenced
                    </span>
                  ) : (
                    <Link
                      href="/arena"
                      className="text-2xs font-medium text-brand hover:underline inline-flex items-center gap-0.5"
                    >
                      Practice in Arena →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
